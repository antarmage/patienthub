import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ObstetricExamination } from "./ObstetricExamination";
import { obstetricExaminationError, obstetricExaminationSummary, obstetricNotes, obstetricObjective, obstetricVisitExamination, readObstetricExamination, relevantObstetricExamination } from "../lib/obstetricExamination";
import { PatientVisitTimeline } from "./PatientVisitTimeline";

test("unassessed examination has no automatic normal, negative or numeric findings", () => {
  const exam = readObstetricExamination(undefined);
  assert.ok(Object.values(exam).every((value) => value === ""));
  assert.equal(obstetricExaminationSummary(exam), "");
  const html = renderToStaticMarkup(<ObstetricExamination value={exam} onChange={() => {}} />);
  assert.ok(!html.includes("checked"));
  assert.ok(html.includes('type="radio"'));
  assert.ok(html.includes('data-testid="obstetric-lie"'));
  assert.ok(!html.includes('data-testid="obstetric-vulva"'));
});

test("exam reveals only performed speculum, present uterine activity and present FHS follow-ups", () => {
  const exam = { ...readObstetricExamination(null), speculumPerformed: "Yes", uterineActivity: "Yes", fetalHeartSound: "Present" };
  const html = renderToStaticMarkup(<ObstetricExamination value={exam} onChange={() => {}} />);
  for (const label of ["Vulva", "Vagina", "Cervix", "Fluid pooling seen?", "Contractions per 10 minutes", "Fetal heart rate (bpm)"]) {
    assert.ok(html.includes(label));
  }
});

test("hidden examination drafts are excluded from structured record and note", () => {
  const exam = { ...readObstetricExamination(null), speculumPerformed: "No", vulva: "Abnormal findings", bleeding: "Yes", speculumDetails: "Old finding", uterineActivity: "No", contractions: "3", contractionIntensity: "Strong", fetalHeartSound: "Absent", fetalHeartRate: "144" };
  const relevant = relevantObstetricExamination(exam);
  for (const key of ["vulva", "bleeding", "speculumDetails", "contractions", "contractionIntensity", "fetalHeartRate"] as const) assert.equal(relevant[key], "");
  const summary = obstetricExaminationSummary(exam);
  assert.ok(summary.includes("Speculum examination performed: No"));
  assert.ok(!summary.includes("Old finding") && !summary.includes("144") && !summary.includes("Strong"));
  assert.equal(exam.fetalHeartRate, "144");
});

test("structured exam and free notes round-trip without duplicating summaries or losing scans", () => {
  const exam = { ...readObstetricExamination(null), lie: "Longitudinal", presentation: "Cephalic", fundalHeight: "32.5", fetalHeartSound: "Present", fetalHeartRate: "144", speculumPerformed: "No" };
  const saved = obstetricVisitExamination({ scans: [{ date: "2026-11-01" }], placenta: "Anterior" }, "Alert and comfortable.", exam);
  const objective = obstetricObjective("Alert and comfortable.", exam);
  const restored = readObstetricExamination(JSON.parse(JSON.stringify(saved)).obstetric);
  assert.deepEqual(restored, exam);
  assert.deepEqual(saved.scans, [{ date: "2026-11-01" }]);
  assert.equal(saved.placenta, "Anterior");
  assert.equal(obstetricObjective(obstetricNotes(saved, objective), restored), objective);
  assert.equal(obstetricObjective("", readObstetricExamination(null)), "");
  const html = renderToStaticMarkup(<PatientVisitTimeline visits={[{ id: 1, date: "2026-11-01", examination: saved, objective }]} />);
  assert.ok(html.includes("Cephalic") && html.includes("32.5") && html.includes("144"));
});

test("numeric findings reject malformed values without substituting a normal result", () => {
  const exam = { ...readObstetricExamination(null), fetalHeartSound: "Present" };
  for (const value of ["abc", "-1", "Infinity", "301", "144.5"]) {
    assert.ok(obstetricExaminationError({ ...exam, fetalHeartRate: value }));
  }
  assert.equal(obstetricExaminationError({ ...exam, fetalHeartRate: "144", fundalHeight: "32.5", uterineActivity: "Yes", contractions: "3" }), null);
  assert.ok(obstetricExaminationError({ ...exam, fundalHeight: "61" }));
  assert.ok(obstetricExaminationError({ ...exam, contractions: "1.5" }));
  assert.equal(obstetricExaminationError(exam), null);
});

test("legacy examination notes remain readable without inventing structured findings", () => {
  assert.equal(obstetricNotes(null, "Original objective"), "Original objective");
  assert.equal(obstetricNotes({ findings: "Original findings" }, null), "Original findings");
  assert.equal(obstetricNotes("Legacy examination", undefined), "Legacy examination");
  assert.equal(obstetricNotes({ obstetricNotes: "" }, "Prior generated summary"), "");
});
