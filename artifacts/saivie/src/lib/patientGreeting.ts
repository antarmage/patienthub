export function patientGreetingName(name: string | null | undefined): string {
  if (!name) return "";
  const titles = new Set(["mr", "mrs", "ms", "miss", "mx", "dr", "smt", "shri", "master", "baby"]);
  const parts = name.trim().split(/\s+/);
  const first = parts.find((part) => !titles.has(part.replace(/\./g, "").toLowerCase()));
  return first || parts[0] || "";
}

const modeLabels: Record<string, string> = { general: "Cycle Health", ttc: "Trying to Conceive", ivf: "IVF Support" };

// Shows a cycle day only when a valid recent LMP is recorded; otherwise the honest mode label.
export function cycleSubtitle(lmp: string | null | undefined, mode: string, now = new Date()): string {
  const label = modeLabels[mode] || "Cycle Health";
  if (!lmp || !/^\d{4}-\d{2}-\d{2}/.test(lmp)) return label;
  const start = new Date(`${lmp.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return label;
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
  if (day < 1 || day > 45) return label;
  return `Day ${day} of cycle`;
}
