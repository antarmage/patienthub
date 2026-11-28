import type { Express, Request, Response } from "express";
import type { Pool } from "pg";
import { ThinkingLevel } from "@google/genai";
import { z } from "zod/v4";
import type { AccessActor } from "./clinical-access";
import { ai, AI_AVAILABLE } from "./replit_integrations/image/client";
import { cycleBodyCatalogueSchema, estimateCyclePhase, type CycleBodyCatalogue, type CycleBodyFeed } from "../../../lib/db/src/cycle-body-content";

export const cycleBodyVersion = "cycle-body-daily-v3";
const version = cycleBodyVersion;
export const cycleEditionDate = (now = new Date()) => new Date(now.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
export type CyclePatient = { id: number; lmp: string | null; history: unknown; periodDate: string | null; pregnant: boolean };

export async function loadCyclePatients(pool: Pick<Pool, "query">, patientId: number | null = null) {
  return (await pool.query<CyclePatient>(`SELECT p.id,p.lmp,p.history,pp.value->>'date' AS "periodDate",
    (p.pregnancy_status IN ('pregnant','active','delivered') OR p.mode IN ('pregnancy','postpartum','menopause')
      OR EXISTS(SELECT 1 FROM pregnancy_episodes e WHERE e.patient_id=p.id AND e.details->>'status'='current')) IS TRUE AS pregnant
    FROM patients p LEFT JOIN patient_period_prompt pp ON pp.patient_id=p.id AND pp.episode_id IS NULL
    WHERE ($1::integer IS NULL OR p.id=$1) ORDER BY p.id`, [patientId])).rows;
}
const historySchema = z.object({
  onboarding: z.object({ cycle: z.object({
    lastPeriod: z.string().nullable().optional(),
    cycleLength: z.union([z.string(), z.number()]).nullable().optional(),
    regularity: z.string().optional(),
  }).optional() }).optional(),
  patientReportedLmp: z.object({ value: z.string().nullable().optional() }).optional(),
}).nullable();

export function cycleBodyContext(input: {
  lmp: string | null; history: unknown; periodDate: string | null; pregnant: boolean;
}, now = new Date()) {
  if (input.pregnant) return null;
  const history = historySchema.safeParse(input.history);
  if (!history.success) return null;
  const cycle = history.data?.onboarding?.cycle;
  if (/irregular|unpredictable/i.test(cycle?.regularity || "")) return null;
  const phase = estimateCyclePhase(
    input.lmp || input.periodDate || cycle?.lastPeriod || history.data?.patientReportedLmp?.value,
    cycle?.cycleLength, now,
  );
  if (!phase) return null;
  return {
    cycleDay: phase.cycleDay,
    cycleLength: Number(cycle?.cycleLength),
    phase: phase.cycleDay <= 5 ? "menstrual" as const
      : phase.isPeakFertilityWindow ? "ovulation" as const
      : phase.cycleDay < phase.estimatedOvulationDay ? "follicular" as const : "luteal" as const,
  };
}

export function assembleCycleBodyFeed(context: ReturnType<typeof cycleBodyContext>, catalogue: CycleBodyCatalogue): CycleBodyFeed {
  if (!context) return { status: "unavailable", reason: "A current period date and typical regular cycle length are needed. Cycle education is paused for other stages." };
  return {
    status: "available", ...context, content: catalogue[context.phase],
    source: "ai_generated", reviewStatus: "not_clinically_reviewed", assetVersion: version,
  };
}

export async function generateCatalogue(): Promise<CycleBodyCatalogue> {
  if (!AI_AVAILABLE) throw Object.assign(new Error("Cycle content generation is not configured."), { status: 503 });
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Write a generic menstrual-cycle education catalogue for a healthcare app.
This is not a patient consultation. No patient information is provided.
Return JSON with four keys: menstrual, follicular, ovulation, luteal.
Each phase must contain: title, introduction, todayRead, hormoneTitle, hormoneDescription,
temperatureTitle, temperatureBody, signalsTitle, patternsTitle, patternsIntroduction,
and signals containing focus, temperature, metabolism, hormones; each signal has title and body.
Use short, warm plain-language text (titles under 60 characters, body under 350).
Describe typical possibilities, never assert an individual's hormone levels, focus, energy or metabolism.
State that cycle timing varies, calendar estimates cannot confirm ovulation and curves are illustrative, not measurements.
No diagnoses, prescriptions, supplements, medical treatment, contraception guidance or claims of clinical review.
Temperature text must explain basal temperature logging is available through the Log temperature button.
Advise recording a resting morning reading before getting up; a single reading cannot confirm ovulation.
Patterns text must describe reported information, not claim a regular pattern or longitudinal evidence.
Do not invent sources or cite sources you have not retrieved. No links, HTML or Markdown.`,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      httpOptions: { timeout: 180000 },
    },
  });
  if (!response.text) throw new Error("Cycle content generation returned no text.");
  return cycleBodyCatalogueSchema.parse(JSON.parse(response.text));
}

export async function ensureCycleBodyContentSchema(client: Pick<Pool, "query">) {
  await client.query(`CREATE TABLE IF NOT EXISTS cycle_body_content_catalogue (
    asset_version text PRIMARY KEY, content jsonb NOT NULL, generated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS cycle_body_daily_editions (
    patient_id integer NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    edition_date date NOT NULL,
    asset_version text NOT NULL,
    cycle_day integer NOT NULL,
    cycle_length integer NOT NULL,
    phase text NOT NULL,
    content jsonb,
    state text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    last_attempt_at timestamptz,
    generated_at timestamptz,
    PRIMARY KEY(patient_id,edition_date,asset_version)
  )`);
}

export function registerCycleBodyContent(app: Express, pool: Pool, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  app.get("/api/patients/:id/cycle-body-content", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id > 2147483647) {
        res.status(400).json({ error: "Invalid patient ID." }); return;
      }
      const actor = await authenticate(req, res);
      if (!actor) return;
      if (!("patientId" in actor) || actor.patientId !== id) {
        res.status(403).json({ error: "Patient account required." }); return;
      }
      res.setHeader("Cache-Control", "private, no-store");
      const patient = (await loadCyclePatients(pool, id))[0];
      if (!patient) { res.status(404).json({ error: "Patient not found." }); return; }
      const indiaDate = cycleEditionDate();
      const context = cycleBodyContext(patient, new Date(`${indiaDate}T12:00:00`));
      if (!context) {
        res.json({ status: "unavailable", reason: "A current period date and typical regular cycle length are needed. Cycle education is paused for other stages." });
        return;
      }
      const edition = (await pool.query<{ content: unknown; attempts: number; state: string }>(
        `SELECT content,attempts,state FROM cycle_body_daily_editions WHERE patient_id=$1 AND edition_date=$2
         AND asset_version=$3 AND cycle_day=$4 AND cycle_length=$5 AND phase=$6`,
        [id, indiaDate, version, context.cycleDay, context.cycleLength, context.phase],
      )).rows[0];
      if (!edition?.content) {
        if (edition?.state === "failed" && edition.attempts >= 3) {
          res.status(503).json({ error: "Today's cycle edition could not be generated. Please contact your clinic." });
        } else {
          res.status(202).json({ status: "pending", reason: "Today's cycle edition is being prepared by the background content worker." });
        }
        return;
      }
      res.json({ ...assembleCycleBodyFeed(context, cycleBodyCatalogueSchema.parse(edition.content)), editionDate: indiaDate });
    } catch (error) { next(error); }
  });
}
