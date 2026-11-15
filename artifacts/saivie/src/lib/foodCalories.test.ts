import assert from "node:assert/strict";
import test from "node:test";
import { estimateFoodCalories, summarizePlannedCalories } from "./foodCalories";

test("sums selected servings including fractional quantities and zero-calorie foods", () => {
  assert.equal(estimateFoodCalories([{ calories: 195, quantity: "1.5" }, { calories: 50, quantity: "2" }, { calories: 0, quantity: "1" }]), 393);
  assert.equal(estimateFoodCalories([{ calories: 0, quantity: "1" }]), 0);
});

test("planned totals distinguish partial, missing and zero-calorie entries", () => {
  assert.deepEqual(summarizePlannedCalories([
    { item: "Rice", macros: "130.5 kcal (FatSecret estimate, one option)" },
    { item: "Water", macros: "0 kcal" }, { item: "Vegetables", macros: "" }, { item: "", macros: "100 kcal" },
  ]), { total: 130.5, recorded: 2, meals: 3 });
  assert.deepEqual(summarizePlannedCalories([{ item: "Rice" }]), { total: 0, recorded: 0, meals: 1 });
});

test("does not produce a success-shaped estimate for missing or invalid values", () => {
  for (const ingredients of [[], [{ calories: 1, quantity: "" }], [{ calories: 1, quantity: "0" }],
    [{ calories: 1, quantity: "-1" }], [{ calories: 1, quantity: "1001" }],
    [{ calories: NaN, quantity: "1" }], [{ calories: 1, quantity: "abc" }]])
    assert.equal(estimateFoodCalories(ingredients), null);
});
