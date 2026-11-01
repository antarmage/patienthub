import assert from "node:assert/strict";
import test from "node:test";
import {
  readPregnancyFollowUps,
  pregnancyFollowUpLabel,
} from "./pregnancyFollowUps";

test("saved plan responses must match requested patients and contain real dates and source labels", () => {
  const plan = {
    episodeId: 1,
    datingKey: "1:LMP:2026-01-01",
    date: "2026-11-02",
    source: "milestone",
    reason: "Timing prompt",
    sourceRecord: "milestone:36",
  };
  assert.deepEqual(readPregnancyFollowUps({ 1: plan, 2: null }, [1, 2]), {
    1: plan,
    2: null,
  });
  for (const value of [
    { 3: plan },
    {},
    { 1: { ...plan, date: "2026-02-30" } },
    { 1: { ...plan, source: "booked" } },
    { 1: { ...plan, date: null } },
    [],
  ])
    assert.throws(() => readPregnancyFollowUps(value, [1]), /follow-up API/i);
  assert.ok(pregnancyFollowUpLabel("milestone").includes("not booked"));
  assert.ok(pregnancyFollowUpLabel("prescription").includes("Prescribed"));
});
