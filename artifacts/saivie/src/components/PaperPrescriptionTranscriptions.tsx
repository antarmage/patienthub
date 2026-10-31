import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrescriptionEntryDialog } from "@/components/PrescriptionEntryDialog";
import { receptionRequest } from "@/lib/authenticatedFetch";
import type { ReceptionPatient } from "@/lib/receptionTimeline";

interface PaperTranscription {
  id: number;
  appointmentId: number | null;
  date: string;
}

export function PaperPrescriptionTranscriptions({ patient, onClose }: {
  patient: ReceptionPatient | null;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<{ patientId: number; historical?: boolean; edit?: boolean; transcriptionId?: number; id?: number; date?: string } | null>(null);
  const records = useQuery<PaperTranscription[]>({
    queryKey: ["/api/patients", patient?.id, "prescription-transcriptions"],
    enabled: Boolean(patient),
    queryFn: ({ signal }) => receptionRequest(`/api/patients/${patient?.id}/prescription-transcriptions`, { signal }),
  });
  const close = () => { setSelected(null); onClose(); };
  return <>
    {!selected && <Dialog open={Boolean(patient)} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Paper prescriptions · {patient?.name}</DialogTitle><DialogDescription>Add or correct a transcription of the doctor's handwritten prescription. The original photo or scan is required.</DialogDescription></DialogHeader>
        <Button onClick={() => { if (patient) setSelected({ patientId: patient.id, historical: true }); }} data-testid="button-add-paper-prescription">Add prescription transcription</Button>
        {records.isLoading && <p role="status" className="text-sm">Loading transcriptions...</p>}
        {records.isError && <p role="alert" className="text-sm text-rose-700">{records.error.message} <button type="button" className="underline" onClick={() => void records.refetch()}>Retry</button></p>}
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {(records.data || []).map((record) => <div key={record.id} className="flex items-center justify-between rounded-xl border p-3">
            <div><p className="text-sm font-medium">Prescription · {record.date}</p><p className="text-xs text-muted-foreground">Doctor-issued paper · Transcribed record</p></div>
            <Button variant="outline" size="sm" data-testid={`button-edit-paper-prescription-${record.id}`} onClick={() => { if (patient) setSelected({ patientId: patient.id, transcriptionId: record.id, id: record.appointmentId ?? undefined, date: record.date, edit: true }); }}>Edit transcription</Button>
          </div>)}
          {records.isSuccess && !records.data.length && <p className="py-4 text-center text-sm text-muted-foreground">No paper prescriptions transcribed yet.</p>}
        </div>
      </DialogContent>
    </Dialog>}
    <PrescriptionEntryDialog transcriptionMode appointment={selected} patient={patient} onClose={close} onSaved={() => void records.refetch()} />
  </>;
}
