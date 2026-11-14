import { z } from "zod/v4";

export const planningDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Choose a valid date.");

export function planningLastDate(today: string) {
  const date = new Date(`${today}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 3);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export const timeOffInputSchema = z.object({
  kind: z.enum(["leave", "weekly_off"]),
  startDate: planningDateSchema,
  endDate: planningDateSchema,
  period: z.enum(["full_day", "morning", "afternoon"]),
  reason: z.string().trim().min(1, "A reason is required.").max(1000),
}).strict().superRefine((input, context) => {
  if (input.endDate < input.startDate) context.addIssue({ code: "custom", message: "End date must be on or after start date." });
  if (input.kind === "weekly_off" && (input.startDate !== input.endDate || input.period !== "full_day")) {
    context.addIssue({ code: "custom", message: "A weekly off must be one full day." });
  }
});
export type TimeOffInput = z.infer<typeof timeOffInputSchema>;
export const timeOffRequestSchema = z.object({
  id: z.number().int(),
  employeeId: z.string(),
  employeeName: z.string(),
  kind: z.enum(["leave", "weekly_off"]),
  startDate: planningDateSchema,
  endDate: planningDateSchema,
  period: z.enum(["full_day", "morning", "afternoon"]),
  reason: z.string(),
  decision: z.enum(["pending", "approved", "rejected", "cancelled"]),
  requestedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewNote: z.string().nullable(),
});
export type TimeOffRequest = z.infer<typeof timeOffRequestSchema>;
export const timeOffListSchema = z.object({ requests: z.array(timeOffRequestSchema) });
export const timeOffPeriodLabel = (period: TimeOffInput["period"]) =>
  period === "morning" ? "Morning half-day" : period === "afternoon" ? "Afternoon half-day" : "Full day";
