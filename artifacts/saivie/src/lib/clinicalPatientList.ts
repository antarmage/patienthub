import { pregnancyDatingFromLmp } from "./pregnancyDating.ts";
import { calendarDate } from "./calendarDates.ts";
import { patientAge } from "./pregnancyOverview";

export interface ClinicalDirectoryPatient {
  id: number;
  name: string;
  age?: number | null;
  dob?: string | null;
  history?: unknown;
  phone?: string | null;
  email?: string | null;
  type?: string | null;
  condition?: string | null;
  mode?: string | null;
  status?: string | null;
  pregnancyStatus?: string | null;
  lmp?: string | null;
  lastVisit?: string | null;
  nextReview?: string | null;
  riskScore?: { level?: string; factors?: { factor: string }[]; reviewRequired?: boolean } | null;
}

export function directoryPatientAge(patient: ClinicalDirectoryPatient, today: string) {
  return patientAge({ age: patient.age, dob: patient.dob, history: patient.history }, today);
}

export function directoryPatientFlags(patient: ClinicalDirectoryPatient) {
  const factors = patient.riskScore?.reviewRequired
    ? ["Previous assessment needs review"]
    : (patient.riskScore?.factors || []).map((factor) => factor.factor);
  return [...new Set([patient.condition, ...factors].filter((value): value is string => Boolean(value)))];
}

export type PatientListTab = "today" | "pregnant" | "pcos" | "high-risk" | "follow-ups" | "all";
export type TrimesterFilter = "all" | "first" | "second" | "third" | "near-term";
export type PatientListSort = "name" | "due-date" | "next-review" | "risk";

export function patientRisk(patient: ClinicalDirectoryPatient): string {
  return patient.riskScore?.level || (patient.status?.toLowerCase() === "high risk" ? "High" : "Not assessed");
}

export function patientGestation(patient: ClinicalDirectoryPatient, today: string) {
  const status = (patient.pregnancyStatus || "").toLowerCase();
  const pathway = `${patient.type || ""} ${patient.condition || ""}`;
  const pregnant = status ? /^(pregnant|pregnancy|antenatal|anc)(\b|$)/i.test(status)
    : /\b(pregnant|pregnancy|antenatal|anc)\b/i.test(pathway) && !/\b(postpartum|delivered)\b/i.test(pathway);
  const dating = pregnant && patient.lmp ? pregnancyDatingFromLmp(patient.lmp, today) : null;
  const match = dating?.pog.match(/^(\d+) weeks (\d+) days$/);
  const weeks = match ? Number(match[1]) : null;
  return {
    pregnant,
    dating: weeks !== null && weeks < 43 ? dating : null,
    weeks: weeks !== null && weeks < 43 ? weeks : null,
    days: weeks !== null && weeks < 43 && match ? Number(match[2]) : null,
  };
}

export function matchesPatientTab(patient: ClinicalDirectoryPatient, tab: PatientListTab, today: string, todayIds: Set<string>) {
  switch (tab) {
    case "today": return todayIds.has(String(patient.id));
    case "pregnant": return patientGestation(patient, today).pregnant;
    case "pcos": return /\bpcos\b/i.test(`${patient.type || ""} ${patient.condition || ""}`);
    case "high-risk": return ["high", "critical"].includes(patientRisk(patient).toLowerCase());
    case "follow-ups": return Boolean(patient.nextReview && calendarDate(patient.nextReview) && patient.nextReview <= today);
    default: return true;
  }
}

export function matchesTrimester(weeks: number | null, filter: TrimesterFilter) {
  if (filter === "all") return true;
  if (weeks === null) return false;
  switch (filter) {
    case "first": return weeks < 14;
    case "second": return weeks >= 14 && weeks < 28;
    case "third": return weeks >= 28;
    case "near-term": return weeks >= 37;
  }
}

export function compareClinicalPatients(a: ClinicalDirectoryPatient, b: ClinicalDirectoryPatient, sort: PatientListSort, today: string) {
  const ranks: Record<string, number> = { critical: 4, high: 3, medium: 2, moderate: 2, low: 1 };
  const iso = (value?: string | null) => value && calendarDate(value) ? value : "9999-12-31";
  let difference = 0;
  if (sort === "due-date") difference = iso(patientGestation(a, today).dating?.dueDate).localeCompare(iso(patientGestation(b, today).dating?.dueDate));
  if (sort === "next-review") difference = iso(a.nextReview).localeCompare(iso(b.nextReview));
  if (sort === "risk") difference = (ranks[patientRisk(b).toLowerCase()] || 0) - (ranks[patientRisk(a).toLowerCase()] || 0);
  return difference || a.name.localeCompare(b.name);
}
