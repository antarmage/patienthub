import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentCalendar, type CalendarAppointment } from "./AppointmentCalendar";

function render(appointments: CalendarAppointment[] = [], isLoading = false, error: Error | null = null) {
  return renderToStaticMarkup(<AppointmentCalendar
    date="2026-11-04" onDate={() => {}} appointments={appointments}
    patients={[{ id: 1, name: "Synthetic patient" }]} onOpenPatient={() => {}}
    isLoading={isLoading} error={error}
  />);
}

test("the selected day's empty schedule has a card even when other dates have appointments", () => {
  const html = render([{ id: 1, patientId: 1, date: "2026-11-05", time: "09:00" }]);
  assert.match(html, /data-testid="schedule-empty-card"/);
  assert.match(html, /No appointments scheduled for this day/);
  assert.match(html, /Select another date/);
  assert.doesNotMatch(html, /calendar-appointment-1/);
});

test("loading, errors and populated schedules do not show the empty card", () => {
  for (const html of [
    render([], true),
    render([], false, new Error("Schedule unavailable")),
    render([{ id: 1, patientId: 1, date: "2026-11-04", time: "09:00" }]),
  ]) assert.doesNotMatch(html, /schedule-empty-card/);
  assert.match(render([], true), /Loading appointments/);
  assert.match(render([], false, new Error("Schedule unavailable")), /Schedule unavailable/);
  assert.match(render([{ id: 1, patientId: 1, date: "2026-11-04" }]), /calendar-appointment-1/);
});
