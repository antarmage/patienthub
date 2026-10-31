import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import type { AccessActor } from "./clinical-access";
import { LAB_PRESCRIPTION_MAX_BYTES, readLabPrescription } from "./survey-kind";

export const TRANSCRIPTION_SOURCE = "receptionist-paper-transcription";
export const TRANSCRIPTION_ORIGINAL_DOC_TYPE = "prescription";
export const TRANSCRIPTION_ORIGINAL_LABEL = "Doctor-issued paper prescription (transcription source)";
const TRANSCRIBER_ROLES = new Set(["staff", "receptionist", "clinician", "owner"]);
const MAX_TEXT = 4000;
const MAX_MEDICINES = 50;
const MAX_TESTS = 100;

export type VisitRow = { id: number; patientId: number | null; appointmentId?: number | null; date: string; prescriptions?: unknown; [key: string]: unknown };
export type VisitWrite = Record<string, unknown>;
export type MedicationRow = { id: number; patientId: number | null; name: string; status?: string | null; [key: string]: unknown };
export type MedicationWrite = {
  patientId?: number; name: string; dose: string | null; frequency: string | null; duration: string | null;
  instructions: string | null; route: string | null; startDate: string; notes: string | null; status?: string;
};
export type PatientDocumentRow = {
  id: number; patientId: number; fileName: string; fileData: string | null; s3Key: string | null;
  mimeType: string | null; docType: string | null; label: string | null; uploadedAt: string;
};
export type PatientDocumentWrite = Omit<PatientDocumentRow, "id">;

export interface TranscriptionTx {
  /** Re-reads (and, in Postgres, row-locks) the visit inside the transaction. */
  lockVisit(id: number): Promise<VisitRow | undefined>;
  createVisit(data: VisitWrite & { patientId: number }): Promise<VisitRow>;
  updateVisit(id: number, data: VisitWrite): Promise<VisitRow | undefined>;
  /** Must only return medications that belong to `patientId`. */
  getMedications(patientId: number, ids: number[]): Promise<MedicationRow[]>;
  createMedication(data: MedicationWrite & { patientId: number; status: string }): Promise<MedicationRow>;
  updateMedication(id: number, data: Partial<MedicationWrite>): Promise<MedicationRow | undefined>;
  deleteMedication(id: number): Promise<boolean>;
  createPatientDocument(data: PatientDocumentWrite): Promise<PatientDocumentRow>;
}

export interface PrescriptionTranscriptionDependencies {
  authenticate(req: Request, res: Response): Promise<AccessActor | null>;
  patientExists(id: number): Promise<boolean>;
  getAppointment(id: number): Promise<{ id: number; patientId: number | null; date: string } | undefined>;
  listVisits(patientId: number): Promise<VisitRow[]>;
  getPatientDocument(id: number): Promise<PatientDocumentRow | undefined>;
  /** Returns the stored bytes (inline base64 or object storage), or null when unavailable. */
  readStoredFile(doc: PatientDocumentRow): Promise<Buffer | null>;
  /** Persists original bytes before the database transaction (e.g. S3), or returns inline base64. */
  putOriginalFile(patientId: number, bytes: Buffer, mimeType: string): Promise<{ fileData: string | null; s3Key: string | null }>;
  discardOriginalFile(stored: { fileData: string | null; s3Key: string | null }): Promise<void>;
  transaction<T>(work: (tx: TranscriptionTx) => Promise<T>): Promise<T>;
  parseCallDate(value: unknown): string | null;
  prescriptionDueDate(instructions: string, visitDate: string): string | null;
  now?(): Date;
}

class InputError extends Error {
  constructor(public status: number, message: string, public fields?: string[]) {
    super(message);
  }
}

// Shared with the clinician manual-prescription route so antenatal findings normalize identically.
export function antenatalFromBody(body: any) {
  if (!/pregnant/i.test(String(body?.patientType || ""))) return null;
  const source = body?.antenatal && typeof body.antenatal === "object" ? body.antenatal : {};
  const text = (value: unknown) => String(value || "").trim() || null;
  const date = (value: unknown) => {
    const raw = String(value || "").trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    return null;
  };
  const rawUsg: any[] = Array.isArray(source.usg) ? source.usg : [];
  const mappedUsg = rawUsg.map((line) => ({
    scanDate: date(line?.scanDate || line?.date),
    finding: text(line?.finding),
    weeks: text(line?.weeks || line?.pog),
    placenta: text(line?.placenta),
    liquor: text(line?.liquor),
    efw: text(line?.efw),
    anomaly: text(line?.anomaly),
  }));
  const usg = mappedUsg.filter((line) => line.scanDate || line.finding || line.weeks || line.placenta || line.liquor || line.efw || line.anomaly);
  return {
    bloodGroup: text(source.bloodGroup),
    hb: text(source.hb),
    hbDate: date(source.hbDate),
    urineRe: text(source.urineRe),
    urineReDate: date(source.urineReDate),
    usg,
    slf: text(source.slf),
    pulse: text(source.pulse),
    bp: text(source.bp),
    spo2: text(source.spo2),
    rr: text(source.rr),
    perAbdomen: text(source.perAbdomen),
    uterusSize: text(source.uterusSize),
    uterusSizeDate: date(source.uterusSizeDate),
    fetalMovements: text(source.fetalMovements),
    fetalHeartSound: text(source.fetalHeartSound),
    fetalHeartDoppler: text(source.fetalHeartDoppler),
    scarTenderness: text(source.scarTenderness),
  };
}

function hasFileSignature(bytes: Buffer, mimeType: string): boolean {
  const startsWith = (signature: number[], offset = 0) => bytes.length >= offset + signature.length &&
    signature.every((byte, index) => bytes[offset + index] === byte);
  switch (mimeType) {
    case "image/jpeg": return startsWith([0xff, 0xd8, 0xff]);
    case "image/png": return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp": return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8);
    case "application/pdf": return startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]);
    default: return false;
  }
}

export type ValidatedOriginal = { name: string; mimeType: string; bytes: Buffer; sha256: string };

/** Validates a submitted original (base64 only — URLs, server references and mislabeled bytes are rejected). */
export function validateOriginalPrescription(input: unknown): ValidatedOriginal {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new InputError(400, "originalPrescription must be an object with name, mimeType and fileData");
  }
  const record = input as Record<string, unknown>;
  for (const key of ["url", "href", "s3Key", "patientDocumentId", "documentId"]) {
    if (record[key] !== undefined) throw new InputError(400, "Upload the original file itself; references are not accepted", [`originalPrescription.${key}`]);
  }
  if (record.name !== undefined && typeof record.name !== "string") throw new InputError(400, "originalPrescription.name must be text");
  if (typeof record.mimeType !== "string") throw new InputError(400, "originalPrescription.mimeType is required");
  if (typeof record.fileData !== "string" || !record.fileData) throw new InputError(400, "originalPrescription.fileData (base64) is required");
  const read = readLabPrescription({ fileData: record.fileData, mimeType: record.mimeType, fileName: record.name || "paper-prescription" });
  if (!read) throw new InputError(400, "originalPrescription.fileData (base64) is required");
  if ("error" in read) throw new InputError(400, read.error);
  const bytes = Buffer.from(read.base64, "base64");
  if (!bytes.length || bytes.length > LAB_PRESCRIPTION_MAX_BYTES ||
      bytes.toString("base64").replace(/=+$/, "") !== read.base64.replace(/=+$/, "")) {
    throw new InputError(400, "Prescription file is not valid");
  }
  if (!hasFileSignature(bytes, read.mimeType)) {
    throw new InputError(400, "The attached file content does not match its type. Attach the original JPG, PNG, WebP or PDF.");
  }
  return { name: read.fileName, mimeType: read.mimeType, bytes, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
}

type OriginalMeta = {
  patientDocumentId: number; name: string; mimeType: string; sizeBytes: number; sha256: string;
  uploadedAt: string; uploadedBy: ActorStamp;
};
type ActorStamp = { userId: string; role: string };

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function isPaperTranscription(visit: VisitRow, patientId: number): boolean {
  const rx = asObject(visit.prescriptions);
  return visit.patientId === patientId && !!rx && rx.source === TRANSCRIPTION_SOURCE && rx.doctorIssuedPaper === true;
}

function originalMetaOf(visit: VisitRow): OriginalMeta | null {
  const meta = asObject(asObject(visit.prescriptions)?.originalPrescription);
  return meta && Number.isSafeInteger(meta.patientDocumentId) && typeof meta.sha256 === "string" ? meta as unknown as OriginalMeta : null;
}

async function loadRetainedOriginal(deps: PrescriptionTranscriptionDependencies, patientId: number, meta: OriginalMeta | null): Promise<Buffer | null> {
  if (!meta) return null;
  const doc = await deps.getPatientDocument(meta.patientDocumentId);
  if (!doc || doc.patientId !== patientId || doc.mimeType !== meta.mimeType) return null;
  const bytes = await deps.readStoredFile(doc).catch(() => null);
  if (!bytes || !hasFileSignature(bytes, meta.mimeType)) return null;
  return crypto.createHash("sha256").update(bytes).digest("hex") === meta.sha256 ? bytes : null;
}

function present(visit: VisitRow, original: Buffer | null) {
  const rx = asObject(visit.prescriptions) ?? {};
  const meta = originalMetaOf(visit);
  const { revisions, medicationIds: _ids, originalPrescription: _meta, linkedAppointmentId, ...publicRx } = rx;
  return {
    id: visit.id,
    patientId: visit.patientId,
    appointmentId: typeof linkedAppointmentId === "number" ? linkedAppointmentId : null,
    date: String(visit.date).slice(0, 10),
    visitType: visit.visitType ?? null,
    chiefComplaint: visit.chiefComplaint ?? null,
    subjective: visit.subjective ?? null,
    examination: visit.examination ?? null,
    objective: visit.objective ?? null,
    vitals: visit.vitals ?? null,
    diagnosis: visit.diagnosis ?? null,
    planNotes: visit.planNotes ?? null,
    followUpPlan: visit.followUpPlan ?? null,
    outcome: visit.outcome ?? null,
    labsOrdered: Array.isArray(visit.labsOrdered) ? visit.labsOrdered : [],
    prescriptions: {
      ...publicRx,
      medicines: Array.isArray(rx.medicines) ? rx.medicines : [],
      revisionCount: Array.isArray(revisions) ? revisions.length : 0,
      originalPrescription: meta && original ? {
        name: meta.name, mimeType: meta.mimeType, fileData: original.toString("base64"),
        sizeBytes: meta.sizeBytes, sha256: meta.sha256, uploadedAt: meta.uploadedAt, uploadedBy: meta.uploadedBy,
      } : null,
      originalAvailable: !!(meta && original),
    },
  };
}

const allowedKeys = new Set([
  "appointmentId", "prescriptionDate", "chiefComplaint", "examination", "lmp", "height", "weight", "age",
  "patientType", "vitals", "datingEstimate", "eod", "pog", "gravida", "surgicalHistory", "antenatal",
  "diagnosis", "advice", "followUp", "followUpDate", "medicines", "tests", "scanned", "scanReviewed",
  "transcriptionId", "originalPrescription", "sourceReviewed",
]);

function text(value: unknown, field: string, max = MAX_TEXT): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") throw new InputError(400, `${field} must be text`, [field]);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new InputError(400, `${field} is too long`, [field]);
  return trimmed || null;
}

function isoDate(value: unknown, field: string, deps: PrescriptionTranscriptionDependencies): string | null {
  const raw = text(value, field, 40);
  if (!raw) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10)) ? deps.parseCallDate(raw.slice(0, 10)) : null;
  if (!parsed) throw new InputError(400, `${field} must be a valid YYYY-MM-DD date`, [field]);
  return parsed;
}

function bounded(value: unknown, field: string, max: number): number | null {
  const raw = text(value, field, 20);
  if (raw === null) return null;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0 || number > max) throw new InputError(400, `${field} must be a number between 0 and ${max}`, [field]);
  return number;
}

function positiveId(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof number !== "number" || !Number.isSafeInteger(number) || number <= 0) throw new InputError(400, `${field} must be a positive integer`, [field]);
  return number;
}

function assertScalars(value: unknown, field: string, nested: string[] = []): void {
  if (value === undefined || value === null) return;
  const object = asObject(value);
  if (!object) throw new InputError(400, `${field} must be an object`, [field]);
  for (const [key, item] of Object.entries(object)) {
    if (nested.includes(key)) continue;
    if (item !== null && !["string", "number", "boolean"].includes(typeof item)) throw new InputError(400, `${field}.${key} must be text`, [`${field}.${key}`]);
    if (typeof item === "string" && item.length > MAX_TEXT) throw new InputError(400, `${field}.${key} is too long`, [`${field}.${key}`]);
  }
}

function clinicToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

type Medicine = { name: string; dose: string; frequency: string; duration: string; instructions: string; route: string };

function normalizeMedicines(value: unknown): Medicine[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_MEDICINES) throw new InputError(400, `medicines must be a list of at most ${MAX_MEDICINES} items`, ["medicines"]);
  return value.map((item, index) => {
    const med = asObject(item);
    if (!med) throw new InputError(400, `medicines[${index}] must be an object`, [`medicines[${index}]`]);
    const field = (key: keyof Medicine) => text(med[key], `medicines[${index}].${key}`, 500) ?? "";
    return { name: field("name"), dose: field("dose"), frequency: field("frequency"), duration: field("duration"), instructions: field("instructions"), route: field("route") };
  }).filter((med) => med.name);
}

function normalizeTests(value: unknown): { name: string; type: "lab" | "usg" }[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_TESTS) throw new InputError(400, `tests must be a list of at most ${MAX_TESTS} items`, ["tests"]);
  return value.map((item, index) => {
    const test = asObject(item);
    if (!test) throw new InputError(400, `tests[${index}] must be an object`, [`tests[${index}]`]);
    const type = test.type ?? "lab";
    if (type !== "lab" && type !== "usg") throw new InputError(400, `tests[${index}].type must be "lab" or "usg"`, [`tests[${index}].type`]);
    return { name: text(test.name, `tests[${index}].name`, 300) ?? "", type: type as "lab" | "usg" };
  }).filter((test) => test.name);
}

function normalizeContent(body: Record<string, unknown>, deps: PrescriptionTranscriptionDependencies, appointmentDate: string | null, today: string) {
  const prescriptionDate = isoDate(body.prescriptionDate, "prescriptionDate", deps) ?? (appointmentDate ? String(appointmentDate).slice(0, 10) : null);
  if (!prescriptionDate) throw new InputError(400, "Enter the prescription date", ["prescriptionDate"]);
  if (prescriptionDate > today) throw new InputError(400, "A doctor-issued paper prescription cannot be dated in the future", ["prescriptionDate"]);

  const chiefComplaint = text(body.chiefComplaint, "chiefComplaint");
  const examination = text(body.examination, "examination");
  const diagnosis = text(body.diagnosis, "diagnosis");
  const advice = text(body.advice, "advice");
  const followUp = text(body.followUp, "followUp") ?? "";
  const patientType = text(body.patientType, "patientType", 100);
  const pregnant = /pregnant/i.test(patientType || "");
  const lmp = isoDate(body.lmp, "lmp", deps);
  const height = text(body.height, "height", 40);
  const weight = bounded(body.weight, "weight", 500);
  const age = bounded(body.age, "age", 130);
  const eod = isoDate(body.eod, "eod", deps);
  const pog = text(body.pog, "pog", 40);
  const gravida = text(body.gravida, "gravida", 200);
  const surgicalHistory = text(body.surgicalHistory, "surgicalHistory");

  let followUpDate: string | null;
  if (body.followUpDate === "" || body.followUpDate === null) followUpDate = null;
  else if (body.followUpDate !== undefined) {
    if (typeof body.followUpDate !== "string") throw new InputError(400, "followUpDate must be a date", ["followUpDate"]);
    followUpDate = deps.parseCallDate(body.followUpDate);
    if (!followUpDate) throw new InputError(400, "Enter a valid follow-up date on or after the prescription date", ["followUpDate"]);
  } else followUpDate = deps.prescriptionDueDate(followUp, prescriptionDate);
  if (followUpDate && followUpDate < prescriptionDate) throw new InputError(400, "Enter a valid follow-up date on or after the prescription date", ["followUpDate"]);

  const vitalsInput = body.vitals === undefined || body.vitals === null ? {} : asObject(body.vitals);
  if (!vitalsInput) throw new InputError(400, "vitals must be an object", ["vitals"]);
  const unknownVitals = Object.keys(vitalsInput).filter((key) => !["pulse", "bp", "spo2", "rr"].includes(key));
  if (unknownVitals.length) throw new InputError(400, "Unsupported vitals fields", unknownVitals.map((key) => `vitals.${key}`));
  assertScalars(body.antenatal, "antenatal", ["usg"]);
  const usg = asObject(body.antenatal)?.usg;
  if (usg !== undefined && usg !== null) {
    if (!Array.isArray(usg) || usg.length > 30) throw new InputError(400, "antenatal.usg must be a list of at most 30 scans", ["antenatal.usg"]);
    usg.forEach((line, index) => assertScalars(line ?? {}, `antenatal.usg[${index}]`));
  }
  if (body.datingEstimate !== undefined && body.datingEstimate !== null &&
      (!asObject(body.datingEstimate) || JSON.stringify(body.datingEstimate).length > MAX_TEXT)) {
    throw new InputError(400, "datingEstimate must be a small object", ["datingEstimate"]);
  }
  const antenatal = antenatalFromBody({ patientType, antenatal: body.antenatal });
  const vital = (key: "pulse" | "bp" | "spo2" | "rr") => text(vitalsInput[key], `vitals.${key}`, 40) ?? antenatal?.[key] ?? null;

  return {
    prescriptionDate, followUpDate,
    medicines: normalizeMedicines(body.medicines),
    visit: {
      date: prescriptionDate,
      visitType: "Consultation",
      chiefComplaint,
      subjective: chiefComplaint,
      examination: examination ? { findings: examination } : null,
      objective: examination,
      vitals: {
        followUpDate,
        datingEstimate: body.datingEstimate ?? null,
        pulse: vital("pulse"), bp: vital("bp"), spo2: vital("spo2"), rr: vital("rr"),
        lmp, height, weight, age, patientType,
        eod: pregnant ? eod : null,
        pog: pregnant ? pog : null,
        gravida: pregnant ? gravida : null,
        surgicalHistory: pregnant ? surgicalHistory : null,
        antenatal,
      },
      diagnosis,
      planNotes: advice,
      followUpPlan: followUp || null,
      outcome: "Doctor-issued paper prescription transcribed by reception",
      labsOrdered: normalizeTests(body.tests),
    },
  };
}

function snapshot(visit: VisitRow) {
  const rx = asObject(visit.prescriptions) ?? {};
  const { revisions: _revisions, ...previousRx } = rx;
  return {
    date: visit.date, chiefComplaint: visit.chiefComplaint ?? null, subjective: visit.subjective ?? null,
    examination: visit.examination ?? null, objective: visit.objective ?? null, vitals: visit.vitals ?? null,
    diagnosis: visit.diagnosis ?? null, planNotes: visit.planNotes ?? null, followUpPlan: visit.followUpPlan ?? null,
    labsOrdered: visit.labsOrdered ?? null, prescriptions: previousRx,
  };
}

function medicationFields(med: Medicine, date: string, visitId: number): MedicationWrite {
  return {
    name: med.name,
    dose: med.dose || null,
    frequency: med.frequency || null,
    duration: med.duration || null,
    instructions: med.instructions || null,
    route: med.route || null,
    startDate: date,
    notes: [`Transcribed from doctor-issued paper prescription (transcription #${visitId})`, med.duration ? `Duration: ${med.duration}` : "", med.instructions]
      .filter(Boolean).join(". "),
  };
}

async function synchronizeMedications(tx: TranscriptionTx, patientId: number, visitId: number, date: string, medicines: Medicine[], linkedIds: number[]) {
  const owned = linkedIds.length ? await tx.getMedications(patientId, linkedIds) : [];
  const byId = new Map(owned.filter((med) => med.patientId === patientId).map((med) => [med.id, med]));
  const reusable = linkedIds.map((id) => byId.get(id)).filter((med): med is MedicationRow => !!med);
  const key = (name: unknown) => String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
  const saved: MedicationRow[] = [];
  // Match by medicine name so a corrected drug never inherits another drug's record or adherence logs.
  for (const med of medicines) {
    const index = reusable.findIndex((row) => key(row.name) === key(med.name));
    const existing = index >= 0 ? reusable.splice(index, 1)[0] : undefined;
    const fields = medicationFields(med, date, visitId);
    const row = existing
      ? await tx.updateMedication(existing.id, fields)
      : await tx.createMedication({ ...fields, patientId, status: "active" });
    if (!row) throw new Error("Linked medication disappeared during transcription save");
    saved.push(row);
  }
  for (const obsolete of reusable) await tx.deleteMedication(obsolete.id);
  return saved;
}

function sendError(res: Response, error: unknown) {
  if (error instanceof InputError) {
    res.status(error.status).json({ error: error.message, ...(error.fields ? { fields: error.fields } : {}) });
    return;
  }
  console.error("[prescription-transcriptions]", error instanceof Error ? error.message : error);
  if (!res.headersSent) res.status(500).json({ error: "Could not save the prescription transcription. No changes were saved." });
}

async function authorize(req: Request, res: Response, deps: PrescriptionTranscriptionDependencies): Promise<{ actor: ActorStamp; patientId: number } | null> {
  const actor = await deps.authenticate(req, res);
  if (!actor) {
    if (!res.headersSent) res.status(401).json({ error: "Authentication required" });
    return null;
  }
  if (!("role" in actor) || !TRANSCRIBER_ROLES.has(actor.role)) {
    res.status(403).json({ error: "Reception or clinician access required" });
    return null;
  }
  const raw = String(req.params.id ?? "");
  const patientId = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(patientId) || patientId <= 0) {
    res.status(400).json({ error: "Invalid patient ID" });
    return null;
  }
  if (!(await deps.patientExists(patientId))) {
    res.status(404).json({ error: "Patient not found" });
    return null;
  }
  return { actor: { userId: actor.userId, role: actor.role }, patientId };
}

export function registerPrescriptionTranscriptionRoutes(app: Express, deps: PrescriptionTranscriptionDependencies): void {
  const route = "/api/patients/:id/prescription-transcriptions";

  app.get(route, async (req, res) => {
    try {
      const access = await authorize(req, res, deps);
      if (!access) return;
      const visits = (await deps.listVisits(access.patientId)).filter((visit) => isPaperTranscription(visit, access.patientId));
      visits.sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id);
      const records = [];
      for (const visit of visits) records.push(present(visit, await loadRetainedOriginal(deps, access.patientId, originalMetaOf(visit))));
      res.setHeader("Cache-Control", "private, no-store");
      res.json(records);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post(route, async (req, res) => {
    let stagedFile: { fileData: string | null; s3Key: string | null } | null = null;
    try {
      const access = await authorize(req, res, deps);
      if (!access) return;
      const { actor, patientId } = access;
      const body = asObject(req.body);
      if (!body) throw new InputError(400, "Expected an object");
      const unknown = Object.keys(body).filter((key) => !allowedKeys.has(key));
      if (unknown.length) throw new InputError(400, "Unsupported fields for a paper prescription transcription", unknown);
      if (body.sourceReviewed !== true) throw new InputError(422, "Confirm you reviewed every entered field against the doctor's original paper prescription.", ["sourceReviewed"]);
      for (const flag of ["scanned", "scanReviewed"]) {
        if (body[flag] !== undefined && typeof body[flag] !== "boolean") throw new InputError(400, `${flag} must be true or false`, [flag]);
      }

      const transcriptionId = positiveId(body.transcriptionId, "transcriptionId");
      const existing = transcriptionId
        ? (await deps.listVisits(patientId)).find((visit) => visit.id === transcriptionId && isPaperTranscription(visit, patientId))
        : undefined;
      if (transcriptionId && !existing) throw new InputError(404, "Paper prescription transcription not found for this patient");

      const appointmentId = positiveId(body.appointmentId, "appointmentId");
      const appointment = appointmentId ? await deps.getAppointment(appointmentId) : undefined;
      if (appointmentId && (!appointment || appointment.patientId !== patientId)) throw new InputError(404, "Appointment not found for this patient");

      const now = deps.now?.() ?? new Date();
      const content = normalizeContent(body, deps, appointment?.date ?? null, clinicToday(now));

      const submitted = body.originalPrescription === undefined || body.originalPrescription === null
        ? null : validateOriginalPrescription(body.originalPrescription);
      const retainedMeta = existing ? originalMetaOf(existing) : null;
      let original: Buffer | null = null;
      let replacement: ValidatedOriginal | null = null;
      if (!existing) {
        if (!submitted) throw new InputError(422, "Attach a photo or scan of the doctor's original paper prescription.", ["originalPrescription"]);
        replacement = submitted;
      } else if (submitted && submitted.sha256 !== retainedMeta?.sha256) {
        replacement = submitted;
      } else {
        original = await loadRetainedOriginal(deps, patientId, retainedMeta);
        if (!original && submitted) replacement = submitted;
        else if (!original) throw new InputError(409, "The original paper prescription for this transcription is unavailable. Attach the original again.", ["originalPrescription"]);
      }
      if (replacement) {
        original = replacement.bytes;
        stagedFile = await deps.putOriginalFile(patientId, replacement.bytes, replacement.mimeType);
      }

      const at = now.toISOString();
      const result = await deps.transaction(async (tx) => {
        let locked: VisitRow | undefined;
        if (existing) {
          locked = await tx.lockVisit(existing.id);
          if (!locked || !isPaperTranscription(locked, patientId)) throw new InputError(409, "This transcription changed while saving. Reload and try again.");
          if (!replacement && JSON.stringify(originalMetaOf(locked)) !== JSON.stringify(retainedMeta)) {
            throw new InputError(409, "This transcription changed while saving. Reload and try again.");
          }
        }
        let originalMeta = retainedMeta;
        if (replacement && stagedFile) {
          const doc = await tx.createPatientDocument({
            patientId, fileName: replacement.name, fileData: stagedFile.fileData, s3Key: stagedFile.s3Key,
            mimeType: replacement.mimeType, docType: TRANSCRIPTION_ORIGINAL_DOC_TYPE, label: TRANSCRIPTION_ORIGINAL_LABEL, uploadedAt: at,
          });
          originalMeta = {
            patientDocumentId: doc.id, name: replacement.name, mimeType: replacement.mimeType,
            sizeBytes: replacement.bytes.length, sha256: replacement.sha256, uploadedAt: at, uploadedBy: actor,
          };
        }
        const previousRx = asObject(locked?.prescriptions) ?? {};
        const revisions = Array.isArray(previousRx.revisions) ? previousRx.revisions : [];
        const prescriptions = (visitId: number, medicationIds: number[]) => ({
          source: TRANSCRIPTION_SOURCE,
          doctorIssuedPaper: true,
          sourceReviewed: true,
          transcriptionId: visitId,
          linkedAppointmentId: appointmentId,
          enteredBy: previousRx.enteredBy ?? actor,
          enteredAt: previousRx.enteredAt ?? at,
          updatedBy: actor,
          updatedAt: at,
          originalPrescription: originalMeta,
          medicines: content.medicines,
          medicationIds,
          revisions: locked
            ? [...revisions, { revision: revisions.length + 1, revisedAt: at, revisedBy: actor, previous: snapshot(locked) }]
            : [],
        });
        // Transcriptions never attach to an appointment row, so clinician manual-prescription matching cannot overwrite them.
        const base = { ...content.visit, appointmentId: null, providerId: null };
        const visit = locked ?? await tx.createVisit({ ...base, patientId, prescriptions: prescriptions(0, []) });
        const linkedIds = Array.isArray(previousRx.medicationIds) ? previousRx.medicationIds.filter((id): id is number => Number.isSafeInteger(id)) : [];
        const medications = await synchronizeMedications(tx, patientId, visit.id, content.prescriptionDate, content.medicines, linkedIds);
        const saved = await tx.updateVisit(visit.id, { ...base, prescriptions: prescriptions(visit.id, medications.map((med) => med.id)) });
        if (!saved) throw new Error("Transcription visit disappeared during save");
        return { visit: saved, medications };
      });
      stagedFile = null;
      res.status(existing ? 200 : 201).json({
        visit: present(result.visit, original),
        medications: result.medications,
        created: !existing,
      });
    } catch (error) {
      if (stagedFile) await deps.discardOriginalFile(stagedFile).catch(() => undefined);
      sendError(res, error);
    }
  });
}
