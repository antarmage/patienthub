import type { Pool, PoolClient } from "pg";
import {
  episodeError,
  episodeInputSchema,
  type EpisodeInput,
  type PregnancyEpisodeStore,
} from "./pregnancy-episodes";
import type { PregnancyEpisode } from "../../../lib/db/src/pregnancy-episodes";
import { detectPregnancies } from "./pregnancy-detection";

async function insertEpisode(
  client: PoolClient,
  patientId: number,
  input: EpisodeInput,
  userId: string,
) {
  return (
    await client.query<{ id: number }>(
      `INSERT INTO pregnancy_episodes(patient_id,details,version,created_by,updated_by,updated_at)
    VALUES($1,$2::jsonb,1,$3,$3,$4) RETURNING id`,
      [
        patientId,
        JSON.stringify(input.details),
        userId,
        new Date().toISOString(),
      ],
    )
  ).rows[0].id;
}
async function insertLinks(
  client: PoolClient,
  patientId: number,
  episodeId: number,
  input: EpisodeInput,
) {
  for (const link of input.records) {
    await client.query(
      "INSERT INTO pregnancy_episode_records(episode_id,patient_id,appointment_id,visit_id,lab_result_id) VALUES($1,$2,$3,$4,$5)",
      [
        episodeId,
        patientId,
        link.kind === "appointment" ? link.id : null,
        link.kind === "visit" ? link.id : null,
        link.kind === "lab" ? link.id : null,
      ],
    );
  }
}

const select = `SELECT id, patient_id AS "patientId", details, version, updated_at AS "updatedAt"
  FROM pregnancy_episodes`;
async function episodes(
  client: Pick<PoolClient, "query">,
  patientId: number,
): Promise<PregnancyEpisode[]> {
  return (
    await client.query<PregnancyEpisode>(
      `SELECT e.id, e.patient_id AS "patientId",e.details,e.version,e.updated_at AS "updatedAt",
    coalesce((SELECT jsonb_agg(jsonb_build_object('kind',
      CASE WHEN l.appointment_id IS NOT NULL THEN 'appointment' WHEN l.visit_id IS NOT NULL THEN 'visit' ELSE 'lab' END,
      'id',coalesce(l.appointment_id,l.visit_id,l.lab_result_id)) ORDER BY l.id)
      FROM pregnancy_episode_records l WHERE l.episode_id=e.id AND l.patient_id=e.patient_id),'[]'::jsonb) AS records
    FROM pregnancy_episodes e WHERE e.patient_id=$1 ORDER BY (e.details->>'number')::int DESC,e.id DESC`,
      [patientId],
    )
  ).rows;
}
export function createPregnancyEpisodeStore(pool: Pool): PregnancyEpisodeStore {
  return {
    async detect(patientId, userId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const patient = (
          await client.query<Record<string, unknown>>(
            `SELECT id,lmp,type,history,pregnancy_status AS "pregnancyStatus" FROM patients WHERE id=$1 FOR UPDATE`,
            [patientId],
          )
        ).rows[0];
        if (!patient) throw episodeError(404, "Patient not found");
        const existing = await episodes(client, patientId);
        if (existing.length) {
          await client.query("COMMIT");
          return {
            episodes: existing,
            created: 0,
            linked: 0,
            message:
              "Saved episodes already exist; automatic detection does not overwrite clinician edits or reassign records.",
          };
        }
        const appointments = (
          await client.query<Record<string, unknown>>(
            `SELECT id,date::text,type,visit_type AS "visitType",survey_type AS "surveyType",vitals,status FROM appointments WHERE patient_id=$1 FOR UPDATE`,
            [patientId],
          )
        ).rows;
        const visits = (
          await client.query<Record<string, unknown>>(
            `SELECT id,date::text,appointment_id AS "appointmentId",vitals FROM visit_history WHERE patient_id=$1 FOR UPDATE`,
            [patientId],
          )
        ).rows;
        const detection = detectPregnancies(
          patient,
          appointments,
          visits,
          new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10),
        );
        for (const draft of detection.drafts) {
          const parsed = episodeInputSchema.safeParse(draft);
          if (!parsed.success)
            throw episodeError(
              409,
              "Automatic pregnancy evidence requires clinician review before saving: " +
                parsed.error.issues.map((issue) => issue.message).join("; "),
            );
          const episodeId = await insertEpisode(
            client,
            patientId,
            parsed.data,
            userId,
          );
          await insertLinks(client, patientId, episodeId, parsed.data);
        }
        const saved = await episodes(client, patientId);
        await client.query("COMMIT");
        return {
          episodes: saved,
          created: detection.drafts.length,
          linked: detection.drafts.reduce(
            (count, draft) => count + draft.records.length,
            0,
          ),
          message: detection.reason,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async list(patientId) {
      if (
        !(await pool.query("SELECT id FROM patients WHERE id=$1", [patientId]))
          .rowCount
      )
        throw episodeError(404, "Patient not found");
      return episodes(pool, patientId);
    },
    async save(patientId, episodeId, input, userId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (
          !(
            await client.query(
              "SELECT id FROM patients WHERE id=$1 FOR UPDATE",
              [patientId],
            )
          ).rowCount
        )
          throw episodeError(404, "Patient not found");
        if (episodeId) {
          const current = (
            await client.query<{ version: number }>(
              `${select} WHERE id=$1 AND patient_id=$2 FOR UPDATE`,
              [episodeId, patientId],
            )
          ).rows[0];
          if (!current)
            throw episodeError(
              404,
              "Pregnancy episode not found for this patient",
            );
          if (current.version !== input.version)
            throw episodeError(
              409,
              "This pregnancy was updated elsewhere. Refresh and review before saving.",
            );
        }
        const conflict = await client.query(
          `SELECT id FROM pregnancy_episodes WHERE patient_id=$1 AND id<>coalesce($2,0)
          AND ((details->>'number')::int=$3 OR (details->>'status'='current' AND $4='current'))`,
          [patientId, episodeId, input.details.number, input.details.status],
        );
        if (conflict.rowCount)
          throw episodeError(
            409,
            "That pregnancy number already exists, or there is already a current pregnancy. Edit the existing episode first.",
          );
        for (const record of input.records) {
          const table =
            record.kind === "appointment"
              ? "appointments"
              : record.kind === "visit"
                ? "visit_history"
                : "lab_results";
          const column =
            record.kind === "appointment"
              ? "appointment_id"
              : record.kind === "visit"
                ? "visit_id"
                : "lab_result_id";
          const found = await client.query(
            `SELECT id FROM ${table} WHERE id=$1 AND patient_id=$2 FOR UPDATE`,
            [record.id, patientId],
          );
          if (!found.rowCount)
            throw episodeError(
              400,
              "A selected record does not belong to this patient. Refresh the date trail.",
            );
          const linked = await client.query(
            `SELECT episode_id FROM pregnancy_episode_records WHERE ${column}=$1 AND episode_id<>coalesce($2,0)`,
            [record.id, episodeId],
          );
          if (linked.rowCount)
            throw episodeError(
              409,
              "A selected record belongs to another pregnancy. Remove it from that episode before reassigning.",
            );
          const related =
            record.kind === "appointment"
              ? `SELECT l.id FROM pregnancy_episode_records l JOIN visit_history v ON v.id=l.visit_id WHERE v.appointment_id=$1 AND l.episode_id<>coalesce($2,0)`
              : `SELECT l.id FROM pregnancy_episode_records l JOIN visit_history v ON v.appointment_id=l.appointment_id WHERE v.id=$1 AND l.episode_id<>coalesce($2,0)`;
          if (
            record.kind !== "lab" &&
            (await client.query(related, [record.id, episodeId])).rowCount
          )
            throw episodeError(
              409,
              "The appointment and its consultation cannot belong to different pregnancies.",
            );
        }
        const now = new Date().toISOString();
        if (episodeId) {
          await client.query(
            "UPDATE pregnancy_episodes SET details=$1::jsonb,version=version+1,updated_at=$2,updated_by=$3 WHERE id=$4",
            [JSON.stringify(input.details), now, userId, episodeId],
          );
          await client.query(
            "DELETE FROM pregnancy_episode_records WHERE episode_id=$1",
            [episodeId],
          );
        } else {
          episodeId = await insertEpisode(client, patientId, input, userId);
        }
        await insertLinks(client, patientId, episodeId, input);
        const saved = (await episodes(client, patientId)).find(
          (episode) => episode.id === episodeId,
        )!;
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
export async function ensurePregnancyEpisodeSchema(
  client: Pick<PoolClient, "query">,
) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS pregnancy_episodes (
      id serial PRIMARY KEY, patient_id integer NOT NULL REFERENCES patients(id),
      details jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
      created_by varchar NOT NULL REFERENCES users(id), updated_by varchar NOT NULL REFERENCES users(id),
      updated_at text NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS pregnancy_episodes_id_patient_idx ON pregnancy_episodes(id,patient_id);
    CREATE UNIQUE INDEX IF NOT EXISTS pregnancy_episodes_number_idx ON pregnancy_episodes(patient_id, ((details->>'number')::int));
    CREATE UNIQUE INDEX IF NOT EXISTS pregnancy_episodes_current_idx ON pregnancy_episodes(patient_id) WHERE details->>'status'='current';
    CREATE TABLE IF NOT EXISTS pregnancy_episode_records (
      id serial PRIMARY KEY, episode_id integer NOT NULL, patient_id integer NOT NULL REFERENCES patients(id),
      appointment_id integer CONSTRAINT pregnancy_episode_records_appointment_id_unique UNIQUE REFERENCES appointments(id),
      visit_id integer CONSTRAINT pregnancy_episode_records_visit_id_unique UNIQUE REFERENCES visit_history(id),
      lab_result_id integer CONSTRAINT pregnancy_episode_records_lab_result_id_unique UNIQUE REFERENCES lab_results(id),
      CONSTRAINT pregnancy_episode_records_episode_patient_fk FOREIGN KEY(episode_id,patient_id) REFERENCES pregnancy_episodes(id,patient_id),
      CONSTRAINT pregnancy_episode_records_one_record CHECK (num_nonnulls(appointment_id,visit_id,lab_result_id)=1)
    );
    CREATE INDEX IF NOT EXISTS pregnancy_episode_records_patient_idx ON pregnancy_episode_records(patient_id);
  `);
}
