import type { PregnancyEpisodeDetails } from "../../../../lib/db/src/pregnancy-episodes";
import type { SummaryPoint } from "./patientSummary";
import { calendarDate } from "./calendarDates";

export type GraphReference = {
  label: string;
  explanation: string;
  source: { label: string; url: string };
  lines?: { label: string; value: number }[];
  atDate?: (date: string) => { lower: number; upper?: number } | null;
  changeDates?: string[];
};

const weightSource = {
  label: "IOM/NRC 2009, Table S-1 (CDC-recommended guidance)",
  url: "https://www.nationalacademies.org/read/12584/chapter/2",
};
type PregnancyDating = Pick<PregnancyEpisodeDetails, "lmp" | "dueDate" | "endDate" | "datingBasis">;
type PregnancyWeightDetails = PregnancyDating & Pick<PregnancyEpisodeDetails, "maternalHeightCm" | "prePregnancyWeightKg" | "fetusCount">;
const hbSource = {
  label: "CDC, Recommendations to Prevent and Control Iron Deficiency, Table 6",
  url: "https://www.cdc.gov/mmwr/preview/mmwrhtml/00051880.htm#00003038.htm",
};
export const bpReference: GraphReference = {
  label: "Pregnancy hypertension thresholds",
  explanation:
    "Systolic 140 or diastolic 90 mmHg warrants clinical assessment. These are thresholds, not ideal values or treatment targets.",
  source: {
    label: "NICE NG133, definition of hypertension",
    url: "https://www.nice.org.uk/guidance/ng133/chapter/recommendations#terms-used-in-this-guideline",
  },
  lines: [
    { label: "Systolic threshold", value: 140 },
    { label: "Diastolic threshold", value: 90 },
  ],
};

export function gestationalWeekAtDate(
  details: PregnancyDating,
  date: string,
): number | null {
  if (!calendarDate(date) || (details.endDate && date > details.endDate))
    return null;
  const start =
    details.datingBasis === "LMP"
      ? details.lmp
      : ["Ultrasound", "Clinical assessment"].includes(details.datingBasis)
        ? details.dueDate
        : null;
  if (!start || !calendarDate(start)) return null;
  const origin =
    Date.parse(start + "T00:00:00Z") -
    (details.datingBasis === "LMP" ? 0 : 280 * 86400000);
  const days = (Date.parse(date + "T00:00:00Z") - origin) / 86400000;
  return days >= 0 && days < 43 * 7 ? days / 7 : null;
}

function trimesterDates(details: PregnancyDating) {
  const start =
    details.datingBasis === "LMP"
      ? details.lmp
      : ["Ultrasound", "Clinical assessment"].includes(details.datingBasis)
        ? details.dueDate
        : null;
  if (!start || !calendarDate(start)) return [];
  const origin =
    Date.parse(start + "T00:00:00Z") -
    (details.datingBasis === "LMP" ? 0 : 280 * 86400000);
  return [14, 28, 40].map((week) =>
    new Date(origin + week * 7 * 86400000).toISOString().slice(0, 10),
  );
}

const weightCategories = [
  {
    ceiling: 18.5,
    label: "Underweight",
    lower: 0.44,
    upper: 0.58,
    total: "12.5-18",
  },
  {
    ceiling: 25,
    label: "Normal BMI",
    lower: 0.35,
    upper: 0.5,
    total: "11.5-16",
  },
  {
    ceiling: 30,
    label: "Overweight",
    lower: 0.23,
    upper: 0.33,
    total: "7-11.5",
  },
  {
    ceiling: Infinity,
    label: "Obesity",
    lower: 0.17,
    upper: 0.27,
    total: "5-9",
  },
];

export function pregnancyWeightReference(
  details: PregnancyWeightDetails,
): GraphReference {
  const height = details.maternalHeightCm,
    weight = details.prePregnancyWeightKg;
  const missing = [
    !(
      typeof height === "number" &&
      Number.isFinite(height) &&
      height >= 50 &&
      height <= 250
    ) && "confirmed maternal height",
    !(
      typeof weight === "number" &&
      Number.isFinite(weight) &&
      weight >= 20 &&
      weight <= 500
    ) && "confirmed pre-pregnancy weight",
    details.fetusCount == null && "number of babies",
    !(details.datingBasis === "LMP"
      ? details.lmp && calendarDate(details.lmp)
      : ["Ultrasound", "Clinical assessment"].includes(details.datingBasis) &&
        details.dueDate &&
        calendarDate(details.dueDate)) && "confirmed pregnancy dating",
  ].filter(Boolean);
  if (
    missing.length ||
    typeof height !== "number" ||
    typeof weight !== "number"
  )
    return {
      label: "Weight reference unavailable",
      source: weightSource,
      explanation: `Record ${missing.join(", ")} in this pregnancy episode. Current or earliest visit weight is not assumed to be pre-pregnancy weight.`,
    };
  if (details.fetusCount !== 1)
    return {
      label: "Weight reference unavailable",
      source: weightSource,
      explanation:
        "This weekly model is for singleton pregnancies only. Multiple pregnancies need clinician-specific weight-gain guidance; a singleton band is not applied.",
    };
  // The published table supplies trimester gain and weekly rates, not validated weekly centiles.
  const bmi = weight / (height / 100) ** 2;
  const category =
    bmi < 18.5
      ? weightCategories[0]
      : bmi < 25
        ? weightCategories[1]
        : bmi < 30
          ? weightCategories[2]
          : weightCategories[3];
  return {
    label: "Illustrative pregnancy weight-gain band",
    source: weightSource,
    changeDates: trimesterDates(details),
    explanation: `Pre-pregnancy BMI ${bmi.toFixed(1)} (${category.label}); baseline ${weight} kg, height ${height} cm, singleton. Published total gain: ${category.total} kg. Band starts at week 14 with 0.5-2 kg first-trimester gain, then ${category.lower}-${category.upper} kg/week through week 40. This derived illustration is not a validated centile chart or an individual target; no first-trimester or post-term curve is guessed.`,
    atDate: (date) => {
      const week = gestationalWeekAtDate(details, date);
      return week === null || week < 14 || week > 40
        ? null
        : {
            lower:
              Math.round((weight + 0.5 + (week - 14) * category.lower) * 100) /
              100,
            upper:
              Math.round((weight + 2 + (week - 14) * category.upper) * 100) /
              100,
          };
    },
  };
}

export function pregnancyHemoglobinReference(
  details: PregnancyEpisodeDetails,
): GraphReference {
  return {
    label: "Pregnancy anemia screening cutoff",
    source: hbSource,
    changeDates: trimesterDates(details),
    explanation:
      "Below 11 g/dL in trimesters 1/3 or 10.5 g/dL in trimester 2 needs clinical interpretation. Cutoffs are unadjusted for altitude/smoking and are not an ideal hemoglobin target. Pregnancy dating is required.",
    atDate: (date) => {
      const week = gestationalWeekAtDate(details, date);
      return week === null
        ? null
        : { lower: week < 14 || week >= 28 ? 11 : 10.5 };
    },
  };
}

export function graphReferenceData(
  points: SummaryPoint[],
  reference?: GraphReference,
) {
  return points.map((point) => {
    const range = reference?.atDate?.(point.date);
    return {
      ...point,
      referenceLower: range?.lower ?? null,
      referenceUpper: range?.upper ?? null,
    };
  });
}

export function graphReferenceTimeline(
  points: SummaryPoint[],
  reference?: GraphReference,
) {
  const first = points[0]?.date,
    last = points.at(-1)?.date;
  const changes = (reference?.changeDates || []).filter(
    (date) =>
      first &&
      last &&
      date > first &&
      date < last &&
      !points.some((point) => point.date === date),
  );
  return [
    ...graphReferenceData(points, reference),
    ...changes.map((date) => {
      const range = reference?.atDate?.(date);
      return {
        date,
        value: null,
        secondary: null,
        referenceLower: range?.lower ?? null,
        referenceUpper: range?.upper ?? null,
      };
    }),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point) => ({
      ...point,
      timestamp: Date.parse(`${point.date}T00:00:00Z`),
    }));
}
