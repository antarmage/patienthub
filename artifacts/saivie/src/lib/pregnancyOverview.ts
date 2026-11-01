import type {
  PregnancyEpisode,
  PregnancyEpisodeDetails,
} from "../../../../lib/db/src/pregnancy-episodes";
import {
  pregnancyOutcomes,
  deliveryModes,
} from "../../../../lib/db/src/pregnancy-episodes";
import { calendarDate } from "./calendarDates";
import {
  historyRecord,
  historyText,
  hasHistoryValue,
} from "./receptionPatientHistory";
import { pregnancyDatingFromLmp } from "./pregnancyDating";

export const indiaToday = () =>
  new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const validDate = (value: unknown) =>
  typeof value === "string" && !!calendarDate(value);

export function readMeasurementLogs(value: unknown, patientId: number) {
  const data = historyRecord(value);
  if (!Array.isArray(data.bp) || !Array.isArray(data.weight))
    throw new Error("The measurement API returned an invalid log list.");
  const validate = (row: unknown, fields: string[]) => {
    const log = historyRecord(row);
    if (
      log.patientId !== patientId ||
      !validDate(log.date) ||
      fields.some(
        (field) =>
          typeof log[field] !== "number" ||
          !Number.isFinite(log[field]) ||
          Number(log[field]) <= 0,
      )
    )
      throw new Error(
        "The measurement API returned invalid or mismatched patient logs.",
      );
    return log;
  };
  return {
    bp: data.bp.map((row) => {
      const log = validate(row, ["systolic", "diastolic"]);
      return {
        date: String(log.date),
        systolic: Number(log.systolic),
        diastolic: Number(log.diastolic),
      };
    }),
    weight: data.weight.map((row) => {
      const log = validate(row, ["weight"]);
      if (log.unit != null && typeof log.unit !== "string")
        throw new Error("The measurement API returned an invalid weight unit.");
      return {
        date: String(log.date),
        weight: Number(log.weight),
        unit: typeof log.unit === "string" ? log.unit : undefined,
      };
    }),
  };
}
export function readPregnancyEpisodes(
  value: unknown,
  patientId: number,
): PregnancyEpisode[] {
  if (!Array.isArray(value))
    throw new Error("The pregnancy API returned an invalid episode list.");
  for (const row of value) {
    const episode = historyRecord(row),
      details = historyRecord(episode.details);
    if (
      !Number.isSafeInteger(episode.id) ||
      Number(episode.id) < 1 ||
      Number(episode.id) > 2147483647 ||
      episode.patientId !== patientId ||
      !Number.isInteger(episode.version) ||
      Number(episode.version) < 1 ||
      !Number.isInteger(details.number) ||
      Number(details.number) < 1 ||
      Number(details.number) > 50 ||
      !["current", "past"].includes(String(details.status)) ||
      !pregnancyOutcomes.includes(
        details.outcome as (typeof pregnancyOutcomes)[number],
      ) ||
      !deliveryModes.includes(
        details.deliveryMode as (typeof deliveryModes)[number],
      ) ||
      !["LMP", "Ultrasound", "Clinical assessment", "Not recorded"].includes(
        String(details.datingBasis),
      ) ||
      ["lmp", "dueDate", "startDate", "endDate"].some(
        (key) => details[key] !== null && !validDate(details[key]),
      ) ||
      typeof details.notes !== "string" ||
      typeof details.conceptionMethod !== "string" ||
      typeof episode.updatedAt !== "string" ||
      !Array.isArray(episode.records) ||
      episode.records.some((item) => {
        const link = historyRecord(item);
        return (
          !["appointment", "visit", "lab"].includes(String(link.kind)) ||
          !Number.isSafeInteger(link.id) ||
          Number(link.id) < 1
        );
      })
    )
      throw new Error(
        "The pregnancy API returned invalid or mismatched patient records.",
      );
  }
  const episodes = value as PregnancyEpisode[];
  if (
    new Set(episodes.map((episode) => episode.id)).size !== episodes.length ||
    new Set(episodes.map((episode) => episode.details.number)).size !==
      episodes.length ||
    episodes.filter((episode) => episode.details.status === "current").length >
      1
  ) {
    throw new Error(
      "The pregnancy API returned conflicting episodes. Refresh before editing.",
    );
  }
  return episodes;
}

export function patientAge(
  patient: Record<string, unknown>,
  asOf: string,
  records: Record<string, unknown>[] = [],
): number | null {
  const onboarding = historyRecord(historyRecord(patient.history).onboarding);
  for (const dob of [patient.dob, onboarding.dob]) {
    if (!validDate(dob) || !validDate(asOf) || String(dob) > asOf) continue;
    const birth = String(dob);
    const age =
      Number(asOf.slice(0, 4)) -
      Number(birth.slice(0, 4)) -
      (asOf.slice(5) < birth.slice(5) ? 1 : 0);
    if (age >= 0 && age <= 130) return age;
  }
  const recordedAge = (value: unknown) => {
    const age =
      typeof value === "number"
        ? value
        : typeof value === "string" && /^\d+$/.test(value.trim())
          ? Number(value.trim())
          : null;
    return age !== null && Number.isInteger(age) && age > 0 && age <= 130
      ? age
      : null;
  };
  for (const value of [patient.age, onboarding.age]) {
    const age = recordedAge(value);
    if (age !== null) return age;
  }
  const dated = records
    .filter((row) => validDate(row.date) && String(row.date) <= asOf)
    .sort(
      (a, b) =>
        String(b.date).localeCompare(String(a.date)) ||
        Number(b.id) - Number(a.id),
    );
  for (const row of dated) {
    const age = recordedAge(historyRecord(row.vitals).age);
    if (age !== null) return age;
  }
  return null;
}

export function pregnancyGestation(
  details: PregnancyEpisodeDetails,
  today = indiaToday(),
) {
  const asOf = details.status === "current" ? today : details.endDate;
  if (!asOf) return null;
  const estimated =
    details.datingBasis === "LMP" && details.lmp
      ? pregnancyDatingFromLmp(details.lmp, asOf)
      : null;
  const dueDate =
    estimated?.dueDate ||
    (["Ultrasound", "Clinical assessment"].includes(details.datingBasis)
      ? details.dueDate
      : null);
  if (!dueDate || !validDate(dueDate)) return null;
  const days = Math.round(
    (Date.parse(`${asOf}T00:00:00Z`) -
      (Date.parse(`${dueDate}T00:00:00Z`) - 280 * 86400000)) /
      86400000,
  );
  if (days < 0 || days > 42 * 7 + 6) return null;
  return {
    weeks: Math.floor(days / 7),
    days: days % 7,
    dueDate,
    asOf,
    basis: details.datingBasis,
    trimester: days < 14 * 7 ? 1 : days < 28 * 7 ? 2 : 3,
  };
}

export function episodeRecords(
  episode: PregnancyEpisode,
  appointments: Record<string, unknown>[],
  visits: Record<string, unknown>[],
  labs: Record<string, unknown>[],
) {
  const selected = (kind: string, id: unknown) =>
    episode.records.some(
      (link) => link.kind === kind && String(link.id) === String(id),
    );
  const episodeVisits = visits.filter(
    (visit) =>
      selected("visit", visit.id) ||
      selected("appointment", visit.appointmentId),
  );
  const episodeAppointments = appointments.filter(
    (appointment) =>
      selected("appointment", appointment.id) ||
      episodeVisits.some(
        (visit) => String(visit.appointmentId) === String(appointment.id),
      ),
  );
  return {
    appointments: episodeAppointments,
    visits: episodeVisits,
    labs: labs.filter((lab) => selected("lab", lab.id)),
  };
}

export function suggestedEpisode(
  patient: Record<string, unknown>,
  episodes: PregnancyEpisode[],
): PregnancyEpisodeDetails {
  const pregnancy = historyRecord(
    historyRecord(historyRecord(patient.history).onboarding).pregnancies,
  );
  const total = Number(pregnancy.total);
  const number = Math.max(
    1,
    ...episodes.map((episode) => episode.details.number + 1),
    Number.isInteger(total) && total > 0 && total <= 50 ? total : 1,
  );
  const current = !episodes.some(
    (episode) => episode.details.status === "current",
  );
  const lmp = current && validDate(patient.lmp) ? String(patient.lmp) : null;
  return {
    number,
    status: current ? "current" : "past",
    lmp,
    dueDate: null,
    startDate: null,
    endDate: null,
    datingBasis: lmp ? "LMP" : "Not recorded",
    outcome: "Not recorded",
    deliveryMode: "Not recorded",
    conceptionMethod: "",
    notes: "",
  };
}

export function pregnancyBaseline(
  patient: Record<string, unknown>,
  today = indiaToday(),
  records: Record<string, unknown>[] = [],
) {
  const history = historyRecord(patient.history),
    health = historyRecord(historyRecord(history.onboarding).health);
  const bloodGroup = historyText(
    historyRecord(history.obstetric).bloodGroup || patient.bloodGroup,
  );
  const allergies = historyText(history.allergies ?? health.allergies);
  const medical = historyText(history.medical ?? health.conditions);
  return {
    age: patientAge(patient, today, records),
    bloodGroup,
    allergies,
    medical,
    medicalRecorded: hasHistoryValue(history.medical ?? health.conditions),
  };
}
