export interface PortalAppointment {
  id: number;
  date: string;
  time?: string | null;
  status?: string | null;
  visitMode?: string | null;
  telemedicineLink?: string | null;
  providerId?: number | null;
  type?: string | null;
  reason?: string | null;
}

const closedStatuses = new Set(["cancelled", "canceled", "no-show", "completed"]);

function localDateString(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function appointmentStart(apt: Pick<PortalAppointment, "date" | "time">): Date | null {
  if (typeof apt.date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(apt.date)) return null;
  const date = apt.date.slice(0, 10);
  let hours = 0, minutes = 0;
  const time = typeof apt.time === "string" ? apt.time.trim() : "";
  const match = time.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (match) {
    hours = Number(match[1]);
    minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    if (hours > 23 || minutes > 59) { hours = 0; minutes = 0; }
  }
  const start = new Date(`${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  return Number.isNaN(start.getTime()) ? null : start;
}

// Open bookings from today onward (today's earlier times included — the visit day is not over).
export function upcomingAppointments(list: PortalAppointment[] | null | undefined, now = new Date()): PortalAppointment[] {
  if (!Array.isArray(list)) return [];
  const today = localDateString(now);
  return list
    .filter((apt) => {
      if (!apt || closedStatuses.has(String(apt.status || "").toLowerCase())) return false;
      const start = appointmentStart(apt);
      return !!start && apt.date.slice(0, 10) >= today;
    })
    .sort((a, b) => (appointmentStart(a)!.getTime()) - (appointmentStart(b)!.getTime()));
}

export function nextAppointment(list: PortalAppointment[] | null | undefined, now = new Date()): PortalAppointment | null {
  return upcomingAppointments(list, now)[0] ?? null;
}
