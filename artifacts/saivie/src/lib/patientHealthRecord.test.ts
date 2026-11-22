import assert from "node:assert/strict";
import test from "node:test";
import { nextLocalDateKey, patientHealthRecordProgress } from "./patientHealthRecord.ts";

test("health record starts at 40% with the four missing sections and advances as records are added", () => {
  const initial = patientHealthRecordProgress({}, [], []);
  assert.equal(initial.progress, 40);
  assert.deepEqual(initial.missingItems.map((item) => item.label), [
    "Allergies", "Health conditions", "Current medicines", "Lab report",
  ]);

  const updated = patientHealthRecordProgress(
    { history: { allergies: ["Penicillin"], medical: ["Thyroid condition"] } },
    [{ status: "active", name: "Folic acid" }],
    [{ id: 1 }],
  );
  assert.equal(updated.progress, 100);
  assert.deepEqual(updated.missingItems, []);
});

test("next-day reminders use the patient's local calendar date", () => {
  assert.equal(nextLocalDateKey(new Date(2026, 10, 22, 23, 45)), "2026-11-23");
});

test("patient-reported medicines needing review do not complete the current-medicines profile item", () => {
  const progress = patientHealthRecordProgress(
    { history: { drug: ["Folic acid", "Thyroid tablet"] } },
    [{ status: "active", name: "Thyroid tablet", notes: "Exact thyroid product requires clinician reconciliation." }],
    [],
  );
  assert.equal(progress.items.find((item) => item.id === "medications")?.complete, false);
  assert.ok(progress.missingItems.some((item) => item.id === "medications"));
});
