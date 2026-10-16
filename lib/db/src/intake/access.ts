import type { Answers, FiredAlert } from "./types.ts";

export type StaffRole = "clinician" | "owner" | "admin" | "receptionist" | string;

/** Only clinical roles may read answers; receptionists see status only. */
export function canViewIntakeAnswers(role: StaffRole | undefined): boolean {
  return role === "clinician" || role === "owner" || role === "admin";
}

export function canManageAlertRules(role: StaffRole | undefined): boolean {
  return role === "clinician" || role === "owner";
}

export interface IntakeRowLike {
  id: number;
  patientId: number;
  appointmentId: number;
  status: string;
  answers: Answers;
  alerts: FiredAlert[];
  updatedAt: string;
  submittedAt?: string | null;
}

/** What the front desk may see: progress and whether to check in with the patient. Never answers or alert detail. */
export function toStaffStatusView(row: IntakeRowLike) {
  return {
    id: row.id,
    patientId: row.patientId,
    appointmentId: row.appointmentId,
    status: row.status,
    urgent: row.alerts.some((a) => a.severity === "urgent"),
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt ?? null,
  };
}
