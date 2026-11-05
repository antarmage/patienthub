import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SummaryPoint } from "@/lib/patientSummary";
import { followUpRows, type PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";
import { gestationalWeekAtDate, pregnancyWeightBaseline, pregnancyWeightReference } from "@/lib/pregnancyGraphReferences";

export function PregnancyPrintTrends({ context }: { context: PregnancyVisitContext | null }) {
  if (!context?.pregnancy) return null;
  const baseline = context.weightReference;
  const reference = baseline ? pregnancyWeightReference(baseline, context.trends.weight) : null;
  const resolvedBaseline = baseline ? pregnancyWeightBaseline(baseline, context.trends.weight) : null;
  const baselineWeight = resolvedBaseline?.weight;
  const gestation = (date: string) => {
    const week = baseline ? gestationalWeekAtDate(baseline, date) : null;
    const days = week === null ? null : Math.round(week * 7);
    return days === null ? "Dating unavailable" : `${Math.floor(days / 7)}w ${days % 7}d`;
  };
  const rangeText = (date: string, gain = false) => {
    const range = reference?.atDate?.(date);
    if (!range || range.upper == null || gain && baselineWeight == null) return "Not available";
    const offset = gain ? baselineWeight ?? 0 : 0;
    return `${(range.lower - offset).toFixed(1)}-${(range.upper - offset).toFixed(1)} kg`;
  };
  const series = [
    { name: "Weight", unit: "kg", points: context.trends.weight },
    { name: "Blood pressure", unit: "mmHg (systolic / diastolic)", points: context.trends.bp },
    { name: "Hemoglobin", unit: "g/dL", points: context.trends.hb },
    ...context.trends.sugar.map((row) => ({ ...row, name: `Sugar · ${row.name}` })),
  ];
  const graph = (points: SummaryPoint[], name: string) => {
    if (!points.length) return null;
    const weightBand = name === "Weight" ? points.flatMap((point) => {
      const range = reference?.atDate?.(point.date);
      return range ? [{ point, range }] : [];
    }) : [];
    const values = [...points.flatMap((point) => point.secondary == null ? [point.value] : [point.value, point.secondary]),
      ...weightBand.flatMap(({ range }) => [range.lower, range.upper ?? range.lower])];
    const min = Math.min(...values), max = Math.max(...values);
    const first = Date.parse(points[0].date), last = Date.parse(points[points.length - 1].date);
    const x = (point: SummaryPoint) => 20 + (last === first ? 0.5 : (Date.parse(point.date) - first) / (last - first)) * 300;
    const y = (value: number) => 75 - (max === min ? 0.5 : (value - min) / (max - min)) * 60;
    return <svg viewBox="0 0 340 95" role="img" aria-label={`${name}: dated readings shown below`} style={{ width: "100%", maxWidth: 380, height: 106 }}>
      <path d="M20 10V80H325" fill="none" stroke="#bfd3cb" />
      {weightBand.length > 1 && <polygon fill="#cfe2dc" opacity="0.6" points={[
        ...weightBand.map(({ point, range }) => `${x(point)},${y(range.lower)}`),
        ...weightBand.slice().reverse().map(({ point, range }) => `${x(point)},${y(range.upper ?? range.lower)}`),
      ].join(" ")} />}
      <polyline fill="none" stroke="#2d6a5f" strokeWidth="2" points={points.map((point) => `${x(point)},${y(point.value)}`).join(" ")} />
      {points.some((point) => point.secondary != null) && <polyline fill="none" stroke="#885675" strokeWidth="2" strokeDasharray="4 3" points={points.filter((point) => point.secondary != null).map((point) => `${x(point)},${y(point.secondary!)}`).join(" ")} />}
      {points.map((point, index) => <g key={index}><circle cx={x(point)} cy={y(point.value)} r="3" fill="#2d6a5f" />{point.secondary != null && <circle cx={x(point)} cy={y(point.secondary)} r="3" fill="#885675" />}</g>)}
      <text x="20" y="93" fontSize="9">{points[0].date}</text><text x="320" y="93" textAnchor="end" fontSize="9">{points[points.length - 1].date}</text>
    </svg>;
  };
  return <section style={{ marginTop: 20 }}>
    <h2>Pregnancy measurements</h2>
    <p>{context.label} · Through appointment {context.asOf}. Recorded readings only; gaps are not estimated.</p>
    <section style={{ breakInside: "avoid" }}>
      <h3>Week-wise pregnancy weight gain</h3>
      {baseline?.datingSource && <p>Pregnancy dating source: {baseline.datingSource}.</p>}
      {resolvedBaseline?.estimated && <p>Using estimated baseline {resolvedBaseline.weight} kg from {resolvedBaseline.date} ({resolvedBaseline.gestation}, {resolvedBaseline.source}). Gain is estimated; early gain or loss can affect this comparison.</p>}
      <p>Gestation at this appointment: {gestation(context.asOf)}. Reference weight: {rangeText(context.asOf)}; reference gain from {resolvedBaseline?.estimated ? "estimated baseline" : "pre-pregnancy weight"}: {rangeText(context.asOf, true)}.</p>
      <p>{reference ? <><strong>{reference.label}. </strong>{reference.explanation}</> : "Weight reference unavailable. Record maternal height, number of babies and pregnancy dating in this pregnancy episode. Use confirmed pre-pregnancy weight or, if missing, an unambiguous first-trimester weight before 14 weeks as an explicitly estimated baseline. Later pregnancy weights are not used as a pre-pregnancy baseline."}</p>
      {reference && <p style={{ fontSize: 11 }}>Source: <a href={reference.source.url}>{reference.source.label}</a></p>}
    </section>
    {series.map((row) => <section key={`${row.name}|${row.unit}`} style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 4 }}>{row.name} ({row.unit})</h3>
      {row.points.length ? <>{graph(row.points, row.name)}<table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th>Date</th>{row.name === "Weight" && <th>Gestation</th>}<th>Reading</th>{row.name === "Weight" && <><th>{resolvedBaseline?.estimated ? "Estimated gain (kg)" : "Actual gain (kg)"}</th><th>Reference weight</th><th>Reference gain</th></>}<th>Source</th></tr></thead>
        <tbody>{row.points.map((point, index) => <tr key={index} style={{ breakInside: "avoid" }}><td>{point.date}</td>{row.name === "Weight" && <td>{gestation(point.date)}</td>}<td>{point.value}{point.secondary == null ? "" : ` / ${point.secondary}`}</td>{row.name === "Weight" && <><td>{baselineWeight == null ? "Not available" : (point.value - baselineWeight).toFixed(1)}</td><td>{rangeText(point.date)}</td><td>{rangeText(point.date, true)}</td></>}<td>{point.source}</td></tr>)}</tbody>
      </table></> : <p>No recorded readings in this pregnancy.</p>}
      {row.name === "Weight" && reference?.atDate && <p style={{ fontSize: 11 }}>Shaded band: illustrative BMI-based weight range. Readings outside the band need clinician interpretation, not an automatic diagnosis. Before 13w 0d, only the first-trimester total-gain guidance applies; no week-specific weight is estimated. No reference is extrapolated after 40w 0d.</p>}
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
