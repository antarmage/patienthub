import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SummaryPoint } from "@/lib/patientSummary";
import { followUpRows, type PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";

export function PregnancyPrintTrends({ context }: { context: PregnancyVisitContext | null }) {
  if (!context?.pregnancy) return null;
  const series = [
    { name: "Weight", unit: "kg", points: context.trends.weight },
    { name: "Blood pressure", unit: "mmHg (systolic / diastolic)", points: context.trends.bp },
    { name: "Hemoglobin", unit: "g/dL", points: context.trends.hb },
    ...context.trends.sugar.map((row) => ({ ...row, name: `Sugar · ${row.name}` })),
  ];
  const graph = (points: SummaryPoint[], name: string) => {
    if (!points.length) return null;
    const values = points.flatMap((point) => point.secondary == null ? [point.value] : [point.value, point.secondary]);
    const min = Math.min(...values), max = Math.max(...values);
    const first = Date.parse(points[0].date), last = Date.parse(points[points.length - 1].date);
    const x = (point: SummaryPoint) => 20 + (last === first ? 0.5 : (Date.parse(point.date) - first) / (last - first)) * 300;
    const y = (value: number) => 75 - (max === min ? 0.5 : (value - min) / (max - min)) * 60;
    return <svg viewBox="0 0 340 95" role="img" aria-label={`${name}: dated readings shown below`} style={{ width: "100%", maxWidth: 380, height: 106 }}>
      <path d="M20 10V80H325" fill="none" stroke="#bfd3cb" />
      <polyline fill="none" stroke="#2d6a5f" strokeWidth="2" points={points.map((point) => `${x(point)},${y(point.value)}`).join(" ")} />
      {points.some((point) => point.secondary != null) && <polyline fill="none" stroke="#885675" strokeWidth="2" strokeDasharray="4 3" points={points.filter((point) => point.secondary != null).map((point) => `${x(point)},${y(point.secondary!)}`).join(" ")} />}
      {points.map((point, index) => <g key={index}><circle cx={x(point)} cy={y(point.value)} r="3" fill="#2d6a5f" />{point.secondary != null && <circle cx={x(point)} cy={y(point.secondary)} r="3" fill="#885675" />}</g>)}
      <text x="20" y="93" fontSize="9">{points[0].date}</text><text x="320" y="93" textAnchor="end" fontSize="9">{points[points.length - 1].date}</text>
    </svg>;
  };
  return <section style={{ marginTop: 20 }}>
    <h2>Pregnancy measurements</h2>
    <p>{context.label} · Through appointment {context.asOf}. Recorded readings only; gaps are not estimated.</p>
    {series.map((row) => <section key={`${row.name}|${row.unit}`} style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 4 }}>{row.name} ({row.unit})</h3>
      {row.points.length ? <>{graph(row.points, row.name)}<table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th>Date</th><th>Reading</th><th>Source</th></tr></thead>
        <tbody>{row.points.map((point, index) => <tr key={index} style={{ breakInside: "avoid" }}><td>{point.date}</td><td>{point.value}{point.secondary == null ? "" : ` / ${point.secondary}`}</td><td>{point.source}</td></tr>)}</tbody>
      </table></> : <p>No recorded readings in this pregnancy.</p>}
    </section>)}
    {!context.trends.sugar.length && <section><h3>Sugar</h3><p>No recorded sugar results in this pregnancy.</p></section>}
    <p style={{ fontSize: 11 }}>BP: solid line is systolic; dashed line is diastolic. Sugar tests and units are plotted separately. Records are scoped by pregnancy links or established pregnancy dates; ambiguous records are excluded.</p>
  </section>;
}

export function PregnancyFollowUpPrint({ context }: { context: PregnancyVisitContext | null }) {
  if (!context?.answers) return null;
  return <section><h2>Pregnancy follow-up · {context.asOf}</h2><p>Patient-reported; verify with the care team.</p>
    <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>{followUpRows(context.answers).map(([label, value]) => <tr key={label} style={{ breakInside: "avoid" }}><th>{label}</th><td style={{ whiteSpace: "pre-wrap" }}>{value}</td></tr>)}</tbody></table>
  </section>;
}

export const pregnancyPrintHtml = (context: PregnancyVisitContext | null) =>
  renderToStaticMarkup(<><PregnancyFollowUpPrint context={context} /><PregnancyPrintTrends context={context} /></>);
