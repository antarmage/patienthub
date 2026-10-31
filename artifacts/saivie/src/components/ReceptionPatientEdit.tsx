import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { calendarDateValue } from "@/lib/calendarDates";
import type { ReceptionPatient } from "@/lib/receptionTimeline";
import { useToast } from "@/hooks/use-toast";

interface EditablePatient {
  id: number;
  name: string;
  age: number;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  dob?: string | null;
  type?: string | null;
  lmp?: string | null;
  height?: string | null;
  weight?: number | null;
  pregnancyStatus?: string | null;
  condition?: string | null;
  contraception?: string | null;
  history?: Record<string, unknown> | null;
}

const fields = [
  { key: "name", label: "Name", required: true },
  { key: "age", label: "Age", number: true, required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "dob", label: "Date of birth", date: true },
  { key: "type", label: "Patient type" },
  { key: "lmp", label: "LMP" , date: true },
  { key: "height", label: "Height (cm)", number: true },
  { key: "weight", label: "Weight (kg)", number: true },
  { key: "pregnancyStatus", label: "Pregnancy status", options: [
    { value: "", label: "Not recorded" },
    { value: "active", label: "Active" },
    { value: "pregnant", label: "Pregnant" },
    { value: "completed", label: "Completed" },
    { value: "aborted", label: "Aborted" },
    { value: "not_continuing", label: "Not continuing" },
  ] },
  { key: "condition", label: "Condition" },
  { key: "contraception", label: "Contraception" },
] as const;
type FieldKey = typeof fields[number]["key"];

function EditForm({ patient, onClose }: { patient: EditablePatient; onClose: () => void }) {
  const [form, setForm] = useState<Record<FieldKey, string>>(() => Object.fromEntries(fields.map(({ key }) =>
    [key, patient[key] == null ? "" : String(patient[key])])) as Record<FieldKey, string>);
  const [history, setHistory] = useState(JSON.stringify(patient.history || {}, null, 2));
  const obstetric = patient.history?.obstetric;
  const obstetricRecord = obstetric && typeof obstetric === "object" && !Array.isArray(obstetric) ? obstetric as Record<string, unknown> : {};
  const [pregnancy, setPregnancy] = useState(() => Object.fromEntries(["gravida", "surgicalHistory", "bloodGroup", "eod"].map((key) => [key, String(obstetricRecord[key] ?? "")])));
  const [changedPregnancy, setChangedPregnancy] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !/^\d+$/.test(form.age) || Number(form.age) > 130) throw new Error("Enter the patient's name and a whole-number age between 0 and 130.");
      if (form.weight && (!Number.isFinite(Number(form.weight)) || Number(form.weight) < 0.1 || Number(form.weight) > 500)) throw new Error("Enter a weight between 0.1 and 500 kg.");
      let historyValue: unknown;
      try { historyValue = JSON.parse(history); } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        throw new Error("Patient history contains invalid JSON. Correct its format before saving.");
      }
      if (!historyValue || typeof historyValue !== "object" || Array.isArray(historyValue)) throw new Error("Patient history must be a JSON object. Use null within a history field to clear that field.");
      const updatedHistory = historyValue as Record<string, unknown>;
      if (changedPregnancy.length) {
        const savedObstetric = updatedHistory.obstetric;
        if (savedObstetric != null && (typeof savedObstetric !== "object" || Array.isArray(savedObstetric))) throw new Error("The obstetric history must be an object before editing pregnancy information.");
        updatedHistory.obstetric = {
          ...(savedObstetric as Record<string, unknown> | null),
          ...Object.fromEntries(changedPregnancy.map((key) => [key, pregnancy[key].trim() || null])),
        };
      }
      const body = Object.fromEntries(fields.map(({ key }) => {
        const value = form[key].trim();
        return [key, key === "age" ? Number(value) : key === "weight" ? value ? Number(value) : null : value || null];
      }));
      const result = await receptionRequest<EditablePatient>(`/api/patients/${patient.id}/reception-details-edit`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, history: updatedHistory }),
      });
      if (result.id !== patient.id) throw new Error("The API did not confirm the patient update. Reload before retrying.");
      return result;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] }),
        queryClient.invalidateQueries({ queryKey: ["reception-clinical", patient.id] }),
      ]);
      toast({ title: "Patient details updated" });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Could not update patient", description: error.message, variant: "destructive" }),
  });
  return <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => <div key={field.key} className="min-w-0 space-y-1">
          <Label htmlFor={`edit-patient-${field.key}`}>{field.label}</Label>
          {"date" in field ? <DateInput id={`edit-patient-${field.key}`} max={calendarDateValue(new Date())} value={form[field.key]} onValueChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))} disabled={save.isPending} />
            : "options" in field ? <select id={`edit-patient-${field.key}`} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm disabled:opacity-50" value={form[field.key]} disabled={save.isPending} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}>
              {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            : <Input id={`edit-patient-${field.key}`} type={"number" in field ? "number" : "text"} step={field.key === "age" ? "1" : "any"} required={"required" in field} value={form[field.key]} disabled={save.isPending} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />}
        </div>)}
      </div>
      <fieldset className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-medium">Pregnancy history</legend>
        {[["gravida", "Gravida / parity"], ["surgicalHistory", "Past surgery"], ["bloodGroup", "Blood group"], ["eod", "Recorded expected delivery date"]].map(([key, label]) => <div key={key} className="space-y-1">
          <Label htmlFor={`edit-obstetric-${key}`}>{label}</Label>
          {key === "eod" ? <DateInput id={`edit-obstetric-${key}`} value={pregnancy[key]} disabled={save.isPending} onValueChange={(value) => { setPregnancy((current) => ({ ...current, [key]: value })); setChangedPregnancy((current) => current.includes(key) ? current : [...current, key]); }} />
            : <Input id={`edit-obstetric-${key}`} value={pregnancy[key]} disabled={save.isPending} onChange={(event) => { setPregnancy((current) => ({ ...current, [key]: event.target.value })); setChangedPregnancy((current) => current.includes(key) ? current : [...current, key]); }} />}
        </div>)}
      </fieldset>
      <details className="space-y-2 rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-medium">Edit full patient history (advanced)</summary>
        <Label htmlFor="edit-patient-history">Patient history (structured JSON)</Label>
        <p className="text-xs text-muted-foreground">Edit recorded history and pregnancy information using the existing field names. Missing fields are retained; set a field to null to clear it. Doctor notes and server audit information are protected.</p>
        <Textarea id="edit-patient-history" className="min-h-64 font-mono text-xs" value={history} disabled={save.isPending} onChange={(event) => setHistory(event.target.value)} />
      </details>
    </div>
    <div className="flex shrink-0 justify-end gap-2 border-t pt-3"><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending} data-testid="button-save-patient-details">{save.isPending ? "Saving..." : "Save patient details"}</Button></div>
  </form>;
}

export function ReceptionPatientEdit({ patient, onClose }: { patient: ReceptionPatient; onClose: () => void }) {
  const record = useQuery({
    queryKey: ["reception-patient-edit", patient.id],
    queryFn: async ({ signal }) => {
      const body = await receptionRequest<EditablePatient>(`/api/patients/${patient.id}/reception-details-edit`, { signal });
      if (!body || body.id !== patient.id || typeof body.name !== "string" || !Number.isInteger(body.age)) throw new Error("The API returned invalid patient details.");
      return body;
    },
    gcTime: 0, retry: false,
  });
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="left-0 top-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-4 data-[state=closed]:animate-none data-[state=open]:animate-none sm:p-6">
      <DialogHeader className="shrink-0 pr-6 text-left">
        <div className="flex min-w-0 items-center gap-3"><Button variant="outline" className="shrink-0" onClick={onClose}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button><DialogTitle className="min-w-0 break-words leading-snug">Edit patient details · {patient.name}</DialogTitle></div>
        <DialogDescription>Receptionist editing is enabled. Changes are audited. This does not edit doctor-authored encounters, diagnoses or prescriptions.</DialogDescription>
      </DialogHeader>
      {record.isPending && <p role="status">Loading patient details...</p>}
      {record.isError && <p role="alert" className="text-rose-700">{record.error.message} <Button variant="link" onClick={() => void record.refetch()}>Retry</Button></p>}
      {record.isSuccess && <EditForm patient={record.data} onClose={onClose} />}
    </DialogContent>
  </Dialog>;
}
