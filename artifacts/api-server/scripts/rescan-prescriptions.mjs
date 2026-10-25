/**
 * Rescan prescription documents that were saved without extracted medicines.
 *
 * The staff upload used to store only document metadata. This job can recover
 * medicines only when the original file is still in patient_documents
 * (file_data or s3_key) or on the document metadata (patientDocumentId / s3Key).
 * Rows with no stored file are skipped; they cannot be rescanned without the file.
 *
 * Usage (from artifacts/api-server):
 *   DATABASE_URL=... AI_INTEGRATIONS_GEMINI_API_KEY=... \
 *     node --experimental-strip-types scripts/rescan-prescriptions.mjs
 *   node --experimental-strip-types scripts/rescan-prescriptions.mjs --apply
 *   node --experimental-strip-types scripts/rescan-prescriptions.mjs --apply --patient-id 389
 *
 * Dry-run is the default. --apply writes medications, visit prescriptions, and document metadata.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
  }
}

loadEnvFile(path.resolve(__dirname, "../.env"));
loadEnvFile(path.resolve(__dirname, "../../../.env"));

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const force = args.includes("--force");

function readFlag(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

const patientId = readFlag("--patient-id");
const documentId = readFlag("--document-id");
const limit = Number(readFlag("--limit") || 50);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Export it, or put it in artifacts/api-server/.env, then rerun.");
  process.exit(1);
}

const { scanClinicalDocument } = await import("../src/replit_integrations/ocr/routes.ts");

function namedMedications(result) {
  const source = result?.medications ?? result?.medicines ?? result?.meds ?? result?.drugs ?? [];
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => {
      if (typeof item === "string") return { name: item.trim() };
      if (!item || typeof item !== "object") return null;
      const name = String(item.name || item.drug || item.medicine || "").trim();
      return name ? { ...item, name } : null;
    })
    .filter(Boolean);
}

function needsRescan(metadata) {
  if (force) return true;
  const summary = metadata?.ocrSummary;
  const saved = Array.isArray(metadata?.savedMedications) ? metadata.savedMedications : [];
  const count = summary == null ? null : Number(summary.medicationCount ?? 0);
  return summary == null || count === 0 || saved.length === 0;
}

async function loadFile(client, row) {
  const metadata = row.metadata ?? {};
  if (metadata.patientDocumentId) {
    const found = await client.query(
      `SELECT id, file_name, file_data, s3_key, mime_type
       FROM patient_documents
       WHERE id = $1 AND patient_id = $2`,
      [metadata.patientDocumentId, row.patient_id],
    );
    if (found.rows[0]) return found.rows[0];
  }

  const files = await client.query(
    `SELECT id, file_name, file_data, s3_key, mime_type, uploaded_at, label
     FROM patient_documents
     WHERE patient_id = $1
       AND (file_data IS NOT NULL OR s3_key IS NOT NULL)
     ORDER BY uploaded_at DESC NULLS LAST
     LIMIT 20`,
    [row.patient_id],
  );
  const fileName = metadata.fileName || metadata.s3Key;
  const named = files.rows.find((file) =>
    (fileName && (file.file_name === fileName || file.s3_key === fileName || file.s3_key === metadata.s3Key))
    || (metadata.s3Key && file.s3_key === metadata.s3Key),
  );
  if (named) return named;
  const sameDay = files.rows.find((file) => String(file.uploaded_at || "").slice(0, 10) === String(row.date));
  return sameDay || null;
}

async function fileToBase64(file) {
  if (file.file_data) return String(file.file_data);
  if (!file.s3_key) return null;
  const { readS3ObjectAsBuffer } = await import("../src/lib/s3-storage.ts");
  const buffer = await readS3ObjectAsBuffer(file.s3_key);
  return buffer.toString("base64");
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const params = [];
  const filters = [
    `(
      type ILIKE '%prescription%'
      OR category ILIKE '%prescription%'
      OR name ILIKE 'prescription%'
    )`,
  ];
  if (patientId) {
    params.push(Number(patientId));
    filters.push(`patient_id = $${params.length}`);
  }
  if (documentId) {
    params.push(Number(documentId));
    filters.push(`id = $${params.length}`);
  }
  params.push(limit);
  const docs = await client.query(
    `SELECT id, patient_id, name, type, category, date::text AS date, metadata
     FROM documents
     WHERE ${filters.join(" AND ")}
     ORDER BY date DESC, id DESC
     LIMIT $${params.length}`,
    params,
  );

  const candidates = docs.rows.filter((row) => needsRescan(row.metadata));
  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${candidates.length} prescription document(s) need a rescan (scanned ${docs.rows.length}).`);

  let applied = 0;
  let skipped = 0;
  for (const row of candidates) {
    const label = `document ${row.id} patient ${row.patient_id} ${row.date} "${row.name}"`;
    const file = await loadFile(client, row);
    if (!file) {
      skipped += 1;
      console.log(`SKIP ${label}: no stored file. The image was not saved with this upload, so it must be uploaded again.`);
      continue;
    }
    const image = await fileToBase64(file);
    if (!image) {
      skipped += 1;
      console.log(`SKIP ${label}: patient_documents ${file.id} has neither file_data nor a readable s3_key.`);
      continue;
    }

    console.log(`SCAN ${label} using patient_documents ${file.id}`);
    const result = await scanClinicalDocument(image, file.mime_type || "image/jpeg", row.category || "prescription");
    const medications = namedMedications(result);
    console.log(`  read ${medications.length} medicine(s): ${medications.map((med) => med.name).join(", ") || "(none)"}`);
    if (!apply) continue;
    if (medications.length === 0) {
      skipped += 1;
      await client.query(
        `UPDATE documents
         SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
         WHERE id = $1`,
        [row.id, JSON.stringify({
          rescan: { attemptedAt: new Date().toISOString(), status: "no-medicines", patientDocumentId: file.id },
        })],
      );
      console.log("  recorded no-medicines rescan; visit and medication rows were left unchanged.");
      continue;
    }

    await client.query("BEGIN");
    try {
      const savedNames = [];
      for (const med of medications) {
        const existing = await client.query(
          `SELECT id FROM medications
           WHERE patient_id = $1 AND lower(name) = lower($2) AND start_date IS NOT DISTINCT FROM $3::date
           LIMIT 1`,
          [row.patient_id, med.name, row.date],
        );
        if (existing.rows[0]) {
          savedNames.push(med.name);
          continue;
        }
        const notes = [med.duration ? `Duration: ${med.duration}` : "", med.instructions || "", "Rescanned from stored prescription"].filter(Boolean).join(". ");
        await client.query(
          `INSERT INTO medications (patient_id, name, dose, frequency, route, start_date, status, notes)
           VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)`,
          [row.patient_id, med.name, med.dosage || med.dose || null, med.frequency || null, med.route || null, row.date, notes || null],
        );
        savedNames.push(med.name);
      }

      const prescriptions = medications.map((med) => ({
        name: med.name,
        dosage: med.dosage || med.dose || null,
        frequency: med.frequency || null,
        duration: med.duration || null,
        instructions: med.instructions || null,
      }));
      const visitUpdate = await client.query(
        `UPDATE visit_history
         SET prescriptions = $3::jsonb,
             diagnosis = COALESCE(diagnosis, $4),
             follow_up_plan = COALESCE(follow_up_plan, $5),
             plan_notes = COALESCE(plan_notes, $6)
         WHERE patient_id = $1
           AND date = $2::date
           AND (prescriptions IS NULL OR prescriptions = 'null'::jsonb OR prescriptions = '[]'::jsonb)
         RETURNING id`,
        [
          row.patient_id,
          row.date,
          JSON.stringify(prescriptions),
          result.diagnosis || result.impression || null,
          result.followUp || null,
          result.advice || null,
        ],
      );
      if (visitUpdate.rowCount === 0) {
        const existingVisit = await client.query(
          `SELECT id FROM visit_history WHERE patient_id = $1 AND date = $2::date LIMIT 1`,
          [row.patient_id, row.date],
        );
        if (!existingVisit.rows[0]) {
          await client.query(
            `INSERT INTO visit_history (patient_id, date, visit_type, chief_complaint, diagnosis, prescriptions, follow_up_plan, plan_notes, outcome)
             VALUES ($1, $2::date, 'Consultation', $3, $4, $5::jsonb, $6, $7, 'Prescription rescanned from stored document')`,
            [
              row.patient_id,
              row.date,
              result.chiefComplaint || result.diagnosis || result.impression || null,
              result.diagnosis || result.impression || null,
              JSON.stringify(prescriptions),
              result.followUp || null,
              result.advice || null,
            ],
          );
        }
      }

      const metadataPatch = {
        ocrSummary: {
          doctorName: result.doctorName || null,
          patientName: result.patientName || null,
          date: result.date || null,
          diagnosis: result.diagnosis || null,
          confidence: result.confidence || null,
          medicationCount: medications.length,
        },
        savedMedications: savedNames,
        patientDocumentId: file.id,
        s3Key: file.s3_key || row.metadata?.s3Key || null,
        rescan: { attemptedAt: new Date().toISOString(), status: "applied", patientDocumentId: file.id },
      };
      await client.query(
        `UPDATE documents SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb WHERE id = $1`,
        [row.id, JSON.stringify(metadataPatch)],
      );
      await client.query("COMMIT");
      applied += 1;
      console.log(`  saved ${savedNames.length} medication(s) and updated the visit.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log(`Done. ${apply ? `Updated ${applied}.` : "No rows were written."} Skipped ${skipped}.`);
  if (!apply) console.log("Re-run with --apply to write the scan results.");
} finally {
  await client.end();
}
