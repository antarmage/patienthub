import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ClinicalPatientList } from "./ClinicalPatientList";
import type { ClinicalDirectoryPatient } from "@/lib/clinicalPatientList";
import type { DirectoryAppointment } from "@/lib/patientDirectory";
import { indiaToday } from "@/lib/pregnancyOverview";

const patient: ClinicalDirectoryPatient = {
  id: 1,
  name: "Synthetic pregnant patient",
  dob: "1996-01-01",
  age: 0,
  type: "Pregnancy",
  pregnancyStatus: "pregnant",
  lmp: "2026-01-01",
  pregnancyFollowUp: {
    episodeId: 1,
    datingKey: "synthetic",
    date: "2020-01-01",
    source: "milestone",
    reason: "Birth plan & presentation check",
    sourceRecord: "milestone:36",
  },
};
function render(appointments: DirectoryAppointment[] = [], fixture = patient) {
  return renderToStaticMarkup(
    <ClinicalPatientList
      patients={[fixture]}
      allPatients={[fixture]}
      appointments={appointments}
      loadingAppointments={false}
      appointmentsAvailable
      loadingPatients={false}
      patientsAvailable
      onOpen={() => {}}
      children={null}
    />,
  );
}
test("unbooked saved follow-up replaces no-upcoming-visit and remains visibly overdue", () => {
  const html = render();
  assert.ok(html.includes("Milestone follow-up · not booked"));
  assert.ok(html.includes("Overdue follow-up"));
  assert.ok(!html.includes("No upcoming visit"));
  assert.ok(html.includes("30 y"));
});
test("booked appointment stays distinct from a prescribed or milestone follow-up", () => {
  const html = render([
    { patientId: 1, date: indiaToday(), time: "09:00", status: "scheduled" },
  ]);
  assert.ok(html.includes("Booked appointment"));
  assert.ok(html.includes("09:00"));
  assert.ok(html.includes("Milestone follow-up · not booked"));
  assert.ok(html.includes("Overdue follow-up"));
});
