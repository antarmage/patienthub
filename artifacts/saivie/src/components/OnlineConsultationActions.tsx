import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiResponseError, receptionRequest } from "@/lib/authenticatedFetch";
import { validMeetUrl } from "@/lib/onlineConsultation";
import { useToast } from "@/hooks/use-toast";

type Sharing = { revoked: boolean; sharedVisitIds: number[]; sharedDocumentIds: number[]; visits: { id: number; date: string; name: string }[]; documents: { id: number; date: string; name: string }[] };

function SharingForm({ appointmentId, initial }: { appointmentId: number; initial: Sharing }) {
  const [visitIds, setVisitIds] = useState(initial.sharedVisitIds);
  const [documentIds, setDocumentIds] = useState(initial.sharedDocumentIds);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const save = useMutation({
    mutationFn: () => receptionRequest(`/api/appointments/${appointmentId}/online-sharing`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitIds, documentIds }) }),
    onSuccess: () => { toast({ title: "Patient sharing updated" }); void queryClient.invalidateQueries({ queryKey: ["online-sharing", appointmentId] }); },
    onError: (error: Error) => toast({ title: "Sharing failed", description: error.message, variant: "destructive" }),
  });
  return <div className="space-y-4 border-t pt-4"><h3 className="font-medium">Records visible to the patient</h3><p className="text-xs text-muted-foreground">Only selected prescriptions from this appointment and selected patient reports are shared. Anyone holding the private link can read them.</p>
    {[{ title: "This appointment's prescriptions", rows: initial.visits, selected: visitIds, set: setVisitIds }, { title: "Patient reports to share for this appointment", rows: initial.documents, selected: documentIds, set: setDocumentIds }].map((group) => <fieldset key={group.title} className="space-y-2"><legend className="mb-2 text-sm font-medium">{group.title}</legend>{!group.rows.length && <p className="text-xs text-muted-foreground">No records available.</p>}{group.rows.map((row) => <label key={row.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={group.selected.includes(row.id)} disabled={save.isPending || initial.revoked} onChange={(event) => group.set((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /><span>{row.name} · {row.date}</span></label>)}</fieldset>)}
    <Button disabled={save.isPending || initial.revoked} onClick={() => save.mutate()}>{save.isPending ? "Saving..." : "Save patient sharing"}</Button>
  </div>;
}

export function OnlineConsultationActions({ appointmentId, canShare = false, initiallyOpen = false, onClose }: { appointmentId: number; canShare?: boolean; initiallyOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(initiallyOpen);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ["online-session", appointmentId], enabled: open, retry: false, queryFn: () => receptionRequest<{ patientUrl: string; meetingUrl: string; expiresAt: string }>(`/api/appointments/${appointmentId}/online-session`) });
  const sharing = useQuery({ queryKey: ["online-sharing", appointmentId], enabled: open && canShare, retry: false, queryFn: () => receptionRequest<Sharing>(`/api/appointments/${appointmentId}/online-sharing`) });
  const generate = useMutation({
    mutationFn: () => receptionRequest(`/api/appointments/${appointmentId}/telemedicine`, { method: "POST" }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["online-session", appointmentId] }); void queryClient.invalidateQueries({ queryKey: ["/api/appointments"] }); void queryClient.invalidateQueries({ queryKey: ["online-sharing", appointmentId] }); },
    onError: (error: Error) => toast({ title: "Meeting creation failed", description: error.message, variant: "destructive" }),
  });
  const revoke = useMutation({
    mutationFn: () => receptionRequest(`/api/appointments/${appointmentId}/online-session`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Patient link revoked" }); setOpen(false); onClose?.(); void queryClient.invalidateQueries({ queryKey: ["online-session", appointmentId] }); void queryClient.invalidateQueries({ queryKey: ["online-sharing", appointmentId] }); },
    onError: (error: Error) => toast({ title: "Revocation failed", description: error.message, variant: "destructive" }),
  });
  async function copy() {
    try { await navigator.clipboard.writeText(session.data!.patientUrl); toast({ title: "Private patient link copied" }); }
    catch (error) { toast({ title: "Could not copy link", description: error instanceof Error ? error.message : "Copy the displayed link manually.", variant: "destructive" }); }
  }
  return <>
    {!initiallyOpen && <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Video className="mr-1 h-4 w-4" />Online consultation</Button>}
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) onClose?.(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Online consultation</DialogTitle><DialogDescription>Google Meet and private patient access for appointment #{appointmentId}.</DialogDescription></DialogHeader>
      {session.isPending && <p role="status">Loading patient link...</p>}
      {session.isError && <div role="alert" className="space-y-3"><p className="text-sm text-rose-700">{session.error.message}</p>{session.error instanceof ApiResponseError && session.error.status === 404 ? <Button disabled={generate.isPending} onClick={() => generate.mutate()}>{generate.isPending ? "Creating..." : "Create Google Meet & patient page"}</Button> : <Button variant="outline" onClick={() => void session.refetch()}>Retry</Button>}</div>}
      {session.data && !session.isError && <div className="space-y-3"><p className="text-xs text-muted-foreground">Private link expires {new Date(session.data.expiresAt).toLocaleDateString("en-IN")}. Do not forward it to anyone other than this patient.</p><p className="break-all rounded-lg border p-3 text-xs">{session.data.patientUrl}</p><Button variant="outline" onClick={() => void copy()}><Copy className="mr-1 h-4 w-4" />Copy patient link</Button>{validMeetUrl(session.data.meetingUrl) && <Button asChild><a href={session.data.meetingUrl} target="_blank" rel="noopener noreferrer">Join Google Meet</a></Button>}{canShare && <Button variant="destructive" disabled={revoke.isPending} onClick={() => { if (window.confirm("Revoke this patient link permanently?")) revoke.mutate(); }}>Revoke patient link</Button>}</div>}
      {canShare && sharing.isPending && <p role="status">Loading sharing options...</p>}
      {canShare && sharing.isError && <p role="alert" className="text-sm text-rose-700">{sharing.error.message}</p>}
      {canShare && sharing.data && <SharingForm key={sharing.data.revoked ? "revoked" : String(appointmentId)} appointmentId={appointmentId} initial={sharing.data} />}
    </DialogContent></Dialog>
  </>;
}
