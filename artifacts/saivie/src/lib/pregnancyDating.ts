import { pregnancyWeeks } from "./prescriptionTests";

const DAY = 86400000;

function dateValue(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

export function estimatePregnancyDating({ asOf, pog = "", dueDate = "", scans = [] }: {
  asOf: string;
  pog?: string;
  dueDate?: string;
  scans?: { scanDate: string; weeks: string }[];
}) {
  const reference = dateValue(asOf);
  if (reference === null) return null;
  const weeks = pregnancyWeeks(pog, "", "");
  let start: number;
  let source: "gestational-age" | "due-date" | "scan";
  let sourceDate = asOf;
  if (pog.trim()) {
    if (weeks === null) return null;
    start = reference - Math.round(weeks * 7) * DAY;
    source = "gestational-age";
  } else if (dueDate) {
    const end = dateValue(dueDate);
    if (end === null) return null;
    start = end - 280 * DAY;
    source = "due-date";
    sourceDate = dueDate;
  } else {
    const scan = scans.flatMap((item) => {
      const date = dateValue(item.scanDate);
      const gestation = pregnancyWeeks(item.weeks, "", "");
      return date !== null && date <= reference && gestation !== null
        ? [{ date, gestation, scanDate: item.scanDate }]
        : [];
    }).sort((a, b) => a.date - b.date)[0];
    if (!scan) return null;
    start = scan.date - Math.round(scan.gestation * 7) * DAY;
    source = "scan";
    sourceDate = scan.scanDate;
  }
  const days = Math.round((reference - start) / DAY);
  if (days < 0 || days >= 43 * 7) return null;
  return {
    estimatedLmp: new Date(start).toISOString().slice(0, 10),
    dueDate: new Date(start + 280 * DAY).toISOString().slice(0, 10),
    pog: `${Math.floor(days / 7)} weeks ${days % 7} days`,
    source,
    sourceDate,
    asOf,
  };
}
