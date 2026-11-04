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
import { pregnancyDatingFromLmp } from "@/lib/pregnancyDating";
import { appointmentLabel } from "@/lib/visitTrail";
import { DeliveryForm, DeliveryRecords, refreshDeliveryQueries } from "@/components/DeliveryRecords";
import { isCaesareanProcedure } from "../../../../lib/db/src/delivery";

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
type Patient = { id: number; name: string; lmp?: string | null };
type Details = { procedureName: string; plannedDate: string; surgeonId: string; notes: string; assignments: SurgeryAssignments };
const emptyDetails: Details = { procedureName: "", plannedDate: "", surgeonId: "", notes: "", assignments: emptySurgeryAssignments };
const statusLabels = { planned: "Planned", completed: "In recovery", cancelled: "Cancelled", discharged: "Discharged" };

type Workspace = {
  pregnancy: boolean;
  onConsultation: () => void;
  onRecord: () => void;
  onInvestigations: () => void;
  onVitals: () => void;
  appointments: Record<string, unknown>[];
  appointmentsReady: boolean;
};

function ReadinessChecklist({ workspace }: { workspace: Workspace }) {
  const rows = [
    { label: "Blood group & Rh", action: "Record", onClick: workspace.onRecord },
    { label: "Hemoglobin / CBC", action: "Order", onClick: workspace.onInvestigations },
    { label: "Allergies", action: "Record", onClick: workspace.onRecord },
    { label: workspace.pregnancy ? "Previous delivery details" : "Previous procedure details", action: "Record", onClick: workspace.onRecord },
    { label: "Vitals", action: "Record", onClick: workspace.onVitals },
    { label: "Anaesthesia review", action: "Request" },
    { label: "Blood availability", action: "Request" },
    { label: "Consent form", action: "Generate" },
    { label: "Fasting instructions", action: "Send" },
  ];
  return <section className="rounded-2xl border border-saivie-border bg-white p-4" aria-label="Readiness checklist">
    <h3 className="font-serif font-semibold text-saivie-teal">Readiness checklist</h3>
    <p className="mt-1 text-[11px] text-muted-foreground">Not assessed · automatic readiness tracking is not available.</p>
    <ul className="mt-3 divide-y divide-saivie-border">{rows.map((row) => <li key={row.label} className="flex items-center gap-2 py-3">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-saivie-teal/40" aria-hidden="true" />
      <div className="min-w-0 flex-1"><p className="text-xs font-medium">{row.label}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{row.onClick ? "Review in patient record" : "Not available yet"}</p></div>
      <Button type="button" size="sm" variant="outline" className="h-7 rounded-full px-3 text-[10px]" disabled={!row.onClick} onClick={row.onClick}>{row.action}</Button>
    </li>)}</ul>
  </section>;
}

function SurgeryPlanner({ patient, workspace }: { patient: Patient; workspace?: Workspace }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const network = useSurgeryCareNetwork();
  const [details, setDetails] = useState(emptyDetails);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<{ plan: Plan; status: "completed" | "cancelled" | "discharged" } | null>(null);
  const [completedDate, setCompletedDate] = useState(() => calendarDateValue(new Date()));
  const [recordBirth, setRecordBirth] = useState(false);
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
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/patients", patient.id, "surgeries"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/postop/patients"] });
      setEditing(null); setDetails(emptyDetails); setConfirmation(null);
      await refreshDeliveryQueries(queryClient, patient.id);
      toast({ title: "Surgery workflow updated" });
    },
    onError: (error: Error) => toast({ title: "Could not update surgery", description: error.message, variant: "destructive" }),
  });
  const openPlan = plans.data?.find((plan) => ["planned", "completed"].includes(plan.status));
  const editingPlan = plans.data?.find((plan) => plan.id === editing);
  const set = (key: Exclude<keyof Details, "assignments">, value: string) => setDetails((current) => ({ ...current, [key]: value }));
  const date = details.plannedDate || openPlan?.plannedDate || "";
  const lmp = workspace?.pregnancy ? patient.lmp?.slice(0, 10) : undefined;
  const dating = lmp && date ? pregnancyDatingFromLmp(lmp, date) : null;
  const editable = (!openPlan || editing !== null) && !confirmation && plans.isSuccess;
  const upcoming = workspace?.appointments.filter((item) => appointmentLabel(item, calendarDateValue(new Date())).startsWith("Upcoming booking")) || [];
  const sectionClass = workspace ? "space-y-3 rounded-2xl border border-saivie-border bg-white p-4" : "space-y-3";
  return <div className={workspace ? "grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_230px]" : ""} data-testid="surgery-planner">
    <div className="min-w-0 space-y-4">
    {!workspace && <p className="rounded-xl bg-saivie-sage/50 p-3 text-sm">Plan surgery → Mark completed → Recovery → Discharge. Patients appear in recovery only after the doctor confirms surgery completion.</p>}
    {plans.isPending && <p role="status">Loading surgery history...</p>}
    {plans.isError && <p role="alert">{plans.error.message} <Button variant="link" onClick={() => void plans.refetch()}>Retry</Button></p>}
    {plans.isSuccess && <>
      {plans.data.length > 0 && <details open={openPlan && !editing ? true : undefined} className="rounded-2xl border border-saivie-border bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-saivie-teal">Saved plans &amp; recovery</summary>
      <div className="mt-3 space-y-3">{plans.data.map((plan) => <section key={plan.id} className="space-y-2 rounded-xl border p-4" data-testid={`surgery-plan-${plan.id}`}>
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
            <Button size="sm" disabled={mutation.isPending} onClick={() => { setCompletedDate(calendarDateValue(new Date())); setRecordBirth(isCaesareanProcedure(plan.procedureName)); setConfirmation({ plan, status: "completed" }); }}>Mark surgery completed</Button>
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setConfirmation({ plan, status: "cancelled" })}>Cancel surgery</Button>
          </>}
          {plan.status === "completed" && <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setConfirmation({ plan, status: "discharged" })}>Discharge from recovery</Button>}
        </div>
      </section>)}</div></details>}
      {!workspace && plans.data.length === 0 && (
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
      {confirmation?.status === "completed" && <div className="space-y-2 rounded-xl border p-3">
        <Label className="flex items-center gap-2"><input type="checkbox" checked={recordBirth} disabled={mutation.isPending} onChange={(event) => setRecordBirth(event.target.checked)} />Delivery occurred: record baby outcomes and start postpartum care</Label>
        <p className="text-xs text-muted-foreground">For a caesarean, delivery details are required. If already recorded separately for the same date, untick to link that record. For other procedures, only select this if delivery actually occurred.</p>
      </div>}
      {confirmation?.status === "completed" && recordBirth && <DeliveryForm key={confirmation.plan.id}
        patientId={patient.id} initialDate={completedDate} forcedMode={isCaesareanProcedure(confirmation.plan.procedureName) ? "Caesarean" : undefined}
        pending={mutation.isPending} onCancel={() => setConfirmation(null)}
        onSubmit={(delivery) => mutation.mutate({ id: confirmation.plan.id, body: { status: "completed", completedDate: delivery.deliveryDate, delivery } })} />}
      {confirmation && !(confirmation.status === "completed" && recordBirth) && <form aria-label="Confirm surgery status change" className="space-y-3 rounded-xl border border-saivie-blush bg-saivie-surface-blush p-4" onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ id: confirmation.plan.id, body: confirmation.status === "completed" ? { status: "completed", completedDate } : { status: confirmation.status } });
      }}>
        <h3 className="font-semibold">{confirmation.status === "completed" ? "Confirm surgery has been performed" : confirmation.status === "cancelled" ? "Cancel this surgery plan?" : "Discharge this patient from recovery?"}</h3>
        <p className="text-sm">{confirmation.plan.procedureName} · {patient.name}. {confirmation.status === "completed" ? "This will enroll the patient in active recovery." : "The patient will not appear in the active recovery list."}</p>
        {confirmation.status === "completed" && <div className="space-y-1"><Label htmlFor="surgery-completed-date">Actual surgery date</Label><DateInput id="surgery-completed-date" required value={completedDate} max={calendarDateValue(new Date())} onValueChange={setCompletedDate} /></div>}
        <div className="flex gap-2"><Button type="submit" disabled={mutation.isPending || (confirmation.status === "completed" && !completedDate)}>Confirm {confirmation.status === "completed" ? "completion" : confirmation.status === "cancelled" ? "cancellation" : "discharge"}</Button><Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => setConfirmation(null)}>Back</Button></div>
      </form>}
      {(!openPlan || editing !== null) && !confirmation && <form id={`surgery-plan-form-${patient.id}`} className={workspace ? "space-y-4" : "space-y-3 rounded-xl border p-4"} onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ id: editing ?? undefined, body: { ...details, surgeonId: Number(details.surgeonId) } });
      }}>
        {workspace && <section className="rounded-2xl border border-saivie-border bg-white p-4">
          <h3 className="font-serif font-semibold text-saivie-teal">What are you planning?</h3>
          <p className="mt-1 text-[10px] text-muted-foreground">Choose a starting procedure, then complete the details below.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[...(workspace.pregnancy ? [{ name: "Delivery", procedure: "Planned caesarean", description: "Caesarean, induction or birth plan" }] : []),
              { name: "Gynae surgery", procedure: "Gynae surgery", description: "Cerclage, D&C, myomectomy, laparoscopy..." },
              { name: "Other procedure", procedure: "Other procedure", description: "Anything not listed" }].map((choice) => <button key={choice.name} type="button"
                aria-pressed={choice.name === "Delivery" ? /caesarean|induction|vaginal birth/i.test(details.procedureName) : details.procedureName === choice.procedure}
                onClick={() => set("procedureName", choice.procedure)}
                className="rounded-xl border border-saivie-border p-3 text-left text-xs aria-pressed:border-saivie-teal aria-pressed:bg-saivie-surface-muted">
                <span className="font-semibold">{choice.name}</span><span className="mt-1 block text-[10px] text-muted-foreground">{choice.description}</span>
              </button>)}
          </div>
        </section>}
        <div className={workspace ? "grid items-start gap-4 lg:grid-cols-2" : ""}>
        <div className="min-w-0 space-y-4">
        {!workspace && <h3 className="font-semibold">{editing ? "Edit surgery plan" : "Plan surgery"}</h3>}
        {workspace?.pregnancy && /caesarean|induction|vaginal birth/i.test(details.procedureName) && <>
          <fieldset className={sectionClass}><legend className="px-1 font-serif text-sm font-semibold text-saivie-teal">Mode of delivery</legend><div className="mt-2 grid grid-cols-3 gap-1">
            {["Planned caesarean", "Induction of labour", "Vaginal birth plan"].map((mode) => <Button key={mode} type="button" size="sm" variant={details.procedureName === mode ? "default" : "outline"} className="h-auto whitespace-normal rounded-xl px-2 py-2 text-[10px]" aria-pressed={details.procedureName === mode} onClick={() => set("procedureName", mode)}>{mode}</Button>)}
          </div></fieldset>
          <fieldset disabled className={sectionClass}><legend className="px-1 font-serif text-sm font-semibold text-saivie-teal">Indication</legend><p className="mt-1 text-[10px] text-muted-foreground">Structured indications are not available yet. Record the clinical rationale in Notes.</p><div className="mt-2 flex flex-wrap gap-1">
            {["Previous caesarean", "Breech / malpresentation", "Placenta praevia", "Fetal concern", "Maternal request", "Medical condition", "+ Other"].map((label) => <Button key={label} type="button" variant="outline" className="h-7 rounded-full px-2 text-[10px]">{label}</Button>)}
          </div></fieldset>
        </>}
        <div className={sectionClass}>
        {workspace && <h3 className="font-serif text-sm font-semibold text-saivie-teal">Date and procedure</h3>}
        <div className="space-y-1"><Label htmlFor="surgery-planned-date">Planned surgery date</Label><DateInput id="surgery-planned-date" required value={details.plannedDate} onValueChange={(value) => set("plannedDate", value)} /></div>
        {workspace?.pregnancy && <div>
          <p className="text-[10px] text-muted-foreground">LMP estimates only, not a recommendation for delivery timing. Confirm dating and timing clinically.</p>
          {lmp && pregnancyDatingFromLmp(lmp, calendarDateValue(new Date())) && <div className="mt-2 flex flex-wrap gap-1">{[37, 38, 39, 40].map((week) => {
            const value = new Date(Date.parse(`${lmp}T00:00:00Z`) + week * 7 * 86400000).toISOString().slice(0, 10);
            return <Button key={week} type="button" size="sm" variant={details.plannedDate === value ? "default" : "outline"} className="h-7 rounded-full text-[10px]" onClick={() => set("plannedDate", value)}>{value} · {week}w 0d</Button>;
          })}</div>}
          <p className="mt-2 text-xs text-saivie-teal">{dating ? `${dating.pog} at planned date · EDD ${dating.dueDate} (LMP estimate)` : "Valid LMP and planned date required for a gestation estimate."}</p>
        </div>}
        <div className="space-y-1"><Label htmlFor="surgery-procedure">Procedure name</Label><Input id="surgery-procedure" required maxLength={200} value={details.procedureName} onChange={(event) => set("procedureName", event.target.value)} /></div>
        </div>
        <div className={sectionClass}>
        <div className="space-y-1"><Label htmlFor="surgery-surgeon">Surgeon</Label><select id="surgery-surgeon" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={details.surgeonId} onChange={(event) => set("surgeonId", event.target.value)}><option value="">Select surgeon</option>{providers.data?.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></div>
        {providers.isError && <p role="alert">{providers.error.message} <Button type="button" variant="link" onClick={() => void providers.refetch()}>Retry surgeons</Button></p>}
        <fieldset className="space-y-3 rounded-xl border p-3" disabled={mutation.isPending || !network.isSuccess}>
          <legend className="px-1 text-sm font-semibold">Team and place (optional)</legend>
          <p className="text-xs text-muted-foreground">Nothing is assigned automatically. Add contacts using Manage care network.</p>
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
        </div>
        </div>
        {workspace && <ReadinessChecklist workspace={workspace} />}
        </div>
      </form>}
      {workspace && !editable && <ReadinessChecklist workspace={workspace} />}
    </>}
    </div>
    {workspace && <aside className="space-y-3 xl:sticky xl:top-4" aria-label="Plan summary">
      <section className="space-y-3 rounded-2xl border border-saivie-border bg-white p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Plan summary</h3>
        <p className="text-sm font-semibold">{details.procedureName || openPlan?.procedureName || "Select a procedure"}</p>
        <p className="text-xs">{date || "Date not selected"}</p>
        {dating && <p className="text-[10px] text-muted-foreground">{dating.pog} · EDD {dating.dueDate} by LMP</p>}
        <p className="rounded-xl bg-saivie-surface-muted p-3 text-xs">Readiness not assessed. Saving a plan does not confirm theatre availability or clinical clearance.</p>
        <Button className="w-full rounded-full text-xs" disabled>Request theatre slot</Button>
        <p className="text-[10px] text-muted-foreground">Theatre requests are not available yet.</p>
        {editable && <Button type="submit" form={`surgery-plan-form-${patient.id}`} variant="outline" className="w-full rounded-full text-xs" disabled={mutation.isPending || !providers.isSuccess || !network.isSuccess || !details.procedureName.trim() || !details.plannedDate || !details.surgeonId}>{editing ? "Save changes" : "Save surgery plan"}</Button>}
        <Button variant="outline" className="w-full rounded-full text-xs" disabled>Save as draft</Button>
        <p className="text-[10px] text-muted-foreground">Draft saving is not available. Unsaved changes are lost when you leave this page.</p>
      </section>
      <section className="rounded-2xl border border-saivie-border bg-white p-4"><h3 className="text-[10px] font-semibold uppercase text-muted-foreground">Already booked</h3>
        {!workspace.appointmentsReady ? <p className="mt-2 text-xs">Appointment records unavailable or loading.</p> : <div className="mt-2 flex flex-wrap gap-1">
          {upcoming.map((item) => <span key={String(item.id)} className="rounded-full border px-2 py-1 text-[10px]">{String(item.date)} · {String(item.type || "Appointment")}</span>)}
          {!upcoming.length && <p className="text-xs text-muted-foreground">No upcoming bookings recorded.</p>}
        </div>}
      </section>
    </aside>}
  </div>;
}

export function SurgeryPlanningPage({ patient, ...workspace }: { patient: Patient } & Workspace) {
  return <section className="min-h-0 flex-1 overflow-y-auto bg-[#f4f7f5] p-3 sm:p-5" data-testid="surgery-planning-page">
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-center gap-3"><Button variant="outline" size="sm" className="rounded-full" onClick={workspace.onConsultation}>← Consultation</Button>
        <div><h2 className="font-serif text-xl font-semibold text-saivie-teal">Surgery &amp; delivery planning</h2><p className="text-xs text-muted-foreground">{patient.name} · {workspace.pregnancy ? "Pregnancy care" : "Surgery planning"}</p></div>
      </header>
      <SurgeryPlanner key={patient.id} patient={patient} workspace={workspace} />
      <DeliveryRecords key={`delivery-${patient.id}`} patientId={patient.id} />
      <details className="rounded-2xl border border-saivie-border bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-saivie-teal">Manage care network</summary><div className="mt-3"><SurgeryCareNetwork /></div></details>
    </div>
  </section>;
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
      {selected && <><SurgeryPlanner key={selected.id} patient={selected} /><DeliveryRecords key={`delivery-${selected.id}`} patientId={selected.id} /></>}
    </DialogContent></Dialog>
  </>;
}
