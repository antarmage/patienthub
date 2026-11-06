import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { registerClinicalAccess, type AccessActor } from "./clinical-access";
import { createMenopauseStore, ensureMenopauseSchema, registerMenopauseCare } from "./menopause";
import {
  emptyMenopauseIntake, emptyMenopauseSafety, emptyMenopauseSymptoms,
  menopauseStateSchema, type MenopauseEntry, type MenopauseSubmission,
} from "../../../lib/db/src/menopause";
import { clinicDate } from "../../../lib/db/src/follow-up";

const doctor = { userId: "doctor", role: "clinician" };
const intake = { ...emptyMenopauseIntake(), priorities: "Sleep and daily functioning" };
const assessment: MenopauseEntry["record"] = { kind: "assessment", data: {
  stage: "Perimenopause", context: "Natural transition", earlyMenopause: "Not sure", suspectedPoi: "No",
  findings: "Private differential and assessment", examination: "Deferred", safetyReview: "Reviewed reported concerns", treatmentDiscussion: "Options and preferences documented",
} };
const plan = (assessmentId: number, status: "Draft" | "Approved" = "Draft"): MenopauseEntry["record"] => ({
  kind: "plan", data: { assessmentId, status, summary: "Patient-facing summary", treatment: "", lifestyle: "Agreed sleep goals",
    investigations: "", goals: "Sleep better", safetyAdvice: "Call the treating clinic for new bleeding or other concerns.",
    reviewDate: clinicDate(), safetyReviewed: status === "Approved" },
});
const submission = (record: MenopauseEntry["record"], expectedVersion = 1): MenopauseSubmission => ({
  date: clinicDate(), appointmentId: null, expectedVersion, record,
});

test("menopause endpoints enforce doctor opt-in, own-patient reads/writes and draft/private redaction before storage", async () => {
  const app = express(); app.use(express.json());
  const authenticate = async (req: express.Request): Promise<AccessActor | null> => {
    const role = req.headers.authorization;
    return role === "patient" ? { patientId: 1 } : role ? { userId: "doctor", role: String(role) } : null;
  };
  let writes = 0, reads = 0;
  const records: MenopauseEntry["record"][] = [assessment, plan(1), plan(1, "Approved"), { kind: "intake", data: intake }];
  const entries: MenopauseEntry[] = records.map((record, i) => ({
    id: i + 1, date: clinicDate(), appointmentId: null, createdAt: new Date().toISOString(), recordedBy: "Doctor", source: "Clinician", record,
  }));
  // Keep the existing global authorization middleware in the test to catch integration conflicts.
  registerClinicalAccess(app, { authenticate, appointmentPatientId: async () => null, clinicalDetailsVisible: async () => true });
  registerMenopauseCare(app, {
    read: async () => { reads++; return { enabled: true, version: 1, entries }; },
    enroll: async () => { writes++; }, submit: async () => { writes++; },
  }, authenticate);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (path = "", role?: string, method = "GET", body?: unknown, id = "1") =>
    fetch(`http://127.0.0.1:${address.port}/api/patients/${id}/menopause${path}`, {
      method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  try {
    assert.equal((await request()).status, 401);
    for (const role of ["receptionist", "staff", "admin"]) {
      assert.equal((await request("", role)).status, 403);
      assert.equal((await request("/enrollment", role, "PUT", { enabled: true, expectedVersion: 0, reason: "Care discussion" })).status, 403);
      assert.equal((await request("/entries", role, "POST", submission({ kind: "intake", data: intake }))).status, 403);
    }
    assert.equal(reads, 0); assert.equal(writes, 0);
    assert.equal((await request("", "patient", "GET", undefined, "2")).status, 403);
    assert.equal((await request("/enrollment", "patient", "PUT", { enabled: true, expectedVersion: 0, reason: "x" })).status, 403);
    assert.equal((await request("/entries", "patient", "POST", submission(assessment))).status, 403);
    assert.equal((await request("/entries", "patient", "POST", submission(plan(1, "Approved")))).status, 403);
    assert.equal(writes, 0);
    for (const id of ["0", "1.5", "2147483648", "abc", "01"])
      assert.equal((await request("", "clinician", "GET", undefined, id)).status, 400);
    const own = await request("", "patient");
    assert.equal(own.status, 200); assert.equal(own.headers.get("cache-control"), "private, no-store");
    const ownBody = menopauseStateSchema.parse(await own.json());
    assert.equal(ownBody.entries.length, 2);
    assert.doesNotMatch(JSON.stringify(ownBody), /Private differential|"Draft"|"assessment"/);
    assert.equal(menopauseStateSchema.parse(await (await request("", "clinician")).json()).entries.length, 4);
    assert.equal((await request("/entries", "patient", "POST", submission({ kind: "intake", data: intake }))).status, 201);
    assert.equal((await request("/entries", "patient", "POST", submission({ kind: "tracking", data: {
      symptoms: { ...emptyMenopauseSymptoms(), sleep: 2 }, safety: emptyMenopauseSafety(), impact: "", adherence: "Not answered", sideEffects: "",
    } }))).status, 201);
    assert.equal((await request("/enrollment", "owner", "PUT", { enabled: true, expectedVersion: 0, reason: "Care discussion" })).status, 200);
    const before = writes;
    for (const body of [
      { enabled: true, expectedVersion: 0, reason: " " }, { enabled: true, expectedVersion: 0, reason: "valid", patientId: 2 },
    ]) assert.equal((await request("/enrollment", "clinician", "PUT", body)).status, 400);
    assert.equal((await request("/entries", "clinician", "POST", { ...submission(assessment), date: "2026-02-30" })).status, 400);
    assert.equal((await request("/entries", "clinician", "POST", { ...submission(assessment), recordedBy: "Someone else" })).status, 400);
    assert.equal((await request("/entries", "patient", "POST", submission({ kind: "intake", data: { ...intake, symptoms: { ...intake.symptoms, sleep: 4 } } }))).status, 400);
    assert.equal(writes, before);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test("Postgres menopause records persist, serialize writes, retain approvals and never alter existing patient/visit data",
  { skip: !process.env.TEST_MENOPAUSE_DATABASE_URL }, async () => {
    const schema = `menopause_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new pg.Pool({ connectionString: process.env.TEST_MENOPAUSE_DATABASE_URL });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({ connectionString: process.env.TEST_MENOPAUSE_DATABASE_URL, options: `-c search_path=${schema}` });
    try {
      await pool.query(`CREATE TABLE users(id text PRIMARY KEY,display_name text,username text);
        CREATE TABLE patients(id integer PRIMARY KEY,mode text,history jsonb);
        CREATE TABLE appointments(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id),date date);
        CREATE TABLE visit_history(id integer PRIMARY KEY,patient_id integer,notes text);
        INSERT INTO users VALUES ('doctor','Synthetic Doctor','doctor');
        INSERT INTO patients VALUES (1,'pregnancy','{"existing":"preserved"}'),(2,'general','{}');
        INSERT INTO visit_history VALUES (1,1,'Original note');`);
      await pool.query("INSERT INTO appointments VALUES (10,1,$1),(20,2,$1)", [clinicDate()]);
      await ensureMenopauseSchema(pool); await ensureMenopauseSchema(pool);
      const store = createMenopauseStore(pool);
      assert.deepEqual(await store.read(1), { enabled: false, version: 0, entries: [] });
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM menopause_care")).rows[0].count, 0);
      await assert.rejects(store.read(999), { status: 404 });
      await assert.rejects(store.submit(1, submission({ kind: "intake", data: intake }, 0), doctor), { status: 409 });
      await store.enroll(1, { enabled: true, expectedVersion: 0, reason: "Discussed with patient" }, doctor);
      const concurrent = await Promise.allSettled([
        store.submit(1, submission({ kind: "intake", data: intake }), { patientId: 1 }),
        store.submit(1, submission({ kind: "intake", data: intake }), doctor),
      ]);
      assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
      const rejected = concurrent.find((result) => result.status === "rejected");
      assert.ok(rejected && rejected.status === "rejected"); assert.equal(rejected.reason.status, 409);
      let state = await store.read(1);
      assert.equal(state.version, 2); assert.equal(state.entries.length, 1);
      assert.ok(menopauseStateSchema.safeParse(state).success);
      await assert.rejects(store.submit(1, { ...submission(assessment, 2), appointmentId: 20 }, doctor), { status: 400 });
      await assert.rejects(store.submit(1, { ...submission(assessment, 2), date: "2999-01-01" }, doctor), { status: 400 });
      await assert.rejects(store.submit(1, submission({ kind: "intake", data: { ...intake, lmp: "2999-01-01" } }, 2), doctor), { status: 400 });
      await store.submit(1, { ...submission(assessment, 2), appointmentId: 10 }, doctor);
      state = await store.read(1);
      const assessmentId = state.entries.find((entry) => entry.record.kind === "assessment")!.id;
      assert.equal(state.entries[0].recordedBy, "Synthetic Doctor");
      await assert.rejects(store.submit(1, submission(plan(999), 3), doctor), { status: 400 });
      await store.submit(1, submission(plan(assessmentId), 3), doctor);
      await store.submit(1, submission(plan(assessmentId, "Approved"), 4), doctor);
      state = await store.read(1);
      const savedApproval = state.entries.find((entry) => entry.record.kind === "plan" && entry.record.data.status === "Approved");
      assert.equal(savedApproval?.approvedStage, "Perimenopause");
      assert.equal(state.entries.length, 4);
      const approved = plan(assessmentId, "Approved");
      assert.equal(approved.kind, "plan");
      if (approved.kind !== "plan") throw new Error("Expected plan fixture");
      await assert.rejects(store.submit(1, submission({ ...approved, data: { ...approved.data, reviewDate: "2020-01-01" } }, 5), doctor), { status: 400 });
      const before = await pool.query("SELECT * FROM patients ORDER BY id");
      await store.enroll(1, { enabled: false, expectedVersion: 5, reason: "Paused after discussion" }, doctor);
      await assert.rejects(store.submit(1, submission({ kind: "intake", data: intake }, 6), { patientId: 1 }), { status: 409 });
      state = await store.read(1);
      assert.equal(state.enabled, false); assert.equal(state.entries.length, 4);
      assert.deepEqual(state.entries.find((entry) => entry.id === savedApproval?.id), savedApproval);
      assert.deepEqual((await pool.query("SELECT * FROM patients ORDER BY id")).rows, before.rows);
      assert.equal((await pool.query("SELECT notes FROM visit_history")).rows[0].notes, "Original note");
      assert.equal((await pool.query("SELECT jsonb_array_length(audit) AS n FROM menopause_care")).rows[0].n, 2);
      assert.deepEqual(await store.read(2), { enabled: false, version: 0, entries: [] });
    } finally {
      await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
    }
  });
