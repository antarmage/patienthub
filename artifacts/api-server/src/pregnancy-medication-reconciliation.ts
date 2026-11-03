import type { Express, Request, Response } from "express";
import type { Pool } from "pg";
import { z } from "zod/v4";
import type { AccessActor } from "./clinical-access";

export interface PregnancyMedicationReconciliation {
  status: "no-medicines";
  episodeId: number;
  recordedAt: string;
  recordedBy: string;
}

export function createPregnancyMedicationReconciliationStore(pool: Pool) {
  return {
    async recordNoMedicines(patientId: number, episodeId: number, userId: string): Promise<PregnancyMedicationReconciliation> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const patient = await client.query("SELECT id FROM patients WHERE id=$1 FOR UPDATE", [patientId]);
        if (!patient.rowCount) throw Object.assign(new Error("Patient not found"), { status: 404 });
        const episode = await client.query(
          "SELECT id FROM pregnancy_episodes WHERE id=$1 AND patient_id=$2 AND details->>'status'='current' FOR UPDATE",
          [episodeId, patientId],
        );
        if (!episode.rowCount) throw Object.assign(new Error("A saved current pregnancy is required to record this statement."), { status: 409 });
        const reconciliation: PregnancyMedicationReconciliation = {
          status: "no-medicines",
          episodeId,
          recordedAt: new Date().toISOString(),
          recordedBy: userId,
        };
        const updated = await client.query(
          `UPDATE patients SET history=jsonb_set(
            COALESCE(history,'{}'::jsonb),
            '{pregnancyMedicationReconciliations}',
            COALESCE(history->'pregnancyMedicationReconciliations','{}'::jsonb) ||
              jsonb_build_object($2::text,
                $3::jsonb || jsonb_build_object('audit',
                  COALESCE(history->'pregnancyMedicationReconciliations'->$2::text->'audit','[]'::jsonb) ||
                  jsonb_build_array($3::jsonb))),
            true)
            WHERE id=$1 RETURNING id`,
          [patientId, episodeId, JSON.stringify(reconciliation)],
        );
        if (!updated.rowCount) throw Object.assign(new Error("Patient not found"), { status: 404 });
        await client.query("COMMIT");
        return reconciliation;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export function registerPregnancyMedicationReconciliation(
  app: Express,
  store: ReturnType<typeof createPregnancyMedicationReconciliationStore> | {
    recordNoMedicines(patientId: number, episodeId: number, userId: string): Promise<PregnancyMedicationReconciliation>;
  },
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
) {
  app.post("/api/patients/:id/pregnancy-episodes/:episodeId/medication-reconciliation", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const actor = await authenticate(req, res);
    if (!actor) {
      if (!res.headersSent) res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!("userId" in actor) || !["clinician", "owner"].includes(actor.role)) {
      return res.status(403).json({ error: "Doctor or owner access required to record medication reconciliation" });
    }
    const parseId = (value: string) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647 ? Number(value) : null;
    const patientId = parseId(req.params.id), episodeId = parseId(req.params.episodeId);
    if (!patientId || !episodeId) return res.status(400).json({ error: "Invalid patient or pregnancy episode ID" });
    if (!z.object({ status: z.literal("no-medicines") }).strict().safeParse(req.body).success) {
      return res.status(400).json({ error: "Confirm the explicit no-medicines statement." });
    }
    try {
      const reconciliation = await store.recordNoMedicines(patientId, episodeId, actor.userId);
      res.json({ reconciliation });
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;
      if (status === 500) throw error;
      res.status(status).json({ error: error instanceof Error ? error.message : "Unable to save medication reconciliation" });
    }
  });
}
