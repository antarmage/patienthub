import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import pg from "pg";
import { registerClinicalAccess, type AccessActor } from "./clinical-access";
import {
  assertSurgeryTransition, recoveryObservationSchema, registerSurgeryWorkflow, surgeryDetailsSchema,
  surgeryStatuses, type SurgeryWorkflowStore,
} from "./surgery-workflow";
import { createSurgeryStore, ensureSurgerySchema } from "./surgery-store";

const details = { procedureName: "Test procedure", plannedDate: "2026-11-01", surgeonId: 1, notes: "Synthetic notes" };
const observation = { patientId: 1, surgeryPlanId: 1, observedAt: new Date().toISOString(), painScore: 0,
  systolic: "120", diastolic: "80", pulse: "72", nausea: false, mobility: null, woundCondition: null, notes: null };

test("surgery lifecycle permits only plan-to-completion/cancellation and recovery-to-discharge", () => {
  for (const current of surgeryStatuses) for (const next of ["completed", "cancelled", "discharged"] as const) {
    const valid = current === "planned" && ["completed", "cancelled"].includes(next) || current === "completed" && next === "discharged";
    if (valid) assert.doesNotThrow(() => assertSurgeryTransition(current, next));
    else assert.throws(() => assertSurgeryTransition(current, next), /cannot make that status change/);
  }
  assert.ok(surgeryDetailsSchema.safeParse(details).success);
  for (const body of [{ ...details, procedureName: "" }, { ...details, plannedDate: "2026-02-30" },
    { ...details, surgeonId: -1 }, { ...details, status: "completed" }, { ...details, createdBy: "other" }]) {
    assert.equal(surgeryDetailsSchema.safeParse(body).success, false);
  }
  const parsed = recoveryObservationSchema.parse(observation);
  assert.equal(parsed.painScore, 0);
  assert.equal(parsed.systolic, 120);
  for (const body of [{ ...observation, surgeryPlanId: undefined }, { ...observation, painScore: 11 },
    { ...observation, systolic: "80", diastolic: "120" }, { ...observation, recordedBy: "other" }]) {
    assert.equal(recoveryObservationSchema.safeParse(body).success, false);
  }
});

test("only doctors/owners can plan surgery; recovery staff receive a narrow projection and must supply an episode", async () => {
  const app = express(); app.use(express.json());
  const authenticate = async (req: express.Request): Promise<AccessActor | null> =>
    req.headers.authorization === "patient" ? { patientId: 1 } :
      req.headers.authorization ? { userId: "synthetic", role: String(req.headers.authorization) } : null;
  registerClinicalAccess(app, { authenticate, appointmentPatientId: async () => null });
  let calls = 0;
  const store: SurgeryWorkflowStore = {
    list: async () => { calls++; return []; },
    create: async () => { calls++; throw new Error("Not invoked in this test"); },
    edit: async () => { calls++; throw new Error("Not invoked in this test"); },
    transition: async () => { calls++; throw new Error("Not invoked in this test"); },
    recoveryPatients: async () => [{ id: 1, name: "Synthetic patient", age: null, phone: null,
      surgery: { id: 1, procedureName: "Test procedure", plannedDate: "2026-11-01", completedAt: new Date().toISOString(), surgeonName: "Synthetic doctor" } }],
    observations: async () => { calls++; return []; },
    recordObservation: async () => { calls++; return {}; },
  };
  registerSurgeryWorkflow(app, store, authenticate);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (path: string, role?: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) =>
    fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    for (const [path, method, body] of [
      ["/api/patients/1/surgeries", "GET", undefined],
      ["/api/patients/1/surgeries", "POST", details],
      ["/api/patients/1/surgeries/1", "PATCH", { status: "completed", completedDate: "2026-11-01" }],
    ] as const) {
      assert.equal((await request(path, undefined, method, body)).status, 401);
      for (const role of ["staff", "receptionist", "admin", "patient", "unknown"]) assert.equal((await request(path, role, method, body)).status, 403);
    }
    assert.equal(calls, 0);
    for (const role of ["clinician", "owner"]) assert.equal((await request("/api/patients/1/surgeries", role)).status, 200);
    for (const role of ["staff", "receptionist", "admin", "clinician", "owner"]) {
      const response = await request("/api/postop/patients", role);
      assert.equal(response.status, 200);
      const rows = await response.json();
      assert.ok(Array.isArray(rows));
      assert.deepEqual(Object.keys(rows[0]).sort(), ["age", "id", "name", "phone", "surgery"]);
      assert.deepEqual(Object.keys(rows[0].surgery).sort(), ["completedAt", "id", "plannedDate", "procedureName", "surgeonName"]);
    }
    assert.equal((await request("/api/postop/patients", "patient")).status, 403);
    assert.equal((await request("/api/postop/observations", "staff")).status, 400);
    assert.equal((await request("/api/postop/observations", "staff", "GET", undefined, { "X-Patient-Id": "1" })).status, 400);
    assert.equal((await request("/api/postop/observations", "staff", "GET", undefined, { "X-Patient-Id": "1", "X-Surgery-Plan-Id": "1" })).status, 200);
    assert.equal((await request("/api/postop/observations", "staff", "POST", { ...observation, surgeryPlanId: undefined })).status, 400);
    assert.equal((await request("/api/patients/1/surgeries/1", "clinician", "PATCH", { status: "completed", completedDate: "2999-01-01" })).status, 400);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});

test("Postgres surgery enrollment, repeat surgery isolation, cancellation/discharge gates and concurrent plans", {
  skip: !process.env.TEST_SURGERY_DATABASE_URL,
}, async () => {
  const pool = new pg.Pool({ connectionString: process.env.TEST_SURGERY_DATABASE_URL });
  const schema = `surgery_test_${process.pid}`;
  try {
    await pool.query(`CREATE SCHEMA ${schema}`);
    await pool.end();
    const isolated = new pg.Pool({ connectionString: process.env.TEST_SURGERY_DATABASE_URL, options: `-c search_path=${schema}` });
    try {
      await isolated.query(`CREATE TABLE users(id varchar PRIMARY KEY, username text);
        CREATE TABLE patients(id integer PRIMARY KEY, name text, phone text, age integer);
        CREATE TABLE providers(id integer PRIMARY KEY, name text);
        CREATE TABLE postop_observations(id serial PRIMARY KEY,patient_id integer,observed_at text,pain_score integer,
          systolic integer,diastolic integer,pulse integer,nausea boolean,mobility text,wound_condition text,notes text,recorded_by text);
        INSERT INTO users VALUES ('doctor','Synthetic doctor');
        INSERT INTO patients VALUES (1,'Synthetic patient','000',30),(2,'Other patient',null,null);
        INSERT INTO providers VALUES (1,'Synthetic surgeon');
        INSERT INTO postop_observations(patient_id,observed_at,notes) VALUES (1,'2020-01-01T00:00:00Z','Legacy record');`);
      await ensureSurgerySchema(isolated);
      await ensureSurgerySchema(isolated);
      const store = createSurgeryStore(isolated);
      const first = await store.create(1, details, "doctor");
      assert.equal(first.status, "planned");
      assert.deepEqual(await store.recoveryPatients(""), []);
      await assert.rejects(store.observations(1, first.id), /not in active surgical recovery/);
      await assert.rejects(store.recordObservation(recoveryObservationSchema.parse({ ...observation, surgeryPlanId: first.id }), "doctor"), /not in active surgical recovery/);
      await assert.rejects(store.create(1, details, "doctor"), /already has an open/);
      await store.edit(1, first.id, { ...details, notes: "Updated" }, "doctor");
      const complete = await store.transition(1, first.id, { status: "completed", completedDate: "2026-11-01" }, "doctor");
      assert.equal(complete.status, "completed");
      assert.equal((await store.recoveryPatients("synthetic"))[0].surgery.id, first.id);
      assert.deepEqual(await store.recoveryPatients("unmatched"), []);
      assert.deepEqual(await store.observations(1, first.id), []);
      await assert.rejects(store.observations(2, first.id), /not found for this patient/);
      const saved = await store.recordObservation(recoveryObservationSchema.parse({ ...observation, surgeryPlanId: first.id }), "doctor");
      assert.ok(saved);
      assert.equal((await store.observations(1, first.id)).length, 1);
      await assert.rejects(store.recordObservation(recoveryObservationSchema.parse({ ...observation, surgeryPlanId: first.id, observedAt: "2020-01-01T00:00:00Z" }), "doctor"), /after surgery completion/);
      await store.transition(1, first.id, { status: "discharged" }, "doctor");
      assert.deepEqual(await store.recoveryPatients(""), []);
      await assert.rejects(store.recordObservation(recoveryObservationSchema.parse({ ...observation, surgeryPlanId: first.id }), "doctor"), /not in active surgical recovery/);
      await assert.rejects(store.transition(1, first.id, { status: "completed", completedDate: "2026-11-01" }, "doctor"), /cannot make that status change/);
      const second = await store.create(1, details, "doctor");
      await store.transition(1, second.id, { status: "completed", completedDate: "2026-11-01" }, "doctor");
      assert.deepEqual(await store.observations(1, second.id), []);
      await store.transition(1, second.id, { status: "discharged" }, "doctor");
      const concurrent = await Promise.allSettled([store.create(1, details, "doctor"), store.create(1, details, "doctor")]);
      assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(concurrent.filter((result) => result.status === "rejected").length, 1);
      const open = (await store.list(1)).find((plan) => plan.status === "planned");
      assert.ok(open);
      await store.transition(1, open.id, { status: "cancelled" }, "doctor");
      assert.deepEqual(await store.recoveryPatients(""), []);
      await assert.rejects(store.observations(1, open.id), /not in active surgical recovery/);
      assert.equal((await isolated.query("SELECT * FROM postop_observations")).rowCount, 2);
      await assert.rejects(store.create(99, details, "doctor"), /Patient not found/);
      await assert.rejects(store.create(2, { ...details, surgeonId: 99 }, "doctor"), /existing surgeon/);
      assert.equal((await store.list(2)).length, 0);
    } finally { await isolated.end(); }
  } finally {
    const cleanup = new pg.Pool({ connectionString: process.env.TEST_SURGERY_DATABASE_URL });
    await cleanup.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await cleanup.end();
  }
});
