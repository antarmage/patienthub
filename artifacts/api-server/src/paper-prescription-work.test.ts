import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import pg from "pg";
import { createPaperWorkStore, ensurePaperWorkSchema, registerPaperWork } from "./paper-prescription-work";
import { paperWorkPageSchema, paperWorkQuerySchema, paperWorkUpdateSchema, type PaperWorkRow } from "../../../lib/db/src/paper-prescription-work";
import type { AccessActor } from "./clinical-access";
import { registerClinicalAccess } from "./clinical-access";
import { TRANSCRIPTION_SOURCE } from "./prescription-transcriptions";

const row: PaperWorkRow = {
  appointmentId: 1, patientId: 7, patientName: "Synthetic patient", providerId: 1, providerName: "Synthetic doctor",
  date: "2020-10-01", time: "09:00", status: "pending", transcriptionId: null, recordedAt: null, recordedBy: null,
  reason: null, updatedAt: null, updatedBy: null, version: 0,
};

test("paper work query and exemption contracts require bounded pages, real dates, explicit reasons and versions", () => {
  assert.ok(paperWorkQuerySchema.safeParse({ to: "2020-10-01", status: "pending" }).success);
  for (const query of [
    {}, { to: "2020-02-30" }, { from: "2020-10-02", to: "2020-10-01" },
    { to: "2020-10-01", limit: 101 }, { to: "2020-10-01", offset: -1 },
    { to: "2020-10-01", patientId: 2147483648 }, { to: "2020-10-01", source: "manual" },
  ]) assert.equal(paperWorkQuerySchema.safeParse(query).success, false);
  assert.ok(paperWorkUpdateSchema.safeParse({ status: "not_required", reason: "Digital prescription issued", version: 0 }).success);
  for (const update of [
    { status: "recorded", reason: "Done", version: 0 }, { status: "pending", reason: " ", version: 0 },
    { status: "not_required", reason: "None" }, { status: "not_required", reason: "None", version: -1 },
    { status: "not_required", reason: "None", version: 0, updatedBy: "someone" },
  ]) assert.equal(paperWorkUpdateSchema.safeParse(update).success, false);
});

test("paper work is accessible without clinical viewing but cannot expose prescriptions or permit unauthenticated writes", async () => {
  const app = express(); app.use(express.json());
  const authenticate = async (req: express.Request): Promise<AccessActor | null> =>
    req.headers.authorization === "patient" ? { patientId: 7 } :
      req.headers.authorization ? { userId: "synthetic", role: String(req.headers.authorization) } : null;
  registerClinicalAccess(app, { authenticate, appointmentPatientId: async () => 7, clinicalDetailsVisible: async () => false });
  let calls = 0;
  const store: ReturnType<typeof createPaperWorkStore> = {
    list: async () => { calls++; return { rows: [row], total: 1 }; },
    update: async () => { calls++; throw Object.assign(new Error("Paper entry status changed elsewhere"), { status: 409 }); },
  };
  registerPaperWork(app, store, authenticate);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (role?: string, method = "GET", suffix = "?to=2020-10-01", body?: unknown) => fetch(
    `http://127.0.0.1:${address.port}/api/paper-prescription-work${suffix}`,
    { method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
  const input = { status: "not_required", reason: "Digital prescription", version: 0 };
  try {
    for (const [method, suffix, body] of [["GET", "?to=2020-10-01", undefined], ["PATCH", "/1", input]] as const) {
      assert.equal((await request(undefined, method, suffix, body)).status, 401);
      for (const role of ["patient", "admin", "unknown"]) assert.equal((await request(role, method, suffix, body)).status, 403);
    }
    assert.equal(calls, 0);
    for (const role of ["receptionist", "staff", "clinician", "owner"]) {
      const read = await request(role);
      assert.equal(read.status, 200); assert.match(read.headers.get("cache-control") || "", /no-store/);
      assert.deepEqual(paperWorkPageSchema.parse(await read.json()), { rows: [row], total: 1 });
      assert.equal((await request(role, "PATCH", "/1", input)).status, 409);
    }
    const before = calls;
    for (const suffix of ["", "?to=bad", "?to=2020-10-01&limit=1000", "?to=2020-10-01&patientId=bad"]) assert.equal((await request("staff", "GET", suffix)).status, 400);
    assert.equal((await request("staff", "PATCH", "/bad", input)).status, 400);
    assert.equal((await request("staff", "PATCH", "/1", { ...input, status: "recorded" })).status, 400);
    assert.equal(calls, before);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});

test("Postgres paper-work tracks completed consultations, exact links, exemptions, pagination, staff attribution and concurrency", {
  skip: !process.env.TEST_PAPER_WORK_DATABASE_URL,
}, async () => {
  const schema = `paper_work_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: process.env.TEST_PAPER_WORK_DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({ connectionString: process.env.TEST_PAPER_WORK_DATABASE_URL, options: `-c search_path=${schema}` });
  try {
    await pool.query(`CREATE TABLE users(id varchar PRIMARY KEY,username text,display_name text);
      CREATE TABLE patients(id integer PRIMARY KEY,name text);
      CREATE TABLE providers(id integer PRIMARY KEY,name text);
      CREATE TABLE appointments(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id),provider_id integer REFERENCES providers(id),
        date text,time text,status text,completed_at text,type text,visit_type text,survey_type text);
      CREATE TABLE visit_history(id serial PRIMARY KEY,patient_id integer REFERENCES patients(id),
        appointment_id integer REFERENCES appointments(id),prescriptions jsonb);
      INSERT INTO users VALUES ('reception','desk','Synthetic receptionist'),('doctor','doctor',null);
      INSERT INTO patients VALUES (7,'Synthetic patient'),(8,'Other synthetic patient');
      INSERT INTO providers VALUES(1,'Synthetic doctor');
      INSERT INTO appointments(id,patient_id,provider_id,date,time,status,type) VALUES
      (1,7,1,'2020-10-01','09:00','completed','Consultation'),
      (2,7,1,'2020-10-01','10:00','completed','Consultation'),
      (3,7,1,'2020-09-01','09:00','completed','Consultation'),
      (4,7,1,'2020-10-02','09:00','scheduled','Consultation'),
      (5,7,1,'2020-10-01','09:00','cancelled','Consultation'),
      (6,7,1,'2020-10-01','09:00','no-show','Consultation'),
      (7,7,1,'2020-10-01','09:00','completed','Lab blood test'),
      (8,8,1,'2020-10-01','09:00','completed','Consultation'),
      (9,7,1,'2020-10-01','09:00','completed','Consultation'),
      (10,7,1,'2020-10-01','09:00','completed','Consultation'),
      (11,7,1,'2020-10-01','09:00','scheduled','Consultation'),
      (12,7,1,'2020-10-01','09:00','completed','Lab'),
      (13,7,1,'2020-10-01','09:00','completed','Consultation');
      UPDATE appointments SET survey_type='consultation' WHERE id=12;
      UPDATE appointments SET survey_type='lab' WHERE id=13;
      UPDATE appointments SET completed_at='2020-10-01T04:30:00Z' WHERE id IN (5,6,11);`);
    await ensurePaperWorkSchema(pool); await ensurePaperWorkSchema(pool);
    const store = createPaperWorkStore(pool);
    const query = paperWorkQuerySchema.parse({ to: "2020-10-02", status: "pending" });
    const pending = await store.list(query);
    assert.deepEqual(pending.rows.map((item) => item.appointmentId).sort((a, b) => a - b), [1, 2, 3, 8, 9, 10, 11, 12]);
    assert.equal(pending.total, 8);
    assert.equal((await store.list({ ...query, from: "2020-10-01" })).total, 7);
    assert.equal((await store.list({ ...query, providerId: 99 })).total, 0);
    assert.equal((await store.list({ ...query, patientId: 8 })).rows[0].appointmentId, 8);
    const page = await store.list({ ...query, limit: 2, offset: 2 });
    assert.equal(page.total, 8); assert.equal(page.rows.length, 2);
    assert.deepEqual((await store.list({ ...query, offset: 100 })).rows, []);
    assert.equal((await store.list({ ...query, offset: 100 })).total, 8);
    const exemption = await store.update(1, { status: "not_required", reason: "Digital prescription issued", version: 0 }, "reception");
    assert.equal(exemption.status, "not_required"); assert.equal(exemption.version, 1);
    assert.equal(exemption.updatedBy, "Synthetic receptionist");
    assert.equal((await store.list({ ...query, status: "not_required" })).total, 1);
    await assert.rejects(store.update(1, { status: "pending", reason: "Correction", version: 0 }, "doctor"), /changed elsewhere/);
    const reopened = await store.update(1, { status: "pending", reason: "Paper received", version: 1 }, "reception");
    assert.equal(reopened.status, "pending"); assert.equal(reopened.version, 2);
    assert.equal((await pool.query("SELECT jsonb_array_length(audit) AS n FROM paper_prescription_work WHERE appointment_id=1")).rows[0].n, 2);
    for (const id of [4, 5, 6, 7, 13]) await assert.rejects(store.update(id, { status: "not_required", reason: "No paper", version: 0 }, "reception"), /completed consultation/);
    await assert.rejects(store.update(999, { status: "pending", reason: "Correction", version: 0 }, "reception"), /not found/);
    const source = { source: "receptionist-paper-transcription", doctorIssuedPaper: true,
      enteredAt: "2020-10-02T03:30:00.000Z", enteredBy: { userId: "reception", role: "staff" }, medicines: ["PRIVATE"] };
    const insert = async (patientId: number, prescriptions: object) => pool.query("INSERT INTO visit_history(patient_id,prescriptions) VALUES($1,$2::jsonb) RETURNING id", [patientId, JSON.stringify(prescriptions)]);
    await insert(7, source); // Same patient, no link: does not clear pending appointments.
    await insert(8, { ...source, linkedAppointmentId: 2 }); // Forged/cross-patient link is not counted.
    await insert(7, { source: "digital", linkedAppointmentId: 2 });
    await insert(7, { ...source, doctorIssuedPaper: false, linkedAppointmentId: 2 });
    assert.equal((await store.list({ ...query, status: "recorded" })).total, 0);
    const linked = await insert(7, { ...source, linkedAppointmentId: 1 });
    const recorded = (await store.list({ ...query, status: "recorded" })).rows[0];
    assert.equal(recorded.appointmentId, 1); assert.equal(recorded.transcriptionId, linked.rows[0].id);
    assert.equal(recorded.recordedAt, source.enteredAt); assert.equal(recorded.recordedBy, "Synthetic receptionist");
    assert.equal("medicines" in recorded, false); assert.equal("prescriptions" in recorded, false);
    assert.equal((await store.list({ ...query, status: "pending", patientId: 7 })).rows.some((item) => item.appointmentId === 2), true);
    await assert.rejects(store.update(1, { status: "not_required", reason: "No paper", version: 2 }, "reception"), /already recorded/);
    await store.update(2, { status: "not_required", reason: "Initially no paper", version: 0 }, "reception");
    await insert(7, { ...source, linkedAppointmentId: 2 });
    assert.equal((await store.list({ ...query, status: "recorded" })).rows.some((item) => item.appointmentId === 2), true, "Recorded takes precedence over old exemptions");
    const concurrent = await Promise.allSettled([
      store.update(9, { status: "not_required", reason: "No paper", version: 0 }, "reception"),
      store.update(9, { status: "not_required", reason: "No paper", version: 0 }, "doctor"),
    ]);
    assert.equal(concurrent.filter((item) => item.status === "fulfilled").length, 1);
    const reloaded = await createPaperWorkStore(pool).list({ ...query, status: "not_required" });
    assert.equal(reloaded.rows.some((item) => item.appointmentId === 9), true);
    assert.equal((await pool.query("SELECT status FROM appointments WHERE id=1")).rows[0].status, "completed");
    assert.equal((await store.list({ ...query, status: "not_due" })).total, 3);
    await pool.query("UPDATE appointments SET patient_id=8 WHERE id=9");
    const reassigned = (await store.list({ ...query, status: "pending", patientId: 8 })).rows.find((item) => item.appointmentId === 9);
    assert.ok(reassigned);
    assert.equal(reassigned.version, 0, "a different patient's old exemption is not inherited");
    assert.equal(reassigned.reason, null);
    await store.update(9, { status: "not_required", reason: "New patient has no paper", version: 0 }, "reception");
    await pool.query("UPDATE appointments SET status='cancelled' WHERE id=9");
    assert.equal((await store.list({ ...query, status: "pending" })).rows.some((item) => item.appointmentId === 9), false);
    assert.equal((await store.list({ ...query, status: "not_required" })).rows.some((item) => item.appointmentId === 9), false);

    await pool.query(`INSERT INTO appointments(id,patient_id,provider_id,date,time,status,type)
      SELECT id,7,1,'2020-10-01','12:00','completed','Consultation' FROM generate_series(20,33) id;
      UPDATE appointments SET status='scheduled' WHERE id=30;`);
    const savedPrescription = async (appointmentId: number | null, prescriptions: unknown, patientId = 7) =>
      pool.query("INSERT INTO visit_history(patient_id,appointment_id,prescriptions) VALUES($1,$2,$3::jsonb)",
        [patientId, appointmentId, JSON.stringify(prescriptions)]);
    await savedPrescription(20, { source: "paper-transcribed", enteredAt: source.enteredAt, medicines: [] });
    await savedPrescription(21, { source: "paper-scanned-reviewed", medicines: [{ name: "Synthetic medicine" }] });
    await savedPrescription(22, [{ name: "Synthetic digital medicine" }]);
    await savedPrescription(23, { medicines: [{ name: "Synthetic digital medicine" }] });
    await savedPrescription(24, { source: "digital", medicines: ["Synthetic digital medicine"] });
    await savedPrescription(25, { medicines: [] });
    await savedPrescription(26, { medicines: [{ name: " " }, {}] });
    await savedPrescription(27, [{ name: "Other patient's medicine" }], 8);
    await savedPrescription(null, { source: "paper-transcribed", medicines: ["Unlinked paper"] });
    await savedPrescription(28, { source: "unknown-import", medicines: ["Unverified source"] });
    await savedPrescription(29, { source: TRANSCRIPTION_SOURCE, doctorIssuedPaper: false, medicines: ["Unverified paper"] });
    await savedPrescription(30, [{ name: "Not completed yet" }]);
    await savedPrescription(31, { medicines: { name: "Malformed medicine list" } });
    await savedPrescription(32, { medicines: ["Digital first"] });
    await savedPrescription(32, { source: "paper-transcribed", medicines: [] });
    await savedPrescription(33, { medicines: ["Digital medicine"] });
    const allRows = (await store.list({ ...query, status: "all", limit: 100 })).rows;
    const byId = new Map(allRows.map((item) => [item.appointmentId, paperWorkPageSchema.parse({ rows: [item], total: 1 }).rows[0]]));
    for (const id of [20, 21, 32]) {
      assert.equal(byId.get(id)?.status, "recorded", `legacy paper appointment ${id}`);
      assert.equal(byId.get(id)?.transcriptionId, null, "legacy entries must not open the new transcription editor");
    }
    assert.equal(byId.get(20)?.recordedAt, source.enteredAt);
    assert.equal(byId.get(20)?.recordedBy, null, "legacy entries must not invent an author");
    for (const id of [22, 23, 24, 33]) {
      assert.equal(byId.get(id)?.status, "not_required", `digital appointment ${id}`);
      assert.match(byId.get(id)?.reason || "", /Digital prescription already saved/);
      assert.equal(byId.get(id)?.updatedBy, null, "automatic exemption must not invent an actor");
    }
    for (const id of [25, 26, 27, 28, 29, 31]) assert.equal(byId.get(id)?.status, "pending", `unresolved appointment ${id}`);
    assert.equal(byId.get(30)?.status, "not_due");
    const pendingIds = (await store.list({ ...query, status: "pending" })).rows.map((item) => item.appointmentId);
    for (const id of [20, 21, 22, 23, 24, 30, 32, 33]) assert.equal(pendingIds.includes(id), false, `resolved appointment ${id} is not pending work`);
    const legacyIds = (await store.list({ ...query, status: "recorded" })).rows.map((item) => item.appointmentId);
    for (const id of [20, 21, 32]) assert.equal(legacyIds.includes(id), true);
    await assert.rejects(store.update(20, { status: "pending", reason: "Reopen", version: 0 }, "reception"), /already recorded/);
    const requestedPaper = await store.update(33, { status: "pending", reason: "Additional handwritten prescription received", version: 0 }, "reception");
    assert.equal(requestedPaper.status, "pending", "an explicit audited request can require paper entry despite a digital prescription");
  } finally { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); }
});
