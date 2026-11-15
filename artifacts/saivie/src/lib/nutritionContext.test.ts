import assert from "node:assert/strict";
import test from "node:test";
import { nutritionPhase, recordedNutritionEnergy } from "./nutritionContext";

test("pregnancy status overrides any cycle phase from patient and onboarding data", () => {
  for (const patient of [
    { type: "Pregnant", meta: { phase: "Follicular" } },
    { pregnancyStatus: "pregnant", meta: { phase: "Luteal" } },
    { pregnancyStatus: "active", type: "General" },
    { mode: "pregnancy" },
    { history: { onboarding: { pregnancies: { currentStatus: "Yes" } } } },
  ]) assert.deepEqual(nutritionPhase(patient), { label: "Pregnancy status", value: "Pregnant", detail: "Cycle phase not applicable" });
});

test("ended pregnancies and missing phases never default to follicular", () => {
  for (const status of ["completed", "aborted", "not_continuing"])
    assert.equal(nutritionPhase({ pregnancyStatus: status, type: "Pregnant", meta: { phase: "Follicular" } }).value, "Not currently active");
  assert.equal(nutritionPhase({}).value, "Not recorded");
  assert.equal(nutritionPhase({ history: { onboarding: { pregnancies: { currentStatus: "No" } } } }).value, "Not recorded");
  assert.equal(nutritionPhase({ meta: { phase: "Luteal (Day 20)" } }).value, "Luteal (Day 20)");
});

test("nutrition energy shows only recorded values without a fabricated deficit", () => {
  assert.deepEqual(recordedNutritionEnergy({}, null), { expenditure: null, target: null, activity: null });
  assert.deepEqual(recordedNutritionEnergy({ meta: { tdee: 2100, activity: "Light" } }, 1800),
    { expenditure: 2100, target: 1800, activity: "Light" });
  assert.deepEqual(recordedNutritionEnergy({ meta: { tdee: -1, activity: "" } }, NaN),
    { expenditure: null, target: null, activity: null });
});
