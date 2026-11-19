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
  if (/active medication history added at explicit user request|saved patient-reported intake for appointment|not a new prescription or visit-specific continuation order/i.test(trimmedNote)) return "";
  return trimmedNote;
}
