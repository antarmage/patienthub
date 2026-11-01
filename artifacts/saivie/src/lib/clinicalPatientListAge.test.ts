import assert from "node:assert/strict";
import test from "node:test";
import { directoryPatientAge, directoryPatientFlags } from "./clinicalPatientList";

test("directory age uses DOB and intake fallback instead of displaying a zero placeholder", () => {
  const patient = { id: 1, name: "Synthetic patient", age: 0, dob: "1996-03-25" };
  assert.equal(directoryPatientAge(patient, "2026-11-02"), 30);
  assert.equal(directoryPatientAge(patient, "2026-03-24"), 29);
  assert.equal(directoryPatientAge({ ...patient, dob: null, history: { onboarding: { age: 30 } } }, "2026-11-02"), 30);
  assert.equal(directoryPatientAge({ ...patient, dob: null }, "2026-11-02"), null);
});

test("directory shows a review notice rather than obsolete factors from a data-only assessment", () => {
  const patient = { id: 1, name: "Synthetic patient", riskScore: {
    reviewRequired: true, level: "Review required", factors: [{ factor: "Invalid/Missing Patient Age" }],
  } };
  assert.deepEqual(directoryPatientFlags(patient), ["Previous assessment needs review"]);
  assert.equal(patient.riskScore.factors[0].factor, "Invalid/Missing Patient Age");
  assert.deepEqual(directoryPatientFlags({ ...patient, riskScore: {
    level: "Critical", factors: [{ factor: "Severe hypertension" }],
  } }), ["Severe hypertension"]);
});
