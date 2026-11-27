import assert from "node:assert/strict";
import test from "node:test";
import { patientGreetingName, cycleSubtitle, estimateCyclePhase } from "./patientGreeting";

test("greeting uses the given name, not a title prefix", () => {
  assert.equal(patientGreetingName("Mrs. Surbhi Sukla"), "Surbhi");
  assert.equal(patientGreetingName("Ms Anita Rao"), "Anita");
  assert.equal(patientGreetingName("Dr. Priya"), "Priya");
  assert.equal(patientGreetingName("Smt. Lata Devi"), "Lata");
});

test("names without titles and edge cases stay intact", () => {
  assert.equal(patientGreetingName("Meera Krishnan"), "Meera");
  assert.equal(patientGreetingName("  Priya  "), "Priya");
  assert.equal(patientGreetingName("Mrs."), "Mrs.");
  assert.equal(patientGreetingName(""), "");
  assert.equal(patientGreetingName(null), "");
  assert.equal(patientGreetingName(undefined), "");
});

test("cycle subtitle shows a day count only for a valid recent LMP", () => {
  const now = new Date("2026-11-17T12:00:00");
  assert.equal(cycleSubtitle("2026-11-10", "general", now), "Day 8 of cycle");
  assert.equal(cycleSubtitle("2026-11-17", "ttc", now), "Day 1 of cycle");
});

test("missing, invalid, future or stale LMP falls back to the mode label", () => {
  const now = new Date("2026-11-17T12:00:00");
  assert.equal(cycleSubtitle(null, "general", now), "Cycle Health");
  assert.equal(cycleSubtitle(undefined, "ttc", now), "Trying to Conceive");
  assert.equal(cycleSubtitle("", "ivf", now), "IVF Support");
  assert.equal(cycleSubtitle("not-a-date", "general", now), "Cycle Health");
  assert.equal(cycleSubtitle("2026-12-01", "general", now), "Cycle Health");
  assert.equal(cycleSubtitle("2026-09-01", "general", now), "Cycle Health");
  assert.equal(cycleSubtitle("2026-11-10", "unknown-mode", now), "Day 8 of cycle");
  assert.equal(cycleSubtitle(null, "unknown-mode", now), "Cycle Health");
});

test("cycle phase estimates require a current LMP and a typical recorded cycle length", () => {
  const now = new Date("2026-11-19T12:00:00");
  assert.deepEqual(estimateCyclePhase("2026-11-06", 28, now), {
    cycleDay: 14,
    estimatedOvulationDay: 14,
    isEstimatedOvulationDay: true,
    isPeakFertilityWindow: true,
  });
  assert.equal(estimateCyclePhase("2026-11-07", "28", now)?.isPeakFertilityWindow, true);
  assert.equal(estimateCyclePhase(null, 28, now), null);
  assert.equal(estimateCyclePhase("2026-11-06", null, now), null);
  assert.equal(estimateCyclePhase("2026-11-06", 40, now), null);
  assert.equal(estimateCyclePhase("2026-10-01", 28, now), null);
  assert.equal(estimateCyclePhase("2026-11-20", 28, now), null);
});
