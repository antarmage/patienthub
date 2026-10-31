import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { authenticatedFetch, receptionRequest } from "@/lib/authenticatedFetch";
import type { ReceptionPatient } from "@/lib/receptionTimeline";
import { useToast } from "@/hooks/use-toast";

type ClinicalRecord = Record<string, unknown>;
function object(value: unknown): ClinicalRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ClinicalRecord : {};
}
function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
function list(value: unknown): ClinicalRecord[] {
  if (!Array.isArray(value) || value.some((row) => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("The clinical API returned an invalid record list.");
  return value.map(object);
}
function RecordedDetails({ value, nested = false }: { value: unknown; nested?: boolean }) {
  if (value == null || value === "") return <span className="text-muted-foreground">Not recorded</span>;
  if (Array.isArray(value)) return <div className="min-w-0 space-y-2">{value.map((item, index) => <RecordedDetails key={index} value={item} nested />)}</div>;
  if (typeof value === "object") return <dl className={`grid min-w-0 gap-2 ${nested ? "" : "sm:grid-cols-2"}`}>{Object.entries(object(value)).map(([key, item]) =>
    <div key={key} className={`min-w-0 rounded border p-2 ${item && typeof item === "object" && !nested ? "sm:col-span-2" : ""}`}><dt className="break-words text-xs font-medium text-muted-foreground">{key.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt><dd className="mt-1 min-w-0 [overflow-wrap:anywhere]"><RecordedDetails value={item} nested /></dd></div>)}</dl>;
  return <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{String(value)}</span>;
}

function OriginalReport({ patientId, doc }: { patientId: number; doc: ClinicalRecord }) {
  const [file, setFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  useEffect(() => () => { if (file) URL.revokeObjectURL(file); }, [file]);
  const metadata = object(doc.metadata);
  if (!metadata.patientDocumentId) return null;
  const load = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`/api/patients/${patientId}/documents/${text(doc.id)}/file`);
      if (!response.ok) throw new Error(`Could not load original report (HTTP ${response.status}).`);
      if (response.headers.get("content-type")?.includes("text/html")) throw new Error("The report API returned a web page instead of the original report.");
      setFile(URL.createObjectURL(await response.blob()));
    } catch (error) {
      toast({ title: "Could not open report", description: error instanceof Error ? error.message : "Unable to load the report.", variant: "destructive" });
    } finally { setLoading(false); }
  };
  return file ? <a href={file} download={text(doc.name) || "Report"} className="text-sm text-saivie-teal underline">Download original</a>
    : <Button size="sm" variant="outline" disabled={loading} onClick={() => void load()}>{loading ? "Loading..." : "Load original report"}</Button>;
}

export function ReceptionPatientDetails({ patient, onClose }: { patient: ReceptionPatient; onClose: () => void }) {
  const record = useQuery({
    queryKey: ["reception-clinical", patient.id],
    queryFn: async ({ signal }) => {
      const [detail, visits, medicines, documents, notes] = await Promise.all([
        receptionRequest<unknown>(`/api/patients/${patient.id}`, { signal }),
        receptionRequest<unknown>(`/api/patients/${patient.id}/visit-history`, { signal }),
        receptionRequest<unknown>(`/api/patients/${patient.id}/medications`, { signal }),
        receptionRequest<unknown>(`/api/patients/${patient.id}/documents`, { signal }),
        receptionRequest<unknown>(`/api/patients/${patient.id}/clinical-notes`, { signal }),
      ]);
      if (object(detail).id !== patient.id) throw new Error("The clinical API returned an invalid patient record.");
      return { detail: object(detail), visits: list(visits), medicines: list(medicines), documents: list(documents), notes: list(notes) };
    },
    gcTime: 0,
    retry: false,
    refetchInterval: 15_000,
  });
  const data = record.data;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="left-0 top-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-4 data-[state=closed]:animate-none data-[state=open]:animate-none sm:p-6" data-testid="reception-patient-details">
      <DialogHeader className="shrink-0 pr-6 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="outline" className="shrink-0" onClick={onClose} data-testid="button-back-patient-details"><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
          <DialogTitle className="min-w-0 break-words leading-snug">Patient details · {patient.name}</DialogTitle>
        </div>
        <DialogDescription>Read-only access enabled by your doctor. Clinical records cannot be changed here.</DialogDescription>
      </DialogHeader>
      {record.isPending && <p role="status">Loading patient details...</p>}
      {record.isError && <p role="alert" className="overflow-y-auto break-words text-rose-700">{record.error.message} <Button variant="link" onClick={() => void record.refetch()}>Retry</Button></p>}
      {record.isSuccess && data && <Tabs defaultValue="history" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TabsList className="flex h-auto w-full shrink-0 flex-nowrap"><TabsTrigger value="history">Details & history</TabsTrigger><TabsTrigger value="prescriptions">Prescriptions & medicines</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger><TabsTrigger value="pregnancy">Pregnancy</TabsTrigger></TabsList>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-1 [overflow-wrap:anywhere]" data-testid="reception-details-scroll">
        <TabsContent value="history" className="space-y-3 text-sm">
          <RecordedDetails value={{ name: data.detail.name, age: data.detail.age, phone: data.detail.phone, patientType: data.detail.type, history: data.detail.history }} />
          {data.visits.map((visit) => <article key={text(visit.id)} className="space-y-2 rounded-xl border p-3">
            <h3 className="font-medium">{text(visit.date)} · {text(visit.visitType) || "Visit"}</h3>
            <RecordedDetails value={{ complaint: visit.chiefComplaint, examination: visit.examination || visit.objective, diagnosis: visit.diagnosis, assessment: visit.assessment, vitals: visit.vitals }} />
          </article>)}
          {data.notes.map((note) => <article key={text(note.id)} className="rounded-xl border p-3"><p className="font-medium">{text(note.date || note.createdAt)}</p><RecordedDetails value={note.content || note.note || note.text} /></article>)}
        </TabsContent>
        <TabsContent value="prescriptions" className="space-y-3 text-sm">
          {!data.visits.length && !data.medicines.length && <p>No prescriptions or medicines recorded.</p>}
          {data.visits.map((visit) => <article key={text(visit.id)} className="space-y-2 rounded-xl border p-3"><h3 className="font-medium">{text(visit.date)}</h3><RecordedDetails value={{ medicines: object(visit.prescriptions).medicines || (Array.isArray(visit.prescriptions) ? visit.prescriptions : null), advice: visit.planNotes, followUp: visit.followUpPlan, tests: visit.labsOrdered }} /></article>)}
          {data.medicines.map((medicine) => <article key={text(medicine.id)} className="rounded-xl border p-3"><RecordedDetails value={{ medicine: medicine.name, dose: medicine.dose, frequency: medicine.frequency, duration: medicine.duration, instructions: medicine.instructions, status: medicine.status }} /></article>)}
        </TabsContent>
        <TabsContent value="reports" className="space-y-3 text-sm">
          {!data.documents.length && <p>No reports uploaded.</p>}
          {data.documents.map((doc) => <article key={text(doc.id)} className="space-y-2 rounded-xl border p-3"><h3 className="font-medium">{text(doc.name)} · {text(doc.date)}</h3><RecordedDetails value={doc.description} /><OriginalReport patientId={patient.id} doc={doc} /></article>)}
        </TabsContent>
        <TabsContent value="pregnancy" className="text-sm">
          <RecordedDetails value={{ pregnancyStatus: data.detail.pregnancyStatus, clinicianRecordedLmp: data.detail.lmp, patientReportedLmp: object(data.detail.history).patientReportedLmp, obstetric: object(data.detail.history).obstetric }} />
        </TabsContent>
        </div>
      </Tabs>}
    </DialogContent>
  </Dialog>;
}
