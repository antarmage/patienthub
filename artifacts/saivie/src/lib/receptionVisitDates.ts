import { calendarDate } from "./calendarDates";

export function receptionVisitDates<T extends { date?: unknown }>(visits: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const visit of visits) {
    const date = typeof visit.date === "string" && calendarDate(visit.date) ? visit.date : "";
    const records = groups.get(date) ?? [];
    records.push(visit);
    groups.set(date, records);
  }
  return [...groups].sort(([a], [b]) => b.localeCompare(a)).map(([date, records]) => ({
    date,
    label: date ? calendarDate(date)!.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date not recorded",
    records,
  }));
}
