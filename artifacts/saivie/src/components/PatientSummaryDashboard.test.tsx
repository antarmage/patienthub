import React from "react";
import assert from "node:assert/strict";
import { it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientSummaryDashboard } from "./PatientSummaryDashboard.tsx";
import { visitTrail } from "@/lib/visitTrail";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

it("general summary uses non-pregnant art only for successfully loaded missing vitals and allergies", () => {
  const empty = renderToStaticMarkup(<PatientSummaryDashboard {...props} />);
  assert.match(empty, /data-records-scenario="vitals"/);
  assert.match(empty, /data-records-scenario="allergies"/);
  assert.match(empty, /data-patient-context="general"/);
  assert.doesNotMatch(empty, /#3F7F72/);
  for (const state of [{ loading: true, failed: false }, { loading: false, failed: true }]) {
    const html = renderToStaticMarkup(<PatientSummaryDashboard {...props} sources={[{ label: "Patient", ...state, retry() {} }]} />);
    assert.doesNotMatch(html, /data-records-scenario/);
  }
  const recorded = renderToStaticMarkup(<PatientSummaryDashboard {...props} checkInVitals={{ bp: "120/80" }} patient={{ name: "Synthetic", history: { allergies: "None known" } }} />);
  assert.doesNotMatch(recorded, /data-records-scenario="vitals"|data-records-scenario="allergies"/);
  const survey = renderToStaticMarkup(<PatientSummaryDashboard {...props} patient={{ name: "Synthetic", history: { onboardingAppointmentId: 42, onboarding: { health: { allergies: "Penicillin" } } } }} />);
  assert.doesNotMatch(survey, /data-records-scenario="allergies"/);
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

it("summary trail includes appointment-only dates without counting them as saved consultations", () => {
  const html = renderToStaticMarkup(<PatientSummaryDashboard {...props} onRecord={() => {}}
    trail={visitTrail([], [{ id: 9, date: "2024-10-04", status: "Completed", type: "Consultation" }])} />);
  assert.ok(html.includes("4 Oct 2024"));
  assert.ok(html.includes("Completed appointment"));
  assert.ok(html.includes("Consultation note unavailable"));
  assert.ok(html.includes("Open full date trail"));
  assert.ok(html.includes("0 recorded visits"));
  assert.ok(!html.includes("Saved clinical encounter"));
});

it("doctor pregnancy summary uses saved-episode overview rather than global historical readings", () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  client.setQueryData(["/api/patients", 1, "pregnancy-episodes"], []);
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><PatientSummaryDashboard {...props} pregnancy
      pregnancyData={{ patient: { ...props.patient, id: 1 }, appointments: [], visits: [], labs: [], ready: true }} /></QueryClientProvider>);
    assert.ok(html.includes('data-testid="pregnancy-overview"'));
    assert.ok(html.includes("No saved pregnancy episode"));
    assert.ok(!html.includes("Last recorded prescription"));
    assert.ok(html.includes("Add pregnancy"));
  } finally { client.clear(); }
});
