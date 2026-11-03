import assert from "node:assert/strict";
import test from "node:test";
import { recordsForPregnancyEpisode, unrecordedPregnancyDoses, type PregnancyVaccineRecord } from "./pregnancyVaccines.ts";

const schedule = { id: 8, doseGestationalWeeks: [12, 16, 27] };
const record = (id: number, pregnancyEpisodeId: number, doseNumber: number): PregnancyVaccineRecord => ({
  id,
  scheduleId: schedule.id,
  doseNumber,
  administeredDate: "2026-03-01",
  pregnancyEpisodeId,
});

test("doses recorded in another pregnancy do not count for the current pregnancy", () => {
  const records = [record(1, 21, 1)];
  assert.deepEqual(recordsForPregnancyEpisode(records, 22), []);
  assert.deepEqual(unrecordedPregnancyDoses(schedule, records, 22), [
    { number: 1, week: 12 },
    { number: 2, week: 16 },
    { number: 3, week: 27 },
  ]);
});

test("only doses recorded for the current episode advance its series", () => {
  const records = [record(1, 21, 1), record(2, 22, 1), record(3, 22, 2)];
  assert.deepEqual(unrecordedPregnancyDoses(schedule, records, 22), [{ number: 3, week: 27 }]);
  assert.deepEqual(unrecordedPregnancyDoses(schedule, records, null), []);
});
