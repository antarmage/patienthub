import { calendarDate, calendarDateValue, shiftCalendarDays } from "./calendarDates.ts";

export interface ReceptionPatient {
  id: number;
  name: string;
  phone?: string | null;
  age?: number | null;
}

export interface ReceptionAppointment {
  id: number;
  patientId: number | null;
  providerId: number | null;
  date: string;
  time: string;
  type?: string | null;
  visitType?: string | null;
  visitMode?: string | null;
  surveyType?: string | null;
  surveyCompleted?: boolean;
  status?: string | null;
  checkedInAt?: string | null;
  seenAt?: string | null;
  completedAt?: string | null;
  paymentStatus?: string | null;
  followUpDate?: string | null;
}

export type ReceptionPeriod = "today" | "week" | "last-week";
export type ReceptionFilter = "all" | "not-arrived" | "late" | "follow-up" | "payment" | "tomorrow";
export type ReceptionStage = "Scheduled" | "Arrived" | "With doctor" | "Done" | "No-show" | "Cancelled";

export function receptionStage(appointment: ReceptionAppointment): ReceptionStage {
  const status = (appointment.status || "").toLowerCase().replace(/[\s_]/g, "-");
  if (status.includes("cancel")) return "Cancelled";
  if (status === "no-show") return "No-show";
  if (appointment.completedAt || status === "completed") return "Done";
  if (appointment.seenAt || ["in-consultation", "with-doctor"].includes(status)) return "With doctor";
  if (appointment.checkedInAt || ["checked-in", "arrived"].includes(status)) return "Arrived";
  return "Scheduled";
}

export function receptionWeek(today: string, offset = 0): string[] {
  const date = calendarDate(today);
  if (!date) throw new Error("Invalid timeline date");
  const monday = shiftCalendarDays(date, -((date.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, day) => calendarDateValue(shiftCalendarDays(monday, day)));
}

export function receptionLate(appointment: ReceptionAppointment, now: Date): boolean {
  if (receptionStage(appointment) !== "Scheduled" || appointment.date !== calendarDateValue(now)) return false;
  if ((appointment.status || "").toLowerCase() === "late") return true;
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(appointment.time.trim());
  if (!match) return false;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > (match[3] ? 12 : 23) || (match[3] && hour === 0)) return false;
  if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return hour * 60 + minute < now.getHours() * 60 + now.getMinutes();
}

export function receptionTimeMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(time.trim());
  if (!match) return 1440;
  const hour = Number(match[1]);
  return (match[3] ? hour % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0) : hour) * 60 + Number(match[2]);
}

export function matchesReceptionFilter(appointment: ReceptionAppointment, filter: ReceptionFilter, now: Date) {
  const stage = receptionStage(appointment);
  const open = !["Cancelled", "No-show", "Done"].includes(stage);
  switch (filter) {
    case "not-arrived": return stage === "Scheduled";
    case "late": return receptionLate(appointment, now);
    case "follow-up": return stage === "Scheduled" && /follow[\s-]?up/i.test(`${appointment.type || ""} ${appointment.visitType || ""}`);
    case "payment": return Boolean(appointment.paymentStatus && !["paid", "cancelled", "canceled"].includes(appointment.paymentStatus.toLowerCase())) && stage !== "Cancelled";
    case "tomorrow": return open && appointment.date === calendarDateValue(shiftCalendarDays(now, 1));
    default: return true;
  }
}
