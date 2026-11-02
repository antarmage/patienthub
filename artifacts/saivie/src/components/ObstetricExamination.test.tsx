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
  const exam = { ...readObstetricExamination(null), speculumPerformed: "Yes", uterineActivity: "Contractions present", fetalHeartSound: "Present" };
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
  assert.equal(obstetricExaminationError({ ...exam, fetalHeartRate: "144", fundalHeight: "32.5", uterineActivity: "Contractions present", contractions: "3" }), null);
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

test("uterine activity uses clinical tiles and shows contractions only when present", () => {
  for (const activity of ["Relaxed", "Irritable", "Contractions present", ""]) {
    const exam = { ...readObstetricExamination(null), uterineActivity: activity, contractions: "3", contractionIntensity: "Moderate" };
    const html = renderToStaticMarkup(<ObstetricExamination value={exam} onChange={() => {}} />);
    const field = html.split('data-testid="obstetric-uterineActivity"')[1].split("</fieldset>")[0];
    for (const option of ["Relaxed", "Irritable", "Contractions present"]) assert.ok(field.includes(`value="${option}"`));
    assert.ok(!field.includes('value="Yes"') && !field.includes('value="No"'));
    assert.equal(html.includes("Contractions per 10 minutes"), activity === "Contractions present");
    assert.equal(relevantObstetricExamination(exam).contractions, activity === "Contractions present" ? "3" : "");
    if (activity) assert.ok(obstetricExaminationSummary(exam).includes(`Uterine activity: ${activity}`));
  }
  const legacy = { ...readObstetricExamination({ uterineActivity: "Yes" }), contractions: "3" };
  assert.equal(relevantObstetricExamination(legacy).contractions, "3");
  assert.ok(renderToStaticMarkup(<ObstetricExamination value={legacy} onChange={() => {}} />).includes("Previously recorded: Yes"));
});

test("PV and leakage controls reveal findings only after explicit assessment choices", () => {
  const blank = readObstetricExamination(null);
  let html = renderToStaticMarkup(<ObstetricExamination value={blank} onChange={() => {}} />);
  assert.ok(html.includes("Per vaginal (PV) examination"));
  assert.ok(!html.includes('data-testid="obstetric-leakageColour"'));
  assert.ok(!html.includes("PV cervical dilatation (cm)"));
  const exam = { ...blank, pvPerformed: "Yes", leakageReported: "Uncertain", speculumPerformed: "Yes", pooling: "Yes" };
  html = renderToStaticMarkup(<ObstetricExamination value={exam} onChange={() => {}} />);
  for (const label of ["PV cervical dilatation (cm)", "PV cervical effacement (%)", "PV head / presenting-part station", "PV pelvis adequacy", "PV remarks / additional findings", "Reported fluid colour", "Reported fluid odour", "Fluid seen on speculum examination"]) assert.ok(html.includes(label));
  assert.ok(!html.includes('value="Confirmed" checked'));
});

test("PV and leakage findings round-trip into visit summaries without losing explicit zero or negative station", () => {
  const exam = { ...readObstetricExamination(null), pvPerformed: "Yes", cervicalDilatation: "0", cervicalEffacement: "20", station: "-3", pvMembranes: "Intact", leakageReported: "Yes", leakageColour: "Clear", leakageOnset: "Since 08:00", ruptureAssessment: "Suspected", speculumPerformed: "Yes", pooling: "Yes", observedFluid: "Clear" };
  const saved = obstetricVisitExamination({ scans: [] }, "Reviewed by clinician.", exam);
  assert.deepEqual(readObstetricExamination(saved.obstetric), exam);
  assert.ok(saved.findings.includes("PV cervical dilatation (cm): 0"));
  assert.ok(saved.findings.includes("PV head / presenting-part station: -3"));
  assert.ok(saved.findings.includes("Reported fluid colour: Clear"));
  assert.ok(saved.findings.includes("Fluid seen on speculum examination: Clear"));
  assert.equal(obstetricExaminationError(exam), null);
  for (const value of ["-6", "6", "1.5", "abc"]) assert.ok(obstetricExaminationError({ ...exam, station: value }));
  assert.ok(obstetricExaminationError({ ...exam, cervicalDilatation: "10.1" }));
  assert.ok(obstetricExaminationError({ ...exam, cervicalEffacement: "101" }));
});

test("declining or deferring PV and leakage removes hidden findings but preserves draft answers", () => {
  const exam = { ...readObstetricExamination(null), pvPerformed: "Deferred", pvReason: "Clinical assessment pending", cervicalDilatation: "4", station: "-2", leakageReported: "No", leakageColour: "Green / brown", ruptureAssessment: "Confirmed", speculumPerformed: "Yes", pooling: "No", observedFluid: "Clear" };
  const relevant = relevantObstetricExamination(exam);
  for (const key of ["cervicalDilatation", "station", "leakageColour", "ruptureAssessment", "observedFluid"] as const) assert.equal(relevant[key], "");
  assert.equal(relevant.pvReason, "Clinical assessment pending");
  assert.equal(exam.cervicalDilatation, "4");
  const summary = obstetricExaminationSummary(exam);
  assert.ok(summary.includes("Deferred") && summary.includes("Clinical assessment pending"));
  assert.ok(!summary.includes("Confirmed") && !summary.includes("Green / brown"));
});

test("pelvis adequacy and PV remarks save only for a performed examination", () => {
  const blank = readObstetricExamination(null);
  assert.equal(blank.pelvisAdequacy, "");
  const exam = { ...blank, pvPerformed: "Yes", pelvisAdequacy: "Uncertain", pvDetails: "Assessment limited" };
  const saved = obstetricVisitExamination(null, "", exam);
  assert.deepEqual(readObstetricExamination(saved.obstetric), exam);
  assert.ok(saved.findings.includes("PV pelvis adequacy: Uncertain"));
  assert.ok(saved.findings.includes("PV remarks / additional findings: Assessment limited"));
  const deferred = relevantObstetricExamination({ ...exam, pvPerformed: "Deferred" });
  assert.equal(deferred.pelvisAdequacy, "");
  assert.equal(deferred.pvDetails, "");
});

test("examination fields are grouped once under clearly labelled clinical sections", () => {
  const exam = { ...readObstetricExamination(null), pvPerformed: "Yes", speculumPerformed: "Yes", leakageReported: "Yes" };
  const html = renderToStaticMarkup(<ObstetricExamination value={exam} onChange={() => {}} />);
  for (const group of ["general", "abdominal", "fetal", "leakage", "speculum", "pv", "notes"]) {
    assert.equal(html.split(`data-testid="obstetric-${group}-section"`).length - 1, 1);
  }
  for (const key of ["pallor", "uterineActivity", "lie", "leakageReported", "speculumPerformed", "pvPerformed", "pelvisAdequacy"]) {
    assert.equal(html.split(`data-testid="obstetric-${key}"`).length - 1, 1);
  }
  assert.ok(html.includes("Cervical findings") && html.includes("Associated symptoms"));
});

test("body map has six accessible, data-driven markers and a six-area progress count", () => {
  const exam = { ...readObstetricExamination(null), pallor: "No", edema: "No", uterineActivity: "Irritable", pvPerformed: "Deferred" };
  const html = renderToStaticMarkup(<ObstetricExamination value={exam} onChange={() => {}} />);
  for (const label of ["General: Normal", "Abdomen: Abnormal", "Fetal: Not recorded", "Leakage: Not recorded", "Speculum: Not recorded", "PV: Deferred"]) {
    assert.ok(html.includes(`aria-label="${label}"`));
  }
  assert.ok(html.includes("3") && html.includes("of 6 areas documented"));
  assert.ok(!html.includes("Mark every area normal"));
  assert.ok(html.includes('aria-label="Note from examination"'));
  assert.ok(html.includes('hidden=""') && html.includes('aria-label="Examination areas"'));
});
