import assert from "node:assert/strict";
import { it } from "node:test";
import { summaryTrends } from "./patientSummary.ts";

it("merges visit and home readings chronologically without duplicating identical readings", () => {
  const result = summaryTrends([
    { id: 1, date: "2026-10-02", vitals: { bp: "120/80", weight: "56", hb: "11.2", pulse: 78, fetalHeartRate: "140", fundalHeight: "24" } },
    { id: 2, date: "2026-10-01", vitals: { bp: "125/82", weight: "55" } },
  ], [{ date: "2026-10-02", systolic: 120, diastolic: 80 }], [{ date: "2026-10-03", weight: 125, unit: "lbs" }], []);
  assert.equal(result.bp.length, 2);
  assert.equal(result.bp[0].date, "2026-10-01");
  assert.equal(result.weight.at(-1)?.value, 56.7);
  assert.equal(result.hb[0].value, 11.2);
  assert.equal(result.pulse[0].value, 78);
  assert.equal(result.fetalHeart[0].value, 140);
  assert.equal(result.fundalHeight[0].value, 24);
});

it("keeps glucose test types and units separate; never charts HbA1c against glucose", () => {
  const result = summaryTrends([], [], [], [
    { date: "2026-10-01", testName: "Fasting glucose", value: 92, unit: "mg/dL" },
    { date: "2026-10-02", testName: "Fasting glucose", value: 5.1, unit: "mmol/L" },
    { date: "2026-10-03", testName: "PPBS", value: 120, unit: "mg/dL" },
    { date: "2026-10-04", testName: "HbA1c", value: 5.6, unit: "%" },
    { date: "2026-10-05", testName: "Fasting glucose", value: 95, unit: "mg/dL" },
    { date: "2026-10-05", testName: "Hemoglobin", value: 11.4, unit: "g/dL" },
    { date: "2026-10-05", testName: "TSH", value: 2, unit: "mIU/L" },
  ]);
  assert.equal(result.sugar.length, 4);
  assert.equal(result.sugar[0].points.length, 2);
  assert.equal(result.hb[0].value, 11.4);
});

it("rejects missing, invalid, qualitative and ambiguous measurements rather than inventing results", () => {
  const result = summaryTrends([
    { id: 1, date: "invalid", vitals: { weight: 60 } },
    { id: 2, date: "2026-02-30", vitals: { weight: 60 } },
    { id: 3, date: "2026-10-01", vitals: { weight: "", bp: "not recorded", hb: null } },
  ], [], [{ date: "2026-10-01", weight: 70, unit: "unknown" }], [
    { date: "invalid", testName: "Glucose", value: 99 },
    { date: "2026-10-01", testName: "Glucose", value: null },
  ]);
  assert.deepEqual(result.bp, []);
  assert.deepEqual(result.weight, []);
  assert.deepEqual(result.hb, []);
  assert.deepEqual(result.sugar, []);
});
