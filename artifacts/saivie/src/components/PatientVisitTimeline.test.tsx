import React from "react";
import assert from "node:assert/strict";
import { it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientVisitTimeline, sortVisitsNewestFirst, visitMedicines, visitTests } from "./PatientVisitTimeline.tsx";

const visits = [
  { id: 1, date: "2026-08-01", diagnosis: "PCOS", prescriptions: [{ name: "Metformin", dose: "500 mg", frequency: "BD" }] },
  { id: 2, date: "2026-10-01", chiefComplaint: "Irregular cycles", vitals: { bp: "110/70", followUpDate: "2026-11-01" }, prescriptions: { medicines: [{ name: "Folic acid", dose: "5 mg", frequency: "OD", duration: "30 days" }, { name: "" }] }, labsOrdered: [{ name: "TSH", type: "lab" }, "CBC"] },
  { id: 3, date: "2026-09-01" },
];

it("reads both prescription formats and test shapes", () => {
  assert.deepEqual(visitMedicines(visits[1]).map((med) => med.name), ["Folic acid"]);
  assert.equal(visitMedicines(visits[0])[0].frequency, "BD");
  assert.deepEqual(visitTests(visits[1]), ["TSH", "CBC"]);
  assert.deepEqual(visitMedicines(visits[2]), []);
});

it("lists visits newest first and opens the latest prescription", () => {
  assert.deepEqual(sortVisitsNewestFirst(visits).map((visit) => visit.id), [2, 3, 1]);
  const html = renderToStaticMarkup(<PatientVisitTimeline visits={visits} />);
  assert.ok(html.indexOf("visit-timeline-item-2") < html.indexOf("visit-timeline-item-1"));
  assert.match(html, /Folic acid/);
  assert.match(html, /BP 110\/70/);
  assert.match(html, /TSH, CBC/);
  assert.doesNotMatch(html, /Metformin<\/td>/);
});

it("shows empty, loading and error states without inventing data", () => {
  assert.match(renderToStaticMarkup(<PatientVisitTimeline visits={[]} />), /No visits recorded/);
  assert.match(renderToStaticMarkup(<PatientVisitTimeline visits={[]} isLoading />), /Loading visits/);
  assert.match(renderToStaticMarkup(<PatientVisitTimeline visits={[]} isError onRetry={() => {}} />), /Retry/);
  assert.match(renderToStaticMarkup(<PatientVisitTimeline visits={[{ id: 9, date: "2026-01-02" }]} />), /No prescription saved for this visit/);
});

it("shows saved assessment certainty and evidence in the visit record", () => {
  const html = renderToStaticMarkup(<PatientVisitTimeline visits={[{
    id: 10, date: "2026-10-26",
    assessment: "Fertility evaluation\nStatus: Working impression\nContextual: Cycle length: 51 days (Patient-reported survey; date not recorded)",
  }]} />);
  assert.match(html, /Status: Working impression/);
  assert.match(html, /Cycle length: 51 days/);
  assert.match(html, /Patient-reported survey/);
});
