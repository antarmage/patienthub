import assert from "node:assert/strict";
import test from "node:test";
import { obstetricAreas, obstetricAreaState, setObstetricAreaState } from "./obstetricAreas";
import { readObstetricExamination, obstetricExaminationSummary, obstetricVisitExamination } from "./obstetricExamination";

test("blank areas remain unrecorded and legacy fields derive markers without new defaults", () => {
  const blank = readObstetricExamination(null);
  for (const area of obstetricAreas) assert.equal(obstetricAreaState(blank, area), "Not recorded");
  assert.equal(obstetricAreaState({ ...blank, pallor: "Yes" }, obstetricAreas[0]), "Abnormal");
  assert.equal(obstetricAreaState({ ...blank, fetalHeartSound: "Present" }, obstetricAreas[2]), "Recorded");
  assert.equal(obstetricAreaState({ ...blank, pvPerformed: "Deferred" }, obstetricAreas[5]), "Deferred");
});

test("normal shortcuts are limited to explicit assessed checks, never fetal or invasive examinations", () => {
  const blank = readObstetricExamination(null);
  const general = setObstetricAreaState(blank, obstetricAreas[0], "Normal");
  assert.equal(general.pallor, "No");
  assert.equal(general.edema, "No");
  assert.equal(general.speculumPerformed, "");
  assert.equal(general.fetalHeartSound, "");
  assert.equal(obstetricAreaState(general, obstetricAreas[0]), "Normal");
  for (const index of [2, 4, 5]) assert.throws(() => setObstetricAreaState(blank, obstetricAreas[index], "Normal"));
});

test("abnormal selection itself persists without inventing a clinical finding", () => {
  const exam = setObstetricAreaState(readObstetricExamination(null), obstetricAreas[1], "Abnormal");
  assert.equal(exam.inspection, "");
  const saved = obstetricVisitExamination({ scans: ["unchanged"] }, "", exam);
  const restored = readObstetricExamination(saved.obstetric);
  assert.equal(obstetricAreaState(restored, obstetricAreas[1]), "Abnormal");
  assert.ok(saved.findings.includes("Abdominal examination status: Abnormal"));
  assert.deepEqual(saved.scans, ["unchanged"]);
});

test("not examined is distinct from normal and removes only that area's findings", () => {
  const exam = { ...readObstetricExamination(null), inspection: "Tenderness", uterineActivity: "Irritable", fetalHeartSound: "Present" };
  const skipped = setObstetricAreaState(exam, obstetricAreas[1], "Not examined");
  assert.equal(skipped.inspection, "");
  assert.equal(skipped.uterineActivity, "");
  assert.equal(skipped.fetalHeartSound, "Present");
  assert.equal(obstetricAreaState(skipped, obstetricAreas[1]), "Not examined");
  assert.ok(obstetricExaminationSummary(skipped).includes("Abdominal examination status: Not examined"));
  assert.equal(exam.inspection, "Tenderness");
});

test("abnormal findings take precedence over a stale normal marker", () => {
  const normal = setObstetricAreaState(readObstetricExamination(null), obstetricAreas[0], "Normal");
  assert.equal(obstetricAreaState({ ...normal, pallor: "Yes" }, obstetricAreas[0]), "Abnormal");
});
