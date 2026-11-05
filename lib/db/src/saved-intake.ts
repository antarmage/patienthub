import { z } from "zod/v4";

const text = z.string().max(10000).default("");
const list = z.array(z.string().max(1000)).max(100).default([]);
export const savedIntakeSchema = z.object({
  name: text, dob: text, referredBy: text, occupation: text, chiefComplaint: text, concerns: list,
  consultation: z.object({ directions: list, answers: z.record(z.string().max(1000), z.string().max(10000)).default({}) }).prefault({}),
  pain: z.object({ location: list, duration: text, severity: text, relatedSymptoms: list }).prefault({}),
  cycle: z.object({ lastPeriod: text, regularity: text, lateBy: text, pregnancyTest: text, menarcheAge: text,
    cycleLength: text, flow: text, symptoms: list, details: text }).prefault({}),
  gyn: z.object({ firstEncounterAge: text, partnerCount: text, lastPap: text, sexuallyActive: text, hpvVaccine: text,
    birthControl: list, concerns: list, details: text }).prefault({}),
  pregnancies: z.object({ currentStatus: text, weeksPregnant: text, dueDate: text, conceptionMethod: text, conceptionDetails: text,
    total: text, vaginal: text, cesarean: text, miscarriages: text, terminations: text, premature: text, details: text }).prefault({}),
  lifestyle: z.object({ smoking: text, relationship: text, alcohol: text, exercise: text, mammogram: text,
    colonoscopy: text, other: text }).prefault({}),
  health: z.object({ conditions: list, medicalDetails: text, surgeries: text, medications: text, allergies: text, familyHistory: text }).prefault({}),
});
export type SavedIntake = z.infer<typeof savedIntakeSchema>;

export function readSavedIntake(history: unknown): SavedIntake | null {
  if (!history || typeof history !== "object" || !("onboarding" in history) || history.onboarding == null) return null;
  return savedIntakeSchema.parse(history.onboarding);
}
