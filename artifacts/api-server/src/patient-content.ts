import type { Express, Request, Response } from "express";
import type { Pool } from "pg";
import type { AccessActor } from "./clinical-access";

export type PatientContentSource =
  | "reviewed_week_guide"
  | "clinician_record"
  | "patient_record"
  | "deterministic_rule";

export interface PatientContentBlock {
  id: string;
  title: string;
  body: string;
  category: "baby" | "nutrition" | "symptom" | "appointment" | "medication" | "movement";
  priority: "essential" | "relevant" | "optional";
  source: PatientContentSource;
  sourceLabel: string;
  assetVersion: string;
  week?: number;
}

export interface PatientContentFeed {
  patientId: number;
  journey: "pregnancy" | "cycle" | "general";
  week: number | null;
  generatedAt: string;
  blocks: PatientContentBlock[];
}

const isoDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const date = new Date(`${match[1]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : match[1];
};

const gestationalWeek = (lmp: unknown): number | null => {
  const value = isoDate(lmp);
  if (!value) return null;
  const start = new Date(`${value}T00:00:00`);
  const week = Math.floor((Date.now() - start.getTime()) / (7 * 86400000));
  return week >= 1 && week <= 42 ? week : null;
};

export function buildPregnancyContentFeed(input: {
  patientId: number;
  lmp: unknown;
  medications: Array<{ name?: unknown; status?: unknown; notes?: unknown }>;
  riskScore?: unknown;
  visitCount?: number;
  weekGuide: (week: number) => {
    fruit: string;
    length: string;
    weight: string;
    development: string[];
    symptoms: string[];
    dos: string[];
    donts: string[];
    nutrition: string;
  };
}): PatientContentFeed {
  const week = gestationalWeek(input.lmp);
  const blocks: PatientContentBlock[] = [];
  if (week !== null) {
    const guide = input.weekGuide(week);
    blocks.push({
      id: `pregnancy-week-${week}-development`,
      title: `Week ${week}: ${guide.fruit}`,
      body: guide.development[0] || "Your baby continues to grow and develop this week.",
      category: "baby",
      priority: "essential",
      source: "reviewed_week_guide",
      sourceLabel: "Pregnancy week guide",
      assetVersion: "pregnancy-week-guide-v1",
      week,
    });
    blocks.push({
      id: `pregnancy-week-${week}-symptoms`,
      title: "What you may notice",
      body: guide.symptoms.slice(0, 3).join(". "),
      category: "symptom",
      priority: "relevant",
      source: "reviewed_week_guide",
      sourceLabel: "Pregnancy week guide",
      assetVersion: "pregnancy-week-guide-v1",
      week,
    });
  }

  const activeMedication = input.medications.some((item) => {
    const status = String(item.status || "").toLowerCase();
    return !status || status === "active";
  });
  if (activeMedication) {
    blocks.push({
      id: "active-medication-review",
      title: "Review your medicines",
      body: "Your medicine list is available in My Care. Use it for clinician reconciliation; do not add or stop a medicine unless your care team directs you.",
      category: "medication",
      priority: "essential",
      source: "clinician_record",
      sourceLabel: "Active medication record",
      assetVersion: "medication-safety-v1",
      week: week ?? undefined,
    });
  }

  const risk = typeof input.riskScore === "object" && input.riskScore !== null
    ? input.riskScore as { level?: unknown; patientSummary?: unknown }
    : null;
  if (typeof risk?.patientSummary === "string" && risk.patientSummary.trim()) {
    blocks.push({
      id: "current-care-watch",
      title: "What to watch",
      body: risk.patientSummary.trim(),
      category: "symptom",
      priority: String(risk.level || "").toLowerCase() === "critical" ? "essential" : "relevant",
      source: "clinician_record",
      sourceLabel: "Care-team risk summary",
      assetVersion: "risk-summary-v1",
      week: week ?? undefined,
    });
  }

  return {
    patientId: input.patientId,
    journey: "pregnancy",
    week,
    generatedAt: new Date().toISOString(),
    blocks,
  };
}

export function createPatientContentStore(pool: Pool) {
  return {
    async ensureSchema() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS patient_content_activity (
          id serial PRIMARY KEY,
          patient_id integer NOT NULL REFERENCES patients(id),
          block_id text NOT NULL,
          asset_version text NOT NULL,
          action text NOT NULL CHECK (action IN ('view','complete','dismiss','share')),
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS patient_content_activity_patient_idx
          ON patient_content_activity(patient_id, created_at DESC);
      `);
    },
    async recordActivity(patientId: number, input: { blockId: string; assetVersion: string; action: "view" | "complete" | "dismiss" | "share" }) {
      await pool.query(
        `INSERT INTO patient_content_activity(patient_id,block_id,asset_version,action)
         VALUES($1,$2,$3,$4)`,
        [patientId, input.blockId, input.assetVersion, input.action],
      );
    },
  };
}

export function registerPatientContent(
  app: Express,
  pool: Pool,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
  assemblePregnancyFeed: (patientId: number) => Promise<PatientContentFeed>,
) {
  const store = createPatientContentStore(pool);
  void store.ensureSchema().catch((error) => {
    console.error("[patient-content] Failed to initialize content schema:", error);
  });

  app.get("/api/patients/:id/content-feed", async (req, res) => {
    const patientId = Number(req.params.id);
    if (!Number.isSafeInteger(patientId) || patientId <= 0) return res.status(400).json({ error: "Invalid patient ID" });
    const actor = await authenticate(req, res);
    if (!actor) return;
    const ownPatient = "patientId" in actor && actor.patientId === patientId;
    const staff = "role" in actor && ["clinician", "owner"].includes(actor.role);
    if (!ownPatient && !staff) return res.status(403).json({ error: "Forbidden" });
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await assemblePregnancyFeed(patientId));
  });

  app.post("/api/patients/:id/content-feed/activity", async (req, res) => {
    const patientId = Number(req.params.id);
    if (!Number.isSafeInteger(patientId) || patientId <= 0) return res.status(400).json({ error: "Invalid patient ID" });
    const actor = await authenticate(req, res);
    if (!actor) return;
    const ownPatient = "patientId" in actor && actor.patientId === patientId;
    if (!ownPatient) return res.status(403).json({ error: "Only the patient can record feed activity" });
    const blockId = typeof req.body?.blockId === "string" ? req.body.blockId.trim().slice(0, 160) : "";
    const assetVersion = typeof req.body?.assetVersion === "string" ? req.body.assetVersion.trim().slice(0, 80) : "";
    const action = req.body?.action;
    if (!blockId || !assetVersion || !["view", "complete", "dismiss", "share"].includes(action)) {
      return res.status(400).json({ error: "Invalid content activity" });
    }
    await store.recordActivity(patientId, { blockId, assetVersion, action });
    res.status(201).json({ ok: true });
  });
}
