import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  paperWorkLabels, paperWorkPageSchema, paperWorkRowSchema, type PaperWorkRow,
} from "../../../../lib/db/src/paper-prescription-work";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { calendarDateValue } from "@/lib/calendarDates";
import type { ReceptionPatient } from "@/lib/receptionTimeline";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type PaperWorkAppointment = { id: number; date: string };
const timestamp = (value: string) => new Date(value).toLocaleString("en-IN");

export function usePaperWorkRows(from: string, to: string) {
  return useQuery({
    queryKey: ["/api/paper-prescription-work", "timeline", from, to],
    queryFn: async ({ signal }) => {
      const rows: PaperWorkRow[] = [];
      let total: number;
      do {
        const page = paperWorkPageSchema.parse(await receptionRequest(`/api/paper-prescription-work?from=${from}&to=${to}&limit=100&offset=${rows.length}`, { signal }));
        total = page.total;
        if (!page.rows.length && rows.length < total) throw new Error("Paper entry status list changed while loading. Retry.");
        rows.push(...page.rows);
      } while (rows.length < total);
      return rows;
    },
    refetchInterval: 30_000,
  });
}

export function PaperWorkBadge({ row }: { row: PaperWorkRow }) {
  const color = row.status === "recorded" ? "bg-emerald-50 text-emerald-800" :
    row.status === "pending" ? "bg-amber-50 text-amber-900" : "bg-stone-100 text-stone-700";
  return <div className="space-y-1">
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>Paper Rx: {paperWorkLabels[row.status]}</span>
    {row.status === "recorded" && <p className="text-xs text-muted-foreground">{row.transcriptionId === null ? "Earlier paper entry · " : ""}Entered by {row.recordedBy || "Not recorded"}{row.recordedAt ? ` · ${timestamp(row.recordedAt)}` : " · Time not recorded"}</p>}
    {row.status === "not_required" && <p className="break-words text-xs text-muted-foreground">{row.reason}{row.updatedBy ? ` · ${row.updatedBy}` : ""}{row.updatedAt ? ` · ${timestamp(row.updatedAt)}` : ""}</p>}
  </div>;
}

export function PaperWorkStatusAction({ row }: { row: PaperWorkRow }) {
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => paperWorkRowSchema.parse(await receptionRequest(`/api/paper-prescription-work/${row.appointmentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: row.status === "not_required" ? "pending" : "not_required", reason, version: row.version }),
    })),
    onSuccess: async () => {
      setOpen(false); setReason("");
      await queryClient.invalidateQueries({ queryKey: ["/api/paper-prescription-work"] });
    },
  });
  if (!["pending", "not_required"].includes(row.status)) return null;
  const action = row.status === "not_required" ? "Reopen paper entry" : "Paper entry not required";
  return <>
    <Button size="sm" variant="ghost" onClick={() => { mutation.reset(); setOpen(true); }}>{action}</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!mutation.isPending) setOpen(value); }}>
      <DialogContent><DialogHeader><DialogTitle>{action}</DialogTitle><DialogDescription>{row.patientName} · {row.date} · Appointment #{row.appointmentId}. This only changes paper-entry work, not consultation status. The reason and your identity are retained.</DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
          <Label htmlFor={reasonId}>Reason</Label><Input id={reasonId} required maxLength={500} disabled={mutation.isPending} value={reason} onChange={(event) => setReason(event.target.value)} />
          {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
          <Button type="submit" disabled={!reason.trim() || mutation.isPending}>{mutation.isPending ? "Saving..." : "Save status"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

export function PaperPrescriptionWork({ onTranscribe }: {
  onTranscribe: (patient: ReceptionPatient, appointment?: PaperWorkAppointment) => void;
}) {
  const today = calendarDateValue(new Date());
  const [status, setStatus] = useState<"pending" | "recorded" | "not_required" | "all">("pending");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today);
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ["/api/paper-prescription-work", "backlog", from, to, status, offset],
    enabled: !!to && (!from || from <= to),
    queryFn: async ({ signal }) => paperWorkPageSchema.parse(await receptionRequest(
      `/api/paper-prescription-work?status=${status}&to=${to}${from ? `&from=${from}` : ""}&limit=25&offset=${offset}`, { signal })),
    refetchInterval: 30_000,
  });
  const invalidRange = !to || !!from && from > to;
  return <section className="space-y-3 rounded-2xl border border-[#e9e1d2] bg-white p-4" aria-label="Paper prescription work">
    <div><h3 className="font-serif text-xl font-semibold text-saivie-plum">Paper prescription work</h3>
      <p className="mt-1 text-xs text-muted-foreground">Completed consultations become pending only when no linked paper or digital prescription is saved. Linked paper entries, including earlier formats, are Recorded; digital prescriptions make paper entry Not required. This backlog is separate from the appointment timeline below. Unlinked historical entries do not clear appointments.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div><Label htmlFor="paper-work-filter">Paper entry status</Label><select id="paper-work-filter" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => {
        const value = event.target.value;
        if (value === "pending" || value === "recorded" || value === "not_required" || value === "all") { setStatus(value); setOffset(0); }
      }}>
        <option value="pending">Pending</option><option value="recorded">Recorded</option><option value="not_required">Not required</option><option value="all">All statuses</option>
      </select></div>
      <div><Label htmlFor="paper-work-from">Appointment from (blank = all history)</Label><DateInput id="paper-work-from" value={from} max={to || undefined} onValueChange={(value) => { setFrom(value); setOffset(0); }} /></div>
      <div><Label htmlFor="paper-work-to">Appointment through</Label><DateInput id="paper-work-to" required value={to} onValueChange={(value) => { setTo(value); setOffset(0); }} /></div>
    </div>
    {invalidRange && <p role="alert" className="text-sm text-destructive">Choose a valid date range.</p>}
    {!invalidRange && query.isPending && <p role="status">Loading paper-entry work...</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">{query.error.message} <Button variant="link" onClick={() => void query.refetch()}>Retry paper work</Button></p>}
    {!invalidRange && query.isSuccess && <>
      <p className="text-sm">{query.data.total} {status === "all" ? "appointments" : paperWorkLabels[status].toLowerCase()} in this work filter</p>
      <div className="max-h-[36rem] divide-y overflow-y-auto">{query.data.rows.map((row) => <div key={row.appointmentId} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`paper-work-${row.appointmentId}`}>
        <div className="min-w-0 space-y-1"><p className="break-words text-sm font-semibold">{row.patientName} · #{row.appointmentId}</p><p className="text-xs text-muted-foreground">{row.date} · {row.time} · {row.providerName || "Doctor not assigned"}</p><PaperWorkBadge row={row} /></div>
        <div className="flex flex-wrap gap-2">{(row.status !== "recorded" || row.transcriptionId !== null) && <Button size="sm" variant="outline" onClick={() => onTranscribe({ id: row.patientId, name: row.patientName }, { id: row.appointmentId, date: row.date })}>{row.status === "recorded" ? "Edit paper entry" : "Record paper prescription"}</Button>}<PaperWorkStatusAction row={row} /></div>
      </div>)}</div>
      {!query.data.total && <p className="text-sm text-muted-foreground">No paper-entry work matches this filter.</p>}
      <div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={!offset} onClick={() => setOffset((value) => Math.max(0, value - 25))}>Previous</Button><span className="text-xs">Page {Math.floor(offset / 25) + 1}</span><Button size="sm" variant="outline" disabled={offset + 25 >= query.data.total} onClick={() => setOffset((value) => value + 25)}>Next</Button></div>
    </>}
  </section>;
}
