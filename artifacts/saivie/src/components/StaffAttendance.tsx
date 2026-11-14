import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import { clinicDate } from "../../../../lib/db/src/follow-up";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceCamera, useAttendanceFaceState } from "./AttendanceCamera";
import { AttendanceInsights } from "./AttendanceInsights";
import { StaffAttendanceShift } from "./AttendanceShifts";
import { attendanceTimingLabel } from "../../../../lib/db/src/attendance-timing";
import { planningLastDate } from "../../../../lib/db/src/attendance-planning";
import { StaffTimeOff, useTimeOffRequests, type TimeOffSelection } from "./AttendanceTimeOff";

type AttendanceRecord = {
  id: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string | null;
  hoursWorked: number | null;
  lateMinutes?: number | null;
  timeOffPeriod?: string | null;
};
type AttendanceAction = "clock_in" | "clock_out";
const attendanceRecordSchema = z.object({
  id: z.number(),
  date: z.string(),
  clockIn: z.string().nullable(),
  clockOut: z.string().nullable(),
  status: z.string().nullable(),
  hoursWorked: z.number().nullable(),
  lateMinutes: z.number().int().nonnegative().nullable().optional(),
  timeOffPeriod: z.string().nullable().optional(),
});
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const clockTime = (value: string | null) => value
  ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
  : "Not recorded";
function weekDates(date: string, offset = 0) {
  const monday = new Date(`${date}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return dateOnly(day);
  });
}

export function StaffAttendance() {
  const queryClient = useQueryClient();
  const face = useAttendanceFaceState();
  const staffToken = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("billing_staff_token");
  const [today, setToday] = useState(() => clinicDate());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selection, setSelection] = useState<TimeOffSelection | null>(null);
  const requests = useTimeOffRequests();
  useEffect(() => {
    const timer = setInterval(() => setToday(clinicDate()), 30000);
    return () => clearInterval(timer);
  }, []);
  const week = useMemo(() => weekDates(today, weekOffset), [today, weekOffset]);
  const currentWeek = useMemo(() => weekDates(today), [today]);
  const [error, setError] = useState("");
  const records = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/staff/attendance", staffToken, week[0], week[6]],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/staff/attendance?startDate=${week[0]}&endDate=${week[6]}`);
      return z.array(attendanceRecordSchema).parse(await readApiResponse(response));
    },
    refetchInterval: 30000,
  });
  const currentRecords = useQuery({
    queryKey: ["/api/staff/attendance", staffToken, currentWeek[0], currentWeek[6]],
    queryFn: async () => z.array(attendanceRecordSchema).parse(await readApiResponse(await authenticatedFetch(`/api/staff/attendance?startDate=${currentWeek[0]}&endDate=${currentWeek[6]}`))),
    enabled: weekOffset !== 0,
    refetchInterval: 30000,
  });
  const update = useMutation({
    mutationFn: async ({ date, action }: { date: string; action: AttendanceAction }) => {
      const response = await authenticatedFetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, action }),
      });
      return readApiResponse(response);
    },
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["/api/staff/attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/owner/attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/staff/attendance-insights"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not update attendance."),
  });
  const byDate = new Map((records.data || []).map((record) => [record.date, record]));
  const todayRecords = weekOffset === 0 ? records : currentRecords;
  const todayRecord = todayRecords.data?.find((record) => record.date === today);
  const label = (status: string | null | undefined) => ({
    present: "Present",
    leave: "Leave",
    regular_day_off: "Regular day off",
    "half-day": "Half-day leave",
    clinic_closed: "Clinic closed",
    scheduled: "Work day",
    pending_approval: "Pending owner approval",
    rejected: "Attendance request rejected",
  }[status || ""] || "Not recorded");
  const badgeStyle = (status: string | null | undefined) => status === "present"
    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
    : status === "leave"
      ? "border-amber-200 bg-amber-100 text-amber-800"
      : status === "regular_day_off"
        ? "border-blue-200 bg-blue-100 text-blue-800"
        : "border-saivie-border bg-saivie-surface-muted text-saivie-plum";

  return <section className="staff-attendance mx-auto max-w-6xl space-y-5" aria-label="My attendance">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-serif text-2xl font-bold text-saivie-plum sm:text-3xl">My Attendance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Clock in today, plan upcoming weeks, and apply for time off.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StaffAttendanceShift />
        <span className="rounded-full border border-saivie-border bg-white px-3 py-2 text-xs text-saivie-plum">Today · {new Date(`${today}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span>
      </div>
    </header>
    <AttendanceCamera status={todayRecord?.status} ready={todayRecords.isSuccess}
      clockIn={todayRecord?.clockIn} clockOut={todayRecord?.clockOut}
      lateMinutes={todayRecord?.lateMinutes}
      onClockOut={() => update.mutate({ date: today, action: "clock_out" })}
      updating={update.isPending} attendanceError={error || (todayRecords.isError ? todayRecords.error.message : "")} />
    <Card className="rounded-3xl border-saivie-border shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-4">
        <div><CardTitle className="font-serif text-lg">{weekOffset === 0 ? "This week" : "Week planner"}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{week[0]} to {week[6]}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={weekOffset === 0} onClick={() => setWeekOffset((value) => value - 1)}>Previous week</Button>
          {weekOffset !== 0 && <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>This week</Button>}
          <Button variant="outline" size="sm" disabled={week[6] >= planningLastDate(today)} onClick={() => setWeekOffset((value) => value + 1)}>Next week</Button>
          <Button size="sm" onClick={() => setSelection({ kind: "leave", date: weekOffset === 0 ? today : week[0] })}>Apply for leave</Button>
          <Button variant="outline" size="sm" onClick={() => setSelection({ kind: "weekly_off", date: weekOffset === 0 ? today : week[0] })}>Apply for weekly off</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {records.isPending && <p role="status" className="text-sm text-muted-foreground">Loading your attendance...</p>}
        {records.isError && <p role="alert" className="text-sm text-rose-700">{records.error.message} <Button variant="link" onClick={() => void records.refetch()}>Retry</Button></p>}
        <div className="attendance-week-grid">
        {records.isSuccess && week.map((date) => {
          const record = byDate.get(date);
          const isToday = date === today;
          const isPast = date < today;
          const pendingRequest = requests.data?.requests.find((request) => request.decision === "pending" && request.startDate <= date && request.endDate >= date);
          const canApply = requests.isSuccess && !isPast && date <= planningLastDate(today) && !record?.clockIn && !pendingRequest &&
            !["pending_approval", "clinic_closed", "leave", "regular_day_off", "half-day"].includes(record?.status || "");
          const hasOtherDayOff = (records.data || []).some((item) => item.status === "regular_day_off") ||
            requests.data?.requests.some((item) => item.kind === "weekly_off" && item.decision === "pending" && item.startDate >= week[0] && item.startDate <= week[6]);
          return <article key={date} aria-label={`${date}: ${label(record?.status)}`} className={`attendance-day ${isToday ? "attendance-day-today" : ""}`}>
            <div>
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}</p>
                {isToday && <span className="rounded-full bg-saivie-teal px-2 py-0.5 text-[10px] text-white">Today</span>}
              </div>
              <p className="mt-1 font-serif text-2xl font-semibold text-saivie-plum">{Number(date.slice(-2))}</p>
              <Badge className={`mt-2 whitespace-normal text-[11px] ${badgeStyle(record?.status)}`}>{label(record?.status)}</Badge>
              {record?.timeOffPeriod && <p className="mt-1 text-xs text-muted-foreground">{record.timeOffPeriod === "morning" ? "Morning off" : "Afternoon off"}</p>}
              {pendingRequest && <p className="mt-2 text-xs text-amber-800">{pendingRequest.kind === "weekly_off" ? "Weekly off" : "Leave"} awaiting approval</p>}
            </div>
            {record?.clockIn && <dl className="space-y-1 text-xs">
              <div className="flex justify-between gap-1"><dt className="text-muted-foreground">In</dt><dd>{clockTime(record.clockIn)}</dd></div>
              {record.clockOut && <div className="flex justify-between gap-1"><dt className="text-muted-foreground">Out</dt><dd>{clockTime(record.clockOut)}</dd></div>}
            </dl>}
            {record?.clockIn && <p className={`mt-auto text-xs ${record.lateMinutes && record.lateMinutes > 0 ? "rounded-md bg-orange-100 p-2 font-semibold text-amber-800" : "text-muted-foreground"}`}>{attendanceTimingLabel(record.lateMinutes)}</p>}
            <div className="attendance-day-actions">
              {isToday && face.isSuccess && !face.data.enabled && !record?.clockIn && !["leave", "regular_day_off", "clinic_closed", "pending_approval"].includes(record?.status || "") && <Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ date, action: "clock_in" })}>Clock in</Button>}
              {isToday && record?.clockIn && !record.clockOut && <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ date, action: "clock_out" })}>Clock out</Button>}
              {canApply && <><Button size="sm" variant="outline" disabled={update.isPending || !!hasOtherDayOff} onClick={() => setSelection({ kind: "weekly_off", date })}>Apply weekly off</Button><Button size="sm" variant="outline" disabled={update.isPending} onClick={() => setSelection({ kind: "leave", date })}>Apply leave</Button></>}
              {isPast && !record?.clockIn && <span className="text-xs text-muted-foreground">Past day — view only</span>}
            </div>
          </article>;
        })}
        </div>
      </CardContent>
    </Card>
    <StaffTimeOff today={today} selection={selection} onClose={() => setSelection(null)} />
    <AttendanceInsights today={today} compact />
  </section>;
}
