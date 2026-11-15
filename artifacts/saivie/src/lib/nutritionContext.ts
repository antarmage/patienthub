import { clinicalCareMode } from "./clinicalCareMode";

type NutritionPatient = {
  type?: unknown;
  mode?: unknown;
  pregnancyStatus?: unknown;
  history?: unknown;
  meta?: { phase?: unknown; tdee?: unknown; activity?: unknown } | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function nutritionPhase(patient: NutritionPatient): { label: string; value: string; detail?: string } {
  const status = typeof patient.pregnancyStatus === "string" ? patient.pregnancyStatus.trim().toLowerCase() : "";
  if (["completed", "aborted", "not_continuing"].includes(status))
    return { label: "Pregnancy status", value: "Not currently active", detail: "Review recorded pregnancy status" };

  const onboarding = record(record(patient.history).onboarding);
  const intakeStatus = record(onboarding.pregnancies).currentStatus;
  if (status === "active" || status === "pregnant" || intakeStatus === "Yes" || clinicalCareMode(patient) === "pregnancy")
    return { label: "Pregnancy status", value: "Pregnant", detail: "Cycle phase not applicable" };

  const phase = typeof patient.meta?.phase === "string" ? patient.meta.phase.trim() : "";
  return { label: "Current phase", value: phase || "Not recorded" };
}

export function recordedNutritionEnergy(patient: NutritionPatient, target: unknown) {
  const positiveNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  return {
    expenditure: positiveNumber(patient.meta?.tdee),
    target: positiveNumber(target),
    activity: typeof patient.meta?.activity === "string" && patient.meta.activity.trim() ? patient.meta.activity.trim() : null,
  };
}
