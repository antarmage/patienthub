export interface SummaryVisit {
  id: number;
  date: string;
  chiefComplaint?: string | null;
  subjective?: string | null;
  assessment?: string | null;
  diagnosis?: string | null;
  planNotes?: string | null;
  followUpPlan?: string | null;
  vitals?: unknown;
}

export interface SummaryLab {
  testName: string;
  date: string;
  value?: number | null;
  unit?: string | null;
  status?: string | null;
  results?: unknown;
}

export interface SummaryPoint {
  date: string;
  value: number;
  secondary?: number;
  source: string;
}

export function summaryRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numeric(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+(\.\d+)?$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function dateKey(value: string): string | null {
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

export function summaryTrends(
  visits: SummaryVisit[],
  bpLogs: { date?: string; systolic: number; diastolic: number }[],
  weightLogs: { date?: string; weight: number; unit?: string }[],
  labs: SummaryLab[],
) {
  const bp: SummaryPoint[] = [];
  const weight: SummaryPoint[] = [];
  const hb: SummaryPoint[] = [];
  const pulse: SummaryPoint[] = [];
  const fetalHeart: SummaryPoint[] = [];
  const fundalHeight: SummaryPoint[] = [];
  for (const visit of visits) {
    const vitals = summaryRecord(visit.vitals);
    const reading = typeof vitals.bp === "string" ? vitals.bp.match(/^(\d+)\s*\/\s*(\d+)$/) : null;
    if (reading && Number(reading[1]) > 0 && Number(reading[2]) > 0) bp.push({ date: visit.date, value: Number(reading[1]), secondary: Number(reading[2]), source: "Visit" });
    const kg = numeric(vitals.weight);
    if (kg !== null) weight.push({ date: visit.date, value: kg, source: "Visit" });
    const hemoglobin = numeric(vitals.hb);
    if (hemoglobin !== null) hb.push({ date: visit.date, value: hemoglobin, source: "Visit" });
    for (const [field, points] of [["pulse", pulse], ["fetalHeartRate", fetalHeart], ["fundalHeight", fundalHeight]] as const) {
      const value = numeric(vitals[field]);
      if (value !== null) points.push({ date: visit.date, value, source: "Visit" });
    }
  }
  for (const log of bpLogs) {
    if (log.date && numeric(log.systolic) && numeric(log.diastolic)) bp.push({ date: log.date, value: log.systolic, secondary: log.diastolic, source: "BP log" });
  }
  for (const log of weightLogs) {
    const unit = log.unit?.trim().toLowerCase() || "kg";
    if (log.date && numeric(log.weight) && ["kg", "kgs", "lb", "lbs"].includes(unit)) weight.push({ date: log.date, value: unit.startsWith("lb") ? Math.round(log.weight * 0.45359237 * 100) / 100 : log.weight, source: "Weight log" });
  }
  const sugar = new Map<string, { name: string; unit: string; points: SummaryPoint[] }>();
  for (const lab of labs) {
    const value = numeric(lab.value);
    if (value === null || !dateKey(lab.date)) continue;
    if (/\b(glucose|sugar|fbs|rbs|ppbs|ogtt|gtt|hba1c)\b/i.test(lab.testName)) {
      const unit = lab.unit?.trim() || "Unit not recorded";
      const key = `${lab.testName.trim().toLowerCase()}|${unit.toLowerCase()}`;
      const series = sugar.get(key) || { name: lab.testName, unit, points: [] };
      series.points.push({ date: lab.date, value, source: "Lab result" });
      sugar.set(key, series);
    }
    if (/^(hb|haemoglobin|hemoglobin)$/i.test(lab.testName.trim()) && /^g\/dl$/i.test(lab.unit?.trim() || "")) hb.push({ date: lab.date, value, source: "Lab result" });
  }
  const sorted = (points: SummaryPoint[]) => points.filter((point) => dateKey(point.date)).map((point) => ({ ...point, date: point.date.slice(0, 10) })).sort((a, b) => a.date.localeCompare(b.date));
  const unique = (points: SummaryPoint[]) => sorted(points).filter((point, index, all) => !all.slice(0, index).some((other) => other.date === point.date && other.value === point.value && other.secondary === point.secondary));
  return { bp: unique(bp), weight: unique(weight), hb: unique(hb), pulse: unique(pulse), fetalHeart: unique(fetalHeart), fundalHeight: unique(fundalHeight), sugar: [...sugar.values()].map((series) => ({ ...series, points: unique(series.points) })) };
}
