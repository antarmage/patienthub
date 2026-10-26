import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { consultationSurveyForVisit, surveyQuestions } from "@/lib/consultationSurvey";
import { summaryRecord, summaryTrends, type SummaryLab, type SummaryPoint, type SummaryVisit } from "@/lib/patientSummary";

function Trend({ title, unit, points, paired = false }: { title: string; unit: string; points: SummaryPoint[]; paired?: boolean }) {
  const latest = points.at(-1);
  return <section className="min-w-0 rounded-lg border border-saivie-border bg-saivie-ivory p-4">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="text-xs font-semibold text-saivie-teal">{title}</h3><span className="text-[10px] text-saivie-plum">{unit}</span></div>
    {latest ? <>
      <p className="mt-2 text-xl font-semibold text-saivie-plum">{latest.value}{paired ? `/${latest.secondary}` : ""}<span className="ml-2 text-[10px] font-normal">{latest.date} · {latest.source}</span></p>
      <div className="mt-3 h-40" data-testid={`summary-trend-${title}`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1}>
          <LineChart data={points} margin={{ left: -20, right: 12, top: 8 }}>
            <CartesianGrid stroke="var(--saivie-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(date: string) => date.slice(5)} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
            <Tooltip labelFormatter={(label) => String(label)} contentStyle={{ fontSize: 11 }} />
            <Line dataKey="value" name={paired ? "Systolic" : title} stroke="var(--saivie-teal)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            {paired && <Line dataKey="secondary" name="Diastolic" stroke="var(--saivie-rose)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-saivie-plum">{paired ? "Systolic / diastolic · " : ""}{points.length === 1 ? "One reading; trend not yet available." : `${points.length} recorded readings`}</p>
    </> : <p className="flex h-48 items-center justify-center text-xs text-saivie-plum">No recorded readings.</p>}
  </section>;
}

export function PatientSummaryDashboard({ patient, appointmentId, complaint, checkInVitals, visits, labs, bpLogs, weightLogs, medications, pregnancy, pregnancyContext, conceptionSection, sources, onConsultation }: {
  patient: { name: string; history?: unknown; lmp?: string; cycleLength?: number | string; riskScore?: { level?: string; factors?: { factor: string }[] } };
  appointmentId?: number;
  complaint?: string;
  checkInVitals?: unknown;
  visits: SummaryVisit[];
  labs: SummaryLab[];
  bpLogs: { date?: string; systolic: number; diastolic: number }[];
  weightLogs: { date?: string; weight: number; unit?: string }[];
  medications: { id: number; name: string; dose?: string; frequency?: string; status?: string }[];
  pregnancy: boolean;
  pregnancyContext: { weeks: number; days: number; dueDate: string; trimester: string } | null;
  conceptionSection?: React.ReactNode;
  sources: { label: string; loading: boolean; failed: boolean; retry: () => void }[];
  onConsultation: () => void;
}) {
  const trends = summaryTrends(visits, bpLogs, weightLogs, labs);
  const history = summaryRecord(patient.history);
  const intake = summaryRecord(history.onboarding);
  const currentSurvey = appointmentId != null && String(history.onboardingAppointmentId) === String(appointmentId);
  const survey = consultationSurveyForVisit(history, appointmentId);
  const health = summaryRecord(intake.health);
  const cycle = summaryRecord(intake.cycle);
  const sortedVisits = [...visits].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const latest = sortedVisits[0];
  const checkIn = summaryRecord(checkInVitals);
  const text = (value: unknown) => typeof value === "string" && value.trim() ? value : Array.isArray(value) ? value.filter((item) => typeof item === "string").join(", ") || "Not recorded" : "Not recorded";
  return <div className="relative z-0 min-h-0 flex-1 overflow-y-auto bg-saivie-surface-muted p-3 sm:p-5" data-testid="patient-summary-dashboard">
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold text-saivie-teal">Patient Summary</h2><p className="text-xs text-saivie-plum">{pregnancy ? "Pregnancy overview" : "Pre-consultation overview"} · {visits.length} recorded visits</p></div><Button size="sm" onClick={onConsultation}>Open consultation</Button></div>
      {sources.filter((source) => source.loading || source.failed).map((source) => <div key={source.label} role={source.failed ? "alert" : "status"} className={`rounded-md border p-3 text-xs ${source.failed ? "border-rose-200 bg-rose-50 text-rose-800" : "border-saivie-border text-saivie-plum"}`}>{source.failed ? `${source.label} unavailable; overview may be incomplete.` : `Loading ${source.label.toLowerCase()}…`}{source.failed && <button type="button" className="ml-2 underline" onClick={source.retry}>Retry {source.label.toLowerCase()}</button>}</div>)}
      <section className="grid gap-3 rounded-lg border border-saivie-border bg-saivie-ivory p-4 sm:grid-cols-3">
        {pregnancy ? <>
          <div><p className="text-[10px] text-saivie-plum">Gestation · LMP estimate</p><p className="mt-1 font-semibold text-saivie-teal">{pregnancyContext ? `${pregnancyContext.weeks}w ${pregnancyContext.days}d` : "Valid LMP required"}</p><p className="text-xs">{pregnancyContext?.trimester}</p></div>
          <div><p className="text-[10px] text-saivie-plum">EDD · LMP estimate</p><p className="mt-1 text-sm font-semibold text-saivie-teal">{pregnancyContext?.dueDate || "Not available"}</p></div>
        </> : <>
          <div><p className="text-[10px] text-saivie-plum">LMP</p><p className="mt-1 text-sm font-semibold">{patient.lmp || "Not recorded"}</p></div>
          <div><p className="text-[10px] text-saivie-plum">Cycle history</p><p className="mt-1 text-sm">{patient.cycleLength ? `${patient.cycleLength} days` : "Length not recorded"}{currentSurvey && cycle.regularity ? ` · ${text(cycle.regularity)} (patient-reported)` : ""}</p></div>
        </>}
        <div><p className="text-[10px] text-saivie-plum">Recorded risk</p><p className="mt-1 text-sm font-semibold text-saivie-teal">{patient.riskScore?.level || "Not recorded"}</p>{patient.riskScore?.factors?.map((factor, i) => <p key={i} className="mt-1 text-xs">{factor.factor}</p>)}</div>
      </section>
      {pregnancy && conceptionSection}
      <section className="rounded-lg border border-saivie-border bg-saivie-ivory p-4"><h3 className="text-xs font-semibold text-saivie-teal">Today’s check-in</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["BP", checkIn.bp, "mmHg"], ["Pulse", checkIn.pulse, "bpm"], ["Weight", checkIn.weight, "kg"], ["SpO₂", checkIn.spo2, "%"]].map(([label, value, unit]) => <div key={String(label)}><p className="text-[10px]">{String(label)}</p><p className="mt-1 text-sm font-semibold">{typeof value === "number" || typeof value === "string" && value.trim() ? `${value} ${unit}` : "Not recorded"}</p></div>)}</div></section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-saivie-border bg-saivie-ivory p-4"><h3 className="text-xs font-semibold text-saivie-teal">Today’s concern</h3><p className="mt-2 whitespace-pre-wrap text-sm">{complaint || (currentSurvey ? text(intake.chiefComplaint) : "Not recorded for this visit")}</p>
          <h3 className="mt-4 text-xs font-semibold text-saivie-teal">Allergies &amp; medical history</h3><p className="mt-2 text-xs">Allergies: {text(history.allergies)}</p><p className="mt-2 text-xs">Medical: {text(history.medical)}</p>
          {currentSurvey && <><p className="mt-2 text-xs">Patient-reported conditions: {text(health.conditions)}</p><p className="mt-2 text-xs">Patient-reported allergies: {text(health.allergies)}</p><p className="mt-2 text-xs">Patient-reported medicines: {text(health.medications)}</p></>}
        </section>
        <section className="rounded-lg border border-saivie-border bg-saivie-ivory p-4"><h3 className="text-xs font-semibold text-saivie-teal">Last visit · {latest?.date || "None recorded"}</h3>{latest ? <dl className="mt-2 space-y-2 text-xs">{[["Concern", latest.chiefComplaint || latest.subjective], ["Assessment", latest.assessment || latest.diagnosis], ["Plan", latest.planNotes], ["Follow-up", latest.followUpPlan]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap">{value || "Not recorded"}</dd></div>)}</dl> : <p className="mt-2 text-xs">No previous visit history.</p>}</section>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Trend title="Blood pressure" unit="mmHg" points={trends.bp} paired />
        <Trend title="Weight" unit="kg" points={trends.weight} />
        {(pregnancy || trends.hb.length > 0) && <Trend title="Hemoglobin" unit="g/dL" points={trends.hb} />}
        {trends.pulse.length > 0 && <Trend title="Pulse" unit="bpm" points={trends.pulse} />}
        {pregnancy && trends.fetalHeart.length > 0 && <Trend title="Fetal heart rate" unit="bpm" points={trends.fetalHeart} />}
        {pregnancy && trends.fundalHeight.length > 0 && <Trend title="Fundal height" unit="cm" points={trends.fundalHeight} />}
        {trends.sugar.length ? trends.sugar.map((series) => <Trend key={`${series.name}-${series.unit}`} title={series.name} unit={series.unit} points={series.points} />) : <section className="rounded-lg border border-saivie-border bg-saivie-ivory p-4"><h3 className="text-xs font-semibold text-saivie-teal">Blood sugar</h3><p className="mt-4 text-xs">No dated numeric blood sugar results recorded.</p></section>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-saivie-border bg-saivie-ivory p-4"><h3 className="text-xs font-semibold text-saivie-teal">Pre-visit survey · patient-reported</h3>{survey.directions.length ? <><div className="mt-2 flex flex-wrap gap-1">{survey.directions.map((direction) => <span key={direction} className="rounded-full bg-saivie-sage px-2 py-1 text-[11px] text-saivie-teal">{direction}</span>)}</div><dl className="mt-3 divide-y divide-saivie-border">{surveyQuestions(survey.directions).map((question) => <div key={question} className="py-2 text-xs"><dt>{question}</dt><dd className="mt-1 whitespace-pre-wrap font-medium">{survey.answers[question] || "Not answered"}</dd></div>)}</dl></> : <p className="mt-3 text-xs">No pre-visit topics selected for this appointment.</p>}</section>
        <section className="rounded-lg border border-saivie-border bg-saivie-ivory p-4"><h3 className="text-xs font-semibold text-saivie-teal">Current medications</h3>{medications.filter((med) => !med.status || med.status.toLowerCase() === "active").map((med) => <p key={med.id} className="mt-3 text-xs">{[med.name, med.dose, med.frequency].filter(Boolean).join(" · ")}</p>)}{!medications.some((med) => !med.status || med.status.toLowerCase() === "active") && <p className="mt-3 text-xs">No active medicines recorded.</p>}
          <h3 className="mt-5 text-xs font-semibold text-saivie-teal">Recent results</h3>{[...labs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((lab, i) => <p key={i} className="mt-2 text-xs">{lab.date} · {lab.testName}: {lab.value ?? "See report"} {lab.unit}{lab.status ? ` · ${lab.status}` : ""}</p>)}{!labs.length && <p className="mt-2 text-xs">No results recorded.</p>}
        </section>
      </div>
      <section className="rounded-lg border border-saivie-border bg-saivie-ivory p-4"><h3 className="text-xs font-semibold text-saivie-teal">Visit timeline</h3>{sortedVisits.map((visit) => <div key={visit.id} className="mt-3 border-l-2 border-saivie-sage pl-3 text-xs"><p className="font-semibold">{visit.date}</p><p className="mt-1">{visit.assessment || visit.diagnosis || visit.chiefComplaint || visit.subjective || "Visit recorded"}</p>{visit.planNotes && <p className="mt-1 whitespace-pre-wrap">{visit.planNotes}</p>}</div>)}{!visits.length && <p className="mt-3 text-xs">No visits recorded.</p>}</section>
    </div>
  </div>;
}
