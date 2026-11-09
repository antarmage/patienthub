import assert from "node:assert/strict";
import { it } from "node:test";
import { clinicalVitalTrends, summaryTrends } from "./patientSummary.ts";

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

it("includes reception check-in before a consultation exists and merges linked records without duplicate readings", () => {
  const appointments = [
    { id: 10, date: "2026-11-08", vitals: { bp: "110/70", weight: 60, pulse: 76 } },
    { id: 20, date: "2026-11-09", vitals: { bp: "118/76", weight: 61, pulse: 82 } },
  ];
  const bpLogs = [{ date: "2026-11-08", systolic: 110, diastolic: 70 }];
  const before = clinicalVitalTrends([], appointments, bpLogs, [], []);
  assert.deepEqual(before.bp.map((point) => [point.date, point.value, point.secondary]), [
    ["2026-11-08", 110, 70], ["2026-11-09", 118, 76],
  ]);
  assert.equal(before.bp.at(-1)?.source, "Check-in");
  assert.equal(before.weight.at(-1)?.value, 61);
  assert.equal(before.pulse.at(-1)?.value, 82);

  const after = clinicalVitalTrends([{ id: 1, appointmentId: 20, date: "2026-11-09", vitals: { bp: "118/76" } }], appointments, bpLogs, [], []);
  assert.equal(after.bp.length, 2);
  assert.equal(after.weight.length, 2);
  assert.equal(after.pulse.length, 2);
  assert.equal(after.weight.at(-1)?.value, 61);
  assert.equal(after.bp.at(-1)?.source, "Visit");
});

it("keeps different same-day check-in measurements and uses clinician revisions for linked appointments", () => {
  const appointments = [
    { id: 10, date: "2026-11-09", vitals: { bp: "110/70", weight: 60 } },
    { id: 20, date: "2026-11-09", vitals: { bp: "118/76", weight: 61 } },
  ];
  const separate = clinicalVitalTrends([], appointments, [], [], []);
  assert.equal(separate.bp.length, 2);
  assert.equal(separate.weight.length, 2);
  const revised = clinicalVitalTrends([{ id: 1, appointmentId: 20, date: "2026-11-09", vitals: { bp: "122/80" } }], appointments, [], [], []);
  assert.deepEqual(revised.bp.map((point) => point.value).sort(), [110, 122]);
  assert.equal(revised.weight.length, 2);
});

it("orders same-day readings by actual check-in time rather than appointment ID or reversed trail order", () => {
  const result = clinicalVitalTrends([], [
    { id: 9, date: "2026-11-09", vitals: { bp: "118/76", weight: 61, recordedAt: "2026-11-09T09:00:00Z" } },
    { id: 42, date: "2026-11-09", vitals: { bp: "110/70", weight: 60, recordedAt: "2026-11-09T08:00:00Z" } },
  ], [], [], []);
  assert.deepEqual(result.bp.map((point) => point.value), [110, 118]);
  assert.deepEqual(result.weight.map((point) => point.value), [60, 61]);
});
