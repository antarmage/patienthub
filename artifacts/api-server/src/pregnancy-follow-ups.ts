import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import { z } from "zod/v4";
import { isDeepStrictEqual } from "node:util";
import type { AccessActor } from "./clinical-access";
import type { PregnancyEpisode } from "../../../lib/db/src/pregnancy-episodes";
import { clinicDate } from "../../../lib/db/src/follow-up";
import {
  planPregnancyFollowUp,
  type PregnancyFollowUp,
  type FollowUpAppointment,
  type FollowUpVisit,
} from "../../../lib/db/src/pregnancy-follow-up";

export async function ensurePregnancyFollowUpSchema(
  client: Pick<PoolClient, "query">,
) {
  await client.query(`CREATE TABLE IF NOT EXISTS pregnancy_follow_up_plans (
    patient_id integer PRIMARY KEY REFERENCES patients(id),
    plan jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by text NOT NULL,
    audit jsonb NOT NULL DEFAULT '[]'::jsonb
  )`);
}

export function createPregnancyFollowUpStore(pool: Pool) {
  return {
    async read(patientId: number): Promise<PregnancyFollowUp | null> {
      const patient = (
        await pool.query<{ plan: PregnancyFollowUp | null }>(
          `SELECT (SELECT p.plan
        FROM pregnancy_follow_up_plans p JOIN pregnancy_episodes e
        ON e.id=(p.plan->>'episodeId')::int AND e.patient_id=p.patient_id
        WHERE p.patient_id=$1 AND e.details->>'status'='current') AS plan
        FROM patients WHERE id=$1`,
          [patientId],
        )
      ).rows[0];
      if (!patient)
        throw Object.assign(new Error("Patient not found"), { status: 404 });
      return patient.plan;
    },
    async sync(
      ids: number[],
      userId: string,
    ): Promise<Record<string, PregnancyFollowUp | null>> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result: Record<string, PregnancyFollowUp | null> = {};
        for (const patientId of [...ids].sort((a, b) => a - b)) {
          const patient = (
            await client.query<{ nextReview: string | null }>(
              `SELECT next_review AS "nextReview" FROM patients WHERE id=$1 FOR UPDATE`,
              [patientId],
            )
          ).rows[0];
          if (!patient)
            throw Object.assign(new Error("Patient not found"), {
              status: 404,
            });
          const episodes = (
            await client.query<PregnancyEpisode>(
              `SELECT e.id,e.patient_id AS "patientId",e.details,
            coalesce((SELECT jsonb_agg(jsonb_build_object('kind',
              CASE WHEN l.appointment_id IS NOT NULL THEN 'appointment' WHEN l.visit_id IS NOT NULL THEN 'visit' ELSE 'lab' END,
              'id',coalesce(l.appointment_id,l.visit_id,l.lab_result_id))) FROM pregnancy_episode_records l
              WHERE l.episode_id=e.id AND l.patient_id=e.patient_id),'[]'::jsonb) AS records
            FROM pregnancy_episodes e WHERE e.patient_id=$1 AND e.details->>'status'='current'`,
              [patientId],
            )
          ).rows;
          if (episodes.length > 1)
            throw new Error("Conflicting current pregnancy episodes");
          const previous = (
            await client.query<{ plan: PregnancyFollowUp | null }>(
              "SELECT plan FROM pregnancy_follow_up_plans WHERE patient_id=$1",
              [patientId],
            )
          ).rows[0];
          let plan: PregnancyFollowUp | null = null;
          if (episodes[0]) {
            const appointments = (
              await client.query<FollowUpAppointment>(
                `SELECT id,date::text AS date,status,
              follow_up_date::text AS "followUpDate",follow_up_notes AS "followUpNotes" FROM appointments WHERE patient_id=$1`,
                [patientId],
              )
            ).rows;
            const visits = (
              await client.query<FollowUpVisit>(
                `SELECT id,date::text AS date,appointment_id AS "appointmentId",
              follow_up_plan AS "followUpPlan",vitals FROM visit_history WHERE patient_id=$1`,
                [patientId],
              )
            ).rows;
            plan = planPregnancyFollowUp({
              episode: episodes[0],
              appointments,
              visits,
              nextReview: patient.nextReview,
              previous: previous?.plan || null,
              today: clinicDate(),
            });
          }
          if (!isDeepStrictEqual(previous?.plan ?? null, plan)) {
            const audit = {
              at: new Date().toISOString(),
              by: userId,
              previous: previous?.plan ?? null,
              after: plan,
            };
            await client.query(
              `INSERT INTO pregnancy_follow_up_plans(patient_id,plan,updated_by,audit)
              VALUES($1,$2::jsonb,$3,jsonb_build_array($4::jsonb)) ON CONFLICT(patient_id) DO UPDATE SET
              plan=excluded.plan,updated_at=now(),updated_by=excluded.updated_by,
              audit=pregnancy_follow_up_plans.audit || excluded.audit`,
              [patientId, JSON.stringify(plan), userId, JSON.stringify(audit)],
            );
          }
          result[String(patientId)] = plan;
        }
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export function registerPregnancyFollowUps(
  app: Express,
  store: ReturnType<typeof createPregnancyFollowUpStore>,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
) {
  app.get(
    "/api/patients/:id/pregnancy-episodes/follow-up",
    async (req, res, next) => {
      res.setHeader("Cache-Control", "private, no-store");
      const id = Number(req.params.id);
      const actor = await authenticate(req, res);
      if (!actor) {
        if (!res.headersSent)
          res.status(401).json({ error: "Authentication required" });
        return;
      }
      const doctor =
        "role" in actor && ["clinician", "owner"].includes(actor.role);
      if (
        !doctor &&
        !("patientId" in actor && actor.patientId === id) &&
        res.locals.receptionClinicalRead !== true
      )
        return res
          .status(403)
          .json({ error: "Clinical viewing permission required" });
      if (
        !/^[1-9]\d*$/.test(String(req.params.id)) ||
        !Number.isInteger(id) ||
        id < 1 ||
        id > 2147483647
      )
        return res.status(400).json({ error: "Invalid patient ID" });
      try {
        res.json(await store.read(id));
      } catch (error) {
        if (error instanceof Error && "status" in error && error.status === 404)
          return res.status(404).json({ error: error.message });
        next(error);
      }
    },
  );
  app.post("/api/pregnancy-follow-ups/sync", async (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    const actor = await authenticate(req, res);
    if (!actor) {
      if (!res.headersSent)
        res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!("role" in actor) || !["clinician", "owner"].includes(actor.role))
      return res.status(403).json({
        error:
          "Doctor or owner access required to save pregnancy follow-up plans",
      });
    const parsed = z
      .object({
        patientIds: z
          .array(z.number().int().min(1).max(2147483647))
          .max(500)
          .refine(
            (ids) => new Set(ids).size === ids.length,
            "Select each patient once",
          ),
      })
      .strict()
      .safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Enter a valid unique patient ID list" });
    try {
      return res.json(await store.sync(parsed.data.patientIds, actor.userId));
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404)
        return res.status(404).json({ error: error.message });
      next(error);
    }
  });
}
