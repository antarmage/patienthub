import React, { useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, ClipboardList, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { surveyKindFor } from "@/lib/labSurvey";
import { printPatientSummary } from "@/components/IntakeSummary";
import type { HpvProtection } from "@/lib/hpvProtection";
import { pregnancyVisitContextSchema } from "../../../../lib/db/src/pregnancy-followup";

type Appointment = { id: number; patientId: number | null; surveyCompleted?: boolean; surveyType?: string | null; type?: string | null; visitType?: string | null };

export function ReceptionSurveyBadge({ appointment }: { appointment: Appointment }) {
  const known = typeof appointment.surveyCompleted === "boolean";
  const filled = appointment.surveyCompleted === true;
  const Icon = filled ? ClipboardCheck : ClipboardList;
  return <span data-testid={`flow-survey-${appointment.id}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${filled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-saivie-border bg-saivie-ivory text-saivie-plum"}`}>
    <Icon className="h-3 w-3" />{surveyKindFor(appointment) === "lab" ? "Lab survey" : "Survey"} {known ? filled ? "filled" : "pending" : "status unavailable"}
  </span>;
}

export function ReceptionSummaryPrint({ appointment, patientName, canPrint, hpvStatus }: {
  appointment: Appointment; patientName: string; canPrint: boolean; hpvStatus: HpvProtection | null;
}) {
  const [open, setOpen] = useState(false);
  const record = useQuery({
    queryKey: ["reception-print-summary", appointment.patientId, appointment.id],
    queryFn: async ({ signal }) => {
      const [patient, measurements, pregnancy] = await Promise.all([
        receptionRequest<unknown>(`/api/patients/${appointment.patientId}`, { signal }),
        receptionRequest<unknown>(`/api/appointments/${appointment.id}/reception-vitals`, { signal }),
        receptionRequest<unknown>(`/api/patients/${appointment.patientId}/pregnancy-follow-up/${appointment.id}`, { signal }),
      ]);
      if (!patient || typeof patient !== "object" || !("id" in patient) || patient.id !== appointment.patientId ||
          !measurements || typeof measurements !== "object" || !("appointmentId" in measurements) || measurements.appointmentId !== appointment.id ||
          !("patientId" in measurements) || measurements.patientId !== appointment.patientId || !("vitals" in measurements)) {
        throw new Error("The summary API returned an invalid patient or appointment record");
      }
      const vitals = z.object({
        bp: z.unknown().optional(), pulse: z.unknown().optional(), temp: z.unknown().optional(),
        spo2: z.unknown().optional(), weight: z.unknown().optional(), height: z.unknown().optional(),
        bmi: z.unknown().optional(), recordedAt: z.unknown().optional(),
      }).nullable().parse(measurements.vitals);
      return { patient, vitals, pregnancy: pregnancyVisitContextSchema.parse(pregnancy) };
    },
    enabled: open && canPrint && appointment.patientId !== null,
    gcTime: 0, staleTime: 0, retry: false,
  });
  return <>
    <Button size="sm" variant="outline" data-testid={`btn-print-summary-${appointment.id}`} disabled={!canPrint || appointment.patientId === null}
      title={canPrint ? "Print patient summary" : "Doctor permission is required to print clinical details"} onClick={() => setOpen(true)}>
      <Printer className="mr-1 h-3 w-3" />Print summary
    </Button>
    <Dialog open={open && canPrint} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>Print summary · {patientName}</DialogTitle><DialogDescription>Loads this patient's saved history and this appointment's measurements.</DialogDescription></DialogHeader>
      {record.isFetching && <p role="status">Loading patient summary...</p>}
      {record.isError && <p role="alert">{record.error.message} <Button variant="link" onClick={() => void record.refetch()}>Retry</Button></p>}
      {record.isSuccess && <Button disabled={record.isFetching} onClick={() => printPatientSummary(record.data.patient, record.data.vitals, hpvStatus, record.data.pregnancy)}><Printer className="mr-2 h-4 w-4" />Print patient summary</Button>}
    </DialogContent></Dialog>
  </>;
}
