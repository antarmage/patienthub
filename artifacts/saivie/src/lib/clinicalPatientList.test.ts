import assert from "node:assert/strict";
import test from "node:test";
import { compareClinicalPatients, matchesPatientTab, matchesTrimester, patientGestation, patientRisk, type ClinicalDirectoryPatient } from "./clinicalPatientList.ts";
import { directoryPatientIds } from "./patientDirectory.ts";

const today = "2026-11-01";
const patient: ClinicalDirectoryPatient = { id: 1, name: "Test Patient", type: "Pregnancy", lmp: "2026-02-01" };

test("pregnancy dating uses real LMP and rejects missing, impossible, future and stale dates", () => {
  const result = patientGestation(patient, today);
  assert.equal(result.weeks, 39);
  assert.equal(result.days, 0);
  assert.equal(result.dating?.dueDate, "2026-11-08");
  for (const lmp of ["", "2026-02-30", "2027-01-01", "2024-01-01"]) {
    assert.equal(patientGestation({ ...patient, lmp }, today).dating, null);
  }
  assert.equal(patientGestation({ ...patient, pregnancyStatus: "Delivered" }, today).pregnant, false);
  assert.equal(patientGestation({ ...patient, type: "PCOS", condition: null }, today).pregnant, false);
});

test("trimester thresholds include exact boundaries and do not classify undated patients", () => {
  assert.equal(matchesTrimester(13, "first"), true);
  assert.equal(matchesTrimester(14, "first"), false);
  assert.equal(matchesTrimester(14, "second"), true);
  assert.equal(matchesTrimester(27, "second"), true);
  assert.equal(matchesTrimester(28, "second"), false);
  assert.equal(matchesTrimester(28, "third"), true);
  assert.equal(matchesTrimester(36, "near-term"), false);
  assert.equal(matchesTrimester(37, "near-term"), true);
  assert.equal(matchesTrimester(null, "third"), false);
  assert.equal(matchesTrimester(null, "all"), true);
});

test("clinical tabs use recorded risk and valid dated follow-ups, never invented low risk", () => {
  const ids = new Set<string>();
  assert.equal(patientRisk(patient), "Not assessed");
  assert.equal(matchesPatientTab(patient, "high-risk", today, ids), false);
  assert.equal(matchesPatientTab({ ...patient, riskScore: { level: "Critical" } }, "high-risk", today, ids), true);
  assert.equal(matchesPatientTab({ ...patient, type: "PCOS (insulin resistant)" }, "pcos", today, ids), true);
  for (const nextReview of ["2026-10-31", today]) assert.equal(matchesPatientTab({ ...patient, nextReview }, "follow-ups", today, ids), true);
  for (const nextReview of ["2026-11-02", "Next week", "2026-02-30", ""]) assert.equal(matchesPatientTab({ ...patient, nextReview }, "follow-ups", today, ids), false);
});

test("today count deduplicates patients and excludes canceled appointments", () => {
  const ids = directoryPatientIds([
    { patientId: 1, date: today }, { patientId: 1, date: today, status: "completed" },
    { patientId: 2, date: today, status: "cancelled" }, { patientId: 3, date: "2026-11-02" },
  ], today, today);
  assert.equal(ids.size, 1);
  assert.equal(matchesPatientTab(patient, "today", today, ids), true);
});

test("sorts put missing dates last and highest recorded risk first", () => {
  const undated = { ...patient, id: 2, name: "A Patient", lmp: null };
  assert.ok(compareClinicalPatients(patient, undated, "due-date", today) < 0);
  assert.ok(compareClinicalPatients({ ...patient, nextReview: today }, undated, "next-review", today) < 0);
  assert.ok(compareClinicalPatients({ ...patient, riskScore: { level: "High" } }, undated, "risk", today) < 0);
});
