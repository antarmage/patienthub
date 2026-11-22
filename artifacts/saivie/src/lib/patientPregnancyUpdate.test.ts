import assert from "node:assert/strict";
import test from "node:test";
import {
  getPostpartumStartDate,
  postpartumStartStorageKey,
  postpartumWeek,
  savePostpartumStartDate,
  shouldShowPregnancyCheckin,
} from "./patientPregnancyUpdate.ts";

test("pregnancy check-in is neutral-triggered by an overdue date or fourteen days without a log", () => {
  const now = new Date(2026, 10, 22, 12);
  assert.equal(shouldShowPregnancyCheckin("2026-11-22", null, now), true);
  assert.equal(shouldShowPregnancyCheckin(null, "2026-11-08", now), true);
  assert.equal(shouldShowPregnancyCheckin(null, "2026-11-09", now), false);
  assert.equal(shouldShowPregnancyCheckin("not-a-date", null, now), false);
  assert.equal(shouldShowPregnancyCheckin(null, null, now), false);
});

test("postpartum week starts at one and advances by elapsed seven-day periods", () => {
  assert.equal(postpartumWeek("2026-11-22", new Date(2026, 10, 22, 12)), 1);
  assert.equal(postpartumWeek("2026-11-15", new Date(2026, 10, 22, 12)), 2);
  assert.equal(postpartumWeek("not-a-date"), null);
});

test("postpartum start date is stored per patient", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  savePostpartumStartDate(storage, 9, "2026-11-22");
  assert.equal(postpartumStartStorageKey(9), "saiviePatientPostpartumStart:9");
  assert.equal(getPostpartumStartDate(storage, 9), "2026-11-22");
});
