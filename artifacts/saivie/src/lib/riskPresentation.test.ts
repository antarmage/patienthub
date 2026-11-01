import assert from "node:assert/strict";
import test from "node:test";
import { presentPatientRisk } from "./riskPresentation";

test("missing-age-only assessment needs review, not a Critical label or normal-risk fallback", () => {
  const original = {
    level: "Critical",
    score: 90,
    factors: [
      {
        factor: "Invalid/Missing Patient Age",
        severity: "high",
        detail: "Age is zero",
      },
    ],
    recommendations: ["Review history"],
    updatedAt: "2026-01-01",
  };
  const result = presentPatientRisk(original);
  assert.ok(
    result &&
      typeof result === "object" &&
      "level" in result &&
      "originalLevel" in result,
  );
  assert.equal(result.level, "Review required");
  assert.equal(result.originalLevel, "Critical");
  assert.equal(result.originalScore, 90);
  assert.equal(result.score, null);
  assert.deepEqual(result.factors, original.factors);
  assert.deepEqual(presentPatientRisk(result), result);
  assert.equal(original.level, "Critical");
});
test("genuine age risks, mixed clinical evidence and unknown assessments retain their recorded risk", () => {
  for (const factors of [
    [{ factor: "Advanced maternal age" }],
    [{ factor: "Age under 18" }],
    [
      { factor: "Invalid/Missing Patient Age" },
      { factor: "Severe hypertension" },
    ],
    [],
  ]) {
    const original = { level: "Critical", score: 90, factors };
    assert.equal(presentPatientRisk(original), original);
  }
  assert.equal(presentPatientRisk(undefined), undefined);
});
test("the four legacy missing-data factors require review, but any clinical factor preserves the original level", () => {
  const factors = [
    "Invalid/Missing Patient Age",
    "Absence of Vital Signs and Baseline Data",
    "Undetermined Gestational Age",
    "Complete Lack of Clinical History",
  ].map((factor) => ({ factor }));
  const original = { level: "Critical", score: 95, factors };
  const presented = presentPatientRisk(original);
  assert.ok(presented && typeof presented === "object" && "level" in presented);
  assert.equal(presented.level, "Review required");
  const mixed = {
    ...original,
    factors: [...factors, { factor: "Severe hypertension" }],
  };
  assert.equal(presentPatientRisk(mixed), mixed);
});
