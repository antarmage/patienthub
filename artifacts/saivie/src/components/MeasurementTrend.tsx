import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SummaryPoint } from "@/lib/patientSummary";
import {
  graphReferenceData,
  graphReferenceTimeline,
  type GraphReference,
} from "@/lib/pregnancyGraphReferences";

export function MeasurementTrend({
  title,
  unit,
  points,
  paired = false,
  reference,
  referenceNote,
}: {
  title: string;
  unit: string;
  points: SummaryPoint[];
  paired?: boolean;
  reference?: GraphReference;
  referenceNote?: string;
}) {
  const latest = points.at(-1);
  const chartPoints = graphReferenceData(points, reference);
  const timeline = graphReferenceTimeline(points, reference);
  const hasDatedReference = timeline.some(
    (point) => point.referenceLower !== null,
  );
  const hasUpperReference = timeline.some(
    (point) => point.referenceUpper !== null,
  );
  const referenceLimits = [
    ...(reference?.lines?.map((line) => line.value) || []),
    ...timeline.flatMap((point) => [
      point.referenceLower,
      point.referenceUpper,
    ]),
  ].filter((value): value is number => value !== null);
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
                data={timeline}
                margin={{ left: -20, right: 12, top: 8 }}
              >
                <CartesianGrid
                  stroke="var(--saivie-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(timestamp: number) =>
                    new Date(timestamp).toISOString().slice(5, 10)
                  }
                />
                <YAxis
                  domain={
                    referenceLimits.length
                      ? ([min, max]) => [
                          Math.min(min, ...referenceLimits),
                          Math.max(max, ...referenceLimits),
                        ]
                      : ["auto", "auto"]
                  }
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  labelFormatter={(label) =>
                    new Date(Number(label)).toISOString().slice(0, 10)
                  }
                  contentStyle={{ fontSize: 11 }}
                />
                {reference?.changeDates?.map((date, index) =>
                  points[0] &&
                  latest &&
                  date >= points[0].date &&
                  date <= latest.date &&
                  reference.atDate?.(date) ? (
                    <ReferenceLine
                      key={date}
                      x={Date.parse(`${date}T00:00:00Z`)}
                      stroke="var(--saivie-plum)"
                      strokeDasharray="1 5"
                      label={{
                        value: `${[14, 28, 40][index]}w`,
                        position: "insideBottomLeft",
                        fontSize: 9,
                      }}
                    />
                  ) : null,
                )}
                {reference?.lines?.map((line) => (
                  <ReferenceLine
                    key={line.label}
                    y={line.value}
                    ifOverflow="extendDomain"
                    stroke="var(--saivie-plum)"
                    strokeDasharray="6 4"
                    label={{
                      value: `${line.label}: ${line.value}`,
                      position: "insideTopRight",
                      fontSize: 9,
                    }}
                  />
                ))}
                {hasDatedReference && points.length > 1 && (
                  <Line
                    dataKey="referenceLower"
                    name={
                      hasUpperReference
                        ? "Reference lower bound"
                        : "Screening cutoff"
                    }
                    type={hasUpperReference ? "linear" : "stepAfter"}
                    stroke="var(--saivie-plum)"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                {hasUpperReference && points.length > 1 && (
                  <Line
                    dataKey="referenceUpper"
                    name="Reference upper bound"
                    stroke="var(--saivie-plum)"
                    strokeDasharray="2 4"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                {points.length === 1 && hasDatedReference && (
                  <ReferenceLine
                    y={chartPoints[0].referenceLower ?? undefined}
                    ifOverflow="extendDomain"
                    stroke="var(--saivie-plum)"
                    strokeDasharray="6 4"
                  />
                )}
                {points.length === 1 && hasUpperReference && (
                  <ReferenceLine
                    y={chartPoints[0].referenceUpper ?? undefined}
                    ifOverflow="extendDomain"
                    stroke="var(--saivie-plum)"
                    strokeDasharray="2 4"
                  />
                )}
                <Line
                  dataKey="value"
                  name={paired ? "Systolic" : title}
                  stroke="var(--saivie-teal)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
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
                    connectNulls
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
              {chartPoints.map((point) => (
                <li key={`${point.date}:${point.value}:${point.secondary}`}>
                  {point.date}: {point.value}
                  {paired ? `/${point.secondary}` : ""} {unit} · {point.source}
                  {point.referenceLower !== null &&
                    ` · Reference: ${point.referenceLower}${point.referenceUpper !== null ? `-${point.referenceUpper}` : ""} ${unit}`}
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
      {reference && (
        <div
          className="mt-3 space-y-1 border-t border-saivie-border pt-2 text-[10px] text-saivie-plum"
          data-testid={`graph-reference-${title}`}
        >
          <p className="font-semibold">{reference.label}</p>
          {(hasDatedReference || reference.lines?.length) && (
            <p>
              Round dots: recorded readings. Dashed/dotted lines without dots:
              references only.
            </p>
          )}
          <p>{reference.explanation}</p>
          {points.length > 0 && reference.atDate && !hasDatedReference && (
            <p>
              No reference is drawn for these dates: required dating is missing
              or the readings are outside the supported gestational window.
            </p>
          )}
          <a
            href={reference.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {reference.source.label}
          </a>
        </div>
      )}
      {referenceNote && (
        <p className="mt-3 text-[10px] text-saivie-plum">{referenceNote}</p>
      )}
    </section>
  );
}
