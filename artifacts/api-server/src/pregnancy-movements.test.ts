import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import pg from "pg";
import { movementObservationSchema } from "../../../lib/db/src/pregnancy-movement";
import { createPregnancyMovementStore, ensurePregnancyMovementSchema, registerPregnancyMovements } from "./pregnancy-movements";

test("movement observations validate choices, notes and episode ownership inputs", () => {
  for (const observation of ["usual", "changed", "not-felt", "not-yet-felt", "unsure"]) {
    assert.ok(movementObservationSchema.safeParse({ episodeId: 2, observation, notes: "" }).success);
  }
  for (const input of [
    { episodeId: 2, observation: "normal", notes: "" },
    { episodeId: 0, observation: "usual", notes: "" },
    { episodeId: 2, observation: "usual", notes: "x".repeat(1001) },
    { episodeId: 2, observation: "usual", notes: "", patientId: 2 },
  ]) assert.equal(movementObservationSchema.safeParse(input).success, false);
});

test("movement routes require the owning patient and reject invalid input", async () => {
  const app = express();
  app.use(express.json());
  let calls = 0;
  const store: ReturnType<typeof createPregnancyMovementStore> = {
    list: async () => { calls++; return []; },
    create: async (_patientId, input) => { calls++; return { id: 1, ...input, createdAt: "2026-01-01T00:00:00Z" }; },
  };
  registerPregnancyMovements(app, store, async (req) =>
    req.headers.authorization === "patient" ? { patientId: 1 } :
    req.headers.authorization === "other" ? { patientId: 2 } :
    req.headers.authorization === "doctor" ? { userId: "doctor", role: "clinician" } : null);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/patients/1/pregnancy-movement-observations`;
  const request = (method: string, role?: string, body?: unknown, query = "") => fetch(base + query, {
    method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    for (const role of [undefined, "other", "doctor"]) {
      assert.equal((await request("GET", role, undefined, "?episodeId=2")).status, role ? 403 : 401);
      assert.equal((await request("POST", role, { episodeId: 2, observation: "changed", notes: "" })).status, role ? 403 : 401);
    }
    assert.equal((await request("GET", "patient", undefined, "?episodeId=bad")).status, 400);
    assert.equal((await request("POST", "patient", { episodeId: 2, observation: "bad", notes: "" })).status, 400);
    assert.equal(calls, 0);
    const read = await request("GET", "patient", undefined, "?episodeId=2");
    assert.equal(read.status, 200);
    assert.match(read.headers.get("cache-control") || "", /no-store/);
    assert.deepEqual(await read.json(), []);
    const saved = await request("POST", "patient", { episodeId: 2, observation: "changed", notes: "  example  " });
    assert.equal(saved.status, 201);
    assert.deepEqual(await saved.json(), { id: 1, episodeId: 2, observation: "changed", notes: "example", createdAt: "2026-01-01T00:00:00Z" });
    assert.equal(calls, 2);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("Postgres preserves episode observations and rejects writes after pregnancy ends", {
  skip: !process.env.TEST_PREGNANCY_DATABASE_URL,
}, async () => {
  const schema = `movement_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: process.env.TEST_PREGNANCY_DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({ connectionString: process.env.TEST_PREGNANCY_DATABASE_URL, options: `-c search_path=${schema}` });
  try {
    await pool.query(`CREATE TABLE pregnancy_episodes (id integer PRIMARY KEY, patient_id integer NOT NULL, details jsonb NOT NULL, UNIQUE(id,patient_id));
      INSERT INTO pregnancy_episodes VALUES (1,1,'{"status":"current"}'), (2,2,'{"status":"current"}');`);
    await ensurePregnancyMovementSchema(pool);
    await ensurePregnancyMovementSchema(pool);
    const store = createPregnancyMovementStore(pool);
    await assert.rejects(store.create(1, { episodeId: 2, observation: "usual", notes: "" }), /not found/);
    const saved = await store.create(1, { episodeId: 1, observation: "changed", notes: "Example" });
    assert.equal(saved.observation, "changed");
    assert.equal((await store.list(1, 1)).length, 1);
    assert.deepEqual(await store.list(2, 1), []);
    await pool.query(`UPDATE pregnancy_episodes SET details='{"status":"past"}' WHERE id=1`);
    await assert.rejects(store.create(1, { episodeId: 1, observation: "usual", notes: "" }), /no longer active/);
    assert.equal((await store.list(1, 1)).length, 1);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
