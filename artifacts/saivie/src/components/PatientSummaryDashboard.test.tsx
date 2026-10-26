import React from "react";
import assert from "node:assert/strict";
import { it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientSummaryDashboard } from "./PatientSummaryDashboard.tsx";

const props = {
  patient: { name: "Summary Demo", history: { onboardingAppointmentId: 42, onboarding: { chiefComplaint: "Patient concern", consultation: { directions: ["Ovulatory timing"], answers: { "Are cycles regular?": "Irregular" } } } } },
  appointmentId: 42, visits: [], labs: [], bpLogs: [], weightLogs: [], medications: [],
  pregnancy: false, pregnancyContext: null, sources: [], onConsultation() {},
};

it("shows a patient dashboard with matching survey responses, not an older record editor", () => {
  const html = renderToStaticMarkup(<PatientSummaryDashboard {...props} />);
  assert.ok(html.includes("Patient Summary"));
  assert.ok(html.includes("Patient concern"));
  assert.ok(html.includes("Irregular"));
  assert.ok(html.includes("Open consultation"));
  assert.ok(html.includes("No dated numeric blood sugar results"));
  assert.ok(!html.includes("Pregnancy overview"));
  assert.ok(!html.includes("Save SOAP"));
});

it("does not present another appointment's survey as today's concern or responses", () => {
  const html = renderToStaticMarkup(<PatientSummaryDashboard {...props} appointmentId={43} />);
  assert.ok(!html.includes("Patient concern"));
  assert.ok(!html.includes("Irregular"));
  assert.ok(html.includes("No pre-visit topics selected for this appointment."));
});

it("shows pregnancy dating and explicit source failures without claiming a complete normal overview", () => {
  const html = renderToStaticMarkup(<PatientSummaryDashboard {...props} pregnancy pregnancyContext={{ weeks: 24, days: 2, dueDate: "12 Feb 2027", trimester: "Second trimester" }} sources={[{ label: "Lab results", loading: false, failed: true, retry() {} }]} />);
  assert.ok(html.includes("24w 2d"));
  assert.ok(html.includes("12 Feb 2027"));
  assert.ok(html.includes("Lab results unavailable"));
  assert.ok(html.includes("Retry lab results"));
  assert.ok(html.includes("Hemoglobin"));
});
