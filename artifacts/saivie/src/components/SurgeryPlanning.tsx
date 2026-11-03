import { useState, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import {
  emptySurgeryAssignments, surgeryCareRoles, surgeryCareRoleLabels, surgeryTeamSchema, type SurgeryAssignments,
} from "../../../../lib/db/src/surgery-care-network";
import { SurgeryCareNetwork, useSurgeryCareNetwork } from "@/components/SurgeryCareNetwork";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  team: surgeryTeamSchema,
});
type Plan = z.infer<typeof planSchema>;
type Patient = { id: number; name: string };
type Details = { procedureName: string; plannedDate: string; surgeonId: string; notes: string; assignments: SurgeryAssignments };
const emptyDetails: Details = { procedureName: "", plannedDate: "", surgeonId: "", notes: "", assignments: emptySurgeryAssignments };
const statusLabels = { planned: "Planned", completed: "In recovery", cancelled: "Cancelled", discharged: "Discharged" };

function SurgeryPlanner({ patient }: { patient: Patient }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const network = useSurgeryCareNetwork();
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
  const editingPlan = plans.data?.find((plan) => plan.id === editing);
  const set = (key: Exclude<keyof Details, "assignments">, value: string) => setDetails((current) => ({ ...current, [key]: value }));
  return <div className="space-y-5" data-testid="surgery-planner">
    <p className="rounded-xl bg-saivie-sage/50 p-3 text-sm">Plan surgery → Mark completed → Recovery → Discharge. Patients appear in recovery only after the doctor confirms surgery completion.</p>
    {plans.isPending && <p role="status">Loading surgery history...</p>}
    {plans.isError && <p role="alert">{plans.error.message} <Button variant="link" onClick={() => void plans.refetch()}>Retry</Button></p>}
    {plans.isSuccess && <>
      {plans.data.map((plan) => <section key={plan.id} className="space-y-2 rounded-xl border p-4" data-testid={`surgery-plan-${plan.id}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{plan.procedureName}</h3><span className="rounded-full bg-saivie-sage px-3 py-1 text-xs">{statusLabels[plan.status]}</span></div>
        <p className="text-sm text-muted-foreground">Planned: {plan.plannedDate} · Surgeon: {plan.surgeonName}</p>
        <details>
          <summary className="cursor-pointer text-sm text-saivie-teal">Team and place</summary>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {surgeryCareRoles.map((role) => {
            const member = plan.team[role];
            return <div key={role} className="min-w-0 break-words">
              <dt className="text-xs text-muted-foreground">{surgeryCareRoleLabels[role]}</dt>
              <dd>{member ? `${member.name}${member.active ? "" : " (Archived)"}` : "Not assigned"}</dd>
              {member?.affiliation && <dd className="text-xs text-muted-foreground">{member.affiliation}</dd>}
              {member?.phone && <dd className="text-xs">{member.phone}</dd>}
              {member?.email && <dd className="text-xs">{member.email}</dd>}
            </div>;
          })}
        </dl>
        <p className="text-xs text-muted-foreground">Recorded assignments only. Availability and theatre booking must be confirmed separately.</p>
        </details>
        {plan.completedAt && <p className="text-sm">Completed: {new Date(plan.completedAt).toLocaleDateString("en-IN")}</p>}
        {plan.notes && <p className="whitespace-pre-wrap break-words text-sm">{plan.notes}</p>}
        <div className="flex flex-wrap gap-2">
          {plan.status === "planned" && <>
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => { setEditing(plan.id); setDetails({
              procedureName: plan.procedureName, plannedDate: plan.plannedDate, surgeonId: String(plan.surgeonId), notes: plan.notes,
              assignments: {
                nursing_home: plan.team.nursing_home?.id ?? null,
                anesthetist: plan.team.anesthetist?.id ?? null,
                pediatrician: plan.team.pediatrician?.id ?? null,
                ot_assistant: plan.team.ot_assistant?.id ?? null,
              },
            }); }}>Edit plan</Button>
            <Button size="sm" disabled={mutation.isPending} onClick={() => { setCompletedDate(calendarDateValue(new Date())); setConfirmation({ plan, status: "completed" }); }}>Mark surgery completed</Button>
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setConfirmation({ plan, status: "cancelled" })}>Cancel surgery</Button>
          </>}
          {plan.status === "completed" && <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setConfirmation({ plan, status: "discharged" })}>Discharge from recovery</Button>}
        </div>
      </section>)}
      {plans.data.length === 0 && (
        <section className="flex flex-col items-center rounded-2xl border border-saivie-border bg-saivie-ivory px-5 py-5 text-center" data-testid="surgery-planning-empty-state">
          <svg
            viewBox="0 0 220 150"
            className="h-auto w-full max-w-[220px]"
            role="img"
            aria-labelledby="surgery-empty-title surgery-empty-description"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title id="surgery-empty-title">No surgery plan yet</title>
            <desc id="surgery-empty-description">A calm planning clipboard with a checked item and a small leafy branch.</desc>
            <ellipse cx="110" cy="132" rx="72" ry="7" fill="#E5EEE9" />
            <path d="M56 115 C47 102 49 91 57 84 C59 96 63 103 56 115 Z M56 115 C69 105 74 95 69 87 C66 99 61 106 56 115 Z" fill="#8BAF9F" />
            <rect x="47" y="115" width="19" height="13" rx="3" fill="#CFE2DC" />
            <rect x="77" y="20" width="83" height="102" rx="12" fill="#FFFFFC" stroke="#2D6A5F" strokeWidth="2.5" />
            <path d="M101 20v-3a8 8 0 0 1 8-8h19a8 8 0 0 1 8 8v3" fill="#CFE2DC" stroke="#2D6A5F" strokeWidth="2.5" />
            <path d="M77 43h83" stroke="#D8E6E0" strokeWidth="2" />
            <rect x="91" y="56" width="14" height="14" rx="4" fill="#E3EFEA" stroke="#6E9A8B" strokeWidth="1.5" />
            <path d="m94 63 3 3 5-6" fill="none" stroke="#2D6A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M113 61h30" stroke="#A8BEB5" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="98" cy="85" r="7" fill="#FFF2D6" stroke="#C58B45" strokeWidth="1.5" />
            <path d="M113 85h23" stroke="#A8BEB5" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M95 101h42" stroke="#D5E2DC" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="174" cy="42" r="15" fill="#F7E5EF" />
            <path d="M174 35v14M167 42h14" stroke="#8A5871" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="61" cy="48" r="3" fill="#9FB8AE" />
            <circle cx="180" cy="102" r="3" fill="#9FB8AE" />
          </svg>
          <h3 className="mt-2 font-serif text-lg font-semibold text-saivie-plum">No surgery plan yet</h3>
          <p className="mt-1 max-w-sm text-sm text-saivie-plum/75">
            When a procedure is planned, add its date and surgeon below to start the care journey.
          </p>
        </section>
      )}
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
        <fieldset className="space-y-3 rounded-xl border p-3" disabled={mutation.isPending || !network.isSuccess}>
          <legend className="px-1 text-sm font-semibold">Team and place (optional)</legend>
          <p className="text-xs text-muted-foreground">Nothing is assigned automatically. Add contacts using Manage care network above.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {surgeryCareRoles.map((role) => {
              const assigned = editingPlan?.team[role];
              const options = (network.data ?? []).filter((member) => member.role === role && (member.active || member.id === assigned?.id));
              if (assigned && !options.some((member) => member.id === assigned.id)) options.push(assigned);
              return <div key={role} className="space-y-1">
                <Label htmlFor={`surgery-${role}`}>{surgeryCareRoleLabels[role]}</Label>
                <select id={`surgery-${role}`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={details.assignments[role] ?? ""} onChange={(event) =>
                  setDetails((current) => ({ ...current, assignments: { ...current.assignments, [role]: event.target.value ? Number(event.target.value) : null } }))
                }>
                  <option value="">Not assigned</option>
                  {options.map((member) => <option key={member.id} value={member.id}>{member.name}{member.active ? "" : " (Archived)"}{member.affiliation ? ` · ${member.affiliation}` : ""}</option>)}
                </select>
                {network.isSuccess && options.length === 0 && <p className="text-xs text-muted-foreground">No active contacts for this role.</p>}
              </div>;
            })}
          </div>
        </fieldset>
        {network.isPending && <p role="status">Loading team contacts...</p>}
        {network.isError && <p role="alert">{network.error.message} <Button type="button" variant="link" onClick={() => void network.refetch()}>Retry team contacts</Button></p>}
        <div className="space-y-1"><Label htmlFor="surgery-notes">Notes</Label><Textarea id="surgery-notes" maxLength={5000} value={details.notes} onChange={(event) => set("notes", event.target.value)} /></div>
        <div className="flex gap-2"><Button disabled={mutation.isPending || !providers.isSuccess || !network.isSuccess || !details.procedureName.trim() || !details.plannedDate || !details.surgeonId}>{mutation.isPending ? "Saving..." : editing ? "Save changes" : "Save surgery plan"}</Button>{editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setDetails(emptyDetails); }}>Stop editing</Button>}</div>
      </form>}
    </>}
  </div>;
}

export function SurgeryPlanningButton({ patient, children }: { patient?: Patient; children?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const patients = useQuery({
    queryKey: ["/api/patients", "surgery-picker"],
    queryFn: async ({ signal }) => z.array(z.object({ id: z.number().int().positive(), name: z.string() })).parse(await receptionRequest("/api/patients", { signal })),
    enabled: open && !patient,
  });
  const selected = patient ?? patients.data?.find((item) => String(item.id) === selectedId);
  return <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children ?? <Button variant="outline" size="sm">Surgery planning</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Surgery planning{selected ? ` · ${selected.name}` : ""}</DialogTitle><DialogDescription>Doctor-controlled surgery plans and recovery enrollment.</DialogDescription></DialogHeader>
      <details className="rounded-xl border p-3">
        <summary className="cursor-pointer text-sm font-semibold text-saivie-teal">Manage care network</summary>
        <div className="mt-3"><SurgeryCareNetwork /></div>
      </details>
      {!patient && <div className="space-y-2"><Label htmlFor="surgery-patient">Patient</Label><select id="surgery-patient" className="h-10 w-full rounded-md border bg-background px-3" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Select patient</option>{patients.data?.map((item) => <option key={item.id} value={item.id}>{item.name} · #{item.id}</option>)}</select>{patients.isPending && <p role="status">Loading patients...</p>}{patients.isError && <p role="alert">{patients.error.message} <Button variant="link" onClick={() => void patients.refetch()}>Retry</Button></p>}</div>}
      {selected && <SurgeryPlanner key={selected.id} patient={selected} />}
    </DialogContent></Dialog>
  </>;
}
