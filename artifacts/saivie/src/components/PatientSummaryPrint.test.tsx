import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientSummaryPrint, summaryOverviewStyles } from "./PatientSummaryOverview";
import type { Summary } from "./IntakeSummary";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";

const summary: Summary = {
  name: "Synthetic <Patient>", age: "30 yrs", phone: "", patientId: "SV-00007", visitDate: "05 Nov 2026",
  meta: ["30 yrs", "Occupation: Teacher"], concerns: ["Pregnancy care"], complaint: "",
  insights: [], metrics: [{ label: "Obstetric", value: "G3", hint: "Birth/loss history not fully reported" }],
  bpRows: [], weightRows: [], hasIntake: true, hpv: null, hpvVaccination: "not-vaccinated",
  sections: [
    { title: "Pre-visit survey (patient-reported)", rows: [["Main concern", "Routine review"]] },
    { title: "Medical history", rows: [["Allergies", "Not reported"]] },
    { title: "Gynecological history", rows: [["Last Pap smear", "Not reported"]] },
  ],
};
const context: PregnancyVisitContext = {
  pregnancy: true, repeat: false, episodeId: 3, label: "Pregnancy 3", asOf: "2026-11-05",
  previousAppointmentCount: 2, answers: null,
  weightReference: {
    lmp: "2026-04-16", dueDate: "2027-01-21", endDate: null, datingBasis: "LMP",
    maternalHeightCm: null, prePregnancyWeightKg: null, fetusCount: null, datingSource: "Patient-reported survey",
  },
  trends: {
    weight: [{ date: "2026-07-10", value: 60.1, source: "Appointment" }, { date: "2026-11-05", value: 66.8, source: "Check-in" }],
    bp: [{ date: "2026-07-10", value: 110, secondary: 70, source: "Appointment" }, { date: "2026-11-05", value: 100, secondary: 60, source: "Check-in" }],
    hb: [], sugar: [],
  },
};

test("letterhead print matches section order, uses a dedicated continuation page and leaves margins blank", () => {
  const html = renderToStaticMarkup(<PatientSummaryPrint summary={summary} context={context} />);
  assert.match(summaryOverviewStyles, /@page\{size:A4;margin:30mm 12mm 20mm\}/);
  assert.match(summaryOverviewStyles, /\.summary-detail-page\{break-before:page\}/);
  assert.match(html, /Synthetic &lt;Patient&gt;/);
  for (const label of ["Blood pressure", "Weight", "LMP", "Gestation", "Obstetric", "For clinician attention", "Doctor&#x27;s notes"]) {
    assert.ok(html.indexOf(label) < html.indexOf('data-testid="summary-measurement-page"'), label);
  }
  assert.ok(html.indexOf("Weight gain reference") > html.indexOf('data-testid="summary-measurement-page"'));
  assert.match(html, /Pregnancy measurements/);
  assert.match(html, /10 Jul 2026/);
  assert.match(html, /110 \/ 70/);
  assert.match(html, /\+6\.7/);
  assert.match(html, /Patient-reported survey/);
  assert.match(html, /Gynecological history/);
  assert.match(html, /Last Pap smear/);
  assert.match(html, /No recorded sugar results/);
  assert.match(html, /not confirmed pre-pregnancy weight/);
  assert.doesNotMatch(html, /<footer|Printed |summary-logo-space|<patient>/);
  assert.equal((html.match(/<svg /g) || []).length, 2);
});

test("print preserves distinct same-day measurements and lab test units without guessing missing values", () => {
  const html = renderToStaticMarkup(<PatientSummaryPrint summary={summary} context={{
    ...context, trends: {
      ...context.trends,
      bp: [...context.trends.bp, { date: "2026-11-05", value: 112, secondary: 72, source: "Consultation" }],
      hb: [{ date: "2026-10-01", value: 11.6, source: "Lab result" }],
      sugar: [
        { name: "Fasting glucose", unit: "mg/dL", points: [{ date: "2026-10-01", value: 89, source: "Lab result" }] },
        { name: "HbA1c", unit: "%", points: [{ date: "2026-10-01", value: 5.2, source: "Lab result" }] },
      ],
    },
  }} />);
  assert.match(html, /112 \/ 72/);
  assert.match(html, /100 \/ 60/);
  assert.match(html, /Fasting glucose \(mg\/dL\)/);
  assert.match(html, /HbA1c \(%\)/);
  assert.match(html, /11\.6/);
  assert.doesNotMatch(html, /No recorded sugar results/);
});

test("follow-up answers and original survey history remain separately labelled", () => {
  const html = renderToStaticMarkup(<PatientSummaryPrint summary={{
    ...summary, sections: summary.sections.map((section) => ({ ...section, title: `Original intake: ${section.title}` })),
  }} context={{
    ...context, repeat: true, answers: {
      visitReason: "Current concern", concern: "New nausea", foodHabits: "Small meals",
      vomitingChange: "Increased", eatingDrinking: "Able to eat and drink", investigations: "Some completed",
      reports: "Done, awaiting reports", investigationDetails: "Blood tests completed", changes: "No changes",
    },
  }} />);
  for (const value of ["New nausea", "Small meals", "Vomiting since the last visit", "Original intake: Pre-visit survey", "Routine review"]) {
    assert.ok(html.includes(value), value);
  }
  const protectedHtml = renderToStaticMarkup(<PatientSummaryPrint summary={{ ...summary, hpvVaccination: "protected" }} context={context} />);
  assert.doesNotMatch(protectedHtml, /Cervical cancer prevention: risk and options/);
});

test("weight comparison never presents an older measurement as the selected visit's gain", () => {
  const html = renderToStaticMarkup(<PatientSummaryPrint summary={summary} context={{
    ...context, asOf: "2026-11-06",
  }} />);
  assert.match(html, /No visit weight \/ baseline/);
  assert.doesNotMatch(html, />Within range<|>Below range<|>Above range</);
  assert.match(html, /no weight recorded for the selected visit date/);
});
