import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import { z } from "zod/v4";
import type { AccessActor } from "./clinical-access";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !value.startsWith("0000-") && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid date");

const entrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("date"), date: dateSchema }).strict(),
  z.object({ kind: z.literal("estimate"), choice: z.enum(["two-weeks", "one-month", "two-months", "over-three-months-or-irregular"]) }).strict(),
]);
type Entry = z.infer<typeof entrySchema>;
type PeriodValue = { date: string | null; estimated: boolean; description: string };
type PeriodState = { value: PeriodValue | null; shownCount: number; nextPromptAt: string | null; blocked: boolean };
type PeriodStore = {
  read(patientId: number): Promise<PeriodState>;
  show(patientId: number): Promise<PeriodState>;
  dismiss(patientId: number): Promise<PeriodState>;
  save(patientId: number, entry: Entry): Promise<PeriodState>;
};

const error = (status: number, message: string) => Object.assign(new Error(message), { status });
export function periodValue(entry: Entry, now = Date.now()): PeriodValue {
  const today = new Date(now + 5.5 * 3600000).toISOString().slice(0, 10);
  if (entry.kind === "date") {
    if (entry.date > today) throw error(400, "The last period cannot be in the future.");
    return { date: entry.date, estimated: false, description: "Patient-reported date" };
  }
  const options = {
    "two-weeks": { days: 14, description: "About 2 weeks ago" },
    "one-month": { days: 32, description: "About a month ago" },
    "two-months": { days: 60, description: "About 2 months ago" },
    "over-three-months-or-irregular": { days: null, description: "More than 3 months ago or periods are not regular" },
  } as const;
  const option = options[entry.choice];
  const date = option.days === null ? null : new Date(Date.parse(`${today}T00:00:00Z`) - option.days * 86400000).toISOString().slice(0, 10);
  return { date, estimated: true, description: option.description };
}

export function periodReminder(now = Date.now()) {
  return new Date(now + 7 * 86400000).toISOString();
}

export function recordedHistoryPeriod(history: unknown): string | null {
  const field = (value: unknown, key: string): unknown =>
    value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>)[key] : undefined;
  const cycle = field(field(history, "onboarding"), "cycle");
  const reported = field(history, "patientReportedLmp");
  for (const candidate of [field(cycle, "lastPeriod"), field(reported, "value")]) {
    const parsed = dateSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  return null;
}

export function periodBlocked(episodes: Array<{ details: { status?: string; lmp?: string | null; outcome?: string; notes?: string } }>, patientLmp: string | null) {
  const current = episodes.find((episode) => episode.details.status === "current");
  const pastLossOrEnd = episodes.some(({ details }) => details.status === "past" && (
    ["Miscarriage", "Termination", "Stillbirth"].includes(details.outcome || "") ||
    (details.notes || "").includes("Patient reported pregnancy loss") ||
    (details.notes || "").includes("Patient reported pregnancy has ended")
  ));
  return Boolean(current?.details.lmp || patientLmp || (!current && (
    pastLossOrEnd
  )));
}

export async function ensurePatientPeriodSchema(client: Pick<PoolClient, "query">) {
  await client.query(`CREATE TABLE IF NOT EXISTS patient_period_prompt (
    patient_id integer PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
    episode_id integer REFERENCES pregnancy_episodes(id) ON DELETE CASCADE,
    value jsonb,
    shown_count integer NOT NULL DEFAULT 0 CHECK (shown_count BETWEEN 0 AND 3),
    next_prompt_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query("ALTER TABLE patient_period_prompt ADD COLUMN IF NOT EXISTS episode_id integer REFERENCES pregnancy_episodes(id) ON DELETE CASCADE");
}

export function createPatientPeriodStore(pool: Pool): PeriodStore {
  async function inTransaction(patientId: number, operation: "read" | "show" | "dismiss" | "save", entry?: Entry): Promise<PeriodState> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const patient = (await client.query<{ lmp: string | null; history: unknown }>(
        "SELECT lmp,history FROM patients WHERE id=$1 FOR UPDATE", [patientId],
      )).rows[0];
      if (!patient) throw error(404, "Patient not found.");
      const episodes = (await client.query<{ id: number; details: { status?: string; lmp?: string | null; outcome?: string; notes?: string } }>(
        `SELECT id,details FROM pregnancy_episodes WHERE patient_id=$1
         ORDER BY (details->>'status'='current') DESC, updated_at DESC, id DESC`, [patientId],
      )).rows;
      const episodeId = episodes.find((episode) => episode.details.status === "current")?.id ?? null;
      const row = (await client.query<{ value: PeriodValue | null; shownCount: number; nextPromptAt: Date | null }>(
        `SELECT value,shown_count AS "shownCount",next_prompt_at AS "nextPromptAt" FROM patient_period_prompt
         WHERE patient_id=$1 AND episode_id IS NOT DISTINCT FROM $2`, [patientId, episodeId],
      )).rows[0];
      let state: PeriodState = {
        value: row?.value ?? null,
        shownCount: row?.shownCount ?? 0,
        nextPromptAt: row?.nextPromptAt?.toISOString() ?? null,
        blocked: periodBlocked(episodes, patient.lmp || recordedHistoryPeriod(patient.history)),
      };
      if (operation !== "read") {
        if (state.blocked) throw error(409, "Period information is unavailable for this stage or a date is already recorded.");
        if (operation === "show") {
          if (state.value || state.shownCount >= 3 || (state.nextPromptAt && Date.parse(state.nextPromptAt) > Date.now())) {
            throw error(409, "The period reminder is not due.");
          }
          state = { ...state, shownCount: state.shownCount + 1, nextPromptAt: periodReminder() };
        } else if (operation === "dismiss") {
          if (state.value) throw error(409, "A period response has already been saved.");
          state = { ...state, nextPromptAt: periodReminder() };
        } else if (entry) {
          state = { ...state, value: periodValue(entry), nextPromptAt: null };
        }
        await client.query(
          `INSERT INTO patient_period_prompt(patient_id,episode_id,value,shown_count,next_prompt_at)
           VALUES($1,$2,$3::jsonb,$4,$5) ON CONFLICT(patient_id) DO UPDATE
           SET episode_id=excluded.episode_id,value=excluded.value,shown_count=excluded.shown_count,next_prompt_at=excluded.next_prompt_at,updated_at=now()`,
          [patientId, episodeId, JSON.stringify(state.value), state.shownCount, state.nextPromptAt],
        );
      }
      await client.query("COMMIT");
      return state;
    } catch (failure) {
      await client.query("ROLLBACK");
      throw failure;
    } finally {
      client.release();
    }
  }
  return {
    read: (id) => inTransaction(id, "read"),
    show: (id) => inTransaction(id, "show"),
    dismiss: (id) => inTransaction(id, "dismiss"),
    save: (id, entry) => inTransaction(id, "save", entry),
  };
}

export function registerPatientPeriod(app: Express, store: PeriodStore, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  const handle = (operation: "read" | "show" | "dismiss" | "save") => async (req: Request, res: Response, next: (error?: unknown) => void) => {
    try {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required." }); return; }
      const id = Number(req.params.id);
      if (typeof req.params.id !== "string" || !/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id) || id > 2147483647) {
        res.status(400).json({ error: "Invalid patient ID." }); return;
      }
      if (!("patientId" in actor) || actor.patientId !== id) {
        res.status(403).json({ error: "Patient account required." }); return;
      }
      res.setHeader("Cache-Control", "private, no-store");
      if (operation === "read") { res.json(await store.read(id)); return; }
      if (operation === "show") { res.json(await store.show(id)); return; }
      if (operation === "dismiss") { res.json(await store.dismiss(id)); return; }
      const parsed = entrySchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: "Choose a valid date or estimate." }); return; }
      res.json(await store.save(id, parsed.data));
    } catch (failure) {
      if (failure instanceof Error && "status" in failure && [400, 404, 409].includes(Number(failure.status))) {
        res.status(Number(failure.status)).json({ error: failure.message });
      } else next(failure);
    }
  };
  app.get("/api/patients/:id/period-prompt", handle("read"));
  app.post("/api/patients/:id/period-prompt/show", handle("show"));
  app.post("/api/patients/:id/period-prompt/dismiss", handle("dismiss"));
  app.put("/api/patients/:id/period-prompt", handle("save"));
}
