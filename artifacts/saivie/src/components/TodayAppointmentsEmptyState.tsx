import { CalendarCheck, CalendarPlus, UserRoundSearch } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface TodayAppointmentsEmptyStateProps {
  onViewSchedule: () => void;
  onFindPatient: () => void;
  upcomingAppointments: Array<{ date: string; type?: string | null; visitType?: string | null }>;
}

function formatAppointmentDate(date: string): string {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function TodayAppointmentsEmptyState({
  onViewSchedule,
  onFindPatient,
  upcomingAppointments,
}: TodayAppointmentsEmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center rounded-2xl border border-[#e2eae6] bg-white px-5 py-7 text-center sm:px-8 sm:py-9">
      <svg
        viewBox="0 0 360 380"
        width="100%"
        className="h-auto max-w-[280px]"
        role="img"
        aria-labelledby="today-empty-title today-empty-desc"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="today-empty-title">A quiet day with no appointments</title>
        <desc id="today-empty-desc">A relaxed woman enjoys tea beside a calendar with an open day.</desc>
        <circle cx="180" cy="195" r="150" fill="#E3EFEA" />
        <ellipse cx="180" cy="352" rx="120" ry="10" fill="#CFE0D8" />
        <rect x="58" y="326" width="28" height="22" rx="4" fill="#B9D6CB" />
        <path d="M72 326 C54 306 56 290 66 280 C68 298 76 308 72 326 Z M72 326 C90 308 92 292 82 282 C80 298 70 308 72 326 Z" fill="#2D6A5F" opacity=".75" />
        <rect x="236" y="104" width="100" height="126" rx="12" fill="#fff" stroke="#2D6A5F" strokeWidth="2" />
        <path d="M236 116 a12 12 0 0 1 12 -12 h76 a12 12 0 0 1 12 12 v18 h-100 Z" fill="#2D6A5F" />
        <rect x="256" y="96" width="6" height="16" rx="3" fill="#B9D6CB" />
        <rect x="310" y="96" width="6" height="16" rx="3" fill="#B9D6CB" />
        <g fill="none" stroke="#BFD3CB" strokeWidth="2" strokeDasharray="4 4">
          <rect x="248" y="146" width="20" height="20" rx="4" />
          <rect x="276" y="146" width="20" height="20" rx="4" />
          <rect x="304" y="146" width="20" height="20" rx="4" />
          <rect x="248" y="176" width="20" height="20" rx="4" />
          <rect x="304" y="176" width="20" height="20" rx="4" />
          <rect x="248" y="206" width="20" height="14" rx="4" />
          <rect x="276" y="206" width="20" height="14" rx="4" />
        </g>
        <rect x="276" y="176" width="20" height="20" rx="6" fill="#DDF0E8" stroke="#2D6A5F" strokeWidth="2" />
        <path d="M281 187 l4 4 l7 -8" stroke="#2D6A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="139" y="298" width="12" height="48" rx="6" fill="#D9A27E" />
        <rect x="161" y="298" width="12" height="48" rx="6" fill="#D9A27E" />
        <ellipse cx="143" cy="348" rx="14" ry="6" fill="#1F4A42" />
        <ellipse cx="169" cy="348" rx="14" ry="6" fill="#1F4A42" />
        <path d="M124 196 C122 232 112 282 106 306 L206 306 C200 282 190 232 188 196 Z" fill="#2D6A5F" />
        <path d="M128 146 Q156 138 184 146 L190 200 L122 200 Z" fill="#F2E6CF" />
        <rect x="122" y="196" width="68" height="7" rx="3" fill="#1F4A42" />
        <rect x="150" y="122" width="12" height="26" rx="6" fill="#D9A27E" />
        <path d="M146 144 L156 160 L166 144 Z" fill="#D9A27E" />
        <path d="M132 100 C126 56 186 56 180 100 L186 168 C176 158 174 136 174 112 L138 112 C138 136 136 158 126 168 Z" fill="#3A2A24" />
        <ellipse cx="156" cy="102" rx="21" ry="25" fill="#D9A27E" />
        <path d="M135 98 C140 74 172 74 177 98 C166 86 146 86 135 98 Z" fill="#3A2A24" />
        <path d="M146 104 Q149 101 152 104 M160 104 Q163 101 166 104" stroke="#2B2220" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M148 115 Q156 121 164 115" stroke="#8A4B3A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M130 152 Q114 192 124 226" stroke="#D9A27E" strokeWidth="13" fill="none" strokeLinecap="round" />
        <circle cx="124" cy="228" r="7" fill="#D9A27E" />
        <path d="M182 152 Q206 180 196 208" stroke="#D9A27E" strokeWidth="13" fill="none" strokeLinecap="round" />
        <rect x="188" y="196" width="22" height="20" rx="5" fill="#fff" stroke="#2D6A5F" strokeWidth="2" />
        <path d="M210 201 q8 0 8 7 q0 6 -8 6" fill="none" stroke="#2D6A5F" strokeWidth="2" />
        <circle cx="196" cy="214" r="7" fill="#D9A27E" />
        <path d="M194 188 q-4 -7 0 -13 M203 188 q-4 -7 0 -13" stroke="#9FB8AE" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="86" cy="120" r="20" fill="#fff" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="5 4" />
        <path d="M86 108 V120 L95 126" stroke="#2D6A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="214" cy="70" r="3" fill="#9FB8AE" />
        <circle cx="60" cy="210" r="3" fill="#9FB8AE" />
        <circle cx="330" cy="270" r="3" fill="#9FB8AE" />
      </svg>

      <h3 className="mt-1 font-serif text-xl font-semibold text-[#1f4a42] sm:text-2xl">
        No appointments scheduled for today
      </h3>
      <p className="mt-2 max-w-lg text-sm text-[#52645e]">
        Your day is clear. Take a breather, or use the time to look ahead.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild className="bg-[#2d6a5f] text-white hover:bg-[#24574e]" data-testid="btn-empty-book-appointment">
          <Link href="/staff/booking">
            <CalendarPlus className="mr-2 h-4 w-4" />
            Book appointment
          </Link>
        </Button>
        <Button variant="outline" className="border-[#9fb8ae] text-[#1f4a42]" onClick={onViewSchedule} data-testid="btn-empty-view-schedule">
          <CalendarCheck className="mr-2 h-4 w-4" />
          View schedule
        </Button>
        <Button variant="outline" className="border-[#9fb8ae] text-[#1f4a42]" onClick={onFindPatient} data-testid="btn-empty-find-patient">
          <UserRoundSearch className="mr-2 h-4 w-4" />
          Find a patient
        </Button>
      </div>

      {upcomingAppointments.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-[#f3f6f4] px-3 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">Next on your calendar</span>
          {upcomingAppointments.map((appointment, index) => (
            <span key={`${appointment.date}-${index}`} className="rounded-full border border-[#cbd9d3] bg-white px-3 py-1 text-xs text-[#243b35]">
              {formatAppointmentDate(appointment.date)} · {appointment.type || appointment.visitType || "Appointment"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
