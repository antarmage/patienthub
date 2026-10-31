import type { Express, Request, Response } from "express";
import { z } from "zod/v4";
import type { AccessActor } from "./clinical-access";

export function isReceptionReader(actor: AccessActor): actor is { userId: string; role: string } {
  return "role" in actor && ["staff", "receptionist"].includes(actor.role);
}

const numericMeasurement = (minimum: number, maximum: number) => z.union([
  z.number(),
  z.string().regex(/^\d+(?:\.\d+)?$/).transform(Number),
]).pipe(z.number().min(minimum).max(maximum));

const measurementSchema = z.object({
  bp: z.string().regex(/^\d{2,3}\/\d{2,3}$/).refine((value) => {
    const [systolic, diastolic] = value.split("/").map(Number);
    return systolic >= 50 && systolic <= 260 && diastolic >= 30 && diastolic <= 180 && systolic > diastolic;
  }, "Invalid blood pressure"),
  pulse: numericMeasurement(20, 250),
  temp: numericMeasurement(30, 45),
  spo2: numericMeasurement(50, 100),
  weight: numericMeasurement(0.1, 500),
  height: numericMeasurement(30, 250),
  bmi: numericMeasurement(0.1, 150).optional(),
  // Accepted for compatibility, but the server always supplies the timestamp.
  recordedAt: z.string().max(100).optional(),
}).partial().strict().refine((value) => Object.keys(value).some((key) => key !== "recordedAt"), "Enter at least one measurement");

export const receptionVitalsSchema = z.object({
  vitals: measurementSchema.nullable(),
  lmp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) =>
    !value.startsWith("0000-") && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value &&
    value <= new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10),
  "LMP must be a valid date, not in the future").nullable(),
}).strict();

export type ReceptionVitalsInput = z.infer<typeof receptionVitalsSchema>;
export type ReceptionVitalsRecord = {
  appointmentId: number;
  patientId: number;
  vitals: unknown;
  lmp: string | null;
};
export type ReportedLmp = { value: string | null; source: "patient-reported"; recordedAt: string; recordedBy: string };

export function receptionMeasurements(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = new Set(["bp", "pulse", "temp", "spo2", "weight", "height", "bmi", "recordedAt", "recordedBy"]);
  const result = Object.fromEntries(Object.entries(value).filter(([key]) => keys.has(key)));
  return Object.keys(result).length ? result : null;
}

export function assertPreconsult(appointment: { status: string | null; seenAt: string | null; completedAt: string | null }): void {
  if (appointment.seenAt || appointment.completedAt ||
      !["scheduled", "booked", "confirmed", "checked-in"].includes((appointment.status || "").toLowerCase())) {
    throw Object.assign(new Error("Vitals may only be recorded before consultation begins"), { status: 409 });
  }
}

export function prepareReceptionVitals(
  currentVitals: unknown, input: ReceptionVitalsInput, userId: string, now = new Date().toISOString(),
) {
  const current = currentVitals && typeof currentVitals === "object" && !Array.isArray(currentVitals)
    ? currentVitals as Record<string, unknown> : {};
  const { recordedAt: _submittedTime, ...measurements } = input.vitals || {};
  const vitals = input.vitals === null ? currentVitals : {
    ...current, ...measurements, recordedAt: now, recordedBy: userId,
  };
  const patientReportedLmp: ReportedLmp = { value: input.lmp, source: "patient-reported", recordedAt: now, recordedBy: userId };
  return { vitals, patientReportedLmp };
}

export interface ReceptionAccessDependencies {
  authenticate(req: Request, res: Response): Promise<AccessActor | null>;
  clinicalDetailsVisible(): Promise<boolean>;
  saveClinicalDetailsVisible(visible: boolean, userId: string): Promise<void>;
  getVitals(id: number): Promise<ReceptionVitalsRecord>;
  saveVitals(id: number, body: ReceptionVitalsInput, userId: string): Promise<ReceptionVitalsRecord>;
}

export function registerReceptionAccessRoutes(app: Express, dependencies: ReceptionAccessDependencies): void {
  const authorize = async (req: Request, res: Response, configure = false, settings = false) => {
    const actor = await dependencies.authenticate(req, res);
    if (!actor) {
      if (!res.headersSent) res.status(401).json({ error: "Authentication required" });
      return null;
    }
    const roles = configure ? ["clinician", "owner"] : settings
      ? ["staff", "receptionist", "admin", "clinician", "owner"]
      : ["staff", "receptionist", "clinician", "owner"];
    if (!("role" in actor) || !roles.includes(actor.role)) {
      res.status(403).json({ error: configure ? "Clinician or owner access required" : "Receptionist or clinician access required" });
      return null;
    }
    res.setHeader("Cache-Control", "private, no-store");
    return actor;
  };
  app.get("/api/clinic/reception-access", async (req, res) => {
    if (!await authorize(req, res, false, true)) return;
    res.json({ clinicalDetailsVisible: await dependencies.clinicalDetailsVisible(), canRecordVitals: true });
  });
  app.put("/api/clinic/reception-access", async (req, res) => {
    const actor = await authorize(req, res, true);
    if (!actor) return;
    const parsed = z.object({ clinicalDetailsVisible: z.boolean() }).strict().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Expected {clinicalDetailsVisible: boolean}" });
    await dependencies.saveClinicalDetailsVisible(parsed.data.clinicalDetailsVisible, actor.userId);
    res.json({ ...parsed.data, canRecordVitals: true });
  });
  const handle = (write: boolean) => async (req: Request, res: Response) => {
    const actor = await authorize(req, res);
    if (!actor) return;
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id)) {
      return res.status(400).json({ error: "Invalid appointment ID" });
    }
    try {
      if (!write) return res.json(await dependencies.getVitals(id));
      const parsed = receptionVitalsSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") });
      res.json(await dependencies.saveVitals(id, parsed.data, actor.userId));
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 404 || status === 409) return res.status(status).json({ error: (error as Error).message });
      throw error;
    }
  };
  app.get("/api/appointments/:id/reception-vitals", handle(false));
  app.post("/api/appointments/:id/reception-vitals", handle(true));
}
