import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConsultationAssessment } from "./ConsultationAssessment";
import { readAssessment } from "@/lib/consultationAssessment";

test("composer exposes certainty and sourced facts without compulsory duplicated reasoning forms", () => {
  const html = renderToStaticMarkup(<ConsultationAssessment draft={readAssessment(null)}
    onChange={() => {}} diagnoses={["Previous problem"]} loading={false} errors={[]} onRetry={() => {}}
    missing={["Examination not recorded."]} facts={[
      { id: "history:cycle", label: "Cycle length", value: "51 days", source: "Patient-reported survey", date: null, relevant: true },
    ]} />);
  for (const label of ["Diagnosis / clinical impression", "Assessment status", "Working impression",
    "Confirmed diagnosis", "Undetermined", "Additional reasoning", "51 days", "Patient-reported survey",
    "Date not recorded", "Needs review", "Not linked", "Supporting", "Challenging", "Examination not recorded."]) {
    assert.ok(html.includes(label), label);
  }
  assert.ok(!html.includes("Missing or conflicting"));
  assert.ok(!html.includes('checked=""'));
  assert.ok(html.includes("0 of 1 reviewed"));
});

test("source failures and loading remain visible rather than appearing as an empty normal record", () => {
  const html = renderToStaticMarkup(<ConsultationAssessment draft={readAssessment(null)} onChange={() => {}}
    diagnoses={[]} loading={true} errors={["reports"]} onRetry={() => {}} missing={[]} facts={[]} />);
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes("Evidence may be incomplete"));
  assert.ok(html.includes("Retry"));
  assert.ok(html.includes("Loading records"));
});

test("changed values do not inherit a previous review or silently discard its snapshot", () => {
  const oldFact = { id: "lab:1", label: "FSH", value: "5 IU/L", source: "Laboratory", date: "2026-10-01", relevant: true };
  const draft = readAssessment({ impression: "Clinical problem", evidence: [{ ...oldFact, reviewed: true, relation: "contextual" }] });
  const html = renderToStaticMarkup(<ConsultationAssessment draft={draft} onChange={() => {}} diagnoses={[]}
    loading={false} errors={[]} onRetry={() => {}} missing={[]} facts={[{ ...oldFact, value: "6 IU/L" }]} />);
  assert.ok(html.includes("0 of 1 reviewed"));
  assert.ok(html.includes("Previously saved evidence (1)"));
  assert.ok(html.includes("5 IU/L"));
  assert.ok(html.includes("6 IU/L"));
  assert.ok(!html.includes('checked=""'));
});
