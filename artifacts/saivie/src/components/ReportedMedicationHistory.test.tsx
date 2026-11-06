import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportedMedicationHistory, reportedMedicationHistory } from "./ReportedMedicationHistory";

test("saved survey medicines appear with their original appointment, not as today's prescription", () => {
  const history = {
    onboardingAppointmentId: 942,
    onboarding: { health: { medications: "Folic acid\nThyroid tablet" } },
    drug: ["Folic acid", "Thyroid tablet"],
  };
  const html = renderToStaticMarkup(<ReportedMedicationHistory history={history} />);
  assert.match(html, /Folic acid/);
  assert.match(html, /Thyroid tablet/);
  assert.match(html, /Saved intake survey · Appointment 942/);
  assert.match(html, /not prescriptions or confirmed active/);
  assert.equal(reportedMedicationHistory(history).length, 1);
  assert.doesNotMatch(html, /7 Nov|07 Nov|Dose:|Daily/);
});

test("distinct history answers are preserved and blank surveys do not hide recorded medicines", () => {
  assert.deepEqual(reportedMedicationHistory({
    drug: ["Iron"], onboarding: { health: { medications: "" } },
  }), [{ source: "Recorded medication history", text: "Iron" }]);
  assert.equal(reportedMedicationHistory({
    drug: ["Iron"], onboarding: { health: { medications: "Folic acid" } },
  }).length, 2);
  assert.equal(renderToStaticMarkup(<ReportedMedicationHistory history={null} />), "");
});

test("free text and explicit no-medicine answers are displayed without invented dosing or HTML", () => {
  const html = renderToStaticMarkup(<ReportedMedicationHistory history={{
    onboarding: { health: { medications: "Not taking any <script>test</script>" } },
  }} />);
  assert.match(html, /Not taking any &lt;script&gt;test&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("visit dates only show the survey explicitly assigned to that appointment, never unassigned history", () => {
  const history = {
    onboardingAppointmentId: "942",
    onboarding: { health: { medications: "Folic acid\nThyroid tablet" } },
    drug: ["Unassigned historical medicine"],
  };
  assert.deepEqual(reportedMedicationHistory(history, 942), [{
    source: "Saved intake survey · Appointment 942", text: "Folic acid\nThyroid tablet",
  }]);
  for (const appointmentId of [946, 947, null, "", true]) {
    assert.equal(renderToStaticMarkup(<ReportedMedicationHistory history={history} appointmentId={appointmentId} />), "");
  }
  assert.deepEqual(reportedMedicationHistory({ ...history, onboarding: {} }, 942), []);
  assert.deepEqual(reportedMedicationHistory({ ...history, onboardingAppointmentId: null }, 942), []);
});
