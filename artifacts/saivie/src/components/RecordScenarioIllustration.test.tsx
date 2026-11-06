import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { IllustrationAction, RecordScenarioIllustration, type RecordScenario } from "./RecordScenarioIllustration";
import { PregnancyMedicationIllustration } from "./PregnancyMedicationIllustration";
import { PatientReportsList } from "./PatientReports";
import { PatientVisitTimeline } from "./PatientVisitTimeline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DiagnosisHistory } from "./IcdDiagnoses";

const scenarios: RecordScenario[] = ["labs", "scans", "visits", "vitals", "diagnoses", "allergies", "notes", "documents"];

test("all eight scenarios use distinct symbols and accessible responsive SVGs", () => {
  const illustrations = scenarios.map((scenario) => renderToStaticMarkup(<RecordScenarioIllustration pregnancy scenario={scenario} />));
  assert.equal(new Set(illustrations).size, scenarios.length);
  for (const [index, html] of illustrations.entries()) {
    assert.match(html, /viewBox="30 40 300 330"/);
    assert.match(html, /width="100%"/);
    assert.match(html, /role="img"/);
    assert.match(html, /Missing records do not indicate normal findings/);
    assert.ok(html.includes(`data-illustration-part="${scenarios[index]}"`));
    assert.doesNotMatch(html, /<image|<filter|<linearGradient/);
  }
  const html = renderToStaticMarkup(<><RecordScenarioIllustration scenario="labs" /><RecordScenarioIllustration pregnancy scenario="scans" /></>);
  const labels = [...html.matchAll(/aria-labelledby="([^"]+)"/g)];
  assert.equal(labels.length, 2);
  assert.notEqual(labels[0][1], labels[1][1]);
  for (const label of labels) for (const id of label[1].split(" ")) assert.ok(html.includes(`id="${id}"`));
});

test("illustration plus is a labelled native button that invokes the new-record action", () => {
  let opened = 0;
  const element = IllustrationAction({ children: <svg />, label: "Start new consultation", onAdd: () => { opened++; } });
  const button = element.props.children[1];
  assert.equal(button.type, "button");
  assert.equal(button.props.type, "button");
  assert.equal(button.props["aria-label"], "Start new consultation");
  button.props.onClick();
  assert.equal(opened, 1);
  const html = renderToStaticMarkup(<RecordScenarioIllustration scenario="notes" decorative onAdd={() => {}} actionLabel="Start new consultation" />);
  assert.match(html, /<button[^>]+aria-label="Start new consultation"/);
  assert.match(html, /focus-visible:ring-2/);
  assert.doesNotMatch(html, /<svg[^>]*role="button"/);
  assert.doesNotMatch(renderToStaticMarkup(<RecordScenarioIllustration scenario="notes" decorative />), /<button/);
  assert.match(renderToStaticMarkup(<RecordScenarioIllustration scenario="deliveries" onAdd={() => {}} actionDisabled />), /<button[^>]*disabled=""/);
  assert.match(renderToStaticMarkup(<PregnancyMedicationIllustration onAdd={() => {}} />), /aria-label="Add current medicine"/);
});

test("empty visit and missing-note plus buttons open consultation only when an action is supplied", () => {
  for (const visits of [[], [{ id: 1, date: "2026-11-03", appointmentOnly: true }]]) {
    const html = renderToStaticMarkup(<PatientVisitTimeline visits={visits} onNewRecord={() => {}} />);
    assert.match(html, /<button[^>]+aria-label="Start new consultation"/);
    const readOnly = renderToStaticMarkup(<PatientVisitTimeline visits={visits} />);
    assert.doesNotMatch(readOnly, /aria-label="Start new consultation"/);
  }
});

test("pregnancy report and visit empties use decorative scenario art without changing messages", () => {
  for (const [component, scenario, message] of [
    [<PatientReportsList pregnancy patientId={7} documents={[]} />, "scans", "No lab or USG reports uploaded."],
    [<PatientVisitTimeline pregnancy visits={[]} />, "visits", "No visits recorded"],
    [<PatientVisitTimeline patient={{ type: "Pregnant" }} visits={[]} />, "visits", "No visits recorded"],
  ] as const) {
    const html = renderToStaticMarkup(component);
    assert.ok(html.includes(`data-records-scenario="${scenario}"`));
    assert.ok(html.includes(message));
    assert.match(html, /aria-hidden="true"/);
    assert.doesNotMatch(html, /<title|role="img"/);
  }
});

test("all eight non-pregnancy scenarios use the supplied non-pregnant figure and shared symbols", () => {
  for (const scenario of scenarios) {
    const html = renderToStaticMarkup(<RecordScenarioIllustration scenario={scenario} />);
    assert.ok(html.includes(`data-records-scenario="${scenario}"`));
    assert.match(html, /data-patient-context="general"/);
    assert.match(html, /translate\(24 0\)/);
    assert.match(html, /translate\(220 210\)/);
    assert.match(html, /#F2E6CF/);
    assert.doesNotMatch(html, /pregnant woman|#3F7F72/);
    const pregnant = renderToStaticMarkup(<RecordScenarioIllustration pregnancy scenario={scenario} />);
    assert.match(pregnant, /data-patient-context="pregnancy"/);
    assert.match(pregnant, /#3F7F72/);
  }
});

test("non-pregnancy report and visit empties use the general figure", () => {
  for (const component of [
    <PatientReportsList patientId={7} documents={[]} />,
    <PatientVisitTimeline visits={[]} patient={{ type: "Gynae" }} />,
    <PatientVisitTimeline visits={[]} patient={{ type: "Fertility" }} />,
    <PatientVisitTimeline visits={[]} patient={{ type: "Postpartum", pregnancyStatus: "Pregnant" }} />,
  ]) {
    const html = renderToStaticMarkup(component);
    assert.match(html, /data-patient-context="general"/);
    assert.doesNotMatch(html, /#3F7F72/);
  }
});

test("loading, failures and populated reports do not show empty-state artwork", () => {
  for (const component of [
    <PatientReportsList patientId={7} documents={[]} isLoading />,
    <PatientReportsList patientId={7} documents={[]} isError />,
    <PatientVisitTimeline visits={[]} isLoading />,
    <PatientVisitTimeline visits={[]} isError />,
    <PatientReportsList pregnancy patientId={7} documents={[]} isLoading />,
    <PatientReportsList pregnancy patientId={7} documents={[]} isError />,
    <PatientReportsList pregnancy patientId={7} documents={[{ id: 1, type: "Lab Report", name: "CBC" }]} />,
    <PatientVisitTimeline pregnancy visits={[]} isLoading />,
    <PatientVisitTimeline pregnancy visits={[]} isError />,
  ]) {
    assert.doesNotMatch(renderToStaticMarkup(component), /data-records-scenario/);
  }
});

test("an appointment without a consultation note uses the notes illustration, not an empty visit history", () => {
  const html = renderToStaticMarkup(<PatientVisitTimeline pregnancy visits={[{
    id: 1, date: "2026-11-03", appointmentOnly: true, appointment: { id: 1, status: "scheduled" },
  }]} />);
  assert.match(html, /data-records-scenario="notes"/);
  assert.match(html, /Appointment recorded; consultation note unavailable/);
  assert.doesNotMatch(html, /data-records-scenario="visits"/);
});

test("diagnosis artwork requires successful empty results and matches patient context", () => {
  for (const pregnancy of [false, true]) {
    const client = new QueryClient();
    try {
      const render = () => renderToStaticMarkup(<QueryClientProvider client={client}><DiagnosisHistory pregnancy={pregnancy} patientId={7} /></QueryClientProvider>);
      assert.doesNotMatch(render(), /data-records-scenario/);
      client.setQueryData(["confirmed-diagnoses", 7], []);
      const html = render();
      assert.match(html, /data-records-scenario="diagnoses"/);
      assert.ok(html.includes(`data-patient-context="${pregnancy ? "pregnancy" : "general"}"`));
      assert.match(html, /No coded diagnoses recorded. Existing free-text visit history is unchanged/);
    } finally {
      client.clear();
    }
  }
});
