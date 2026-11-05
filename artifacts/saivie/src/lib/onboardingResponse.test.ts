import assert from "node:assert/strict";
import test from "node:test";
import { readOnboardingSession } from "./onboardingResponse";

const legacy = {
  appointment: { id: 20, surveyKind: "consultation", chiefComplaint: null },
  patient: { id: 1, name: "Synthetic", dob: null, referredBy: null, hpvProtection: null },
  pregnancyContext: null,
};

test("older API payload produces actionable deployment error instead of raw schema failure or blank survey", () => {
  assert.throws(() => readOnboardingSession(legacy), /API server is still returning the older survey format/);
  assert.throws(() => readOnboardingSession({ ...legacy, savedIntake: null }), /deploy\/restart/);
});

test("updated API distinguishes no saved survey from a saved pre-update survey", () => {
  assert.equal(readOnboardingSession({ ...legacy, savedIntake: null, savedIntakeVersion: "version" }).savedIntake, null);
  const saved = readOnboardingSession({ ...legacy, savedIntake: { health: { medications: "Iron" } }, savedIntakeVersion: "version" });
  assert.equal(saved.savedIntake?.health.medications, "Iron");
  assert.equal(saved.savedIntake?.health.allergies, "");
});

test("invalid saved data and missing correction version never silently start an empty form", () => {
  for (const patch of [
    { savedIntake: { health: { conditions: "invalid" } }, savedIntakeVersion: "version" },
    { savedIntake: {}, savedIntakeVersion: null },
    { savedIntake: {}, savedIntakeVersion: "" },
  ]) assert.throws(() => readOnboardingSession({ ...legacy, ...patch }), /incomplete or invalid survey data/);
});
