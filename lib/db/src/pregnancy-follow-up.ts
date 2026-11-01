import type { PregnancyEpisode } from "./pregnancy-episodes";
import { PREGNANCY_MILESTONES } from "./pregnancy-milestones";
import { addCallDays, parseCallDate, prescriptionDueDate } from "./follow-up";

export type PregnancyFollowUp = {
  episodeId: number;
  datingKey: string;
  date: string | null;
  source: "prescription" | "recorded-review" | "milestone" | "review-required";
  reason: string;
  sourceRecord: string;
};
export type FollowUpAppointment = {
  id: number;
  date: string;
  status: string | null;
  followUpDate: string | null;
  followUpNotes: string | null;
};
export type FollowUpVisit = {
  id: number;
  appointmentId: number | null;
  date: string;
  followUpPlan: string | null;
  vitals: unknown;
};
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function strictDate(value: unknown): string | null {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    parseCallDate(value) === value
    ? value
    : null;
}

export function planPregnancyFollowUp({
  episode,
  appointments,
  visits,
  nextReview,
  previous,
  today,
}: {
  episode: PregnancyEpisode;
  appointments: FollowUpAppointment[];
  visits: FollowUpVisit[];
  nextReview: string | null;
  previous: PregnancyFollowUp | null;
  today: string;
}): PregnancyFollowUp | null {
  const details = episode.details;
  if (details.status !== "current" || details.endDate || !strictDate(today))
    return null;
  const lmp = details.datingBasis === "LMP" ? strictDate(details.lmp) : null;
  const edd = ["Ultrasound", "Clinical assessment"].includes(
    details.datingBasis,
  )
    ? strictDate(details.dueDate)
    : null;
  const origin = lmp || (edd ? addCallDays(edd, -280) : null);
  const datingKey = `${episode.id}:${details.datingBasis}:${origin || "unknown"}`;
  const base = { episodeId: episode.id, datingKey };
  const linkedAppointment = (id: number) =>
    episode.records.some(
      (link) => link.kind === "appointment" && link.id === id,
    );
  const linkedAppointments = appointments.filter(
    (appointment) =>
      linkedAppointment(appointment.id) &&
      strictDate(appointment.date) &&
      appointment.date <= today &&
      !/^(cancelled|canceled|no-show|no show)$/i.test(appointment.status || ""),
  );
  const linkedVisits = visits.filter(
    (visit) =>
      strictDate(visit.date) &&
      visit.date <= today &&
      (episode.records.some(
        (link) => link.kind === "visit" && link.id === visit.id,
      ) ||
        (visit.appointmentId !== null &&
          linkedAppointments.some(
            (appointment) => appointment.id === visit.appointmentId,
          ))),
  );
  const latestCompleted = linkedAppointments
    .filter((appointment) => /^(completed)$/i.test(appointment.status || ""))
    .map((appointment) => appointment.date)
    .sort()
    .at(-1);
  const candidates = [
    ...linkedAppointments
      .filter((appointment) => /^(completed)$/i.test(appointment.status || ""))
      .map((appointment) => ({
        encounterDate: appointment.date,
        id: appointment.id,
        sourceRecord: `appointment:${appointment.id}`,
        date:
          parseCallDate(appointment.followUpDate) ||
          prescriptionDueDate(
            appointment.followUpNotes || "",
            appointment.date,
          ),
        instructions: appointment.followUpNotes || "",
        explicit: appointment.followUpDate,
      })),
    ...linkedVisits.map((visit) => {
      const vitals = record(visit.vitals);
      return {
        encounterDate: visit.date,
        id: visit.id,
        sourceRecord: `visit:${visit.id}`,
        date:
          parseCallDate(vitals.followUpDate) ||
          prescriptionDueDate(visit.followUpPlan || "", visit.date),
        instructions: visit.followUpPlan || "",
        explicit: vitals.followUpDate,
      };
    }),
  ].filter(
    (candidate) =>
      candidate.date || candidate.instructions.trim() || candidate.explicit,
  );
  candidates.sort(
    (a, b) =>
      b.encounterDate.localeCompare(a.encounterDate) ||
      Number(b.sourceRecord.startsWith("visit:")) -
        Number(a.sourceRecord.startsWith("visit:")) ||
      b.id - a.id,
  );
  const latest = candidates[0];
  if (
    latest &&
    (!latestCompleted ||
      latestCompleted <= latest.encounterDate ||
      !latest.date ||
      latestCompleted < latest.date)
  ) {
    if (!latest.date || latest.date < latest.encounterDate)
      return {
        ...base,
        date: null,
        source: "review-required",
        reason:
          "Recorded prescription follow-up timing needs clinician confirmation; no milestone date replaces it.",
        sourceRecord: latest.sourceRecord,
      };
    return {
      ...base,
      date: latest.date,
      source: "prescription",
      reason:
        latest.instructions ||
        "Follow-up date recorded with the consultation/prescription.",
      sourceRecord: latest.sourceRecord,
    };
  }
  const review = parseCallDate(nextReview);
  if (nextReview && (!latestCompleted || !review || latestCompleted < review)) {
    return {
      ...base,
      date: review,
      source: review ? "recorded-review" : "review-required",
      reason: review
        ? "Existing clinician-recorded patient review date."
        : "Existing patient review timing needs confirmation.",
      sourceRecord: "patient:nextReview",
    };
  }
  if (!origin || today < origin || today > addCallDays(origin, 42 * 7))
    return {
      ...base,
      date: null,
      source: "review-required",
      reason:
        "Confirm current pregnancy dating / status before setting milestone follow-up.",
      sourceRecord: "pregnancy:dating",
    };
  if (
    previous?.source === "milestone" &&
    previous.datingKey === datingKey &&
    previous.date &&
    (!latestCompleted || latestCompleted < previous.date)
  )
    return previous;
  if (
    appointments.some(
      (appointment) =>
        strictDate(appointment.date) &&
        appointment.date >= today &&
        !/^(completed|cancelled|canceled|no-show|no show)$/i.test(
          appointment.status || "",
        ),
    )
  )
    return null;
  const minimum =
    latestCompleted && latestCompleted >= today
      ? addCallDays(latestCompleted, 1)
      : today;
  const milestones = PREGNANCY_MILESTONES.flatMap((milestone) => {
    // The existing near-term milestone explicitly calls for weekly contacts.
    const weeks = milestone.from === 38 ? [38, 39, 40] : [milestone.from];
    return weeks.map((week) => ({
      ...milestone,
      from: week,
      to: milestone.from === 38 ? week : milestone.to,
    }));
  });
  const completedMilestone =
    previous?.source === "milestone" &&
    previous.datingKey === datingKey &&
    previous.date &&
    latestCompleted &&
    latestCompleted >= previous.date
      ? Number(previous.sourceRecord.split(":")[1])
      : -1;
  const milestone = milestones.find(
    (milestone) =>
      milestone.from > completedMilestone &&
      addCallDays(origin, (milestone.to + 1) * 7 - 1) >= minimum,
  );
  if (!milestone)
    return {
      ...base,
      date: null,
      source: "review-required",
      reason:
        "The saved milestone schedule has ended. Clinician review is needed; no later date is guessed.",
      sourceRecord: "pregnancy:milestones-ended",
    };
  const starts = addCallDays(origin, milestone.from * 7);
  return {
    ...base,
    date: starts < minimum ? minimum : starts,
    source: "milestone",
    reason: `${milestone.label} (weeks ${milestone.from}-${milestone.to}). Timing prompt only; tests/vaccines are not ordered or marked completed. High-risk care requires clinician-specific review.`,
    sourceRecord: `milestone:${milestone.from}`,
  };
}
