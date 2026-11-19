export type PatientMedicationCategory = "Supplement" | "Injection" | "Thyroid medicine" | "Medicine";

export function patientMedicationCategory(name: unknown, route?: unknown): PatientMedicationCategory {
  const medicationName = typeof name === "string" ? name.toLowerCase() : "";
  const medicationRoute = typeof route === "string" ? route.toLowerCase() : "";
  const isSupplement = ["vitamin", "folic", "iron", "calcium", "shelcal", "orofer", "uprise"]
    .some((term) => medicationName.includes(term));
  const isInjection = medicationRoute.includes("intramuscular") || medicationRoute.includes("injection") ||
    medicationName.includes("injection") || medicationName.includes("proluton");

  if (isSupplement) return "Supplement";
  if (isInjection) return "Injection";
  if (medicationName.includes("thyroid")) return "Thyroid medicine";
  return "Medicine";
}

export function patientMedicationNote(note: unknown): string {
  if (typeof note !== "string") return "";
  const trimmedNote = note.trim();
  if (!trimmedNote) return "";
  if (patientMedicationNeedsReview(trimmedNote)) {
    const appointmentMatch = trimmedNote.match(/appointment\s+(\d+)/i);
    const appointmentText = appointmentMatch ? ` for appointment ${appointmentMatch[1]}` : "";
    return `Saved from the patient's reported intake survey${appointmentText}. The exact product, strength, dose, frequency and duration are not confirmed; please ask a clinician to review this entry before use or continuation.`;
  }
  return trimmedNote;
}

export function patientMedicationNeedsReview(note: unknown): boolean {
  if (typeof note !== "string") return false;
  return /active medication history added at explicit user request|saved patient-reported intake for appointment|exact (?:thyroid )?product|not a new prescription or visit-specific continuation order/i.test(note);
}
