import { z } from "zod/v4";
import { receptionRequest } from "./authenticatedFetch";

const checkInVitalsSchema = z.object({
  appointmentId: z.number().int().positive(),
  patientId: z.number().int().positive(),
  vitals: z.object({
    bp: z.string().optional(),
    pulse: z.union([z.number(), z.string()]).optional(),
    temp: z.union([z.number(), z.string()]).optional(),
    spo2: z.union([z.number(), z.string()]).optional(),
    weight: z.union([z.number(), z.string()]).optional(),
    height: z.union([z.number(), z.string()]).optional(),
    bmi: z.union([z.number(), z.string()]).optional(),
    recordedAt: z.string().optional(),
  }).nullable(),
});

export async function fetchCheckInVitals(appointmentId: number, patientId: number, signal?: AbortSignal) {
  const body = await receptionRequest<unknown>(`/api/appointments/${appointmentId}/reception-vitals`, { signal });
  const parsed = checkInVitalsSchema.safeParse(body);
  if (!parsed.success || parsed.data.appointmentId !== appointmentId || parsed.data.patientId !== patientId) {
    throw new Error("The vitals API returned invalid or mismatched patient/appointment measurements.");
  }
  return parsed.data.vitals;
}

export function receptionVitals(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const { recordedAt, recordedBy, recordedByName, ...measurements } = value as Record<string, unknown>;
  const details: Record<string, unknown> = { ...measurements };
  if (recordedAt) {
    const date = typeof recordedAt === "string" ? new Date(recordedAt) : null;
    details["Recorded at"] = date && Number.isFinite(date.getTime())
      ? date.toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
        hour12: true, timeZone: "Asia/Kolkata", timeZoneName: "short",
      })
      : "Invalid recorded time";
  }
  if (recordedBy || recordedByName) {
    details["Recorded by"] = typeof recordedByName === "string" && recordedByName.trim()
      ? recordedByName.trim() : "Staff member unavailable";
  }
  return details;
}
