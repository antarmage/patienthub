import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import type { AccessActor } from "./clinical-access";
import {
  menopauseEnrollmentSchema, menopauseSubmissionSchema, menopausePatientView,
  type MenopauseEnrollment, type MenopauseSubmission, type MenopauseEntry, type MenopauseState,
} from "../../../lib/db/src/menopause";
import { clinicDate } from "../../../lib/db/src/follow-up";

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}
type Doctor = Extract<AccessActor, { userId: string }>;

export async function ensureMenopauseSchema(client: Pick<PoolClient, "query">) {
  await client.query(`CREATE TABLE IF NOT EXISTS menopause_care (
    patient_id integer PRIMARY KEY REFERENCES patients(id),
    enabled boolean NOT NULL DEFAULT false,
    version integer NOT NULL DEFAULT 0,
    audit jsonb NOT NULL DEFAULT '[]'::jsonb
  );
  CREATE TABLE IF NOT EXISTS menopause_entries (
    id serial PRIMARY KEY,
    patient_id integer NOT NULL REFERENCES menopause_care(patient_id),
    date date NOT NULL,
    appointment_id integer REFERENCES appointments(id),
    record jsonb NOT NULL,
    approved_stage text,
    created_at timestamptz NOT NULL DEFAULT now(),
    actor_id text NOT NULL,
    recorded_by text NOT NULL,
    source text NOT NULL CHECK (source IN ('Patient','Clinician'))
  );
  CREATE INDEX IF NOT EXISTS menopause_entries_patient_date_idx ON menopause_entries(patient_id,date,id);`);
}

export function createMenopauseStore(pool: Pool) {
  async function transaction<T>(patientId: number, work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const patient = await client.query("SELECT id FROM patients WHERE id=$1 FOR UPDATE", [patientId]);
      if (!patient.rowCount) fail(404, "Patient not found");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  async function current(client: Pick<PoolClient, "query">, patientId: number) {
    return (await client.query<{ enabled: boolean; version: number }>(
      "SELECT enabled,version FROM menopause_care WHERE patient_id=$1", [patientId])).rows[0] ?? { enabled: false, version: 0 };
  }
  return {
    async read(patientId: number): Promise<MenopauseState> {
      // One snapshot prevents returning entries from a different version during a concurrent save.
      const result = await pool.query<{ enabled: boolean; version: number; entries: MenopauseEntry[] }>(`
        SELECT coalesce(c.enabled,false) AS enabled,coalesce(c.version,0) AS version,
        coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'date',e.date::text,
          'appointmentId',e.appointment_id,'createdAt',e.created_at,'recordedBy',e.recorded_by,
          'source',e.source,'record',e.record,'approvedStage',e.approved_stage) ORDER BY e.date DESC,e.id DESC)
          FROM menopause_entries e WHERE e.patient_id=p.id),'[]'::jsonb) AS entries
        FROM patients p LEFT JOIN menopause_care c ON c.patient_id=p.id WHERE p.id=$1`, [patientId]);
      return result.rows[0] ?? fail(404, "Patient not found");
    },
    async enroll(patientId: number, input: MenopauseEnrollment, actor: Doctor) {
      return transaction(patientId, async (client) => {
        const state = await current(client, patientId);
        if (state.version !== input.expectedVersion) fail(409, "This care record has changed. Reload before saving; your unsaved answers have not been submitted.");
        await client.query(`INSERT INTO menopause_care(patient_id,enabled,version,audit)
          VALUES($1,$2,1,jsonb_build_array($3::jsonb)) ON CONFLICT(patient_id) DO UPDATE SET
          enabled=excluded.enabled,version=menopause_care.version+1,audit=menopause_care.audit || excluded.audit`,
        [patientId, input.enabled, JSON.stringify({ at: new Date().toISOString(), by: actor.userId, enabled: input.enabled, reason: input.reason })]);
      });
    },
    async submit(patientId: number, input: MenopauseSubmission, actor: AccessActor) {
      return transaction(patientId, async (client) => {
        const state = await current(client, patientId);
        if (!state.enabled) fail(409, "Menopause care is not enabled. Ask the treating doctor.");
        if (state.version !== input.expectedVersion) fail(409, "This care record has changed. Reload before saving; your unsaved answers have not been submitted.");
        const today = clinicDate();
        if (input.date > today) fail(400, "Records cannot be dated in the future.");
        if (input.record.kind === "intake" && input.record.data.lmp && input.record.data.lmp > input.date)
          fail(400, "Last menstrual period cannot be after this record date.");
        if (input.appointmentId !== null) {
          const apt = (await client.query<{ date: string }>(
            "SELECT date::text AS date FROM appointments WHERE id=$1 AND patient_id=$2", [input.appointmentId, patientId])).rows[0];
          if (!apt) fail(400, "The selected appointment does not belong to this patient.");
          if (apt.date !== input.date) fail(400, "The record date must match the linked appointment date.");
        }
        let stage: string | null = null;
        if (input.record.kind === "plan") {
          const assessment = (await client.query<{ record: MenopauseEntry["record"]; date: string }>(
            "SELECT record,date::text AS date FROM menopause_entries WHERE id=$1 AND patient_id=$2", [input.record.data.assessmentId, patientId])).rows[0];
          if (!assessment || assessment.record.kind !== "assessment") fail(400, "Select a saved assessment for this patient.");
          if (assessment.date > input.date) fail(400, "The plan date cannot be before its clinical assessment.");
          stage = assessment.record.data.stage;
          if (input.record.data.status === "Approved" && (!input.record.data.reviewDate || input.record.data.reviewDate < today))
            fail(400, "An approved plan requires a review date today or later.");
        }
        const source = "patientId" in actor ? "Patient" : "Clinician";
        const name = "userId" in actor ? (await client.query<{ name: string | null }>(
          "SELECT coalesce(nullif(display_name,''),username) AS name FROM users WHERE id=$1", [actor.userId])).rows[0]?.name : null;
        await client.query(`INSERT INTO menopause_entries(patient_id,date,appointment_id,record,approved_stage,actor_id,recorded_by,source)
          VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8)`,
        [patientId, input.date, input.appointmentId, JSON.stringify(input.record), stage,
          "userId" in actor ? actor.userId : `patient:${actor.patientId}`, name || source, source]);
        await client.query("UPDATE menopause_care SET version=version+1 WHERE patient_id=$1", [patientId]);
      });
    },
  };
}

export function registerMenopauseCare(app: Express, store: ReturnType<typeof createMenopauseStore>,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  app.use("/api/patients/:id/menopause", async (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    const actor = await authenticate(req, res);
    if (!actor) {
      if (!res.headersSent) res.status(401).json({ error: "Authentication required" });
      return;
    }
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id > 2147483647)
      return res.status(400).json({ error: "Invalid patient ID" });
    const doctor = "role" in actor && ["clinician", "owner"].includes(actor.role);
    const ownPatient = "patientId" in actor && actor.patientId === id;
    if (!doctor && !ownPatient) return res.status(403).json({ error: "Doctor or own-patient access required" });
    res.locals.menopauseActor = actor;
    res.locals.menopausePatientId = id;
    res.locals.menopauseDoctor = doctor;
    next();
  });
  app.get("/api/patients/:id/menopause", async (_req, res, next) => {
    try {
      const state = await store.read(res.locals.menopausePatientId);
      res.json(res.locals.menopauseDoctor ? state : menopausePatientView(state));
    } catch (error) { next(error); }
  });
  app.put("/api/patients/:id/menopause/enrollment", async (req, res, next) => {
    if (!res.locals.menopauseDoctor) return res.status(403).json({ error: "Only a doctor can enable or pause menopause care" });
    const input = menopauseEnrollmentSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: input.error.issues.map((issue) => issue.message).join("; ") });
    try {
      await store.enroll(res.locals.menopausePatientId, input.data, res.locals.menopauseActor);
      res.json({ saved: true });
    } catch (error) { next(error); }
  });
  app.post("/api/patients/:id/menopause/entries", async (req, res, next) => {
    const input = menopauseSubmissionSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: input.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
    if (!res.locals.menopauseDoctor && !["intake", "tracking"].includes(input.data.record.kind))
      return res.status(403).json({ error: "Only a doctor can save assessments and care plans" });
    try {
      await store.submit(res.locals.menopausePatientId, input.data, res.locals.menopauseActor);
      res.status(201).json({ saved: true });
    } catch (error) { next(error); }
  });
}
