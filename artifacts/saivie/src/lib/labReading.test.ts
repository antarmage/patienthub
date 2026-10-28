import assert from "node:assert/strict";
import test from "node:test";
import { exactLabNumber } from "./labReading";

test("retains exact numeric values without changing qualifiers or qualitative results", () => {
  assert.equal(exactLabNumber("0.01"), 0.01);
  assert.equal(exactLabNumber("0"), 0);
  assert.equal(exactLabNumber(" -1.25 "), -1.25);
  assert.equal(exactLabNumber(".5"), 0.5);
  for (const value of [
    "<0.01",
    ">200",
    "4.5 g/dL",
    "Negative",
    "",
    "1-2",
    "1,000",
    "NaN",
    "Infinity",
  ]) {
    assert.equal(exactLabNumber(value), null, value);
  }
});
