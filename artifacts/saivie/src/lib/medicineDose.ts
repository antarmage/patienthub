export const DOSAGE_UNITS = ["mg", "mcg", "g", "mL", "L", "IU", "units", "tablet", "capsule", "drop", "puff", "sachet", "tsp", "tbsp", "application", "suppository"] as const;

export function splitMedicineDose(dose: string) {
  const match = dose.trim().match(/^((?:\d+(?:\.\d*)?|\.\d*)(?:\s*[/\-]\s*\d*(?:\.\d*)?)?)\s*(mg|mcg|g|ml|l|iu|units|tablets?|capsules?|drops?|puffs?|sachets?|tsp|tbsp|applications?|suppository|suppositories)$/i);
  if (!match) return { amount: dose, unit: "" };
  const suffix = match[2].toLowerCase();
  const unit = DOSAGE_UNITS.find((item) => item.toLowerCase() === suffix || `${item}s` === suffix)
    || (suffix === "suppositories" ? "suppository" : "");
  return { amount: match[1].trim(), unit };
}

export function formatMedicineDose(amount: string, unit: string) {
  if (!amount.trim()) return "";
  return [amount.trim(), unit].filter(Boolean).join(" ");
}
