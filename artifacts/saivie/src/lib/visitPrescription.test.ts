import assert from "node:assert/strict";
import test from "node:test";
import { visitPrescription } from "./visitPrescription";

test("prescription uses only selected visit medicines, findings, date, follow-up and temperature", () => {
  const data = visitPrescription({ name: "Synthetic", age: 29, type: "Pregnant", lmp: "2026-01-01", nextReview: "2027-01-01" }, {
    date: "2026-07-16", vitals: { temp: "98.6", followUpDate: "2026-07-30" },
    objective: "PV station: -3", prescriptions: { medicines: [{ name: "Recorded", dose: "5 mg", frequency: "Daily", duration: "7 days" }] },
    labsOrdered: ["USG"], planNotes: "Follow advice",
  }, { name: "Doctor", qualification: "MBBS", additionalQualifications: "DNB", regNumber: "123", regCouncil: "Council" });
  assert.equal(data.date, "2026-07-16");
  assert.equal(data.vitals.temperature, "98.6");
  assert.equal(data.nextFollowUp, "2026-07-30");
  assert.equal(data.medications[0].duration, "7 days");
  assert.equal(data.clinicalFindings, "PV station: -3");
  assert.ok(data.pregnancyInfo.includes("28w"));
  assert.equal(data.providerQualification, "MBBS | DNB");
  assert.equal(data.providerRegistration, "123 / Council");
});

test("missing visit medicines and follow-up are not filled from unrelated patient records", () => {
  const data = visitPrescription({ name: "Synthetic", nextReview: "2027-01-01", medications: [{ name: "Unrelated" }] }, { date: "2026-01-01" }, { name: "Doctor" });
  assert.deepEqual(data.medications, []);
  assert.equal(data.nextFollowUp, "");
  assert.equal(data.clinicalFindings, "");
});

test("prints the saved visit's guided history without carrying another visit's survey", () => {
  const visit = { examination: { consultationHistory: {
    paths: ["Pregnancy-related concern"], directions: ["Maternal symptoms"],
    answers: { "Any pain, bleeding, fluid loss, or fever?": "None", "When did symptoms begin?": "Today" },
  } } };
  const patient = { name: "Synthetic", history: { onboarding: { consultation: { answers: { "When did symptoms begin?": "Last month" } } } } };
  const data = visitPrescription(patient, visit, { name: "Doctor" });
  assert.equal(data.history, "Any pain, bleeding, fluid loss, or fever? None\nWhen did symptoms begin? Today");
  assert.equal(visitPrescription(patient, {}, { name: "Doctor" }).history, "");
});
