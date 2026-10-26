import assert from "node:assert/strict";
import { it } from "node:test";
import { DOSAGE_UNITS, formatMedicineDose, splitMedicineDose } from "./medicineDose.ts";

it("round-trips every selectable dosage unit in the existing dose string format", () => {
  for (const unit of DOSAGE_UNITS) {
    const saved = formatMedicineDose("2.5", unit);
    assert.equal(saved, `2.5 ${unit}`);
    assert.deepEqual(splitMedicineDose(saved), { amount: "2.5", unit });
  }
});

it("recognizes saved units, compact doses, fractions and plural forms", () => {
  for (const [input, amount, unit] of [
    ["500mg", "500", "mg"], ["5 ml", "5", "mL"], ["1/2 tablets", "1/2", "tablet"],
    ["1-2 puffs", "1-2", "puff"], ["2 suppositories", "2", "suppository"],
    ["2. mg", "2.", "mg"], [".5 mL", ".5", "mL"], ["1/ tablet", "1/", "tablet"],
  ]) assert.deepEqual(splitMedicineDose(input), { amount, unit });
});

it("preserves unrecognized legacy text without inventing a unit", () => {
  for (const input of ["", "500", "As directed", "small", "One in the morning", "5 mg/5 mL"]) {
    assert.deepEqual(splitMedicineDose(input), { amount: input, unit: "" });
    assert.equal(formatMedicineDose(input, ""), input);
  }
  assert.equal(formatMedicineDose("", "mg"), "");
});
