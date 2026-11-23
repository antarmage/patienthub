import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { activities, checkInSchema, estimatePeriod, recommend, type CheckIn, type Feedback } from "./recommendation-engine";
import { createRecommendationTestingStore, ensureRecommendationTestingSchema, registerRecommendationTesting } from "./recommendation-testing";

const checkIn: CheckIn = {
  readiness: { energy: 4, focus: 4, mood: 3, confidence: 4, social_battery: 3, physical_capacity: 4 },
  stage: "cycle", regularity: "regular", flags: [], nowHour: 8,
  freeSlots: [{ start: 9, end: 12 }], goals: { work: 0.8 },
};

test("period estimation uses completed recorded intervals and refuses unsuitable data", () => {
  const starts = ["2026-07-12", "2026-08-09", "2026-09-06", "2026-10-04"];
  assert.deepEqual(estimatePeriod("2026-10-10", starts, checkIn), {
    status: "estimated", nextPeriodDate: "2026-11-01", daysUntil: 22,
    averageCycleLength: 28, intervalsUsed: 3,
    basis: "Mean of the last three recorded intervals; experimental, not clinically validated.",
  });
  assert.equal(estimatePeriod("2026-10-10", starts.slice(1), checkIn).status, "insufficient_data");
  assert.equal(estimatePeriod("2026-10-10", [...starts.slice(1), "2026-11-01"], checkIn).status, "insufficient_data");
  assert.equal(estimatePeriod("2026-10-10", starts, { ...checkIn, regularity: "irregular" }).status, "withheld");
  assert.equal(estimatePeriod("2026-10-10", starts, { ...checkIn, stage: "pregnancy" }).status, "withheld");
  assert.equal(estimatePeriod("2026-10-10", starts, { ...checkIn, flags: ["red_flag"] }).status, "withheld");
  assert.equal(estimatePeriod("2026-11-02", starts, checkIn).status, "stale");
  assert.equal(estimatePeriod("2026-10-10", ["2026-06-01", "2026-07-01", "2026-07-17", "2026-10-04"], checkIn).status, "withheld");
});

test("experimental recommendations are deterministic and conservative", () => {
  const result = recommend(checkIn);
  assert.equal(result.status, "experimental");
  assert.deepEqual(result, recommend(checkIn));
  assert.ok(result.cards.length > 0);
  assert.ok(result.cards.every((card) => activities.find((item) => item.id === card.activityId)?.intensity === "none"));
  assert.ok(result.cards.every((card) => card.basedOn.includes("free_slots")));
  assert.equal(recommend(null).status, "insufficient_data");
  assert.equal(recommend({ ...checkIn, freeSlots: [] }).status, "no_matches");
  assert.equal(recommend({ ...checkIn, stage: "pregnancy" }).status, "withheld");
  assert.equal(recommend({ ...checkIn, flags: ["severe_pain"] }).status, "withheld");
  assert.equal(checkInSchema.safeParse({ ...checkIn, readiness: { ...checkIn.readiness, energy: 0 } }).success, false);
  assert.equal(checkInSchema.safeParse({ ...checkIn, freeSlots: [{ start: 12, end: 9 }] }).success, false);
});

test("testing routes are gated, staff-only, patient-scoped and validate input", async () => {
  const periods = new Map<number, string[]>();
  const checkIns = new Map<string, CheckIn>();
  const feedback = new Map<string, Feedback>();
  const key = (patientId: number, date: string) => `${patientId}:${date}`;
  const store: ReturnType<typeof createRecommendationTestingStore> = {
    patientExists: async (id) => id === 1 || id === 2,
    listPeriods: async (id, asOf) => (periods.get(id) ?? []).filter((date) => date <= asOf),
    savePeriod: async (id, date) => { periods.set(id, [...(periods.get(id) ?? []), date]); },
    deletePeriod: async (id, date) => {
      const current = periods.get(id) ?? [];
      periods.set(id, current.filter((value) => value !== date));
      return current.includes(date);
    },
    getCheckIn: async (id, date) => checkIns.get(key(id, date)) ?? null,
    saveCheckIn: async (id, date, value) => { checkIns.set(key(id, date), value); },
    deleteCheckIn: async (id, date) => checkIns.delete(key(id, date)),
    listFeedback: async (id, date) => [...feedback.entries()]
      .filter(([entryKey]) => entryKey.startsWith(`${key(id, date)}:`)).map(([, value]) => value),
    saveFeedback: async (id, date, value) => {
      if (!checkIns.has(key(id, date))) return false;
      feedback.set(`${key(id, date)}:${value.activityId}`, value);
      return true;
    },
  };
  let enabled = false;
  const app = express(); app.use(express.json());
  registerRecommendationTesting(app, store, async (req) => req.headers.authorization === "patient" ? { patientId: 1 }
    : req.headers.authorization ? { userId: "test", role: String(req.headers.authorization) } : null, () => enabled);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (path: string, role?: string, method = "GET", body?: unknown) => fetch(`http://127.0.0.1:${address.port}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const base = "/api/recommendation-testing/patients/1";
  try {
    assert.equal((await request(`${base}/insights?date=2026-10-10`, "clinician")).status, 404);
    enabled = true;
    assert.equal((await request(`${base}/insights?date=2026-10-10`)).status, 401);
    assert.equal((await request(`${base}/insights?date=2026-10-10`, "patient")).status, 403);
    assert.equal((await request(`${base}/insights?date=2026-10-10`, "staff")).status, 403);
    assert.equal((await request(`${base}/insights?date=2026-02-30`, "clinician")).status, 400);
    assert.equal((await request("/api/recommendation-testing/patients/3/insights?date=2026-10-10", "clinician")).status, 404);
    assert.equal((await request(`${base}/check-ins/2026-10-10`, "clinician", "PUT", { ...checkIn, extra: true })).status, 400);
    assert.equal((await request(`${base}/feedback/2026-10-10`, "clinician", "PUT", { activityId: "WORK_001", action: "helpful" })).status, 404);
    assert.equal((await request(`${base}/check-ins/2026-10-10`, "clinician", "PUT", checkIn)).status, 200);
    for (const date of ["2026-07-12", "2026-08-09", "2026-09-06", "2026-10-04"]) {
      assert.equal((await request(`${base}/period-starts/${date}`, "clinician", "PUT", {})).status, 200);
    }
    const response = await request(`${base}/insights?date=2026-10-10`, "owner");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const result: unknown = await response.json();
    assert.ok(result && typeof result === "object" && "notForClinicalUse" in result && "forecast" in result && "recommendations" in result);
    assert.ok(result.forecast && typeof result.forecast === "object" && "nextPeriodDate" in result.forecast);
    assert.ok(result.recommendations && typeof result.recommendations === "object" && "status" in result.recommendations);
    assert.equal(result.notForClinicalUse, true);
    assert.equal(result.forecast.nextPeriodDate, "2026-11-01");
    assert.equal(result.recommendations.status, "experimental");
    assert.equal((await request(`${base}/feedback/2026-10-10`, "clinician", "PUT", { activityId: "WORK_001", action: "helpful" })).status, 200);
    assert.equal(feedback.size, 1);
    assert.deepEqual(await (await request(`${base}/feedback?date=2026-10-10`, "clinician")).json(), {
      date: "2026-10-10", feedback: [{ activityId: "WORK_001", action: "helpful" }],
    });
    const other: unknown = await (await request("/api/recommendation-testing/patients/2/insights?date=2026-10-10", "clinician")).json();
    assert.ok(other && typeof other === "object" && "checkIn" in other && "forecast" in other);
    assert.ok(other.forecast && typeof other.forecast === "object" && "status" in other.forecast);
    assert.equal(other.checkIn, null);
    assert.equal(other.forecast.status, "withheld");
    assert.equal((await request(`${base}/check-ins/2026-10-10`, "clinician", "DELETE")).status, 204);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test("testing storage persists and isolates records, with feedback cascading on deletion",
  { skip: !process.env.TEST_RECOMMENDATION_DATABASE_URL }, async () => {
    const schema = `recommendation_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new pg.Pool({ connectionString: process.env.TEST_RECOMMENDATION_DATABASE_URL });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({ connectionString: process.env.TEST_RECOMMENDATION_DATABASE_URL, options: `-c search_path=${schema}` });
    try {
      await pool.query("CREATE TABLE patients (id integer PRIMARY KEY); INSERT INTO patients(id) VALUES (1),(2)");
      await ensureRecommendationTestingSchema(pool); await ensureRecommendationTestingSchema(pool);
      const store = createRecommendationTestingStore(pool);
      await store.saveCheckIn(1, "2026-10-10", checkIn, "doctor");
      await store.savePeriod(1, "2026-10-04", "doctor");
      assert.deepEqual(await store.getCheckIn(1, "2026-10-10"), checkIn);
      assert.equal(await store.getCheckIn(2, "2026-10-10"), null);
      assert.deepEqual(await store.listPeriods(2, "2026-10-10"), []);
      assert.equal(await store.saveFeedback(1, "2026-10-10", { activityId: "WORK_001", action: "helpful" }, "doctor"), true);
      assert.equal(await store.saveFeedback(2, "2026-10-10", { activityId: "WORK_001", action: "helpful" }, "doctor"), false);
      assert.deepEqual(await store.listFeedback(1, "2026-10-10"), [{ activityId: "WORK_001", action: "helpful" }]);
      assert.deepEqual(await store.listFeedback(2, "2026-10-10"), []);
      assert.equal(await store.deleteCheckIn(1, "2026-10-10"), true);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM recommendation_test_feedback")).rows[0].count, 0);
    } finally { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); }
  });
