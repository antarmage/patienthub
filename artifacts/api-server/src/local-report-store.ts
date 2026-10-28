import type { Pool } from "pg";
import type { LocalReportStore, ValidatedImport } from "./local-reports";
import { importReceiptSchema } from "./local-reports";
import { OcrError } from "./replit_integrations/ocr/document";
import { exactLabNumber } from "@workspace/api-zod/lab-reading";

export function createLocalReportStore(pool: Pool): LocalReportStore {
  return {
    async patient(id) {
      const result = await pool.query<{ id: number; name: string }>(
        "SELECT id, name FROM patients WHERE id = $1",
        [id],
      );
      return result.rows[0];
    },
    async commit(input: ValidatedImport) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // The receipt and all patient records commit together, including concurrent retries.
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
          [input.importId],
        );
        const previous = await client.query<{
          payload_sha256: string;
          receipt: unknown;
        }>(
          "SELECT payload_sha256, receipt FROM local_report_imports WHERE import_id = $1",
          [input.importId],
        );
        if (previous.rows[0]) {
          if (previous.rows[0].payload_sha256 !== input.payloadSha256) {
            throw new OcrError(
              "This import ID was already used with different data. Do not modify a previously submitted import.",
              409,
            );
          }
          const receipt = importReceiptSchema.parse(previous.rows[0].receipt);
          await client.query("COMMIT");
          return receipt;
        }
        const patient = await client.query<{ name: string }>(
          "SELECT name FROM patients WHERE id = $1 FOR SHARE",
          [input.patientId],
        );
        if (patient.rows[0]?.name !== input.confirmedPatientName) {
          throw new OcrError(
            "Patient no longer matches the confirmed identity.",
            409,
          );
        }
        const file = await client.query<{ id: number }>(
          `
        INSERT INTO patient_documents (patient_id, file_name, file_data, mime_type, doc_type, label, uploaded_at)
        VALUES ($1, $2, $3, $4, 'lab-report', 'Locally read lab report', $5) RETURNING id
      `,
          [
            input.patientId,
            input.file.name,
            input.file.data,
            input.file.mimeType,
            new Date().toISOString(),
          ],
        );
        const metadata = {
          importId: input.importId,
          patientDocumentId: file.rows[0].id,
          fileSha256: input.file.sha256,
          provider: "local",
          reviewed: true,
          reviewedBy: input.actorId,
          reviewedAt: new Date().toISOString(),
          ocrRawText: input.reading.rawText,
          reading: input.reading,
        };
        const document = await client.query<{ id: number }>(
          `
        INSERT INTO documents (patient_id, name, type, category, date, metadata)
        VALUES ($1, $2, 'Lab Report', 'blood', $3, $4) RETURNING id
      `,
          [
            input.patientId,
            input.file.name,
            input.reading.date,
            JSON.stringify(metadata),
          ],
        );
        const resultIds: number[] = [];
        for (const result of input.reading.results) {
          const saved = await client.query<{ id: number }>(
            `
          INSERT INTO lab_results (patient_id, test_name, date, value, unit, status, results)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `,
            [
              input.patientId,
              result.testName,
              input.reading.date,
              exactLabNumber(result.value),
              result.unit || null,
              result.status || null,
              JSON.stringify({
                rawValue: result.value,
                referenceRange: result.referenceRange,
                flag: result.flag,
                labName: input.reading.labName,
                sourceDocumentId: document.rows[0].id,
                importId: input.importId,
                provider: "local",
                reviewed: true,
              }),
            ],
          );
          resultIds.push(saved.rows[0].id);
        }
        const receipt = importReceiptSchema.parse({
          importId: input.importId,
          patientId: input.patientId,
          documentId: document.rows[0].id,
          patientDocumentId: file.rows[0].id,
          resultIds,
          fileSha256: input.file.sha256,
          payloadSha256: input.payloadSha256,
          committed: true,
        });
        await client.query(
          `
        INSERT INTO local_report_imports (import_id, patient_id, payload_sha256, receipt)
        VALUES ($1, $2, $3, $4)
      `,
          [
            input.importId,
            input.patientId,
            input.payloadSha256,
            JSON.stringify(receipt),
          ],
        );
        await client.query("COMMIT");
        return receipt;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
