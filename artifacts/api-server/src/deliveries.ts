import type { Express, Request, Response, NextFunction } from "express";
import type { Pool, PoolClient } from "pg";
import type { AccessActor } from "./clinical-access";
import type { PregnancyEpisode } from "../../../lib/db/src/pregnancy-episodes";
import { babyUpdateSchema, deliveryInputSchema, deliveryOutcome, type DeliveryInput, type DeliveryRecord } from "../../../lib/db/src/delivery";
import { workflowError } from "./surgery-workflow";
import { episodeDetailsSchema } from "./pregnancy-episodes";

const select = `SELECT id,patient_id AS "patientId",episode_id AS "episodeId",
  surgery_plan_id AS "surgeryPlanId",delivery_date AS "deliveryDate",delivery_mode AS "deliveryMode",
  babies,postpartum_review_date AS "postpartumReviewDate",version FROM deliveries`;

export async function ensureDeliverySchema(client: Pick<PoolClient, "query">) {
  await client.query(`CREATE TABLE IF NOT EXISTS deliveries (
    id serial PRIMARY KEY, patient_id integer NOT NULL REFERENCES patients(id),
    episode_id integer NOT NULL UNIQUE,
    surgery_plan_id integer UNIQUE REFERENCES surgery_plans(id),
    delivery_date text NOT NULL, delivery_mode text NOT NULL,
    babies jsonb NOT NULL, postpartum_review_date text,
    version integer NOT NULL DEFAULT 1,
    created_by varchar NOT NULL REFERENCES users(id), updated_by varchar NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    audit jsonb NOT NULL DEFAULT '[]'::jsonb,
    FOREIGN KEY(episode_id,patient_id) REFERENCES pregnancy_episodes(id,patient_id)
  ); CREATE INDEX IF NOT EXISTS deliveries_patient_idx ON deliveries(patient_id);`);
}

// The caller holds the patient lock and owns the transaction, including surgery completion.
export async function recordDelivery(client: PoolClient, patientId: number, input: DeliveryInput, userId: string, surgeryId: number | null = null) {
  const episode = (await client.query<PregnancyEpisode>(
    `SELECT id,details,version FROM pregnancy_episodes WHERE id=$1 AND patient_id=$2 FOR UPDATE`,
    [input.episodeId, patientId],
  )).rows[0];
  if (!episode) throw workflowError(404, "Pregnancy episode not found for this patient");
  if (episode.version !== input.episodeVersion || episode.details.status !== "current") {
    throw workflowError(409, "Pregnancy changed or delivery was already recorded. Refresh and review.");
  }
  if (episode.details.fetusCount && episode.details.fetusCount !== input.babies.length) {
    throw workflowError(409, "Baby count differs from the pregnancy's recorded fetus count. Review the pregnancy record first.");
  }
  if (input.babies.some((baby) => [episode.details.startDate, episode.details.lmp].some((date) => date && baby.birthDate < date))) {
    throw workflowError(400, "Birth cannot precede the pregnancy start/LMP");
  }
  const parsedDetails = episodeDetailsSchema.safeParse({
    ...episode.details, status: "past", endDate: input.deliveryDate,
    deliveryMode: input.deliveryMode, outcome: deliveryOutcome(input.babies), fetusCount: input.babies.length,
  });
  if (!parsedDetails.success) throw workflowError(400, parsedDetails.error.issues.map((issue) => issue.message).join("; "));
  const details = parsedDetails.data;
  const previousCare = (await client.query(`SELECT type,pregnancy_status AS "pregnancyStatus",next_review AS "nextReview" FROM patients WHERE id=$1`, [patientId])).rows[0];
  const audit = { at: new Date().toISOString(), by: userId, event: "delivery", previousEpisode: episode.details, previousCare, after: input };
  const saved = (await client.query<DeliveryRecord>(`INSERT INTO deliveries
    (patient_id,episode_id,surgery_plan_id,delivery_date,delivery_mode,babies,postpartum_review_date,created_by,updated_by,audit)
    VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$8,jsonb_build_array($9::jsonb)) RETURNING id`,
  [patientId, input.episodeId, surgeryId, input.deliveryDate, input.deliveryMode, JSON.stringify(input.babies),
    input.postpartumReviewDate, userId, JSON.stringify(audit)])).rows[0];
  await client.query(`UPDATE pregnancy_episodes SET details=$2::jsonb,version=version+1,updated_by=$3,updated_at=$4 WHERE id=$1`,
    [input.episodeId, JSON.stringify(details), userId, new Date().toISOString()]);
  await client.query(`UPDATE patients SET type='Postpartum',pregnancy_status='completed',next_review=$2 WHERE id=$1`,
    [patientId, input.postpartumReviewDate]);
  await client.query(`UPDATE pregnancy_follow_up_plans SET plan=NULL,updated_by=$2,updated_at=now(),
    audit=audit || jsonb_build_array(jsonb_build_object('at',now(),'by',$2::text,'previous',plan,'after',NULL,'reason','Delivery recorded'))
    WHERE patient_id=$1 AND plan IS NOT NULL`, [patientId, userId]);
  return (await client.query<DeliveryRecord>(`${select} WHERE id=$1`, [saved.id])).rows[0];
}

async function transaction<T>(pool: Pool, patientId: number, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (!(await client.query("SELECT id FROM patients WHERE id=$1 FOR UPDATE", [patientId])).rowCount) throw workflowError(404, "Patient not found");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export function createDeliveryStore(pool: Pool) {
  return {
    async list(patientId: number) {
      if (!(await pool.query("SELECT id FROM patients WHERE id=$1", [patientId])).rowCount) throw workflowError(404, "Patient not found");
      return (await pool.query<DeliveryRecord>(`${select} WHERE patient_id=$1 ORDER BY delivery_date DESC,id DESC`, [patientId])).rows;
    },
    create: (patientId: number, input: DeliveryInput, userId: string) => transaction(pool, patientId, (client) => recordDelivery(client, patientId, input, userId)),
    update: (patientId: number, id: number, input: ReturnType<typeof babyUpdateSchema.parse>, userId: string) =>
      transaction(pool, patientId, async (client) => {
        const current = (await client.query<DeliveryRecord>(`${select} WHERE id=$1 AND patient_id=$2 FOR UPDATE`, [id, patientId])).rows[0];
        if (!current) throw workflowError(404, "Delivery not found for this patient");
        if (input.version !== current.version) throw workflowError(409, "Baby records changed elsewhere. Refresh before saving.");
        if (input.babies.length !== current.babies.length || input.babies.some((baby, index) =>
          baby.birthDate !== current.babies[index].birthDate || baby.birthTime !== current.babies[index].birthTime || baby.outcome !== current.babies[index].outcome)) {
          throw workflowError(400, "Birth date, time, birth outcome and baby order are fixed. Only names and subsequent death dates can be updated here.");
        }
        const audit = { at: new Date().toISOString(), by: userId, event: "baby update", before: current.babies, after: input.babies };
        await client.query(`UPDATE deliveries SET babies=$2::jsonb,version=version+1,updated_by=$3,updated_at=now(),
          audit=audit || jsonb_build_array($4::jsonb) WHERE id=$1`,
        [id, JSON.stringify(input.babies), userId, JSON.stringify(audit)]);
        return (await client.query<DeliveryRecord>(`${select} WHERE id=$1`, [id])).rows[0];
      }),
  };
}

export function registerDeliveries(app: Express, store: ReturnType<typeof createDeliveryStore>, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  const handler = (action: "list" | "create" | "update") => async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required" }); return; }
      if (!("role" in actor) || !["clinician", "owner"].includes(actor.role)) { res.status(403).json({ error: "Doctor or owner access required" }); return; }
      const patientId = Number(req.params.id), deliveryId = Number(req.params.deliveryId);
      if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(patientId) || patientId > 2147483647 ||
          (action === "update" && (!/^[1-9]\d*$/.test(String(req.params.deliveryId)) || !Number.isSafeInteger(deliveryId) || deliveryId > 2147483647))) {
        res.status(400).json({ error: "Invalid patient or delivery ID" }); return;
      }
      if (action === "list") { res.json(await store.list(patientId)); return; }
      if (action === "create") {
        const input = deliveryInputSchema.safeParse(req.body);
        if (!input.success) { res.status(400).json({ error: input.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") }); return; }
        res.status(201).json(await store.create(patientId, input.data, actor.userId));
      } else {
        const input = babyUpdateSchema.safeParse(req.body);
        if (!input.success) { res.status(400).json({ error: input.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") }); return; }
        res.json(await store.update(patientId, deliveryId, input.data, actor.userId));
      }
    } catch (error) {
      if (error instanceof Error && "status" in error && [400, 404, 409].includes(Number(error.status))) res.status(Number(error.status)).json({ error: error.message });
      else next(error);
    }
  };
  app.get("/api/patients/:id/deliveries", handler("list"));
  app.post("/api/patients/:id/deliveries", handler("create"));
  app.put("/api/patients/:id/deliveries/:deliveryId", handler("update"));
}
