import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, FileText, LockKeyhole } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { authenticatedFetch, receptionRequest } from "@/lib/authenticatedFetch";
import type { ReceptionPatient } from "@/lib/receptionTimeline";
import { receptionVisitDates } from "@/lib/receptionVisitDates";
import { receptionVitals } from "@/lib/receptionVitals";
import { hasHistoryValue, receptionPatientHistory } from "@/lib/receptionPatientHistory";
import { calendarDate } from "@/lib/calendarDates";
import { useToast } from "@/hooks/use-toast";
import { PrescriptionPreview } from "@/components/PrescriptionPreview";
import { consultationHistoryText } from "@/lib/consultationSurvey";
import { appointmentLabel, readAppointmentHistory, visitTrail } from "@/lib/visitTrail";
import { PregnancyOverview } from "@/components/PregnancyOverview";
import { RecordScenarioIllustration } from "@/components/RecordScenarioIllustration";
import { clinicalCareMode } from "@/lib/clinicalCareMode";
import { PregnancyVaccinesPanel } from "@/components/PregnancyVaccines";
import { patientAge, indiaToday } from "@/lib/pregnancyOverview";

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
  if (Array.isArray(value) && value.length && value.every((item) => typeof item === "string")) return <div className="flex min-w-0 flex-wrap gap-2">{value.map((item, index) => <span key={index} className="rounded-full bg-saivie-teal/5 px-2.5 py-1 text-xs text-saivie-teal [overflow-wrap:anywhere]">{item}</span>)}</div>;
  if (Array.isArray(value)) return <div className="min-w-0 space-y-2">{value.map((item, index) => <RecordedDetails key={index} value={item} nested />)}</div>;
  if (typeof value === "object") return <dl className={`grid min-w-0 gap-2 ${nested ? "" : "sm:grid-cols-2"}`}>{Object.entries(object(value)).map(([key, item]) =>
    <div key={key} className={`min-w-0 py-2 ${item && typeof item === "object" && !nested ? "sm:col-span-2" : ""}`}><dt className="break-words text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{key.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt><dd className="mt-1 min-w-0 [overflow-wrap:anywhere]"><RecordedDetails value={item} nested /></dd></div>)}</dl>;
  return <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{String(value)}</span>;
}

function HistoryFields({ fields }: { fields: ClinicalRecord }) {
  const recorded = Object.entries(fields).filter(([, value]) => hasHistoryValue(value));
  const missing = Object.entries(fields).filter(([key]) => !recorded.some(([recordedKey]) => recordedKey === key));
  return <>
    {!!recorded.length && <RecordedDetails value={Object.fromEntries(recorded)} />}
    {!!missing.length && <div className={`${recorded.length ? "mt-4 border-t border-dashed pt-4" : ""}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Not recorded</p>
      <div className="mt-2 flex flex-wrap gap-2">{missing.map(([label]) => <span key={label} className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground">{label}</span>)}</div>
    </div>}
  </>;
}

function dateLabel(value: unknown) {
  const raw = text(value);
  const date = calendarDate(raw);
  return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : raw || "Not recorded";
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
  const [tab, setTab] = useState("visits");
  const [trailFilter, setTrailFilter] = useState("all");
  const [historySection, setHistorySection] = useState("reason");
  const record = useQuery({
    queryKey: ["reception-clinical", patient.id],
    queryFn: async ({ signal }) => {
      const [detail, visits, medicines, documents, notes, appointments] = await Promise.all([
        receptionRequest<unknown>(`/api/patients/${patient.id}`, { signal }),
        receptionRequest<unknown>(`/api/patients/${patient.id}/visit-history`, { signal }),
        receptionRequest<unknown>(`/api/patients/${patient.id}/medications`, { signal }),
        receptionRequest<unknown>(`/api/patients/${patient.id}/documents`, { signal }),
        receptionRequest<unknown>(`/api/patients/${patient.id}/clinical-notes`, { signal }),
        receptionRequest<unknown>(`/api/patients/${patient.id}/appointment-history`, { signal }),
      ]);
      if (object(detail).id !== patient.id) throw new Error("The clinical API returned an invalid patient record.");
      return { detail: object(detail), visits: list(visits), medicines: list(medicines), documents: list(documents), notes: list(notes), appointments: readAppointmentHistory(appointments, patient.id) };
    },
    gcTime: 0,
    retry: false,
    refetchInterval: 15_000,
  });
  const pregnancyLabs = useQuery({
    queryKey: ["reception-pregnancy-labs", patient.id], enabled: record.isSuccess && tab === "pregnancy",
    queryFn: async ({ signal }) => {
      const response = await receptionRequest<unknown>(`/api/patients/${patient.id}/lab-results`, { signal });
      if (!Array.isArray(response)) throw new Error("The lab API returned an invalid result list.");
      return list(response);
    }, retry: false, gcTime: 0, refetchInterval: 15_000,
  });
  const data = record.data;
  const age = patientAge(data?.detail || {}, indiaToday(), [...(data?.visits || []), ...(data?.appointments || [])]);
  const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const visitDates = receptionVisitDates(visitTrail(data?.visits ?? [], data?.appointments ?? [], data?.documents ?? []));
  const selectedVisits = visitDates.find((group) => group.date === selectedDate) ?? visitDates[0];
  const summary = receptionPatientHistory(data?.detail ?? {});
  const datedVisits = visitDates.filter((group) => group.date && group.date <= today);
  const trail = receptionVisitDates([
    ...visitTrail(data?.visits ?? [], data?.appointments ?? []).map((visit) => ({ date: visit.date, id: visit.trailKey, kind: "visit", title: text(visit.visitType) || "Consultation" })),
    ...(data?.documents ?? []).map((doc) => ({ date: doc.date, id: `report-${text(doc.id)}`, kind: "report", title: text(doc.name) || "Report" })),
  ]);
  const cardClass = "min-w-0 rounded-2xl border border-saivie-border bg-white p-5 sm:p-6";
  const headingClass = "font-serif text-lg font-semibold text-saivie-plum";
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="left-0 top-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-x-hidden overflow-y-auto rounded-none border-0 bg-[#f4f7f5] p-3 data-[state=closed]:animate-none data-[state=open]:animate-none sm:overflow-hidden sm:p-5" data-testid="reception-patient-details">
      <DialogHeader className="shrink-0 rounded-2xl bg-[#305b50] px-5 pb-10 pt-5 text-left sm:px-7">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 pr-6">
          <p className="min-w-0 break-words text-xs text-white/80">Patients / {patient.name}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-8 rounded-full bg-white px-3 text-xs text-saivie-teal" onClick={onClose} data-testid="button-back-patient-details"><ArrowLeft className="mr-1 h-3 w-3" />Back</Button>
            <Button type="button" variant="outline" className="h-8 rounded-full bg-white px-3 text-xs text-saivie-teal" onClick={onEdit} data-testid="button-edit-patient-details">Edit patient details</Button>
          </div>
        </div>
        <DialogTitle className="pt-4 font-serif text-2xl text-white">Patient details</DialogTitle>
        <DialogDescription className="text-xs text-white/80">Clinical viewing enabled by your doctor. Patient profile and history can be edited; doctor-authored encounters remain protected.</DialogDescription>
      </DialogHeader>
      {record.isPending && <p role="status" className="p-5">Loading patient details...</p>}
      {record.isError && <p role="alert" className="overflow-y-auto break-words p-5 text-rose-700">{record.error.message} <Button variant="link" onClick={() => void record.refetch()}>Retry</Button></p>}
      {record.isSuccess && data && <>
        <section aria-label="Patient summary" className="relative mx-2 -mt-6 flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-saivie-border bg-white px-5 py-4 sm:mx-5 sm:px-6">
          <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-saivie-teal/10 text-sm font-semibold text-saivie-teal">{patient.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span>
            <div className="min-w-0"><h2 className={`${headingClass} break-words`}>{text(data.detail.name)}</h2><p className="mt-1 text-xs text-muted-foreground">{age !== null ? `${age} years` : "Age not recorded"}{data.detail.dob ? ` · DOB ${dateLabel(data.detail.dob)}` : ""} · {text(data.detail.phone) || "Phone not recorded"} · {text(data.detail.type) || "Patient type not recorded"}</p></div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs sm:gap-6">
            {[["Earliest recorded visit", datedVisits.at(-1)?.label], ["Latest recorded visit", datedVisits[0]?.label]].map(([label, value]) => <div key={label}><dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1">{value || "Not recorded"}</dd></div>)}
          </dl>
        </section>
        <Tabs value={tab} onValueChange={setTab} className="mt-4 flex min-h-0 min-w-0 flex-none flex-col sm:flex-1">
        <div className="shrink-0 overflow-x-auto border-b border-saivie-border">
          <TabsList className="h-auto max-w-none justify-start gap-2 rounded-none border-0 bg-transparent p-0">
            {[["visits", "Visit dates"], ["history", "Patient history"], ["prescriptions", "Medicines"], ["reports", "Reports"], ["pregnancy", "Pregnancy"], ["vaccines", "Vaccines"]].map(([value, label]) => <TabsTrigger key={value} value={value} className="rounded-none border-b-2 border-transparent px-3 py-3 text-xs hover:bg-transparent data-[state=active]:border-saivie-teal data-[state=active]:bg-transparent data-[state=active]:text-saivie-teal data-[state=active]:shadow-none">{label}</TabsTrigger>)}
          </TabsList>
        </div>
        <div className="min-h-0 min-w-0 flex-none pt-3 [overflow-wrap:anywhere] sm:flex-1 sm:overflow-y-auto sm:overscroll-contain" data-testid="reception-details-scroll">
        <TabsContent value="visits" className="mt-0 space-y-4 text-sm">
          {!visitDates.length && <p className={cardClass}>No visit records yet.</p>}
          {selectedVisits && <div className="grid min-w-0 gap-4 md:grid-cols-[230px_minmax(0,1fr)]">
            <nav aria-label="Patient visit dates" className={`${cardClass} self-start !p-4 md:sticky md:top-0`}>
              <h2 className={headingClass}>Visit dates</h2><p className="mb-4 mt-1 text-xs text-muted-foreground">Select a date to open its records.</p>
              <div className="max-h-60 space-y-2 overflow-y-auto md:max-h-[min(60dvh,560px)]">{visitDates.map((group) => <button key={group.date} type="button" aria-pressed={group.date === selectedVisits.date} onClick={() => setSelectedDate(group.date)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal ${group.date === selectedVisits.date ? "border-saivie-teal/40 bg-saivie-teal/10" : "border-saivie-border bg-white hover:bg-stone-50"}`} data-testid={`reception-visit-date-${group.date || "unknown"}`}>
                <CalendarDays className="h-4 w-4 shrink-0 text-saivie-teal" /><span><span className="block text-sm font-medium">{group.label}</span><span className="mt-1 block text-[11px] text-muted-foreground">{group.records.some((record) => appointmentLabel(record.appointment, today).startsWith("Upcoming booking")) ? "Upcoming date · " : ""}{group.records.length} {group.records.length === 1 ? "record" : "records"}</span></span>
              </button>)}</div>
            </nav>
            <section aria-label={`Visit records for ${selectedVisits.label}`} className="min-w-0 space-y-3">
              <div className={cardClass}><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Records on</p><h3 className={`${headingClass} mt-1 text-xl`}>{selectedVisits.label}</h3><p className="mt-1 text-xs text-muted-foreground">Appointments, saved consultations and paper prescription transcriptions for this date.</p></div>
              {selectedVisits.records.map((visit) => visit.reportOnly ? <section key={visit.trailKey} className={cardClass}>
                <p className="text-sm">{text(visit.document?.name) || "Report"}</p><p className="mt-1 text-xs text-muted-foreground">Recorded on this date; not assumed to belong to a particular consultation.</p>
                <OriginalReport patientId={patient.id} doc={visit.document || {}} />
              </section> : <article key={text(visit.id)} className={`${cardClass} space-y-4`} data-testid={`reception-visit-record-${text(visit.id)}`}>
                <h4 className={headingClass}>{object(visit.prescriptions).source === "receptionist-paper-transcription" ? "Paper prescription transcription" : text(visit.visitType) || "Consultation"}</h4>
                <p className="text-xs text-muted-foreground">{appointmentLabel(visit.appointment, today)}</p>
                {visit.appointmentOnly ? <p className="text-xs text-muted-foreground">Appointment recorded; consultation note unavailable.</p> : <PrescriptionPreview patient={data.detail} visit={visit} />}
                <HistoryFields fields={{ Complaint: visit.subjective || visit.chiefComplaint, History: consultationHistoryText(object(visit.examination).consultationHistory), Examination: visit.objective || object(visit.examination).findings || visit.examination, Diagnosis: visit.diagnosis, Assessment: visit.assessment, Vitals: receptionVitals(visit.vitals) }} />
                {visit.appointment && <HistoryFields fields={{ "Appointment notes": visit.appointment.notes, "Follow-up date": visit.appointment.followUpDate, "Payment status": visit.appointment.paymentStatus, "Billing amount": visit.appointment.billingAmount }} />}
                <details className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">Prescription & follow-up</summary><div className="mt-3"><RecordedDetails value={{ medicines: object(visit.prescriptions).medicines || (Array.isArray(visit.prescriptions) ? visit.prescriptions : null), advice: visit.planNotes, followUp: visit.followUpPlan, tests: visit.labsOrdered }} /></div></details>
              </article>)}
              <p className="flex items-start gap-2 rounded-xl bg-saivie-teal/5 p-3 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4 shrink-0" />Doctor-authored encounters are read-only. Patient history edits do not change these visit records.</p>
            </section>
          </div>}
        </TabsContent>
        <TabsContent value="history" className="mt-0 space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">Current recorded history, including patient-reported onboarding answers. This is not a historical snapshot of a selected visit.</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {summary.metrics.map((metric) => <div key={metric.label} className={`${cardClass} !p-4`}><p className="text-[11px] text-muted-foreground">{metric.label}</p><p className="mt-2 font-medium text-saivie-teal">{dateLabel(metric.value)}{metric.value && metric.unit ? ` ${metric.unit}` : ""}</p></div>)}
          </div>
          <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid min-w-0 items-start gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <nav aria-label="Patient history sections" className="flex gap-1 overflow-x-auto md:sticky md:top-0 md:flex-col">
                {summary.sections.map((section) => <button key={section.id} type="button" aria-current={historySection === section.id ? "location" : undefined} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-saivie-teal hover:bg-saivie-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal ${historySection === section.id ? "bg-saivie-teal/10 font-medium" : ""}`} onClick={() => { setHistorySection(section.id); document.getElementById(`reception-history-${section.id}`)?.scrollIntoView({ block: "start" }); }}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${Object.values(section.fields).some(hasHistoryValue) ? "bg-saivie-teal/60" : "border border-saivie-teal/50"}`} />{section.title}</button>)}
              </nav>
              <div className="min-w-0 space-y-4">
                {summary.sections.map((section) => <section key={section.id} id={`reception-history-${section.id}`} className={`${cardClass} scroll-mt-3`}><div className="mb-4 flex items-center justify-between gap-3"><h3 className={headingClass}>{section.title}</h3><Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={onEdit} aria-label={`Edit patient details for ${section.title}`}>Edit</Button></div><HistoryFields fields={section.fields} /></section>)}
                <details className={cardClass}><summary className="cursor-pointer font-medium">Full recorded history</summary><p className="my-3 text-xs text-muted-foreground">Additional recorded fields, including structured records not shown above.</p><RecordedDetails value={data.detail.history} /></details>
                {!!data.notes.length && <section className={cardClass}><h3 className={`${headingClass} mb-3`}>Shared clinical notes</h3>{data.notes.map((note) => <article key={text(note.id)} className="border-t border-saivie-border py-3"><p className="mb-2 text-xs text-muted-foreground">{dateLabel(note.date || note.createdAt)}</p><RecordedDetails value={note.content || note.note || note.text} /></article>)}</section>}
              </div>
            </div>
            <aside className={cardClass} aria-label="Patient date trail">
              <h3 className={headingClass}>Date trail</h3><p className="mt-1 text-xs text-muted-foreground">Recorded visits and reports</p>
              <div className="my-4 flex flex-wrap gap-1" role="group" aria-label="Date trail filters">{[["all", "All"], ["visit", "Visits"], ["report", "Reports"]].map(([value, label]) => <button key={value} type="button" aria-pressed={trailFilter === value} onClick={() => setTrailFilter(value)} className={`rounded-full px-3 py-1 text-xs ${trailFilter === value ? "bg-saivie-teal text-white" : "border border-saivie-border hover:bg-saivie-teal/5"}`}>{label}</button>)}</div>
              <div className="space-y-4 border-l border-saivie-border pl-4">
                {trail.flatMap((group) => group.records.filter((entry) => trailFilter === "all" || entry.kind === trailFilter).map((entry) => <button key={entry.id} type="button" onClick={() => { if (entry.kind === "visit") { setSelectedDate(group.date); setTab("visits"); } else setTab("reports"); }} className="block w-full text-left text-xs hover:text-saivie-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal"><span className="text-muted-foreground">{group.label}</span><span className="ml-2 rounded bg-saivie-teal/5 px-1.5 py-0.5 text-[9px] uppercase text-saivie-teal">{entry.kind}</span><span className="mt-1 block font-medium">{entry.title}</span></button>))}
                {!trail.some((group) => group.records.some((entry) => trailFilter === "all" || entry.kind === trailFilter)) && <p className="text-xs text-muted-foreground">No {trailFilter === "all" ? "dated records" : `${trailFilter}s`} recorded.</p>}
              </div>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="prescriptions" className="space-y-3 text-sm">
          {!data.visits.length && !data.medicines.length && <p>No prescriptions or medicines recorded.</p>}
          <p className="text-muted-foreground">Visit prescriptions and follow-up instructions are under Visit dates.</p>
          {data.medicines.map((medicine) => <article key={text(medicine.id)} className={cardClass}><h3 className={`${headingClass} mb-3`}>{text(medicine.name) || "Medicine"}</h3><RecordedDetails value={{ dose: medicine.dose, frequency: medicine.frequency, duration: medicine.duration, instructions: medicine.instructions, status: medicine.status }} /></article>)}
        </TabsContent>
        <TabsContent value="reports" className="space-y-3 text-sm">
          {!data.documents.length && <>
            <RecordScenarioIllustration scenario="documents" pregnancy={clinicalCareMode(data.detail) === "pregnancy"} decorative />
            <p>No reports uploaded.</p>
          </>}
          {data.documents.map((doc) => <article key={text(doc.id)} className={`${cardClass} space-y-3`}><h3 className={`${headingClass} flex items-center gap-2`}><FileText className="h-4 w-4 shrink-0 text-saivie-teal" />{text(doc.name) || "Report"}</h3><p className="text-xs text-muted-foreground">{dateLabel(doc.date)}</p><RecordedDetails value={doc.description} /><OriginalReport patientId={patient.id} doc={doc} /></article>)}
        </TabsContent>
        <TabsContent value="pregnancy" className="text-sm">
          {pregnancyLabs.isError && <p role="alert" className={cardClass}>{pregnancyLabs.error.message}<Button variant="link" onClick={() => void pregnancyLabs.refetch()}>Retry pregnancy labs</Button></p>}
          <PregnancyOverview key={patient.id} patient={{ ...data.detail, id: patient.id }} appointments={data.appointments} visits={data.visits} labs={pregnancyLabs.data || []} documents={data.documents}
            recordsReady={record.isSuccess && pregnancyLabs.isSuccess} onProfile={onEdit} />
        </TabsContent>
        <TabsContent value="vaccines" className="text-sm">
          <PregnancyVaccinesPanel patientId={patient.id} patientName={patient.name} />
        </TabsContent>
        </div>
      </Tabs></>}
    </DialogContent>
  </Dialog>;
}
