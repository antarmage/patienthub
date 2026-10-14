import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Medicine {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface TestLine {
  name: string;
  type: "lab" | "usg";
  fromBilling?: boolean;
}

const emptyMedicine = (): Medicine => ({ name: "", dose: "", frequency: "", duration: "", instructions: "" });
const TEST_CATEGORY = /lab|test|diagnos|usg|ultra|scan|sono/i;
const USG_CATEGORY = /usg|ultra|scan|sono/i;

interface Props {
  appointment: any | null;
  patient: any | null;
  onClose: () => void;
}

export function PrescriptionEntryDialog({ appointment, patient, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMedicine()]);
  const [tests, setTests] = useState<TestLine[]>([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [newTest, setNewTest] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const patientId = appointment?.patientId;

  const { data: visits = [], isFetched } = useQuery<any[]>({
    queryKey: ["/api/patients", patientId, "visit-history"],
    enabled: !!appointment && !!patientId,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/visit-history`);
      return res.ok ? res.json() : [];
    },
  });

  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["/api/patients", patientId, "invoices"],
    enabled: !!appointment && !!patientId,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/invoices`);
      return res.ok ? res.json() : [];
    },
  });

  const existing = visits.find((v: any) => v.appointmentId === appointment?.id) || null;

  const billedTests: TestLine[] = invoices
    .filter((inv: any) => inv.appointmentId === appointment?.id || String(inv.date).slice(0, 10) === String(appointment?.date).slice(0, 10))
    .flatMap((inv: any) => (Array.isArray(inv.items) ? inv.items : []))
    .filter((it: any) => TEST_CATEGORY.test(String(it.category || "")))
    .map((it: any) => ({
      name: String(it.name || it.description || ""),
      type: (USG_CATEGORY.test(String(it.category || "")) ? "usg" : "lab") as "lab" | "usg",
      fromBilling: true,
    }))
    .filter((t: TestLine) => t.name);

  useEffect(() => {
    if (!appointment || !isFetched) return;
    const rx: any = existing?.prescriptions || {};
    setMedicines(Array.isArray(rx.medicines) && rx.medicines.length ? rx.medicines : [emptyMedicine()]);
    setTests(Array.isArray(existing?.labsOrdered) ? (existing!.labsOrdered as TestLine[]) : []);
    setDiagnosis(existing?.diagnosis || "");
    setAdvice(existing?.planNotes || "");
    setFollowUp(existing?.followUpPlan || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment?.id, isFetched, existing?.id]);

  const scanFile = async (file: File) => {
    if (!patientId) return;
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/patients/${patientId}/parse-prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: base64, mimeType: file.type || "application/pdf", fileName: file.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not read the prescription");
      if (data.medicines?.length) setMedicines(data.medicines);
      if (data.tests?.length) {
        setTests((prev) => [...prev, ...data.tests.filter((t: TestLine) => !prev.some((x) => x.name.toLowerCase() === t.name.toLowerCase()))]);
      }
      if (data.diagnosis) setDiagnosis(data.diagnosis);
      if (data.advice) setAdvice(data.advice);
      if (data.followUp) setFollowUp(data.followUp);
      setScanned(true);
      toast({ title: "Prescription read", description: "Please check every field against the paper copy before saving." });
    } catch (err: any) {
      toast({ title: "Could not read prescription", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addTest = (t: TestLine) => {
    if (tests.some((x) => x.name.toLowerCase() === t.name.toLowerCase())) return;
    setTests([...tests, t]);
  };

  const updateMedicine = (i: number, key: keyof Medicine, value: string) =>
    setMedicines(medicines.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));

  const missingBilled = billedTests.filter((b) => !tests.some((t) => t.name.toLowerCase() === b.name.toLowerCase()));

  const save = async () => {
    if (!appointment || !patientId) return;
    setSaving(true);
    try {
      const payload = {
        appointmentId: appointment.id,
        providerId: appointment.providerId ?? null,
        date: String(appointment.date).slice(0, 10),
        visitType: appointment.type || appointment.visitType || null,
        diagnosis,
        planNotes: advice,
        followUpPlan: followUp,
        prescriptions: {
          source: scanned ? "paper-scanned-reviewed" : "paper-transcribed",
          enteredAt: existing?.prescriptions?.enteredAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          medicines: medicines.filter((m) => m.name.trim()),
        },
        labsOrdered: tests,
      };
      const res = await fetch(existing ? `/api/visit-history/${existing.id}` : `/api/patients/${patientId}/visit-history`, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visit-history"] });
      toast({ title: "Prescription recorded" });
      onClose();
    } catch {
      toast({ title: "Could not save prescription", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!appointment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record prescription{patient?.name ? ` — ${patient.name}` : ""}</DialogTitle>
          <DialogDescription>
            Transcribed from the paper prescription for the visit on {appointment ? String(appointment.date).slice(0, 10) : ""}. You can save a partial entry and finish later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-dashed border-teal-300 bg-teal-50/50 p-3">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" data-testid="input-rx-file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) scanFile(f); }} />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {scanned ? "Filled from the photo — review and correct below." : "Have a photo of the paper prescription? Upload it and the fields below are filled in for you to check."}
              </p>
              <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={scanning} onClick={() => fileRef.current?.click()} data-testid="btn-rx-scan">
                {scanning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Camera className="mr-1 h-4 w-4" />}
                {scanning ? "Reading..." : "Upload photo"}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Diagnosis / notes</Label>
            <Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} data-testid="input-rx-diagnosis" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Medicines prescribed</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setMedicines([...medicines, emptyMedicine()])} data-testid="btn-rx-add-medicine">
                <Plus className="mr-1 h-3 w-3" /> Add medicine
              </Button>
            </div>
            {medicines.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
                <Input className="col-span-12 sm:col-span-4" placeholder="Medicine" value={m.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} data-testid={`input-rx-med-name-${i}`} />
                <Input className="col-span-4 sm:col-span-2" placeholder="Dose" value={m.dose} onChange={(e) => updateMedicine(i, "dose", e.target.value)} />
                <Input className="col-span-4 sm:col-span-2" placeholder="Frequency" value={m.frequency} onChange={(e) => updateMedicine(i, "frequency", e.target.value)} />
                <Input className="col-span-3 sm:col-span-2" placeholder="Duration" value={m.duration} onChange={(e) => updateMedicine(i, "duration", e.target.value)} />
                <Button type="button" size="icon" variant="ghost" className="col-span-1 sm:col-span-2 justify-self-end" onClick={() => setMedicines(medicines.length > 1 ? medicines.filter((_, idx) => idx !== i) : [emptyMedicine()])}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Input className="col-span-12" placeholder="Instructions (e.g. after food)" value={m.instructions} onChange={(e) => updateMedicine(i, "instructions", e.target.value)} />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Tests (lab / USG)</Label>
            {missingBilled.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm">
                <p className="mb-1 text-xs font-medium text-amber-800">Billed but not in prescription — tap to add</p>
                <div className="flex flex-wrap gap-1.5">
                  {missingBilled.map((b) => (
                    <Button key={b.name} type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => addTest(b)} data-testid="btn-rx-add-billed-test">
                      <Plus className="mr-1 h-3 w-3" /> {b.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1">
              {tests.map((t, i) => (
                <div key={`${t.name}-${i}`} className="flex items-center justify-between rounded-md border px-2 py-1 text-sm">
                  <span>
                    {t.name} <span className="text-xs text-slate-500">· {t.type === "usg" ? "USG" : "Lab"}{t.fromBilling ? " · from billing" : ""}</span>
                  </span>
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTests(tests.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Add a test" value={newTest} onChange={(e) => setNewTest(e.target.value)} data-testid="input-rx-test" />
              <Button type="button" variant="outline" disabled={!newTest.trim()} onClick={() => { addTest({ name: newTest.trim(), type: USG_CATEGORY.test(newTest) ? "usg" : "lab" }); setNewTest(""); }}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Advice</Label>
            <Textarea rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} data-testid="input-rx-advice" />
          </div>
          <div className="space-y-1">
            <Label>Follow-up</Label>
            <Input placeholder="e.g. Review after 2 weeks with reports" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} data-testid="btn-rx-save">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save prescription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
