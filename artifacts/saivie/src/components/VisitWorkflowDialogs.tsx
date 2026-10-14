import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { gestationalWeeks, parseLmp } from "@/lib/pregnancyMilestones";

const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyVitals = { systolic: "", diastolic: "", pulse: "", temp: "", spo2: "", weight: "", height: "" };

interface VitalsDialogProps {
  appointment: any | null;
  patient: any | null;
  saving: boolean;
  onClose: () => void;
  onSave: (vitals: Record<string, unknown> | null, lmp: string | null) => void;
}

export function VitalsDialog({ appointment, patient, saving, onClose, onSave }: VitalsDialogProps) {
  const [form, setForm] = useState(emptyVitals);
  const [lmp, setLmp] = useState("");

  useEffect(() => {
    if (appointment) {
      setForm({ ...emptyVitals, height: patient?.height ? String(patient.height) : "" });
      const parsed = parseLmp(patient?.lmp);
      setLmp(parsed ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}` : "");
    }
  }, [appointment, patient]);

  const set = (key: keyof typeof emptyVitals) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const bmi =
    form.height && form.weight ? Number(form.weight) / Math.pow(Number(form.height) / 100, 2) : null;
  const hasAny = Object.values(form).some((v) => v.trim() !== "");

  const weeks = gestationalWeeks(lmp);
  const lmpValue = lmp || null;

  const submit = () =>
    onSave(
      hasAny
        ? {
            bp: form.systolic && form.diastolic ? `${form.systolic}/${form.diastolic}` : undefined,
            pulse: form.pulse || undefined,
            temp: form.temp || undefined,
            spo2: form.spo2 || undefined,
            weight: form.weight || undefined,
            height: form.height || undefined,
            bmi: bmi && Number.isFinite(bmi) ? Number(bmi.toFixed(1)) : undefined,
            recordedAt: new Date().toISOString(),
          }
        : null,
      lmpValue,
    );

  return (
    <Dialog open={!!appointment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check in · {patient?.name || "Patient"}</DialogTitle>
          <DialogDescription>Record vitals as the patient arrives, then add them to the waiting queue.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>BP systolic</Label>
            <Input type="number" value={form.systolic} onChange={set("systolic")} placeholder="120" data-testid="input-vitals-systolic" />
          </div>
          <div className="space-y-1">
            <Label>BP diastolic</Label>
            <Input type="number" value={form.diastolic} onChange={set("diastolic")} placeholder="80" data-testid="input-vitals-diastolic" />
          </div>
          <div className="space-y-1">
            <Label>Pulse (bpm)</Label>
            <Input type="number" value={form.pulse} onChange={set("pulse")} data-testid="input-vitals-pulse" />
          </div>
          <div className="space-y-1">
            <Label>Temperature (°F)</Label>
            <Input type="number" value={form.temp} onChange={set("temp")} />
          </div>
          <div className="space-y-1">
            <Label>SpO₂ (%)</Label>
            <Input type="number" value={form.spo2} onChange={set("spo2")} />
          </div>
          <div className="space-y-1">
            <Label>Weight (kg)</Label>
            <Input type="number" value={form.weight} onChange={set("weight")} data-testid="input-vitals-weight" />
          </div>
          <div className="space-y-1">
            <Label>Height (cm)</Label>
            <Input type="number" value={form.height} onChange={set("height")} />
          </div>
          <div className="flex items-end pb-2 text-sm text-slate-600">
            BMI: <span className="ml-1 font-semibold">{bmi && Number.isFinite(bmi) ? bmi.toFixed(1) : "--"}</span>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>LMP (last menstrual period)</Label>
            <Input type="date" value={lmp} max={new Date().toISOString().split("T")[0]} onChange={(e) => setLmp(e.target.value)} data-testid="input-vitals-lmp" />
            {weeks !== null && <p className="text-xs text-slate-500">Gestational age: {weeks} weeks</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onSave(null, lmpValue)} disabled={saving}>Skip vitals</Button>
          <Button onClick={submit} disabled={saving || (!hasAny && !lmpValue)} data-testid="button-save-vitals">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & check in"}
          </Button>
        </DialogFooter>
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
            <div key={key} className="space-y-2 rounded-lg border border-slate-200 p-3">
              <label className="flex items-center gap-2 font-medium">
                <Checkbox checked={state.on} onCheckedChange={(v) => set({ ...state, on: !!v })} data-testid={`check-${key}`} />
                Schedule {title}
              </label>
              {state.on && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={state.date} onChange={(e) => set({ ...state, date: e.target.value })} />
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

          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
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
                      <Input
                        type="date"
                        value={r.date}
                        onChange={(e) => setReferrals({ ...referrals, [name]: { ...r, date: e.target.value } })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">Pick a date to also book the referral appointment.</p>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <label className="flex items-center gap-2 font-medium">
              <Checkbox checked={followUp.on} onCheckedChange={(v) => setFollowUp({ ...followUp, on: !!v })} data-testid="check-followup" />
              Follow-up call (default: 2 days after the visit)
            </label>
            {followUp.on && <Input type="date" value={followUp.date} onChange={(e) => setFollowUp({ ...followUp, date: e.target.value })} />}
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
