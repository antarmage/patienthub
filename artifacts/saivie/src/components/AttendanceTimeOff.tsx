import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { planningLastDate, timeOffInputSchema, timeOffListSchema, timeOffPeriodLabel, type TimeOffInput, type TimeOffRequest } from "../../../../lib/db/src/attendance-planning";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { clinicDate } from "../../../../lib/db/src/follow-up";

export function useTimeOffRequests(token?: string) {
  const accountToken = token ?? (typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("billing_staff_token"));
  const url = token === undefined ? "/api/staff/time-off" : "/api/owner/time-off";
  return useQuery({
    queryKey: [url, accountToken],
    queryFn: async () => timeOffListSchema.parse(await readApiResponse(await authenticatedFetch(url, token === undefined ? undefined : { headers: { Authorization: `Bearer ${token}` } }))),
    refetchInterval: 30000,
  });
}

function RequestDetails({ request }: { request: TimeOffRequest }) {
  return <div className="min-w-0 space-y-1">
    <p className="font-medium text-saivie-plum">{request.kind === "weekly_off" ? "Weekly off" : "Leave"} · {request.startDate}{request.endDate !== request.startDate && ` to ${request.endDate}`}</p>
    <p className="text-xs text-muted-foreground">{timeOffPeriodLabel(request.period)} · {request.decision === "pending" ? "Pending owner approval" : request.decision}</p>
    <p className="whitespace-pre-wrap break-words text-sm">{request.reason}</p>
    {request.reviewNote && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">Owner note: {request.reviewNote}</p>}
  </div>;
}

function useTimeOffAction(token?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, body }: { url: string; body?: unknown }) => {
      const headers = new Headers({ "Content-Type": "application/json" });
      if (token !== undefined) headers.set("Authorization", `Bearer ${token}`);
      return readApiResponse(await authenticatedFetch(url, { method: "POST", headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
    },
    onSuccess: async () => {
      await Promise.all(["/api/staff/time-off", "/api/owner/time-off", "/api/staff/attendance",
        "/api/owner/attendance", "/api/staff/attendance-insights", "/api/owner/attendance-insights",
        "/api/owner/dashboard", "/api/staff/face-attendance", "/api/owner/face-attendance"
      ].map((key) => client.invalidateQueries({ queryKey: [key] })));
    },
  });
}

export type TimeOffSelection = { kind: TimeOffInput["kind"]; date: string };
export function StaffTimeOff({ today, selection, onClose }: { today: string; selection: TimeOffSelection | null; onClose: () => void }) {
  const data = useTimeOffRequests();
  const action = useTimeOffAction();
  const [message, setMessage] = useState("");
  const pending = data.data?.requests.filter((row) => row.decision === "pending") || [];
  const history = data.data?.requests.filter((row) => row.decision !== "pending") || [];
  return <section className="space-y-3 rounded-3xl border border-saivie-border bg-white p-5" aria-label="My time-off applications">
    <header><h3 className="font-serif text-lg font-semibold text-saivie-plum">My applications</h3><p className="text-xs text-muted-foreground">Leave and weekly off require owner approval. Plan up to three months ahead. Approved time off can only be changed by the owner.</p></header>
    {data.isPending && <p role="status">Loading applications...</p>}
    {data.isError && <p role="alert" className="text-sm text-rose-700">{data.error.message} <Button variant="link" onClick={() => void data.refetch()}>Retry applications</Button></p>}
    {action.isError && <p role="alert" className="text-sm text-rose-700">{action.error.message}</p>}
    {message && <p role="status" className="text-sm text-saivie-teal">{message}</p>}
    {data.isSuccess && !pending.length && <p className="text-sm text-muted-foreground">No pending applications.</p>}
    {pending.map((request) => <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
      <RequestDetails request={request} />
      <Button variant="outline" disabled={action.isPending} onClick={() => {
        setMessage("");
        action.mutate({ url: `/api/staff/time-off/${request.id}/withdraw` }, { onSuccess: () => setMessage("Application withdrawn.") });
      }}>Withdraw</Button>
    </article>)}
    {!!history.length && <details className="space-y-3"><summary className="cursor-pointer text-sm text-saivie-teal">Application history ({history.length})</summary>
      {history.map((request) => <article key={request.id} className="rounded-xl border p-3"><RequestDetails request={request} /></article>)}
    </details>}
    <Dialog open={!!selection} onOpenChange={(open) => { if (!open && !action.isPending) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{selection?.kind === "weekly_off" ? "Apply for weekly off" : "Apply for leave"}</DialogTitle><DialogDescription>Your application stays pending until the owner approves it.</DialogDescription></DialogHeader>
        {action.isError && <p role="alert" className="text-sm text-rose-700">{action.error.message}</p>}
        {selection && <TimeOffForm key={`${selection.kind}:${selection.date}`} today={today} selection={selection} pending={action.isPending} onSubmit={(input) => {
          setMessage("");
          action.mutate({ url: "/api/staff/time-off", body: input }, { onSuccess: () => { setMessage("Application submitted for owner approval."); onClose(); } });
        }} />}
      </DialogContent>
    </Dialog>
  </section>;
}

export function TimeOffForm({ today, selection, pending, onSubmit }: {
  today: string; selection: TimeOffSelection; pending: boolean; onSubmit: (input: TimeOffInput) => void;
}) {
  const [startDate, setStartDate] = useState(selection.date);
  const [endDate, setEndDate] = useState(selection.date);
  const [period, setPeriod] = useState<TimeOffInput["period"]>("full_day");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const weeklyOff = selection.kind === "weekly_off";
  return <form className="space-y-4" onSubmit={(event) => {
    event.preventDefault();
    const parsed = timeOffInputSchema.safeParse({ kind: selection.kind, startDate, endDate: weeklyOff ? startDate : endDate, period, reason });
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join("; ")); return; }
    setError(""); onSubmit(parsed.data);
  }}>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <fieldset disabled={pending} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="time-off-start">{weeklyOff ? "Date" : "Start date"}</Label><Input id="time-off-start" type="date" required min={today} max={planningLastDate(today)} value={startDate} onChange={(event) => { setStartDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value); }} /></div>
        {!weeklyOff && <div><Label htmlFor="time-off-end">End date</Label><Input id="time-off-end" type="date" required min={startDate || today} max={planningLastDate(today)} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>}
      </div>
      {!weeklyOff && <div><Label htmlFor="time-off-period">Leave duration</Label><select id="time-off-period" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={period} onChange={(event) => setPeriod(timeOffInputSchema.shape.period.parse(event.target.value))}>
        <option value="full_day">Full day</option><option value="morning">Morning half-day</option><option value="afternoon">Afternoon half-day</option>
      </select><p className="mt-1 text-xs text-muted-foreground">Half-day selection applies to each selected date. The remaining half is a working day; clock in and out normally.</p></div>}
      <div><Label htmlFor="time-off-reason">Reason</Label><Textarea id="time-off-reason" required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></div>
      {weeklyOff && <p className="text-xs text-muted-foreground">One approved or pending full-day weekly off per Monday–Sunday week.</p>}
      <Button type="submit">{pending ? "Submitting..." : "Submit application"}</Button>
    </fieldset>
  </form>;
}

export function OwnerTimeOff({ token }: { token: string }) {
  const data = useTimeOffRequests(token);
  const action = useTimeOffAction(token);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const pending = data.data?.requests.filter((row) => row.decision === "pending") || [];
  const history = data.data?.requests.filter((row) => row.decision !== "pending") || [];
  return <section className="space-y-4 rounded-2xl border border-saivie-border bg-white p-5" aria-label="Leave and weekly-off approvals">
    <header><h3 className="font-semibold text-saivie-plum">Leave & weekly-off applications</h3><p className="text-sm text-muted-foreground">Only approval marks dates as leave or weekly off. Half-day leave keeps the other half available for work.</p></header>
    {data.isPending && <p role="status">Loading applications...</p>}
    {data.isError && <p role="alert" className="text-sm text-rose-700">{data.error.message} <Button variant="link" onClick={() => void data.refetch()}>Retry applications</Button></p>}
    {action.isError && <p role="alert" className="text-sm text-rose-700">{action.error.message}</p>}
    {message && <p role="status" className="text-sm text-saivie-teal">{message}</p>}
    {data.isSuccess && !pending.length && <p className="text-sm text-muted-foreground">No pending time-off applications.</p>}
    {pending.map((request) => <article key={request.id} className="space-y-3 rounded-xl border p-4">
      <p className="font-semibold text-saivie-plum">{request.employeeName}</p><RequestDetails request={request} />
      <p className="text-xs text-muted-foreground">Applied: {new Date(request.requestedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
      <Label htmlFor={`review-note-${request.id}`}>Owner note (optional)</Label><Textarea id={`review-note-${request.id}`} maxLength={1000} disabled={action.isPending} value={notes[request.id] || ""} onChange={(event) => setNotes({ ...notes, [request.id]: event.target.value })} />
      <div className="flex gap-2">{(["approved", "rejected"] as const).map((decision) => <Button key={decision} variant={decision === "approved" ? "default" : "outline"} disabled={action.isPending} onClick={() => {
        setMessage("");
        action.mutate({ url: `/api/owner/time-off/${request.id}/review`, body: { decision, note: notes[request.id] || "" } }, { onSuccess: () => setMessage(`Application ${decision}.`) });
      }}>{decision === "approved" ? "Approve" : "Reject"}</Button>)}</div>
    </article>)}
    {!!history.length && <details className="space-y-3"><summary className="cursor-pointer text-sm text-saivie-teal">Reviewed applications ({history.length})</summary>
      {history.map((request) => <article key={request.id} className="space-y-3 rounded-xl border p-3"><p className="font-semibold">{request.employeeName}</p><RequestDetails request={request} />
        {request.decision === "approved" && request.startDate >= clinicDate() && <Button variant="outline" disabled={action.isPending} onClick={() => {
          if (!window.confirm("Cancel this approval and restore these dates as working days? Dates already clocked in cannot be changed.")) return;
          setMessage("");
          action.mutate({ url: `/api/owner/time-off/${request.id}/review`, body: { decision: "cancelled", note: "Approval cancelled by owner." } }, { onSuccess: () => setMessage("Approval cancelled; dates restored as working days.") });
        }}>Cancel approved time off</Button>}
      </article>)}
    </details>}
  </section>;
}
