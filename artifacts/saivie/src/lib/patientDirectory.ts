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

export async function fetchDirectoryAppointments(from: string, to: string, signal?: AbortSignal): Promise<DirectoryAppointment[]> {
  const response = await fetch(directoryAppointmentUrl(from, to), { signal });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (!response.ok) {
    const body: unknown = isJson ? await response.json() : null;
    const detail = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : response.statusText;
    throw new Error(`Unable to load appointments (HTTP ${response.status})${detail ? `: ${detail}` : "."}`);
  }
  if (!isJson) throw new Error("Appointment API returned a page instead of JSON. Check the API deployment and routing.");
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const appointment = item as Record<string, unknown>;
    return typeof appointment.date === "string" &&
      (appointment.patientId === null || typeof appointment.patientId === "number" || typeof appointment.patientId === "string") &&
      (appointment.status == null || typeof appointment.status === "string");
  })) throw new Error("Appointment API returned an invalid appointment list.");
  return body;
}

export function directoryPatientIds(appointments: DirectoryAppointment[], from: string, to: string): Set<string> {
  return new Set(appointments.filter((appointment) => {
    const date = appointment.date?.slice(0, 10);
    return appointment.patientId != null && date &&
      !["cancelled", "canceled"].includes((appointment.status || "").toLowerCase()) &&
      (!from || date >= from) && (!to || date <= to);
  }).map((appointment) => String(appointment.patientId)));
}
