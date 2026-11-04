import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { calendarDate, calendarDateValue } from "@/lib/calendarDates";

export interface CalendarAppointment {
  id: number;
  patientId: number;
  date: string;
  time?: string | null;
  type?: string | null;
  reason?: string | null;
  status?: string | null;
}

interface AppointmentCalendarProps {
  date: string;
  onDate: (date: string) => void;
  appointments: CalendarAppointment[];
  patients: { id: number; name: string }[];
  onOpenPatient: (id: number) => void;
  isLoading: boolean;
  error: Error | null;
}

export function AppointmentCalendar({ date, onDate, appointments, patients, onOpenPatient, isLoading, error }: AppointmentCalendarProps) {
  const selected = calendarDate(date);
  const visits = appointments.filter((appointment) => appointment.date === date)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  return (
    <section className="min-w-0 rounded-3xl border border-[#e9e1d2] bg-[#fffaf0] p-4" aria-label="Appointment calendar">
      <Calendar selected={selected} onSelect={(next) => onDate(calendarDateValue(next))} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{selected?.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3>
        <span className="text-xs text-[#705364]">{visits.length} {visits.length === 1 ? "appointment" : "appointments"}</span>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error.message}</p> : isLoading ? <p role="status" className="py-6 text-center text-sm">Loading appointments...</p> : (
        <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto">
          {visits.map((appointment, index) => {
            const patient = patients.find((item) => item.id === appointment.patientId);
            const colors = ["bg-[#e8f0fa]", "bg-[#f9e8ef]", "bg-[#edf3dc]", "bg-[#fff2ca]"];
            return (
              <div key={appointment.id} className={`flex flex-wrap items-center gap-3 rounded-2xl p-3 ${colors[index % colors.length]}`} data-testid={`calendar-appointment-${appointment.id}`}>
                <span className="w-16 text-xs font-medium">{appointment.time || "No time"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{patient?.name || `Patient #${appointment.patientId}`}</p>
                  <p className="text-xs text-[#705364]">{appointment.reason || appointment.type || "Appointment"}</p>
                </div>
                <Badge variant="outline" className="bg-white/60">{appointment.status || "Scheduled"}</Badge>
                {patient && <Button variant="outline" size="sm" className="bg-white/70" onClick={() => onOpenPatient(patient.id)}>Open patient</Button>}
              </div>
            );
          })}
          {!visits.length && <div className="flex flex-col items-center rounded-2xl border border-[#e2eae6] bg-white px-5 py-8 text-center sm:py-10" role="status" data-testid="schedule-empty-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e3efea] text-[#2d6a5f]">
              <CalendarDays className="h-7 w-7" aria-hidden="true" />
            </span>
            <h4 className="mt-4 font-serif text-xl font-semibold text-[#1f4a42]">No appointments scheduled for this day.</h4>
            <p className="mt-2 max-w-sm text-sm text-[#52645e]">Your calendar is clear. Select another date to view its appointments.</p>
          </div>}
        </div>
      )}
    </section>
  );
}
