import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod/v4";
import { attendanceInsightRecordSchema, attendanceInsightStatus, attendanceYearDays, attendanceYearSchema, type AttendanceInsightRecord } from "../../../../lib/db/src/attendance-insights";
import { clinicDate } from "../../../../lib/db/src/follow-up";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { attendanceTimingLabel } from "../../../../lib/db/src/attendance-timing";

const insightsSchema = z.object({
  records: z.array(attendanceInsightRecordSchema),
  employees: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
});
const legendStatuses = ["present", "regular_day_off", "leave", "pending_approval", "half-day", "absent", "rejected", null] as const;

export function AttendanceYearGrid({ year, records, today = clinicDate() }: { year: string; records: AttendanceInsightRecord[]; today?: string }) {
  const { dates, offset, columns, months } = attendanceYearDays(year);
  const byDate = new Map(records.map((record) => [record.date, record]));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = selectedDate && dates.includes(selectedDate) ? selectedDate : null;
  const statusFor = (date: string) => {
    const record = byDate.get(date);
    const status = attendanceInsightStatus(record?.status);
    if (record?.lateMinutes && record.lateMinutes > 0) return { ...status, label: `${status.label}, ${attendanceTimingLabel(record.lateMinutes)}` };
    return !byDate.has(date) && date > today ? { ...status, label: "Future day" } : status;
  };
  const lateCount = (days: string[]) => days.filter((date) => (byDate.get(date)?.lateMinutes || 0) > 0).length;
  const counts = ["present", "regular_day_off", "leave"] as const;
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-4 text-sm" aria-label="Yearly attendance totals">
      {counts.map((status) => <span key={status}>{attendanceInsightStatus(status).label}: <strong>{dates.filter((date) => byDate.get(date)?.status === status).length}</strong></span>)}
      <span className="text-amber-800">Late arrivals: <strong>{lateCount(dates)}</strong></span>
    </div>
    <div className="max-w-full overflow-x-auto rounded-lg border border-saivie-border p-3" role="region" aria-label={`Attendance heatmap for ${year}, scroll horizontally to see all months`} tabIndex={0}>
      <div className="flex w-max gap-2 pb-1">
        <div className="grid grid-rows-7 gap-[3px] pt-7 text-[11px] text-muted-foreground" aria-hidden="true">
          {["Mon", "", "Wed", "", "Fri", "", ""].map((day, index) => <span key={index} className="flex h-3 items-center">{day}</span>)}
        </div>
        <div>
          <div className="mb-2 grid h-5 gap-[3px] text-xs text-saivie-plum" style={{ gridTemplateColumns: `repeat(${columns}, 12px)` }} aria-label="Months">
            {months.map((month) => <span key={month.date} style={{ gridColumn: `${month.column} / span 3` }}>{month.label}</span>)}
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${columns}, 12px)` }} aria-label={`Daily attendance for ${year}`}>
            {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} className="h-3 w-3" aria-hidden="true" />)}
            {dates.map((date) => {
              const status = statusFor(date);
              const label = `${date}: ${status.label}`;
              return <button key={date} type="button" title={label} aria-label={label} aria-pressed={selected === date}
                onClick={() => setSelectedDate(date)}
                className={`relative h-3 w-3 rounded-[3px] border border-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saivie-teal ${status.color} ${date === today ? "ring-2 ring-saivie-teal ring-offset-1" : ""} ${selected === date ? "outline outline-2 outline-offset-2 outline-saivie-plum" : ""}`}>
                {(byDate.get(date)?.lateMinutes || 0) > 0 && <span aria-hidden="true" className="absolute -right-px -top-px h-1.5 w-1.5 rounded-full bg-amber-600 ring-1 ring-white" />}
              </button>;
            })}
          </div>
        </div>
      </div>
    </div>
    <p role="status" className="text-sm text-muted-foreground">{selected ? `${selected}: ${statusFor(selected).label}` : "Select a square to see its date and status. Outlined square is today."}</p>
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="Attendance color legend">
      {legendStatuses.map((status) => {
        const item = attendanceInsightStatus(status);
        return <span key={status || "unrecorded"} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm ${item.color}`} aria-hidden="true" />{item.label}</span>;
      })}
      <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />Late arrival (dot)</span>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Monthly late arrival totals">
      {months.map((month) => <span key={month.date}>{month.label} late: <strong>{lateCount(dates.filter((date) => date.slice(0, 7) === month.date.slice(0, 7)))}</strong></span>)}
    </div>
    <p className="text-xs text-muted-foreground">Late arrivals remain present. Late totals include only check-ins recorded with a configured shift.</p>
    <p className="text-xs text-muted-foreground">Gray also includes future days and scheduled work days. Missing records are not automatically marked absent.</p>
  </div>;
}

export function AttendanceInsights({ token, today = clinicDate() }: { token?: string; today?: string }) {
  const owner = token !== undefined;
  const accountToken = token ?? (typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("billing_staff_token"));
  const [chosenYear, setChosenYear] = useState<string | null>(null);
  const year = chosenYear || today.slice(0, 4);
  const recentYears = [...new Set([year, ...Array.from({ length: Math.min(4, Number(today.slice(0, 4))) }, (_, index) => String(Number(today.slice(0, 4)) - index).padStart(4, "0"))])].sort().reverse();
  const [employee, setEmployee] = useState("");
  const url = owner ? "/api/owner/attendance-insights" : "/api/staff/attendance-insights";
  const data = useQuery({
    queryKey: [url, accountToken, year],
    queryFn: async () => insightsSchema.parse(await readApiResponse(await authenticatedFetch(`${url}?year=${encodeURIComponent(year)}`, {
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
  return <section className="min-w-0 space-y-4 rounded-2xl border border-saivie-border bg-white p-5" aria-label="Yearly attendance insights">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h3 className="font-semibold text-saivie-plum">Attendance insights</h3><p className="text-sm text-muted-foreground">A year at a glance, one square per day.</p></div>
      <div><Label htmlFor={owner ? "owner-insights-year" : "staff-insights-year"}>Year</Label><Input id={owner ? "owner-insights-year" : "staff-insights-year"} type="number" min="1" max="9999" value={Number(year)} onChange={(event) => { const value = event.target.value.padStart(4, "0"); if (attendanceYearSchema.safeParse(value).success) setChosenYear(value); }} className="w-28" /></div>
    </header>
    <div className="flex min-w-0 flex-col gap-5 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        {data.isPending && <p role="status">Loading yearly attendance...</p>}
        {data.isError && <p role="alert" className="text-sm text-rose-700">{data.error.message} <Button variant="link" onClick={() => void data.refetch()}>Retry</Button></p>}
        {data.isSuccess && <>
          {owner && <div><Label htmlFor="insights-employee">Employee</Label><select id="insights-employee" value={selected} onChange={(event) => setEmployee(event.target.value)} className="mt-1 block h-10 max-w-full rounded-md border bg-background px-3 text-sm">
            {!choices.size && <option value="">No staff accounts or records</option>}
            {[...choices].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select></div>}
          {!records.length && <p className="text-sm text-muted-foreground">No attendance recorded for this year{owner && selected ? ` for ${choices.get(selected)}` : ""}.</p>}
          <AttendanceYearGrid key={`${year}:${selected}`} year={year} records={records} today={today} />
        </>}
      </div>
      <nav className="flex shrink-0 flex-wrap gap-2 lg:w-24 lg:flex-col" aria-label="Attendance years">
        {recentYears.map((value) => <Button key={value} variant={value === year ? "default" : "ghost"} aria-pressed={value === year} onClick={() => setChosenYear(value)} className={`justify-start px-5 ${value === year ? "bg-saivie-teal text-white hover:bg-saivie-teal/90" : ""}`}>{Number(value)}</Button>)}
      </nav>
    </div>
  </section>;
}
