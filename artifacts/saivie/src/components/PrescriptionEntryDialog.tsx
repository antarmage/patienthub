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

async function readApiJson(res: Response) {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    throw new Error("The server returned a web page instead of saving the prescription. Restart the API server and try again.");
  }
  if (!trimmed) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 180) || "Unexpected server response");
  }
}

const emptyMedicine = (): Medicine => ({ name: "", dose: "", frequency: "", duration: "", instructions: "" });
const PATIENT_TYPES = ["General", "PCOS", "Pregnant", "Fertility", "Postpartum", "Gynecology"];

function demographicsFrom(sourcePatient: any, visit?: any) {
  const vitals = visit?.vitals && typeof visit.vitals === "object" ? visit.vitals : {};
  return {
    lmp: String(vitals.lmp || sourcePatient?.lmp || "").slice(0, 10),
    height: vitals.height != null ? String(vitals.height) : sourcePatient?.height != null ? String(sourcePatient.height) : "",
    weight: vitals.weight != null ? String(vitals.weight) : sourcePatient?.weight != null ? String(sourcePatient.weight) : "",
    age: vitals.age != null ? String(vitals.age) : sourcePatient?.age != null ? String(sourcePatient.age) : "",
    patientType: String(vitals.patientType || sourcePatient?.type || "General"),
  };
}
const TEST_CATEGORY = /lab|test|diagnos|usg|ultra|scan|sono/i;
const USG_CATEGORY = /usg|ultra|scan|sono/i;

interface Props {
  appointment: any | null;
  patient: any | null;
  onClose: () => void;
  onSaved?: (patientId: number) => void;
}

export function PrescriptionEntryDialog({ appointment, patient, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMedicine()]);
  const [tests, setTests] = useState<TestLine[]>([]);
  const [lmp, setLmp] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [patientType, setPatientType] = useState("General");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [examination, setExamination] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [newTest, setNewTest] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const patientId = appointment?.patientId ?? patient?.id;
  const editing = !!appointment?.edit;
  const needsDate = !appointment?.id || editing;

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
    if (!appointment) return;
    const draft = appointment.draft;
    if (draft) {
      const rx = existing?.prescriptions;
      const draftMedicines = Array.isArray(draft.medicines) ? draft.medicines : [];
      const savedMedicines = Array.isArray(rx?.medicines) ? rx.medicines : Array.isArray(rx) ? rx : [];
      setMedicines((savedMedicines.length ? savedMedicines : draftMedicines.length ? draftMedicines : [emptyMedicine()]));
      setTests(Array.isArray(existing?.labsOrdered) && existing.labsOrdered.length ? existing.labsOrdered : Array.isArray(draft.tests) ? draft.tests : []);
      const demo = demographicsFrom(patient, existing || { vitals: draft });
      setLmp(String(existing?.vitals?.lmp || draft.lmp || demo.lmp || "").slice(0, 10));
      setHeight(existing?.vitals?.height != null ? String(existing.vitals.height) : draft.height != null ? String(draft.height) : demo.height);
      setWeight(existing?.vitals?.weight != null ? String(existing.vitals.weight) : draft.weight != null ? String(draft.weight) : demo.weight);
      setAge(existing?.vitals?.age != null ? String(existing.vitals.age) : draft.age != null ? String(draft.age) : demo.age);
      setPatientType(existing?.vitals?.patientType || draft.patientType || demo.patientType);
      setChiefComplaint(existing?.chiefComplaint || draft.chiefComplaint || "");
      setExamination(typeof existing?.examination === "string" ? existing.examination : existing?.examination?.findings || existing?.objective || draft.examination || "");
      setDiagnosis(existing?.diagnosis || draft.diagnosis || "");
      setAdvice(existing?.planNotes || draft.advice || "");
      setFollowUp(existing?.followUpPlan || draft.followUp || "");
      setPrescriptionDate(String(draft.prescriptionDate || existing?.date || appointment.date || "").slice(0, 10));
      return;
    }
    if (appointment.historical) {
      setMedicines([emptyMedicine()]);
      setTests([]);
      setChiefComplaint("");
      setExamination("");
      setDiagnosis("");
      setAdvice("");
      setFollowUp("");
      setPrescriptionDate("");
      setScanned(false);
      const demo = demographicsFrom(patient);
      setLmp(demo.lmp);
      setHeight(demo.height);
      setWeight(demo.weight);
      setAge(demo.age);
      setPatientType(demo.patientType);
      return;
    }
    if (!isFetched) return;
    const rx: any = existing?.prescriptions || {};
    setMedicines(Array.isArray(rx.medicines) && rx.medicines.length ? rx.medicines : Array.isArray(rx) && rx.length ? rx : [emptyMedicine()]);
    setTests(Array.isArray(existing?.labsOrdered) ? (existing!.labsOrdered as TestLine[]) : []);
    const demo = demographicsFrom(patient, existing);
    setLmp(demo.lmp);
    setHeight(demo.height);
    setWeight(demo.weight);
    setAge(demo.age);
    setPatientType(demo.patientType);
    setChiefComplaint(existing?.chiefComplaint || "");
    setExamination(typeof existing?.examination === "string" ? existing.examination : existing?.examination?.findings || existing?.objective || "");
    setDiagnosis(existing?.diagnosis || "");
    setAdvice(existing?.planNotes || "");
    setFollowUp(existing?.followUpPlan || "");
    setPrescriptionDate(String(existing?.date || appointment.date || "").slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment, isFetched, existing?.id, patient?.id]);

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
      if (needsDate && data.prescriptionDate && /^\d{4}-\d{2}-\d{2}$/.test(data.prescriptionDate)) {
        setPrescriptionDate(data.prescriptionDate);
      }
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

  const saveOnCurrentServer = async () => {
    const visitDate = (prescriptionDate || String(appointment?.date || "")).slice(0, 10);
    let visitAppointment = appointment?.id ? appointment : null;
    if (!visitAppointment) {
      const listed = await fetch(`/api/appointments?date=${visitDate}`);
      const all = await readApiJson(listed);
      visitAppointment = (Array.isArray(all) ? all : []).find((item: any) =>
        item.patientId === patientId && item.status !== "cancelled",
      );
    }
    if (!visitAppointment) {
      const today = new Date().toISOString().slice(0, 10);
      const created = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          date: visitDate,
          time: "09:00",
          duration: 15,
          type: "Consultation",
          visitType: "Consultation",
          visitMode: "in-clinic",
          status: visitDate <= today ? "completed" : "scheduled",
          chiefComplaint: chiefComplaint.trim() || null,
          reason: chiefComplaint.trim() || diagnosis.trim() || "Historical prescription",
          notes: "Created automatically from a manually entered prescription",
          completedAt: visitDate <= today ? `${visitDate}T09:00:00.000Z` : null,
        }),
      });
      visitAppointment = await readApiJson(created);
      if (!created.ok) throw new Error(visitAppointment.error || "Could not create the visit for this prescription date");
    }
    if (visitAppointment?.id && String(visitAppointment.date || "").slice(0, 10) !== visitDate) {
      await fetch(`/api/appointments/${visitAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: visitDate, chiefComplaint: chiefComplaint.trim() || null, reason: chiefComplaint.trim() || diagnosis.trim() || "Historical prescription" }),
      });
    }

    const namedMedicines = medicines.filter((med) => med.name.trim());
    const listedVisits = await fetch(`/api/patients/${patientId}/visit-history`);
    const allVisits = await readApiJson(listedVisits);
    const matchedVisit = existing || (Array.isArray(allVisits) ? allVisits.find((visit: any) => visit.appointmentId === visitAppointment.id) : null);
    const saved = await fetch(matchedVisit ? `/api/visit-history/${matchedVisit.id}` : `/api/patients/${patientId}/visit-history`, {
      method: matchedVisit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: visitAppointment.id,
        providerId: visitAppointment.providerId ?? null,
        date: visitDate,
        visitType: visitAppointment.type || visitAppointment.visitType || "Consultation",
        chiefComplaint: chiefComplaint.trim() || null,
        subjective: chiefComplaint.trim() || null,
        examination: examination.trim() ? { findings: examination.trim() } : null,
        objective: examination.trim() || null,
        vitals: {
          lmp: lmp || null,
          height: height.trim() || null,
          weight: weight.trim() ? Number(weight) : null,
          age: age.trim() ? Number(age) : null,
          patientType: patientType || null,
        },
        diagnosis,
        planNotes: advice,
        followUpPlan: followUp,
        prescriptions: {
          source: scanned ? "paper-scanned-reviewed" : "paper-transcribed",
          enteredAt: existing?.prescriptions?.enteredAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          medicines: namedMedicines,
        },
        labsOrdered: tests,
      }),
    });
    const savedBody = await readApiJson(saved);
    if (!saved.ok) throw new Error(savedBody.error || "Failed to save");
    const summary = [
      `Prescription date: ${visitDate}`,
      patientType.trim() ? `Patient type: ${patientType.trim()}` : null,
      chiefComplaint.trim() ? `Chief complaint: ${chiefComplaint.trim()}` : null,
      examination.trim() ? `O/E: ${examination.trim()}` : null,
      namedMedicines.length ? `Medicines: ${namedMedicines.map((med) => med.name.trim()).join(", ")}` : "No medicines entered",
    ].filter(Boolean).join("\n");
    const listedDocs = await fetch(`/api/patients/${patientId}/documents`);
    const docs = await readApiJson(listedDocs);
    const existingDoc = Array.isArray(docs) ? docs.find((doc: any) => doc.metadata?.source === "manual-entry" && doc.metadata?.appointmentId === visitAppointment.id) : null;
    const recorded = await fetch(existingDoc ? `/api/documents/${existingDoc.id}` : `/api/patients/${patientId}/documents`, {
      method: existingDoc ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Prescription - ${visitDate}`,
        type: "Prescription",
        category: "prescription",
        date: visitDate,
        description: summary,
        metadata: {
          source: "manual-entry",
          appointmentId: visitAppointment.id,
          savedMedications: namedMedicines.map((med) => med.name.trim()),
          patientType: patientType.trim() || null,
        },
      }),
    });
    const recordedBody = await readApiJson(recorded);
    if (!recorded.ok) throw new Error(recordedBody.error || "The visit was saved, but it could not be added to the patient record");
    const patientPatch: Record<string, unknown> = {};
    if (lmp) patientPatch.lmp = lmp;
    if (height.trim()) patientPatch.height = height.trim();
    if (weight.trim() && !Number.isNaN(Number(weight))) patientPatch.weight = Number(weight);
    if (age.trim() && !Number.isNaN(Number(age))) patientPatch.age = Number(age);
    if (patientType.trim()) patientPatch.type = patientType.trim();
    if (Object.keys(patientPatch).length > 0) {
      const patientRes = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientPatch),
      });
      if (!patientRes.ok) throw new Error("Prescription was saved, but the patient details could not be updated");
    }
    if (!matchedVisit) await Promise.all(namedMedicines.map((med) => fetch(`/api/patients/${patientId}/medications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: med.name.trim(),
        dose: med.dose || null,
        frequency: med.frequency || null,
        startDate: visitDate,
        status: "active",
        notes: [med.duration ? `Duration: ${med.duration}` : "", med.instructions || ""].filter(Boolean).join(". ") || null,
      }),
    })));
  };

  const save = async () => {
    if (!patientId || (!appointment?.id && !appointment?.historical && !patient)) return;
    if (needsDate && !/^\d{4}-\d{2}-\d{2}$/.test(prescriptionDate)) {
      toast({ title: "Enter the prescription date", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/manual-prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment?.id ?? null,
          prescriptionDate: prescriptionDate || String(appointment?.date || "").slice(0, 10),
          chiefComplaint: chiefComplaint.trim(),
          examination: examination.trim(),
          lmp,
          height: height.trim(),
          weight: weight.trim(),
          age: age.trim(),
          patientType,
          diagnosis,
          advice,
          followUp,
          medicines: medicines.filter((med) => med.name.trim()),
          tests,
          scanned,
        }),
      });
      const raw = await res.text();
      const routeMissing = res.status === 404 || raw.includes("Cannot POST") || raw.trimStart().startsWith("<");
      if (routeMissing) {
        await saveOnCurrentServer();
      } else {
        const body = raw.trim() ? JSON.parse(raw) : {};
        if (!res.ok) throw new Error(body.error || "Could not save prescription");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/documents`] });
      toast({ title: editing ? "Prescription updated" : appointment?.id ? "Prescription recorded" : "Prescription recorded and visit created" });
      onSaved?.(patientId);
      onClose();
    } catch (err: any) {
      toast({ title: "Could not save prescription", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!appointment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit prescription" : "Record prescription"}{patient?.name ? ` — ${patient.name}` : ""}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the date, patient details, or medicines. Saving replaces this prescription record."
              : needsDate
              ? "Enter the date on the paper prescription. A completed visit is created for that date, so you do not need to book an appointment first."
              : `Transcribed from the paper prescription for the visit on ${String(appointment.date).slice(0, 10)}. You can save a partial entry and finish later.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {needsDate && (
            <div className="space-y-1">
              <Label>Prescription date</Label>
              <Input type="date" value={prescriptionDate} onChange={(e) => setPrescriptionDate(e.target.value)} data-testid="input-rx-date" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>LMP</Label>
              <Input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} data-testid="input-rx-lmp" />
            </div>
            <div className="space-y-1">
              <Label>Age</Label>
              <Input type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} data-testid="input-rx-age" />
            </div>
            <div className="space-y-1">
              <Label>Patient type</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={patientType} onChange={(e) => setPatientType(e.target.value)} data-testid="input-rx-patient-type">
                {[...new Set([patientType, ...PATIENT_TYPES])].filter(Boolean).map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Height (cm)</Label>
              <Input type="number" min="0" value={height} onChange={(e) => setHeight(e.target.value)} data-testid="input-rx-height" />
            </div>
            <div className="space-y-1">
              <Label>Weight (kg)</Label>
              <Input type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} data-testid="input-rx-weight" />
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-saivie-border bg-saivie-surface-muted/50 p-3">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" data-testid="input-rx-file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) scanFile(f); }} />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-saivie-plum">
                {scanned ? "Filled from the photo — review and correct below." : "Have a photo of the paper prescription? Upload it and the fields below are filled in for you to check."}
              </p>
              <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={scanning} onClick={() => fileRef.current?.click()} data-testid="btn-rx-scan">
                {scanning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Camera className="mr-1 h-4 w-4" />}
                {scanning ? "Reading..." : "Upload photo"}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Chief complaint</Label>
            <Textarea rows={2} placeholder="Why the patient came in" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} data-testid="input-rx-chief-complaint" />
          </div>

          <div className="space-y-1">
            <Label>O/E</Label>
            <Textarea rows={2} placeholder="On examination" value={examination} onChange={(e) => setExamination(e.target.value)} data-testid="input-rx-examination" />
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
                    {t.name} <span className="text-xs text-saivie-plum">· {t.type === "usg" ? "USG" : "Lab"}{t.fromBilling ? " · from billing" : ""}</span>
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
          <Button onClick={save} disabled={saving || (needsDate && !prescriptionDate)} data-testid="btn-rx-save">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Update prescription" : "Save prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
