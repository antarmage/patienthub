import React, { useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { obstetricChoices, obstetricInputs, type ObstetricExamination as Exam } from "@/lib/obstetricExamination";

function ExaminationGroup({ title, description, testId, children }: {
  title: string; description?: string; testId: string; children: React.ReactNode;
}) {
  const headingId = useId();
  return <section aria-labelledby={headingId} className="overflow-hidden rounded-xl border border-saivie-border bg-saivie-ivory" data-testid={testId}>
    <div className="border-b border-saivie-border bg-saivie-surface-muted/60 px-4 py-3">
      <h4 id={headingId} className="text-sm font-semibold text-saivie-teal">{title}</h4>
      {description && <p className="mt-1 text-xs leading-relaxed text-saivie-plum">{description}</p>}
    </div>
    <div className="space-y-4 p-4">{children}</div>
  </section>;
}

export function ObstetricExamination({ value, onChange }: { value: Exam; onChange: (value: Exam) => void }) {
  const id = useId();
  const choice = (key: typeof obstetricChoices[number]["key"]) => {
    const field = obstetricChoices.find((item) => item.key === key)!;
    const binary = "binary" in field;
    return <fieldset key={key} className="min-w-0" data-testid={`obstetric-${key}`}>
      <legend className="mb-2 text-xs font-semibold text-saivie-plum">{field.label}</legend>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {field.options.map((option) => <label key={option} className={`relative flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-center text-xs focus-within:ring-2 focus-within:ring-saivie-teal ${value[key] === option ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border bg-saivie-ivory text-saivie-plum hover:bg-saivie-surface-muted"}`}>
          <input type="radio" name={`${id}-${key}`} value={option} checked={value[key] === option} onChange={() => onChange({ ...value, [key]: option })} className={binary ? "h-3 w-3 accent-saivie-teal" : "sr-only"} />
          {option}
        </label>)}
      </div>
      {key === "uterineActivity" && ["Yes", "No"].includes(value[key]) && <p className="mt-2 text-xs text-saivie-plum">Previously recorded: {value[key]}. Select the assessed uterine activity to update this finding.</p>}
      {value[key] && <button type="button" className="mt-1 text-[11px] text-saivie-teal underline" onClick={() => onChange({ ...value, [key]: "" })} aria-label={`Clear ${field.label}`}>Clear</button>}
    </fieldset>;
  };
  const input = (key: typeof obstetricInputs[number]["key"]) => {
    const field = obstetricInputs.find((item) => item.key === key)!;
    return <label key={key} className="block min-w-0 text-xs font-semibold text-saivie-plum">
      {field.label}
      {"max" in field
        ? <Input type="number" min={"min" in field ? field.min : 0} max={field.max} step={"integer" in field ? 1 : 0.1} value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className="mt-2" placeholder="Not recorded" />
        : <Textarea value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className="mt-2 min-h-16 text-xs" placeholder="Record observed findings" />}
    </label>;
  };
  return <section className="space-y-4" data-testid="obstetric-examination">
    <div><h3 className="text-sm font-semibold text-saivie-teal">Antenatal examination</h3>
      <p className="mt-1 text-xs text-saivie-plum">Today’s findings only. Nothing is preselected; blank means not recorded. Select only findings actually assessed.</p></div>
    <ExaminationGroup title="General examination" testId="obstetric-general-section">
      <div className="grid gap-4 sm:grid-cols-2">{choice("pallor")}{choice("edema")}</div>
    </ExaminationGroup>
    <ExaminationGroup title="Abdominal examination" testId="obstetric-abdominal-section">
      {input("inspection")}
      <div className="grid gap-4 sm:grid-cols-2">
        {input("fundalHeight")}{choice("scarTenderness")}{choice("uterineActivity")}
        {["Contractions present", "Yes"].includes(value.uterineActivity) && <>{input("contractions")}{choice("contractionIntensity")}</>}
      </div>
    </ExaminationGroup>
    <ExaminationGroup title="Fetal assessment" testId="obstetric-fetal-section">
      <div className="grid gap-4 sm:grid-cols-2">
        {choice("lie")}{choice("presentation")}{choice("engagement")}{choice("fetalMovements")}{choice("fetalHeartSound")}
        {value.fetalHeartSound === "Present" && input("fetalHeartRate")}
      </div>
    </ExaminationGroup>
    <ExaminationGroup title="Leakage / suspected membrane rupture" testId="obstetric-leakage-section" description="Patient-reported symptoms and clinician assessment are recorded separately.">
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
    <ExaminationGroup title="Per speculum examination" description="Record findings only if performed." testId="obstetric-speculum-section">
      {choice("speculumPerformed")}
      {value.speculumPerformed === "Yes" && <div className="grid gap-4 sm:grid-cols-2">
        {choice("vulva")}{choice("vagina")}{choice("cervix")}{choice("discharge")}{choice("bleeding")}{choice("pooling")}
        {value.pooling === "Yes" && choice("observedFluid")}
      </div>}
      {value.speculumPerformed === "Yes" && input("speculumDetails")}
    </ExaminationGroup>
    <ExaminationGroup title="Per vaginal (PV) examination" testId="obstetric-pv-section">
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
    <ExaminationGroup title="Additional examination notes" testId="obstetric-notes-section">{input("details")}</ExaminationGroup>
  </section>;
}
