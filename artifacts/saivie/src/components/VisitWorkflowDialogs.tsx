import { DateInput } from "@/components/ui/date-input";
import { authenticatedFetch as fetch } from "@/lib/authenticatedFetch";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { gestationalWeeks, parseLmp } from "@/lib/pregnancyMilestones";
import { useToast } from "@/hooks/use-toast";
import { calendarDateValue } from "@/lib/calendarDates";
import { emptyVitals, validateVitalsLmp, validateVitalsStep, vitalsEntryPayload, vitalsSteps } from "@/lib/vitalsEntry";

const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface VitalsDialogProps {
  recordingOnly?: boolean;
  initialVitals?: Record<string, unknown> | null;
  appointment: any | null;
  patient: any | null;
  saving: boolean;
  onClose: () => void;
  onSave: (vitals: Record<string, unknown> | null, lmp: string | null) => void;
}

export function VitalsDialog({ appointment, patient, saving, onClose, onSave, recordingOnly = false, initialVitals }: VitalsDialogProps) {
  const [form, setForm] = useState(emptyVitals);
  const [lmp, setLmp] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const inputArea = useRef<HTMLDivElement>(null);
  const appointmentId = appointment?.id;
  const patientId = patient?.id;
  const patientHeight = patient?.height;
  const patientLmp = patient?.lmp;

  useEffect(() => {
    if (appointmentId != null) {
      const [systolic = "", diastolic = ""] = String(initialVitals?.bp || "").split("/");
      setForm({
        ...emptyVitals, systolic, diastolic,
        pulse: String(initialVitals?.pulse || ""), temp: String(initialVitals?.temp || ""),
        spo2: String(initialVitals?.spo2 || ""), weight: String(initialVitals?.weight || ""),
        height: String(initialVitals?.height || patientHeight || ""),
      });
      const parsed = parseLmp(patientLmp);
      setLmp(parsed ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}` : "");
      setStep(0);
      setError("");
    }
  }, [appointmentId, patientId, patientHeight, patientLmp, initialVitals]);

  useEffect(() => {
    inputArea.current?.querySelector("input")?.focus();
  }, [step]);

  const set = (key: keyof typeof emptyVitals) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(""); setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const bmi =
    form.height && form.weight ? Number(form.weight) / Math.pow(Number(form.height) / 100, 2) : null;

  const weeks = gestationalWeeks(lmp);
  const lmpValue = lmp || null;

  const submit = () => {
    for (let index = 0; index < vitalsSteps.length; index++) {
      const issue = validateVitalsStep(form, index);
      if (issue) { setStep(index); setError(issue); return; }
    }
    const lmpError = validateVitalsLmp(lmp);
    if (lmpError) { setStep(vitalsSteps.length); setError(lmpError); return; }
    onSave(vitalsEntryPayload(form), lmpValue);
  };
  const next = () => {
    const issue = step === vitalsSteps.length ? validateVitalsLmp(lmp) : validateVitalsStep(form, step);
    if (issue) { setError(issue); return; }
    setError(""); setStep((value) => value + 1);
  };
  const entry = vitalsSteps[step];
  const lmpStep = step === vitalsSteps.length;
  const review = step === vitalsSteps.length + 1;

  return (
    <Dialog open={!!appointment} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto" onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{recordingOnly ? "Record vitals" : "Check in"} · {patient?.name || "Patient"}</DialogTitle>
          <DialogDescription>{recordingOnly ? "Record arrival measurements and patient-reported LMP. This does not change the consultation or queue status." : "Record vitals as the patient arrives, then add them to the waiting queue."}</DialogDescription>
        </DialogHeader>
        <p role="status" className="text-xs text-muted-foreground">Step {step + 1} of {vitalsSteps.length + 2} · {review ? "Review" : lmpStep ? "LMP" : entry.title} {!review && (lmpStep || entry.optional ? "· Optional" : "· Required")}</p>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <form onSubmit={(event) => { event.preventDefault(); if (!saving) { if (review) submit(); else next(); } }}>
        <fieldset disabled={saving} className="space-y-4">
        {lmpStep ? <div key={step} ref={inputArea} className="space-y-2">
          <Label htmlFor="vitals-lmp">LMP (last menstrual period)</Label>
          <DateInput id="vitals-lmp" value={lmp} max={calendarDateValue(new Date())} onValueChange={(value) => { setError(""); setLmp(value); }} data-testid="input-vitals-lmp" />
          <p className="text-xs text-muted-foreground">First day of the last period, as reported by the patient.</p>
          {weeks !== null && <p className="text-xs text-saivie-plum">Gestational age: {weeks} weeks</p>}
        </div> : !review ? <div key={step} ref={inputArea} className="grid grid-cols-2 gap-3">
          {entry.fields.map((field) => <div key={field} className={entry.fields.length === 1 ? "col-span-2 space-y-2" : "space-y-2"}>
            <Label htmlFor={`vitals-${field}`}>{field === "systolic" ? "Systolic" : field === "diastolic" ? "Diastolic" : entry.title}</Label>
            <Input id={`vitals-${field}`} type="number" step={["weight", "height", "temp"].includes(field) ? "any" : "1"}
              value={form[field]} onChange={set(field)} className="h-14 text-xl" aria-invalid={!!error}
              data-testid={`input-vitals-${field === "temp" ? "temperature" : field}`} />
          </div>)}
          {step === 1 && <p className="col-span-2 text-sm">BMI: {bmi && Number.isFinite(bmi) ? bmi.toFixed(1) : "--"}</p>}
        </div> : <div className="space-y-4">
          <dl className="space-y-2 rounded-xl border p-3">
            {vitalsSteps.map((item, index) => <div key={item.title} className="flex items-center justify-between gap-2">
              <dt className="text-sm">{item.title}</dt>
              <dd className="flex items-center gap-2 text-sm">
                {index === 2 ? `${form.systolic}/${form.diastolic}` : form[item.fields[0]] || "Not measured"}
                <Button type="button" size="sm" variant="ghost" aria-label={`Edit ${item.title}`} onClick={() => { setError(""); setStep(index); }}>Edit</Button>
              </dd>
            </div>)}
            <div className="flex justify-between text-sm"><dt>BMI</dt><dd>{bmi && Number.isFinite(bmi) ? bmi.toFixed(1) : "--"}</dd></div>
            <div className="flex items-center justify-between gap-2 text-sm"><dt>LMP</dt><dd className="flex items-center gap-2">
              {lmp || "Not known"}<Button type="button" size="sm" variant="ghost" aria-label="Edit LMP" onClick={() => { setError(""); setStep(vitalsSteps.length); }}>Edit</Button>
            </dd></div>
          </dl>
        </div>}
        <DialogFooter className="gap-2 pt-4">
          {step > 0 && <Button type="button" variant="outline" onClick={() => { setError(""); setStep((value) => value - 1); }}>Back</Button>}
          {!review && (lmpStep || entry.optional) && <Button type="button" variant="ghost" onClick={() => {
            if (lmpStep) setLmp("");
            else setForm((previous) => ({ ...previous, [entry.fields[0]]: "" }));
            setError(""); setStep((value) => value + 1);
          }}>{lmpStep ? "Not known" : "Not measured"}</Button>}
          {review ? <Button type="submit" data-testid="button-save-vitals">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : recordingOnly ? "Save vitals" : "Save & check in"}
          </Button> : <Button type="submit">Next</Button>}
        </DialogFooter>
        </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const REFERRAL_OPTIONS = ["Nutrition", "Skin", "Psychologist", "Lifestyle"];

interface AfterVisitDialogProps {
  appointment: any | null;
  patient: any | null;
  onClose: () => void;
}

export function AfterVisitDialog({ appointment, patient, onClose }: AfterVisitDialogProps) {
  const queryClient = useQueryClient();
  const [explained, setExplained] = useState(true);
  const [lab, setLab] = useState({ on: false, date: localDate(1), time: "09:00", detail: "" });
  const [usg, setUsg] = useState({ on: false, date: localDate(1), time: "10:00", detail: "" });
  const [referrals, setReferrals] = useState<Record<string, { on: boolean; date: string }>>({});
  const [followUp, setFollowUp] = useState({ on: true, date: localDate(2) });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointment) return;
    setExplained(true);
    setLab({ on: false, date: localDate(1), time: "09:00", detail: "" });
    setUsg({ on: false, date: localDate(1), time: "10:00", detail: "" });
    setReferrals({});
    setFollowUp({ on: true, date: localDate(2) });
    setNotes("");
    setError(null);
  }, [appointment]);

  const post = async (url: string, body: unknown, method = "POST") => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Request failed: ${url}`);
    return res.json();
  };

  const bookAppointment = (type: string, date: string, time: string, reason: string) =>
    post("/api/appointments", {
      patientId: patient.id,
      date,
      time,
      type,
      visitType: type,
      visitMode: "in-person",
      status: "On Time",
      reason: reason || type,
    });

  const submit = async () => {
    if (!appointment || !patient) return;
    setSaving(true);
    setError(null);
    try {
      const today = localDate();
      const tasks: Promise<unknown>[] = [];
      const summary: string[] = [];
      if (explained) summary.push("Prescription explained to patient");

      if (lab.on) {
        tasks.push(bookAppointment("Lab Test", lab.date, lab.time, lab.detail));
        summary.push(`Lab test ${lab.date}${lab.detail ? ` (${lab.detail})` : ""}`);
      }
      if (usg.on) {
        tasks.push(bookAppointment("USG", usg.date, usg.time, usg.detail));
        summary.push(`USG ${usg.date}${usg.detail ? ` (${usg.detail})` : ""}`);
      }
      for (const name of REFERRAL_OPTIONS) {
        const r = referrals[name];
        if (!r?.on) continue;
        tasks.push(
          post(`/api/patients/${patient.id}/referrals`, {
            patientId: patient.id,
            date: today,
            referredToExternal: name,
            reason: `${name} referral`,
            urgency: "routine",
            status: "pending",
            notes: r.date ? `Preferred date ${r.date}` : null,
          }),
        );
        if (r.date) tasks.push(bookAppointment(`Referral - ${name}`, r.date, "10:00", `${name} referral`));
        summary.push(`${name} referral${r.date ? ` ${r.date}` : ""}`);
      }
      if (followUp.on) {
        tasks.push(
          post("/api/follow-up-calls", {
            patientId: patient.id,
            patientName: patient.name,
            phone: patient.phone || null,
            patientType: patient.type || null,
            consultationDate: today,
            plannedDate: followUp.date,
            lmp: patient.lmp || null,
            notes: notes || "Post-visit follow-up call",
            status: "pending",
          }),
        );
        summary.push(`Follow-up call ${followUp.date}`);
      }
      tasks.push(
        post(
          `/api/appointments/${appointment.id}`,
          {
            followUpDate: followUp.on ? followUp.date : null,
            followUpNotes: [...summary, notes].filter(Boolean).join("; ") || null,
          },
          "PATCH",
        ),
      );
      await Promise.all(tasks);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-calls"] });
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!appointment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>After visit · {patient?.name || "Patient"}</DialogTitle>
          <DialogDescription>Explain the prescription, then schedule tests, referrals and the follow-up call.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={explained} onCheckedChange={(v) => setExplained(!!v)} />
            Physical prescription explained to the patient
          </label>

          {[
            { key: "lab", title: "Lab test", state: lab, set: setLab },
            { key: "usg", title: "USG", state: usg, set: setUsg },
          ].map(({ key, title, state, set }) => (
            <div key={key} className="space-y-2 rounded-lg border border-saivie-border p-3">
              <label className="flex items-center gap-2 font-medium">
                <Checkbox checked={state.on} onCheckedChange={(v) => set({ ...state, on: !!v })} data-testid={`check-${key}`} />
                Schedule {title}
              </label>
              {state.on && (
                <div className="grid grid-cols-2 gap-2">
                  <DateInput value={state.date} onValueChange={(value) => set({ ...state, date: value })} />
                  <Input type="time" value={state.time} onChange={(e) => set({ ...state, time: e.target.value })} />
                  <Input
                    className="col-span-2"
                    placeholder={key === "lab" ? "Tests (e.g. HbA1c, TSH)" : "Scan type (e.g. anomaly scan)"}
                    value={state.detail}
                    onChange={(e) => set({ ...state, detail: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="space-y-2 rounded-lg border border-saivie-border p-3">
            <p className="font-medium">Referrals</p>
            <div className="grid grid-cols-2 gap-2">
              {REFERRAL_OPTIONS.map((name) => {
                const r = referrals[name] || { on: false, date: "" };
                return (
                  <div key={name} className="space-y-1">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={r.on}
                        onCheckedChange={(v) => setReferrals({ ...referrals, [name]: { ...r, on: !!v } })}
                        data-testid={`check-referral-${name.toLowerCase()}`}
                      />
                      {name}
                    </label>
                    {r.on && (
                      <DateInput
                        value={r.date}
                        onValueChange={(value) => setReferrals({ ...referrals, [name]: { ...r, date: value } })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-saivie-plum">Pick a date to also book the referral appointment.</p>
          </div>

          <div className="space-y-2 rounded-lg border border-saivie-border p-3">
            <label className="flex items-center gap-2 font-medium">
              <Checkbox checked={followUp.on} onCheckedChange={(v) => setFollowUp({ ...followUp, on: !!v })} data-testid="check-followup" />
              Follow-up call (default: 2 days after the visit)
            </label>
            {followUp.on && <DateInput value={followUp.date} onValueChange={(value) => setFollowUp({ ...followUp, date: value })} />}
          </div>

          <Textarea placeholder="Notes for the follow-up (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <p className="text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Skip</Button>
          <Button onClick={submit} disabled={saving} data-testid="button-save-after-visit">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
