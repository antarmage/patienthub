import assert from "node:assert/strict";
import { it } from "node:test";
import { hpvClinicStatuses } from "./hpv-protection";

const schedules = [
  { id: 1, vaccineName: "HPV9", eligibility: "age", doseOffsetsMonths: [0, 6], doseGestationalWeeks: [] },
  { id: 2, vaccineName: "HPV9", eligibility: "age", doseOffsetsMonths: [0, 2, 6], doseGestationalWeeks: [] },
  { id: 3, vaccineName: "Tdap", eligibility: "pregnancy", doseOffsetsMonths: [], doseGestationalWeeks: [27] },
];

it("marks all doses of an HPV schedule as protected and partial doses as in progress", () => {
  const records = [
    { patientId: 10, scheduleId: 2, doseNumber: 1 },
    { patientId: 10, scheduleId: 2, doseNumber: 2 },
    { patientId: 10, scheduleId: 2, doseNumber: 3 },
    { patientId: 11, scheduleId: 2, doseNumber: 1 },
    { patientId: 11, scheduleId: 2, doseNumber: 3 },
    { patientId: 12, scheduleId: 3, doseNumber: 1 },
    { patientId: 13, scheduleId: 1, doseNumber: 1 },
    { patientId: 13, scheduleId: 1, doseNumber: 2 },
  ];
  assert.deepEqual(hpvClinicStatuses([10, 11, 12, 13], schedules, records), { 10: "protected", 11: "in-progress", 13: "protected" });
});

it("only reports the requested patients", () => {
  const records = [{ patientId: 10, scheduleId: 1, doseNumber: 1 }];
  assert.deepEqual(hpvClinicStatuses([99], schedules, records), {});
});
