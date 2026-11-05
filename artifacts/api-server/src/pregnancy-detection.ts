import type {
  PregnancyEpisodeDetails,
  PregnancyRecordLink,
} from "../../../lib/db/src/pregnancy-episodes";

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const date = (value: unknown): string | null => {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value))
    return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) &&
    new Date(parsed).toISOString().slice(0, 10) === value
    ? value
    : null;
};
const daysBetween = (a: string, b: string) =>
  (Date.parse(b) - Date.parse(a)) / 86400000;
const pregnancyLabel = (value: unknown) =>
  typeof value === "string" &&
  /\b(pregnan(?:t|cy)|antenatal|ante-natal|anc|obstetric)\b/i.test(value) &&
  !/\b(non[- ]?pregnan(?:t|cy)|not pregnant|no pregnancy|rule out pregnancy|postpartum|postnatal|miscarriage|termination|abortion|mtp)\b/i.test(
    value,
  );

export type DetectedPregnancy = {
  details: PregnancyEpisodeDetails;
  records: PregnancyRecordLink[];
};
export type PregnancyDetection = {
  drafts: DetectedPregnancy[];
  reason: string;
};

export function detectPregnancies(
  patient: Record<string, unknown>,
  appointments: Record<string, unknown>[],
  visits: Record<string, unknown>[],
  today: string,
): PregnancyDetection {
  const history = record(patient.history),
    onboarding = record(history.onboarding);
  const reported = record(onboarding.pregnancies);
  const rawTotal = reported.total;
  const total =
    typeof rawTotal === "number" ||
    (typeof rawTotal === "string" && /^\d+$/.test(rawTotal))
      ? Number(rawTotal)
      : null;
  if (total === null || !Number.isInteger(total) || total < 1 || total > 50)
    return {
      drafts: [],
      reason:
        "A recorded total pregnancy count is required before automatic episode creation.",
    };
  const status = String(patient.pregnancyStatus || "").toLowerCase();
  const explicitCurrent = ["pregnant", "active"].includes(status);
  const ended = ["completed", "aborted", "not_continuing"].includes(status);
  const intakeCurrent = reported.currentStatus === "Yes";
  if (
    (explicitCurrent && reported.currentStatus === "No") ||
    (ended && intakeCurrent)
  )
    return {
      drafts: [],
      reason:
        "Patient pregnancy status and intake disagree. Review the current pregnancy before automatic creation.",
    };
  const current =
    !ended &&
    reported.currentStatus !== "No" &&
    (explicitCurrent || intakeCurrent || pregnancyLabel(patient.type));
  if (!current && !ended && reported.currentStatus !== "No")
    return {
      drafts: [],
      reason:
        "The current pregnancy status is not recorded clearly. Confirm it before automatic episode creation.",
    };
  const lmp = current
    ? date(patient.lmp) ?? date(record(onboarding.cycle).lastPeriod)
    : null;
  if (lmp && lmp > today)
    return {
      drafts: [],
      reason:
        "The recorded LMP is in the future. Review dating before automatic creation.",
    };
  const drafts: DetectedPregnancy[] = Array.from(
    { length: total },
    (_, index) => {
      const isCurrent = current && index + 1 === total;
      return {
        details: {
          number: index + 1,
          status: isCurrent ? "current" : "past",
          startDate: null,
          endDate: null,
          lmp: isCurrent ? lmp : null,
          dueDate: null,
          datingBasis: isCurrent && lmp ? "LMP" : "Not recorded",
          outcome: "Not recorded",
          deliveryMode: "Not recorded",
          conceptionMethod: "",
          notes: `Automatically established from patient-reported total (${total})${isCurrent ? " and recorded current-pregnancy status" : "; earlier pregnancy dates and outcome are not recorded"}. Clinician review remains available.`,
        },
        records: [],
      };
    },
  );
  const currentDraft = drafts.find(
    (draft) => draft.details.status === "current",
  );
  const eligibleAppointments = appointments.filter(
    (appointment) =>
      !["cancelled", "canceled", "no-show", "no show"].includes(
        String(appointment.status).toLowerCase(),
      ),
  );
  const isPregnancyAppointment = (appointment: Record<string, unknown>) =>
    [appointment.type, appointment.visitType, appointment.surveyType].some(
      pregnancyLabel,
    );
  const explicitLmp = (item: Record<string, unknown>) =>
    date(record(item.vitals).lmp);
  if (currentDraft && lmp) {
    for (const appointment of eligibleAppointments) {
      const visitDate = date(appointment.date);
      const ownVisits = visits.filter(
        (visit) => Number(visit.appointmentId) === Number(appointment.id),
      );
      const lmps = [
        explicitLmp(appointment),
        ...ownVisits.map(explicitLmp),
      ].filter((value) => value !== null);
      const matchingIntake =
        Number(history.onboardingAppointmentId) === Number(appointment.id) &&
        intakeCurrent;
      if (
        visitDate &&
        daysBetween(lmp, visitDate) >= 0 &&
        daysBetween(lmp, visitDate) <= 308 &&
        !lmps.some((value) => value !== lmp) &&
        (isPregnancyAppointment(appointment) ||
          matchingIntake ||
          lmps.includes(lmp))
      ) {
        currentDraft.records.push({
          kind: "appointment",
          id: Number(appointment.id),
        });
      }
    }
    for (const visit of visits.filter((visit) => !visit.appointmentId)) {
      const visitDate = date(visit.date);
      if (
        explicitLmp(visit) === lmp &&
        visitDate &&
        daysBetween(lmp, visitDate) >= 0 &&
        daysBetween(lmp, visitDate) <= 308
      )
        currentDraft.records.push({ kind: "visit", id: Number(visit.id) });
    }
    const pastDrafts = drafts.filter(
      (draft) => draft.details.status === "past",
    );
    const earlier = eligibleAppointments.filter((appointment) => {
      const visitDate = date(appointment.date);
      return (
        isPregnancyAppointment(appointment) &&
        visitDate &&
        visitDate <= today &&
        daysBetween(visitDate, lmp) > 308
      );
    });
    if (pastDrafts.length === 1 && earlier.length) {
      const dates = earlier
        .map((appointment) => String(appointment.date))
        .sort();
      const oldLmps = new Set(
        earlier
          .flatMap((appointment) => [
            explicitLmp(appointment),
            ...visits
              .filter(
                (visit) =>
                  Number(visit.appointmentId) === Number(appointment.id),
              )
              .map(explicitLmp),
          ])
          .filter((value) => value !== null),
      );
      const oldLmp = [...oldLmps][0];
      if (
        daysBetween(dates[0], dates.at(-1)!) <= 308 &&
        oldLmps.size <= 1 &&
        !oldLmps.has(lmp) &&
        (!oldLmp ||
          dates.every(
            (value) =>
              daysBetween(oldLmp, value) >= 0 &&
              daysBetween(oldLmp, value) <= 308,
          ))
      ) {
        pastDrafts[0].records = earlier.map((appointment) => ({
          kind: "appointment",
          id: Number(appointment.id),
        }));
        pastDrafts[0].details.notes +=
          " Pregnancy-labelled appointments form one earlier group, separated from the current LMP by more than 44 weeks; assigned to the single reported earlier pregnancy. No delivery date or outcome was inferred.";
      }
    }
  }
  if (currentDraft?.records.length)
    currentDraft.details.notes +=
      " Assigned records have pregnancy-specific labels, matching recorded LMP, or the current pregnancy intake, within LMP to 44 weeks; appointment dates alone were not used.";
  return {
    drafts,
    reason:
      "Episodes established from recorded pregnancy count/status. Ambiguous records and all unlinked lab results remain unassigned for clinician review.",
  };
}
