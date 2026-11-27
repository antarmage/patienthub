export function patientGreetingName(name: string | null | undefined): string {
  if (!name) return "";
  const titles = new Set(["mr", "mrs", "ms", "miss", "mx", "dr", "smt", "shri", "master", "baby"]);
  const parts = name.trim().split(/\s+/);
  const first = parts.find((part) => !titles.has(part.replace(/\./g, "").toLowerCase()));
  return first || parts[0] || "";
}

export function localDemoCycleSample(name: string | null | undefined, hostname: string, now = new Date()) {
  if (patientGreetingName(name).toLowerCase() !== "demo" || !["localhost", "127.0.0.1"].includes(hostname)) return null;
  const lmp = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
  const date = `${lmp.getFullYear()}-${String(lmp.getMonth() + 1).padStart(2, "0")}-${String(lmp.getDate()).padStart(2, "0")}`;
  return { lmp: date, cycleLength: 28 };
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

export function estimateCyclePhase(
  lmp: string | null | undefined,
  cycleLength: unknown,
  now = new Date(),
) {
  const parsedLength = typeof cycleLength === "number"
    ? cycleLength
    : typeof cycleLength === "string" && /^\d+$/.test(cycleLength.trim())
      ? Number(cycleLength)
      : NaN;
  if (!Number.isInteger(parsedLength) || parsedLength < 21 || parsedLength > 35) return null;
  if (!lmp || !/^\d{4}-\d{2}-\d{2}/.test(lmp)) return null;

  const date = lmp.slice(0, 10);
  const [year, month, dayOfMonth] = date.split("-").map(Number);
  const lmpTime = Date.UTC(year, month - 1, dayOfMonth);
  if (!Number.isFinite(lmpTime) || new Date(lmpTime).toISOString().slice(0, 10) !== date) return null;

  const todayTime = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsedDays = (todayTime - lmpTime) / 86400000;
  if (!Number.isInteger(elapsedDays) || elapsedDays < 0 || elapsedDays >= parsedLength) return null;

  const cycleDay = elapsedDays + 1;
  // Calendar-based estimate: ovulation is approximated as 14 days before the next period.
  const estimatedOvulationDay = parsedLength - 14;
  return {
    cycleDay,
    estimatedOvulationDay,
    isEstimatedOvulationDay: cycleDay === estimatedOvulationDay,
    isPeakFertilityWindow: cycleDay >= estimatedOvulationDay - 2 && cycleDay <= estimatedOvulationDay,
  };
}

export function forecastCycleEnergy(cycleLength: unknown): number[] {
  const parsedLength = typeof cycleLength === "number"
    ? cycleLength
    : typeof cycleLength === "string" && /^\d+$/.test(cycleLength.trim())
      ? Number(cycleLength)
      : NaN;
  if (!Number.isInteger(parsedLength) || parsedLength < 21 || parsedLength > 35) return [];

  const ovulationDay = parsedLength - 14;
  return Array.from({ length: parsedLength }, (_, index) => {
    const day = index + 1;
    if (day <= 5) return 35 + day * 2;
    if (day < ovulationDay - 2) return Math.round(43 + ((day - 5) / Math.max(1, ovulationDay - 7)) * 32);
    if (day <= ovulationDay) return day === ovulationDay ? 82 : 72 + (day - (ovulationDay - 2)) * 5;
    if (day <= ovulationDay + 5) return Math.max(62, 78 - (day - ovulationDay) * 4);
    return Math.max(38, 62 - ((day - ovulationDay - 5) / Math.max(1, parsedLength - ovulationDay - 5)) * 24);
  });
}
