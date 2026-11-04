import { z } from "zod/v4";

export const paperWorkStates = ["pending", "recorded", "not_required", "not_due"] as const;
export const paperWorkLabels = {
  pending: "Pending", recorded: "Recorded", not_required: "Not required", not_due: "Not due",
};
export const paperWorkRowSchema = z.object({
  appointmentId: z.number().int().positive(),
  patientId: z.number().int().positive(),
  patientName: z.string(),
  providerId: z.number().int().positive().nullable(),
  providerName: z.string().nullable(),
  date: z.string(),
  time: z.string(),
  status: z.enum(paperWorkStates),
  transcriptionId: z.number().int().positive().nullable(),
  recordedAt: z.string().nullable(),
  recordedBy: z.string().nullable(),
  reason: z.string().nullable(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().nullable(),
  version: z.number().int().nonnegative(),
});
export type PaperWorkRow = z.infer<typeof paperWorkRowSchema>;
export const paperWorkPageSchema = z.object({
  rows: z.array(paperWorkRowSchema),
  total: z.number().int().nonnegative(),
});
export const paperWorkUpdateSchema = z.object({
  status: z.enum(["pending", "not_required"]),
  reason: z.string().trim().min(1).max(500),
  version: z.number().int().nonnegative(),
}).strict();
export const paperWorkQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date(),
  status: z.enum(["all", ...paperWorkStates]).default("all"),
  patientId: z.coerce.number().int().min(1).max(2147483647).optional(),
  providerId: z.coerce.number().int().min(1).max(2147483647).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
}).strict().refine((value) => !value.from || value.from <= value.to, "From date must not follow To date");
export type PaperWorkQuery = z.infer<typeof paperWorkQuerySchema>;
