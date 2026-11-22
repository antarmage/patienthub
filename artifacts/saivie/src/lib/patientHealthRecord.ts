import { hasHistoryValue, historyRecord } from "./receptionPatientHistory.ts";
import { patientMedicationNeedsReview } from "./patientMedicationDisplay.ts";

export type HealthRecordItemId = "allergies" | "conditions" | "medications" | "lab-report";

const HEALTH_RECORD_ITEMS: { id: HealthRecordItemId; label: string }[] = [
  { id: "allergies", label: "Allergies" },
  { id: "conditions", label: "Health conditions" },
  { id: "medications", label: "Current medicines" },
  { id: "lab-report", label: "Lab report" },
];

export function patientHealthRecordProgress(patient: unknown, medications: unknown[], labResults: unknown[]) {
  const patientRecord = historyRecord(patient);
  const record = historyRecord(patientRecord.history);
  const onboarding = historyRecord(record.onboarding);
  const health = historyRecord(onboarding.health);
  const activeMedications = medications.filter((medication) =>
    medication && typeof medication === "object" &&
    String((medication as Record<string, unknown>).status ?? "").toLowerCase() === "active");
  const confirmedMedications = activeMedications.filter((medication) =>
    !patientMedicationNeedsReview((medication as Record<string, unknown>).notes));

  const complete: Record<HealthRecordItemId, boolean> = {
    allergies: hasHistoryValue(record.allergies) || hasHistoryValue(health.allergies),
    conditions: hasHistoryValue(patientRecord.condition) || hasHistoryValue(record.medical) ||
      hasHistoryValue(health.conditions) || hasHistoryValue(health.medicalDetails),
    medications: confirmedMedications.length > 0,
    "lab-report": labResults.length > 0,
  };
  const items = HEALTH_RECORD_ITEMS.map((item) => ({ ...item, complete: complete[item.id] }));
  const completedCount = items.filter((item) => item.complete).length;

  return {
    // The core profile contributes 40%; each of the four health-record items adds 15%.
    progress: 40 + completedCount * 15,
    items,
    missingItems: items.filter((item) => !item.complete),
  };
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nextLocalDateKey(date: Date): string {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return localDateKey(next);
}
