import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { calendarDateValue } from "@/lib/calendarDates";

const planSchema = z.object({
  id: z.number().int().positive(), patientId: z.number().int().positive(),
  procedureName: z.string(), plannedDate: z.string(), surgeonId: z.number().int().positive(),
  surgeonName: z.string(), notes: z.string(),
  status: z.enum(["planned", "completed", "cancelled", "discharged"]),
  completedAt: z.string().nullable(), closedAt: z.string().nullable(),
  createdAt: z.string(), updatedAt: z.string(),
});
type Plan = z.infer<typeof planSchema>;
type Patient = { id: number; name: string };
type Details = { procedureName: string; plannedDate: string; surgeonId: string; notes: string };
const emptyDetails: Details = { procedureName: "", plannedDate: "", surgeonId: "", notes: "" };
const statusLabels = { planned: "Planned", completed: "In recovery", cancelled: "Cancelled", discharged: "Discharged" };

function SurgeryPlanner({ patient }: { patient: Patient }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [details, setDetails] = useState(emptyDetails);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<{ plan: Plan; status: "completed" | "cancelled" | "discharged" } | null>(null);
  const [completedDate, setCompletedDate] = useState(() => calendarDateValue(new Date()));
  const plans = useQuery({
    queryKey: ["/api/patients", patient.id, "surgeries"],
    queryFn: async ({ signal }) => z.array(planSchema).parse(await receptionRequest(`/api/patients/${patient.id}/surgeries`, { signal })),
    refetchInterval: 30_000,
  });
  const providers = useQuery({
    queryKey: ["/api/providers", "surgery-planning"],
    queryFn: async ({ signal }) => z.array(z.object({ id: z.number().int().positive(), name: z.string() })).parse(await receptionRequest("/api/providers", { signal })),
  });
  const mutation = useMutation({
    mutationFn: async ({ id, body }: { id?: number; body: Record<string, unknown> }) => planSchema.parse(await receptionRequest(
      `/api/patients/${patient.id}/surgeries${id ? `/${id}` : ""}`,
      { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    )),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/patients", patient.id, "surgeries"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/postop/patients"] });
      setEditing(null); setDetails(emptyDetails); setConfirmation(null);
      toast({ title: "Surgery workflow updated" });
    },
    onError: (error: Error) => toast({ title: "Could not update surgery", description: error.message, variant: "destructive" }),
  });
  const openPlan = plans.data?.find((plan) => ["planned", "completed"].includes(plan.status));
  const set = (key: keyof Details, value: string) => setDetails((current) => ({ ...current, [key]: value }));
  return <div className="space-y-5" data-testid="surgery-planner">
    <p className="rounded-xl bg-saivie-sage/50 p-3 text-sm">Plan surgery → Mark completed → Recovery → Discharge. Patients appear in recovery only after the doctor confirms surgery completion.</p>
    {plans.isPending && <p role="status">Loading surgery history...</p>}
    {plans.isError && <p role="alert">{plans.error.message} <Button variant="link" onClick={() => void plans.refetch()}>Retry</Button></p>}
    {plans.isSuccess && <>
      {plans.data.map((plan) => <section key={plan.id} className="space-y-2 rounded-xl border p-4" data-testid={`surgery-plan-${plan.id}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{plan.procedureName}</h3><span className="rounded-full bg-saivie-sage px-3 py-1 text-xs">{statusLabels[plan.status]}</span></div>
        <p className="text-sm text-muted-foreground">Planned: {plan.plannedDate} · Surgeon: {plan.surgeonName}</p>
        {plan.completedAt && <p className="text-sm">Completed: {new Date(plan.completedAt).toLocaleDateString("en-IN")}</p>}
        {plan.notes && <p className="whitespace-pre-wrap break-words text-sm">{plan.notes}</p>}
        <div className="flex flex-wrap gap-2">
          {plan.status === "planned" && <>
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => { setEditing(plan.id); setDetails({ procedureName: plan.procedureName, plannedDate: plan.plannedDate, surgeonId: String(plan.surgeonId), notes: plan.notes }); }}>Edit plan</Button>
            <Button size="sm" disabled={mutation.isPending} onClick={() => { setCompletedDate(calendarDateValue(new Date())); setConfirmation({ plan, status: "completed" }); }}>Mark surgery completed</Button>
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setConfirmation({ plan, status: "cancelled" })}>Cancel surgery</Button>
          </>}
          {plan.status === "completed" && <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setConfirmation({ plan, status: "discharged" })}>Discharge from recovery</Button>}
        </div>
      </section>)}
      {confirmation && <form aria-label="Confirm surgery status change" className="space-y-3 rounded-xl border border-saivie-blush bg-saivie-surface-blush p-4" onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ id: confirmation.plan.id, body: confirmation.status === "completed" ? { status: "completed", completedDate } : { status: confirmation.status } });
      }}>
        <h3 className="font-semibold">{confirmation.status === "completed" ? "Confirm surgery has been performed" : confirmation.status === "cancelled" ? "Cancel this surgery plan?" : "Discharge this patient from recovery?"}</h3>
        <p className="text-sm">{confirmation.plan.procedureName} · {patient.name}. {confirmation.status === "completed" ? "This will enroll the patient in active recovery." : "The patient will not appear in the active recovery list."}</p>
        {confirmation.status === "completed" && <div className="space-y-1"><Label htmlFor="surgery-completed-date">Actual surgery date</Label><DateInput id="surgery-completed-date" required value={completedDate} max={calendarDateValue(new Date())} onValueChange={setCompletedDate} /></div>}
        <div className="flex gap-2"><Button type="submit" disabled={mutation.isPending || (confirmation.status === "completed" && !completedDate)}>Confirm {confirmation.status === "completed" ? "completion" : confirmation.status === "cancelled" ? "cancellation" : "discharge"}</Button><Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => setConfirmation(null)}>Back</Button></div>
      </form>}
      {(!openPlan || editing !== null) && !confirmation && <form className="space-y-3 rounded-xl border p-4" onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ id: editing ?? undefined, body: { ...details, surgeonId: Number(details.surgeonId) } });
      }}>
        <h3 className="font-semibold">{editing ? "Edit surgery plan" : "Plan surgery"}</h3>
        <div className="space-y-1"><Label htmlFor="surgery-procedure">Procedure name</Label><Input id="surgery-procedure" required maxLength={200} value={details.procedureName} onChange={(event) => set("procedureName", event.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="surgery-planned-date">Planned surgery date</Label><DateInput id="surgery-planned-date" required value={details.plannedDate} onValueChange={(value) => set("plannedDate", value)} /></div>
        <div className="space-y-1"><Label htmlFor="surgery-surgeon">Surgeon</Label><select id="surgery-surgeon" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={details.surgeonId} onChange={(event) => set("surgeonId", event.target.value)}><option value="">Select surgeon</option>{providers.data?.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></div>
        {providers.isError && <p role="alert">{providers.error.message} <Button type="button" variant="link" onClick={() => void providers.refetch()}>Retry surgeons</Button></p>}
        <div className="space-y-1"><Label htmlFor="surgery-notes">Notes</Label><Textarea id="surgery-notes" maxLength={5000} value={details.notes} onChange={(event) => set("notes", event.target.value)} /></div>
        <div className="flex gap-2"><Button disabled={mutation.isPending || !providers.isSuccess || !details.procedureName.trim() || !details.plannedDate || !details.surgeonId}>{mutation.isPending ? "Saving..." : editing ? "Save changes" : "Save surgery plan"}</Button>{editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setDetails(emptyDetails); }}>Stop editing</Button>}</div>
      </form>}
    </>}
  </div>;
}

export function SurgeryPlanningButton({ patient }: { patient?: Patient }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const patients = useQuery({
    queryKey: ["/api/patients", "surgery-picker"],
    queryFn: async ({ signal }) => z.array(z.object({ id: z.number().int().positive(), name: z.string() })).parse(await receptionRequest("/api/patients", { signal })),
    enabled: open && !patient,
  });
  const selected = patient ?? patients.data?.find((item) => String(item.id) === selectedId);
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Surgery planning</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Surgery planning{selected ? ` · ${selected.name}` : ""}</DialogTitle><DialogDescription>Doctor-controlled surgery plans and recovery enrollment.</DialogDescription></DialogHeader>
      {!patient && <div className="space-y-2"><Label htmlFor="surgery-patient">Patient</Label><select id="surgery-patient" className="h-10 w-full rounded-md border bg-background px-3" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Select patient</option>{patients.data?.map((item) => <option key={item.id} value={item.id}>{item.name} · #{item.id}</option>)}</select>{patients.isPending && <p role="status">Loading patients...</p>}{patients.isError && <p role="alert">{patients.error.message} <Button variant="link" onClick={() => void patients.refetch()}>Retry</Button></p>}</div>}
      {selected && <SurgeryPlanner key={selected.id} patient={selected} />}
    </DialogContent></Dialog>
  </>;
}
