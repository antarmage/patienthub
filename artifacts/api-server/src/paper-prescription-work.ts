import type { Express, NextFunction, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import type { AccessActor } from "./clinical-access";
import { paperWorkQuerySchema, paperWorkUpdateSchema, type PaperWorkQuery, type PaperWorkRow } from "../../../lib/db/src/paper-prescription-work";
import { TRANSCRIPTION_SOURCE } from "./prescription-transcriptions";
import { surveyKindFor } from "./survey-kind";

export async function ensurePaperWorkSchema(client: Pick<PoolClient, "query">) {
  await client.query(`CREATE TABLE IF NOT EXISTS paper_prescription_work (
    appointment_id integer PRIMARY KEY REFERENCES appointments(id),
    patient_id integer NOT NULL REFERENCES patients(id),
    status text NOT NULL CHECK(status IN ('pending','not_required')),
    reason text NOT NULL, version integer NOT NULL DEFAULT 1,
    updated_by varchar NOT NULL REFERENCES users(id), updated_at timestamptz NOT NULL DEFAULT now(),
    audit jsonb NOT NULL DEFAULT '[]'::jsonb
  );
  CREATE INDEX IF NOT EXISTS visit_history_paper_link_idx ON visit_history
    ((prescriptions->>'linkedAppointmentId'),patient_id)
    WHERE prescriptions->>'source'='receptionist-paper-transcription';`);
}

const completed = `lower(regexp_replace(coalesce(a.status,''),'[ _]','-','g')) NOT IN ('cancelled','canceled','no-show')
  AND (a.completed_at IS NOT NULL OR lower(a.status)='completed')`;
const projection = `SELECT a.id AS "appointmentId",a.patient_id AS "patientId",p.name AS "patientName",
  a.provider_id AS "providerId",provider.name AS "providerName",a.date::text AS date,a.time,
  CASE WHEN rx.id IS NOT NULL THEN 'recorded'
    WHEN ${completed} THEN coalesce(w.status,'pending') ELSE 'not_due' END AS status,
  rx.id AS "transcriptionId",rx.recorded_at AS "recordedAt",rx.recorded_by AS "recordedBy",
  w.reason,w.updated_at::text AS "updatedAt",coalesce(editor.display_name,editor.username,w.updated_by) AS "updatedBy",
  coalesce(w.version,0) AS version
  FROM appointments a JOIN patients p ON p.id=a.patient_id
  LEFT JOIN providers provider ON provider.id=a.provider_id
  LEFT JOIN paper_prescription_work w ON w.appointment_id=a.id AND w.patient_id=a.patient_id
  LEFT JOIN users editor ON editor.id=w.updated_by
  LEFT JOIN LATERAL (
    SELECT v.id,v.prescriptions->>'enteredAt' AS recorded_at,
      coalesce(u.display_name,u.username,v.prescriptions->'enteredBy'->>'userId') AS recorded_by
    FROM visit_history v LEFT JOIN users u ON u.id=v.prescriptions->'enteredBy'->>'userId'
    WHERE v.patient_id=a.patient_id AND v.prescriptions->>'source'='${TRANSCRIPTION_SOURCE}'
      AND v.prescriptions->>'doctorIssuedPaper'='true' AND v.prescriptions->>'linkedAppointmentId'=a.id::text
    ORDER BY v.id DESC LIMIT 1
  ) rx ON true`;

const error = (status: number, message: string) => Object.assign(new Error(message), { status });
export function createPaperWorkStore(pool: Pool) {
  return {
    async list(query: PaperWorkQuery) {
      // Match the existing consultation/lab classification, including explicit survey overrides.
      const source = `${projection} WHERE ($1::text IS NULL OR a.date::text >= $1) AND a.date::text <= $2
        AND ($3::int IS NULL OR a.patient_id=$3) AND ($4::int IS NULL OR a.provider_id=$4)
        AND (a.survey_type='consultation' OR (coalesce(a.survey_type,'')<>'lab'
          AND concat_ws(' ',a.type,a.visit_type) !~* '\\m(lab|labs|laboratory|blood\\s*(test|work|draw|sample)|pathology|sample\\s*collection|phlebotomy)\\M'))`;
      const result = await pool.query<{ rows: PaperWorkRow[]; total: number }>(`WITH work AS (${source}),
        filtered AS (SELECT * FROM work WHERE $5='all' OR status=$5),
        page AS (SELECT * FROM filtered ORDER BY date DESC,time,"appointmentId" DESC LIMIT $6 OFFSET $7)
        SELECT coalesce((SELECT jsonb_agg(page) FROM page),'[]'::jsonb) AS rows,(SELECT count(*)::int FROM filtered) AS total`,
      [query.from ?? null, query.to, query.patientId ?? null, query.providerId ?? null, query.status, query.limit, query.offset]);
      return result.rows[0];
    },
    async update(id: number, input: ReturnType<typeof paperWorkUpdateSchema.parse>, userId: string) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const appointment = (await client.query<{
          status: string | null; completedAt: string | null; surveyType: string | null; type: string | null; visitType: string | null;
        }>(`SELECT status,completed_at AS "completedAt",survey_type AS "surveyType",type,visit_type AS "visitType"
          FROM appointments WHERE id=$1 FOR UPDATE`, [id])).rows[0];
        if (!appointment) throw error(404, "Appointment not found");
        if (surveyKindFor(appointment) === "lab" || /^(cancelled|canceled|no[-_ ]show)$/i.test(appointment.status || "") ||
            !(appointment.completedAt || appointment.status?.toLowerCase() === "completed")) {
          throw error(409, "Paper entry can only be marked pending or not required for a completed consultation.");
        }
        const current = (await client.query<PaperWorkRow>(`${projection} WHERE a.id=$1`, [id])).rows[0];
        if (!current) throw error(409, "Appointment needs an assigned patient before tracking paper entry.");
        if (current.status === "recorded") throw error(409, "A paper prescription is already recorded. Its status cannot be overridden.");
        if (current.version !== input.version) throw error(409, "Paper entry status changed elsewhere. Refresh before updating.");
        const audit = { at: new Date().toISOString(), by: userId, patientId: current.patientId, previous: current.status, after: input.status, reason: input.reason };
        await client.query(`INSERT INTO paper_prescription_work(appointment_id,status,reason,updated_by,audit,patient_id)
          VALUES($1,$2,$3,$4,jsonb_build_array($5::jsonb),$6)
          ON CONFLICT(appointment_id) DO UPDATE SET status=excluded.status,reason=excluded.reason,patient_id=excluded.patient_id,
            version=paper_prescription_work.version+1,updated_by=excluded.updated_by,updated_at=now(),
            audit=paper_prescription_work.audit || excluded.audit`,
        [id, input.status, input.reason, userId, JSON.stringify(audit), current.patientId]);
        const saved = (await client.query<PaperWorkRow>(`${projection} WHERE a.id=$1`, [id])).rows[0];
        await client.query("COMMIT");
        return saved;
      } catch (failure) {
        await client.query("ROLLBACK"); throw failure;
      } finally { client.release(); }
    },
  };
}

export function registerPaperWork(app: Express, store: ReturnType<typeof createPaperWorkStore>, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  const handler = (write: boolean) => async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required" }); return; }
      if (!("role" in actor) || !["staff", "receptionist", "clinician", "owner"].includes(actor.role)) {
        res.status(403).json({ error: "Reception or clinician access required" }); return;
      }
      if (!write) {
        const query = paperWorkQuerySchema.safeParse(req.query);
        if (!query.success) { res.status(400).json({ error: query.error.issues.map((issue) => issue.message).join("; ") }); return; }
        res.json(await store.list(query.data));
      } else {
        const id = Number(req.params.id), input = paperWorkUpdateSchema.safeParse(req.body);
        if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id > 2147483647) {
          res.status(400).json({ error: "Invalid appointment ID" }); return;
        }
        if (!input.success) { res.status(400).json({ error: input.error.issues.map((issue) => issue.message).join("; ") }); return; }
        res.json(await store.update(id, input.data, actor.userId));
      }
    } catch (failure) {
      if (failure instanceof Error && "status" in failure && [404, 409].includes(Number(failure.status))) {
        res.status(Number(failure.status)).json({ error: failure.message });
      } else next(failure);
    }
  };
  app.get("/api/paper-prescription-work", handler(false));
  app.patch("/api/paper-prescription-work/:id", handler(true));
}
