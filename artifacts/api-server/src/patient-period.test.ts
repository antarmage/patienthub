import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createPatientPeriodStore, ensurePatientPeriodSchema, periodBlocked, periodReminder, periodValue, recordedHistoryPeriod, registerPatientPeriod } from "./patient-period";

test("period estimates preserve uncertainty without creating a date for the open-ended choice", () => {
  const now = Date.parse("2026-11-26T12:00:00Z");
  assert.deepEqual(periodValue({ kind: "estimate", choice: "two-weeks" }, now), {
    date: "2026-11-12", estimated: true, description: "About 2 weeks ago",
  });
  assert.deepEqual(periodValue({ kind: "estimate", choice: "over-three-months-or-irregular" }, now), {
    date: null, estimated: true, description: "More than 3 months ago or periods are not regular",
  });
  assert.equal(periodValue({ kind: "date", date: "2026-11-25" }, now).estimated, false);
  assert.throws(() => periodValue({ kind: "date", date: "2026-11-27" }, now), /future/);
  assert.equal(periodReminder(now), "2026-12-03T12:00:00.000Z");
});

test("period prompts are suppressed for recorded dates and pregnancy loss or an ended pregnancy", () => {
  assert.equal(periodBlocked([], null), false);
  assert.equal(periodBlocked([], "2026-01-01"), true);
  assert.equal(periodBlocked([{ details: { status: "current", lmp: "2026-01-01" } }], null), true);
  assert.equal(periodBlocked([{ details: { status: "past", outcome: "Miscarriage" } }], null), true);
  assert.equal(periodBlocked([{ details: { status: "past", notes: "Patient reported pregnancy has ended; no further details were supplied." } }], null), true);
  assert.equal(periodBlocked([{ details: { status: "current" } }, { details: { status: "past", outcome: "Miscarriage" } }], null), false);
  assert.equal(recordedHistoryPeriod({ onboarding: { cycle: { lastPeriod: "2026-03-01" } } }), "2026-03-01");
  assert.equal(recordedHistoryPeriod({ patientReportedLmp: { value: "2026-02-01" } }), "2026-02-01");
  assert.equal(recordedHistoryPeriod({ onboarding: { cycle: { lastPeriod: "" } }, patientReportedLmp: { value: "2026-02-01" } }), "2026-02-01");
});

test("period API is limited to the signed-in patient and validates input", async () => {
  const app = express();
  app.use(express.json());
  let writes = 0;
  const state = { value: null, shownCount: 0, nextPromptAt: null, blocked: false };
  registerPatientPeriod(app, {
    read: async () => state,
    show: async () => { writes++; return state; },
    dismiss: async () => { writes++; return state; },
    save: async () => { writes++; return state; },
  }, async (req) => req.headers.authorization === "own" ? { patientId: 1 }
    : req.headers.authorization === "other" ? { patientId: 2 }
    : req.headers.authorization === "doctor" ? { role: "clinician", userId: "doctor" } : null);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (method: string, role?: string, body?: unknown, suffix = "") => fetch(
    `http://127.0.0.1:${address.port}/api/patients/1/period-prompt${suffix}`,
    { method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) },
  );
  try {
    assert.equal((await request("GET")).status, 401);
    for (const role of ["other", "doctor"]) {
      assert.equal((await request("GET", role)).status, 403);
      assert.equal((await request("PUT", role, { kind: "date", date: "2026-01-01" })).status, 403);
    }
    const read = await request("GET", "own");
    assert.equal(read.status, 200);
    assert.match(read.headers.get("cache-control") || "", /no-store/);
    assert.equal((await request("PUT", "own", { kind: "date", date: "2026-02-31" })).status, 400);
    assert.equal((await request("PUT", "own", { kind: "estimate", choice: "invalid" })).status, 400);
    assert.equal(writes, 0);
    assert.equal((await request("PUT", "own", { kind: "estimate", choice: "two-weeks" })).status, 200);
    assert.equal((await request("POST", "own", {}, "/dismiss")).status, 200);
    assert.equal((await request("POST", "own", {}, "/show")).status, 200);
    assert.equal(writes, 3);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((failure) => failure ? reject(failure) : resolve()));
  }
});

test("period state persists, respects pregnancy transitions, and is scoped to the current episode", {
  skip: !process.env.TEST_PREGNANCY_DATABASE_URL,
}, async () => {
  const schema = `period_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: process.env.TEST_PREGNANCY_DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({ connectionString: process.env.TEST_PREGNANCY_DATABASE_URL, options: `-c search_path=${schema}` });
  try {
    await pool.query(`CREATE TABLE patients(id integer PRIMARY KEY,lmp text,history jsonb);
      CREATE TABLE pregnancy_episodes(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id),details jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
      INSERT INTO patients(id,lmp) VALUES(1,NULL);`);
    await ensurePatientPeriodSchema(pool);
    const store = createPatientPeriodStore(pool);
    assert.equal((await store.show(1)).shownCount, 1);
    await assert.rejects(() => store.show(1), /not due/);
    assert.equal((await store.dismiss(1)).shownCount, 1);
    await pool.query("UPDATE patient_period_prompt SET next_prompt_at=now()-interval '1 second' WHERE patient_id=1");
    assert.equal((await store.show(1)).shownCount, 2);
    const second = await store.dismiss(1);
    assert.equal(second.shownCount, 2);
    assert.ok(second.nextPromptAt);
    await pool.query("UPDATE patient_period_prompt SET next_prompt_at=now()-interval '1 second' WHERE patient_id=1");
    assert.equal((await store.show(1)).shownCount, 3);
    await pool.query("UPDATE patient_period_prompt SET next_prompt_at=now()-interval '1 second' WHERE patient_id=1");
    await assert.rejects(() => store.show(1), /not due/);
    assert.equal((await store.save(1, { kind: "estimate", choice: "over-three-months-or-irregular" })).value?.estimated, true);
    assert.equal((await store.read(1)).value?.date, null);
    await pool.query(`INSERT INTO pregnancy_episodes(id,patient_id,details) VALUES(10,1,'{"status":"past","outcome":"Miscarriage"}')`);
    assert.equal((await store.read(1)).blocked, true);
    await assert.rejects(() => store.save(1, { kind: "date", date: "2020-01-01" }), /unavailable/);
    await pool.query(`INSERT INTO pregnancy_episodes(id,patient_id,details) VALUES(11,1,'{"status":"current"}')`);
    const current = await store.read(1);
    assert.equal(current.blocked, false);
    assert.equal(current.value, null);
    assert.equal(current.shownCount, 0);
    await store.save(1, { kind: "estimate", choice: "two-weeks" });
    assert.equal((await store.read(1)).value?.estimated, true);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
