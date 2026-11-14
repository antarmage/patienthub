import assert from "node:assert/strict";
import test from "node:test";
import { emptyVitals, validateVitalsLmp, validateVitalsStep, vitalsEntryPayload, vitalsSteps } from "./vitalsEntry";

test("LMP step accepts unknown and real past dates but rejects impossible and future dates", () => {
  for (const value of ["", "2026-09-04", "2026-11-14"]) assert.equal(validateVitalsLmp(value, "2026-11-14"), null);
  for (const value of ["2026-02-30", "2026-11-15", "0000-01-01", "04/09/2026"]) assert.ok(validateVitalsLmp(value, "2026-11-14"));
});

test("guided entry orders required weight/height/BP before optional measurements", () => {
  assert.deepEqual(vitalsSteps.map((step) => step.fields), [["weight"], ["height"], ["systolic", "diastolic"], ["pulse"], ["temp"], ["spo2"]]);
  assert.deepEqual(vitalsSteps.map((step) => step.optional), [false, false, false, true, true, true]);
  for (let step = 0; step < 3; step++) assert.ok(validateVitalsStep(emptyVitals, step));
  for (let step = 3; step < 6; step++) assert.equal(validateVitalsStep(emptyVitals, step), null);
});

test("required entry validates both BP numbers and marks optional blanks unmeasured with BMI calculated", () => {
  const complete = { ...emptyVitals, weight: "62.8", height: "152", systolic: "120", diastolic: "75" };
  assert.deepEqual(vitalsEntryPayload(complete), { weight: 62.8, height: 152, bp: "120/75", bmi: 27.2, pulse: null, temp: null, spo2: null });
  for (const field of ["weight", "height", "systolic", "diastolic"] as const) assert.throws(() => vitalsEntryPayload({ ...complete, [field]: "" }));
  assert.ok(validateVitalsStep({ ...complete, systolic: "70", diastolic: "80" }, 2));
  assert.ok(validateVitalsStep({ ...complete, systolic: "120.5" }, 2));
  for (const [field, step, value] of [["weight", 0, "501"], ["height", 1, "29"], ["pulse", 3, "251"], ["temp", 4, "37"], ["spo2", 5, "101"]] as const) {
    assert.ok(validateVitalsStep({ ...complete, [field]: value }, step));
  }
  assert.equal(vitalsEntryPayload({ ...complete, pulse: "80", temp: "98.6", spo2: "99" }).temp, 98.6);
});
