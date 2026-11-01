import React, { useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { obstetricChoices, obstetricInputs, type ObstetricExamination as Exam } from "@/lib/obstetricExamination";

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
      {value[key] && <button type="button" className="mt-1 text-[11px] text-saivie-teal underline" onClick={() => onChange({ ...value, [key]: "" })} aria-label={`Clear ${field.label}`}>Clear</button>}
    </fieldset>;
  };
  const input = (key: typeof obstetricInputs[number]["key"]) => {
    const field = obstetricInputs.find((item) => item.key === key)!;
    return <label key={key} className="block min-w-0 text-xs font-semibold text-saivie-plum">
      {field.label}
      {"max" in field
        ? <Input type="number" min={0} max={field.max} step={"integer" in field ? 1 : 0.1} value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className="mt-2" placeholder="Not recorded" />
        : <Textarea value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className="mt-2 min-h-16 text-xs" placeholder="Record observed findings" />}
    </label>;
  };
  return <section className="space-y-5 rounded-lg border border-saivie-border p-3 sm:p-4" data-testid="obstetric-examination">
    <div><h3 className="text-sm font-semibold text-saivie-teal">Antenatal examination</h3>
      <p className="mt-1 text-xs text-saivie-plum">Today’s findings only. Nothing is preselected; blank means not recorded. Select only findings actually assessed.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      {choice("pallor")}{choice("edema")}{input("inspection")}{input("fundalHeight")}
      {choice("lie")}{choice("presentation")}{choice("fetalMovements")}{choice("uterineActivity")}
      {value.uterineActivity === "Yes" && <>{input("contractions")}{choice("contractionIntensity")}</>}
      {choice("engagement")}{choice("fetalHeartSound")}
      {value.fetalHeartSound === "Present" && input("fetalHeartRate")}
      {choice("scarTenderness")}
    </div>
    <div className="space-y-4 border-t border-saivie-border pt-4">
      <p className="text-xs font-semibold text-saivie-teal">Per speculum examination · only if performed</p>
      {choice("speculumPerformed")}
      {value.speculumPerformed === "Yes" && <div className="grid gap-4 sm:grid-cols-2">
        {choice("vulva")}{choice("vagina")}{choice("cervix")}{choice("discharge")}{choice("bleeding")}{choice("pooling")}
        {input("speculumDetails")}
      </div>}
    </div>
    {input("details")}
  </section>;
}
