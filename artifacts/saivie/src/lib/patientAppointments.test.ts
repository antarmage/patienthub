import assert from "node:assert/strict";
import test from "node:test";
import { appointmentStart, nextAppointment, upcomingAppointments } from "./patientAppointments";

const now = new Date("2026-11-17T15:00:00");
const apt = (over: object) => ({ id: 1, date: "2026-11-20", time: "10:00 AM", status: "scheduled", ...over });

test("appointment start parses 12-hour, 24-hour and missing times", () => {
  assert.equal(appointmentStart(apt({ time: "10:00 AM" }))!.getHours(), 10);
  assert.equal(appointmentStart(apt({ time: "2:30 PM" }))!.getHours(), 14);
  assert.equal(appointmentStart(apt({ time: "12:15 AM" }))!.getHours(), 0);
  assert.equal(appointmentStart(apt({ time: "14:45" }))!.getHours(), 14);
  assert.equal(appointmentStart(apt({ time: null }))!.getHours(), 0);
  assert.equal(appointmentStart(apt({ time: "whenever" }))!.getHours(), 0);
  assert.equal(appointmentStart(apt({ date: "not-a-date" })), null);
});

test("next appointment picks the earliest open future booking", () => {
  const list = [
    apt({ id: 1, date: "2026-11-25", time: "09:00 AM" }),
    apt({ id: 2, date: "2026-11-20", time: "04:00 PM" }),
    apt({ id: 3, date: "2026-11-20", time: "09:00 AM" }),
    apt({ id: 4, date: "2026-11-10" }),
  ];
  assert.equal(nextAppointment(list, now)!.id, 3);
  assert.deepEqual(upcomingAppointments(list, now).map((a) => a.id), [3, 2, 1]);
});

test("cancelled, no-show and completed bookings are excluded; today's earlier visit still shows", () => {
  const list = [
    apt({ id: 1, date: "2026-11-20", status: "Cancelled" }),
    apt({ id: 2, date: "2026-11-21", status: "no-show" }),
    apt({ id: 3, date: "2026-11-22", status: "completed" }),
    apt({ id: 4, date: "2026-11-17", time: "09:00 AM" }),
  ];
  assert.equal(nextAppointment(list, now)!.id, 4);
  assert.equal(nextAppointment([], now), null);
  assert.equal(nextAppointment(null, now), null);
  assert.equal(nextAppointment(undefined, now), null);
});
