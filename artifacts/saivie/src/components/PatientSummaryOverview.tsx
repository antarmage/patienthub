import React from "react";
import type { Summary } from "./IntakeSummary";
import type { SummaryPoint } from "@/lib/patientSummary";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";
import { gestationalWeekAtDate, pregnancyCumulativeGain, pregnancyWeightBaseline, weightCategories } from "@/lib/pregnancyGraphReferences";
import { HPV_BADGE_COPY } from "@/lib/hpvProtection";
import { CervicalCancerPrevention } from "./HpvPrintBadge";
import { followUpRows } from "../../../../lib/db/src/pregnancy-followup";

export const summaryOverviewStyles = `
.summary-overview{font-size:10px;line-height:1.3;break-after:page;color:#453846}
.summary-masthead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:7px;min-height:15mm;color:#885675;font-size:10px}
.summary-logo-space{display:block;width:42mm;height:15mm;flex-shrink:0}
.summary-identity{display:grid;grid-template-columns:minmax(0,2.4fr) repeat(3,minmax(0,1fr));gap:10px;background:#f7eef6;border-radius:10px;padding:10px;margin-bottom:7px;align-items:center}
.summary-identity h1{font: bold 23px Georgia,serif;margin:0 0 4px;overflow-wrap:anywhere}
.summary-identity p{margin:2px 0;color:#706571}
.summary-identity>div:not(:first-child){border-left:1px solid #d5e0dc;padding-left:10px}
.summary-label{font-size:9px;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px}
.summary-identity strong{font-size:13px}
.summary-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:7px}
.summary-metric{background:#cfe2dc;border-radius:9px;padding:7px;min-width:0}
.summary-metric strong{display:block;font-size:18px;line-height:1.15;overflow-wrap:anywhere}
.summary-metric small{display:block;font-size:9px;margin-top:3px}
.summary-attention{border:1px solid #885675;border-radius:9px;padding:7px 10px;margin-bottom:7px}
.summary-attention h2{color:#885675;font-size:11px;margin:0 0 5px}
.summary-attention ul{margin:0;padding-left:15px}.summary-attention li{margin:0;overflow-wrap:anywhere}
.summary-columns,.summary-charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.summary-overview h3,.summary-detail-title{font-size:10px;text-transform:uppercase;background:#2d6a5f;color:white;padding:5px 8px;border-radius:4px;margin:0 0 4px}
.summary-overview table{width:100%;border-collapse:collapse;table-layout:fixed}
.summary-overview td,.summary-overview th{padding:2px 5px;text-align:left;vertical-align:top;border-bottom:1px solid #dce5e1;overflow-wrap:anywhere;width:auto}
.summary-overview .summary-kv td:first-child{width:36%;font-weight:600;color:#2d6a5f}
.summary-chart{border:1px solid #d5e0dc;border-radius:8px;background:#f1f6f3;padding:7px;min-width:0}
.summary-chart h4{margin:0;font-size:10px}.summary-chart svg{width:100%;height:115px;display:block}
.summary-trends,.summary-reference,.summary-notes{margin-top:7px}
.summary-caption{font-size:9px;color:#706571;margin:3px 0}
.summary-reference table{font-size:9px}.summary-reference th{background:#cfe2dc;color:#2d6a5f}.summary-reference tr.selected{background:#f7eef6;font-weight:600}
.summary-notes-lines{border:1px solid #d5e0dc;border-radius:6px;padding:0 10px}
.summary-notes-lines div{height:17px;border-bottom:1px solid #dce5e1}.summary-notes-lines div:last-child{border:0}
.summary-footer{font-size:8px;color:#706571;margin-top:7px;border-top:1px solid #d5e0dc;padding-top:5px}
.summary-overview section,.summary-identity,.summary-metrics{break-inside:avoid}
.summary-columns section{break-inside:auto}.summary-overview tr{break-inside:avoid}
.summary-continuation{font-size:10px;color:#706571;margin-bottom:12px}
.summary-print{font:9.5px/1.3 Arial,Helvetica,sans-serif;color:#453846}
.summary-print .summary-overview{font:inherit;break-after:auto}
.summary-print .summary-masthead{min-height:0;margin-bottom:6px;font-size:9px}
.summary-print .summary-logo-space{display:none}
.summary-print .summary-identity{padding:9px;gap:8px;grid-template-columns:minmax(0,2.4fr) minmax(0,.7fr) minmax(0,1.3fr) minmax(0,.8fr)}
.summary-print .summary-identity h1{font-size:22px}
.summary-print .summary-identity strong{font-size:12px}
.summary-print .summary-person{display:flex;align-items:center;gap:12px;min-width:0}
.summary-initials{display:flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px;border-radius:50%;background:#885675;color:white;font-size:16px;font-weight:bold}
.summary-print .summary-metrics{gap:7px}
.summary-print .summary-metric{padding:7px 9px}
.summary-print .summary-metric strong{font-size:18px}
.summary-print .summary-label{font-size:8px;margin-bottom:3px}
.summary-print .summary-attention{padding:7px 9px}
.summary-print .summary-attention h2{font-size:10px}
.summary-print .summary-attention li{margin:2px 0}
.summary-print .summary-columns,.summary-print .summary-charts{gap:12px}
.summary-print h3{font:bold 10px/1.25 Arial,Helvetica,sans-serif;text-transform:uppercase;background:#2d6a5f;color:white;padding:4px 8px;border-radius:4px;margin:0 0 4px;break-after:avoid}
.summary-print .summary-kv td{padding:2px 5px}
.summary-print .summary-chart{padding:7px 9px}
.summary-print .summary-chart svg{height:115px}
.summary-print .summary-notes-lines div{height:17px}
.summary-detail-page{break-before:page}
.summary-detail-page>h2{display:flex;justify-content:space-between;gap:10px;background:#2d6a5f;color:white;padding:6px 8px;border-radius:4px;font-size:10px;line-height:1.3;margin:0 0 10px}
.summary-detail-page>h2 small{font-size:8px;font-weight:normal;text-align:right}
.summary-measurements{font-size:9px;margin-bottom:6px}
.summary-print th{background:#cfe2dc;color:#2d6a5f}
.summary-print td,.summary-print th{padding:4px 6px}
.summary-print tr.selected{background:#f7eef6;font-weight:bold}
.summary-labs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:6px 0}
.summary-labs section{border:1px solid #d5e0dc;border-radius:7px;background:#f1f6f3;padding:6px 9px}
.summary-labs h4{margin:0 0 3px;color:#2d6a5f;font-size:9px;text-transform:uppercase}
.summary-print .summary-reference{margin:10px 0}
.summary-print .summary-reference table{font-size:8.5px}
.summary-print .summary-prevention{border:1px solid #885675;border-radius:6px;background:#f7eef6;margin-top:10px;break-inside:avoid}
.summary-print .summary-prevention>h2{background:#885675;color:white;padding:5px 8px;margin:0;font-size:10px;text-transform:uppercase}
.summary-print .summary-prevention>section{border:0!important;border-radius:0!important;padding:7px 9px!important;margin:0!important;font-size:9px!important;line-height:1.3!important;color:inherit!important}
.summary-print .summary-prevention>section>h2{display:none}
.summary-print .summary-prevention p{margin:4px 0}
.summary-print .summary-prevention ul{margin:5px 0;padding-left:16px!important}
.summary-print .summary-prevention li{margin:2px 0}
.summary-print .summary-prevention p:last-child{font-size:8px!important}
.summary-print .summary-detail-page .summary-notes-lines div{height:18px}
.summary-print .summary-supplement{margin-top:8px}
@page{size:A4;margin:30mm 12mm 20mm}
`;

const hpvLabels = {
  protected: HPV_BADGE_COPY.protected.label, "in-progress": HPV_BADGE_COPY["in-progress"].label,
  "not-vaccinated": "Patient reports not vaccinated", unknown: "Vaccination unknown", "not-recorded": "Vaccination not recorded",
};

const antenatalLabels: Record<string, string> = {
  "What is the last menstrual period or estimated gestational age?": "Reported gestational age",
  "Has antenatal care started?": "Antenatal care started",
  "Any recent scan or laboratory results?": "Recent scan / lab results",
  "What is the main concern today?": "Main concern today",
  "Any pain, bleeding, fluid loss, or fever?": "Pain / bleeding / fluid / fever",
  "Any headache, vision change, or swelling?": "Headache / vision / swelling",
  "Any change in fetal movement when applicable?": "Change in fetal movement",
  "Are fetal movements as expected for gestation?": "Movements as expected",
  "What were the latest growth or wellbeing findings?": "Latest growth findings",
  "Any prior pregnancy complications?": "Prior pregnancy complications",
  "What follow-up has already been arranged?": "Follow-up arranged",
};

function TrendChart({ name, unit, points, context }: { name: string; unit: string; points: SummaryPoint[]; context: PregnancyVisitContext }) {
  const dating = context.weightReference;
  const currentWeek = dating ? gestationalWeekAtDate(dating, context.asOf) : null;
  const dated = points.flatMap((point) => {
    const week = dating ? gestationalWeekAtDate(dating, point.date) : null;
    return week === null ? [] : [{ ...point, week }];
  });
  if (!dated.length) return <div className="summary-chart"><h4>{name} ({unit})</h4><p>{points.length ? "Readings available; gestational dating unavailable. See dated readings on the following pages." : "No recorded readings in this pregnancy."}</p></div>;
  const values = dated.flatMap((point) => point.secondary == null ? [point.value] : [point.value, point.secondary]);
  const lower = Math.floor(Math.min(...values) / (name === "Weight" ? 2 : 10)) * (name === "Weight" ? 2 : 10) - (name === "Weight" ? 2 : 10);
  const upper = Math.max(...values) + (name === "Weight" ? 2 : 10);
  const end = Math.max(40, ...dated.map((point) => point.week), currentWeek ?? 0);
  const x = (week: number) => 32 + week / end * 270;
  const y = (value: number) => 115 - (value - lower) / (upper - lower) * 90;
  return <div className="summary-chart"><h4>{name} ({unit})</h4>
    <svg viewBox="0 0 330 151" role="img" aria-label={`${name} by gestational week; dated readings on continuation pages`}>
      {Array.from({ length: 5 }, (_, index) => {
        const value = lower + (upper - lower) * index / 4;
        return <g key={index}><path d={`M32 ${y(value)}H310`} stroke="#d5e0dc" /><text x="27" y={y(value) + 3} textAnchor="end" fontSize="8" fill="#706571">{value.toFixed(name === "Weight" ? 1 : 0)}</text></g>;
      })}
      {Array.from({ length: 10 }, (_, index) => (index + 1) * 4).map((week) => <text key={week} x={x(week)} y="132" textAnchor="middle" fontSize="8" fill="#706571">{week}</text>)}
      {currentWeek !== null && <g><path d={`M${x(currentWeek)} 15V118`} stroke="#885675" strokeDasharray="3 3" /><text x={Math.min(280, Math.max(58, x(currentWeek)))} y="11" textAnchor="middle" fontSize="8" fill="#885675">Visit {Math.floor(currentWeek)}w</text></g>}
      <polyline points={dated.map((point) => `${x(point.week)},${y(point.value)}`).join(" ")} fill="none" stroke="#2d6a5f" strokeWidth="2" />
      {dated.some((point) => point.secondary != null) && <polyline points={dated.filter((point) => point.secondary != null).map((point) => `${x(point.week)},${y(point.secondary!)}`).join(" ")} fill="none" stroke="#885675" strokeWidth="2" strokeDasharray="4 3" />}
      {dated.map((point, index) => <g key={index}><circle cx={x(point.week)} cy={y(point.value)} r="3" fill="white" stroke="#2d6a5f" /><text x={x(point.week)} y={y(point.value) - 6} textAnchor="middle" fontSize="8" fill="#2d6a5f">{point.value}</text>
        {point.secondary != null && <><circle cx={x(point.week)} cy={y(point.secondary)} r="3" fill="white" stroke="#885675" /><text x={x(point.week)} y={y(point.secondary) + 12} textAnchor="middle" fontSize="8" fill="#885675">{point.secondary}</text></>}</g>)}
      <text x="168" y="147" textAnchor="middle" fontSize="8" fill="#706571">Gestational weeks</text>
    </svg>
    {name === "Blood pressure" && <p className="summary-caption">Solid: systolic. Dashed: diastolic.</p>}
  </div>;
}

export function PatientSummaryOverview({ summary: s, context, printLayout = false }: { summary: Summary; context: PregnancyVisitContext | null; printLayout?: boolean }) {
  const pregnancy = context?.pregnancy ? context : null;
  const dating = pregnancy?.weightReference;
  const week = dating && pregnancy ? gestationalWeekAtDate(dating, pregnancy.asOf) : null;
  const gestation = week === null ? "Not recorded" : `${Math.floor(week)}w ${Math.round(week * 7) % 7}d`;
  const dueDate = dating?.datingBasis === "LMP" && dating.lmp
    ? new Date(Date.parse(dating.lmp) + 280 * 86400000).toISOString().slice(0, 10) : dating?.dueDate;
  const latestWeight = pregnancy?.trends.weight.at(-1), latestBp = pregnancy?.trends.bp.at(-1);
  const metric = (label: string, value: string, hint?: string) => <div className="summary-metric" key={label}><span className="summary-label">{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
  const findSection = (name: string) => s.sections.find((section) => section.title.replace(/^Original intake: /, "") === name);
  const surveyRows = (findSection("Pre-visit survey (patient-reported)")?.rows || [])
    .map(([label, value]): [string, string] => [printLayout ? antenatalLabels[label] || label : label, value]);
  const todayRows: [string, string][] = pregnancy?.repeat
    ? pregnancy.answers ? followUpRows(pregnancy.answers) : [["Reason for visit", "Follow-up survey not submitted"], ["Current concern", "Not recorded"]]
    : [...(s.concerns.length ? [["Visit concerns", s.concerns.join(", ")] as [string, string]] : []),
      ...(s.complaint ? [["Chief complaint", s.complaint] as [string, string]] : []), ...(findSection("Presenting complaint")?.rows || []), ...surveyRows];
  const lifestyle = findSection("Lifestyle & screening")?.rows || [];
  const obstetric = findSection("Obstetric history")?.rows || [];
  const smokingAlcohol = lifestyle.filter(([label]) => label === "Smoking" || label === "Alcohol");
  const surveyHpv = findSection("Gynecological history")?.rows.find(([label]) => label === "HPV vaccine")?.[1];
  const background = [...(findSection("Medical history")?.rows || []),
    ...(printLayout && obstetric.length ? [["Pregnancy", obstetric.map(([label, value]) => `${label}: ${value}`).join(". ")] as [string, string]] : obstetric),
    ...(findSection("Menstrual history")?.rows.filter(([label]) => label === "LMP") || []),
    ...(printLayout ? [
      ...(smokingAlcohol.length ? [["Smoking / alcohol", smokingAlcohol.map(([label, value]) => `${label}: ${value}`).join("; ")] as [string, string]] : []),
      ...lifestyle.filter(([label]) => label !== "Smoking" && label !== "Alcohol"),
    ] : lifestyle),
    ["HPV vaccine", [surveyHpv, hpvLabels[s.hpvVaccination]].filter(Boolean).join(". ")] as [string, string]];
  const kv = (rows: [string, string][]) => <table className="summary-kv"><tbody>{(rows.length ? rows : [["Survey", "Not recorded"]]).map(([label, value], index) => <tr key={index}><td>{label}</td><td>{value}</td></tr>)}</tbody></table>;
  const missing = pregnancy ? [
    !pregnancy.trends.hb.length && "No hemoglobin results recorded in this pregnancy.",
    !pregnancy.trends.sugar.length && "No blood sugar results recorded in this pregnancy.",
    !pregnancy.answers && pregnancy.repeat && "Follow-up survey not submitted for this appointment; original intake is not today's symptom assessment.",
    latestWeight && latestWeight.date !== pregnancy.asOf && `Latest recorded pregnancy weight: ${latestWeight.date}; no weight recorded for the selected visit date.`,
    latestBp && latestBp.date !== pregnancy.asOf && `Latest recorded pregnancy BP: ${latestBp.date}; no BP recorded for the selected visit date.`,
  ].filter((value): value is string => !!value) : [];
  return <article className="summary-overview" data-testid="summary-clinician-overview">
    <header className="summary-masthead">{!printLayout && <span className="summary-logo-space" aria-label="Reserved space for clinic logo" data-testid="summary-logo-space" />}<strong>{pregnancy ? "Antenatal pre-visit summary" : "Patient pre-visit summary"}</strong><span>Patient-reported; verify clinically</span></header>
    <div className="summary-identity"><div className="summary-person">{printLayout && <span className="summary-initials" aria-hidden="true">{s.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}</span>}<div><h1>{s.name}</h1><p>{[s.phone, ...s.meta.filter((value) => value !== s.age && value !== s.phone)].filter(Boolean).join(" | ")}</p></div></div><div><span className="summary-label">Age</span><strong>{s.age || "Not recorded"}</strong></div><div><span className="summary-label">Visit date</span><strong>{s.visitDate}</strong></div><div><span className="summary-label">Patient ID</span><strong>{s.patientId || "Not recorded"}</strong></div></div>
    <div className="summary-metrics">{pregnancy ? <>
      {metric("Blood pressure", latestBp ? `${latestBp.value} / ${latestBp.secondary ?? "?"}` : "Not recorded", latestBp ? `mmHg | ${summaryDate(latestBp.date)} | ${latestBp.source}` : undefined)}
      {metric("Weight", latestWeight ? `${latestWeight.value} kg` : "Not recorded", latestWeight ? `${summaryDate(latestWeight.date)} | ${latestWeight.source}` : undefined)}
      {metric("LMP", dating?.lmp ? summaryDate(dating.lmp) : "Not recorded", dueDate ? `EDD ${summaryDate(dueDate)}` : undefined)}
      {metric("Gestation", gestation, week === null ? "Dating unavailable" : `${week < 14 ? "1st" : week < 28 ? "2nd" : "3rd"} trimester`)}
      {metric("Obstetric", s.metrics.find((row) => row.label === "Obstetric")?.value || "Not recorded", s.metrics.find((row) => row.label === "Obstetric")?.hint)}
    </> : s.metrics.slice(0, 5).map((row) => metric(row.label, row.value, row.hint))}</div>
    <section className="summary-attention"><h2>For clinician attention</h2>{s.insights.length || missing.length ? <ul>{s.insights.map((row, index) => <li key={`insight-${index}`}>{row.text}</li>)}{missing.map((value) => <li key={value}>{value}</li>)}</ul> : <p>No automated attention items derived. This is not a clinical risk assessment.</p>}</section>
    <div className="summary-columns"><section><h3>{pregnancy?.repeat ? "This visit (patient-reported)" : "Today's visit (patient-reported)"}</h3>{kv(todayRows)}{pregnancy?.repeat && <p className="summary-caption">Original intake is historical, not today's symptom assessment.</p>}</section><section><h3>Medical background</h3>{kv(background)}</section></div>
    {pregnancy && <><section className="summary-trends"><h3>Trends (recorded readings only)</h3><div className="summary-charts"><TrendChart name="Weight" unit="kg" points={pregnancy.trends.weight} context={pregnancy} /><TrendChart name="Blood pressure" unit="mmHg" points={pregnancy.trends.bp} context={pregnancy} /></div><p className="summary-caption">Visit marker is the selected appointment, not the print date. No readings are extrapolated. All dated values, sources, hemoglobin and separate sugar tests continue on the following pages.</p></section>
      {!printLayout && <PregnancyWeightReference context={pregnancy} />}
      </>}
    <section className="summary-notes"><h3>Doctor's notes</h3><div className="summary-notes-lines"><div /><div /><div /></div></section>
  </article>;
}

function summaryDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : value;
}

function PregnancyWeightReference({ context: pregnancy }: { context: PregnancyVisitContext }) {
  const dating = pregnancy.weightReference;
  const week = dating ? gestationalWeekAtDate(dating, pregnancy.asOf) : null;
  const latestWeight = pregnancy.trends.weight.at(-1);
  const baseline = dating ? pregnancyWeightBaseline(dating, pregnancy.trends.weight) : null;
  const visitGain = latestWeight?.date === pregnancy.asOf && baseline ? latestWeight.value - baseline.weight : null;
  const bmi = baseline && dating?.maternalHeightCm ? baseline.weight / (dating.maternalHeightCm / 100) ** 2 : null;
  const selectedCategory = bmi === null ? null : weightCategories.find((category) => bmi < category.ceiling);
  const range = (value: { lower: number; upper: number } | null) => value ? `${value.lower.toFixed(1)} - ${value.upper.toFixed(1)}` : "No weekly target";
  return <section className="summary-reference"><h3>Weight gain reference (IOM/NRC 2009, single baby)</h3>
        {dating?.fetusCount != null && dating.fetusCount !== 1 ? <p>Multiple pregnancy recorded: singleton ranges are not applied. Ask the clinician for an appropriate weight-gain plan.</p> : <>
          <table><thead><tr><th>Pre-pregnancy BMI</th><th>Total gain by term (kg)</th><th>Expected gain{week === null ? "" : ` at ${Math.floor(week)}w`} (kg)</th><th>Reference weight{week === null ? "" : ` at ${Math.floor(week)}w`} (kg)</th><th>{baseline?.estimated ? "Est. gain" : "Recorded gain"}{visitGain === null ? "" : ` ${visitGain >= 0 ? "+" : ""}${visitGain.toFixed(1)} kg`} is</th></tr></thead><tbody>
            {weightCategories.map((category, index) => {
              const gainRange = week === null ? null : pregnancyCumulativeGain(week, category);
              const comparison = visitGain === null ? "No visit weight / baseline" : !gainRange ? "No weekly target" : visitGain < gainRange.lower ? "Below range" : visitGain > gainRange.upper ? "Above range" : "Within range";
              return <tr key={category.label} className={dating?.fetusCount === 1 && selectedCategory === category ? "selected" : undefined}><td>{category.label} ({["<18.5", "18.5-24.9", "25-29.9", "30+"][index]})</td><td>{category.total}</td><td>{week === null ? "Dating unavailable" : range(gainRange)}</td><td>{week === null ? "Dating unavailable" : baseline ? range(pregnancyCumulativeGain(week, category, baseline.weight)) : "Baseline unavailable"}</td><td>{comparison}</td></tr>;
            })}
          </tbody></table>
          <p className="summary-caption">Height: {dating?.maternalHeightCm ? `${dating.maternalHeightCm} cm` : "________ cm"} | {baseline?.estimated ? "Estimated" : "Pre-pregnancy"} BMI: {bmi === null ? "________" : bmi.toFixed(1)} | Category: {selectedCategory?.label || "not assigned"} | Visit weight: ________ kg</p>
          <p className="summary-caption">{dating?.fetusCount == null ? "Baby count not recorded: these are conditional single-baby ranges only; do not apply until singleton status is confirmed. " : ""}{baseline ? `${baseline.estimated ? `Estimated baseline ${baseline.weight} kg from ${baseline.date} (${baseline.gestation}, ${baseline.source}), not confirmed pre-pregnancy weight` : `Confirmed pre-pregnancy weight ${baseline.weight} kg`}. ` : "No confirmed or eligible first-trimester baseline. "}{latestWeight && baseline ? `Recorded gain: ${(latestWeight.value - baseline.weight).toFixed(1)} kg on ${latestWeight.date}. ` : ""}Approximate formula: 0.5-2 kg first-trimester gain plus (gestational weeks - 13) x BMI-specific weekly rate, through 40w 0d. No early weekly target is invented. Derived ranges are not individual targets and may differ from published term totals. <a href="https://www.nationalacademies.org/read/12584/chapter/2">Source: IOM/NRC 2009 Table S-1</a>.</p>
        </>}
      </section>;
}

export function PatientSummaryPrint({ summary, context }: { summary: Summary; context: PregnancyVisitContext }) {
  const baseline = context.weightReference ? pregnancyWeightBaseline(context.weightReference, context.trends.weight) : null;
  const dates = [...new Set([...context.trends.weight, ...context.trends.bp].map((point) => point.date))].sort();
  const mainSections = new Set(["Presenting complaint", "Pre-visit survey (patient-reported)", "Medical history", "Obstetric history", "Lifestyle & screening"]);
  const additional = summary.sections.flatMap((section) => {
    const title = section.title.replace(/^Original intake: /, "");
    if (mainSections.has(title) && !(context.repeat && ["Presenting complaint", "Pre-visit survey (patient-reported)"].includes(title))) return [];
    if (title === "Menstrual history") {
      const rows = section.rows.filter(([label]) => label !== "LMP");
      return rows.length ? [{ ...section, rows }] : [];
    }
    if (title === "Gynecological history") {
      const rows = section.rows.filter(([label]) => label !== "HPV vaccine");
      return rows.length ? [{ ...section, rows }] : [];
    }
    return [section];
  });
  return <main className="summary-print" data-testid="summary-letterhead-document">
    <PatientSummaryOverview summary={summary} context={context} printLayout />
    <article className="summary-overview summary-detail-page" data-testid="summary-measurement-page">
      <h2><span>Detailed measurements, weight reference and prevention advice</span><small>{summary.name} | {summary.patientId} | Visit {summary.visitDate}</small></h2>
      <section><h3>Pregnancy measurements (current pregnancy, recorded readings only)</h3>
        <p className="summary-caption">{context.label} · Through appointment {context.asOf}</p>
        <table className="summary-measurements"><thead><tr>{["Date", "Gestation", "Weight (kg)", baseline?.estimated ? "Est. gain (kg)" : "Gain (kg)", "BP (mmHg)", "Source"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
          <tbody>{dates.flatMap((date) => {
            const weights = context.trends.weight.filter((point) => point.date === date);
            const bps = context.trends.bp.filter((point) => point.date === date);
            const week = context.weightReference ? gestationalWeekAtDate(context.weightReference, date) : null;
            const days = week === null ? null : Math.round(week * 7);
            return Array.from({ length: Math.max(weights.length, bps.length) }, (_, index) => {
              const weight = weights[index], bp = bps[index];
              return <tr key={`${date}-${index}`} className={date === context.asOf ? "selected" : undefined}><td>{summaryDate(date)}</td><td>{days === null ? "Not recorded" : `${Math.floor(days / 7)}w ${days % 7}d`}</td><td>{weight?.value ?? "—"}</td><td>{weight && baseline ? `${weight.value > baseline.weight ? "+" : ""}${(weight.value - baseline.weight).toFixed(1)}` : "—"}</td><td>{bp ? `${bp.value} / ${bp.secondary ?? "?"}` : "—"}</td><td>{[...new Set([weight?.source, bp?.source].filter(Boolean))].join(" / ")}</td></tr>;
            });
          })}</tbody></table>
        {!dates.length && <p>No recorded BP or weight readings in this pregnancy.</p>}
        <div className="summary-labs"><section><h4>Hemoglobin (g/dL)</h4>{context.trends.hb.length ? context.trends.hb.map((point, index) => <p key={index}>{summaryDate(point.date)}: {point.value} · {point.source}</p>) : <p>No recorded readings in this pregnancy.</p>}</section>
          <section><h4>Sugar</h4>{context.trends.sugar.length ? context.trends.sugar.map((series) => <div key={`${series.name}-${series.unit}`}><strong>{series.name} ({series.unit})</strong>{series.points.map((point, index) => <p key={index}>{summaryDate(point.date)}: {point.value} · {point.source}</p>)}</div>) : <p>No recorded sugar results in this pregnancy.</p>}</section></div>
        <p className="summary-caption">Dating source: {context.weightReference?.datingSource || context.weightReference?.datingBasis || "Not recorded"}. Records are scoped by pregnancy links or established pregnancy dates; ambiguous records are excluded. Gaps between readings are not estimated.</p>
      </section>
      <PregnancyWeightReference context={context} />
      {summary.hpvVaccination !== "protected" && <div className="summary-prevention"><h2>Cervical cancer prevention: risk and options</h2><CervicalCancerPrevention status={summary.hpvVaccination} /></div>}
      {!!additional.length && <section className="summary-supplement"><h3>Additional recorded history</h3>{additional.map((section) => <section key={section.title}><h4>{section.title}</h4><table className="summary-kv"><tbody>{section.rows.map(([label, value], index) => <tr key={index}><td>{label}</td><td>{value}</td></tr>)}</tbody></table></section>)}</section>}
      {!!summary.bpRows.length && <section><h3>Patient-recorded BP</h3><table><tbody>{summary.bpRows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{value}</td>)}</tr>)}</tbody></table></section>}
      {!!summary.weightRows.length && <section><h3>Patient-recorded weight</h3><table><tbody>{summary.weightRows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{value}</td>)}</tr>)}</tbody></table></section>}
      <section className="summary-notes"><h3>Additional notes</h3><div className="summary-notes-lines">{Array.from({ length: 4 }, (_, index) => <div key={index} />)}</div></section>
    </article>
  </main>;
}
