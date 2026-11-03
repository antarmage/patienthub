import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarPlus, ChevronRight, Phone, Search, Syringe, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnlineConsultationActions } from "@/components/OnlineConsultationActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useHpvClinicStatuses } from "@/hooks/use-hpv-protection";
import { HpvBadge } from "@/components/HpvBadge";
import { ReceptionSurveyBadge, ReceptionSummaryPrint } from "@/components/ReceptionSurveyActions";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { surveyKindFor } from "@/lib/labSurvey";
import { calendarDate, calendarDateValue, shiftCalendarDays } from "@/lib/calendarDates";
import { matchesReceptionFilter, receptionLate, receptionStage, receptionTimeMinutes, receptionWeek, type ReceptionAppointment, type ReceptionFilter, type ReceptionPatient, type ReceptionPeriod } from "@/lib/receptionTimeline";

const filters: { value: ReceptionFilter; label: string }[] = [
  { value: "all", label: "All appointments" }, { value: "not-arrived", label: "Not yet arrived" },
  { value: "late", label: "Running late" }, { value: "follow-up", label: "Follow-ups to confirm" },
  { value: "payment", label: "Payment pending" }, { value: "tomorrow", label: "Reminder calls · tomorrow" },
];
const stageColors: Record<string, string> = {
  Scheduled: "bg-[#eff2ef] text-[#526044]", Arrived: "bg-[#faf1d9] text-[#745c25]",
  "With doctor": "bg-[#edf2f8] text-[#385679]", Done: "bg-[#edf4ee] text-[#315d54]",
  "No-show": "bg-[#faf0e7] text-[#92542a]", Cancelled: "bg-[#f2eef0] text-[#705364]",
};

export function ReceptionPatientList({ patients, providers, patientsLoading, patientsError, onRetryPatients, onRegister, onPayment, onWhatsApp, onTranscribePrescription, onRecordVitals, onCheckIn, onViewPatient, onManageVaccines, onEditPatient, search, onSearch, canPrintSummary = false }: {
  canPrintSummary?: boolean;
  patients: ReceptionPatient[];
  providers: { id: number; name: string }[];
  patientsLoading: boolean;
  patientsError: boolean;
  onRetryPatients: () => void;
  onRegister: () => void;
  onPayment: (patientId: number) => void;
  onWhatsApp: (patient: ReceptionPatient, message: string) => void;
  onTranscribePrescription: (patient: ReceptionPatient) => void;
  onRecordVitals: (appointment: ReceptionAppointment) => void;
  onCheckIn: (appointment: ReceptionAppointment) => void;
  onViewPatient?: (patient: ReceptionPatient) => void;
  onManageVaccines?: (patient: ReceptionPatient) => void;
  onEditPatient: (patient: ReceptionPatient) => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  const [period, setPeriod] = useState<ReceptionPeriod>("today");
  const [filter, setFilter] = useState<ReceptionFilter>("all");
  const [doctor, setDoctor] = useState("all");
  const [now, setNow] = useState(() => new Date());
  const [edit, setEdit] = useState<ReceptionAppointment | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDoctor, setEditDoctor] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const groupRefs = useRef(new Map<string, HTMLElement>());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  const today = calendarDateValue(now);
  const days = receptionWeek(today, period === "last-week" ? -1 : 0);
  const tomorrow = calendarDateValue(shiftCalendarDays(now, 1));
  const from = filter === "tomorrow" ? tomorrow : period === "today" ? today : days[0];
  const to = filter === "tomorrow" ? tomorrow : period === "today" ? today : days[6];
  const appointmentsQuery = useQuery<ReceptionAppointment[]>({
    queryKey: ["/api/appointments", "reception-timeline", from, to],
    queryFn: ({ signal }) => receptionRequest(`/api/appointments?from=${from}&to=${to}`, { signal }),
    refetchInterval: 30_000,
  });
  const appointments = appointmentsQuery.data || [];
  const hpvStatus = useHpvClinicStatuses(appointments.map((appointment) => appointment.patientId));
  const byPatient = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients]);
  const matching = appointments.filter((appointment) => {
    const patient = appointment.patientId != null ? byPatient.get(appointment.patientId) : undefined;
    const query = search.trim().toLowerCase();
    return (doctor === "all" || String(appointment.providerId) === doctor)
      && (!query || [patient?.phone, patient?.name, patient?.id].some((value) => String(value ?? "").toLowerCase().includes(query)))
      && matchesReceptionFilter(appointment, filter, now);
  }).sort((a, b) => a.date.localeCompare(b.date) || receptionTimeMinutes(a.time) - receptionTimeMinutes(b.time));
  const summary = {
    booked: appointments.filter((appointment) => receptionStage(appointment) !== "Cancelled").length,
    arrived: appointments.filter((appointment) => ["Arrived", "With doctor", "Done"].includes(receptionStage(appointment))).length,
    waiting: appointments.filter((appointment) => receptionStage(appointment) === "Arrived").length,
    noShows: appointments.filter((appointment) => receptionStage(appointment) === "No-show").length,
    completed: appointments.filter((appointment) => receptionStage(appointment) === "Done").length,
    cancelled: appointments.filter((appointment) => receptionStage(appointment) === "Cancelled").length,
    payment: appointments.filter((appointment) => matchesReceptionFilter(appointment, "payment", now)).length,
  };
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => receptionRequest(`/api/appointments/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["/api/appointments"] }); setEdit(null); },
    onError: (error: Error) => toast({ title: "Unable to update appointment", description: error.message, variant: "destructive" }),
  });
  const busy = (id: number) => update.isPending && update.variables?.id === id;
  const openReschedule = (appointment: ReceptionAppointment) => {
    setEdit(appointment); setEditDate(appointment.date); setEditDoctor(String(appointment.providerId || ""));
    const minutes = receptionTimeMinutes(appointment.time);
    setEditTime(minutes < 1440 ? `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}` : "");
  };
  const reminder = (patient: ReceptionPatient, appointment: ReceptionAppointment) => onWhatsApp(patient, `Hello ${patient.name}, please confirm your appointment on ${appointment.date} at ${appointment.time} with ${providers.find((provider) => provider.id === appointment.providerId)?.name || "your doctor"}. Please contact reception if you need to reschedule.`);
  const renderRows = (date: string) => matching.filter((appointment) => appointment.date === date).map((appointment) => {
    const patient = appointment.patientId != null ? byPatient.get(appointment.patientId) : undefined;
    const stage = receptionStage(appointment);
    const closed = ["Done", "No-show", "Cancelled"].includes(stage);
    const late = receptionLate(appointment, now);
    const phone = patient?.phone?.replace(/[^\d+]/g, "");
    return <div key={appointment.id} data-testid={`reception-patient-row-${appointment.id}`} className="grid gap-3 border-t border-[#eee5d7] bg-white p-4 md:grid-cols-[75px_minmax(150px,1fr)_minmax(130px,1fr)_110px]">
      <p className="text-sm font-semibold text-[#705364]">{appointment.time}</p>
      <div><p className="font-semibold text-saivie-plum">{patient?.name || `Patient #${appointment.patientId ?? "unassigned"}`}</p><HpvBadge status={hpvStatus(appointment.patientId)} className="mt-1" /><p className="mt-1 text-xs text-[#705364]">{patient?.phone || "Phone not recorded"}</p></div>
      <div><p className="text-sm text-saivie-plum">{providers.find((provider) => provider.id === appointment.providerId)?.name || "Doctor not assigned"}</p><p className="mt-1 text-xs text-[#705364]">{appointment.visitType || appointment.type || "Appointment"}</p></div>
      <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stageColors[stage]}`}>{stage}</span>{late && <p className="mt-1 text-[11px] text-amber-800">Running late</p>}</div>
      <div className="flex flex-wrap items-center gap-2 md:col-span-4 md:pl-[87px]">
        <ReceptionSurveyBadge appointment={appointment} />
        <ReceptionSummaryPrint appointment={appointment} patientName={patient?.name || "Patient"} canPrint={canPrintSummary} hpvStatus={hpvStatus(appointment.patientId)} />
        {appointment.visitMode === "telemedicine" && <OnlineConsultationActions appointmentId={appointment.id} />}
        {patient && <Button size="sm" variant="outline" onClick={() => onTranscribePrescription(patient)}>Add / Edit paper prescription</Button>}
        {patient && surveyKindFor(appointment) !== "lab" && appointment.date === today && !closed && stage !== "With doctor" && <Button size="sm" variant="outline" onClick={() => onRecordVitals(appointment)} data-testid={`btn-reception-vitals-${appointment.id}`}>Record vitals</Button>}
        {patient && onViewPatient && <Button size="sm" variant="outline" onClick={() => onViewPatient(patient)} data-testid={`btn-reception-details-${patient.id}`}>View patient details</Button>}
        {patient && onManageVaccines && <Button size="sm" variant="outline" onClick={() => onManageVaccines(patient)} data-testid={`btn-reception-vaccines-${patient.id}`}><Syringe className="mr-1 h-3 w-3" />Vaccines</Button>}
        {patient && <Button size="sm" variant="outline" onClick={() => onEditPatient(patient)} data-testid={`btn-reception-edit-${patient.id}`}>Edit patient details</Button>}
        {appointment.date === today && stage === "Scheduled" && <Button size="sm" disabled={busy(appointment.id)} data-testid={`reception-checkin-${appointment.id}`} onClick={() => onCheckIn(appointment)}>Check in</Button>}
        {period === "last-week" || closed ? <Button size="sm" variant="outline" asChild><Link href={`/staff/booking?patientId=${appointment.patientId || ""}`}>Rebook</Link></Button> : <>
          {stage === "Scheduled" && <Button size="sm" variant="outline" onClick={() => openReschedule(appointment)} disabled={busy(appointment.id)}>Reschedule</Button>}
          <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Cancel ${patient?.name || "this patient"}'s appointment?`)) update.mutate({ id: appointment.id, data: { status: "cancelled" } }); }} disabled={busy(appointment.id)}>Cancel</Button>
          {stage === "Scheduled" && appointment.date <= today && <Button size="sm" variant="ghost" disabled={busy(appointment.id)} onClick={() => { if (confirm(`Mark ${patient?.name || "this patient"} as no-show?`)) update.mutate({ id: appointment.id, data: { status: "no-show" } }); }}>No-show</Button>}
        </>}
        {phone && <Button size="sm" variant="ghost" asChild><a href={`tel:${phone}`} aria-label={`Call ${patient?.name}`}><Phone className="mr-1 h-3 w-3" />Call</a></Button>}
        {patient && phone && stage === "Scheduled" && appointment.date >= today && <Button size="sm" variant="ghost" onClick={() => reminder(patient, appointment)}>Confirm / Send reminder</Button>}
        {patient && phone && (closed || stage !== "Scheduled") && <Button size="sm" variant="ghost" onClick={() => onWhatsApp(patient, `Hello ${patient.name}, this is Saivie reception. Please contact us about your appointment.`)}>WhatsApp</Button>}
        {appointment.patientId != null && <Button size="sm" variant="outline" onClick={() => onPayment(appointment.patientId!)}>{matchesReceptionFilter(appointment, "payment", now) ? "Collect dues / Print bill" : "Payment / Print bill"}</Button>}
        {matchesReceptionFilter(appointment, "payment", now) && <span className="text-xs text-amber-800">Payment pending</span>}
      </div>
    </div>;
  });
  const shownDays = filter === "tomorrow" ? [tomorrow] : period === "today" ? [today] : days;
  return <section className="mx-auto max-w-7xl space-y-5" data-testid="reception-patient-list">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-[#875477]">Reception workspace</p><h2 className="mt-1 font-serif text-4xl font-semibold text-saivie-plum">Patients & appointments</h2><p className="mt-2 text-sm text-[#705364]">{appointmentsQuery.isLoading ? "Loading schedule..." : appointmentsQuery.isError ? "Schedule unavailable" : period === "last-week" ? `${summary.completed} completed · ${summary.noShows} no-shows · ${summary.cancelled} cancelled · ${summary.payment} payment pending` : `${summary.booked} booked · ${summary.arrived} arrived · ${summary.waiting} waiting · ${summary.noShows} no-shows`}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onRegister}><UserPlus className="mr-2 h-4 w-4" />New patient</Button><Button variant="outline" asChild><Link href="/staff/booking"><CalendarPlus className="mr-2 h-4 w-4" />Book appointment</Link></Button><Button asChild><Link href="/staff/booking?walkIn=1">Walk-in<ChevronRight className="ml-2 h-4 w-4" /></Link></Button></div>
    </div>
    <div className="relative"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#875477]" /><Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by phone number, then name or patient ID" aria-label="Search reception patients" className="h-12 rounded-full border-[#e9e1d2] bg-white pl-12 text-base" /></div>
    <div className="flex gap-6 border-b border-[#e9e1d2]" role="group" aria-label="Appointment period">
      {([{ value: "today", label: "Today" }, { value: "week", label: "This week" }, { value: "last-week", label: "Last week" }] as const).map((item) => <button key={item.value} type="button" aria-pressed={period === item.value} onClick={() => { setPeriod(item.value); setFilter("all"); setSelectedDay(""); }} className={`border-b-2 pb-3 text-sm font-semibold ${period === item.value ? "border-saivie-plum text-saivie-plum" : "border-transparent text-[#705364]"}`}>{item.label}</button>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <Select value={doctor} onValueChange={setDoctor}><SelectTrigger className="h-10 w-48 rounded-full bg-white" aria-label="Filter by doctor"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All doctors</SelectItem>{providers.map((provider) => <SelectItem key={provider.id} value={String(provider.id)}>{provider.name}</SelectItem>)}</SelectContent></Select>
      <Select value={filter} onValueChange={(value: ReceptionFilter) => setFilter(value)}><SelectTrigger className="h-10 w-64 rounded-full bg-white" aria-label="Filter reception appointments"><SelectValue /></SelectTrigger><SelectContent>{filters.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
    </div>
    {period !== "today" && filter !== "tomorrow" && <div className="grid grid-cols-7 gap-1.5" aria-label="Weekly booking counts">{days.map((date) => {
      const count = appointments.filter((appointment) => appointment.date === date && receptionStage(appointment) !== "Cancelled" && (doctor === "all" || String(appointment.providerId) === doctor)).length;
      return <button type="button" key={date} aria-pressed={selectedDay === date} className={`rounded-2xl border px-1 py-3 text-center ${selectedDay === date ? "border-saivie-teal bg-saivie-teal text-white" : count >= 10 ? "border-[#e9e1d2] bg-[#f5edda]" : "border-[#e9e1d2] bg-white"}`} onClick={() => { setSelectedDay(date); groupRefs.current.get(date)?.scrollIntoView({ block: "start", behavior: "smooth" }); }}>
        <span className="block text-[11px]">{calendarDate(date)?.toLocaleDateString("en-IN", { weekday: "short" })}</span><strong className="mt-1 block">{Number(date.slice(-2))}</strong><span className="mt-1 block text-[10px]">{count} booked</span>
      </button>;
    })}</div>}
    {(appointmentsQuery.isError || patientsError) && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{appointmentsQuery.error?.message || "Unable to load patient contacts."} <Button variant="link" onClick={() => { void appointmentsQuery.refetch(); onRetryPatients(); }}>Retry</Button></div>}
    {(appointmentsQuery.isLoading || patientsLoading) && <p role="status" className="text-sm text-[#705364]">Loading appointments and contacts...</p>}
    {!appointmentsQuery.isLoading && !patientsLoading && !appointmentsQuery.isError && !patientsError && <div className="space-y-3">
      {shownDays.map((date) => <details key={`${period}-${date}`} open={date >= today || period === "today" || selectedDay === date} ref={(element) => { if (element) groupRefs.current.set(date, element); else groupRefs.current.delete(date); }} className="scroll-mt-4 rounded-2xl border border-[#e9e1d2] bg-[#fffaf0]">
        <summary className="sticky top-0 z-10 cursor-pointer rounded-t-2xl bg-[#fffaf0] px-5 py-3 text-sm font-semibold text-saivie-plum">{calendarDate(date)?.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })} · {matching.filter((appointment) => appointment.date === date && receptionStage(appointment) !== "Cancelled").length} booked</summary>
        {renderRows(date)}
        {!matching.some((appointment) => appointment.date === date) && <p className="bg-white px-5 py-8 text-sm text-[#705364]">No appointments match this day.</p>}
      </details>)}
    </div>}
    <Dialog open={!!edit} onOpenChange={(open) => { if (!open && !update.isPending) setEdit(null); }}><DialogContent><DialogHeader><DialogTitle>Reschedule appointment</DialogTitle><DialogDescription>Select the doctor, date and time. Check the doctor's schedule before choosing a time.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => { event.preventDefault(); if (edit) update.mutate({ id: edit.id, data: { date: editDate, time: editTime, providerId: Number(editDoctor) } }); }} className="space-y-4">
        <Label htmlFor="reception-reschedule-date">Date</Label><DateInput id="reception-reschedule-date" value={editDate} min={today} onValueChange={setEditDate} required />
        <Label htmlFor="reception-reschedule-time">Time</Label><Input id="reception-reschedule-time" type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} required />
        <Label>Doctor</Label><Select value={editDoctor} onValueChange={setEditDoctor}><SelectTrigger aria-label="Reschedule doctor"><SelectValue placeholder="Choose doctor" /></SelectTrigger><SelectContent>{providers.map((provider) => <SelectItem key={provider.id} value={String(provider.id)}>{provider.name}</SelectItem>)}</SelectContent></Select>
        <DialogFooter><Button type="submit" disabled={!editDate || !editTime || !editDoctor || update.isPending}>{update.isPending ? "Saving..." : "Save appointment"}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </section>;
}
