import assert from "node:assert/strict";
import test from "node:test";
import {
  appointmentLabel,
  readAppointmentHistory,
  visitTrail,
} from "./visitTrail";

test("keeps appointment-only dates and joins encounters only by appointment ID", () => {
  const appointments = [
    { id: 1, patientId: 7, date: "2024-10-04", vitals: { bp: "110/70" } },
    { id: 2, patientId: 7, date: "2026-10-31", vitals: { weight: "64" } },
    { id: 3, patientId: 7, date: "2026-10-31", type: "USG" },
    { id: 4, patientId: 7, date: "2026-11-07", type: "Lab Test" },
  ];
  const visits = [
    { id: 2, appointmentId: 2, date: "2026-10-31", vitals: { weight: "65" } },
  ];
  const trail = visitTrail(visits, appointments);
  assert.equal(trail.length, 4);
  assert.equal(trail[0].date, "2026-11-07");
  assert.equal(trail.filter((row) => row.date === "2026-10-31").length, 2);
  assert.deepEqual(trail.find((row) => !row.appointmentOnly)?.vitals, {
    weight: "65",
  });
  assert.deepEqual(trail.at(-1)?.vitals, { bp: "110/70" });
  assert.equal(trail.at(-1)?.prescriptions, undefined);
  assert.equal(trail.at(-1)?.examination, undefined);
});

test("preserves possible duplicates and multiple notes without guessing by date", () => {
  const appointments = [
    { id: 1, date: "2024-10-04" },
    { id: 2, date: "2024-10-04" },
  ];
  assert.equal(visitTrail([], appointments).length, 2);
  assert.equal(
    visitTrail(
      [
        { id: 5, appointmentId: 1, date: "2024-10-04" },
        { id: 6, appointmentId: 1, date: "2024-10-04" },
      ],
      appointments,
    ).length,
    3,
  );
});

test("labels booked, completed, cancelled and unknown-status appointments without inventing attendance", () => {
  assert.equal(
    appointmentLabel({ date: "2026-11-07", status: "Booked" }, "2026-11-01"),
    "Upcoming booking · Booked",
  );
  assert.equal(
    appointmentLabel({ date: "2024-10-04", status: "Completed" }, "2026-11-01"),
    "Completed appointment",
  );
  assert.equal(
    appointmentLabel({ date: "2026-11-07", status: "Cancelled" }, "2026-11-01"),
    "Cancelled",
  );
  assert.equal(
    appointmentLabel({ date: "2024-10-04" }, "2026-11-01"),
    "Appointment · status not recorded",
  );
});

test("rejects invalid API lists and records for another patient", () => {
  assert.throws(() => readAppointmentHistory({}, 7));
  assert.throws(() =>
    readAppointmentHistory([{ id: 1, patientId: 8, date: "2024-10-04" }], 7),
  );
  assert.throws(() =>
    readAppointmentHistory([{ id: 1, patientId: 7, date: "2024-02-30" }], 7),
  );
  assert.equal(
    readAppointmentHistory([{ id: 1, patientId: 7, date: "2024-10-04" }], 7)
      .length,
    1,
  );
});

test("report-only dates remain navigable and never become consultation records", () => {
  const trail = visitTrail(
    [],
    [],
    [
      { id: 9, date: "2025-02-03", name: "Historical report" },
      { id: 10, date: "invalid" },
    ],
  );
  assert.equal(trail[0].date, "2025-02-03");
  assert.equal(trail[0].reportOnly, true);
  assert.equal(trail[0].document?.name, "Historical report");
  assert.equal(trail[0].prescriptions, undefined);
  assert.equal(trail[1].date, "");
});
