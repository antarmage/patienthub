import { z } from "zod/v4";
import { pregnancyVisitContextSchema } from "../../../../lib/db/src/pregnancy-followup";
import { savedIntakeSchema } from "../../../../lib/db/src/saved-intake";

const sessionSchema = z.object({
  appointment: z.object({ id: z.number(), surveyKind: z.string(), chiefComplaint: z.string().nullable() }),
  patient: z.object({ id: z.number(), name: z.string(), dob: z.string().nullable(), referredBy: z.string().nullable(), hpvProtection: z.enum(["protected", "in-progress"]).nullable() }),
  pregnancyContext: pregnancyVisitContextSchema.nullable(),
  savedIntake: savedIntakeSchema.nullable(),
  savedIntakeVersion: z.string().min(1).nullable(),
  savedIntakeAppointmentId: z.number().int().positive().nullable().default(null),
});

export function readOnboardingSession(body: unknown) {
  if (body && typeof body === "object" && "appointment" in body
    && (!("savedIntake" in body) || !("savedIntakeVersion" in body))) {
    throw new Error("The survey page has been updated, but the API server is still returning the older survey format. Ask the clinic to deploy/restart the updated API server together with the frontend, then retry. Your saved answers have not been changed. Do not fill the survey again.");
  }
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success || (parsed.data.savedIntake !== null && !parsed.data.savedIntakeVersion)) {
    throw new Error("The server returned incomplete or invalid survey data. Your saved answers have not been changed. Please retry or ask the clinic to check the API deployment and saved survey.");
  }
  return parsed.data;
}
