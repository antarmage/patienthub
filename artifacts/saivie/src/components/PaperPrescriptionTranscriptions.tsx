import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrescriptionEntryDialog } from "@/components/PrescriptionEntryDialog";
import { receptionRequest } from "@/lib/authenticatedFetch";
import type { ReceptionPatient } from "@/lib/receptionTimeline";
import { paperWorkPageSchema } from "../../../../lib/db/src/paper-prescription-work";
import { calendarDateValue } from "@/lib/calendarDates";
import type { PaperWorkAppointment } from "@/components/PaperPrescriptionWork";

interface PaperTranscription {
  id: number;
  appointmentId: number | null;
  date: string;
}

export function PaperPrescriptionTranscriptions({ patient, appointment, onClose }: {
  patient: ReceptionPatient | null;
  appointment?: PaperWorkAppointment | null;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<{ patientId: number; historical?: boolean; edit?: boolean; transcriptionId?: number; id?: number; date?: string } | null>(null);
  const [appointmentId, setAppointmentId] = useState(appointment ? String(appointment.id) : "");
  const [appointmentPage, setAppointmentPage] = useState(0);
  const appointmentChoices = useQuery({
    queryKey: ["/api/paper-prescription-work", "patient-picker", patient?.id, appointmentPage],
    enabled: !!patient && !appointment,
    queryFn: async ({ signal }) => paperWorkPageSchema.parse(await receptionRequest(
      `/api/paper-prescription-work?patientId=${patient?.id}&to=${calendarDateValue(new Date())}&limit=25&offset=${appointmentPage * 25}`, { signal })),
  });
  const records = useQuery<PaperTranscription[]>({
    queryKey: ["/api/patients", patient?.id, "prescription-transcriptions"],
    enabled: Boolean(patient),
    queryFn: async ({ signal }) => {
      const body = await receptionRequest<unknown>(`/api/patients/${patient?.id}/prescription-transcriptions`, { signal });
      if (!Array.isArray(body) || !body.every((record: unknown) =>
        record !== null && typeof record === "object" &&
        "id" in record && Number.isInteger(record.id) &&
        "date" in record && typeof record.date === "string" &&
        "appointmentId" in record && (record.appointmentId === null || Number.isInteger(record.appointmentId)))) {
        throw new Error("The transcription API returned an invalid record list. Please contact your administrator.");
      }
      return body as PaperTranscription[];
    },
  });
  const targetRecord = records.data?.find((record) => String(record.appointmentId) === appointmentId);
  const targetAppointment = appointment || appointmentChoices.data?.rows.find((row) => String(row.appointmentId) === appointmentId);
  const legacyRecorded = targetAppointment && "status" in targetAppointment
    && targetAppointment.status === "recorded" && targetAppointment.transcriptionId === null;
  const close = () => { setSelected(null); onClose(); };
  return <>
    {!selected && <Dialog open={Boolean(patient)} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Paper prescriptions · {patient?.name}</DialogTitle><DialogDescription>Add or correct a transcription of the doctor's handwritten prescription. The original photo or scan is required.</DialogDescription></DialogHeader>
        {appointment ? <p className="rounded-lg border p-3 text-sm">For appointment #{appointment.id} · {appointment.date}. This exact appointment will be marked Recorded after saving.</p> : <div className="space-y-2">
          <label htmlFor="paper-transcription-appointment" className="text-sm font-medium">Link to appointment</label>
          <select id="paper-transcription-appointment" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={appointmentId} onChange={(event) => setAppointmentId(event.target.value)}>
            <option value="">Unlinked historical prescription</option>
            {appointmentChoices.data?.rows.map((row) => <option key={row.appointmentId} value={row.appointmentId}>#{row.appointmentId} · {row.date} {row.time} · {row.providerName || "No doctor"} · {row.status.replace("_", " ")}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Choose the actual visit, not the date you enter the paper. Unlinked entries do not clear appointment work.</p>
          {appointmentChoices.isPending && <p role="status">Loading appointment choices...</p>}
          {appointmentChoices.isError && <p role="alert" className="text-sm text-destructive">{appointmentChoices.error.message} <Button variant="link" onClick={() => void appointmentChoices.refetch()}>Retry appointments</Button></p>}
          {!!appointmentChoices.data?.total && <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={!appointmentPage} onClick={() => { setAppointmentPage((page) => page - 1); setAppointmentId(""); }}>Previous visits</Button><span className="text-xs">Page {appointmentPage + 1}</span><Button size="sm" variant="outline" disabled={(appointmentPage + 1) * 25 >= appointmentChoices.data.total} onClick={() => { setAppointmentPage((page) => page + 1); setAppointmentId(""); }}>Older visits</Button></div>}
        </div>}
        {legacyRecorded && <p role="status" className="text-sm">An earlier paper prescription is already recorded for this appointment. View it in the patient's visit history; it is not editable in this transcription editor.</p>}
        <Button disabled={!!legacyRecorded || !records.isSuccess || !!appointmentId && !targetAppointment} onClick={() => {
          if (!patient) return;
          const date = targetRecord?.date || targetAppointment?.date;
          setSelected({ patientId: patient.id, historical: !targetRecord, ...(targetRecord ? { edit: true, transcriptionId: targetRecord.id } : {}),
            id: appointmentId ? Number(appointmentId) : undefined, date });
        }} data-testid="button-add-paper-prescription">{targetRecord ? "Edit linked transcription" : "Add prescription transcription"}</Button>
        {records.isLoading && <p role="status" className="text-sm">Loading transcriptions...</p>}
        {records.isError && <p role="alert" className="text-sm text-rose-700">{records.error.message} <button type="button" className="underline" onClick={() => void records.refetch()}>Retry</button></p>}
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {(records.data || []).map((record) => <div key={record.id} className="flex items-center justify-between rounded-xl border p-3">
            <div><p className="text-sm font-medium">Prescription · {record.date}</p><p className="text-xs text-muted-foreground">Doctor-issued paper · Transcribed record{record.appointmentId ? ` · Appointment #${record.appointmentId}` : " · Unlinked"}</p></div>
            <Button variant="outline" size="sm" disabled={!record.appointmentId && !!appointmentId && !!targetRecord} data-testid={`button-edit-paper-prescription-${record.id}`} onClick={() => {
              if (patient) setSelected({ patientId: patient.id, transcriptionId: record.id,
                id: record.appointmentId ?? (appointmentId ? Number(appointmentId) : undefined), date: record.date, edit: true });
            }}>{!record.appointmentId && appointmentId ? `Edit & link to #${appointmentId}` : "Edit transcription"}</Button>
          </div>)}
          {records.isSuccess && !records.data.length && <p className="py-4 text-center text-sm text-muted-foreground">No paper prescriptions transcribed yet.</p>}
        </div>
      </DialogContent>
    </Dialog>}
    {selected && <PrescriptionEntryDialog transcriptionMode appointment={selected} patient={patient} onClose={close} onSaved={() => void records.refetch()} />}
  </>;
}
