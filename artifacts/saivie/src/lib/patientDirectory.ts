export interface DirectoryAppointment {
  patientId: number | string | null;
  date: string;
  status?: string | null;
}

export function directoryAppointmentUrl(from: string, to: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/api/appointments?${params}`;
}

export function directoryPatientIds(appointments: DirectoryAppointment[], from: string, to: string): Set<string> {
  return new Set(appointments.filter((appointment) => {
    const date = appointment.date?.slice(0, 10);
    return appointment.patientId != null && date &&
      !["cancelled", "canceled"].includes((appointment.status || "").toLowerCase()) &&
      (!from || date >= from) && (!to || date <= to);
  }).map((appointment) => String(appointment.patientId)));
}
