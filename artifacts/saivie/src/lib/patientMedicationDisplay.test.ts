import assert from "node:assert/strict";
import test from "node:test";
import { patientMedicationCategory, patientMedicationNote } from "./patientMedicationDisplay.ts";

test("patient medication categories use simple labels for pregnancy medicines", () => {
  assert.equal(patientMedicationCategory("Folic acid"), "Supplement");
  assert.equal(patientMedicationCategory("Thyroid tablet"), "Thyroid medicine");
  assert.equal(patientMedicationCategory("Progesterone", "Intramuscular injection"), "Injection");
  assert.equal(patientMedicationCategory("Metformin"), "Medicine");
});

test("internal medication history audit text is hidden without hiding useful instructions", () => {
  assert.equal(patientMedicationNote("Active medication history added at explicit user request via Copilot on 2026-11-06."), "");
  assert.equal(patientMedicationNote("Source: saved patient-reported intake for appointment 942."), "");
  assert.equal(patientMedicationNote("Exact thyroid product requires clinician reconciliation. Not a new prescription or visit-specific continuation order."), "");
  assert.equal(patientMedicationNote("Take with food"), "Take with food");
  assert.equal(patientMedicationNote(null), "");
});
