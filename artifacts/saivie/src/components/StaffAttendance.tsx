import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Clock3 } from "lucide-react";
import { z } from "zod/v4";
import { clinicDate } from "../../../../lib/db/src/follow-up";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceCamera, useAttendanceFaceState } from "./AttendanceCamera";
import { AttendanceInsights } from "./AttendanceInsights";

type AttendanceRecord = {
  id: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string | null;
  hoursWorked: number | null;
};
type AttendanceAction = "clock_in" | "clock_out" | "regular_day_off" | "leave" | "work_day";
const attendanceRecordSchema = z.object({
  id: z.number(),
  date: z.string(),
  clockIn: z.string().nullable(),
  clockOut: z.string().nullable(),
  status: z.string().nullable(),
  hoursWorked: z.number().nullable(),
});
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const clockTime = (value: string | null) => value
  ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  : "Not recorded";

export function StaffAttendance() {
  const queryClient = useQueryClient();
  const face = useAttendanceFaceState();
  const staffToken = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("billing_staff_token");
  const [today, setToday] = useState(() => clinicDate());
  useEffect(() => {
    const timer = setInterval(() => setToday(clinicDate()), 30000);
    return () => clearInterval(timer);
  }, []);
  const week = useMemo(() => {
    const monday = new Date(`${today}T00:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + index);
      return dateOnly(date);
    });
  }, [today]);
  const [error, setError] = useState("");
  const records = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/staff/attendance", staffToken, week[0], week[6]],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/staff/attendance?startDate=${week[0]}&endDate=${week[6]}`);
      return z.array(attendanceRecordSchema).parse(await readApiResponse(response));
    },
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
  const label = (status: string | null | undefined) => ({
    present: "Present",
    leave: "Leave",
    regular_day_off: "Regular day off",
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

  return <section className="mx-auto max-w-5xl space-y-5" aria-label="My attendance">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 font-serif text-2xl font-bold text-saivie-plum sm:text-3xl"><CalendarCheck className="h-8 w-8 text-saivie-teal" />My Attendance</h2>
      <span className="rounded-full bg-saivie-sage/45 px-5 py-3 text-sm text-saivie-plum">{week[0]} to {week[6]}</span>
      <p className="mt-1 text-sm text-muted-foreground">Clock in and out today, and record your regular day off or leave for this week.</p>
    </header>
    <AttendanceCamera status={byDate.get(today)?.status} ready={records.isSuccess}
      clockIn={byDate.get(today)?.clockIn} clockOut={byDate.get(today)?.clockOut}
      onClockOut={() => update.mutate({ date: today, action: "clock_out" })}
      updating={update.isPending} attendanceError={error} />
    <AttendanceInsights today={today} />
    <Card className="border-saivie-border">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <CalendarCheck className="h-5 w-5 text-saivie-teal" />
        <div><CardTitle className="text-base">This week</CardTitle><p className="mt-1 text-sm text-muted-foreground">{week[0]} to {week[6]}</p></div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {records.isPending && <p role="status" className="text-sm text-muted-foreground">Loading your attendance...</p>}
        {records.isError && <p role="alert" className="text-sm text-rose-700">{records.error.message} <Button variant="link" onClick={() => void records.refetch()}>Retry</Button></p>}
        {records.isSuccess && week.map((date) => {
          const record = byDate.get(date);
          const isToday = date === today;
          const isPast = date < today;
          const canSetStatus = !isPast && !record?.clockIn && record?.status !== "pending_approval";
          const hasOtherDayOff = (records.data || []).some((item) => item.date !== date && item.status === "regular_day_off");
          return <article key={date} className="flex flex-col gap-3 rounded-xl border border-saivie-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-40">
              <p className="text-sm font-semibold text-saivie-plum">{new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}{isToday && <span className="ml-2 text-xs font-normal text-saivie-teal">Today</span>}</p>
              <Badge className={`mt-2 ${badgeStyle(record?.status)}`}>{label(record?.status)}</Badge>
            </div>
            {isToday ? <div className="flex flex-wrap items-center gap-2">
              {record?.clockIn && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> In {clockTime(record.clockIn)}</span>}
              {record?.clockOut && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Out {clockTime(record.clockOut)}</span>}
              {face.isSuccess && !face.data.enabled && !record?.clockIn && !["leave", "regular_day_off", "pending_approval"].includes(record?.status || "") && <Button size="sm" disabled={update.isPending || !canSetStatus} onClick={() => update.mutate({ date, action: "clock_in" })}>Clock in</Button>}
              {record?.clockIn && !record.clockOut && <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ date, action: "clock_out" })}>Clock out</Button>}
              {canSetStatus && <><Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ date, action: "regular_day_off" })}>Regular day off</Button><Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ date, action: "leave" })}>Leave</Button></>}
              {["leave", "regular_day_off"].includes(record?.status || "") && <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => update.mutate({ date, action: "work_day" })}>Set work day</Button>}
            </div> : <div className="flex flex-wrap items-center gap-2">
              {record?.clockIn && <span className="text-xs text-muted-foreground">In {clockTime(record.clockIn)}{record.clockOut ? ` · Out ${clockTime(record.clockOut)}` : ""}</span>}
              {canSetStatus && <><Button size="sm" variant={record?.status === "regular_day_off" ? "secondary" : "outline"} disabled={update.isPending || (record?.status !== "regular_day_off" && hasOtherDayOff)} onClick={() => update.mutate({ date, action: record?.status === "regular_day_off" ? "work_day" : "regular_day_off" })}>Regular day off</Button><Button size="sm" variant={record?.status === "leave" ? "secondary" : "outline"} disabled={update.isPending} onClick={() => update.mutate({ date, action: record?.status === "leave" ? "work_day" : "leave" })}>Leave</Button></>}
              {!canSetStatus && !record?.clockIn && <span className="text-xs text-muted-foreground">Past day — view only</span>}
            </div>}
          </article>;
        })}
      </CardContent>
    </Card>
  </section>;
}
