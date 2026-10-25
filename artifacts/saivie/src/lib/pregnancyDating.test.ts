import assert from "node:assert/strict";
import { it } from "node:test";
import { estimatePregnancyDating } from "./pregnancyDating.ts";

it("reverse-calculates a clearly separate LMP equivalent from POG or due date", () => {
  const estimate = estimatePregnancyDating({ asOf: "2026-07-16", pog: "28 weeks 3 days" });
  assert.equal(estimate?.estimatedLmp, "2025-12-29");
  assert.equal(estimate?.source, "gestational-age");
  const byDueDate = estimatePregnancyDating({ asOf: "2026-07-16", dueDate: estimate?.dueDate });
  assert.equal(byDueDate?.estimatedLmp, estimate?.estimatedLmp);
  assert.equal(byDueDate?.pog, "28 weeks 3 days");
});

it("uses the scan date, not the prescription date, to interpret scan POG", () => {
  const estimate = estimatePregnancyDating({ asOf: "2026-07-16", scans: [{ scanDate: "2026-06-04", weeks: "22 weeks" }] });
  assert.equal(estimate?.estimatedLmp, "2026-01-01");
  assert.equal(estimate?.pog, "28 weeks 0 days");
  assert.equal(estimate?.sourceDate, "2026-06-04");
});

it("rejects unknown, invalid, future-scan and out-of-range dating", () => {
  assert.equal(estimatePregnancyDating({ asOf: "2026-07-16" }), null);
  assert.equal(estimatePregnancyDating({ asOf: "2026-02-30", pog: "20" }), null);
  assert.equal(estimatePregnancyDating({ asOf: "2026-07-16", pog: "unknown" }), null);
  assert.equal(estimatePregnancyDating({ asOf: "2026-07-16", dueDate: "2028-01-01" }), null);
  assert.equal(estimatePregnancyDating({ asOf: "2026-07-16", scans: [{ scanDate: "2026-08-01", weeks: "22" }] }), null);
});
