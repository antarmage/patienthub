import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import type { AccessActor } from "./clinical-access";
import { movementObservationSchema, type MovementObservation, type MovementObservationInput } from "../../../lib/db/src/pregnancy-movement";

export async function ensurePregnancyMovementSchema(client: Pick<PoolClient, "query">) {
  await client.query(`CREATE TABLE IF NOT EXISTS pregnancy_movement_observations (
    id serial PRIMARY KEY,
    patient_id integer NOT NULL,
    episode_id integer NOT NULL,
    observation text NOT NULL CHECK (observation IN ('usual','changed','not-felt','not-yet-felt','unsure')),
    notes text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (episode_id, patient_id) REFERENCES pregnancy_episodes(id, patient_id)
  );
  CREATE INDEX IF NOT EXISTS pregnancy_movement_observations_episode_idx
    ON pregnancy_movement_observations(patient_id, episode_id, created_at DESC, id DESC)`);
}

export function createPregnancyMovementStore(pool: Pool) {
  return {
    async list(patientId: number, episodeId: number): Promise<MovementObservation[]> {
      return (await pool.query<MovementObservation>(
        `SELECT id, episode_id AS "episodeId", observation, notes, created_at AS "createdAt"
         FROM pregnancy_movement_observations
         WHERE patient_id=$1 AND episode_id=$2 ORDER BY created_at DESC, id DESC LIMIT 100`,
        [patientId, episodeId],
      )).rows;
    },
    async create(patientId: number, input: MovementObservationInput): Promise<MovementObservation> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const episode = (await client.query<{ status: string }>(
          `SELECT details->>'status' AS status FROM pregnancy_episodes
           WHERE id=$1 AND patient_id=$2 FOR UPDATE`,
          [input.episodeId, patientId],
        )).rows[0];
        if (!episode) throw Object.assign(new Error("Pregnancy episode not found"), { status: 404 });
        if (episode.status !== "current") throw Object.assign(new Error("This pregnancy is no longer active. Refresh before adding an observation."), { status: 409 });
        const saved = (await client.query<MovementObservation>(
          `INSERT INTO pregnancy_movement_observations(patient_id,episode_id,observation,notes)
           VALUES($1,$2,$3,$4)
           RETURNING id, episode_id AS "episodeId", observation, notes, created_at AS "createdAt"`,
          [patientId, input.episodeId, input.observation, input.notes],
        )).rows[0];
        await client.query("COMMIT");
        return saved;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export function registerPregnancyMovements(
  app: Express,
  store: ReturnType<typeof createPregnancyMovementStore>,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
) {
  const path = "/api/patients/:id/pregnancy-movement-observations";
  const handler = (write: boolean) => async (req: Request, res: Response, next: (error?: unknown) => void) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required" }); return; }
      const patientId = Number(req.params.id);
      if (typeof req.params.id !== "string" || !/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(patientId) || patientId > 2147483647) {
        res.status(400).json({ error: "Invalid patient ID" }); return;
      }
      if (!("patientId" in actor) || actor.patientId !== patientId) {
        res.status(403).json({ error: "Patient account required" }); return;
      }
      if (write) {
        const parsed = movementObservationSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") }); return; }
        res.status(201).json(await store.create(patientId, parsed.data));
      } else {
        const raw = req.query.episodeId;
        const episodeId = Number(raw);
        if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(episodeId) || episodeId > 2147483647) {
          res.status(400).json({ error: "Invalid pregnancy episode ID" }); return;
        }
        res.json(await store.list(patientId, episodeId));
      }
    } catch (error) {
      if (error instanceof Error && "status" in error && [404, 409].includes(Number(error.status))) res.status(Number(error.status)).json({ error: error.message });
      else next(error);
    }
  };
  app.get(path, handler(false));
  app.post(path, handler(true));
}
