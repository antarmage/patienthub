import { z } from "zod/v4";

const text = z.string().trim().min(1).max(600);
const signal = z.object({ title: text, body: text }).strict();
export const cycleBodyCopySchema = z.object({
  title: text,
  introduction: text,
  todayRead: text,
  hormoneTitle: text,
  hormoneDescription: text,
  temperatureTitle: text,
  temperatureBody: text,
  signalsTitle: text,
  signals: z.object({ focus: signal, temperature: signal, metabolism: signal, hormones: signal }).strict(),
  patternsTitle: text,
  patternsIntroduction: text,
}).strict();

export const cycleBodyCatalogueSchema = z.object({
  menstrual: cycleBodyCopySchema,
  follicular: cycleBodyCopySchema,
  ovulation: cycleBodyCopySchema,
  luteal: cycleBodyCopySchema,
}).strict();
export type CycleBodyCatalogue = z.infer<typeof cycleBodyCatalogueSchema>;

export const cycleBodyFeedSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("available"),
    cycleDay: z.number().int().min(1).max(35),
    cycleLength: z.number().int().min(21).max(35),
    phase: z.enum(["menstrual", "follicular", "ovulation", "luteal"]),
    content: cycleBodyCopySchema,
    source: z.literal("ai_generated"),
    reviewStatus: z.literal("not_clinically_reviewed"),
    assetVersion: z.string(),
    editionDate: z.iso.date().optional(),
  }).strict(),
  z.object({ status: z.literal("unavailable"), reason: z.string() }).strict(),
  z.object({ status: z.literal("pending"), reason: z.string() }).strict(),
]);
export type CycleBodyFeed = z.infer<typeof cycleBodyFeedSchema>;

export function estimateCyclePhase(lmp: string | null | undefined, cycleLength: unknown, now = new Date()) {
  const length = typeof cycleLength === "number" ? cycleLength
    : typeof cycleLength === "string" && /^\d+$/.test(cycleLength.trim()) ? Number(cycleLength) : NaN;
  if (!Number.isInteger(length) || length < 21 || length > 35) return null;
  if (!lmp || !/^\d{4}-\d{2}-\d{2}/.test(lmp)) return null;
  const date = lmp.slice(0, 10);
  const [year, month, day] = date.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(start) || new Date(start).toISOString().slice(0, 10) !== date) return null;
  const elapsed = (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - start) / 86400000;
  if (!Number.isInteger(elapsed) || elapsed < 0 || elapsed >= length) return null;
  const cycleDay = elapsed + 1;
  const estimatedOvulationDay = length - 14;
  return {
    cycleDay, estimatedOvulationDay,
    isEstimatedOvulationDay: cycleDay === estimatedOvulationDay,
    isPeakFertilityWindow: cycleDay >= estimatedOvulationDay - 2 && cycleDay <= estimatedOvulationDay,
  };
}
