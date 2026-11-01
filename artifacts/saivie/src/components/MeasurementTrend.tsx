import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SummaryPoint } from "@/lib/patientSummary";

export function MeasurementTrend({
  title,
  unit,
  points,
  paired = false,
}: {
  title: string;
  unit: string;
  points: SummaryPoint[];
  paired?: boolean;
}) {
  const latest = points.at(-1);
  return (
    <section className="min-w-0 rounded-lg border border-saivie-border bg-saivie-ivory p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="text-xs font-semibold text-saivie-teal">{title}</h3>
        <span className="text-[10px] text-saivie-plum">{unit}</span>
      </div>
      {latest ? (
        <>
          <p className="mt-2 text-xl font-semibold text-saivie-plum">
            {latest.value}
            {paired ? `/${latest.secondary}` : ""}
            <span className="ml-2 text-[10px] font-normal">
              {latest.date} · {latest.source}
            </span>
          </p>
          <div className="mt-3 h-40" data-testid={`summary-trend-${title}`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
              <LineChart
                data={points}
                margin={{ left: -20, right: 12, top: 8 }}
              >
                <CartesianGrid
                  stroke="var(--saivie-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(date: string) => date.slice(5)}
                />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(label) => String(label)}
                  contentStyle={{ fontSize: 11 }}
                />
                <Line
                  dataKey="value"
                  name={paired ? "Systolic" : title}
                  stroke="var(--saivie-teal)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
                {paired && (
                  <Line
                    dataKey="secondary"
                    name="Diastolic"
                    stroke="var(--saivie-rose)"
                    strokeDasharray="5 3"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-saivie-plum">
            {paired ? "Systolic / diastolic · " : ""}
            {points.length === 1
              ? "One reading; trend not yet available."
              : `${points.length} recorded readings`}
          </p>
          <details className="mt-2 text-xs">
            <summary>Recorded values</summary>
            <ol className="mt-2 space-y-1">
              {points.map((point) => (
                <li key={`${point.date}:${point.value}:${point.secondary}`}>
                  {point.date}: {point.value}
                  {paired ? `/${point.secondary}` : ""} {unit} · {point.source}
                </li>
              ))}
            </ol>
          </details>
        </>
      ) : (
        <p className="flex h-48 items-center justify-center text-xs text-saivie-plum">
          No recorded readings.
        </p>
      )}
    </section>
  );
}
