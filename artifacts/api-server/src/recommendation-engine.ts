import { z } from "zod/v4";
import catalogue from "./data/recommendation-activities.json";

const dimensions = ["energy", "focus", "mood", "confidence", "social_battery", "physical_capacity"] as const;
const rating = z.number().int().min(1).max(5);
const demandsSchema = z.object({
  energy: z.number().min(0).max(1),
  focus: z.number().min(0).max(1),
  mood: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  social_battery: z.number().min(0).max(1),
  physical_capacity: z.number().min(0).max(1),
}).strict();
const activitySchema = z.object({
  id: z.string().regex(/^[A-Z]+_\d+$/),
  name: z.string().min(1),
  category: z.enum(["professional", "cognitive", "creative", "social", "physical", "personal", "recovery"]),
  demands: demandsSchema,
  duration_minutes: z.number().int().positive(),
  intensity: z.enum(["none", "low", "moderate", "high"]),
  preferred_time: z.enum(["morning", "afternoon", "evening", "any"]),
  tags: z.array(z.string().min(1)).min(1),
}).strict();
const catalogueSchema = z.object({
  activities: z.array(activitySchema).min(1).refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    "Activity IDs must be unique",
  ),
}).passthrough();

export const activities = catalogueSchema.parse(catalogue).activities;

export const checkInSchema = z.object({
  readiness: z.object({
    energy: rating, focus: rating, mood: rating, confidence: rating,
    social_battery: rating, physical_capacity: rating,
  }).strict(),
  stage: z.enum(["cycle", "pregnancy", "postpartum", "perimenopause", "hormonal_contraception", "unknown"]),
  regularity: z.enum(["regular", "irregular", "unknown"]),
  flags: z.array(z.enum(["heavy_bleeding", "severe_pain", "red_flag"])).max(3)
    .refine((flags) => new Set(flags).size === flags.length, "Duplicate safety flag"),
  periodContext: z.object({
    phase: z.enum(["menstrual", "follicular", "ovulation", "luteal", "unsure"]),
    flow: z.enum(["none", "light", "moderate", "heavy", "unsure"]).optional(),
    symptoms: z.array(z.enum(["cramps", "fatigue", "headache", "mood_changes", "severe_pain"]))
      .max(5).refine((items) => new Set(items).size === items.length, "Duplicate symptom"),
  }).strict().optional(),
  nowHour: z.number().min(0).max(24),
  freeSlots: z.array(z.object({
    start: z.number().min(0).max(24),
    end: z.number().min(0).max(24),
  }).strict().refine((slot) => slot.start < slot.end, "Slot end must be after start")).max(24),
  goals: z.record(z.string().regex(/^[a-z_]{1,40}$/), z.number().min(0).max(1))
    .refine((goals) => Object.keys(goals).length <= 30, "Too many goals"),
}).strict();
export const storedFeedbackSchema = z.object({
  activityId: z.string().regex(/^[A-Z]+_\d+$/),
  action: z.enum(["completed", "helpful", "accepted", "snoozed", "dismissed", "didnt_suit"]),
}).strict();
export const feedbackSchema = storedFeedbackSchema.refine(
  (feedback) => activities.some((activity) => activity.id === feedback.activityId),
  { message: "Unknown activity", path: ["activityId"] },
);
export type CheckIn = z.infer<typeof checkInSchema>;
export type Feedback = z.infer<typeof feedbackSchema>;

const dayMs = 86_400_000;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00.000Z`) / dayMs;
const dateFromDay = (day: number) => new Date(day * dayMs).toISOString().slice(0, 10);
const hasSafetyConcern = (checkIn: CheckIn) =>
  checkIn.flags.length > 0 || checkIn.periodContext?.flow === "heavy" ||
  checkIn.periodContext?.symptoms.includes("severe_pain") === true;

export function estimatePeriod(asOf: string, starts: string[], checkIn: CheckIn | null) {
  if (!checkIn || checkIn.stage !== "cycle" || checkIn.regularity !== "regular" || hasSafetyConcern(checkIn)) {
    return { status: "withheld" as const, reason: "A regular cycle and an eligible check-in are required for testing." };
  }
  const dates = [...new Set(starts.filter((date) => date <= asOf))].sort().slice(-4);
  if (dates.length < 4) {
    return { status: "insufficient_data" as const, reason: "At least four recorded period starts are required." };
  }
  const intervals = dates.slice(1).map((date, index) => dayNumber(date) - dayNumber(dates[index]));
  if (intervals.some((interval) => interval < 15 || interval > 60) || Math.max(...intervals) - Math.min(...intervals) > 7) {
    return { status: "withheld" as const, reason: "Recorded intervals are outside the experimental estimation limits." };
  }
  const averageCycleLength = Math.round(intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length);
  const predictedDay = dayNumber(dates[dates.length - 1]) + averageCycleLength;
  const daysUntil = predictedDay - dayNumber(asOf);
  if (daysUntil < 0) {
    return { status: "stale" as const, reason: "The estimated date has passed; update the period history." };
  }
  return {
    status: "estimated" as const, nextPeriodDate: dateFromDay(predictedDay), daysUntil,
    averageCycleLength, intervalsUsed: intervals.length,
    basis: "Mean of the last three recorded intervals; experimental, not clinically validated.",
  };
}

const windows = { morning: [6, 12], afternoon: [12, 17], evening: [17, 22], any: [0, 24] } as const;
const weights = { energy: 1, focus: 1, mood: 0.7, confidence: 1, social_battery: 1, physical_capacity: 1 };

export function recommend(checkIn: CheckIn | null) {
  if (!checkIn) return { status: "insufficient_data" as const, cards: [], reason: "A check-in is required." };
  if (checkIn.stage !== "cycle" || hasSafetyConcern(checkIn)) {
    return { status: "withheld" as const, cards: [], reason: "Staff review is required for this stage or reported flag." };
  }
  const totalWeight = dimensions.reduce((sum, dimension) => sum + weights[dimension], 0);
  const scored = activities.filter((activity) => activity.intensity === "none" && activity.category !== "physical").flatMap((activity) => {
    const slots = checkIn.freeSlots.map(({ start, end }) => ({ start: Math.max(start, checkIn.nowHour), end }))
      .filter(({ start, end }) => (end - start) * 60 >= activity.duration_minutes);
    if (!slots.length) return [];
    const [windowStart, windowEnd] = windows[activity.preferred_time];
    const inWindow = slots.some(({ start, end }) =>
      (Math.min(end, windowEnd) - Math.max(start, windowStart)) * 60 >= activity.duration_minutes);
    const fit = 1 - dimensions.reduce((sum, dimension) =>
      sum + weights[dimension] * Math.max(0, activity.demands[dimension] - (checkIn.readiness[dimension] - 1) / 4), 0) / totalWeight;
    const goal = Math.max(0, ...activity.tags.map((tag) => checkIn.goals[tag] ?? 0));
    const matchedGoals = activity.tags.filter((tag) => (checkIn.goals[tag] ?? 0) > 0);
    const time = inWindow ? 1 : 0.5;
    const score = Math.round((0.6 * fit + 0.25 * time + 0.15 * goal) * 1000) / 1000;
    return [{
      activityId: activity.id, name: activity.name, category: activity.category,
      durationMinutes: activity.duration_minutes, score,
      components: { readinessFit: Math.round(fit * 1000) / 1000, timeFit: time, goalMatch: goal },
      reasons: ["Fits a recorded free slot.", ...(matchedGoals.length ? [`Matches recorded goals: ${matchedGoals.join(", ")}.`] : [])],
      basedOn: ["check_in", "free_slots", ...(goal > 0 ? ["goals"] : [])],
    }];
  });
  scored.sort((a, b) => b.score - a.score || a.activityId.localeCompare(b.activityId));
  const count = new Map<string, number>();
  const cards = scored.filter((card) => {
    const seen = count.get(card.category) ?? 0;
    if (seen >= 2) return false;
    count.set(card.category, seen + 1);
    return true;
  }).slice(0, 4);
  if (!cards.length) return { status: "no_matches" as const, cards, reason: "No eligible activities fit the recorded time slots." };
  return { status: "experimental" as const, cards };
}
