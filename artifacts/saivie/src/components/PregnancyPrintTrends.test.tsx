import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PregnancyFollowUpSurvey } from "./PregnancyFollowUpSurvey";
import { pregnancyPrintHtml } from "./PregnancyPrintTrends";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";

const context: PregnancyVisitContext = {
  pregnancy: true, repeat: true, episodeId: 1, label: "Pregnancy 2", asOf: "2026-06-10", previousAppointmentCount: 1,
  trends: { bp: [{ date: "2026-05-01", value: 120, secondary: 80, source: "Appointment" }],
    weight: [{ date: "2026-05-01", value: 58, source: "Appointment" }, { date: "2026-06-10", value: 60, source: "Consultation" }],
    hb: [], sugar: [
      { name: "FBS", unit: "mg/dL", points: [{ date: "2026-05-01", value: 90, source: "Lab result" }] },
      { name: "PPBS", unit: "mg/dL", points: [{ date: "2026-05-01", value: 130, source: "Lab result" }] },
    ] }, answers: null,
};

test("pregnancy prints contain small graphs and every dated reading, separate sugar tests and explicit missing data", () => {
  const html = pregnancyPrintHtml(context);
  assert.equal((html.match(/<svg /g) || []).length, 4);
  for (const text of ["Pregnancy 2", "2026-06-10", "2026-05-01", "Weight", "Hemoglobin", "Blood pressure",
    "120 / 80", "Sugar · FBS", "Sugar · PPBS", "mg/dL", "No recorded readings", "Consultation"]) assert.ok(html.includes(text), text);
  assert.ok(html.includes('stroke-dasharray="4 3"'));
  assert.equal(pregnancyPrintHtml({ ...context, pregnancy: false }), "");
});

test("pregnancy print safely escapes answer text and lab labels", () => {
  const html = pregnancyPrintHtml({ ...context, answers: {
    visitReason: "Current concern", concern: "<script>alert(1)</script>", foodHabits: "<img src=x>",
    vomitingChange: "Increased", eatingDrinking: "Eating or drinking less", investigations: "Not done yet",
    reports: "Not available", investigationDetails: "", changes: "",
  } });
  assert.ok(html.includes("&lt;script&gt;")); assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("Current concern")); assert.ok(html.includes("Vomiting since the last visit"));
});

const weightReference = {
  lmp: "2026-01-21", dueDate: null, endDate: null, datingBasis: "LMP" as const,
  maternalHeightCm: 160, prePregnancyWeightKg: 60, fetusCount: 1,
};

test("print compares each dated weight with gestation, baseline gain and the existing BMI-based weekly band", () => {
  const html = pregnancyPrintHtml({ ...context, weightReference });
  for (const text of ["20w 0d", "14w 2d", "BMI 23.4", "baseline 60 kg", "height 160 cm",
    "Actual gain (kg)", "-2.0", "63.0-65.5 kg", "3.0-5.5 kg", "IOM/NRC 2009", "not a validated centile", "<polygon",
    "gestational weeks - 13", "First-trimester guidance: 0.5-2 kg total, not a weekly target"]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.includes("not an automatic diagnosis"));
});

test("print never uses later-pregnancy weight as baseline or applies singleton ranges to twins or unknown dating", () => {
  const missing = pregnancyPrintHtml(context);
  assert.ok(missing.includes("Weight reference unavailable"));
  assert.ok(missing.includes("Later pregnancy weights are not used"));
  for (const change of [{ prePregnancyWeightKg: null }, { maternalHeightCm: null }, { fetusCount: 2 },
    { datingBasis: "Not recorded" as const }, { lmp: null }]) {
    const html = pregnancyPrintHtml({ ...context, weightReference: { ...weightReference, ...change } });
    assert.ok(html.includes("Weight reference unavailable"));
    assert.ok(!html.includes("<polygon"));
    assert.ok(!html.includes("63.0-65.5 kg"));
  }
});

test("print uses first-trimester baseline only as an estimate and retains confirmed baseline priority", () => {
  const early = { date: "2026-03-18", value: 60, source: "Appointment" };
  const trends = { ...context.trends, weight: [early, { date: context.asOf, value: 64, source: "Consultation" }] };
  const html = pregnancyPrintHtml({ ...context, trends, weightReference: { ...weightReference, prePregnancyWeightKg: null } });
  for (const text of ["Estimated gain (kg)", "estimated baseline 60 kg", "2026-03-18", "8w 0d", "Estimated pre-pregnancy BMI 23.4",
    "63.0-65.5 kg", "4.0", "Saved pre-pregnancy weight is unchanged"]) assert.ok(html.includes(text), text);
  const confirmed = pregnancyPrintHtml({ ...context, trends, weightReference: { ...weightReference, prePregnancyWeightKg: 55 } });
  assert.ok(confirmed.includes("baseline 55 kg"));
  assert.ok(confirmed.includes("Actual gain (kg)"));
  assert.ok(!confirmed.includes("Estimated gain (kg)"));
  assert.ok(confirmed.includes("9.0"));
});

test("print respects ultrasound dating and does not invent early, post-term or post-episode reference weights", () => {
  const adjusted = { ...weightReference, datingBasis: "Ultrasound" as const, lmp: "2020-01-01", dueDate: "2026-10-28" };
  assert.ok(pregnancyPrintHtml({ ...context, weightReference: adjusted }).includes("20w 0d"));
  for (const asOf of ["2026-03-01", "2026-10-29"]) {
    const html = pregnancyPrintHtml({ ...context, asOf, weightReference });
    assert.ok(html.includes("Reference weight: Not available"));
  }
  assert.ok(pregnancyPrintHtml({ ...context, weightReference: { ...weightReference, endDate: "2026-06-01" } }).includes("Gestation at this appointment: Dating unavailable"));
});

test("first-trimester print states total guidance without a fabricated week-specific reference", () => {
  const html = pregnancyPrintHtml({ ...context, asOf: "2026-03-18", weightReference,
    trends: { ...context.trends, weight: [{ date: "2026-03-18", value: 61, source: "Appointment" }] } });
  assert.ok(html.includes("8w 0d"));
  assert.ok(html.includes("First-trimester guidance: 0.5-2 kg total, not a weekly target"));
  assert.ok(html.includes("Reference weight: Not available"));
  assert.ok(!html.includes("<polygon"));
});

test("repeat questionnaire shows follow-up subjects, preserves baseline and does not ask initial history again", () => {
  const client = new QueryClient();
  const html = renderToStaticMarkup(<QueryClientProvider client={client}><Router ssrPath="/onboarding/20"><PregnancyFollowUpSurvey appointmentId="20" name="Synthetic" context={context} /></Router></QueryClientProvider>);
  for (const text of ["Welcome back", "Routine check-up", "Current concern", "food habits", "Vomiting since the last visit",
    "Last advised investigations", "Report availability", "medicines, allergies", "will not be replaced", "cannot keep fluids down"]) assert.ok(html.includes(text), text);
  for (const text of ["Menarche", "Partners", "How many pregnancies", "C-sections"]) assert.ok(!html.includes(text), text);
  assert.equal((html.match(/<select /g) || []).length, 5);
  assert.equal((html.match(/<option value="" selected="">/g) || []).length, 5);
  client.clear();
});
