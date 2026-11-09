import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, ClipboardList, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { fetchCheckInVitals } from "@/lib/receptionVitals";
import { surveyKindFor } from "@/lib/labSurvey";
import { printPatientSummary } from "@/components/IntakeSummary";
import type { HpvProtection } from "@/lib/hpvProtection";
import { pregnancyVisitContextSchema } from "../../../../lib/db/src/pregnancy-followup";
import { OnboardingLink } from "./OnboardingLink";

type Appointment = { id: number; patientId: number | null; surveyCompleted?: boolean; surveyType?: string | null; type?: string | null; visitType?: string | null };

export async function loadReceptionPrintRecord(appointment: Appointment, signal?: AbortSignal) {
  if (appointment.patientId == null) throw new Error("A patient is required to print this appointment's summary.");
  const [patient, vitals, pregnancy] = await Promise.all([
    receptionRequest<unknown>(`/api/patients/${appointment.patientId}`, { signal }),
    fetchCheckInVitals(appointment.id, appointment.patientId, signal),
    receptionRequest<unknown>(`/api/patients/${appointment.patientId}/pregnancy-follow-up/${appointment.id}`, { signal }),
  ]);
  if (!patient || typeof patient !== "object" || !("id" in patient) || patient.id !== appointment.patientId) {
    throw new Error("The summary API returned an invalid patient record.");
  }
  return { patient, vitals, pregnancy: pregnancyVisitContextSchema.parse(pregnancy) };
}

export function ReceptionSurveyLink({ appointment, patientName }: { appointment: Appointment; patientName: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button size="sm" variant="outline" disabled={appointment.patientId === null}
      data-testid={`btn-refill-survey-${appointment.id}`} onClick={() => setOpen(true)}>
      <ClipboardList className="mr-1 h-3 w-3" />Fill / correct survey
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>Survey · {patientName}</DialogTitle>
        <DialogDescription>Appointment #{appointment.id}. Create a private link to fill or resubmit this appointment's survey. Share it with the patient or open it to help them.</DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">Saved initial survey answers reopen for review and correction. Pregnancy follow-ups restore this appointment's answers and offer a separate option to correct the original survey. Changes are saved only when submitted.</p>
      <OnboardingLink appointmentId={appointment.id} />
    </DialogContent></Dialog>
  </>;
}

export function ReceptionSurveyBadge({ appointment }: { appointment: Appointment }) {
  const known = typeof appointment.surveyCompleted === "boolean";
  const filled = appointment.surveyCompleted === true;
  const Icon = filled ? ClipboardCheck : ClipboardList;
  return <span data-testid={`flow-survey-${appointment.id}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${filled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-saivie-border bg-saivie-ivory text-saivie-plum"}`}>
    <Icon className="h-3 w-3" />{surveyKindFor(appointment) === "lab" ? "Lab survey" : "Survey"} {known ? filled ? "filled" : "pending" : "status unavailable"}
  </span>;
}

export function ReceptionSummaryPrint({ appointment, patientName, canPrint, hpvStatus, testId }: {
  appointment: Appointment; patientName: string; canPrint: boolean; hpvStatus: HpvProtection | null; testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const record = useQuery({
    queryKey: ["reception-print-summary", appointment.patientId, appointment.id],
    queryFn: ({ signal }) => loadReceptionPrintRecord(appointment, signal),
    enabled: open && canPrint && appointment.patientId !== null,
    gcTime: 0, staleTime: 0, retry: false,
  });
  return <>
    <Button size="sm" variant="outline" data-testid={testId || `btn-print-summary-${appointment.id}`} disabled={!canPrint || appointment.patientId === null}
      title={canPrint ? "Print patient summary" : "Doctor permission is required to print clinical details"} onClick={() => setOpen(true)}>
      <Printer className="mr-1 h-3 w-3" />Print summary
    </Button>
    <Dialog open={open && canPrint} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>Print summary · {patientName}</DialogTitle><DialogDescription>Loads this patient's saved history and this appointment's measurements.</DialogDescription></DialogHeader>
      {record.isFetching && <p role="status">Loading patient summary...</p>}
      {record.isError && <p role="alert">{record.error.message} <Button variant="link" onClick={() => void record.refetch()}>Retry</Button></p>}
      {record.isSuccess && <>
        <p className="text-xs">Appointment #{appointment.id}</p>
        <section className="rounded-lg border p-3 text-sm"><h3 className="font-semibold">Saved check-in vitals</h3>
          {record.data.vitals && Object.entries(record.data.vitals).some(([key, value]) => key !== "recordedAt" && value != null && value !== "")
            ? <dl>{[
              ["Blood pressure (mmHg)", record.data.vitals.bp], ["Pulse (bpm)", record.data.vitals.pulse],
              ["Temperature (°F)", record.data.vitals.temp], ["SpO₂ (%)", record.data.vitals.spo2],
              ["Weight (kg)", record.data.vitals.weight], ["Height (cm)", record.data.vitals.height],
              ["BMI", record.data.vitals.bmi],
            ].filter(([, value]) => value != null && value !== "").map(([label, value]) =>
              <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            : <p>No check-in vitals recorded for this appointment. Verify the appointment used when saving the measurements.</p>}
        </section>
        <Button disabled={record.isFetching || printing} onClick={async () => {
          const printWindow = window.open("", "_blank", "width=900,height=1000");
          if (!printWindow) { alert("Please allow pop-ups to print the patient summary."); return; }
          setPrinting(true);
          try {
            const fresh = await record.refetch();
            if (!fresh.isSuccess) {
              printWindow.close();
              alert(fresh.error?.message || "Unable to load current check-in vitals. Please retry.");
              return;
            }
            printPatientSummary(fresh.data.patient, fresh.data.vitals, hpvStatus, fresh.data.pregnancy, printWindow);
          } finally {
            setPrinting(false);
          }
        }}><Printer className="mr-2 h-4 w-4" />{printing ? "Loading current measurements..." : "Print patient summary"}</Button>
      </>}
    </DialogContent></Dialog>
  </>;
}
