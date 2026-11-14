import { vitalsMeasurementSchema } from "../../../../lib/db/src/vitals-measurements";
import { clinicDate } from "../../../../lib/db/src/follow-up";

export function validateVitalsLmp(value: string, today = clinicDate()): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith("0000-") &&
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today
    ? null : "Enter a valid LMP date that is not in the future, or choose Not known.";
}

export const emptyVitals = { weight: "", height: "", systolic: "", diastolic: "", pulse: "", temp: "", spo2: "" };
export type VitalsEntry = typeof emptyVitals;
export const vitalsSteps = [
  { title: "Weight (kg)", fields: ["weight"], optional: false },
  { title: "Height (cm)", fields: ["height"], optional: false },
  { title: "Blood pressure (mmHg)", fields: ["systolic", "diastolic"], optional: false },
  { title: "Pulse (bpm)", fields: ["pulse"], optional: true },
  { title: "Temperature (°F)", fields: ["temp"], optional: true },
  { title: "SpO₂ (%)", fields: ["spo2"], optional: true },
] satisfies { title: string; fields: (keyof VitalsEntry)[]; optional: boolean }[];

export function validateVitalsStep(form: VitalsEntry, step: number): string | null {
  const entry = vitalsSteps[step];
  if (entry.fields.every((field) => !form[field].trim())) return entry.optional ? null : `${entry.title} is required.`;
  if (step === 2) {
    return vitalsMeasurementSchema.shape.bp.safeParse(`${form.systolic.trim()}/${form.diastolic.trim()}`).success
      ? null : "Enter both BP values: systolic 50–260, diastolic 30–180, with systolic higher than diastolic.";
  }
  const field = entry.fields[0];
  if (field === "systolic" || field === "diastolic") return "Enter both BP values.";
  const result = vitalsMeasurementSchema.shape[field].safeParse(form[field].trim());
  return result.success ? null : `Check ${entry.title}: ${result.error.issues.map((issue) => issue.message).join("; ")}`;
}

export function vitalsEntryPayload(form: VitalsEntry) {
  for (let step = 0; step < vitalsSteps.length; step++) {
    const error = validateVitalsStep(form, step);
    if (error) throw new Error(error);
  }
  return {
    bp: `${form.systolic.trim()}/${form.diastolic.trim()}`,
    weight: Number(form.weight), height: Number(form.height),
    pulse: form.pulse.trim() ? Number(form.pulse) : null,
    temp: form.temp.trim() ? Number(form.temp) : null,
    spo2: form.spo2.trim() ? Number(form.spo2) : null,
    bmi: Number((Number(form.weight) / (Number(form.height) / 100) ** 2).toFixed(1)),
  };
}
