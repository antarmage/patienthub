import type { Express, Request, Response } from "express";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { appointments, encounterDiagnoses, icdCatalog, patients, visitHistory } from "@workspace/db";
import { diagnosisSelectionSchema } from "../../../lib/db/src/icd";
import { db } from "./db";

const saveSchema = z.object({
  appointmentId: z.number().int().positive().optional(),
  visitId: z.number().int().positive().optional(),
  diagnoses: diagnosisSelectionSchema,
}).strict().refine((body) => (body.appointmentId != null) !== (body.visitId != null), "Choose an appointment or a saved visit");

export async function invoiceDiagnoses(patientId: number, sourceId: unknown) {
  if (sourceId == null) return [];
  const parsed = z.number().int().positive().safeParse(sourceId);
  if (!parsed.success) throw Object.assign(new Error("Invalid diagnosis encounter"), { status: 400 });
  const [source] = await db.select().from(encounterDiagnoses).where(and(eq(encounterDiagnoses.id, parsed.data), eq(encounterDiagnoses.patientId, patientId)));
  if (!source) throw Object.assign(new Error("Diagnoses must come from this patient's doctor-confirmed encounter"), { status: 400 });
  return source.diagnoses;
}

export function registerIcdRoutes(app: Express, authenticate: (req: Request, res: Response, clinicianOnly: boolean) => Promise<string | null>) {
  app.get("/api/icd10/search", async (req, res) => {
    if (!await authenticate(req, res, true)) return;
    const parsed = z.string().trim().min(2).max(120).safeParse(req.query.q);
    if (!parsed.success) return res.status(400).json({ error: "Enter 2–120 characters to search ICD-10" });
    const [available] = await db.select({ count: sql<number>`count(*)::int` }).from(icdCatalog);
    if (!available.count) return res.status(503).json({ error: "WHO ICD-10 catalog has not been imported. Ask your administrator to run the catalog import." });
    const escaped = parsed.data.replace(/[\\%_]/g, "\\$&");
    const rows = await db.select({ code: icdCatalog.code, title: icdCatalog.title, release: icdCatalog.release, leaf: icdCatalog.leaf }).from(icdCatalog)
      .where(or(ilike(icdCatalog.code, `${escaped}%`), ilike(icdCatalog.title, `%${escaped}%`), ilike(icdCatalog.terms, `%${escaped}%`)))
      .orderBy(sql`CASE WHEN lower(${icdCatalog.code}) = lower(${parsed.data}) THEN 0 ELSE 1 END`, icdCatalog.code).limit(20);
    res.json(rows);
  });
  app.get("/api/patients/:id/diagnoses", async (req, res) => {
    if (!await authenticate(req, res, false)) return;
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid patient ID" });
    res.json(await db.select().from(encounterDiagnoses).where(eq(encounterDiagnoses.patientId, id)).orderBy(desc(encounterDiagnoses.confirmedAt)));
  });
  app.put("/api/patients/:id/diagnoses", async (req, res) => {
    const userId = await authenticate(req, res, true);
    if (!userId) return;
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid patient ID" });
    const body = saveSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.issues.map((issue) => issue.message).join("; ") });
    const [patient] = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, id));
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    const { appointmentId, visitId, diagnoses } = body.data;
    const [encounter] = appointmentId != null
      ? await db.select({ patientId: appointments.patientId }).from(appointments).where(eq(appointments.id, appointmentId))
      : await db.select({ patientId: visitHistory.patientId }).from(visitHistory).where(eq(visitHistory.id, visitId!));
    if (!encounter || encounter.patientId !== id) return res.status(400).json({ error: "Encounter does not belong to this patient" });
    const codes = await db.select().from(icdCatalog).where(inArray(icdCatalog.code, diagnoses.map((item) => item.code)));
    if (codes.length !== diagnoses.length) return res.status(400).json({ error: "One or more codes are not in the imported WHO ICD-10 catalog" });
    const record = {
      patientId: id, appointmentId: appointmentId ?? null, visitId: visitId ?? null,
      confirmedBy: userId, confirmedAt: new Date().toISOString(),
      diagnoses: diagnoses.map((selection) => {
        const code = codes.find((item) => item.code === selection.code)!;
        return { code: code.code, title: code.title, release: code.release, system: "WHO ICD-10" as const, primary: selection.primary };
      }),
    };
    const [saved] = await db.insert(encounterDiagnoses).values(record).onConflictDoUpdate({
      target: appointmentId != null ? encounterDiagnoses.appointmentId : encounterDiagnoses.visitId,
      set: { diagnoses: record.diagnoses, confirmedBy: record.confirmedBy, confirmedAt: record.confirmedAt },
    }).returning();
    res.json(saved);
  });
}
