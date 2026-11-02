import React, { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { obstetricChoices, obstetricInputs, obstetricExaminationSummary, type ObstetricExamination as Exam } from "@/lib/obstetricExamination";
import { areaStatusKey, obstetricAreas, obstetricAreaState, setObstetricAreaState, type AreaId } from "@/lib/obstetricAreas";
import { ObstetricBodyMap } from "./ObstetricBodyMap";

function ExaminationGroup({ title, description, testId, children, hidden = false }: {
  title: string; description?: string; testId: string; children: React.ReactNode; hidden?: boolean;
}) {
  const headingId = useId();
  return <section hidden={hidden} aria-labelledby={headingId} data-testid={testId}>
    <div>
      <h4 id={headingId} className="sr-only">{title}</h4>
      {description && <p className="mt-1 text-xs leading-relaxed text-saivie-plum">{description}</p>}
    </div>
    <div className="mt-3 space-y-4">{children}</div>
  </section>;
}

export function ObstetricExamination({ value, onChange }: { value: Exam; onChange: (value: Exam) => void }) {
  const id = useId();
  const [active, setActive] = useState<AreaId>("general");
  const [pendingNormal, setPendingNormal] = useState(false);
  const area = obstetricAreas.find((item) => item.id === active)!;
  const status = obstetricAreaState(value, area);
  const selectArea = (next: AreaId) => { setActive(next); setPendingNormal(false); };
  const changeField = (key: keyof Exam, next: string) => onChange({
    ...value, [key]: next, [areaStatusKey(area.id)]: value[areaStatusKey(area.id)] === "Abnormal" ? "Abnormal" : "",
  });
  const summary = obstetricExaminationSummary(value);
  const recordedCount = obstetricAreas.filter((item) => obstetricAreaState(value, item) !== "Not recorded").length;
  const choice = (key: typeof obstetricChoices[number]["key"]) => {
    const field = obstetricChoices.find((item) => item.key === key)!;
    const binary = "binary" in field;
    return <fieldset key={key} className="min-w-0" data-testid={`obstetric-${key}`}>
      <legend className="mb-2 text-xs font-semibold text-saivie-plum">{field.label}</legend>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {field.options.map((option) => <label key={option} className={`relative flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-center text-xs focus-within:ring-2 focus-within:ring-saivie-teal ${value[key] === option ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border bg-saivie-ivory text-saivie-plum hover:bg-saivie-surface-muted"}`}>
          <input type="radio" name={`${id}-${key}`} value={option} checked={value[key] === option} onChange={() => changeField(key, option)} className={binary ? "h-3 w-3 accent-saivie-teal" : "sr-only"} />
          {option}
        </label>)}
      </div>
      {key === "uterineActivity" && ["Yes", "No"].includes(value[key]) && <p className="mt-2 text-xs text-saivie-plum">Previously recorded: {value[key]}. Select the assessed uterine activity to update this finding.</p>}
      {value[key] && <button type="button" className="mt-1 text-[11px] text-saivie-teal underline" onClick={() => changeField(key, "")} aria-label={`Clear ${field.label}`}>Clear</button>}
    </fieldset>;
  };
  const input = (key: typeof obstetricInputs[number]["key"]) => {
    const field = obstetricInputs.find((item) => item.key === key)!;
    return <label key={key} className="block min-w-0 text-xs font-semibold text-saivie-plum">
      {field.label}
      {"max" in field
        ? <Input type="number" min={"min" in field ? field.min : 0} max={field.max} step={"integer" in field ? 1 : 0.1} value={value[key]} onChange={(event) => changeField(key, event.target.value)} className="mt-2" placeholder="Not recorded" />
        : <Textarea value={value[key]} onChange={(event) => changeField(key, event.target.value)} className="mt-2 min-h-16 text-xs" placeholder="Record observed findings" />}
    </label>;
  };
  return <section className="space-y-4" data-testid="obstetric-examination">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-saivie-teal">Antenatal examination</h3>
      <p className="mt-1 text-xs text-saivie-plum">Today’s findings only. Untouched means not recorded. Record only what was assessed.</p></div>
      <p className="text-xs font-semibold text-saivie-teal" role="status">{recordedCount} of 6 areas documented</p></div>
    <div className="grid items-start gap-3 md:grid-cols-[minmax(160px,230px)_minmax(0,1fr)]">
      <ObstetricBodyMap value={value} active={active} onSelect={selectArea} />
      <div className={`min-w-0 space-y-4 rounded-2xl border border-l-4 bg-saivie-ivory p-3 sm:p-4 ${status === "Abnormal" ? "border-saivie-border border-l-amber-700" : "border-saivie-border border-l-saivie-teal"}`}>
        <nav aria-label="Examination areas" className="flex flex-wrap gap-2">
          {obstetricAreas.map((item) => {
            const state = obstetricAreaState(value, item);
            return <button key={item.id} type="button" aria-pressed={active === item.id} onClick={() => selectArea(item.id)}
              className={`min-h-10 rounded-full border px-3 py-2 text-xs font-semibold ${active === item.id ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border text-saivie-plum"}`}>
              {item.label}<span className="ml-1">{state === "Normal" ? "✓" : state === "Abnormal" ? "!" : state === "Recorded" ? "•" : ["Not examined", "Deferred"].includes(state) ? "–" : ""}</span><span className="sr-only"> · {state}</span>
            </button>;
          })}
        </nav>
        <div><p className="text-[10px] uppercase tracking-wide text-saivie-plum">Area {obstetricAreas.indexOf(area) + 1} of 6 · {status}</p>
          <h4 className="font-serif text-2xl font-semibold text-saivie-teal">{area.label}</h4></div>
        {area.normal && <div className="grid grid-cols-3 gap-2">
          {(["Normal", "Abnormal", "Not examined"] as const).map((next) => <button key={next} type="button" aria-pressed={status === next}
            className={`min-h-12 rounded-xl border px-2 text-sm font-semibold ${status === next ? next === "Abnormal" ? "border-amber-700 bg-amber-700 text-white" : "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border text-saivie-plum"}`}
            onClick={() => {
              if (next !== "Abnormal" && area.keys.some((key) => value[key].trim())) { setPendingNormal(true); return; }
              onChange(setObstetricAreaState(value, area, next));
            }}>{next}</button>)}
        </div>}
        {area.normal && <p className="text-[11px] leading-relaxed text-saivie-plum">
          {active === "general" ? "Normal records no pallor and no pedal edema."
            : active === "abdominal" ? "Normal records no abnormality on inspection, no scar tenderness and a relaxed uterus. Fundal height is entered separately."
            : "No leakage means patient-reported symptoms only; it does not confirm membrane status."}
        </p>}
        {!area.normal && <p className="text-[11px] leading-relaxed text-saivie-plum">Record the specific findings below. No automatic normal findings or performed examinations.</p>}
        {active === "fetal" && <button type="button" aria-pressed={status === "Not examined"}
          className="min-h-10 rounded-full border border-saivie-border px-3 py-2 text-xs text-saivie-plum"
          onClick={() => {
            if (area.keys.some((key) => value[key].trim())) { setPendingNormal(true); return; }
            onChange(setObstetricAreaState(value, area, "Not examined"));
          }}>Not examined</button>}
        {pendingNormal && <div role="alert" className="rounded-xl border border-saivie-border p-3 text-xs text-saivie-plum">
          Existing findings will not be overwritten. Clear this area first if you intend to replace its findings.
          <button type="button" className="ml-2 underline" onClick={() => setPendingNormal(false)}>Keep findings</button>
        </div>}
        <button type="button" className="text-xs text-saivie-teal underline" onClick={() => {
          const next = { ...value, [areaStatusKey(area.id)]: "" };
          for (const key of area.keys) next[key] = "";
          onChange(next); setPendingNormal(false);
        }}>Clear {area.label.toLowerCase()} findings</button>
    <ExaminationGroup hidden={active !== "general"} title="General examination" testId="obstetric-general-section">
      <div className="grid gap-4 sm:grid-cols-2">{choice("pallor")}{choice("edema")}</div>
    </ExaminationGroup>
    <ExaminationGroup hidden={active !== "abdominal"} title="Abdominal examination" testId="obstetric-abdominal-section">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Abdominal inspection findings">
        {["Distended", "Scar present", "Tenderness"].map((finding) => {
          const entries = value.inspection.split("; ").filter(Boolean);
          const selected = entries.includes(finding);
          return <button key={finding} type="button" aria-pressed={selected}
            className={`min-h-10 rounded-full border px-3 py-2 text-xs ${selected ? "border-amber-700 bg-amber-50 text-amber-900" : "border-saivie-border text-saivie-plum"}`}
            onClick={() => onChange({ ...value, inspection: (selected ? entries.filter((entry) => entry !== finding) : [...entries.filter((entry) => entry !== "No abnormality detected"), finding]).join("; "), abdominalStatus: "Abnormal" })}>
            {selected ? "✓ " : ""}{finding}
          </button>;
        })}
      </div>
      {input("inspection")}
      <div className="grid gap-4 sm:grid-cols-2">
        {input("fundalHeight")}{choice("scarTenderness")}{choice("uterineActivity")}
        {["Contractions present", "Yes"].includes(value.uterineActivity) && <>{input("contractions")}{choice("contractionIntensity")}</>}
      </div>
    </ExaminationGroup>
    <ExaminationGroup hidden={active !== "fetal"} title="Fetal assessment" testId="obstetric-fetal-section">
      <div className="grid gap-4 sm:grid-cols-2">
        {choice("lie")}{choice("presentation")}{choice("engagement")}{choice("fetalMovements")}{choice("fetalHeartSound")}
        {value.fetalHeartSound === "Present" && input("fetalHeartRate")}
      </div>
    </ExaminationGroup>
    <ExaminationGroup hidden={active !== "leakage"} title="Leakage / suspected membrane rupture" testId="obstetric-leakage-section" description="Patient-reported symptoms and clinician assessment are recorded separately.">
      {choice("leakageReported")}
      {["Yes", "Uncertain"].includes(value.leakageReported) && <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {input("leakageOnset")}{choice("leakagePattern")}{choice("leakageOngoing")}{choice("leakageAmount")}
          {choice("leakageColour")}{choice("leakageOdour")}
        </div>
        <div className="space-y-3 border-t border-saivie-border pt-4">
          <h5 className="text-xs font-semibold text-saivie-teal">Associated symptoms · patient reported</h5>
          <div className="grid gap-4 sm:grid-cols-2">{choice("leakageFever")}{choice("leakagePain")}{choice("leakageBleeding")}</div>
        </div>
        <div className="space-y-4 border-t border-saivie-border pt-4">
          <h5 className="text-xs font-semibold text-saivie-teal">Clinician assessment</h5>
          {choice("ruptureAssessment")}{input("leakageDetails")}
          <p className="text-xs text-saivie-plum">Reported leakage alone does not confirm membrane rupture. Record the clinician assessment and actual examination or test findings separately.</p>
        </div>
      </div>}
    </ExaminationGroup>
    <ExaminationGroup hidden={active !== "speculum"} title="Per speculum examination" description="Record findings only if performed." testId="obstetric-speculum-section">
      {choice("speculumPerformed")}
      {value.speculumPerformed === "Yes" && <div className="grid gap-4 sm:grid-cols-2">
        {choice("vulva")}{choice("vagina")}{choice("cervix")}{choice("discharge")}{choice("bleeding")}{choice("pooling")}
        {value.pooling === "Yes" && choice("observedFluid")}
      </div>}
      {value.speculumPerformed === "Yes" && input("speculumDetails")}
    </ExaminationGroup>
    <ExaminationGroup hidden={active !== "pv"} title="Per vaginal (PV) examination" testId="obstetric-pv-section">
      <p className="text-xs text-saivie-plum">Document only if clinically indicated and performed with consent. With suspected membrane rupture or unexplained bleeding, assess appropriateness before digital examination according to local protocol.</p>
      {choice("pvPerformed")}
      {value.pvPerformed && input("pvReason")}
      {value.pvPerformed === "Yes" && <div className="space-y-5">
        <div className="space-y-3">
          <h5 className="text-xs font-semibold text-saivie-teal">Cervical findings</h5>
          <div className="grid gap-4 sm:grid-cols-2">{input("cervicalDilatation")}{input("cervicalEffacement")}{choice("cervicalPosition")}{choice("cervicalConsistency")}</div>
        </div>
        <div className="space-y-3 border-t border-saivie-border pt-4">
          <h5 className="text-xs font-semibold text-saivie-teal">Presenting part, pelvis &amp; membranes</h5>
          <div className="grid gap-4 sm:grid-cols-2">{input("station")}{choice("pelvisAdequacy")}{choice("pvPresentingPart")}{choice("pvMembranes")}{choice("caput")}{choice("moulding")}</div>
        </div>
        {input("pvDetails")}
      </div>}
    </ExaminationGroup>
        <div className="flex justify-end"><button type="button" onClick={() => selectArea(obstetricAreas[(obstetricAreas.indexOf(area) + 1) % obstetricAreas.length].id)} className="min-h-10 rounded-full bg-saivie-teal px-4 py-2 text-xs font-semibold text-white">Next: {obstetricAreas[(obstetricAreas.indexOf(area) + 1) % obstetricAreas.length].label} →</button></div>
      </div>
    </div>
    <section className="rounded-xl border border-saivie-border bg-saivie-surface-muted/60 p-3" aria-label="Note from examination">
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-saivie-plum">Note from your findings</h4>
      <p className="mt-1 text-xs leading-relaxed text-saivie-plum">{summary ? summary.split("\n").slice(1).join(" · ") : "No examination findings recorded yet."}</p>
      <p className="mt-2 text-[10px] text-saivie-plum">Save note to store these findings with this visit.</p>
    </section>
    <details className="rounded-xl border border-saivie-border p-3" open={value.details ? true : undefined}>
      <summary className="cursor-pointer text-xs font-semibold text-saivie-teal">Additional examination notes</summary>
      <ExaminationGroup title="Additional examination notes" testId="obstetric-notes-section">
        <Textarea value={value.details} onChange={(event) => onChange({ ...value, details: event.target.value })} placeholder="Additional antenatal findings" aria-label="Additional antenatal findings" />
      </ExaminationGroup>
    </details>
  </section>;
}
