import assert from "node:assert/strict";
import test from "node:test";
import { readSavedIntake, savedIntakeSchema } from "../../../lib/db/src/saved-intake";
import { correctedIntakeHistory, savedIntakeVersion } from "./saved-intake";
import { summaryRecord } from "../../../lib/db/src/patient-summary";

test("legacy survey fields hydrate without guessing skipped answers or exposing clinician history", () => {
  const saved = readSavedIntake({ onboarding: {
    name: "Synthetic", concerns: ["Pregnancy care"], health: { conditions: ["Anemia"], medications: "Iron\nCalcium", allergies: "Penicillin" },
    pregnancies: { total: "3", cesarean: "1" }, clinicianNote: "private",
  }, clinician: { diagnosis: "private" }, pregnancyFollowUps: { "20": { answers: "private" } } });
  assert.ok(saved);
  assert.equal(saved.health.medications, "Iron\nCalcium");
  assert.deepEqual(saved.health.conditions, ["Anemia"]);
  assert.equal(saved.pregnancies.cesarean, "1");
  assert.equal(saved.pregnancies.miscarriages, "");
  assert.equal(saved.gyn.hpvVaccine, "");
  assert.ok(!JSON.stringify(saved).includes("private"));
  assert.equal(readSavedIntake({}), null);
  assert.throws(() => readSavedIntake({ onboarding: { health: { conditions: "invalid" } } }));
});

test("correction retains original stamp, previous exact survey and other encounters without accepting server-owned fields", () => {
  const original = { name: "Synthetic", health: { allergies: "Penicillin" } };
  const history = { onboarding: original, onboardingAppointmentId: 10, clinician: { note: "unchanged" },
    pregnancyFollowUps: { "20": { answers: { foodHabits: "Saved" } } } };
  const previous = readSavedIntake(history);
  const changed = savedIntakeSchema.parse({ ...previous, health: { ...previous!.health, allergies: "Penicillin\nLatex" } });
  const result = correctedIntakeHistory(history, { ...changed, clinician: "untrusted" }, savedIntakeVersion(previous), 20);
  assert.equal(result.onboardingAppointmentId, 10);
  assert.deepEqual(result.clinician, history.clinician);
  assert.deepEqual(result.pregnancyFollowUps, history.pregnancyFollowUps);
  assert.equal(result.onboarding.health.allergies, "Penicillin\nLatex");
  assert.deepEqual(summaryRecord(result.onboardingCorrections[0]).previous, original);
  assert.equal(summaryRecord(result.onboardingCorrections[0]).appointmentId, 20);
  assert.deepEqual(history.onboarding, original);
  assert.throws(() => correctedIntakeHistory(result, changed, savedIntakeVersion(previous), 20), /saved survey has changed/);
  const again = correctedIntakeHistory(result, changed, savedIntakeVersion(readSavedIntake(result)), 20);
  assert.equal(again.onboardingCorrections.length, 2);
});
