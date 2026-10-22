import type { Appointment, Patient, VisitHistory, LabTask, LabResult, InsertFollowUpCall } from "./schema/schema";
import { PREGNANCY_MILESTONES } from "./pregnancy-milestones.ts";

export type CallTrigger = "week_back" | "milestone" | "prescription" | "lab_pending" | "lab_result";
export const CALL_TRIGGER_LABELS: Record<CallTrigger, string> = {
  week_back: "1-week check-in",
  milestone: "Patient milestone",
  prescription: "Prescription follow-up",
  lab_pending: "Pending lab test",
  lab_result: "Lab results ready",
};

export function clinicDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function parseCallDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/.exec(value.trim());
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value.trim());
  if (!iso && !dmy) return null;
  const year = Number(iso ? iso[1] : dmy![3]);
  const month = Number(iso ? iso[2] : dmy![2]);
  const day = Number(iso ? iso[3] : dmy![1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function addCallDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function prescriptionDueDate(instructions: string, visitDate: string): string | null {
  const explicit = instructions.match(/\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/);
  if (explicit) return parseCallDate(explicit[0]);
  const relative = /\b(?:after|in|review|follow[\s-]?up)\s*(?:after|in)?\s*(\d+|one|two|three|four|a|an)\s*(days?|weeks?|months?)\b/i.exec(instructions);
  if (!relative) return null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, a: 1, an: 1 };
  const count = words[relative[1].toLowerCase()] ?? Number(relative[1]);
  if (!Number.isInteger(count) || count <= 0) return null;
  if (!relative[2].toLowerCase().startsWith("month")) {
    return addCallDays(visitDate, count * (relative[2].toLowerCase().startsWith("week") ? 7 : 1));
  }
  const date = new Date(`${visitDate}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + count);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export function callOutcome(form: { didntPickCallTime?: string; notes?: string; feeling?: string }): "pending" | "completed" {
  if (form.didntPickCallTime?.trim()) return "pending";
  return form.notes?.trim() || form.feeling?.trim() ? "completed" : "pending";
}

type CallPatient = Pick<Patient, "id" | "name" | "phone" | "type" | "lmp" | "pregnancyStatus" | "nextReview">;
type CallAppointment = Pick<Appointment, "id" | "patientId" | "date" | "status" | "followUpDate" | "followUpNotes">;
type CallVisit = Pick<VisitHistory, "id" | "patientId" | "appointmentId" | "date" | "followUpPlan" | "vitals" | "labsOrdered">;
type CallLabTask = Pick<LabTask, "id" | "patientId" | "test" | "status" | "orderedAt">;
type CallLabResult = Pick<LabResult, "id" | "patientId" | "labTaskId" | "testName" | "date" | "status">;
export interface FollowUpSources {
  patients: CallPatient[];
  appointments: CallAppointment[];
  visits: CallVisit[];
  labTasks: CallLabTask[];
  labResults: CallLabResult[];
}
export type GeneratedCall = InsertFollowUpCall & { sourceKey: string; triggerType: CallTrigger; triggerReason: string; plannedDate: string; dueDate: string };

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const normalizeTest = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const closedLab = (status: string | null) => /^(completed|complete|done|cancelled|canceled)$/i.test(status || "");

export function buildFollowUpTasks(sources: FollowUpSources, today: string): GeneratedCall[] {
  const tasks = new Map<string, GeneratedCall>();
  const patients = new Map(sources.patients.map((patient) => [patient.id, patient]));
  const add = (patientId: number | null, sourceKey: string, triggerType: CallTrigger, reason: string, dueDate: string, leadDays = 0, consultationDate?: string) => {
    const patient = patientId === null ? undefined : patients.get(patientId);
    const plannedDate = addCallDays(dueDate, -leadDays);
    if (!patient || plannedDate > today) return;
    tasks.set(sourceKey, {
      patientId: patient.id, patientName: patient.name, phone: patient.phone, patientType: patient.type,
      lmp: patient.lmp, consultationDate, sourceKey, triggerType, triggerReason: reason,
      dueDate, plannedDate, status: "pending", createdBy: "automatic",
    });
  };
  const hasResult = (patientId: number | null, name: string, since: string) =>
    sources.labResults.some((result) => result.patientId === patientId && result.date >= since &&
      normalizeTest(result.testName) === normalizeTest(name) && !/^(draft|cancelled|canceled)$/i.test(result.status || ""));

  for (const appointment of sources.appointments) {
    if (appointment.status?.toLowerCase() !== "completed") continue;
    add(appointment.patientId, `week:${appointment.id}`, "week_back",
      `Check recovery and concerns 7 days after the completed visit on ${appointment.date}.`,
      addCallDays(appointment.date, 7), 0, appointment.date);
    const due = parseCallDate(appointment.followUpDate);
    if (due) add(appointment.patientId, `prescription:appointment:${appointment.id}:${due}`, "prescription",
      appointment.followUpNotes || `Follow-up scheduled for ${due}.`, due, 1, appointment.date);
  }

  for (const patient of sources.patients) {
    const review = parseCallDate(patient.nextReview);
    if (review) add(patient.id, `review:${patient.id}:${review}`, "milestone", `Patient review due ${review}.`, review, 1);
    const lmp = parseCallDate(patient.lmp);
    const pregnancyStatus = (patient.pregnancyStatus || "").toLowerCase();
    if (!lmp || /not pregnant|non.?pregnant|postpartum|delivered/.test(pregnancyStatus) ||
      (pregnancyStatus && !/pregnan|antenatal|anc/.test(pregnancyStatus))) continue;
    if (today < lmp || today > addCallDays(lmp, 42 * 7)) continue;
    for (const milestone of PREGNANCY_MILESTONES) {
      const due = addCallDays(lmp, milestone.from * 7);
      if (today > addCallDays(lmp, (milestone.to + 1) * 7 - 1)) continue;
      add(patient.id, `milestone:${patient.id}:${lmp}:${milestone.from}`, "milestone",
        `${milestone.label} (weeks ${milestone.from}-${milestone.to}).`, due, 1);
    }
  }

  for (const visit of sources.visits) {
    const instructions = visit.followUpPlan?.trim();
    if (instructions) {
      const due = prescriptionDueDate(instructions, visit.date);
      const source = visit.appointmentId ? `appointment:${visit.appointmentId}` : `visit:${visit.id}`;
      add(visit.patientId, `prescription:${source}:${due || "confirm"}`, "prescription",
        due ? instructions : `Confirm follow-up timing with the clinician: ${instructions}`,
        due || visit.date, due ? 1 : 0, visit.date);
    }
    const vitals = record(visit.vitals);
    for (const [field, label] of [["nextImmunisationDate", "Immunisation"], ["nextInvestigationDate", "Investigation"]] as const) {
      const due = parseCallDate(vitals[field]);
      if (due) add(visit.patientId, `schedule:${visit.id}:${field}:${due}`, "milestone",
        `${label} scheduled for ${due}.`, due, 1, visit.date);
    }
    if (!Array.isArray(visit.labsOrdered)) continue;
    for (const item of visit.labsOrdered) {
      const line = record(item);
      const name = typeof item === "string" ? item : typeof line.name === "string" ? line.name : "";
      if (!name.trim()) continue;
      const key = normalizeTest(name);
      const linkedResult = hasResult(visit.patientId, name, visit.date);
      const reported = line.result !== null && line.result !== undefined && String(line.result).trim() !== "";
      if (reported) {
        if (!linkedResult) add(visit.patientId, `visit-result:${visit.id}:${key}`, "lab_result",
          `${name}: result recorded; arrange clinician review.`, visit.date, 0, visit.date);
        continue;
      }
      const matchingTask = sources.labTasks.find((task) => task.patientId === visit.patientId &&
        normalizeTest(task.test) === key && (parseCallDate(task.orderedAt) || "") >= visit.date);
      if (linkedResult || (matchingTask && closedLab(matchingTask.status)) || /^(completed|done|cancelled|canceled)$/i.test(String(line.status || ""))) continue;
      if (matchingTask) continue;
      add(visit.patientId, `visit-lab:${visit.id}:${key}`, "lab_pending",
        `${name} ordered on ${visit.date}; check whether the test has been completed.`,
        addCallDays(visit.date, 3), 0, visit.date);
    }
  }

  for (const task of sources.labTasks) {
    const ordered = parseCallDate(task.orderedAt);
    if (!ordered || closedLab(task.status) ||
      sources.labResults.some((result) => result.labTaskId === task.id && !/^(draft|cancelled|canceled)$/i.test(result.status || "")) ||
      hasResult(task.patientId, task.test, ordered)) continue;
    add(task.patientId, `lab:${task.id}`, "lab_pending",
      `${task.test} ordered on ${ordered}; check whether the test has been completed.`, addCallDays(ordered, 3), 0, ordered);
  }
  for (const result of sources.labResults) {
    if (/^(draft|reviewed|cancelled|canceled)$/i.test(result.status || "")) continue;
    add(result.patientId, `result:${result.id}`, "lab_result",
      `${result.testName}: results dated ${result.date} are ready; arrange clinician review.`, result.date);
  }
  return [...tasks.values()].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.sourceKey.localeCompare(b.sourceKey));
}
