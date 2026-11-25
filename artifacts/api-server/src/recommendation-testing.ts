import type { Express, Request, Response, NextFunction } from "express";
import type { Pool, PoolClient } from "pg";
import { z } from "zod/v4";
import type { AccessActor } from "./clinical-access";
import { checkInSchema, estimatePeriod, feedbackSchema, recommend, storedFeedbackSchema, type CheckIn, type Feedback } from "./recommendation-engine";

export async function ensureRecommendationTestingSchema(client: Pick<PoolClient, "query">) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS recommendation_test_period_starts (
      patient_id integer NOT NULL REFERENCES patients(id),
      start_date date NOT NULL,
      recorded_by text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (patient_id, start_date)
    );
    CREATE TABLE IF NOT EXISTS recommendation_test_check_ins (
      patient_id integer NOT NULL REFERENCES patients(id),
      check_in_date date NOT NULL,
      details jsonb NOT NULL,
      recorded_by text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (patient_id, check_in_date)
    );
    CREATE TABLE IF NOT EXISTS recommendation_test_feedback (
      patient_id integer NOT NULL,
      check_in_date date NOT NULL,
      activity_id text NOT NULL,
      action text NOT NULL,
      recorded_by text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (patient_id, check_in_date, activity_id),
      FOREIGN KEY (patient_id, check_in_date)
        REFERENCES recommendation_test_check_ins(patient_id, check_in_date) ON DELETE CASCADE
    );
  `);
}

export async function ensureRecommendationProductionSchema(client: Pick<PoolClient, "query">) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS recommendation_period_starts (
      patient_id integer NOT NULL REFERENCES patients(id),
      start_date date NOT NULL,
      recorded_by text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (patient_id, start_date)
    );
    CREATE TABLE IF NOT EXISTS recommendation_check_ins (
      patient_id integer NOT NULL REFERENCES patients(id),
      check_in_date date NOT NULL,
      details jsonb NOT NULL,
      recorded_by text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (patient_id, check_in_date)
    );
    CREATE TABLE IF NOT EXISTS recommendation_feedback (
      patient_id integer NOT NULL,
      check_in_date date NOT NULL,
      activity_id text NOT NULL,
      action text NOT NULL,
      recorded_by text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (patient_id, check_in_date, activity_id),
      FOREIGN KEY (patient_id, check_in_date)
        REFERENCES recommendation_check_ins(patient_id, check_in_date) ON DELETE CASCADE
    );
  `);
}

export function createRecommendationTestingStore(pool: Pool) {
  return {
    async patientExists(patientId: number) {
      return (await pool.query("SELECT 1 FROM patients WHERE id=$1", [patientId])).rowCount !== 0;
    },
    async listPeriods(patientId: number, asOf: string) {
      const result = await pool.query<{ startDate: string }>(
        `SELECT to_char(start_date, 'YYYY-MM-DD') AS "startDate"
         FROM recommendation_test_period_starts WHERE patient_id=$1 AND start_date <= $2::date
         ORDER BY start_date DESC LIMIT 100`,
        [patientId, asOf],
      );
      return result.rows.map((row) => row.startDate);
    },
    async savePeriod(patientId: number, date: string, actorId: string) {
      await pool.query(
        `INSERT INTO recommendation_test_period_starts(patient_id,start_date,recorded_by) VALUES($1,$2::date,$3)
         ON CONFLICT(patient_id,start_date) DO UPDATE SET recorded_by=$3,updated_at=now()`,
        [patientId, date, actorId],
      );
    },
    async deletePeriod(patientId: number, date: string) {
      return (await pool.query("DELETE FROM recommendation_test_period_starts WHERE patient_id=$1 AND start_date=$2::date", [patientId, date])).rowCount !== 0;
    },
    async getCheckIn(patientId: number, date: string): Promise<CheckIn | null> {
      const result = await pool.query<{ details: unknown }>(
        "SELECT details FROM recommendation_test_check_ins WHERE patient_id=$1 AND check_in_date=$2::date",
        [patientId, date],
      );
      return result.rows.length ? checkInSchema.parse(result.rows[0].details) : null;
    },
    async saveCheckIn(patientId: number, date: string, input: CheckIn, actorId: string) {
      await pool.query(
        `INSERT INTO recommendation_test_check_ins(patient_id,check_in_date,details,recorded_by)
         VALUES($1,$2::date,$3::jsonb,$4)
         ON CONFLICT(patient_id,check_in_date) DO UPDATE SET details=$3::jsonb,recorded_by=$4,updated_at=now()`,
        [patientId, date, JSON.stringify(input), actorId],
      );
    },
    async deleteCheckIn(patientId: number, date: string) {
      return (await pool.query("DELETE FROM recommendation_test_check_ins WHERE patient_id=$1 AND check_in_date=$2::date", [patientId, date])).rowCount !== 0;
    },
    async listFeedback(patientId: number, date: string): Promise<Feedback[]> {
      const result = await pool.query<{ activityId: string; action: string }>(
        `SELECT activity_id AS "activityId", action FROM recommendation_test_feedback
         WHERE patient_id=$1 AND check_in_date=$2::date ORDER BY activity_id`,
        [patientId, date],
      );
      return result.rows.map((row) => storedFeedbackSchema.parse(row));
    },
    async saveFeedback(patientId: number, date: string, input: Feedback, actorId: string) {
      const result = await pool.query(
        `INSERT INTO recommendation_test_feedback(patient_id,check_in_date,activity_id,action,recorded_by)
         SELECT patient_id,check_in_date,$3,$4,$5 FROM recommendation_test_check_ins
         WHERE patient_id=$1 AND check_in_date=$2::date
         ON CONFLICT(patient_id,check_in_date,activity_id)
         DO UPDATE SET action=$4,recorded_by=$5,updated_at=now()`,
        [patientId, date, input.activityId, input.action, actorId],
      );
      return result.rowCount !== 0;
    },
  };
}

export function createRecommendationProductionStore(pool: Pool) {
  return {
    async patientExists(patientId: number) {
      return (await pool.query("SELECT 1 FROM patients WHERE id=$1", [patientId])).rowCount !== 0;
    },
    async listPeriods(patientId: number, asOf: string) {
      const result = await pool.query<{ startDate: string }>(
        `SELECT to_char(start_date, 'YYYY-MM-DD') AS "startDate"
         FROM recommendation_period_starts WHERE patient_id=$1 AND start_date <= $2::date
         ORDER BY start_date DESC LIMIT 100`,
        [patientId, asOf],
      );
      return result.rows.map((row) => row.startDate);
    },
    async savePeriod(patientId: number, date: string, actorId: string) {
      await pool.query(
        `INSERT INTO recommendation_period_starts(patient_id,start_date,recorded_by) VALUES($1,$2::date,$3)
         ON CONFLICT(patient_id,start_date) DO UPDATE SET recorded_by=$3,updated_at=now()`,
        [patientId, date, actorId],
      );
    },
    async deletePeriod(patientId: number, date: string) {
      return (await pool.query(
        "DELETE FROM recommendation_period_starts WHERE patient_id=$1 AND start_date=$2::date",
        [patientId, date],
      )).rowCount !== 0;
    },
    async getCheckIn(patientId: number, date: string): Promise<CheckIn | null> {
      const result = await pool.query<{ details: unknown }>(
        "SELECT details FROM recommendation_check_ins WHERE patient_id=$1 AND check_in_date=$2::date",
        [patientId, date],
      );
      return result.rows.length ? checkInSchema.parse(result.rows[0].details) : null;
    },
    async saveCheckIn(patientId: number, date: string, input: CheckIn, actorId: string) {
      await pool.query(
        `INSERT INTO recommendation_check_ins(patient_id,check_in_date,details,recorded_by)
         VALUES($1,$2::date,$3::jsonb,$4)
         ON CONFLICT(patient_id,check_in_date) DO UPDATE SET details=$3::jsonb,recorded_by=$4,updated_at=now()`,
        [patientId, date, JSON.stringify(input), actorId],
      );
    },
    async saveFeedback(patientId: number, date: string, input: Feedback, actorId: string) {
      const result = await pool.query(
        `INSERT INTO recommendation_feedback(patient_id,check_in_date,activity_id,action,recorded_by)
         SELECT patient_id,check_in_date,$3,$4,$5 FROM recommendation_check_ins
         WHERE patient_id=$1 AND check_in_date=$2::date
         ON CONFLICT(patient_id,check_in_date,activity_id)
         DO UPDATE SET action=$4,recorded_by=$5,updated_at=now()`,
        [patientId, date, input.activityId, input.action, actorId],
      );
      return result.rowCount !== 0;
    },
  };
}

export function registerRecommendationProduction(
  app: Express,
  store: ReturnType<typeof createRecommendationProductionStore>,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
  enabled: () => boolean = () => process.env.SAIVIE_RECOMMENDATION_PATIENT_TESTING === "true",
) {
  const base = "/api/recommendations/patients/:id";

  const handler = (action: (req: Request, res: Response, patientId: number, actorId: string) => Promise<void>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Cache-Control", "private, no-store");
      try {
        if (!enabled()) {
          res.status(404).json({ error: "Not found." });
          return;
        }
        const actor = await authenticate(req, res);
        if (!actor) {
          if (!res.headersSent) res.status(401).json({ error: "Authentication required." });
          return;
        }
        const rawId = req.params.id;
        const patientId = Number(rawId);
        if (typeof rawId !== "string" || !/^[1-9]\d*$/.test(rawId) ||
          !Number.isSafeInteger(patientId) || patientId > 2147483647) {
          res.status(400).json({ error: "Invalid patient ID." });
          return;
        }
        if ("patientId" in actor) {
          if (actor.patientId !== patientId) {
            res.status(403).json({ error: "Forbidden." });
            return;
          }
        } else if (!["clinician", "owner"].includes(actor.role)) {
          res.status(403).json({ error: "Clinician or owner access required." });
          return;
        }
        if (!await store.patientExists(patientId)) {
          res.status(404).json({ error: "Patient not found." });
          return;
        }
        const actorId = "patientId" in actor ? `patient:${actor.patientId}` : `staff:${actor.userId}`;
        await action(req, res, patientId, actorId);
      } catch (error) {
        next(error);
      }
    };

  const parseDate = (raw: unknown, res: Response) => {
    const result = z.iso.date().safeParse(raw);
    if (!result.success) {
      res.status(400).json({ error: "A valid YYYY-MM-DD date is required." });
      return null;
    }
    return result.data;
  };

  app.get(`${base}/period-starts`, handler(async (req, res, patientId) => {
    const date = parseDate(req.query.asOf, res);
    if (!date) return;
    res.json({ periodStarts: await store.listPeriods(patientId, date) });
  }));

  app.put(`${base}/period-starts/:date`, handler(async (req, res, patientId, actorId) => {
    const date = parseDate(req.params.date, res);
    if (!date) return;
    if (!z.object({}).strict().safeParse(req.body).success) {
      res.status(400).json({ error: "Expected an empty object." });
      return;
    }
    await store.savePeriod(patientId, date, actorId);
    res.json({ startDate: date });
  }));

  app.delete(`${base}/period-starts/:date`, handler(async (req, res, patientId) => {
    const date = parseDate(req.params.date, res);
    if (!date) return;
    if (!await store.deletePeriod(patientId, date)) {
      res.status(404).json({ error: "Period start not found." });
      return;
    }
    res.status(204).end();
  }));

  app.put(`${base}/check-ins/:date`, handler(async (req, res, patientId, actorId) => {
    const date = parseDate(req.params.date, res);
    if (!date) return;
    const input = checkInSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: input.error.issues.map((issue) => issue.message).join("; ") });
      return;
    }
    await store.saveCheckIn(patientId, date, input.data, actorId);
    res.json({ date, checkIn: input.data });
  }));

  app.put(`${base}/feedback/:date`, handler(async (req, res, patientId, actorId) => {
    const date = parseDate(req.params.date, res);
    if (!date) return;
    const input = feedbackSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: input.error.issues.map((issue) => issue.message).join("; ") });
      return;
    }
    if (!await store.saveFeedback(patientId, date, input.data, actorId)) {
      res.status(404).json({ error: "Check-in not found." });
      return;
    }
    res.json({ date, ...input.data });
  }));

  app.get(`${base}/insights`, handler(async (req, res, patientId) => {
    const date = parseDate(req.query.date, res);
    if (!date) return;
    const [checkIn, periodStarts] = await Promise.all([
      store.getCheckIn(patientId, date),
      store.listPeriods(patientId, date),
    ]);
    res.json({
      date,
      algorithmVersion: "patient-test-v1",
      notForClinicalUse: true,
      checkIn,
      forecast: estimatePeriod(date, periodStarts, checkIn),
      recommendations: recommend(checkIn),
      periodCare: { status: "awaiting_clinical_review", blocks: [] },
      educationalNotice:
        "Recommendations are general wellbeing guidance, not medical advice. The period forecast is experimental and is not suitable for contraception or diagnosis.",
    });
  }));
}

export function registerRecommendationTesting(
  app: Express,
  store: ReturnType<typeof createRecommendationTestingStore>,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
  enabled: () => boolean = () => process.env.SAIVIE_RECOMMENDATION_STAFF_TESTING === "true",
) {
  const base = "/api/recommendation-testing/patients/:id";
  const handler = (action: (req: Request, res: Response, patientId: number, actorId: string) => Promise<void>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Cache-Control", "private, no-store");
      try {
        if (!enabled()) { res.status(404).json({ error: "Not found." }); return; }
        const actor = await authenticate(req, res);
        if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required." }); return; }
        if (!("role" in actor) || !["clinician", "owner"].includes(actor.role)) {
          res.status(403).json({ error: "Clinician or owner access required." }); return;
        }
        const rawId = req.params.id;
        const patientId = Number(rawId);
        if (typeof rawId !== "string" || !/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(patientId) || patientId > 2147483647) {
          res.status(400).json({ error: "Invalid patient ID." }); return;
        }
        if (!await store.patientExists(patientId)) { res.status(404).json({ error: "Patient not found." }); return; }
        await action(req, res, patientId, actor.userId);
      } catch (error) { next(error); }
    };
  const parseDate = (raw: unknown, res: Response) => {
    const result = z.iso.date().safeParse(raw);
    if (!result.success) { res.status(400).json({ error: "A valid YYYY-MM-DD date is required." }); return null; }
    return result.data;
  };
  app.get(`${base}/period-starts`, handler(async (req, res, patientId) => {
    const date = parseDate(req.query.asOf, res);
    if (!date) return;
    res.json({ periodStarts: await store.listPeriods(patientId, date) });
  }));
  app.put(`${base}/period-starts/:date`, handler(async (req, res, patientId, actorId) => {
    const date = parseDate(req.params.date, res);
    if (!date) return;
    if (!z.object({}).strict().safeParse(req.body).success) { res.status(400).json({ error: "Expected an empty object." }); return; }
    await store.savePeriod(patientId, date, actorId);
    res.json({ startDate: date });
  }));
  app.delete(`${base}/period-starts/:date`, handler(async (req, res, patientId) => {
    const date = parseDate(req.params.date, res);
    if (!date) return;
    if (!await store.deletePeriod(patientId, date)) { res.status(404).json({ error: "Period start not found." }); return; }
    res.status(204).end();
  }));
  app.put(`${base}/check-ins/:date`, handler(async (req, res, patientId, actorId) => {
    const date = parseDate(req.params.date, res);
    if (!date) return;
    const input = checkInSchema.safeParse(req.body);
    if (!input.success) { res.status(400).json({ error: input.error.issues.map((issue) => issue.message).join("; ") }); return; }
    await store.saveCheckIn(patientId, date, input.data, actorId);
    res.json({ date, checkIn: input.data });
  }));
  app.delete(`${base}/check-ins/:date`, handler(async (req, res, patientId) => {
    const date = parseDate(req.params.date, res);
    if (!date) return;
    if (!await store.deleteCheckIn(patientId, date)) { res.status(404).json({ error: "Check-in not found." }); return; }
    res.status(204).end();
  }));
  app.put(`${base}/feedback/:date`, handler(async (req, res, patientId, actorId) => {
    const date = parseDate(req.params.date, res);
    if (!date) return;
    const input = feedbackSchema.safeParse(req.body);
    if (!input.success) { res.status(400).json({ error: input.error.issues.map((issue) => issue.message).join("; ") }); return; }
    if (!await store.saveFeedback(patientId, date, input.data, actorId)) { res.status(404).json({ error: "Check-in not found." }); return; }
    res.json({ date, ...input.data });
  }));
  app.get(`${base}/feedback`, handler(async (req, res, patientId) => {
    const date = parseDate(req.query.date, res);
    if (!date) return;
    res.json({ date, feedback: await store.listFeedback(patientId, date) });
  }));
  app.get(`${base}/insights`, handler(async (req, res, patientId) => {
    const date = parseDate(req.query.date, res);
    if (!date) return;
    const [checkIn, periodStarts] = await Promise.all([store.getCheckIn(patientId, date), store.listPeriods(patientId, date)]);
    res.json({
      date, notForClinicalUse: true, algorithmVersion: "staff-test-v1",
      checkIn, forecast: estimatePeriod(date, periodStarts, checkIn), recommendations: recommend(checkIn),
    });
  }));
}
