import assert from "node:assert/strict";
import test from "node:test";
import { adjustBookingTime, bookingScheduleOverlap, validBookingTime } from "./bookingSchedule";

test("exact times validate ranges and five-minute arrows wrap across noon and midnight", () => {
    assert.ok(validBookingTime("10:37"));
    for (const time of ["24:00", "12:60", "", "9:00"]) assert.ok(!validBookingTime(time));
    assert.equal(adjustBookingTime("11:58", 5), "12:03");
    assert.equal(adjustBookingTime("23:58", 5), "00:03");
    assert.equal(adjustBookingTime("00:00", -5), "23:55");
    assert.equal(adjustBookingTime("", 60), "10:00");
});
test("overlap checks use recorded duration or end time, exclude cancellations and do not block adjacency", () => {
    const appointment = { id: 1, providerId: 2, date: "2026-11-05", time: "10:15 AM", duration: 30 };
    assert.ok(bookingScheduleOverlap(appointment, appointment.date, "10:30", 30));
    assert.ok(!bookingScheduleOverlap(appointment, appointment.date, "10:45", 30));
    assert.ok(!bookingScheduleOverlap({ ...appointment, status: "cancelled" }, appointment.date, "10:30", 30));
    assert.ok(bookingScheduleOverlap({ ...appointment, duration: null, endTime: "10:45 AM" }, appointment.date, "10:30", 30));
    assert.ok(bookingScheduleOverlap({ ...appointment, date: "2026-11-04", time: "23:45", duration: 60 }, appointment.date, "00:15", 30));
    assert.ok(bookingScheduleOverlap({ ...appointment, duration: null }, appointment.date, "10:00", 30));
    assert.ok(!bookingScheduleOverlap({ ...appointment, time: "invalid" }, appointment.date, "10:00", 30));
});
