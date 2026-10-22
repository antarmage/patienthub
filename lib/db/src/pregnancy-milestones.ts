export interface PregnancyMilestone {
  from: number;
  to: number;
  label: string;
}

export const PREGNANCY_MILESTONES: PregnancyMilestone[] = [
  { from: 6, to: 10, label: "Booking visit & dating scan" },
  { from: 11, to: 14, label: "NT scan + first trimester screening" },
  { from: 18, to: 22, label: "Anomaly (level II) scan" },
  { from: 24, to: 28, label: "Glucose tolerance test & CBC" },
  { from: 27, to: 32, label: "Tdap vaccine / Anti-D if Rh negative" },
  { from: 32, to: 34, label: "Growth scan" },
  { from: 36, to: 37, label: "Birth plan & presentation check" },
  { from: 38, to: 40, label: "Weekly visits until delivery" },
];
