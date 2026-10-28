import assert from "node:assert/strict";
import test from "node:test";
import { exactLabNumber, recordedLabValue } from "./labReading";

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

test("shows exact imported qualifiers and qualitative values in summaries and evidence", () => {
  assert.equal(
    recordedLabValue({
      value: null,
      unit: "mIU/L",
      results: { rawValue: "<0.01" },
    }),
    "<0.01 mIU/L",
  );
  assert.equal(
    recordedLabValue({ value: null, results: { rawValue: "Negative" } }),
    "Negative",
  );
  assert.equal(
    recordedLabValue({ value: 0.01, results: { rawValue: "0.010" } }),
    "0.010",
  );
  assert.equal(recordedLabValue({ value: 0, unit: "mg" }), "0 mg");
  assert.equal(recordedLabValue({ results: [] }), null);
});
