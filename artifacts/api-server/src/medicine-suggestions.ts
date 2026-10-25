export interface MedicineSuggestion {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
  route: string;
  genericName: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function buildMedicineSuggestions(catalog: unknown[], prescriptions: unknown[], medications: unknown[]): MedicineSuggestion[] {
  const suggestions = new Map<string, MedicineSuggestion>();
  const genericNames = new Map<string, string>();
  catalog.forEach((entry) => {
    if (entry && typeof entry === "object" && "name" in entry && "genericName" in entry) {
      genericNames.set(text(entry.name).toLowerCase(), text(entry.genericName));
    }
  });
  const add = (input: unknown, fromCatalog = false) => {
    if (!input || typeof input !== "object") return;
    const row = input as Record<string, unknown>;
    const name = text(row.name);
    if (!name || (fromCatalog && row.isActive === false)) return;
    const suggestion: MedicineSuggestion = {
      name,
      dose: text(fromCatalog ? row.defaultDose : row.dose || row.dosage),
      frequency: text(fromCatalog ? row.defaultFrequency : row.frequency),
      duration: text(row.duration),
      instructions: text(row.instructions),
      route: text(row.route),
      genericName: fromCatalog ? text(row.genericName) : genericNames.get(name.toLowerCase()) || "",
    };
    const key = JSON.stringify([name, suggestion.dose, suggestion.frequency, suggestion.duration, suggestion.instructions, suggestion.route].map((value) => value.toLowerCase()));
    if (!suggestions.has(key)) suggestions.set(key, suggestion);
  };
  catalog.forEach((entry) => add(entry, true));
  prescriptions.forEach((prescription) => {
    const medicines = Array.isArray(prescription) ? prescription
      : prescription && typeof prescription === "object" && "medicines" in prescription ? prescription.medicines : [];
    if (Array.isArray(medicines)) medicines.forEach((medicine) => add(medicine));
  });
  medications.forEach((medicine) => add(medicine));
  return [...suggestions.values()];
}
