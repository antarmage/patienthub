import { calendarDate } from "./calendarDates";
import { receptionTimeMinutes } from "./receptionTimeline";

export function validBookingTime(time: string): boolean {
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function adjustBookingTime(time: string, minutes: number): string {
    const current = validBookingTime(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : 9 * 60;
    const next = ((current + minutes) % 1440 + 1440) % 1440;
    return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}

export interface BookingScheduleAppointment {
    id: number;
    providerId: number | null;
    date: string;
    time: string;
    duration?: number | null;
    endTime?: string | null;
    status?: string | null;
}

export function bookingScheduleOverlap(appointment: BookingScheduleAppointment, date: string, time: string, duration: number): boolean {
    const appointmentDate = calendarDate(appointment.date);
    const selectedDate = calendarDate(date);
    const startMinutes = receptionTimeMinutes(appointment.time);
    if (!appointmentDate || !selectedDate || startMinutes >= 1440 || !validBookingTime(time) || /cancel|no.show/i.test(appointment.status || "")) return false;
    let length = appointment.duration && appointment.duration > 0 ? appointment.duration : null;
    if (!length && appointment.endTime) {
        const end = receptionTimeMinutes(appointment.endTime);
        if (end < 1440) length = end > startMinutes ? end - startMinutes : end + 1440 - startMinutes;
    }
    const start = appointmentDate.getTime() + startMinutes * 60_000;
    const selectedStart = selectedDate.getTime() + (Number(time.slice(0, 2)) * 60 + Number(time.slice(3))) * 60_000;
    // Unknown durations can only establish a conflict at the recorded start.
    return length ? start < selectedStart + duration * 60_000 && start + length * 60_000 > selectedStart
        : start >= selectedStart && start < selectedStart + duration * 60_000;
}
