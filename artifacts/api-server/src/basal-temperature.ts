import type { Express, Request, Response } from "express";
import type { Pool } from "pg";
import type { AccessActor } from "./clinical-access";
import { basalTemperatureInputSchema, type BasalTemperatureInput, type BasalTemperatureRecord } from "../../../lib/db/src/basal-temperature";

export async function ensureBasalTemperatureSchema(client: Pick<Pool, "query">) {
  await client.query(`CREATE TABLE IF NOT EXISTS basal_temperature_logs (
    id serial PRIMARY KEY,
    patient_id integer NOT NULL REFERENCES patients(id),
    temperature real NOT NULL,
    unit text NOT NULL CHECK(unit IN ('C','F')),
    measured_at timestamptz NOT NULL,
    notes text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK((unit='C' AND temperature BETWEEN 30 AND 45) OR (unit='F' AND temperature BETWEEN 86 AND 113))
  );
  CREATE INDEX IF NOT EXISTS basal_temperature_patient_date_idx ON basal_temperature_logs(patient_id,measured_at DESC)`);
}

export function createBasalTemperatureStore(pool: Pool) {
  type Row = Omit<BasalTemperatureRecord, "measuredAt"> & { measuredAt: Date };
  const normalize = (row: Row): BasalTemperatureRecord => ({ ...row, measuredAt: row.measuredAt.toISOString() });
  return {
    async list(patientId: number): Promise<BasalTemperatureRecord[]> {
      const rows = await pool.query<Row>(`SELECT id,temperature,unit,measured_at AS "measuredAt",notes
        FROM basal_temperature_logs WHERE patient_id=$1 ORDER BY measured_at DESC,id DESC LIMIT 30`, [patientId]);
      return rows.rows.map(normalize);
    },
    async create(patientId: number, input: BasalTemperatureInput): Promise<BasalTemperatureRecord> {
      const rows = await pool.query<Row>(`INSERT INTO basal_temperature_logs(patient_id,temperature,unit,measured_at,notes)
        VALUES($1,$2,$3,$4,$5) RETURNING id,temperature,unit,measured_at AS "measuredAt",notes`,
      [patientId, input.temperature, input.unit, input.measuredAt, input.notes]);
      return normalize(rows.rows[0]);
    },
  };
}

export function registerBasalTemperature(app: Express, store: ReturnType<typeof createBasalTemperatureStore>,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  const handle = (write: boolean) => async (req: Request, res: Response, next: (error?: unknown) => void) => {
    try {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required." }); return; }
      const id = Number(req.params.id);
      if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id > 2147483647) {
        res.status(400).json({ error: "Invalid patient ID." }); return;
      }
      if (!("patientId" in actor) || actor.patientId !== id) {
        res.status(403).json({ error: "Patient account required." }); return;
      }
      res.setHeader("Cache-Control", "private, no-store");
      if (!write) { res.json(await store.list(id)); return; }
      const input = basalTemperatureInputSchema.safeParse(req.body);
      if (!input.success) { res.status(400).json({ error: input.error.issues[0].message }); return; }
      res.status(201).json(await store.create(id, input.data));
    } catch (error) { next(error); }
  };
  app.get("/api/patients/:id/basal-temperature-logs", handle(false));
  app.post("/api/patients/:id/basal-temperature-logs", handle(true));
}
