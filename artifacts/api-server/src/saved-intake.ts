import { createHash } from "node:crypto";
import { readSavedIntake, savedIntakeSchema, type SavedIntake } from "../../../lib/db/src/saved-intake";
import { summaryRecord } from "../../../lib/db/src/patient-summary";

export const savedIntakeVersion = (intake: SavedIntake | null) =>
  createHash("sha256").update(JSON.stringify(intake)).digest("hex");

export function correctedIntakeHistory(history: unknown, intake: unknown, expectedVersion: unknown, appointmentId: number):
  Record<string, unknown> & { onboarding: SavedIntake; onboardingCorrections: unknown[] } {
  const record = summaryRecord(history);
  const previous = readSavedIntake(record);
  if (!previous || expectedVersion !== savedIntakeVersion(previous))
    throw Object.assign(new Error("The saved survey has changed. Reload your private link before correcting it."), { status: 409 });
  const answers = savedIntakeSchema.parse(intake);
  const revisions = record.onboardingCorrections;
  if (revisions != null && !Array.isArray(revisions))
    throw new Error("Saved survey correction history is invalid. Ask the clinic to review this record.");
  return { ...record, onboarding: answers,
    onboardingCorrections: [...(revisions || []), { previous: record.onboarding, appointmentId, correctedAt: new Date().toISOString() }] };
}
