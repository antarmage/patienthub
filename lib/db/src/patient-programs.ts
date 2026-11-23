import { z } from "zod/v4";

export const programSessionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
}).strict();

export const programInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  category: z.enum(["mind", "nutrition", "exercise"]),
  tier: z.enum(["free", "plus"]),
  price: z.number().int().nonnegative().max(2147483647).nullable().default(null),
  sessions: z.array(programSessionSchema).max(50),
}).strict();

export const programSchema = programInputSchema.extend({
  id: z.number().int().positive(),
  status: z.enum(["draft", "published"]),
  version: z.number().int().positive(),
});
export const programUpdateSchema = programInputSchema.extend({ expectedVersion: z.number().int().positive() }).strict();
export const programVersionSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();
export const programPublishSchema = programVersionSchema.extend({ reviewed: z.literal(true) }).strict();
export type ProgramInput = z.infer<typeof programInputSchema>;
export type Program = z.infer<typeof programSchema>;
