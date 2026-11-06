import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyMenopauseIntake, emptyMenopauseSymptoms, emptyMenopauseSafety, menopauseIntakeSchema,
  menopauseAssessmentSchema, menopausePlanSchema, menopauseTrackingSchema, menopausePatientView,
  menopauseComparison, menopauseConcerns, type MenopauseEntry,
} from "./menopause";

test("intake preserves unknowns and explicit zero; rejects invalid dates, severities and silent extra fields", () => {
  const intake = { ...emptyMenopauseIntake(), priorities: "Discuss symptoms" };
  const result = menopauseIntakeSchema.parse(intake);
  assert.equal(result.symptoms.sleep, null);
  assert.equal(result.safety.bleeding, "Not answered");
  assert.equal(menopauseIntakeSchema.parse({ ...intake, symptoms: { ...intake.symptoms, sleep: 0 } }).symptoms.sleep, 0);
  for (const invalid of [{ ...intake, lmp: "2026-02-30" }, { ...intake, priorities: "" }, { ...intake, stage: "Postmenopause" },
    { ...intake, symptoms: { ...intake.symptoms, sleep: 4 } }])
    assert.equal(menopauseIntakeSchema.safeParse(invalid).success, false);
  assert.equal(menopauseAssessmentSchema.safeParse({ stage: "Postmenopause" }).success, false);
});

test("tracking requires an observation; safety concerns and approval have explicit semantics", () => {
  const tracking = { symptoms: emptyMenopauseSymptoms(), safety: emptyMenopauseSafety(), impact: "", adherence: "Not answered", sideEffects: "" };
  assert.equal(menopauseTrackingSchema.safeParse(tracking).success, false);
  assert.ok(menopauseTrackingSchema.safeParse({ ...tracking, symptoms: { ...tracking.symptoms, sleep: 0 } }).success);
  assert.deepEqual(menopauseConcerns({ ...tracking.safety, bleeding: "Not sure" }), []);
  assert.equal(menopauseConcerns({ ...tracking.safety, bleeding: "Yes" }).length, 1);
  assert.ok(menopauseTrackingSchema.safeParse({ ...tracking, safety: { ...tracking.safety, bleeding: "Yes" } }).success);
  const plan = { assessmentId: 1, status: "Approved", summary: "Summary", treatment: "", lifestyle: "", investigations: "", goals: "", safetyAdvice: "Contact clinic", reviewDate: null, safetyReviewed: false };
  assert.equal(menopausePlanSchema.safeParse(plan).success, false);
  assert.ok(menopausePlanSchema.safeParse({ ...plan, reviewDate: "2026-12-01", safetyReviewed: true }).success);
});

test("comparison uses actual chronological observations, retains same-day readings and never substitutes missing with zero", () => {
  const make = (id: number, date: string, sleep: number | null): MenopauseEntry => ({
    id, date, createdAt: `${date}T12:00:00Z`, appointmentId: null, recordedBy: "Patient", source: "Patient",
    record: { kind: "intake", data: { ...emptyMenopauseIntake(), priorities: "Sleep", symptoms: { ...emptyMenopauseSymptoms(), sleep } } },
  });
  const comparison = menopauseComparison([make(4, "2026-11-06", null), make(3, "2026-11-05", 0), make(2, "2026-11-05", 1), make(1, "2026-11-01", 3)]);
  const sleep = comparison.find((row) => row.key === "sleep")!;
  assert.equal(sleep.baseline?.value, 3); assert.equal(sleep.latest?.value, 0);
  assert.equal(sleep.readings.length, 3);
  assert.equal(comparison.find((row) => row.key === "mood")?.baseline, undefined);
  assert.equal(menopausePatientView({ enabled: false, version: 0, entries: [] }).enabled, false);
});
