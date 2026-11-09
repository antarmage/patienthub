export * from "../../../../lib/db/src/patient-summary";

import { summaryRecord, summaryTrends, type SummaryLab, type SummaryMeasurement } from "../../../../lib/db/src/patient-summary";
import { visitTrail, type TrailRecord } from "./visitTrail";

export function trailMeasurements(trail: readonly TrailRecord[]): SummaryMeasurement[] {
  const recordedTime = (record: TrailRecord) => {
    const recordedAt = summaryRecord(record.vitals).recordedAt;
    const timestamp = typeof recordedAt === "string" ? Date.parse(recordedAt) : NaN;
    return Number.isFinite(timestamp) ? timestamp : 0;
  };
  return trail.filter((record) => !record.reportOnly)
    .sort((a, b) => a.date.localeCompare(b.date) || recordedTime(a) - recordedTime(b) || a.trailKey.localeCompare(b.trailKey, undefined, { numeric: true }))
    .map((record) => ({
      id: record.id, date: record.date, vitals: record.vitals,
      source: record.appointmentOnly ? "Check-in" : "Visit",
    }));
}

export function clinicalVitalTrends(
  visits: readonly Record<string, unknown>[],
  appointments: readonly Record<string, unknown>[],
  bpLogs: { date?: string; systolic: number; diastolic: number }[],
  weightLogs: { date?: string; weight: number; unit?: string }[],
  labs: SummaryLab[],
) {
  return summaryTrends(trailMeasurements(visitTrail(visits, appointments)), bpLogs, weightLogs, labs);
}
