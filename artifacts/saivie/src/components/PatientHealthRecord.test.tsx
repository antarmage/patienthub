import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PatientHealthRecord from "./PatientHealthRecord";
import PatientPrograms from "./PatientPrograms";
import PregnancyCareDashboard from "./PregnancyCareDashboard";

function renderRecord(overrides: Partial<React.ComponentProps<typeof PatientHealthRecord>> = {}) {
  const client = new QueryClient();
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <PatientHealthRecord
        patient={{}}
        patientId={1}
        medications={[]}
        labResults={[]}
        visitHistory={[]}
        initialSection="overview"
        onBack={() => {}}
        onScheduleMedicationReminder={() => {}}
        onOpenPrograms={() => {}}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  client.clear();
  return html;
}

test("health record overview uses real empty states and offers the five record sections", () => {
  const html = renderRecord();
  assert.match(html, /Profile · 40% complete/);
  assert.match(html, /Your visits will appear here/);
  assert.match(html, /Your lab reports will appear here/);
  assert.match(html, /No current medicines recorded/);
  for (const label of ["Open visits", "Open lab reports", "Open medications", "Open nutrition", "Open exercise"]) {
    assert.ok(html.includes(label), label);
  }
  assert.match(html, /Sharing and export options are not available/);
});

test("health record overview reflects saved values without inventing clinical status", () => {
  const html = renderRecord({
    medications: [{ id: 1, name: "Folic acid", status: "active", dose: "400 mcg" }],
    labResults: [{ id: 2, testName: "Haemoglobin", value: null, unit: "g/dL", results: { rawValue: "<10" } }],
    visitHistory: [{ id: 3, visitType: "Check-up", date: "2026-03-01" }],
  });
  assert.match(html, /Profile · 70% complete/);
  assert.match(html, /Folic acid/);
  assert.match(html, /400 mcg/);
  assert.match(html, /Haemoglobin/);
  assert.match(html, /&lt;10 g\/dL/);
  assert.match(html, /Check-up/);
  assert.doesNotMatch(html, /In range|Critical Risk|10\.8/);
});

test("medication reminder opens the medication section directly", () => {
  const html = renderRecord({
    initialSection: "medications",
    medications: [{ id: 1, name: "Folic acid", status: "active" }],
  });
  assert.match(html, /Your medications, simply/);
  assert.match(html, /Folic acid/);
  assert.doesNotMatch(html, /Health record overview/);
});

test("program shortcuts open their requested pregnancy category", () => {
  for (const [category, expected] of [["Move", "Prenatal strength"], ["Nourish", "Pregnancy balanced plates"]] as const) {
    const html = renderToStaticMarkup(<PatientPrograms pregnancy week={14} mode="pregnancy" initialCategory={category} />);
    assert.ok(html.includes(expected), category);
  }
  const overview = renderToStaticMarkup(<PatientPrograms pregnancy week={14} mode="pregnancy" />);
  assert.doesNotMatch(overview, /Pregnancy balanced plates/);
});

test("care team page does not display an unreviewed AI risk label", () => {
  const html = renderToStaticMarkup(
    <PregnancyCareDashboard
      patient={{ riskScore: { level: "Critical", patientSummary: "AI assessment" } }}
      week={14}
      appointments={[]}
      medications={[]}
      labResults={[]}
      visitHistory={[]}
      weightLogs={[]}
      onBook={() => {}}
      onOpenTrack={() => {}}
      onOpenRecords={() => {}}
    />,
  );
  assert.doesNotMatch(html, /Critical risk|AI assessment|Updated by AI/);
  assert.match(html, /Book an appointment/);
});
