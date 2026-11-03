import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";
import {
  createPregnancyMedicationReconciliationStore,
  registerPregnancyMedicationReconciliation,
} from "./pregnancy-medication-reconciliation";
import type { AccessActor } from "./clinical-access";

test("no-medicines reconciliation is clinician-only and validates IDs and explicit confirmation", async () => {
  const app = express();
  app.use(express.json());
  const calls: unknown[][] = [];
  const authenticate = async (req: express.Request): Promise<AccessActor | null> =>
    req.headers.authorization === "clinician" ? { userId: "doctor-1", role: "clinician" }
      : req.headers.authorization === "owner" ? { userId: "owner-1", role: "owner" }
        : req.headers.authorization === "patient" ? { patientId: 7 } : null;
  registerPregnancyMedicationReconciliation(app, {
    async recordNoMedicines(...args) {
      calls.push(args);
      return { status: "no-medicines", episodeId: args[1], recordedAt: "2026-11-03T03:00:00.000Z", recordedBy: args[2] };
    },
  }, authenticate);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const request = (path: string, role?: string, body: unknown = { status: "no-medicines" }) =>
      fetch(`http://127.0.0.1:${address.port}${path}`, {
        method: "POST",
        headers: { ...(role ? { authorization: role } : {}), "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      test("no-medicines statement is episode-scoped, atomic and audited without changing other history", {
        skip: !process.env.TEST_PREGNANCY_DATABASE_URL,
      }, async () => {
        const schema = `pregnancy_medication_test_${randomUUID().replaceAll("-", "")}`;
        const admin = new pg.Pool({ connectionString: process.env.TEST_PREGNANCY_DATABASE_URL });
        await admin.query(`CREATE SCHEMA ${schema}`);
        const pool = new pg.Pool({
          connectionString: process.env.TEST_PREGNANCY_DATABASE_URL,
          options: `-c search_path=${schema}`,
        });
        try {
          await pool.query(`CREATE TABLE patients(id integer PRIMARY KEY, history jsonb);
            CREATE TABLE pregnancy_episodes(id integer PRIMARY KEY, patient_id integer, details jsonb);
            INSERT INTO patients VALUES (1,'{"allergies":["Penicillin"],"obstetric":{"bloodGroup":"O+"}}'),(2,null);
            INSERT INTO pregnancy_episodes VALUES
              (11,1,'{"status":"current"}'),
              (12,1,'{"status":"past"}'),
              (21,2,'{"status":"current"}');`);
          const store = createPregnancyMedicationReconciliationStore(pool);
          const saved = await store.recordNoMedicines(1, 11, "doctor");
          assert.equal(saved.episodeId, 11);
          await store.recordNoMedicines(1, 11, "doctor");
          const history = (await pool.query("SELECT history FROM patients WHERE id=1")).rows[0].history;
          assert.deepEqual(history.allergies, ["Penicillin"]);
          assert.deepEqual(history.obstetric, { bloodGroup: "O+" });
          assert.equal(history.pregnancyMedicationReconciliations["11"].status, "no-medicines");
          assert.equal(history.pregnancyMedicationReconciliations["11"].audit.length, 2);
          await assert.rejects(() => store.recordNoMedicines(1, 12, "doctor"), /saved current pregnancy/i);
          await assert.rejects(() => store.recordNoMedicines(2, 11, "doctor"), /saved current pregnancy/i);
          assert.equal((await pool.query("SELECT history FROM patients WHERE id=2")).rows[0].history, null);
        } finally {
          await pool.end();
          await admin.query(`DROP SCHEMA ${schema} CASCADE`);
          await admin.end();
        }
      });
    assert.equal((await request("/api/patients/7/pregnancy-episodes/2/medication-reconciliation")).status, 401);
    assert.equal((await request("/api/patients/7/pregnancy-episodes/2/medication-reconciliation", "patient")).status, 403);
    assert.equal((await request("/api/patients/0/pregnancy-episodes/2/medication-reconciliation", "clinician")).status, 400);
    assert.equal((await request("/api/patients/7/pregnancy-episodes/2/medication-reconciliation", "clinician", { status: "unknown" })).status, 400);
    const response = await request("/api/patients/7/pregnancy-episodes/2/medication-reconciliation", "clinician");
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [[7, 2, "doctor-1"]]);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal((await request("/api/patients/7/pregnancy-episodes/2/medication-reconciliation", "owner")).status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
