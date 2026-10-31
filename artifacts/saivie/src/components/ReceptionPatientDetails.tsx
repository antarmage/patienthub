import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { authenticatedFetch, receptionRequest } from "@/lib/authenticatedFetch";
import type { ReceptionPatient } from "@/lib/receptionTimeline";
import { receptionVisitDates } from "@/lib/receptionVisitDates";
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

export function ReceptionPatientDetails({ patient, onClose, onEdit }: { patient: ReceptionPatient; onClose: () => void; onEdit: () => void }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
  const visitDates = receptionVisitDates(data?.visits ?? []);
  const selectedVisits = visitDates.find((group) => group.date === selectedDate) ?? visitDates[0];
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="left-0 top-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-4 data-[state=closed]:animate-none data-[state=open]:animate-none sm:p-6" data-testid="reception-patient-details">
      <DialogHeader className="shrink-0 pr-6 text-left">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Button type="button" variant="outline" className="shrink-0" onClick={onClose} data-testid="button-back-patient-details"><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
          <DialogTitle className="min-w-0 flex-1 break-words leading-snug">Patient details · {patient.name}</DialogTitle>
          <Button type="button" variant="outline" className="ml-auto shrink-0" onClick={onEdit} data-testid="button-edit-patient-details">Edit patient details</Button>
        </div>
        <DialogDescription>Clinical viewing enabled by your doctor. Patient profile and history can be edited; doctor-authored encounters remain protected.</DialogDescription>
      </DialogHeader>
      {record.isPending && <p role="status">Loading patient details...</p>}
      {record.isError && <p role="alert" className="overflow-y-auto break-words text-rose-700">{record.error.message} <Button variant="link" onClick={() => void record.refetch()}>Retry</Button></p>}
      {record.isSuccess && data && <Tabs defaultValue="visits" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 overflow-x-auto"><TabsList className="h-auto w-max justify-start"><TabsTrigger value="visits">Visit dates</TabsTrigger><TabsTrigger value="history">Patient history</TabsTrigger><TabsTrigger value="prescriptions">Medicines</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger><TabsTrigger value="pregnancy">Pregnancy</TabsTrigger></TabsList></div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-1 [overflow-wrap:anywhere]" data-testid="reception-details-scroll">
        <TabsContent value="visits" className="space-y-4 text-sm">
          <div className="rounded-xl border bg-stone-50 p-4">
            <p className="font-medium">{text(data.detail.name)}</p>
            <p className="mt-1 text-muted-foreground">{text(data.detail.age)} years · {text(data.detail.phone) || "Phone not recorded"}</p>
          </div>
          <div><h2 className="font-medium">Recorded visit dates</h2><p className="mt-1 text-xs text-muted-foreground">Newest first. Select a date to see its visit records and paper prescription transcriptions.</p></div>
          {!visitDates.length && <p className="rounded-xl border p-4 text-muted-foreground">No visit records yet.</p>}
          {selectedVisits && <div className="grid min-w-0 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
            <nav aria-label="Patient visit dates" className="min-w-0 space-y-2">
              {visitDates.map((group) => <button key={group.date} type="button" aria-pressed={group.date === selectedVisits.date} onClick={() => setSelectedDate(group.date)} className={`w-full rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal ${group.date === selectedVisits.date ? "border-saivie-teal/40 bg-saivie-teal/5" : "bg-white hover:bg-stone-50"}`} data-testid={`reception-visit-date-${group.date || "unknown"}`}>
                <span className="block font-medium">{group.label}</span><span className="mt-1 block text-xs text-muted-foreground">{group.records.length} {group.records.length === 1 ? "record" : "records"}</span>
              </button>)}
            </nav>
            <section aria-label={`Visit records for ${selectedVisits.label}`} className="min-w-0 space-y-3">
              <h3 className="font-medium">{selectedVisits.label}</h3>
              {selectedVisits.records.map((visit) => <article key={text(visit.id)} className="min-w-0 space-y-3 rounded-xl border p-4" data-testid={`reception-visit-record-${text(visit.id)}`}>
                <h4 className="font-medium">{object(visit.prescriptions).source === "receptionist-paper-transcription" ? "Paper prescription transcription" : text(visit.visitType) || "Consultation"}</h4>
                <RecordedDetails value={{ complaint: visit.chiefComplaint, examination: visit.examination || visit.objective, diagnosis: visit.diagnosis, assessment: visit.assessment, vitals: visit.vitals }} />
                <details className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">Prescription & follow-up</summary><div className="mt-3"><RecordedDetails value={{ medicines: object(visit.prescriptions).medicines || (Array.isArray(visit.prescriptions) ? visit.prescriptions : null), advice: visit.planNotes, followUp: visit.followUpPlan, tests: visit.labsOrdered }} /></div></details>
              </article>)}
            </section>
          </div>}
        </TabsContent>
        <TabsContent value="history" className="space-y-3 text-sm">
          <RecordedDetails value={{ name: data.detail.name, age: data.detail.age, phone: data.detail.phone, patientType: data.detail.type, history: data.detail.history }} />
          {data.notes.map((note) => <article key={text(note.id)} className="rounded-xl border p-3"><p className="font-medium">{text(note.date || note.createdAt)}</p><RecordedDetails value={note.content || note.note || note.text} /></article>)}
        </TabsContent>
        <TabsContent value="prescriptions" className="space-y-3 text-sm">
          {!data.visits.length && !data.medicines.length && <p>No prescriptions or medicines recorded.</p>}
          <p className="text-muted-foreground">Visit prescriptions and follow-up instructions are under Visit dates.</p>
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
