import assert from "node:assert/strict";
import test from "node:test";
import { matchesReceptionFilter, receptionLate, receptionStage, receptionTimeMinutes, receptionWeek, type ReceptionAppointment } from "./receptionTimeline.ts";

const appointment: ReceptionAppointment = { id: 1, patientId: 2, providerId: 3, date: "2026-11-01", time: "09:30 AM", status: "scheduled" };
const now = new Date(2026, 10, 1, 10, 0);

test("timeline starts weeks on Monday across month boundaries", () => {
  assert.deepEqual(receptionWeek("2026-11-01"), ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  assert.equal(receptionWeek("2026-11-01", -1)[0], "2026-10-19");
  assert.equal(receptionWeek("2026-11-02")[0], "2026-11-02");
});

test("reception stages match doctor queue status without clinical details", () => {
  assert.equal(receptionStage(appointment), "Scheduled");
  assert.equal(receptionStage({ ...appointment, status: "checked-in" }), "Arrived");
  assert.equal(receptionStage({ ...appointment, status: "in-consultation" }), "With doctor");
  assert.equal(receptionStage({ ...appointment, completedAt: "2026-11-01T10:00:00Z" }), "Done");
  assert.equal(receptionStage({ ...appointment, status: "no_show" }), "No-show");
  assert.equal(receptionStage({ ...appointment, status: "cancelled", checkedInAt: "today" }), "Cancelled");
});

test("running late is only a scheduled appointment before today's clock time", () => {
  assert.equal(receptionLate(appointment, now), true);
  assert.equal(receptionLate({ ...appointment, time: "11:00 AM" }, now), false);
  assert.equal(receptionLate({ ...appointment, date: "2026-10-31" }, now), false);
  assert.equal(receptionLate({ ...appointment, checkedInAt: "2026-11-01T09:00:00Z" }, now), false);
  assert.equal(receptionLate({ ...appointment, time: "25:99" }, now), false);
  assert.equal(receptionTimeMinutes("12:00 AM"), 0);
  assert.equal(receptionTimeMinutes("12:00 PM"), 720);
  assert.equal(receptionTimeMinutes("01:00 PM"), 780);
});

test("logistics filters use recorded payment and follow-up status and tomorrow's dates", () => {
  assert.equal(matchesReceptionFilter(appointment, "payment", now), false);
  assert.equal(matchesReceptionFilter({ ...appointment, paymentStatus: "pending" }, "payment", now), true);
  assert.equal(matchesReceptionFilter({ ...appointment, paymentStatus: "paid" }, "payment", now), false);
  assert.equal(matchesReceptionFilter({ ...appointment, paymentStatus: "pending", status: "cancelled" }, "payment", now), false);
  assert.equal(matchesReceptionFilter({ ...appointment, visitType: "Follow-up" }, "follow-up", now), true);
  assert.equal(matchesReceptionFilter({ ...appointment, visitType: "Follow-up", status: "checked-in" }, "follow-up", now), false);
  assert.equal(matchesReceptionFilter({ ...appointment, date: "2026-11-02" }, "tomorrow", now), true);
  assert.equal(matchesReceptionFilter({ ...appointment, date: "2026-11-02", status: "cancelled" }, "tomorrow", now), false);
});
