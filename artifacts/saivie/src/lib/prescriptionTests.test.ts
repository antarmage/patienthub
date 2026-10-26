import assert from "node:assert/strict";
import { it } from "node:test";
import { pregnancyWeeks, prescriptionTestOptions } from "./prescriptionTests.ts";

it("uses the prescription date, not today, for historical gestation", () => {
  assert.equal(pregnancyWeeks("", "2026-01-01", "2026-07-16"), 28);
  assert.equal(pregnancyWeeks("32 weeks 3 days", "", ""), 32 + 3 / 7);
  for (const value of ["unknown", "44 weeks", "28 weeks 9 days"]) assert.equal(pregnancyWeeks(value, "", ""), null);
  assert.equal(pregnancyWeeks("", "2026-02-30", "2026-07-16"), null);
  assert.equal(pregnancyWeeks("", "2026-07-16", "2026-01-01"), null);
});

it("changes suggestions at trimester boundaries without selecting or ordering tests", () => {
  assert.match(prescriptionTestOptions("Pregnant", 13).context, /First/);
  assert.match(prescriptionTestOptions("Pregnant", 14).context, /Second/);
  assert.match(prescriptionTestOptions("Pregnant", 28).context, /Third/);
  const names = (week: number | null) => prescriptionTestOptions("Pregnant", week).tests.map((test) => test.name);
  assert.ok(names(26).some((name) => name.includes("OGTT")));
  assert.ok(names(32).includes("USG - Growth Scan"));
  assert.ok(!names(32).some((name) => name.includes("NT Scan")));
  assert.ok(!names(null).includes("USG - Growth Scan"));
  assert.ok(names(36).some((name) => name.includes("GBS")));
});

it("provides patient-type-specific lab and scan options", () => {
  for (const type of ["General", "PCOS", "Irregular period", "Pregnant", "MTP", "Fertility", "Postpartum", "Gynecology"]) {
    const { context, tests } = prescriptionTestOptions(type, 30);
    if (type === "MTP" || type === "Irregular period") assert.equal(context, type);
    assert.ok(tests.some((test) => test.type === "lab"));
    assert.ok(tests.some((test) => test.type === "usg"));
    assert.equal(new Set(tests.map((test) => test.name)).size, tests.length);
  }
});
