import React, { useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BpLogItem } from "@/components/VitalsSparklineGrid";

export function bloodPressureInPeriod(logs: BpLogItem[], period: number, today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - period + 1).getTime();
  return logs.filter((log) => {
    const date = new Date(`${String(log.date || "").slice(0, 10)}T00:00:00`).getTime();
    return date >= start && date < end;
  }).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function ConsultationVitalsTrends({ logs }: { logs: BpLogItem[] }) {
  const [period, setPeriod] = useState(7);
  const data = bloodPressureInPeriod(logs, period);

  return (
    <details open className="rounded-lg border border-saivie-border bg-saivie-ivory" data-testid="consultation-vitals-trends">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold text-saivie-teal">
        <Activity className="h-4 w-4" /> Vitals &amp; Trends <ChevronDown className="ml-auto h-3.5 w-3.5" />
      </summary>
      <div className="px-4 pb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-saivie-plum">Blood pressure · mmHg</span>
          <div className="flex gap-1">
            {[[7, "Weekly"], [30, "Monthly"], [90, "3 months"]].map(([days, label]) => (
              <button key={days} type="button" aria-pressed={period === days} className={`rounded-full border px-2.5 py-1 text-[10px] ${period === days ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border text-saivie-teal"}`} onClick={() => setPeriod(Number(days))}>{label}</button>
            ))}
          </div>
        </div>
        {data.length ? (
          <div className="h-40 min-w-0" data-testid="consultation-bp-chart">
            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="var(--saivie-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(date: string) => date.slice(5, 10)} tick={{ fontSize: 10, fill: "var(--saivie-plum)" }} axisLine={false} tickLine={false} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--saivie-plum)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "var(--saivie-border)" }} />
                <Line name="Systolic" dataKey="systolic" stroke="var(--saivie-teal)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                <Line name="Diastolic" dataKey="diastolic" stroke="var(--saivie-rose)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="flex h-32 items-center justify-center rounded-md border border-dashed border-saivie-border text-xs text-saivie-plum">No blood pressure readings in this period.</p>}
        <div className="mt-2 flex justify-end gap-3 text-[10px] text-saivie-plum"><span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded bg-saivie-teal" />Systolic</span><span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded bg-saivie-rose" />Diastolic</span></div>
      </div>
    </details>
  );
}
