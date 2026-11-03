import assert from "node:assert/strict";
import test from "node:test";
import { canManageVaccinationSchedules, canUseVaccinationWorkflow } from "./vaccination-access";

test("doctors and receptionists can use patient vaccine records, but patients and unrelated roles cannot", () => {
  for (const role of ["clinician", "owner", "receptionist", "staff"]) {
    assert.equal(canUseVaccinationWorkflow({ userId: "user", role }), true);
  }
  assert.equal(canUseVaccinationWorkflow({ patientId: 7 }), false);
  assert.equal(canUseVaccinationWorkflow({ userId: "user", role: "admin" }), false);
  assert.equal(canUseVaccinationWorkflow(null), false);
});

test("only doctors and owners can change vaccine schedules", () => {
  assert.equal(canManageVaccinationSchedules({ userId: "doctor", role: "clinician" }), true);
  assert.equal(canManageVaccinationSchedules({ userId: "owner", role: "owner" }), true);
  assert.equal(canManageVaccinationSchedules({ userId: "reception", role: "receptionist" }), false);
  assert.equal(canManageVaccinationSchedules({ patientId: 7 }), false);
});
