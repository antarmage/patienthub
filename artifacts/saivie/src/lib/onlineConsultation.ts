import { readApiResponse } from "./authenticatedFetch";
import { z } from "zod";

const consultationSchema = z.object({
  appointment: z.object({ date: z.string(), time: z.string(), duration: z.number().nullable(), status: z.string().nullable(), meetingUrl: z.string().refine(validMeetUrl) }),
  doctor: z.object({ name: z.string(), specialty: z.string(), clinicName: z.string() }),
  expiresAt: z.string().datetime(),
  prescriptions: z.array(z.object({ id: z.number().int().positive(), date: z.string(), medicines: z.array(z.record(z.string(), z.union([z.string(), z.number()]))), advice: z.string().nullable(), followUp: z.string().nullable() })),
  reports: z.array(z.object({ id: z.number().int().positive(), name: z.string(), date: z.string(), description: z.string().nullable(), hasFile: z.boolean() })),
});
export type PatientConsultation = z.infer<typeof consultationSchema>;

export function validMeetUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(value);
}

export async function loadPatientConsultation(token: string, signal?: AbortSignal): Promise<PatientConsultation> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("The consultation link is incomplete. Use the full private link shared by your clinic.");
  const body = await readApiResponse(await fetch("/api/online/patient", {
    headers: { "X-Consultation-Token": token }, credentials: "omit", cache: "no-store", signal,
  }));
  const parsed = consultationSchema.safeParse(body);
  if (!parsed.success) throw new Error("The consultation API returned invalid meeting or shared-record details.");
  return parsed.data;
}
