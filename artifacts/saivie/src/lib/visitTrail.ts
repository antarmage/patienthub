import { calendarDate } from "./calendarDates";
import { examinationRecord } from "./obstetricExamination";

export type TrailRecord = Record<string, unknown> & {
  id: number | string;
  date: string;
  trailKey: string;
  appointmentOnly: boolean;
  reportOnly?: boolean;
  document?: Record<string, unknown>;
  appointment?: Record<string, unknown>;
};

export function readAppointmentHistory(
  value: unknown,
  patientId: number,
): Record<string, unknown>[] {
  if (
    !Array.isArray(value) ||
    value.some((row) => {
      const record = examinationRecord(row);
      return (
        !Number.isSafeInteger(record.id) ||
        record.patientId !== patientId ||
        typeof record.date !== "string" ||
        !calendarDate(record.date)
      );
    })
  )
    throw new Error(
      "The appointment history API returned invalid or mismatched patient records.",
    );
  return value.map(examinationRecord);
}

export function visitTrail(
  visits: readonly Record<string, unknown>[],
  appointments: readonly Record<string, unknown>[],
  documents: readonly Record<string, unknown>[] = [],
): TrailRecord[] {
  const linked = new Set(
    visits
      .filter((visit) => visit.appointmentId != null)
      .map((visit) => String(visit.appointmentId)),
  );
  const records: TrailRecord[] = visits.map((visit) => {
    const appointment = appointments.find(
      (item) => String(item.id) === String(visit.appointmentId),
    );
    return {
      ...visit,
      id: String(visit.id),
      date: typeof visit.date === "string" ? visit.date : "",
      trailKey: `visit-${visit.id}`,
      appointmentOnly: false,
      appointment,
      visitType: visit.visitType || appointment?.visitType || appointment?.type,
      vitals: {
        ...examinationRecord(appointment?.vitals),
        ...examinationRecord(visit.vitals),
      },
    };
  });
  for (const appointment of appointments) {
    if (linked.has(String(appointment.id))) continue;
    records.push({
      id: `appointment-${appointment.id}`,
      trailKey: `appointment-${appointment.id}`,
      appointmentOnly: true,
      date: String(appointment.date),
      appointmentId: appointment.id,
      providerId: appointment.providerId,
      appointment,
      visitType: appointment.visitType || appointment.type,
      chiefComplaint: appointment.chiefComplaint || appointment.reason,
      vitals: appointment.vitals,
      followUpPlan: appointment.followUpNotes,
    });
  }
  for (const document of documents) {
    const date =
      typeof document.date === "string" ? document.date.slice(0, 10) : "";
    records.push({
      id: `report-${document.id}`,
      trailKey: `report-${document.id}`,
      date: calendarDate(date) ? date : "",
      appointmentOnly: false,
      reportOnly: true,
      document,
    });
  }
  return records.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.trailKey.localeCompare(a.trailKey),
  );
}

export function appointmentLabel(
  appointment: Record<string, unknown> | undefined,
  today: string,
): string {
  if (!appointment) return "";
  const status = String(appointment.status || "").trim();
  const normalized = status.toLowerCase().replace(/[_\s]+/g, "-");
  if (["completed", "complete"].includes(normalized) || appointment.completedAt)
    return "Completed appointment";
  if (["cancelled", "canceled", "no-show"].includes(normalized)) return status;
  return String(appointment.date) > today
    ? `Upcoming booking${status ? ` · ${status}` : ""}`
    : `Appointment${status ? ` · ${status}` : " · status not recorded"}`;
}
