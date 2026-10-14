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

export interface PregnancyReminder {
  patient: any;
  week: number;
  label: string;
  status: "due" | "soon";
  windowText: string;
}

export function parseLmp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = String(value).trim();
  let date: Date | null = null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (iso) date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  else if (dmy) date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  else {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function gestationalWeeks(lmp: string | null | undefined, today = new Date()): number | null {
  const start = parseLmp(lmp);
  if (!start) return null;
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (days < 0 || days > 7 * 42) return null;
  return Math.floor(days / 7);
}

export function getPregnancyReminders(patients: any[], today = new Date()): PregnancyReminder[] {
  const reminders: PregnancyReminder[] = [];
  for (const patient of patients) {
    const status = String(patient.pregnancyStatus || "").toLowerCase();
    if (status && !/pregnan|antenatal|anc/.test(status)) continue;
    const week = gestationalWeeks(patient.lmp, today);
    if (week === null) continue;
    for (const m of PREGNANCY_MILESTONES) {
      if (week > m.to) continue;
      if (week >= m.from) {
        reminders.push({ patient, week, label: m.label, status: "due", windowText: `Weeks ${m.from}–${m.to}` });
      } else if (m.from - week <= 2) {
        reminders.push({ patient, week, label: m.label, status: "soon", windowText: `Starts week ${m.from}` });
      }
    }
  }
  return reminders.sort((a, b) => (a.status === b.status ? b.week - a.week : a.status === "due" ? -1 : 1));
}
