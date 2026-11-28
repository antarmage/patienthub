import { z } from "zod/v4";

export const basalTemperatureInputSchema = z.object({
  temperature: z.number().finite(),
  unit: z.enum(["C", "F"]),
  measuredAt: z.iso.datetime({ offset: true }),
  notes: z.string().trim().max(1000).default(""),
}).strict().superRefine((value, context) => {
  const [min, max] = value.unit === "C" ? [30, 45] : [86, 113];
  if (value.temperature < min || value.temperature > max) {
    context.addIssue({ code: "custom", path: ["temperature"], message: `Temperature must be between ${min} and ${max} ${value.unit}.` });
  }
  if (Date.parse(value.measuredAt) > Date.now()) {
    context.addIssue({ code: "custom", path: ["measuredAt"], message: "Measurement time cannot be in the future." });
  }
});
export type BasalTemperatureInput = z.infer<typeof basalTemperatureInputSchema>;
export const basalTemperatureRecordSchema = z.object({
  id: z.number().int().positive(),
  temperature: z.number(),
  unit: z.enum(["C", "F"]),
  measuredAt: z.iso.datetime({ offset: true }),
  notes: z.string(),
});
export type BasalTemperatureRecord = z.infer<typeof basalTemperatureRecordSchema>;
