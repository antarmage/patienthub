import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VitalsDialog } from "@/components/VisitWorkflowDialogs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { useToast } from "@/hooks/use-toast";
import type { ReceptionAppointment, ReceptionPatient } from "@/lib/receptionTimeline";

interface ReceptionVitals {
  appointmentId: number;
  patientId: number;
  vitals: Record<string, unknown> | null;
  lmp: string | null;
}

export function ReceptionVitalsDialog({ appointment, patient, onClose }: {
  appointment: ReceptionAppointment;
  patient: ReceptionPatient;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const record = useQuery<ReceptionVitals>({
    queryKey: ["/api/appointments", appointment.id, "reception-vitals"],
    queryFn: async ({ signal }) => {
      const body = await receptionRequest<unknown>(`/api/appointments/${appointment.id}/reception-vitals`, { signal });
      if (!body || typeof body !== "object" ||
          !("appointmentId" in body) || body.appointmentId !== appointment.id ||
          !("patientId" in body) || body.patientId !== patient.id ||
          !("vitals" in body) || (body.vitals !== null && (typeof body.vitals !== "object" || Array.isArray(body.vitals))) ||
          !("lmp" in body) || (body.lmp !== null && typeof body.lmp !== "string")) {
        throw new Error("The vitals API returned an invalid appointment record.");
      }
      return body as ReceptionVitals;
    },
    gcTime: 0,
    staleTime: Infinity,
  });
  const measuredPatient = useMemo(() => ({ ...patient, lmp: record.data?.lmp }), [patient, record.data?.lmp]);
  const save = useMutation({
    mutationFn: ({ vitals, lmp }: { vitals: Record<string, unknown> | null; lmp: string | null }) => receptionRequest(`/api/appointments/${appointment.id}/reception-vitals`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        vitals: vitals ? Object.fromEntries(Object.entries(vitals).filter(([key]) => ["bp", "pulse", "temp", "spo2", "weight", "height"].includes(key))) : null,
        lmp,
      }),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "Vitals recorded" });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Could not save vitals", description: error.message, variant: "destructive" }),
  });
  if (!record.isSuccess) return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent><DialogHeader><DialogTitle>Record vitals · {patient.name}</DialogTitle><DialogDescription>Loading this appointment's measurements.</DialogDescription></DialogHeader>
      {record.isPending && <p role="status">Loading vitals...</p>}
      {record.isError && <p role="alert">{record.error.message} <Button variant="link" onClick={() => void record.refetch()}>Retry</Button></p>}
    </DialogContent>
  </Dialog>;
  return <VitalsDialog recordingOnly appointment={appointment} patient={measuredPatient} initialVitals={record.data.vitals} saving={save.isPending} onClose={onClose} onSave={(vitals, lmp) => save.mutate({ vitals, lmp })} />;
}
