import { z } from "zod/v4";

export const deliveryDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => !value.startsWith("0000-") && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value,
  "Enter a valid calendar date",
);
export const deliveryToday = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);
const pastDate = deliveryDateSchema.refine((value) => value <= deliveryToday(), "Cannot be in the future");
export const babySchema = z.object({
  name: z.string().trim().max(100),
  birthDate: pastDate,
  birthTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  outcome: z.enum(["Live birth", "Stillbirth"]),
  deathDate: pastDate.nullable(),
}).strict().superRefine((baby, ctx) => {
  if (baby.deathDate && (baby.outcome !== "Live birth" || baby.deathDate < baby.birthDate)) {
    ctx.addIssue({ code: "custom", path: ["deathDate"], message: "A death date is only for a live-born baby and cannot precede birth" });
  }
  const now = new Date(Date.now() + 19800000).toISOString();
  if (baby.birthDate === now.slice(0, 10) && baby.birthTime && baby.birthTime > now.slice(11, 16)) {
    ctx.addIssue({ code: "custom", path: ["birthTime"], message: "Birth time cannot be in the future (India time)" });
  }
});
export const deliveryInputSchema = z.object({
  episodeId: z.number().int().positive(),
  episodeVersion: z.number().int().positive(),
  deliveryDate: pastDate,
  deliveryMode: z.enum(["Vaginal", "Caesarean", "Assisted vaginal", "Other"]),
  babies: z.array(babySchema).min(1).max(10),
  postpartumReviewDate: deliveryDateSchema.nullable(),
}).strict().superRefine((input, ctx) => {
  if (input.babies.some((baby) => baby.birthDate > input.deliveryDate) ||
      !input.babies.some((baby) => baby.birthDate === input.deliveryDate)) {
    ctx.addIssue({ code: "custom", path: ["deliveryDate"], message: "Delivery date must be the last baby's birth date" });
  }
  if (input.postpartumReviewDate && input.postpartumReviewDate < input.deliveryDate) {
    ctx.addIssue({ code: "custom", path: ["postpartumReviewDate"], message: "Postpartum review cannot precede delivery" });
  }
});
export const babyUpdateSchema = z.object({
  version: z.number().int().positive(),
  babies: z.array(babySchema).min(1).max(10),
}).strict();
export type Baby = z.infer<typeof babySchema>;
export type DeliveryInput = z.infer<typeof deliveryInputSchema>;
export const deliveryRecordSchema = z.object({
  id: z.number().int().positive(),
  patientId: z.number().int().positive(),
  episodeId: z.number().int().positive(),
  surgeryPlanId: z.number().int().positive().nullable(),
  deliveryDate: deliveryDateSchema,
  deliveryMode: z.enum(["Vaginal", "Caesarean", "Assisted vaginal", "Other"]),
  babies: z.array(babySchema).min(1).max(10),
  postpartumReviewDate: deliveryDateSchema.nullable(),
  version: z.number().int().positive(),
});
export type DeliveryRecord = z.infer<typeof deliveryRecordSchema>;

export function deliveryOutcome(babies: Baby[]): "Live birth" | "Stillbirth" | "Other" {
  return babies.every((baby) => baby.outcome === "Live birth") ? "Live birth" :
    babies.every((baby) => baby.outcome === "Stillbirth") ? "Stillbirth" : "Other";
}

export function babyAge(baby: Baby, today = deliveryToday()): string {
  if (baby.outcome === "Stillbirth") return "Stillbirth";
  const end = baby.deathDate || today;
  const days = Math.floor((Date.parse(end) - Date.parse(baby.birthDate)) / 86400000);
  if (!Number.isFinite(days) || days < 0) return "Age unavailable";
  const birth = new Date(`${baby.birthDate}T00:00:00Z`);
  const at = new Date(`${end}T00:00:00Z`);
  const monthEndDay = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate();
  const months = (at.getUTCFullYear() - birth.getUTCFullYear()) * 12 + at.getUTCMonth() - birth.getUTCMonth() -
    (at.getUTCDate() < Math.min(birth.getUTCDate(), monthEndDay) ? 1 : 0);
  const age = months >= 12 ? `${Math.floor(months / 12)}y ${months % 12}m` :
    months >= 1 ? `${months} month${months === 1 ? "" : "s"}` : `${days} day${days === 1 ? "" : "s"}`;
  return baby.deathDate ? `Died ${baby.deathDate} (age ${age})` : age;
}

export const isCaesareanProcedure = (name: string) => /\b(caesarean|cesarean|caesarian|cesarian|ceaseran|lscs|c[\s-]?section)\b/i.test(name);
