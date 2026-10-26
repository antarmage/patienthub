import assert from "node:assert/strict";
import test from "node:test";
import { conceptionHistory } from "./conceptionHistory";
import { getOnboardingQuestions, getRelevantIntake, initialForm } from "./onboardingFlow";

const history = {
  onboardingAppointmentId: 81,
  onboarding: { cycle: { lastPeriod: "2026-05-01" }, pregnancies: {
    currentStatus: "Yes", conceptionMethod: "IVF / ICSI", conceptionDetails: "Patient reports embryo transfer",
  } },
};
test("prefills explicit patient-reported conception for the appointment and same-pregnancy follow-up", () => {
  assert.equal(conceptionHistory(history, "2026-05-01", 81).method, "IVF / ICSI");
  assert.equal(conceptionHistory(history, "2026-05-01", 82).source, "Patient-reported");
  assert.equal(conceptionHistory(history, undefined, 81).method, "IVF / ICSI");
});
test("never infers conception from treatment mode or unrelated history", () => {
  assert.equal(conceptionHistory({ mode: "ivf", medical: ["IVF"], ...history }, "2026-09-01", 82).method, "");
  assert.equal(conceptionHistory({ mode: "ivf" }, undefined, 81).method, "");
  assert.equal(conceptionHistory(history, undefined, 82).method, "");
  assert.equal(conceptionHistory(null, undefined).method, "");
});
test("doctor entry wins for the same pregnancy, including explicit unknown and clearing", () => {
  const conception = { source: "Clinician", conceptionMethod: "IUI", conceptionDetails: "Reviewed", lmp: "2026-05-01", appointmentId: 81 };
  assert.equal(conceptionHistory({ ...history, conception }, "2026-05-01", 82).method, "IUI");
  assert.equal(conceptionHistory({ ...history, conception }, "2026-05-01", 82).source, "Clinician");
  assert.equal(conceptionHistory({ ...history, conception: { ...conception, conceptionMethod: "Not known / not recorded" } }, "2026-05-01", 82).method, "Not known / not recorded");
  assert.equal(conceptionHistory({ ...history, conception: { ...conception, conceptionMethod: "" } }, "2026-05-01", 82).method, "");
  assert.equal(conceptionHistory({ conception }, "2026-09-01", 82).method, "");
});
test("unknown dating requires the original appointment rather than carrying history into an unrelated pregnancy", () => {
  const conception = { source: "Clinician", conceptionMethod: "IUI", lmp: null, appointmentId: 81 };
  assert.equal(conceptionHistory({ conception }, undefined, 81).method, "IUI");
  assert.equal(conceptionHistory({ conception }, undefined, 82).method, "");
});
test("retained patient conception survives a later survey without inheriting into a new pregnancy", () => {
  const saved = { patientConception: {
    conceptionMethod: "IVF / ICSI", conceptionDetails: "Patient reported",
    lmp: "2026-05-01", appointmentId: 81,
  }, onboardingAppointmentId: 82, onboarding: {} };
  assert.equal(conceptionHistory(saved, "2026-05-01", 82).method, "IVF / ICSI");
  assert.equal(conceptionHistory(saved, "2026-05-01", 82).source, "Patient-reported");
  assert.equal(conceptionHistory(saved, "2027-05-01", 83).method, "");
});
test("survey asks about conception only for a reported current pregnancy and excludes hidden answers", () => {
  const form = structuredClone(initialForm);
  form.concerns = ["I am pregnant"];
  form.pregnancies.currentStatus = "Yes";
  form.pregnancies.conceptionMethod = "IUI";
  form.pregnancies.conceptionDetails = "Details";
  const extra = { cycle: false, gyn: false, pregnancy: false, background: false };
  assert.ok(getOnboardingQuestions(form, extra).some((question) => question.id === "conceptionMethod"));
  assert.equal(getRelevantIntake(form, extra).pregnancies.conceptionMethod, "IUI");
  form.pregnancies.currentStatus = "No";
  assert.equal(getRelevantIntake(form, extra).pregnancies.conceptionMethod, "");
  assert.equal(getRelevantIntake(form, extra).pregnancies.conceptionDetails, "");
});
