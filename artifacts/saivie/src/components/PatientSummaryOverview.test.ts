import assert from "node:assert/strict";
import test from "node:test";
import { patientSummaryOverviewHtml } from "./IntakeSummary";
import { initialForm } from "@/lib/onboardingFlow";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";

const form = structuredClone(initialForm);
form.name = "Synthetic <patient>";
form.dob = "1990-01-01";
form.gyn.hpvVaccine = "No";
form.pregnancies.total = "3";
form.health.allergies = "No known allergies";
form.health.medications = "Recorded medicine";
form.consultation = { directions: ["Ovulatory timing"], answers: { "Are cycles regular?": "Original answer" } };
const patient = { id: 7, name: form.name, history: { onboarding: form } };
const context: PregnancyVisitContext = {
  pregnancy: true, repeat: true, episodeId: null, label: "Current pregnancy", asOf: "2026-11-05",
  previousAppointmentCount: 3, answers: null,
  weightReference: { lmp: "2026-04-16", dueDate: null, endDate: null, datingBasis: "LMP",
    maternalHeightCm: null, prePregnancyWeightKg: null, fetusCount: null, datingSource: "Recorded patient LMP" },
  trends: {
    weight: [{ date: "2026-06-03", value: 60.1, source: "Appointment" }, { date: "2026-09-17", value: 63.2, source: "Appointment" }],
    bp: [{ date: "2026-09-17", value: 110, secondary: 70, source: "Appointment" }], hb: [], sugar: [],
  },
};

test("reference-style overview reserves blank logo space and identifies appointment-specific dates and old measurements", () => {
  const html = patientSummaryOverviewHtml(patient, null, context);
  for (const text of ['data-testid="summary-logo-space"', "Reserved space for clinic logo", "Antenatal pre-visit summary",
    "Synthetic &lt;patient&gt;", "SV-00007", "29w 0d", "21 Jan 2027", "For clinician attention",
    "Follow-up survey not submitted", "original intake is not today", "2026-09-17",
    "no weight recorded for the selected visit date", "No hemoglobin results", "No blood sugar results",
    "Visit 29w", "Gestational weeks", "Doctor&#x27;s notes"]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes("<patient>"));
  assert.ok(!html.includes("No bleeding"));
  assert.equal((html.match(/<svg /g) || []).length, 2);
});

test("missing height prints all four conditional singleton rows without assigning a personalised target", () => {
  const html = patientSummaryOverviewHtml(patient, null, context);
  for (const text of ["Underweight", "Normal BMI", "Overweight", "Obesity", "6.1 - 10.0", "66.2 - 70.1",
    "Baby count not recorded", "do not apply until singleton status is confirmed", "Height: ________ cm",
    "Category: not assigned", "Estimated baseline 60.1 kg", "6w 6d", "Recorded gain: 3.1 kg",
    "gestational weeks - 13"]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('class="selected"'));
});

test("known multiples never receive singleton reference rows and unknown dating never invents gestation", () => {
  const twins = patientSummaryOverviewHtml(patient, null, { ...context,
    weightReference: { ...context.weightReference!, fetusCount: 2 } });
  assert.ok(twins.includes("singleton ranges are not applied"));
  assert.ok(!twins.includes("Underweight"));
  const undated = patientSummaryOverviewHtml(patient, null, { ...context,
    weightReference: { ...context.weightReference!, lmp: null, datingBasis: "Not recorded" } });
  assert.ok(undated.includes("gestational dating unavailable"));
  assert.ok(!undated.includes("29w 0d"));
  assert.ok(undated.includes("Baseline unavailable") || undated.includes("Dating unavailable"));
});

test("non-pregnancy overview remains general and never shows antenatal guidance", () => {
  const html = patientSummaryOverviewHtml(patient, null, null);
  assert.ok(html.includes("Patient pre-visit summary"));
  assert.ok(html.includes("Medical background"));
  assert.ok(html.includes("Recorded medicine"));
  assert.ok(!html.includes("singleton guidance"));
  assert.ok(!html.includes("Antenatal pre-visit"));
});
