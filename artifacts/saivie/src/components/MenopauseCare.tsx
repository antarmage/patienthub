import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMenopause } from "@/hooks/use-menopause";
import {
  answerOptions, emptyMenopauseIntake, emptyMenopauseSafety, emptyMenopauseSymptoms,
  menopauseSymptoms, menopauseSafetyLabels, menopauseStages, menopauseContexts,
  menopauseConcerns, menopauseComparison, menopauseIntakeSchema, menopauseTrackingSchema,
  menopauseAssessmentSchema, menopausePlanSchema,
  type MenopauseIntake, type MenopauseTracking, type MenopauseAssessment, type MenopausePlan,
  type MenopauseEntry, type MenopauseRecord, type MenopauseSymptoms, type MenopauseSafety,
  type MenopauseSubmission,
} from "../../../../lib/db/src/menopause";

const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const severity = ["None", "Mild", "Moderate", "Severe"];
const panel = "rounded-xl border border-saivie-border bg-saivie-ivory p-4 space-y-3";
const fieldClass = "block w-full rounded-md border border-saivie-border bg-white p-2 text-sm text-saivie-teal";
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const auditLabel = (entry: MenopauseEntry) => `${entry.source} · ${entry.recordedBy} · ${new Date(entry.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`;

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return <label className="block space-y-1 text-sm">{label}<select className={fieldClass} value={value}
    onChange={(event) => { const selected = options.find((option) => option === event.target.value); if (selected !== undefined) onChange(selected); }}>
    {options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
function Text({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block space-y-1 text-sm">{label}<textarea className={fieldClass} value={value} required={required}
    maxLength={4000} rows={3} onChange={(event) => onChange(event.target.value)} /></label>;
}
function SymptomFields({ value, onChange }: { value: MenopauseSymptoms; onChange: (value: MenopauseSymptoms) => void }) {
  return <fieldset className="space-y-3"><legend className="font-semibold">Symptoms and impact</legend>
    <p className="text-xs">Patient-reported severity: none, mild, moderate or severe. This is a custom symptom log, not a validated diagnostic score. Leave unanswered if unknown.</p>
    <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(menopauseSymptoms) as (keyof MenopauseSymptoms)[]).map((key) =>
      <label key={key} className="block text-sm">{menopauseSymptoms[key]}<select className={fieldClass} value={value[key] ?? ""}
        onChange={(event) => onChange({ ...value, [key]: event.target.value === "" ? null : Number(event.target.value) })}>
        <option value="">Not answered</option>{severity.map((label, index) => <option key={label} value={index}>{label}</option>)}
      </select></label>)}</div>
  </fieldset>;
}
function SafetyFields({ value, onChange }: { value: MenopauseSafety; onChange: (value: MenopauseSafety) => void }) {
  return <fieldset className="space-y-3 rounded-lg border border-amber-300 p-3"><legend className="font-semibold">Safety questions</legend>
    <p className="text-xs">These answers do not diagnose or rule out a condition. New or unexplained bleeding and other concerning symptoms need clinical assessment.</p>
    {(Object.keys(menopauseSafetyLabels) as (keyof MenopauseSafety)[]).map((key) => <Choice key={key} label={menopauseSafetyLabels[key]} options={answerOptions}
      value={value[key]} onChange={(answer) => onChange({ ...value, [key]: answer })} />)}
    {menopauseConcerns(value).length > 0 && <div role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-950">
      <p>Contact your treating clinic promptly about these symptoms; do not wait for a routine follow-up or a reply in this app.</p>
      {value.mental === "Yes" && <p>If you feel unsafe or might harm yourself, seek emergency help now, contact local emergency services and a trusted person.</p>}
      {(value.pelvic === "Yes" || value.bleeding === "Yes") && <p>For severe pain, heavy bleeding, fainting or feeling very unwell, seek urgent in-person care.</p>}
    </div>}
  </fieldset>;
}

function IntakeEditor({ data, set }: { data: MenopauseIntake; set: (data: MenopauseIntake) => void }) {
  return <>
    <Text label="Main concerns and priorities" value={data.priorities} required onChange={(priorities) => set({ ...data, priorities })} />
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">Last menstrual period (leave blank if unknown)<input className={fieldClass} type="date" max={today()} value={data.lmp ?? ""} onChange={(event) => set({ ...data, lmp: event.target.value || null })} /></label>
      <Choice label="Menstrual pattern" value={data.cycle} options={["Not answered", "Regular", "Irregular", "Increasingly infrequent", "No periods", "Heavy / prolonged", "Not sure"]} onChange={(cycle) => set({ ...data, cycle })} />
      <Choice label="Uterus" value={data.uterus} options={["Not answered", "Present", "Removed", "Not sure"]} onChange={(uterus) => set({ ...data, uterus })} />
      <Choice label="Ovaries" value={data.ovaries} options={["Not answered", "Both present", "One removed", "Both removed", "Not sure"]} onChange={(ovaries) => set({ ...data, ovaries })} />
    </div>
    <Text label="Surgery or treatment history (including dates if known)" value={data.surgeryDetails} onChange={(surgeryDetails) => set({ ...data, surgeryDetails })} />
    <Text label="Hormonal contraception" value={data.hormonalContraception} onChange={(hormonalContraception) => set({ ...data, hormonalContraception })} />
    <Text label="Current / previous hormone therapy" value={data.hormoneTherapy} onChange={(hormoneTherapy) => set({ ...data, hormoneTherapy })} />
    <Text label="Medical / family history, allergies and relevant risks" value={data.medicalHistory} onChange={(medicalHistory) => set({ ...data, medicalHistory })} />
    <Text label="Reported medicines and supplements (not a prescription)" value={data.medications} onChange={(medications) => set({ ...data, medications })} />
    <SymptomFields value={data.symptoms} onChange={(symptoms) => set({ ...data, symptoms })} />
    <Text label="Impact on sleep, work, relationships and daily life" value={data.impact} onChange={(impact) => set({ ...data, impact })} />
    <SafetyFields value={data.safety} onChange={(safety) => set({ ...data, safety })} />
  </>;
}

export function MenopauseProgress({ entries }: { entries: MenopauseEntry[] }) {
  return <section className={panel}><h3 className="font-semibold">Symptom trends and follow-up comparison</h3>
    <p className="text-xs">Only recorded answers are compared. Blank is not zero; these ratings do not establish menopause or clinical risk.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th scope="col">Symptom</th><th scope="col">First recorded</th><th scope="col">Latest subsequent reading</th><th scope="col">Recorded trend</th></tr></thead><tbody>
      {menopauseComparison(entries).map(({ key, label, baseline, latest, readings }) => <tr key={key} className="border-t">
        <th scope="row" className="p-2 font-normal">{label}</th>
        <td className="p-2">{baseline ? `${severity[baseline.value]} · ${dateLabel(baseline.date)}` : "Not recorded"}</td>
        <td className="p-2">{latest ? `${severity[latest.value]} · ${dateLabel(latest.date)}` : "No comparison yet"}</td>
        <td className="p-2">{readings.length > 1 ? <svg viewBox="0 0 160 38" className="h-10 w-40" role="img" aria-label={`${label}: ${readings.map((reading) => `${reading.date} ${severity[reading.value]}`).join(", ")}`}>
          <polyline fill="none" stroke="#2d6a5f" strokeWidth="2" points={readings.map((reading, index) => `${5 + index * 150 / (readings.length - 1)},${33 - reading.value * 9}`).join(" ")} />
          {readings.map((reading, index) => <circle key={index} cx={5 + index * 150 / (readings.length - 1)} cy={33 - reading.value * 9} r="3" fill="#885675"><title>{`${dateLabel(reading.date)}: ${severity[reading.value]} · ${reading.source}`}</title></circle>)}
        </svg> : "Two readings needed"}</td>
      </tr>)}
    </tbody></table></div>
    <p className="text-xs">Trend points are ordered observations, not a time-scaled chart. Severity: 0 none, 1 mild, 2 moderate, 3 severe.</p>
  </section>;
}

export function MenopauseHealthMap({ entry, patientName }: { entry: MenopauseEntry; patientName: string }) {
  if (entry.record.kind !== "plan") return null;
  const plan = entry.record.data;
  return <article className={`${panel} menopause-health-map`} data-testid="menopause-health-map">
    <h3 className="text-lg font-semibold">Menopause Health Map · {plan.status}</h3>
    <p>{patientName} · {dateLabel(entry.date)} · {entry.approvedStage || "Stage not recorded"}</p>
    <p className="text-xs">{auditLabel(entry)}{entry.appointmentId ? ` · Appointment ${entry.appointmentId}` : ""} · Plan #{entry.id}</p>
    {[["Your health summary", plan.summary], ["Treatment discussed / agreed", plan.treatment], ["Lifestyle support", plan.lifestyle],
      ["Investigations / referrals", plan.investigations], ["Your goals", plan.goals], ["Safety and contact advice", plan.safetyAdvice]].map(([label, value]) =>
      <div key={label}><h4 className="font-semibold">{label}</h4><p className="whitespace-pre-wrap text-sm">{value || "Not recorded"}</p></div>)}
    <p className="font-semibold">Review: {plan.reviewDate ? dateLabel(plan.reviewDate) : "Not scheduled"}</p>
    <p className="text-xs">A review date is not a booked appointment. Treatment discussions here are not a prescription; use the clinic's saved prescription for medicine and dose instructions.</p>
    {plan.status === "Approved" && <Button type="button" className="menopause-no-print" variant="outline" onClick={() => printMenopauseMap(entry, patientName)}>Print / save PDF</Button>}
  </article>;
}

function printMenopauseMap(entry: MenopauseEntry, name: string) {
  if (entry.record.kind !== "plan" || entry.record.data.status !== "Approved") return;
  const popup = window.open("", "_blank");
  if (!popup) { window.alert("The print window was blocked. Allow pop-ups for this clinic and try again."); return; }
  // Render as text nodes so patient-entered content cannot become executable print markup.
  const plan = entry.record.data;
  popup.document.title = "Menopause Health Map";
  const style = popup.document.createElement("style");
  style.textContent = "@page{size:A4;margin:30mm 12mm 20mm}body{font:12px/1.5 Arial;color:#453846}h1,h2{color:#2d6a5f}h2{font-size:14px}p{white-space:pre-wrap;overflow-wrap:anywhere}section{break-inside:avoid}";
  popup.document.head.append(style);
  const append = (tag: string, value: string, parent: HTMLElement = popup.document.body) => {
    const node = popup.document.createElement(tag); node.textContent = value; parent.append(node); return node;
  };
  append("h1", "Menopause Health Map");
  append("p", `${name} · ${dateLabel(entry.date)} · ${entry.approvedStage || "Stage not recorded"}`);
  append("p", `${auditLabel(entry)} · Approved plan #${entry.id}`);
  for (const [label, value] of [["Your health summary", plan.summary], ["Treatment discussed / agreed", plan.treatment],
    ["Lifestyle support", plan.lifestyle], ["Investigations / referrals", plan.investigations], ["Your goals", plan.goals],
    ["Safety and contact advice", plan.safetyAdvice], ["Review date (not a booking)", plan.reviewDate ? dateLabel(plan.reviewDate) : "Not recorded"]]) {
    const section = append("section", ""); append("h2", label, section); append("p", value || "Not recorded", section);
  }
  append("p", "This plan is not a prescription. Follow your clinic's saved prescription for medicine and dose instructions.");
  popup.document.close();
  popup.focus();
  popup.print();
}

type Props = { patientId: number; patientName: string; audience: "doctor" | "patient"; appointmentId?: number; appointmentDate?: string; onConsultation?: () => void };
export function MenopauseCare(props: Props) {
  const { query, mutation } = useMenopause(props.patientId, props.audience);
  const [form, setForm] = useState<MenopauseRecord["kind"] | null>(null);
  const [saved, setSaved] = useState("");
  const [reason, setReason] = useState("");
  const [enrollmentConfirm, setEnrollmentConfirm] = useState<{ enabled: boolean; version: number } | null>(null);
  const doctor = props.audience === "doctor";
  if (query.isPending) return <p role="status">Loading menopause care...</p>;
  if (query.isError && !query.data) return <div role="alert" className={panel}>Menopause care unavailable: {query.error.message} <Button onClick={() => { void query.refetch(); }}>Retry</Button></div>;
  const state = query.data;
  if (!state) return null;
  const approved = state.entries.find((entry) => entry.record.kind === "plan" && entry.record.data.status === "Approved");
  const latestIntake = state.entries.find((entry) => entry.record.kind === "intake");
  const latestAssessment = state.entries.find((entry) => entry.record.kind === "assessment");
  const concerns = state.entries.filter((entry) => (entry.record.kind === "intake" || entry.record.kind === "tracking")
    && menopauseConcerns(entry.record.data.safety).length > 0);
  return <div className="space-y-4 text-saivie-teal" data-testid="menopause-care">
    <header className={panel}><h2 className="text-xl font-semibold">Menopause Compass</h2>
      <p className="text-sm">{state.enabled ? "Care enabled by your doctor" : state.version ? "Care paused; saved history is retained" : "Not enabled"} · No diagnosis is inferred from age, symptoms or a missed period.</p>
      {doctor && <><Button variant="outline" disabled={mutation.isPending || !!form}
        onClick={() => { setEnrollmentConfirm(enrollmentConfirm ? null : { enabled: !state.enabled, version: state.version }); mutation.reset(); }}>{state.enabled ? "Pause menopause care" : "Enable menopause care"}</Button>
        {enrollmentConfirm && <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({ enrollment: { enabled: enrollmentConfirm.enabled, expectedVersion: enrollmentConfirm.version, reason } },
            { onSuccess: () => { setEnrollmentConfirm(null); setReason(""); setForm(null); setSaved("Care setting saved."); } });
        }}>
          <p className="text-xs">This enables or pauses a separate care pathway. It does not change pregnancy status, patient category, medicines or existing consultations.</p>
          <p className="text-sm font-semibold">Requested change: {enrollmentConfirm.enabled ? "enable" : "pause"} menopause care.</p>
          <Text label="Clinical reason for this change" required value={reason} onChange={setReason} />
          <Button disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Confirm care setting"}</Button>
        </form>}</>}
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {query.isError && <p role="alert">Unable to refresh menopause care: {query.error.message}. Showing previously loaded history; your unsaved answers are retained.</p>}
      {saved && <p role="status">{saved}</p>}
      <Button variant="link" disabled={mutation.isPending} onClick={() => { void query.refetch(); }}>Refresh saved history</Button>
    </header>
    <aside className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p>This tracker is not monitored for emergencies. Contact the clinic directly for new or worsening symptoms. Seek emergency help for heavy bleeding, severe pain, fainting or immediate danger to yourself.</p>
      {concerns.length > 0 && <><h3 className="mt-2 font-semibold">Reported safety concerns in saved history</h3>
        <p className="text-xs">These are reported answers, not diagnoses or a record of unresolved alerts. Review the dated clinical assessment for actions taken.</p>
        <ul>{concerns.map((entry) => <li key={entry.id}>{dateLabel(entry.date)} · {entry.record.kind === "intake" || entry.record.kind === "tracking" ? menopauseConcerns(entry.record.data.safety).join("; ") : ""}</li>)}</ul>
      </>}
    </aside>
    {state.enabled && <div className="flex flex-wrap gap-2">
      {(["intake", "tracking", ...(doctor ? ["assessment", "plan"] as const : [])] as const).map((kind) =>
        <Button key={kind} variant={form === kind ? "default" : "outline"} disabled={mutation.isPending || !!enrollmentConfirm || !!form && form !== kind}
          onClick={() => { setForm(kind); setSaved(""); mutation.reset(); }}>
          {{ intake: "Record intake", tracking: "Track symptoms", assessment: "Doctor assessment", plan: "Create / revise care plan" }[kind]}
        </Button>)}
      {doctor && props.onConsultation && <Button variant="outline" onClick={props.onConsultation}>Prescriptions / existing consultation</Button>}
    </div>}
    {form && state.enabled && <MenopauseEntryForm key={`${props.patientId}:${form}`} kind={form} stateVersion={state.version} props={props} entries={state.entries}
      busy={mutation.isPending} error={mutation.error?.message} onCancel={() => { setForm(null); mutation.reset(); }}
      onReload={async () => { const result = await query.refetch(); if (!result.data || result.isError) throw result.error || new Error("Unable to reload"); return result.data.version; }}
      onSave={(submission) => mutation.mutate({ submission }, { onSuccess: () => { setForm(null); setSaved("Record saved. Previous records were retained."); } })} />}
    {!doctor && !state.enabled && <p className="text-sm">Ask your treating doctor about enabling this care pathway. New submissions are paused.</p>}
    <section className={panel}><h3 className="font-semibold">Current overview</h3>
      <p>{doctor ? "Clinical stage" : "Stage shared in approved plan"}: {latestAssessment?.record.kind === "assessment" ? latestAssessment.record.data.stage : approved?.approvedStage || (doctor ? "Not assessed" : "Not shared yet")}</p>
      <p>Priorities: {latestIntake?.record.kind === "intake" ? latestIntake.record.data.priorities : "Not recorded"}</p>
      <p className="text-xs">Stage requires clinician assessment. Hormonal contraception, surgery and other treatments can affect interpretation. No tests or treatments are ordered automatically.</p>
    </section>
    {approved ? <MenopauseHealthMap entry={approved} patientName={props.patientName} /> : <p className={panel}>No doctor-approved care plan yet.</p>}
    <MenopauseProgress entries={state.entries} />
    <section className={panel}><h3 className="font-semibold">Dated care history</h3>
      {state.entries.length === 0 && <p>No menopause records saved yet.</p>}
      {state.entries.map((entry) => <details key={entry.id} className="border-t pt-2">
        <summary className="cursor-pointer text-sm">{dateLabel(entry.date)} · {entry.record.kind}{entry.record.kind === "plan" ? ` · ${entry.record.data.status}` : ""} · {entry.source}{entry.appointmentId ? ` · Appointment ${entry.appointmentId}` : ""}</summary>
        <p className="my-2 text-xs">{auditLabel(entry)}</p><MenopauseEntryDetails entry={entry} patientName={props.patientName} />
      </details>)}
    </section>
  </div>;
}

function MenopauseEntryDetails({ entry, patientName }: { entry: MenopauseEntry; patientName: string }) {
  const record = entry.record;
  if (record.kind === "plan") return <MenopauseHealthMap entry={entry} patientName={patientName} />;
  if (record.kind === "assessment") return <dl className="space-y-2 text-sm">{Object.entries({
    Stage: record.data.stage, Context: record.data.context, "Early menopause": record.data.earlyMenopause,
    "Suspected premature ovarian insufficiency": record.data.suspectedPoi, Findings: record.data.findings, Examination: record.data.examination,
    "Safety assessment / action": record.data.safetyReview, "Treatment discussion": record.data.treatmentDiscussion,
  }).map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap">{value || "Not recorded"}</dd></div>)}</dl>;
  return <div className="space-y-2 text-sm">
    {menopauseConcerns(record.data.safety).length > 0 && <p className="rounded bg-amber-50 p-2 font-semibold text-amber-950">Reported concerns requiring review: {menopauseConcerns(record.data.safety).join("; ")}. See the safety assessment and agreed actions; this log is not monitored for emergencies.</p>}
    {record.kind === "intake" && <dl className="space-y-2">{Object.entries({
      Priorities: record.data.priorities, LMP: record.data.lmp ? dateLabel(record.data.lmp) : "Not recorded", "Cycle pattern": record.data.cycle,
      Uterus: record.data.uterus, Ovaries: record.data.ovaries, "Surgery / treatments": record.data.surgeryDetails, "Hormonal contraception": record.data.hormonalContraception,
      "Hormone therapy": record.data.hormoneTherapy, "Medical / family history and allergies": record.data.medicalHistory, "Reported medicines (not prescriptions)": record.data.medications,
    }).map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap">{value || "Not recorded"}</dd></div>)}</dl>}
    <p className="whitespace-pre-wrap">Impact: {record.data.impact || "Not recorded"}</p>
    {record.kind === "tracking" && <><p>Treatment adherence: {record.data.adherence}</p><p className="whitespace-pre-wrap">Side effects / changes: {record.data.sideEffects || "Not recorded"}</p></>}
    <ul>{(Object.keys(menopauseSymptoms) as (keyof MenopauseSymptoms)[]).map((key) => <li key={key}>{menopauseSymptoms[key]}: {record.data.symptoms[key] === null ? "Not answered" : severity[record.data.symptoms[key]]}</li>)}</ul>
    <ul>{(Object.keys(menopauseSafetyLabels) as (keyof MenopauseSafety)[]).map((key) => <li key={key}>{menopauseSafetyLabels[key]}: {record.data.safety[key]}</li>)}</ul>
  </div>;
}

function MenopauseEntryForm({ kind, stateVersion, props, entries, busy, error, onSave, onCancel, onReload }: {
  kind: MenopauseRecord["kind"]; stateVersion: number; props: Props; entries: MenopauseEntry[]; busy: boolean; error?: string;
  onSave: (submission: MenopauseSubmission) => void;
  onCancel: () => void; onReload: () => Promise<number>;
}) {
  const [version, setVersion] = useState(stateVersion);
  const [date, setDate] = useState(props.audience === "doctor" && kind !== "tracking" ? props.appointmentDate || today() : today());
  const [intake, setIntake] = useState(emptyMenopauseIntake);
  const [tracking, setTracking] = useState<MenopauseTracking>({ symptoms: emptyMenopauseSymptoms(), safety: emptyMenopauseSafety(), impact: "", adherence: "Not answered", sideEffects: "" });
  const [assessment, setAssessment] = useState<MenopauseAssessment>({ stage: "Uncertain / needs assessment", context: "Not established", earlyMenopause: "Not answered", suspectedPoi: "Not answered", findings: "", examination: "", safetyReview: "", treatmentDiscussion: "" });
  const assessments = entries.filter((entry) => entry.record.kind === "assessment");
  const previousPlan = entries.find((entry) => entry.record.kind === "plan");
  const [plan, setPlan] = useState<MenopausePlan>(() => previousPlan?.record.kind === "plan"
    ? { ...previousPlan.record.data, status: "Draft", safetyReviewed: false }
    : { assessmentId: assessments[0]?.id || 0, status: "Draft", summary: "", treatment: "", lifestyle: "", investigations: "", goals: "", safetyAdvice: "", reviewDate: null, safetyReviewed: false });
  const [validation, setValidation] = useState("");
  const [reloading, setReloading] = useState(false);
  return <form className={panel} onSubmit={(event) => {
    event.preventDefault(); setValidation("");
    let record: MenopauseRecord;
    if (kind === "intake") {
      const parsed = menopauseIntakeSchema.safeParse(intake);
      if (!parsed.success) { setValidation(parsed.error.issues.map((issue) => issue.message).join("; ")); return; }
      record = { kind, data: parsed.data };
    } else if (kind === "tracking") {
      const parsed = menopauseTrackingSchema.safeParse(tracking);
      if (!parsed.success) { setValidation(parsed.error.issues.map((issue) => issue.message).join("; ")); return; }
      record = { kind, data: parsed.data };
    } else if (kind === "assessment") {
      const parsed = menopauseAssessmentSchema.safeParse(assessment);
      if (!parsed.success) { setValidation(parsed.error.issues.map((issue) => issue.message).join("; ")); return; }
      record = { kind, data: parsed.data };
    } else {
      const parsed = menopausePlanSchema.safeParse(plan);
      if (!parsed.success) { setValidation(parsed.error.issues.map((issue) => issue.message).join("; ")); return; }
      record = { kind, data: parsed.data };
    }
    onSave({ expectedVersion: version, date, appointmentId: props.audience === "doctor" && kind !== "tracking" ? props.appointmentId ?? null : null, record });
  }}>
    <h3 className="font-semibold">{{ intake: "New intake", tracking: "New symptom / treatment log", assessment: "Doctor assessment (private clinical record)", plan: "Patient-facing care plan" }[kind]}</h3>
    <p className="text-xs">Each save adds a dated record; previous records are not overwritten. {props.appointmentId && props.audience === "doctor" && kind !== "tracking" ? `Linked to appointment ${props.appointmentId}; use its visit date.` : "Patient-level record; not linked to an appointment."}</p>
    <fieldset disabled={busy || reloading} className="space-y-4">
      <label className="block text-sm">Record date<input type="date" required max={today()} className={fieldClass} value={date} onChange={(event) => setDate(event.target.value)} /></label>
      {kind === "intake" && <IntakeEditor data={intake} set={setIntake} />}
      {kind === "tracking" && <>
        <SymptomFields value={tracking.symptoms} onChange={(symptoms) => setTracking({ ...tracking, symptoms })} />
        <Text label="Impact / changes since last time" value={tracking.impact} onChange={(impact) => setTracking({ ...tracking, impact })} />
        <Choice label="Treatment adherence" value={tracking.adherence} options={["Not answered", "Not on treatment", "As agreed", "Some missed", "Stopped / changed", "Not sure"]} onChange={(adherence) => setTracking({ ...tracking, adherence })} />
        <Text label="Side effects or changes in treatment" value={tracking.sideEffects} onChange={(sideEffects) => setTracking({ ...tracking, sideEffects })} />
        <SafetyFields value={tracking.safety} onChange={(safety) => setTracking({ ...tracking, safety })} />
      </>}
      {kind === "assessment" && <>
        <p className="text-xs">Clinician assessment only. Do not infer stage solely from age or absent periods; consider surgery, contraception and other causes. Review applicable guidelines before diagnosing or prescribing.</p>
        <Choice label="Clinical stage" value={assessment.stage} options={menopauseStages} onChange={(stage) => setAssessment({ ...assessment, stage })} />
        <Choice label="Cause / context (separate from stage)" value={assessment.context} options={menopauseContexts} onChange={(context) => setAssessment({ ...assessment, context })} />
        <Choice label="Early menopause" value={assessment.earlyMenopause} options={answerOptions} onChange={(earlyMenopause) => setAssessment({ ...assessment, earlyMenopause })} />
        <Choice label="Suspected premature ovarian insufficiency" value={assessment.suspectedPoi} options={answerOptions} onChange={(suspectedPoi) => setAssessment({ ...assessment, suspectedPoi })} />
        <Text label="Assessment, evidence and differential diagnosis" required value={assessment.findings} onChange={(findings) => setAssessment({ ...assessment, findings })} />
        <Text label="Examination: performed / declined / deferred / not indicated; findings" value={assessment.examination} onChange={(examination) => setAssessment({ ...assessment, examination })} />
        <Text label="Safety assessment, reported concerns and actions taken" required value={assessment.safetyReview} onChange={(safetyReview) => setAssessment({ ...assessment, safetyReview })} />
        <Text label="Treatment discussion: risks, benefits, cautions, alternatives, preferences and consent" value={assessment.treatmentDiscussion} onChange={(treatmentDiscussion) => setAssessment({ ...assessment, treatmentDiscussion })} />
      </>}
      {kind === "plan" && <>
        {previousPlan && <p className="text-xs">Starting from saved plan #{previousPlan.id}. Review every field; this save creates a new version and requires fresh approval.</p>}
        <label className="block text-sm">Saved doctor assessment<select className={fieldClass} required value={plan.assessmentId || ""} onChange={(event) => setPlan({ ...plan, assessmentId: Number(event.target.value) })}>
          <option value="">Select assessment</option>{assessments.map((entry) => <option key={entry.id} value={entry.id}>{dateLabel(entry.date)} · #{entry.id} · {entry.record.kind === "assessment" ? entry.record.data.stage : ""}</option>)}
        </select></label>
        {!assessments.length && <p role="status">Save a doctor assessment before creating a plan.</p>}
        <p className="text-xs">Approved plans are shared with the patient. Do not include private clinician notes. Use the existing prescription, investigation and booking screens for actual orders.</p>
        <Text label="Patient-facing health summary" required value={plan.summary} onChange={(summary) => setPlan({ ...plan, summary })} />
        <Text label="Treatment agreed (not a prescription)" value={plan.treatment} onChange={(treatment) => setPlan({ ...plan, treatment })} />
        <Text label="Lifestyle support: nutrition, movement, sleep and wellbeing" value={plan.lifestyle} onChange={(lifestyle) => setPlan({ ...plan, lifestyle })} />
        <Text label="Investigations / referrals discussed" value={plan.investigations} onChange={(investigations) => setPlan({ ...plan, investigations })} />
        <Text label="Patient goals" value={plan.goals} onChange={(goals) => setPlan({ ...plan, goals })} />
        <Text label="Safety advice and how to contact the clinic" required value={plan.safetyAdvice} onChange={(safetyAdvice) => setPlan({ ...plan, safetyAdvice })} />
        <label className="block text-sm">Review date (not an appointment booking)<input className={fieldClass} type="date" min={today()} value={plan.reviewDate ?? ""} onChange={(event) => setPlan({ ...plan, reviewDate: event.target.value || null })} /></label>
        <Choice label="Plan status" value={plan.status} options={["Draft", "Approved"]} onChange={(status) => setPlan({ ...plan, status })} />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={plan.safetyReviewed} onChange={(event) => setPlan({ ...plan, safetyReviewed: event.target.checked })} />I have reviewed the safety concerns, assessment and patient-facing plan. Approving shares this plan with the patient.</label>
      </>}
      {(validation || error) && <p role="alert" className="text-rose-700">{validation || error}</p>}
      <div className="flex flex-wrap gap-2"><Button disabled={busy || reloading}>{busy ? "Saving..." : kind === "plan" && plan.status === "Approved" ? "Approve and share plan" : "Save record"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="outline" onClick={async () => {
          setReloading(true);
          try { setVersion(await onReload()); setValidation("Latest saved history loaded below. Your answers are retained; review the changes before saving again."); }
          catch (failure) { setValidation(failure instanceof Error ? failure.message : "Unable to reload the record."); }
          finally { setReloading(false); }
        }}>Reload history (keep answers)</Button>
      </div>
    </fieldset>
  </form>;
}

export function PatientMenopauseCare({ patientId, patientName }: { patientId: number; patientName: string }) {
  const { query } = useMenopause(patientId, "patient");
  if (query.isPending) return <p role="status" className="text-xs">Checking available menopause care...</p>;
  if (query.isError && !query.data) return <p role="alert">Unable to check menopause care. <Button variant="link" onClick={() => { void query.refetch(); }}>Retry</Button></p>;
  if (!query.data || !query.data.enabled && query.data.version === 0) return null;
  return <MenopauseCare key={patientId} patientId={patientId} patientName={patientName} audience="patient" />;
}
