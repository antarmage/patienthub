import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod/v4";
import { attendanceInsightRecordSchema, attendanceInsightStatus, attendanceMonthDays, attendanceMonthSchema, type AttendanceInsightRecord } from "../../../../lib/db/src/attendance-insights";
import { clinicDate } from "../../../../lib/db/src/follow-up";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const insightsSchema = z.object({
  records: z.array(attendanceInsightRecordSchema),
  employees: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
});
const legendStatuses = ["present", "regular_day_off", "leave", "pending_approval", "half-day", "absent", "rejected", null] as const;

export function AttendanceMonthGrid({ month, records, today = clinicDate() }: { month: string; records: AttendanceInsightRecord[]; today?: string }) {
  const { dates, offset } = attendanceMonthDays(month);
  const byDate = new Map(records.map((record) => [record.date, record]));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = selectedDate && dates.includes(selectedDate) ? selectedDate : null;
  const statusFor = (date: string) => {
    const status = attendanceInsightStatus(byDate.get(date)?.status);
    return !byDate.has(date) && date > today ? { ...status, label: "Future day" } : status;
  };
  const counts = ["present", "regular_day_off", "leave"] as const;
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-4 text-sm" aria-label="Monthly attendance totals">
      {counts.map((status) => <span key={status}>{attendanceInsightStatus(status).label}: <strong>{dates.filter((date) => byDate.get(date)?.status === status).length}</strong></span>)}
    </div>
    <div className="flex gap-2">
      <div className="grid grid-rows-7 gap-1 text-[10px] text-muted-foreground" aria-hidden="true">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day} className="flex h-7 items-center">{day}</span>)}
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-1" aria-label={`Daily attendance for ${month}`}>
        {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} className="h-7 w-7" aria-hidden="true" />)}
        {dates.map((date) => {
          const status = statusFor(date);
          const label = `${date}: ${status.label}`;
          return <button key={date} type="button" title={label} aria-label={label} aria-pressed={selected === date}
            onClick={() => setSelectedDate(date)}
            className={`h-7 w-7 rounded-[4px] border border-black/10 text-[10px] text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saivie-teal ${status.color} ${date === today ? "ring-2 ring-saivie-teal ring-offset-1" : ""} ${selected === date ? "outline outline-2 outline-offset-2 outline-saivie-plum" : ""}`}>
            {Number(date.slice(-2))}
          </button>;
        })}
      </div>
    </div>
    <p role="status" className="text-sm text-muted-foreground">{selected ? `${selected}: ${statusFor(selected).label}` : "Select a square to see its date and status. Outlined square is today."}</p>
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="Attendance color legend">
      {legendStatuses.map((status) => {
        const item = attendanceInsightStatus(status);
        return <span key={status || "unrecorded"} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm ${item.color}`} aria-hidden="true" />{item.label}</span>;
      })}
    </div>
    <p className="text-xs text-muted-foreground">Gray also includes future days and scheduled work days. Missing records are not automatically marked absent.</p>
  </div>;
}

export function AttendanceInsights({ token, today = clinicDate() }: { token?: string; today?: string }) {
  const owner = token !== undefined;
  const accountToken = token ?? (typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("billing_staff_token"));
  const [chosenMonth, setChosenMonth] = useState<string | null>(null);
  const month = chosenMonth || today.slice(0, 7);
  const [employee, setEmployee] = useState("");
  const url = owner ? "/api/owner/attendance-insights" : "/api/staff/attendance-insights";
  const data = useQuery({
    queryKey: [url, accountToken, month],
    queryFn: async () => insightsSchema.parse(await readApiResponse(await authenticatedFetch(`${url}?month=${encodeURIComponent(month)}`, {
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    }))),
    refetchInterval: 30000,
    gcTime: 0,
  });
  const choices = new Map((data.data?.employees || []).map((item) => [`id:${item.id}`, item.name]));
  for (const record of data.data?.records || []) {
    const key = record.employeeId ? `id:${record.employeeId}` : `legacy:${record.employeeName}`;
    if (!choices.has(key)) choices.set(key, `${record.employeeName}${record.employeeId ? "" : " (legacy records)"}`);
  }
  const selected = choices.has(employee) ? employee : choices.keys().next().value || "";
  const records = (data.data?.records || []).filter((record) => !owner ||
    (record.employeeId ? `id:${record.employeeId}` : `legacy:${record.employeeName}`) === selected);
  return <section className="space-y-4 rounded-2xl border border-saivie-border bg-white p-5" aria-label="Monthly attendance insights">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h3 className="font-semibold text-saivie-plum">Attendance insights</h3><p className="text-sm text-muted-foreground">A month at a glance, one square per day.</p></div>
      <div><Label htmlFor={owner ? "owner-insights-month" : "staff-insights-month"}>Month</Label><Input id={owner ? "owner-insights-month" : "staff-insights-month"} type="month" min="0001-01" max="9999-12" value={month} onChange={(event) => { if (attendanceMonthSchema.safeParse(event.target.value).success) setChosenMonth(event.target.value); }} className="w-44" /></div>
    </header>
    {data.isPending && <p role="status">Loading monthly attendance...</p>}
    {data.isError && <p role="alert" className="text-sm text-rose-700">{data.error.message} <Button variant="link" onClick={() => void data.refetch()}>Retry</Button></p>}
    {data.isSuccess && <>
      {owner && <div><Label htmlFor="insights-employee">Employee</Label><select id="insights-employee" value={selected} onChange={(event) => setEmployee(event.target.value)} className="mt-1 block h-10 max-w-full rounded-md border bg-background px-3 text-sm">
        {!choices.size && <option value="">No staff accounts or records</option>}
        {[...choices].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></div>}
      {!records.length && <p className="text-sm text-muted-foreground">No attendance recorded for this month{owner && selected ? ` for ${choices.get(selected)}` : ""}.</p>}
      <AttendanceMonthGrid key={`${month}:${selected}`} month={month} records={records} today={today} />
    </>}
  </section>;
}
