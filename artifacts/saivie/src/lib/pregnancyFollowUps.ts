import type { PregnancyFollowUp } from "../../../../lib/db/src/pregnancy-follow-up";
import { calendarDate } from "./calendarDates";

export function readPregnancyFollowUps(
  value: unknown,
  ids: number[],
): Record<string, PregnancyFollowUp | null> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("The follow-up API returned an invalid plan list.");
  const result: Record<string, PregnancyFollowUp | null> = {};
  for (const [key, plan] of Object.entries(value)) {
    if (!ids.includes(Number(key)) || String(Number(key)) !== key)
      throw new Error("The follow-up API returned a mismatched patient plan.");
    if (plan === null) {
      result[key] = null;
      continue;
    }
    if (
      !plan ||
      typeof plan !== "object" ||
      Array.isArray(plan) ||
      !Number.isInteger(plan.episodeId) ||
      plan.episodeId < 1 ||
      typeof plan.datingKey !== "string" ||
      typeof plan.sourceRecord !== "string" ||
      typeof plan.reason !== "string" ||
      ![
        "prescription",
        "recorded-review",
        "milestone",
        "review-required",
      ].includes(plan.source) ||
      (plan.date !== null &&
        (typeof plan.date !== "string" || !calendarDate(plan.date))) ||
      (plan.source !== "review-required" && plan.date === null)
    )
      throw new Error("The follow-up API returned an invalid saved plan.");
    result[key] = plan;
  }
  if (ids.some((id) => !(String(id) in result)))
    throw new Error("The follow-up API omitted requested patient plans.");
  return result;
}
export function pregnancyFollowUpLabel(source: PregnancyFollowUp["source"]) {
  return source === "milestone"
    ? "Milestone follow-up · not booked"
    : source === "prescription"
      ? "Prescribed follow-up · not booked"
      : source === "recorded-review"
        ? "Recorded review · not booked"
        : "Follow-up needs clinician review";
}
