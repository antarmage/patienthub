import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { calendarDateValue, shiftCalendarDays } from "@/lib/calendarDates";
import { adjustBookingTime, bookingScheduleOverlap, validBookingTime, type BookingScheduleAppointment } from "@/lib/bookingSchedule";
import { receptionTimeMinutes } from "@/lib/receptionTimeline";

export function BookingScheduleSelection({ date, onDateChange, time, onTimeChange, duration, onDurationChange, providerId, walkIn }: {
    date?: Date;
    onDateChange: (date: Date) => void;
    time: string;
    onTimeChange: (time: string) => void;
    duration: number;
    onDurationChange: (duration: number) => void;
    providerId?: number;
    walkIn: boolean;
}) {
    const [showCalendar, setShowCalendar] = useState(false);
    const [showDay, setShowDay] = useState(false);
    const today = new Date();
    const dateKey = date ? calendarDateValue(date) : "";
    const from = date ? calendarDateValue(shiftCalendarDays(date, -1)) : "";
    const to = date ? calendarDateValue(shiftCalendarDays(date, 1)) : "";
    const schedule = useQuery<BookingScheduleAppointment[]>({
        queryKey: ["/api/appointments", "booking-conflicts", from, to],
        enabled: Boolean(date && providerId),
        queryFn: ({ signal }) => receptionRequest(`/api/appointments?from=${from}&to=${to}`, { signal }),
        refetchInterval: 30_000,
    });
    const doctorAppointments = (schedule.data || []).filter((item) => item.providerId === providerId && !/cancel|no.show/i.test(item.status || ""));
    const overlaps = doctorAppointments.filter((item) => bookingScheduleOverlap(item, dateKey, time, duration));
    const hour24 = validBookingTime(time) ? Number(time.slice(0, 2)) : 9;
    const minute = validBookingTime(time) ? time.slice(3) : "";
    const pill = (active: boolean) => `rounded-full border px-4 py-2 text-xs ${active ? "border-[#2d6a5f] bg-[#2d6a5f] text-white" : "border-[#d2dfd9] bg-white text-[#243b35]"}`;
    return <div className="space-y-5">
        <div className="space-y-1"><h2 className="font-serif text-2xl font-bold text-[#1f4a42]">When should she come?</h2><p className="text-sm text-[#52645e]">Pick the date, then set the time yourself. You are not limited to preset slots.</p></div>
        <section className="space-y-2" aria-label="Appointment date">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">Date</h3>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{Array.from({ length: 7 }, (_, index) => {
                const day = shiftCalendarDays(today, index);
                const key = calendarDateValue(day);
                return <button key={key} type="button" disabled={walkIn && index !== 0} aria-pressed={key === dateKey}
                    onClick={() => onDateChange(day)} className={`min-h-16 rounded-xl border p-2 text-xs disabled:opacity-40 ${key === dateKey ? "border-[#2d6a5f] bg-[#2d6a5f] text-white" : "border-[#d2dfd9] bg-white text-[#243b35]"}`}>
                    <span className="block font-semibold">{day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}</span>{index === 0 && <span className="mt-2 block text-[10px]">Today</span>}
                </button>;
            })}</div>
            <Button type="button" variant="outline" disabled={walkIn} aria-expanded={showCalendar} className="rounded-full border-[#d2dfd9] bg-white" onClick={() => setShowCalendar((open) => !open)}>Other date{date && !Array.from({ length: 7 }, (_, index) => calendarDateValue(shiftCalendarDays(today, index))).includes(dateKey) ? ` · ${date.toLocaleDateString("en-IN")}` : ""}</Button>
            {walkIn && <p className="text-xs text-[#52645e]">Walk-ins are booked for today.</p>}
            {showCalendar && !walkIn && <div className="w-fit rounded-xl border border-[#d2dfd9] bg-white p-2"><Calendar mode="single" selected={date} onSelect={(day) => { if (day) { onDateChange(day); setShowCalendar(false); } }} /></div>}
        </section>
        <section className="space-y-2" aria-label="Appointment time">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">Time</h3>
            <div className="flex flex-col gap-6 rounded-2xl border border-[#e0e9e4] bg-white p-4 sm:flex-row">
                <div className="flex items-start gap-2">
                    {(["Hour", "Minute"] as const).map((part) => <div key={part} className="w-16 space-y-1 text-center">
                        <label htmlFor={`booking-${part}`} className="text-[10px] text-[#52645e]">{part}</label>
                        <Button type="button" variant="outline" aria-label={`Increase ${part.toLowerCase()}`} className="h-8 w-full rounded-full border-[#80a89b]" onClick={() => onTimeChange(adjustBookingTime(time, part === "Hour" ? 60 : 5))}><ChevronUp className="h-4 w-4" /></Button>
                        <Input id={`booking-${part}`} type="number" min={part === "Hour" ? 1 : 0} max={part === "Hour" ? 12 : 59} value={part === "Hour" ? validBookingTime(time) ? hour24 % 12 || 12 : "" : minute}
                            onChange={(event) => {
                                const value = Number(event.target.value);
                                if (!event.target.value) { onTimeChange(""); return; }
                                if (!event.target.reportValidity()) return;
                                const nextHour = part === "Hour" ? value % 12 + (hour24 >= 12 ? 12 : 0) : hour24;
                                onTimeChange(`${String(nextHour).padStart(2, "0")}:${part === "Minute" ? String(value).padStart(2, "0") : minute || "00"}`);
                            }} className="h-16 rounded-xl border-[#80a89b] p-1 text-center font-serif text-3xl text-[#1f4a42]" />
                        <Button type="button" variant="outline" aria-label={`Decrease ${part.toLowerCase()}`} className="h-8 w-full rounded-full border-[#80a89b]" onClick={() => onTimeChange(adjustBookingTime(time, part === "Hour" ? -60 : -5))}><ChevronDown className="h-4 w-4" /></Button>
                    </div>)}
                    <div className="space-y-2 pt-12">{["AM", "PM"].map((period) => <button key={period} type="button" aria-pressed={validBookingTime(time) && (hour24 >= 12 ? "PM" : "AM") === period} className={`block ${pill(validBookingTime(time) && (hour24 >= 12 ? "PM" : "AM") === period)}`} onClick={() => onTimeChange(`${String(hour24 % 12 + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${minute || "00"}`)}>{period}</button>)}</div>
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                    <div className="space-y-2"><p className="text-[10px] font-semibold uppercase text-[#52645e]">Quick times</p><div className="flex flex-wrap gap-2">{["09:00", "10:00", "10:30", "11:00", "12:00", "14:00", "16:00", "17:00"].map((value) => <button key={value} type="button" aria-pressed={time === value} onClick={() => onTimeChange(value)} className={pill(time === value)}>{value}</button>)}</div></div>
                    <div className="space-y-2"><p className="text-[10px] font-semibold uppercase text-[#52645e]">Duration</p><div className="flex flex-wrap gap-2">{[15, 30, 45, 60].map((value) => <button key={value} type="button" aria-pressed={duration === value} onClick={() => onDurationChange(value)} className={pill(duration === value)}>{value === 60 ? "1 hr" : `${value} min`}</button>)}</div></div>
                    <div className="space-y-1"><label htmlFor="appointment-time" className="text-[10px] text-[#52645e]">Exact time (24-hour)</label><Input id="appointment-time" type="time" value={time} onChange={(event) => onTimeChange(event.target.value)} className="max-w-40 rounded-full" /><p className="text-[10px] text-[#52645e]">Arrow buttons move minutes by 5. Type any exact minute.</p></div>
                </div>
            </div>
        </section>
        {schedule.isPending && providerId && <p role="status" className="text-xs text-[#52645e]">Checking the doctor's recorded appointments...</p>}
        {schedule.isError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Could not check the doctor's appointments. Availability is unknown. <Button type="button" variant="link" onClick={() => void schedule.refetch()}>Retry schedule</Button></p>}
        {overlaps.length > 0 && !schedule.isError && <div role="status" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p>Heads up: this time overlaps a recorded appointment. You can still book it; confirm with the doctor.</p>
            {overlaps.map((item) => <p key={item.id}>{item.date} · {item.time}{item.duration ? ` · ${item.duration} min` : item.endTime ? ` – ${item.endTime}` : " · Duration not recorded"}</p>)}
        </div>}
        <Button type="button" variant="outline" className="rounded-full bg-white" aria-expanded={showDay} onClick={() => setShowDay((open) => !open)}>See her day</Button>
        {showDay && <div className="space-y-2 rounded-xl border border-[#d2dfd9] bg-white p-4">
            <h3 className="text-xs font-semibold">Doctor's recorded appointments · {dateKey}</h3>
            {schedule.isError ? <p className="text-xs">Schedule unavailable.</p> : schedule.isPending ? <p className="text-xs">Loading schedule...</p> : doctorAppointments.filter((item) => item.date === dateKey).length === 0 ? <p className="text-xs">No recorded appointments for this date. This does not confirm availability.</p> : doctorAppointments.filter((item) => item.date === dateKey).sort((a, b) => receptionTimeMinutes(a.time) - receptionTimeMinutes(b.time)).map((item) => <p key={item.id} className="text-xs">{item.time}{item.duration ? ` · ${item.duration} min` : item.endTime ? ` – ${item.endTime}` : " · Duration not recorded"}</p>)}
        </div>}
        <p className="text-[10px] text-[#52645e]">Quick times are shortcuts, not available slots. Checks use saved appointments, not working hours or live reservations. Missing durations may hide overlaps.</p>
    </div>;
}
