import assert from "node:assert/strict";
import test from "node:test";
import type { PregnancyEpisodeDetails } from "../../../../lib/db/src/pregnancy-episodes";
import {
  bpReference,
  gestationalWeekAtDate,
  graphReferenceData,
  graphReferenceTimeline,
  pregnancyHemoglobinReference,
  pregnancyWeightReference,
} from "./pregnancyGraphReferences";

const details: PregnancyEpisodeDetails = {
  number: 1,
  status: "current",
  startDate: null,
  endDate: null,
  lmp: "2025-01-01",
  dueDate: null,
  datingBasis: "LMP",
  outcome: "Not recorded",
  deliveryMode: "Not recorded",
  conceptionMethod: "",
  notes: "",
  maternalHeightCm: 160,
  prePregnancyWeightKg: 60,
  fetusCount: 1,
};
const atWeek = (week: number) =>
  new Date(Date.parse("2025-01-01") + week * 7 * 86400000)
    .toISOString()
    .slice(0, 10);

test("weight band uses unrounded pre-pregnancy BMI categories and exact published weekly rates", () => {
  for (const [bmi, lower, upper, category] of [
    [18.49, 0.44, 0.58, "Underweight"],
    [18.5, 0.35, 0.5, "Normal BMI"],
    [24.99, 0.35, 0.5, "Normal BMI"],
    [25, 0.23, 0.33, "Overweight"],
    [29.99, 0.23, 0.33, "Overweight"],
    [30, 0.17, 0.27, "Obesity"],
  ] as const) {
    const baseline = bmi * 4;
    const ref = pregnancyWeightReference({
      ...details,
      maternalHeightCm: 200,
      prePregnancyWeightKg: baseline,
    });
    assert.ok(ref.explanation.includes(category));
    assert.deepEqual(ref.atDate?.(atWeek(20)), {
      lower: Math.round((baseline + 0.5 + 6 * lower) * 100) / 100,
      upper: Math.round((baseline + 2 + 6 * upper) * 100) / 100,
    });
    assert.deepEqual(ref.atDate?.(atWeek(14)), {
      lower: Math.round((baseline + 0.5) * 100) / 100,
      upper: Math.round((baseline + 2) * 100) / 100,
    });
    assert.equal(ref.atDate?.(atWeek(13)), null);
    assert.equal(ref.atDate?.(atWeek(40) + "invalid"), null);
    assert.equal(ref.atDate?.(atWeek(40 + 1 / 7)), null);
  }
});
test("missing baseline, unsupported multiplicity and unknown dating never produce a guessed curve", () => {
  for (const change of [
    { maternalHeightCm: null },
    { maternalHeightCm: NaN },
    { prePregnancyWeightKg: null },
    { prePregnancyWeightKg: 0 },
    { fetusCount: null },
    { fetusCount: 2 },
    { fetusCount: 3 },
    { lmp: null },
    { lmp: "2025-02-30" },
    { datingBasis: "Not recorded" as const },
  ]) {
    const ref = pregnancyWeightReference({ ...details, ...change });
    assert.equal(ref.atDate, undefined);
    assert.ok(ref.explanation.length > 0);
  }
});
test("references use the selected episode's clinical dating and stop after its recorded end", () => {
  const adjusted = {
    ...details,
    datingBasis: "Ultrasound" as const,
    dueDate: atWeek(40),
    lmp: "2020-01-01",
    status: "past" as const,
    endDate: atWeek(25),
  };
  assert.equal(gestationalWeekAtDate(adjusted, atWeek(20)), 20);
  assert.equal(gestationalWeekAtDate(adjusted, atWeek(26)), null);
  assert.equal(gestationalWeekAtDate(details, "2024-12-31"), null);
  assert.equal(gestationalWeekAtDate(details, "2025-02-30"), null);
  assert.equal(gestationalWeekAtDate(details, atWeek(43)), null);
});
test("hemoglobin screening cutoffs change at trimester milestones, not at the next sparse reading", () => {
  const ref = pregnancyHemoglobinReference(details);
  for (const [week, lower] of [
    [13, 11],
    [14, 10.5],
    [27, 10.5],
    [28, 11],
    [40, 11],
  ]) {
    assert.deepEqual(ref.atDate?.(atWeek(week)), { lower });
  }
  const points = [12, 30].map((week) => ({
    date: atWeek(week),
    value: 12,
    source: "Visit",
  }));
  const timeline = graphReferenceTimeline(points, ref);
  assert.equal(timeline.length, 4);
  assert.equal(timeline[1].date, atWeek(14));
  assert.equal(timeline[1].referenceLower, 10.5);
  assert.equal(timeline[1].value, null);
  assert.equal(timeline[2].date, atWeek(28));
  assert.equal(timeline[2].referenceLower, 11);
  assert.deepEqual(
    points.map((point) => point.value),
    [12, 12],
  );
});
test("BP thresholds are labelled as thresholds; references do not replace recorded values or exist in overall history", () => {
  assert.deepEqual(
    bpReference.lines?.map((line) => line.value),
    [140, 90],
  );
  assert.ok(bpReference.explanation.includes("not ideal"));
  const points = [{ date: atWeek(20), value: 64, source: "Visit" }];
  const projected = graphReferenceData(
    points,
    pregnancyWeightReference(details),
  );
  assert.equal(projected[0].value, 64);
  assert.deepEqual(points, [{ date: atWeek(20), value: 64, source: "Visit" }]);
  assert.equal(graphReferenceData(points)[0].referenceLower, null);
  assert.equal(graphReferenceTimeline(points).length, 1);
});
