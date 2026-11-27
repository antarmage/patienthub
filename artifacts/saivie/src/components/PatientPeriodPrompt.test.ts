import assert from "node:assert/strict";
import test from "node:test";
import { patientPeriodPregnancyDating, shouldShowPeriodPrompt } from "./PatientPeriodPrompt";

test("period prompt respects the session, seven-day delay, limit and saved state", () => {
  const now = Date.parse("2026-11-26T12:00:00Z");
  const state = { value: null, blocked: false, shownCount: 0, nextPromptAt: null };
  assert.equal(shouldShowPeriodPrompt(state, false, now), true);
  assert.equal(shouldShowPeriodPrompt(state, true, now), false);
  assert.equal(shouldShowPeriodPrompt({ ...state, blocked: true }, false, now), false);
  assert.equal(shouldShowPeriodPrompt({ ...state, shownCount: 3 }, false, now), false);
  assert.equal(shouldShowPeriodPrompt({ ...state, value: { date: null, estimated: true, description: "Irregular" } }, false, now), false);
  const nextPromptAt = new Date(now + 7 * 86400000).toISOString();
  assert.equal(shouldShowPeriodPrompt({ ...state, shownCount: 1, nextPromptAt }, false, now + 7 * 86400000 - 1), false);
  assert.equal(shouldShowPeriodPrompt({ ...state, shownCount: 1, nextPromptAt }, false, now + 7 * 86400000), true);
  assert.equal(shouldShowPeriodPrompt({ ...state, nextPromptAt: "invalid" }, false, now), false);
});

test("patient pregnancy dates are estimated only from a usable, plausible period date", () => {
  const value = { date: "2026-10-29", estimated: true, description: "About a month ago" };
  assert.deepEqual(patientPeriodPregnancyDating(value, "2026-11-26"), { pog: "4 weeks 0 days", dueDate: "2027-08-05" });
  assert.equal(patientPeriodPregnancyDating({ ...value, date: null }, "2026-11-26"), null);
  assert.equal(patientPeriodPregnancyDating({ ...value, date: "2025-01-01" }, "2026-11-26"), null);
  assert.equal(patientPeriodPregnancyDating({ ...value, date: "2026-12-01" }, "2026-11-26"), null);
});
