export const pregnancyOutcomes = [
  "Not recorded",
  "Live birth",
  "Stillbirth",
  "Miscarriage",
  "Termination",
  "Other",
] as const;
export const deliveryModes = [
  "Not recorded",
  "Vaginal",
  "Caesarean",
  "Assisted vaginal",
  "Other",
] as const;

export type PregnancyEpisodeDetails = {
  number: number;
  status: "current" | "past";
  startDate: string | null;
  endDate: string | null;
  lmp: string | null;
  dueDate: string | null;
  datingBasis: "LMP" | "Ultrasound" | "Clinical assessment" | "Not recorded";
  outcome: (typeof pregnancyOutcomes)[number];
  deliveryMode: (typeof deliveryModes)[number];
  conceptionMethod: string;
  maternalHeightCm?: number | null;
  prePregnancyWeightKg?: number | null;
  fetusCount?: number | null;
  notes: string;
};
export type PregnancyRecordLink = {
  kind: "appointment" | "visit" | "lab";
  id: number;
};
export type PregnancyEpisode = {
  id: number;
  patientId: number;
  details: PregnancyEpisodeDetails;
  records: PregnancyRecordLink[];
  version: number;
  updatedAt: string;
};
