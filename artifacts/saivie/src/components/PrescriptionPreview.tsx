import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { examinationRecord } from "@/lib/obstetricExamination";
import { generatePrescriptionHTML, prescriptionLogoSource } from "@/lib/prescriptionTemplate";
import { visitPrescription } from "@/lib/visitPrescription";
import { useToast } from "@/hooks/use-toast";

export function PrescriptionPreview({ patient, visit, providerId, draft = false, disabled = false }: {
  patient: Record<string, unknown>; visit: Record<string, unknown>; providerId?: unknown; draft?: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const details = useQuery({
    queryKey: ["prescription-letterhead", visit.id, visit.appointmentId, providerId],
    enabled: open,
    queryFn: async ({ signal }) => {
      let id = visit.providerId || providerId;
      if (!id && visit.appointmentId) {
        const appointments = await receptionRequest<unknown>(`/api/appointments?patientId=${patient.id}`, { signal });
        if (!Array.isArray(appointments)) throw new Error("The appointment API returned an invalid list.");
        const appointment = appointments.map(examinationRecord).find((item) => item.id === visit.appointmentId);
        if (!appointment) throw new Error("The prescription's appointment could not be loaded.");
        if (appointment.patientId !== patient.id || appointment.id !== visit.appointmentId) throw new Error("The appointment does not match this prescription.");
        id = appointment.providerId;
      }
      if (!id) throw new Error("No doctor is assigned to this visit. Assign the doctor before printing.");
      const [providers, template] = await Promise.all([
        receptionRequest<unknown>("/api/providers", { signal }),
        receptionRequest<unknown>("/api/invoice-template", { signal }),
      ]);
      if (!Array.isArray(providers)) throw new Error("The doctor API returned an invalid list.");
      const provider = providers.map(examinationRecord).find((item) => String(item.id) === String(id));
      if (!provider || typeof provider.name !== "string") throw new Error("The assigned doctor's saved details could not be loaded.");
      const logoUrl = examinationRecord(template).logoUrl;
      if (typeof logoUrl !== "string" || !logoUrl.trim()) throw new Error("Upload the clinic logo in clinic settings before printing the letterhead.");
      return { provider, logoUrl: prescriptionLogoSource(logoUrl) };
    },
    retry: false,
  });
  const html = useMemo(() => details.data ? generatePrescriptionHTML({
    ...visitPrescription(patient, visit, details.data.provider), logoUrl: details.data.logoUrl, draft,
  }, { printButton: false }) : "", [patient, visit, details.data, draft]);
  const print = async () => {
    try {
      const win = frame.current?.contentWindow;
      if (!win) throw new Error("Prescription preview is unavailable. Reopen the preview and retry.");
      await Promise.all(Array.from(win.document.images).map(async (image) => {
        if (!image.complete) await image.decode();
        if (!image.naturalWidth) throw new Error("The clinic logo did not load. Retry before printing.");
      }));
      if (win.document.fonts) await win.document.fonts.ready;
      win.focus();
      win.print();
    } catch (error) {
      toast({ title: "Could not print prescription", description: error instanceof Error ? error.message : "Please retry.", variant: "destructive" });
    }
  };
  return <>
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => { setReady(false); setOpen(true); }} data-testid={`preview-prescription-${visit.id || "draft"}`}>
      <Eye className="mr-1.5 h-3.5 w-3.5" />Preview prescription
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[90dvh] max-w-5xl flex-col">
        <DialogHeader><DialogTitle>Prescription preview · {String(patient.name || "Patient")}</DialogTitle>
          <DialogDescription>A4 · full Saivie letterhead · {draft ? "Unsaved draft, not ready to issue." : "Recorded visit prescription."}</DialogDescription></DialogHeader>
        {details.isPending && <p role="status">Loading saved doctor details and clinic logo...</p>}
        {details.isError && <p role="alert">{details.error.message} <Button variant="link" onClick={() => void details.refetch()}>Retry</Button></p>}
        {html && <iframe ref={frame} title="A4 prescription preview" srcDoc={html} sandbox="allow-same-origin allow-modals" onLoad={() => setReady(true)} className="min-h-0 w-full flex-1 rounded-lg border bg-white" />}
        <div className="flex justify-end"><Button onClick={() => void print()} disabled={!html || !ready || draft}><Printer className="mr-2 h-4 w-4" />Print prescription</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
