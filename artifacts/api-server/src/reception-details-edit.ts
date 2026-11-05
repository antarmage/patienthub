import type { Express, Request, Response } from "express";
import { z } from "zod/v4";
import type { Patient } from "@workspace/db";
import type { AccessActor } from "./clinical-access";

export const RECEPTION_HISTORY_MAX_BYTES = 100_000;
const reservedNames = new Set([
  "proto", "prototype", "constructor", "conception", "patientconception",
  "patientreportedlmp", "onboardingappointmentid", "pregnancyfollowups", "receptiondetailseditaudit",
  "recordedat", "recordedby", "updatedat", "updatedby", "createdat", "createdby",
  "appointmentid", "source", "diagnosisencounterid", "cliniciannote", "riskscore", "plan",
  "diagnosis", "diagnoses", "diagnosisencounters", "clinicalnotes", "prescriptions", "visithistory",
]);

export function reservedReceptionHistoryKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return key.startsWith("_") || reservedNames.has(normalized) ||
    /^(audit|provenance|private|clinician|assessment|server|secret|password|credential|token)/.test(normalized) ||
    /(audit|provenance)$/.test(normalized);
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function editableHistory(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(editableHistory);
  if (!record(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !reservedReceptionHistoryKey(key))
    .map(([key, child]) => [key, editableHistory(child)]));
}

const historySchema = z.custom<Record<string, unknown>>(record, "History must be a JSON object").superRefine((value, context) => {
  if (!record(value)) {
    context.addIssue({ code: "custom", message: "History must be a JSON object" });
    return;
  }
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const item = pending.pop()!;
    if (++nodes > 20_000 || item.depth > 20) {
      context.addIssue({ code: "custom", message: "History exceeds 20 levels or 20,000 values" });
      return;
    }
    const child = item.value;
    if (child === null || typeof child === "string" || typeof child === "boolean" ||
        typeof child === "number" && Number.isFinite(child)) continue;
    if (Array.isArray(child)) {
      pending.push(...child.map((value) => ({ value, depth: item.depth + 1 })));
    } else if (record(child)) {
      for (const [key, value] of Object.entries(child)) {
        if (reservedReceptionHistoryKey(key)) {
          context.addIssue({ code: "custom", message: `Protected history key: ${key}` });
          return;
        }
        pending.push({ value, depth: item.depth + 1 });
      }
    } else {
      context.addIssue({ code: "custom", message: "History must contain JSON values only" });
      return;
    }
  }
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > RECEPTION_HISTORY_MAX_BYTES) {
    context.addIssue({ code: "custom", message: "History must not exceed 100,000 UTF-8 bytes" });
  }
});

const clinicToday = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const pastDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) =>
  !value.startsWith("0000-") && Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value && value <= clinicToday(),
"Expected a valid YYYY-MM-DD date, not in the future");
const nullableText = (max: number) => z.string().max(max).nullable();

export const receptionDetailsEditSchema = z.object({
  name: z.string().trim().min(1).max(200),
  age: z.number().int().min(0).max(130),
  phone: nullableText(50),
  email: z.union([z.email().max(254), z.literal("")]).nullable(),
  address: nullableText(2000),
  dob: pastDate.nullable(),
  type: nullableText(100),
  lmp: pastDate.nullable(),
  height: z.string().regex(/^\d+(?:\.\d+)?$/)
    .refine((value) => Number(value) >= 30 && Number(value) <= 250, "Height must be 30–250 cm").nullable(),
  weight: z.number().min(0.1).max(500).nullable(),
  pregnancyStatus: z.enum(["active", "pregnant", "completed", "aborted", "not_continuing"]).nullable(),
  condition: nullableText(2000),
  contraception: nullableText(2000),
  history: historySchema,
}).partial().strict().refine((value) => Object.keys(value).length > 0, "Provide at least one editable field");

export type ReceptionDetailsEditInput = z.infer<typeof receptionDetailsEditSchema>;
export type ReceptionDetailsEditActor = { userId: string; role: string };
const editableFields = Object.keys(receptionDetailsEditSchema.shape);

export function receptionDetailsProjection(patient: Patient): Record<string, unknown> {
  return {
    id: patient.id,
    ...Object.fromEntries(editableFields.map((key) =>
      [key, key === "history" ? editableHistory(record(patient.history) ? patient.history : {})
        : patient[key as keyof Patient]])),
  };
}

function hasProtectedHistory(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasProtectedHistory);
  return record(value) && Object.entries(value).some(([key, child]) =>
    reservedReceptionHistoryKey(key) || hasProtectedHistory(child));
}

function mergeHistory(current: unknown, patch: unknown): unknown {
  if (record(patch)) {
    const merged = record(current) ? { ...current } : {};
    for (const [key, value] of Object.entries(patch)) merged[key] = mergeHistory(merged[key], value);
    return merged;
  }
  if (hasProtectedHistory(current)) {
    throw Object.assign(new Error("Edit history section fields individually to preserve protected provenance"), { status: 400 });
  }
  return patch;
}

function editedHistoryPaths(value: Record<string, unknown>, prefix = "history"): string[] {
  return Object.entries(value).flatMap(([key, child]) => record(child) && Object.keys(child).length
    ? editedHistoryPaths(child, `${prefix}.${key}`) : [`${prefix}.${key}`]);
}

export function prepareReceptionDetailsEdit(
  current: Patient, input: ReceptionDetailsEditInput, actor: ReceptionDetailsEditActor,
  now = new Date().toISOString(),
) {
  const priorHistory = record(current.history) ? current.history : {};
  const history = input.history ? mergeHistory(priorHistory, input.history) as Record<string, unknown> : { ...priorHistory };
  if (Buffer.byteLength(JSON.stringify(editableHistory(history)), "utf8") > RECEPTION_HISTORY_MAX_BYTES) {
    throw Object.assign(new Error("Merged editable history must not exceed 100,000 UTF-8 bytes"), { status: 400 });
  }
  const previousAudit = priorHistory.receptionDetailsEditAudit;
  const revision = {
    source: "reception-details-edit", editedBy: actor.userId, role: actor.role, editedAt: now,
    fields: Object.keys(input).flatMap((key) => key === "history" ? editedHistoryPaths(input.history!) : [key]),
    previous: receptionDetailsProjection(current),
  };
  history.receptionDetailsEditAudit = Array.isArray(previousAudit) ? [...previousAudit, revision]
    : previousAudit === undefined ? [revision] : [{ retainedPreviousAudit: previousAudit }, revision];
  return { ...input, history };
}

export interface ReceptionDetailsEditTransaction {
  lockPatient(id: number): Promise<Patient | undefined>;
  updatePatient(id: number, update: ReturnType<typeof prepareReceptionDetailsEdit>): Promise<Patient>;
}

export async function commitReceptionDetailsEdit(
  tx: ReceptionDetailsEditTransaction, id: number, input: ReceptionDetailsEditInput, actor: ReceptionDetailsEditActor,
): Promise<Patient> {
  const patient = await tx.lockPatient(id);
  if (!patient) throw Object.assign(new Error("Patient not found"), { status: 404 });
  return tx.updatePatient(id, prepareReceptionDetailsEdit(patient, input, actor));
}

export interface ReceptionDetailsEditDependencies {
  authenticate(req: Request, res: Response): Promise<AccessActor | null>;
  getPatient(id: number): Promise<Patient | undefined>;
  savePatient(id: number, input: ReceptionDetailsEditInput, actor: ReceptionDetailsEditActor): Promise<Patient>;
}

export function registerReceptionDetailsEditRoutes(app: Express, dependencies: ReceptionDetailsEditDependencies): void {
  const handle = (write: boolean) => async (req: Request, res: Response) => {
    const actor = await dependencies.authenticate(req, res);
    if (!actor) {
      if (!res.headersSent) res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!("role" in actor) || !["staff", "receptionist", "clinician", "owner"].includes(actor.role)) {
      return res.status(403).json({ error: "Receptionist or clinician access required" });
    }
    res.setHeader("Cache-Control", "private, no-store");
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id > 2_147_483_647) {
      return res.status(400).json({ error: "Invalid patient ID" });
    }
    try {
      let patient: Patient | undefined;
      if (write) {
        const parsed = receptionDetailsEditSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") });
        patient = await dependencies.savePatient(id, parsed.data, actor);
      } else patient = await dependencies.getPatient(id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      return res.json(receptionDetailsProjection(patient));
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 400 || status === 404) return res.status(status).json({ error: (error as Error).message });
      throw error;
    }
  };
  app.get("/api/patients/:id/reception-details-edit", handle(false));
  app.patch("/api/patients/:id/reception-details-edit", handle(true));
}
