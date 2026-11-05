import { z } from "zod/v4";

export const pregnancyFollowUpSchema = z.object({
  visitReason: z.enum(["Routine check-up", "Current concern", "Routine check-up and a concern"]),
  concern: z.string().trim().max(2000),
  foodHabits: z.string().trim().max(2000),
  vomitingChange: z.enum(["No vomiting", "Less than before", "Same as before", "Increased", "Not sure"]),
  eatingDrinking: z.enum(["Able to eat and drink", "Eating or drinking less", "Unable to keep food or fluids down", "Not sure"]),
  investigations: z.enum(["All completed", "Some completed", "Not done yet", "None advised", "Not sure"]),
  reports: z.enum(["Available to show the doctor", "Done, awaiting reports", "Not available", "Not applicable"]),
  investigationDetails: z.string().trim().max(2000),
  changes: z.string().trim().max(2000),
}).strict().refine((value) => value.visitReason === "Routine check-up" || value.concern.length > 0,
  { path: ["concern"], message: "Please describe your current concern." });
export type PregnancyFollowUp = z.infer<typeof pregnancyFollowUpSchema>;

export const followUpLabels: Record<keyof PregnancyFollowUp, string> = {
  visitReason: "Reason for this visit", concern: "Current concern", foodHabits: "Food habits",
  vomitingChange: "Vomiting since the last visit", eatingDrinking: "Eating and drinking",
  investigations: "Last advised investigations", reports: "Report availability",
  investigationDetails: "Investigation details", changes: "Changes in medicines, allergies or health",
};
export const followUpRows = (answers: PregnancyFollowUp): [string, string][] =>
  (Object.keys(followUpLabels) as (keyof PregnancyFollowUp)[]).filter((key) => answers[key].length > 0)
    .map((key) => [followUpLabels[key], answers[key]]);

const point = z.object({ date: z.iso.date(), value: z.number().positive(), secondary: z.number().positive().optional(), source: z.string() });
export const pregnancyTrendSchema = z.object({
  bp: z.array(point), weight: z.array(point), hb: z.array(point),
  sugar: z.array(z.object({ name: z.string(), unit: z.string(), points: z.array(point) })),
});
export type PregnancyTrends = z.infer<typeof pregnancyTrendSchema>;
export const pregnancyWeightContextSchema = z.object({
  lmp: z.iso.date().nullable(),
  dueDate: z.iso.date().nullable(),
  endDate: z.iso.date().nullable(),
  datingBasis: z.enum(["LMP", "Ultrasound", "Clinical assessment", "Not recorded"]),
  maternalHeightCm: z.number().min(50).max(250).nullable(),
  prePregnancyWeightKg: z.number().min(20).max(500).nullable(),
  fetusCount: z.number().int().min(1).max(10).nullable(),
  datingSource: z.string().optional(),
  heightSource: z.string().optional(),
});
export type PregnancyWeightContext = z.infer<typeof pregnancyWeightContextSchema>;
export const pregnancyVisitContextSchema = z.object({
  pregnancy: z.boolean(),
  repeat: z.boolean(),
  episodeId: z.number().int().positive().nullable(),
  label: z.string(),
  asOf: z.iso.date(),
  previousAppointmentCount: z.number().int().nonnegative(),
  trends: pregnancyTrendSchema,
  weightReference: pregnancyWeightContextSchema.nullable().optional(),
  answers: pregnancyFollowUpSchema.nullable(),
});
export type PregnancyVisitContext = z.infer<typeof pregnancyVisitContextSchema>;
