import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import pg from "pg";
import { z } from "zod/v4";
import {
  babyAge, babyUpdateSchema, deliveryInputSchema, deliveryOutcome, isCaesareanProcedure,
  type Baby, type DeliveryInput, type DeliveryRecord,
} from "../../../lib/db/src/delivery";
import { createDeliveryStore, ensureDeliverySchema, registerDeliveries } from "./deliveries";
import { createSurgeryStore, ensureSurgerySchema } from "./surgery-store";
import { createPregnancyEpisodeStore, ensurePregnancyEpisodeSchema } from "./pregnancy-episode-store";
import { ensurePregnancyFollowUpSchema } from "./pregnancy-follow-ups";
import { transitionSchema } from "./surgery-workflow";
import type { AccessActor } from "./clinical-access";
import type { PregnancyEpisodeDetails } from "../../../lib/db/src/pregnancy-episodes";

const baby: Baby = { name: "", birthDate: "2020-10-01", birthTime: "08:30", outcome: "Live birth", deathDate: null };
const input: DeliveryInput = { episodeId: 1, episodeVersion: 1, deliveryDate: baby.birthDate,
  deliveryMode: "Caesarean", babies: [baby], postpartumReviewDate: "2020-10-15" };
const episodeDetails: PregnancyEpisodeDetails = {
  number: 1, status: "current", startDate: "2020-01-01", endDate: null, lmp: "2020-01-01",
  dueDate: "2020-10-07", datingBasis: "LMP", outcome: "Not recorded", deliveryMode: "Not recorded",
  conceptionMethod: "", fetusCount: 1, notes: "",
};

test("delivery validation requires actual per-baby outcomes and dates without assuming live birth", () => {
  assert.ok(deliveryInputSchema.safeParse(input).success);
  assert.equal(deliveryOutcome([baby, { ...baby, outcome: "Stillbirth" }]), "Other");
  assert.equal(deliveryOutcome([{ ...baby, outcome: "Stillbirth" }]), "Stillbirth");
  for (const invalid of [
    { ...input, babies: [] }, { ...input, babies: Array(11).fill(baby) },
    { ...input, babies: [{ ...baby, outcome: "" }] },
    { ...input, babies: [{ ...baby, birthDate: "2020-02-30" }] },
    { ...input, babies: [{ ...baby, birthDate: "2099-01-01" }] },
    { ...input, babies: [{ ...baby, birthTime: "24:00" }] },
    { ...input, babies: [{ ...baby, deathDate: "2020-09-30" }] },
    { ...input, babies: [{ ...baby, outcome: "Stillbirth", deathDate: "2020-10-02" }] },
    { ...input, deliveryDate: "2020-09-30" }, { ...input, deliveryDate: "2020-10-02" },
    { ...input, postpartumReviewDate: "2020-09-30" }, { ...input, episodeVersion: 0 },
    { ...input, patientId: 2 },
  ]) assert.equal(deliveryInputSchema.safeParse(invalid).success, false, JSON.stringify(invalid));
  assert.ok(deliveryInputSchema.safeParse({ ...input, babies: [{ ...baby, birthDate: "2020-09-30" }, baby] }).success);
  assert.ok(babyUpdateSchema.safeParse({ version: 1, babies: [{ ...baby, deathDate: "2020-10-02" }] }).success);
  assert.equal(transitionSchema.safeParse({ status: "completed", completedDate: "2020-10-02", delivery: input }).success, false);
  assert.ok(transitionSchema.safeParse({ status: "completed", completedDate: "2020-10-01", delivery: input }).success);
  for (const name of ["Planned caesarean", "Cesarean", "LSCS", "C-section", "ceaseran"]) assert.ok(isCaesareanProcedure(name));
  for (const name of ["Induction of labour", "Cerclage", "Myomectomy"]) assert.equal(isCaesareanProcedure(name), false);
});

test("baby age handles newborns, month boundaries, years and death without ageing stillbirths", () => {
  assert.equal(babyAge(baby, "2020-10-01"), "0 days");
  assert.equal(babyAge(baby, "2020-10-08"), "7 days");
  assert.equal(babyAge(baby, "2020-11-01"), "1 month");
  assert.equal(babyAge(baby, "2022-12-01"), "2y 2m");
  assert.equal(babyAge({ ...baby, birthDate: "2020-01-31" }, "2020-02-29"), "1 month");
  assert.equal(babyAge({ ...baby, birthDate: "2020-02-29" }, "2021-02-28"), "1y 0m");
  assert.equal(babyAge({ ...baby, outcome: "Stillbirth" }, "2026-01-01"), "Stillbirth");
  assert.equal(babyAge({ ...baby, deathDate: "2020-10-03" }, "2026-01-01"), "Died 2020-10-03 (age 2 days)");
  assert.equal(babyAge(baby, "2020-09-30"), "Age unavailable");
});

test("delivery and baby APIs reject non-clinicians, invalid input and stale writes explicitly", async () => {
  const app = express(); app.use(express.json());
  const record: DeliveryRecord = { ...input, id: 1, patientId: 1, surgeryPlanId: null, version: 1 };
  let calls = 0;
  const store: ReturnType<typeof createDeliveryStore> = {
    list: async () => { calls++; return [record]; },
    create: async () => { calls++; return record; },
    update: async () => { calls++; throw Object.assign(new Error("Baby records changed elsewhere"), { status: 409 }); },
  };
  registerDeliveries(app, store, async (req): Promise<AccessActor | null> =>
    req.headers.authorization === "patient" ? { patientId: 1 } :
      req.headers.authorization ? { userId: "doctor", role: String(req.headers.authorization) } : null);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (method: string, role?: string, body?: unknown, suffix = "") => fetch(
    `http://127.0.0.1:${address.port}/api/patients/1/deliveries${suffix}`, {
      method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    for (const [method, body, suffix] of [["GET", undefined, ""], ["POST", input, ""], ["PUT", { version: 1, babies: [baby] }, "/1"]] as const) {
      assert.equal((await request(method, undefined, body, suffix)).status, 401);
      for (const role of ["patient", "receptionist", "staff", "admin", "unknown"]) assert.equal((await request(method, role, body, suffix)).status, 403);
    }
    assert.equal(calls, 0);
    for (const role of ["clinician", "owner"]) {
      const read = await request("GET", role);
      assert.equal(read.status, 200); assert.match(read.headers.get("cache-control") || "", /no-store/);
      assert.deepEqual(await read.json(), [record]);
      assert.equal((await request("POST", role, input)).status, 201);
    }
    assert.equal((await request("POST", "clinician", { ...input, babies: [] })).status, 400);
    assert.equal((await request("PUT", "clinician", { babies: [baby] }, "/1")).status, 400);
    assert.equal((await request("PUT", "clinician", { version: 1, babies: [baby] }, "/bad")).status, 400);
    const stale = await request("PUT", "clinician", { version: 1, babies: [baby] }, "/1");
    assert.equal(stale.status, 409); assert.match(z.object({ error: z.string() }).parse(await stale.json()).error, /changed elsewhere/);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});

test("Postgres delivery atomically closes pregnancy, preserves history, enrolls recovery and persists individual babies", {
  skip: !process.env.TEST_PREGNANCY_DATABASE_URL,
}, async () => {
  const url = process.env.TEST_PREGNANCY_DATABASE_URL;
  const schema = `delivery_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
  try {
    await pool.query(`CREATE TABLE users(id varchar PRIMARY KEY);
      CREATE TABLE providers(id integer PRIMARY KEY,name text);
      CREATE TABLE patients(id integer PRIMARY KEY,name text,phone text,age integer,type text,pregnancy_status text,lmp text,next_review text);
      CREATE TABLE appointments(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id));
      CREATE TABLE visit_history(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id));
      CREATE TABLE lab_results(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id));
      CREATE TABLE postop_observations(id serial PRIMARY KEY,patient_id integer REFERENCES patients(id));
      INSERT INTO users VALUES ('doctor'); INSERT INTO providers VALUES (1,'Synthetic doctor');
      INSERT INTO patients(id,name,type,pregnancy_status,lmp,next_review)
        SELECT n,'Synthetic patient ' || n,'Pregnant','pregnant','2020-01-01','2020-09-25' FROM generate_series(1,8) n;`);
    await ensureSurgerySchema(pool); await ensurePregnancyEpisodeSchema(pool); await ensurePregnancyFollowUpSchema(pool);
    await ensureDeliverySchema(pool); await ensureDeliverySchema(pool);
    const pregnancies = createPregnancyEpisodeStore(pool);
    const deliveries = createDeliveryStore(pool), surgery = createSurgeryStore(pool);
    const episodes = [];
    for (let id = 1; id <= 8; id++) episodes.push(await pregnancies.save(id, null, { details: { ...episodeDetails, fetusCount: id === 1 ? 2 : 1 }, records: [] }, "doctor"));
    await pool.query(`INSERT INTO pregnancy_follow_up_plans(patient_id,plan,updated_by)
      VALUES(1,$1::jsonb,'doctor')`, [JSON.stringify({ episodeId: episodes[0].id, dueDate: "2020-09-25" })]);
    const plan = await surgery.create(1, { procedureName: "Planned caesarean", plannedDate: "2020-10-01", surgeonId: 1, notes: "" }, "doctor");
    const twins: DeliveryInput = { ...input, episodeId: episodes[0].id, babies: [baby, { ...baby, outcome: "Stillbirth" }] };
    await assert.rejects(surgery.transition(1, plan.id, { status: "completed", completedDate: input.deliveryDate }, "doctor"), /Confirm delivery/);
    await assert.rejects(surgery.transition(1, plan.id, { status: "completed", completedDate: input.deliveryDate, delivery: { ...twins, episodeVersion: 99 } }, "doctor"), /Pregnancy changed/);
    await assert.rejects(surgery.transition(1, plan.id, { status: "completed", completedDate: input.deliveryDate, delivery: { ...twins, deliveryMode: "Vaginal" } }, "doctor"), /Caesarean delivery mode/);
    await assert.rejects(deliveries.create(1, { ...twins, episodeId: episodes[1].id }, "doctor"), /not found for this patient/);
    await assert.rejects(deliveries.create(1, { ...twins, babies: [baby] }, "doctor"), /fetus count/);
    assert.equal((await surgery.list(1))[0].status, "planned");
    assert.equal((await pregnancies.list(1))[0].details.status, "current");
    assert.deepEqual(await deliveries.list(1), []);
    const completed = await surgery.transition(1, plan.id, { status: "completed", completedDate: input.deliveryDate, delivery: twins }, "doctor");
    assert.equal(completed.status, "completed");
    const record = (await createDeliveryStore(pool).list(1))[0];
    assert.equal(record.surgeryPlanId, plan.id); assert.deepEqual(record.babies, twins.babies);
    const past = (await pregnancies.list(1))[0];
    assert.equal(past.details.status, "past"); assert.equal(past.details.outcome, "Other");
    assert.equal(past.details.deliveryMode, "Caesarean"); assert.equal(past.version, 2);
    assert.equal(past.details.lmp, "2020-01-01");
    assert.deepEqual((await pool.query("SELECT type,pregnancy_status,lmp,next_review FROM patients WHERE id=1")).rows[0],
      { type: "Postpartum", pregnancy_status: "completed", lmp: "2020-01-01", next_review: input.postpartumReviewDate });
    const followUp = (await pool.query("SELECT plan,audit FROM pregnancy_follow_up_plans WHERE patient_id=1")).rows[0];
    assert.equal(followUp.plan, null); assert.equal(followUp.audit.length, 1);
    assert.equal((await surgery.recoveryPatients(""))[0].surgery.id, plan.id);
    await surgery.transition(1, plan.id, { status: "discharged" }, "doctor");
    assert.equal((await pool.query("SELECT type FROM patients WHERE id=1")).rows[0].type, "Postpartum");
    assert.deepEqual(await surgery.recoveryPatients(""), []);
    await assert.rejects(pregnancies.save(1, past.id, { details: { ...past.details, status: "current", endDate: null, outcome: "Not recorded", deliveryMode: "Not recorded" }, records: [], version: past.version }, "doctor"), /delivery record/);
    await assert.rejects(deliveries.create(1, twins, "doctor"), /Pregnancy changed/);
    const updatedBabies = [{ ...baby, name: "Synthetic baby", deathDate: "2020-10-03" }, twins.babies[1]];
    const updated = await deliveries.update(1, record.id, { version: 1, babies: updatedBabies }, "doctor");
    assert.equal(updated.version, 2); assert.equal(updated.babies[0].deathDate, "2020-10-03");
    await assert.rejects(deliveries.update(1, record.id, { version: 1, babies: updatedBabies }, "doctor"), /changed elsewhere/);
    await assert.rejects(deliveries.update(2, record.id, { version: 2, babies: updatedBabies }, "doctor"), /not found for this patient/);
    await assert.rejects(deliveries.update(1, record.id, { version: 2, babies: [baby] }, "doctor"), /Birth date/);
    await assert.rejects(deliveries.update(1, record.id, { version: 2, babies: [{ ...baby, birthDate: "2020-09-30" }, twins.babies[1]] }, "doctor"), /Birth date/);
    assert.equal((await pool.query("SELECT jsonb_array_length(audit) AS n FROM deliveries WHERE id=$1", [record.id])).rows[0].n, 2);
    const standalone = await deliveries.create(2, { ...input, episodeId: episodes[1].id, deliveryMode: "Vaginal", postpartumReviewDate: null }, "doctor");
    assert.equal(standalone.surgeryPlanId, null);
    assert.equal((await pool.query("SELECT next_review FROM patients WHERE id=2")).rows[0].next_review, null);
    const other = await surgery.create(3, { procedureName: "Cerclage", plannedDate: input.deliveryDate, surgeonId: 1, notes: "" }, "doctor");
    await surgery.transition(3, other.id, { status: "completed", completedDate: input.deliveryDate }, "doctor");
    assert.equal((await pregnancies.list(3))[0].details.status, "current");
    assert.equal((await pool.query("SELECT type FROM patients WHERE id=3")).rows[0].type, "Pregnant");
    const cancelled = await surgery.create(4, { procedureName: "Caesarean", plannedDate: input.deliveryDate, surgeonId: 1, notes: "" }, "doctor");
    await surgery.transition(4, cancelled.id, { status: "cancelled" }, "doctor");
    assert.equal((await pregnancies.list(4))[0].details.status, "current");
    const concurrentInput = { ...input, episodeId: episodes[4].id, deliveryMode: "Vaginal" as const };
    const race = await Promise.allSettled([deliveries.create(5, concurrentInput, "doctor"), deliveries.create(5, concurrentInput, "doctor")]);
    assert.equal(race.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal((await deliveries.list(5)).length, 1);
    const separate = await deliveries.create(6, { ...input, episodeId: episodes[5].id }, "doctor");
    const separatePlan = await surgery.create(6, { procedureName: "LSCS", plannedDate: input.deliveryDate, surgeonId: 1, notes: "" }, "doctor");
    await surgery.transition(6, separatePlan.id, { status: "completed", completedDate: input.deliveryDate }, "doctor");
    assert.equal((await deliveries.list(6))[0].id, separate.id);
    assert.equal((await deliveries.list(6))[0].surgeryPlanId, separatePlan.id);
    // Fail after pregnancy/baby writes to prove surgery and delivery roll back together.
    const rollbackPlan = await surgery.create(7, { procedureName: "Caesarean", plannedDate: input.deliveryDate, surgeonId: 1, notes: "" }, "doctor");
    await pool.query("ALTER TABLE surgery_plans ADD CONSTRAINT synthetic_failure CHECK (patient_id <> 7 OR status <> 'completed')");
    await assert.rejects(surgery.transition(7, rollbackPlan.id, { status: "completed", completedDate: input.deliveryDate, delivery: { ...input, episodeId: episodes[6].id } }, "doctor"), /synthetic_failure/);
    assert.equal((await surgery.list(7))[0].status, "planned");
    assert.equal((await pregnancies.list(7))[0].details.status, "current");
    assert.deepEqual(await deliveries.list(7), []);
    assert.equal((await pool.query("SELECT type FROM patients WHERE id=7")).rows[0].type, "Pregnant");
    await assert.rejects(deliveries.create(8, { ...input, episodeId: episodes[7].id, babies: [{ ...baby, birthDate: "2019-12-31" }] }, "doctor"), /pregnancy start/);
    await assert.rejects(deliveries.list(99), /Patient not found/);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
