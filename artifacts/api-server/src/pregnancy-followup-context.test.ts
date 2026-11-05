import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import pg from "pg";
import { createPregnancyFollowUpStore, pregnancyVisitContext, registerPregnancyFollowUpContext } from "./pregnancy-followup-context";
import { pregnancyFollowUpSchema, pregnancyVisitContextSchema, type PregnancyFollowUp } from "../../../lib/db/src/pregnancy-followup";
import type { PregnancyEpisode } from "../../../lib/db/src/pregnancy-episodes";
import { readSavedIntake } from "../../../lib/db/src/saved-intake";
import { savedIntakeVersion } from "./saved-intake";

const patient = { id: 1, type: "Pregnancy", pregnancyStatus: "pregnant", lmp: "2026-04-01", history: {} };
const appointment = { id: 20, patientId: 1, date: "2026-06-10", time: "11:00", type: "Pregnancy", status: "Scheduled", vitals: { weight: 59, bp: "118/78" } };
const earlier = { ...appointment, id: 10, date: "2026-05-10", status: "Scheduled", vitals: { weight: 58, bp: "120/80" } };
const answers: PregnancyFollowUp = {
  visitReason: "Routine check-up", concern: "", foodHabits: "Small meals",
  vomitingChange: "Increased", eatingDrinking: "Able to eat and drink", investigations: "Some completed",
  reports: "Available to show the doctor", investigationDetails: "Blood tests done, scan pending", changes: "",
};
const episode: PregnancyEpisode = { id: 3, patientId: 1, version: 1, updatedAt: "2026-04-01",
  details: { number: 2, status: "current", lmp: "2026-04-01", startDate: null, endDate: null, dueDate: "2027-01-06",
    datingBasis: "LMP", outcome: "Not recorded", deliveryMode: "Not recorded", conceptionMethod: "", notes: "" },
  records: [{ kind: "appointment", id: 20 }, { kind: "appointment", id: 10 }] };
const context = (appts: Record<string, unknown>[] = [earlier, appointment], episodes: PregnancyEpisode[] = [episode]) =>
  pregnancyVisitContext(patient, appointment, appts, [], [], episodes);

test("repeat pregnancy survey uses any earlier appointment, not just completed consultations", () => {
  assert.equal(context().repeat, true);
  assert.equal(context().previousAppointmentCount, 1);
  assert.equal(context([appointment]).repeat, false);
  assert.equal(context([{ ...earlier, type: "Consultation" }, appointment]).repeat, true);
  for (const status of ["Cancelled", "canceled", "No-show", "no_show"]) {
    assert.equal(context([{ ...earlier, status }, appointment]).repeat, false, status);
  }
});

test("same-day ordering never counts later appointments or ID order as an earlier visit", () => {
  assert.equal(context([{ ...earlier, date: appointment.date, time: "10:00" }, appointment]).repeat, true);
  for (const time of ["11:00", "12:00", ""]) {
    assert.equal(context([{ ...earlier, date: appointment.date, time }, appointment]).repeat, false);
  }
  assert.equal(context([{ ...earlier, date: appointment.date, time: "12:00", vitals: { weight: 90, bp: "150/100" } }, appointment]).trends.weight.length, 1);
});

test("saved current pregnancy establishes follow-up despite missing or stale pre-build intake flags", () => {
  const selected = { ...appointment, type: "Consultation" };
  const unlinked = { ...episode, records: [] };
  for (const history of [{}, { onboarding: { pregnancies: { currentStatus: "No" } } }]) {
    const result = pregnancyVisitContext({ id: 1, history }, selected, [earlier, selected], [], [], [unlinked]);
    assert.equal(result.pregnancy, true);
    assert.equal(result.repeat, true);
    assert.equal(result.previousAppointmentCount, 1);
    assert.equal(result.episodeId, episode.id);
    assert.equal(pregnancyVisitContext({ id: 1, history }, earlier, [earlier, selected], [], [], [unlinked]).repeat, false);
  }
  assert.equal(pregnancyVisitContext({ id: 1, pregnancyStatus: "completed" }, selected, [earlier, selected], [], [], [unlinked]).repeat, false);
});

test("non-pregnant patients and ended pregnancies do not gain pregnancy context from old dating", () => {
  const selected = { ...appointment, type: "Consultation" };
  for (const nonPregnant of [
    { id: 1, type: "Gynae", lmp: patient.lmp, history: {} },
    { ...patient, type: "Gynae", pregnancyStatus: "", history: { onboarding: { pregnancies: { currentStatus: "No" } } } },
    { ...patient, pregnancyStatus: "completed", history: { onboarding: {
      pregnancies: { currentStatus: "Yes" }, cycle: { lastPeriod: patient.lmp },
    } } },
  ]) {
    const result = pregnancyVisitContext(nonPregnant, selected, [earlier, selected], [], [], []);
    assert.equal(result.pregnancy, false);
    assert.equal(result.repeat, false);
  }
});

test("MTP and termination visits suppress journey messaging without changing pregnancy context", () => {
  for (const purpose of [
    { type: "MTP" }, { visitType: "Medical termination of pregnancy" },
    { reason: "MTP consultation" }, { chiefComplaint: "Abortion care" },
  ]) {
    const result = pregnancyVisitContext(patient, { ...appointment, ...purpose }, [earlier, appointment], [], [], [episode]);
    assert.equal(result.journeySuppressed, true);
    assert.equal(result.pregnancy, true);
    assert.equal(result.repeat, true);
    assert.equal(result.weightReference?.lmp, episode.details.lmp);
  }
  const linkedVisit = { id: 2, patientId: 1, appointmentId: appointment.id, date: appointment.date, visitType: "MTP" };
  assert.equal(pregnancyVisitContext(patient, appointment, [appointment], [linkedVisit], [], [episode]).journeySuppressed, true);
  for (const unrelated of [{ ...linkedVisit, patientId: 2 }, { ...linkedVisit, appointmentId: earlier.id }]) {
    assert.equal(pregnancyVisitContext(patient, appointment, [appointment], [unrelated], [], [episode]).journeySuppressed, false);
  }
  const parsed = pregnancyVisitContextSchema.parse(context());
  assert.equal(parsed.journeySuppressed, false);
});

test("legacy reception LMP supports repeat surveys without rewriting clinical dates or requiring a new intake", () => {
  const legacyPatient = { ...patient, lmp: null };
  const reported = { ...earlier, patientReportedLmp: { value: patient.lmp, source: "patient-reported" } };
  const result = pregnancyVisitContext(legacyPatient, appointment, [reported, appointment], [], [], []);
  assert.equal(result.repeat, true);
  assert.equal(result.previousAppointmentCount, 1);
  assert.equal(result.weightReference?.lmp, patient.lmp);
  assert.match(result.weightReference?.datingSource || "", /appointments\/consultations/);
  assert.equal(legacyPatient.lmp, null);
  for (const row of [
    { ...reported, patientId: 2 },
    { ...reported, status: "Cancelled" },
    { ...reported, date: "2026-07-01" },
    { ...reported, date: appointment.date, time: "12:00" },
    { ...reported, date: appointment.date, time: "" },
    { ...reported, patientReportedLmp: { value: "invalid" } },
  ]) assert.equal(pregnancyVisitContext(legacyPatient, appointment, [row, appointment], [], [], []).repeat, false);
  const conflicting = { ...appointment, patientReportedLmp: { value: "2026-03-01" } };
  assert.equal(pregnancyVisitContext(legacyPatient, conflicting, [reported, conflicting], [], [], []).repeat, false);
});

test("first or ambiguous pregnancy keeps full intake; established patient-reported dating supports follow-ups", () => {
  assert.equal(context([earlier, appointment], []).repeat, true);
  assert.equal(pregnancyVisitContext({ ...patient, lmp: null }, appointment, [earlier, appointment], [], [], []).repeat, false);
  const reported = { id: 1, history: { onboarding: { pregnancies: { currentStatus: "Yes" }, cycle: { lastPeriod: patient.lmp } } } };
  assert.equal(pregnancyVisitContext(reported, appointment, [earlier, appointment], [], [], []).repeat, true);
  assert.equal(pregnancyVisitContext({ ...patient, pregnancyStatus: "completed" }, appointment, [earlier, appointment], [], [], []).pregnancy, false);
  assert.equal(context([{ ...earlier, date: "2025-05-10" }, appointment]).repeat, false);
  assert.equal(context([{ ...earlier, patientId: 2 }, appointment]).repeat, false);
});

test("explicit prior pregnancy ownership and conflicting LMP prevent cross-pregnancy reuse", () => {
  const past: PregnancyEpisode = { ...episode, id: 2, details: { ...episode.details, number: 1, status: "past", lmp: "2025-01-01", endDate: "2025-10-01" },
    records: [{ kind: "appointment", id: 10 }] };
  const current = { ...episode, records: [{ kind: "appointment" as const, id: 20 }] };
  assert.equal(context([earlier, appointment], [current, past]).repeat, false);
  assert.equal(context([{ ...earlier, vitals: { weight: 58, bp: "120/80", lmp: "2025-01-01" } }, appointment], [current]).repeat, false);
  const historicalAppointment = { ...appointment, date: "2025-06-10" };
  const historicalEarlier = { ...earlier, id: 9, date: "2025-05-01" };
  const historical = { ...past, records: [{ kind: "appointment" as const, id: 20 }, { kind: "appointment" as const, id: 9 }] };
  const result = pregnancyVisitContext({ ...patient, pregnancyStatus: "completed" }, historicalAppointment, [historicalEarlier, historicalAppointment], [], [], [historical]);
  assert.equal(result.repeat, true);
  assert.equal(result.episodeId, 2);
});

test("inferred episodes exclude ambiguous overlaps and conflicting linked-visit dating", () => {
  const unlinked = { ...episode, records: [] };
  const other: PregnancyEpisode = { ...episode, id: 2, records: [], details: { ...episode.details, number: 1, status: "past", endDate: "2026-07-01" } };
  assert.equal(context([earlier, appointment], [unlinked, other]).pregnancy, false);
  const visits = [{ id: 1, patientId: 1, appointmentId: 10, date: earlier.date, vitals: { weight: 99, lmp: "2025-01-01" } }];
  const result = pregnancyVisitContext(patient, appointment, [earlier, appointment], visits, [], [unlinked]);
  assert.equal(result.repeat, false);
  assert.deepEqual(result.trends.weight.map((point) => point.value), [59]);
});

test("scoped trends include dated readings, not later, foreign, invalid or other-pregnancy records", () => {
  const visits = [
    { id: 1, patientId: 1, appointmentId: 10, date: earlier.date, vitals: { weight: 58, antenatal: { hb: "10.8", hbDate: "2026-05-03" } } },
    { id: 2, patientId: 1, appointmentId: 20, date: appointment.date, vitals: { hb: 12, hbDate: "2026-07-01" } },
    { id: 3, patientId: 2, appointmentId: 20, date: appointment.date, vitals: { weight: 100 } },
  ];
  const labs = [
    { id: 1, patientId: 1, date: "2026-05-01", testName: "FBS", value: 92, unit: "mg/dL" },
    { id: 2, patientId: 1, date: "2026-05-02", testName: "FBS", value: 5.1, unit: "mmol/L" },
    { id: 3, patientId: 1, date: "2026-05-03", testName: "PPBS", value: 130, unit: "mg/dL" },
    { id: 4, patientId: 1, date: "2026-05-04", testName: "HbA1c", value: 5.7, unit: "%" },
    { id: 5, patientId: 1, date: "2026-07-01", testName: "FBS", value: 100, unit: "mg/dL" },
    { id: 6, patientId: 2, date: "2026-05-01", testName: "Hb", value: 9, unit: "g/dL" },
    { id: 7, patientId: 1, date: "2026-01-01", testName: "Hb", value: 9, unit: "g/dL" },
    { id: 8, patientId: 1, date: "2026-05-01", testName: "Hb", value: null, unit: "g/dL" },
  ];
  const result = pregnancyVisitContext(patient, appointment, [earlier, appointment], visits, labs, [episode], [],
    [{ patientId: 1, date: "2026-05-20", weight: 130, unit: "lbs" }]);
  assert.deepEqual(result.trends.weight.map((point) => point.value), [58, 58.97, 59]);
  assert.deepEqual(result.trends.hb.map((point) => [point.date, point.value]), [["2026-05-03", 10.8]]);
  assert.equal(result.trends.sugar.length, 4);
  assert.ok(pregnancyVisitContextSchema.safeParse(result).success);
  const serialized = JSON.stringify(result);
  for (const field of ["history", "prescriptions", "diagnosis", "phone", "subjective"]) assert.ok(!serialized.includes(`"${field}"`));
});

test("follow-up validation requires explicit choices and concern details without inventing normal answers", () => {
  assert.ok(pregnancyFollowUpSchema.safeParse(answers).success);
  for (const patch of [{ vomitingChange: "" }, { investigations: "" }, { visitReason: "Current concern" },
    { foodHabits: "x".repeat(2001) }, { episodeId: 99 }]) {
    assert.equal(pregnancyFollowUpSchema.safeParse({ ...answers, ...patch }).success, false);
  }
  assert.ok(pregnancyFollowUpSchema.safeParse({ ...answers, visitReason: "Current concern", concern: "Nausea" }).success);
});

test("print context supplies only selected episode's confirmed weight inputs and never profile or visit weight", () => {
  const selected = { ...episode, details: { ...episode.details, maternalHeightCm: 160, prePregnancyWeightKg: 55, fetusCount: 1 } };
  const result = pregnancyVisitContext({ ...patient, weight: 99, height: 190 }, appointment, [earlier, appointment], [], [], [selected]);
  assert.deepEqual(result.weightReference, {
    lmp: "2026-04-01", dueDate: "2027-01-06", endDate: null, datingBasis: "LMP",
    maternalHeightCm: 160, prePregnancyWeightKg: 55, fetusCount: 1,
  });
  assert.ok(pregnancyVisitContextSchema.safeParse(result).success);
  assert.equal(context().weightReference?.prePregnancyWeightKg, null);
  assert.equal(context([earlier, appointment], []).weightReference?.lmp, patient.lmp);
  const past = { ...selected, id: 2, details: { ...selected.details, status: "past" as const, lmp: "2025-01-01", prePregnancyWeightKg: 50 } };
  const unlinked = { ...selected, records: [] };
  const historical = pregnancyVisitContext(patient, { ...appointment, date: "2025-06-10" }, [], [], [], [unlinked, past]);
  assert.equal(historical.weightReference?.prePregnancyWeightKg, 50);
  assert.equal(historical.weightReference?.lmp, "2025-01-01");
});

test("print dating uses recorded patient LMP without episodes and linked visit LMP when episode dating is missing", () => {
  const legacy = context([earlier, appointment], []);
  assert.equal(legacy.weightReference?.datingBasis, "LMP");
  assert.equal(legacy.weightReference?.lmp, patient.lmp);
  assert.match(legacy.weightReference?.datingSource || "", /patient\/intake LMP/);
  assert.equal(legacy.weightReference?.prePregnancyWeightKg, null);
  assert.ok(pregnancyVisitContextSchema.safeParse(legacy).success);
  const undated: PregnancyEpisode = { ...episode, details: { ...episode.details, lmp: null, dueDate: null, datingBasis: "Not recorded" } };
  const result = pregnancyVisitContext(patient, appointment, [earlier, appointment],
    [{ id: 1, patientId: 1, appointmentId: 10, date: earlier.date, vitals: { lmp: patient.lmp } }], [], [undated]);
  assert.equal(result.weightReference?.lmp, patient.lmp);
  assert.equal(result.weightReference?.datingBasis, "LMP");
  const conflict = pregnancyVisitContext(patient, appointment,
    [{ ...earlier, vitals: { lmp: "2026-03-01" } }, { ...appointment, vitals: { lmp: "2026-04-01" } }], [], [], [undated]);
  assert.equal(conflict.weightReference?.datingBasis, "Not recorded");
  const unknown = pregnancyVisitContext(patient, appointment, [earlier, appointment], [], [], [undated]);
  assert.equal(unknown.weightReference?.datingBasis, "Not recorded");
  const ultrasound = context([earlier, appointment], [{ ...episode, details: { ...episode.details, datingBasis: "Ultrasound" } }]);
  assert.equal(ultrasound.weightReference?.datingBasis, "Ultrasound");
});

test("print reference reuses scoped recorded cm height, preserves episode priority and never assumes baby count", () => {
  const measured = { ...earlier, vitals: { height: "160", weight: 60.1 } };
  const result = pregnancyVisitContext(patient, appointment, [measured, appointment], [], [], [episode]);
  assert.equal(result.weightReference?.maternalHeightCm, 160);
  assert.match(result.weightReference?.heightSource || "", /2026-05-10/);
  assert.equal(result.weightReference?.fetusCount, null);
  assert.ok(pregnancyVisitContextSchema.safeParse(result).success);
  const confirmed = pregnancyVisitContext(patient, appointment, [measured, appointment], [], [],
    [{ ...episode, details: { ...episode.details, maternalHeightCm: 155, fetusCount: 1 } }]);
  assert.equal(confirmed.weightReference?.maternalHeightCm, 155);
  assert.equal(confirmed.weightReference?.heightSource, undefined);
  for (const height of ["1.6 m", "5 ft", 0, "NaN", 251]) {
    const invalid = pregnancyVisitContext(patient, appointment, [{ ...measured, vitals: { height } }, appointment], [], [], [episode]);
    assert.equal(invalid.weightReference?.maternalHeightCm, null);
  }
  const foreign = pregnancyVisitContext(patient, appointment, [{ ...measured, patientId: 2 }, appointment], [], [], [episode]);
  assert.equal(foreign.weightReference?.maternalHeightCm, null);
  const later = pregnancyVisitContext(patient, appointment, [{ ...measured, date: "2026-07-01" }, appointment], [], [], [episode]);
  assert.equal(later.weightReference?.maternalHeightCm, null);
});

test("print context API enforces role, permission and patient/appointment ownership", async () => {
  let visible = false, calls = 0;
  const app = express();
  registerPregnancyFollowUpContext(app, {
    authenticate: async (req) => req.headers.authorization === "patient" ? { patientId: 1 } :
      req.headers.authorization ? { userId: "test", role: String(req.headers.authorization) } : null,
    clinicalVisible: async () => visible,
    patient: async (id) => id === 1 ? patient : undefined,
    appointment: async (id) => id === 20 ? appointment : undefined,
    store: { context: async () => { calls++; return context(); } },
  });
  const server = createServer(app); await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/patients/1/pregnancy-follow-up/20`;
  try {
    assert.equal((await fetch(url)).status, 401);
    for (const role of ["patient", "admin", "staff", "receptionist"]) assert.equal((await fetch(url, { headers: { Authorization: role } })).status, 403);
    assert.equal(calls, 0);
    visible = true;
    for (const role of ["staff", "receptionist", "clinician", "owner"]) {
      const response = await fetch(url, { headers: { Authorization: role } });
      assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
    assert.equal((await fetch(url.replace("patients/1", "patients/2"), { headers: { Authorization: "clinician" } })).status, 404);
    assert.equal((await fetch(url.replace("/20", "/invalid"), { headers: { Authorization: "clinician" } })).status, 400);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test("PostgreSQL follow-ups preserve baseline and other visits and roll back appointment mismatches", {
  skip: !process.env.TEST_PREGNANCY_DATABASE_URL,
}, async () => {
  const schema = `followup_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: process.env.TEST_PREGNANCY_DATABASE_URL });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: process.env.TEST_PREGNANCY_DATABASE_URL, options: `-c search_path=${schema}` });
  try {
    await pool.query(`CREATE TABLE patients(id integer PRIMARY KEY, history jsonb);
      CREATE TABLE appointments(id integer PRIMARY KEY,patient_id integer,chief_complaint text,
        date text,time text,type text,visit_type text,status text,vitals jsonb,patient_reported_lmp jsonb);
      CREATE TABLE visit_history(id integer,patient_id integer,appointment_id integer,date text,visit_type text,vitals jsonb,prescriptions jsonb);
      CREATE TABLE lab_results(id integer,patient_id integer,test_name text,date text,value real,unit text);
      CREATE TABLE bp_logs(patient_id integer,date text,systolic integer,diastolic integer);
      CREATE TABLE weight_logs(patient_id integer,date text,weight real,unit text);
      CREATE TABLE pregnancy_episodes(id integer,patient_id integer,details jsonb,version integer,updated_at text);
      CREATE TABLE pregnancy_episode_records(id integer,episode_id integer,patient_id integer,appointment_id integer,visit_id integer,lab_result_id integer);`);
    const baseline = { onboarding: { name: "Synthetic", pregnancies: { currentStatus: "Yes", total: "2" } },
      medical: ["Existing condition"], allergies: ["Existing allergy"], onboardingAppointmentId: 10 };
    await pool.query("INSERT INTO patients VALUES(1,$1)", [baseline]);
    await pool.query(`INSERT INTO appointments(id,patient_id,date,time,type,status,vitals) VALUES
      (10,1,'2026-05-10','10:00','Pregnancy','Scheduled','{"weight":58}'),
      (20,1,'2026-06-10','11:00','Pregnancy','Scheduled','{"weight":59}')`);
    const store = createPregnancyFollowUpStore(pool);
    const result = await store.context({ ...patient, history: baseline }, appointment);
    assert.equal(result.repeat, true);
    assert.deepEqual(result.trends.weight.map((point) => point.value), [58, 59]);
    assert.deepEqual(await store.surveyStatuses([10, 20]), [{ id: 10, completed: true }, { id: 20, completed: false }]);
    await store.save(1, 20, answers, result);
    await store.save(1, 10, { ...answers, foodHabits: "Earlier answers" }, result);
    const saved = (await pool.query("SELECT history FROM patients WHERE id=1")).rows[0].history;
    for (const key of Object.keys(baseline)) assert.deepEqual(saved[key], baseline[key as keyof typeof baseline]);
    assert.deepEqual(saved.pregnancyFollowUps["20"].answers, answers);
    assert.equal(saved.pregnancyFollowUps["10"].answers.foodHabits, "Earlier answers");
    assert.equal(saved.pregnancyFollowUps["20"].asOf, appointment.date);
    const completed = (await pool.query("SELECT chief_complaint FROM appointments WHERE id=20")).rows[0];
    assert.equal((await store.surveyStatuses([20]))[0].completed, true);
    assert.match(completed.chief_complaint, /Vomiting since the last visit: Increased/);
    await assert.rejects(() => store.save(1, 999, answers, result), /patient changed/);
    assert.deepEqual((await pool.query("SELECT history FROM patients WHERE id=1")).rows[0].history, saved);
    const intake = readSavedIntake(saved);
    assert.ok(intake);
    const version = savedIntakeVersion(intake);
    const corrected = { ...intake, health: { ...intake.health, allergies: "Latex" } };
    await assert.rejects(() => store.correctIntake(1, 999, corrected, version), /patient changed/);
    assert.deepEqual((await pool.query("SELECT history FROM patients WHERE id=1")).rows[0].history, saved);
    await store.correctIntake(1, 20, corrected, version);
    const revised = (await pool.query("SELECT history FROM patients WHERE id=1")).rows[0].history;
    assert.equal(revised.onboarding.health.allergies, "Latex");
    assert.equal(revised.onboardingAppointmentId, 10);
    assert.deepEqual(revised.onboardingCorrections[0].previous, baseline.onboarding);
    assert.deepEqual(revised.pregnancyFollowUps, saved.pregnancyFollowUps);
    await assert.rejects(() => store.correctIntake(1, 20, corrected, version), /saved survey has changed/);
    assert.deepEqual((await pool.query("SELECT history FROM patients WHERE id=1")).rows[0].history, revised);
  } finally {
    await pool.end(); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.end();
  }
});
