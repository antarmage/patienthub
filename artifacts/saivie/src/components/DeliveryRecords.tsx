import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import {
  babyAge, babyUpdateSchema, deliveryInputSchema, deliveryRecordSchema, deliveryToday,
  pregnancyEndInputSchema, type PregnancyEndInput, type Baby, type DeliveryInput, type DeliveryRecord,
} from "../../../../lib/db/src/delivery";
import type { PregnancyEpisode } from "../../../../lib/db/src/pregnancy-episodes";
import { EmptyCradleIllustration, RecordScenarioIllustration } from "@/components/RecordScenarioIllustration";
import { Baby as BabyIcon, Plus } from "lucide-react";
import { pregnancyGestation, readPregnancyEpisodes } from "@/lib/pregnancyOverview";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";

export async function refreshDeliveryQueries(client: QueryClient, patientId: number) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ["/api/patients"] }),
    client.invalidateQueries({ queryKey: [`/api/patients/${patientId}/pregnancy-episodes`] }),
    client.invalidateQueries({ queryKey: ["/api/postop/patients"] }),
    client.invalidateQueries({ predicate: (query) => query.queryKey.some((key) =>
      typeof key === "string" && /follow-up|dashboard|by-category|analytics|vaccination-reminders/.test(key)) }),
  ]);
}

function useDeliveryEpisodes(patientId: number) {
  return useQuery({
    queryKey: ["/api/patients", patientId, "pregnancy-episodes"],
    queryFn: async ({ signal }) => readPregnancyEpisodes(await receptionRequest(`/api/patients/${patientId}/pregnancy-episodes`, { signal }), patientId),
    refetchInterval: 30_000,
  });
}

type BabyDraft = Omit<Baby, "outcome"> & { outcome: Baby["outcome"] | "" };
const newBaby = (date: string): BabyDraft => ({ name: "", birthDate: date, birthTime: null, outcome: "", deathDate: null });

export function BabyFields({ baby, index, onChange, editing = false, disabled = false }: {
  baby: BabyDraft; index: number; onChange: (baby: BabyDraft) => void; editing?: boolean; disabled?: boolean;
}) {
  const prefix = useId();
  return <fieldset disabled={disabled} className="space-y-3 rounded-xl border p-3">
    <legend className="px-1 text-sm font-semibold">Baby {index + 1}</legend>
    <div><Label htmlFor={`${prefix}-name`}>Name (optional)</Label><Input id={`${prefix}-name`} maxLength={100} value={baby.name} onChange={(event) => onChange({ ...baby, name: event.target.value })} /></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor={`${prefix}-date`}>Birth date</Label><DateInput id={`${prefix}-date`} required disabled={editing} value={baby.birthDate} max={deliveryToday()} onValueChange={(birthDate) => onChange({ ...baby, birthDate })} /></div>
      <div><Label htmlFor={`${prefix}-time`}>Birth time (optional, India time)</Label><Input id={`${prefix}-time`} type="time" disabled={editing} value={baby.birthTime || ""} onChange={(event) => onChange({ ...baby, birthTime: event.target.value || null })} /></div>
    </div>
    <div><Label htmlFor={`${prefix}-outcome`}>Outcome at birth</Label><select id={`${prefix}-outcome`} required disabled={editing} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={baby.outcome} onChange={(event) => {
      const outcome = event.target.value;
      if (outcome === "" || outcome === "Live birth" || outcome === "Stillbirth") onChange({ ...baby, outcome, deathDate: outcome === "Live birth" ? baby.deathDate : null });
    }}><option value="">Select outcome</option><option>Live birth</option><option>Stillbirth</option></select></div>
    {baby.outcome === "Live birth" && <div><Label htmlFor={`${prefix}-death`}>Subsequent death date (only if applicable)</Label><DateInput id={`${prefix}-death`} value={baby.deathDate || ""} min={baby.birthDate} max={deliveryToday()} onValueChange={(value) => onChange({ ...baby, deathDate: value || null })} /></div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor={`${prefix}-sex`}>Sex at birth</Label><select id={`${prefix}-sex`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={baby.sex || "Not recorded"} onChange={(event) => {
        const sex = event.target.value;
        if (sex === "Female" || sex === "Male" || sex === "Indeterminate" || sex === "Not recorded") onChange({ ...baby, sex });
      }}>{["Not recorded", "Female", "Male", "Indeterminate"].map((sex) => <option key={sex}>{sex}</option>)}</select></div>
      <div><Label htmlFor={`${prefix}-weight`}>Birth weight (grams, optional)</Label><Input id={`${prefix}-weight`} type="number" min={100} max={10000} step={1} value={baby.birthWeightGrams ?? ""} onChange={(event) => onChange({ ...baby, birthWeightGrams: event.target.value === "" ? null : Number(event.target.value) })} /></div>
    </div>
  </fieldset>;
}

export function DeliveryForm({ patientId, initialDate = deliveryToday(), forcedMode, pending, onSubmit, onCancel, episode }: {
  patientId: number; initialDate?: string; forcedMode?: "Caesarean"; pending: boolean;
  episode?: PregnancyEpisode;
  onSubmit: (input: DeliveryInput) => void; onCancel: () => void;
}) {
  const episodes = useDeliveryEpisodes(patientId);
  const formId = useId();
  const current = episode || episodes.data?.find((episode) => episode.details.status === "current");
  const historical = current?.details.status === "past";
  const [deliveryDate, setDeliveryDate] = useState(initialDate);
  const [deliveryMode, setDeliveryMode] = useState<string>(forcedMode || (episode?.details.deliveryMode !== "Not recorded" ? episode?.details.deliveryMode : "") || "");
  const [babies, setBabies] = useState<BabyDraft[]>(() => Array.from({ length: episode?.details.fetusCount || 1 }, () => newBaby(initialDate)));
  const [reviewDate, setReviewDate] = useState("");
  const [error, setError] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState("");
  const [complications, setComplications] = useState("");
  return <form className="space-y-3 rounded-xl border border-saivie-blush bg-white p-4" aria-label="Record delivery and babies" onSubmit={(event) => {
    event.preventDefault();
    const parsed = deliveryInputSchema.safeParse({
      episodeId: current?.id, episodeVersion: current?.version, deliveryDate, deliveryMode, babies,
      postpartumReviewDate: historical ? null : reviewDate || null, deliveryPlace, complications,
    });
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")); return; }
    setError(""); onSubmit(parsed.data);
  }}>
    <h3 className="font-semibold">Confirm delivery and baby outcomes</h3>
    <p className="text-sm">{historical ? "Saving records this past pregnancy's delivery only. Current pregnancy, care status and review date remain unchanged." : "Saving ends this pregnancy and starts postpartum care. Pregnancy history is preserved; surgical recovery remains separate."}</p>
    {episodes.isPending && <p role="status">Loading pregnancy...</p>}
    {episodes.isError && <p role="alert">{episodes.error.message} <Button type="button" variant="link" onClick={() => void episodes.refetch()}>Retry</Button></p>}
    {episodes.isSuccess && !current && <p role="alert">No current pregnancy episode. Create or review it in Pregnancy summary before recording delivery.</p>}
    {current && <p className="text-sm">Pregnancy {current.details.number}{current.details.fetusCount ? ` · ${current.details.fetusCount} fetus(es) recorded` : ""}</p>}
    <fieldset disabled={pending} className="space-y-3">
      <div><Label htmlFor={`${formId}-date`}>Delivery completion date (last baby born)</Label><DateInput id={`${formId}-date`} required value={deliveryDate} max={deliveryToday()} onValueChange={setDeliveryDate} /></div>
      <div><Label htmlFor={`${formId}-mode`}>Delivery mode</Label><select id={`${formId}-mode`} required disabled={!!forcedMode} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={deliveryMode} onChange={(event) => setDeliveryMode(event.target.value)}><option value="">Select delivery mode</option>{["Vaginal", "Caesarean", "Assisted vaginal", "Other"].map((mode) => <option key={mode}>{mode}</option>)}</select></div>
      <div><Label htmlFor={`${formId}-place`}>Delivery place (optional)</Label><Input id={`${formId}-place`} maxLength={300} value={deliveryPlace} onChange={(event) => setDeliveryPlace(event.target.value)} /></div>
      <div><Label htmlFor={`${formId}-complications`}>Complications (optional; leave blank if unknown)</Label><Input id={`${formId}-complications`} maxLength={2000} value={complications} onChange={(event) => setComplications(event.target.value)} /></div>
      {babies.map((baby, index) => <div key={index}><BabyFields baby={baby} index={index} onChange={(value) => setBabies((rows) => rows.map((row, i) => i === index ? value : row))} />
        {babies.length > 1 && <Button type="button" variant="ghost" onClick={() => setBabies((rows) => rows.filter((_, i) => i !== index))}>Remove baby {index + 1}</Button>}</div>)}
      <Button type="button" variant="outline" disabled={babies.length >= 10} onClick={() => setBabies((rows) => [...rows, newBaby(deliveryDate)])}>Add another baby</Button>
      {!historical && <div><Label htmlFor={`${formId}-review`}>Postpartum review date (optional)</Label><DateInput id={`${formId}-review`} value={reviewDate} min={deliveryDate} onValueChange={setReviewDate} /><p className="mt-1 text-xs text-muted-foreground">Replaces the antenatal next-review date. No appointment or message is sent automatically. Leave blank if not yet decided.</p></div>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={pending || !current || !episodes.isSuccess}>{pending ? "Saving..." : forcedMode ? "Confirm caesarean delivery & completion" : "Confirm delivery"}</Button><Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>Back</Button></div>
  </form>;
}

function BabyRecordEditor({ record, pending, onSave, onCancel }: {
  record: DeliveryRecord; pending: boolean; onSave: (babies: Baby[]) => void; onCancel: () => void;
}) {
  const [babies, setBabies] = useState<BabyDraft[]>(record.babies);
  const [error, setError] = useState("");
  return <form className="space-y-3" aria-label="Update baby records" onSubmit={(event) => {
    event.preventDefault();
    const parsed = babyUpdateSchema.safeParse({ version: record.version, babies });
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join("; ")); return; }
    setError(""); onSave(parsed.data.babies);
  }}>
    <p className="text-xs text-muted-foreground">Existing birth dates, times, outcomes and baby order remain fixed. Update names, sex, birth weight or subsequent death dates, or add a previously unrecorded baby.</p>
    {babies.map((baby, index) => <div key={index}><BabyFields editing={index < record.babies.length} disabled={pending} baby={baby} index={index} onChange={(value) =>
      setBabies((rows) => rows.map((row, i) => i === index ? value : row))} />
      {index >= record.babies.length && <Button disabled={pending} type="button" variant="ghost" onClick={() => setBabies((rows) => rows.filter((_, i) => i !== index))}>Remove unsaved baby {index + 1}</Button>}</div>)}
    <Button type="button" variant="outline" disabled={pending || babies.length >= 10} onClick={() => setBabies((rows) => [...rows, newBaby(record.deliveryDate)])}>Add baby</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={pending} type="submit">Save baby updates</Button><Button disabled={pending} type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
  </form>;
}

function PregnancyOutcomeForm({ episode, pending, onSubmit, onCancel }: {
  episode: PregnancyEpisode; pending: boolean; onSubmit: (input: PregnancyEndInput) => void; onCancel: () => void;
}) {
  const id = useId();
  const [outcome, setOutcome] = useState("Miscarriage");
  const [endDate, setEndDate] = useState(episode.details.endDate || "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  return <form className="space-y-3 rounded-xl border p-4" aria-label="Record pregnancy outcome" onSubmit={(event) => {
    event.preventDefault();
    const parsed = pregnancyEndInputSchema.safeParse({ episodeId: episode.id, episodeVersion: episode.version, outcome, endDate: endDate || null, notes });
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join("; ")); return; }
    setError(""); onSubmit(parsed.data);
  }}>
    <p className="text-sm">{episode.details.status === "current" ? "A confirmed non-birth outcome closes this pregnancy and ends antenatal reminders. It does not start postpartum care." : "This updates the past pregnancy only. Current care remains unchanged."}</p>
    <fieldset disabled={pending} className="space-y-3">
      <div><Label htmlFor={`${id}-outcome`}>Pregnancy outcome</Label><select id={`${id}-outcome`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
        {["Miscarriage", "Termination", "Other", ...(episode.details.status === "past" ? ["Not recorded"] : [])].map((value) => <option key={value} value={value}>{value === "Not recorded" ? "Not known" : value}</option>)}
      </select></div>
      <div><Label htmlFor={`${id}-date`}>Pregnancy end date{outcome === "Not recorded" ? " (if known)" : ""}</Label><DateInput id={`${id}-date`} value={endDate} required={outcome !== "Not recorded"} max={deliveryToday()} onValueChange={setEndDate} /></div>
      <div><Label htmlFor={`${id}-notes`}>Notes (optional)</Label><Input id={`${id}-notes`} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={pending} type="submit">Save outcome</Button><Button disabled={pending} type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>
  </form>;
}

export function DeliveryRecords({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient();
  const episodes = useDeliveryEpisodes(patientId);
  const [creating, setCreating] = useState<PregnancyEpisode | null>(null);
  const [outcomeEpisode, setOutcomeEpisode] = useState<PregnancyEpisode | null>(null);
  const [editing, setEditing] = useState<DeliveryRecord | null>(null);
  const records = useQuery({
    queryKey: ["/api/patients", patientId, "deliveries"],
    queryFn: async ({ signal }) => z.array(deliveryRecordSchema).parse(await receptionRequest(`/api/patients/${patientId}/deliveries`, { signal })),
    refetchInterval: 60_000,
  });
  const mutation = useMutation({
    mutationFn: async ({ record, babies, delivery }: { record?: DeliveryRecord; babies?: Baby[]; delivery?: DeliveryInput }) =>
      deliveryRecordSchema.parse(await receptionRequest(`/api/patients/${patientId}/deliveries${record ? `/${record.id}` : ""}`, {
        method: record ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record ? { version: record.version, babies } : delivery),
      })),
    onSuccess: async () => { setCreating(null); setEditing(null); await refreshDeliveryQueries(queryClient, patientId); },
  });
  const outcomeMutation = useMutation({
    mutationFn: (input: PregnancyEndInput) => receptionRequest(`/api/patients/${patientId}/pregnancy-outcome`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    }),
    onSuccess: async () => { setOutcomeEpisode(null); await refreshDeliveryQueries(queryClient, patientId); },
  });
  const busy = mutation.isPending || outcomeMutation.isPending;
  return <section className="space-y-4 rounded-2xl bg-[#f4f7f5] p-3 sm:p-5" aria-label="Delivery and baby records">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-serif text-xl font-semibold text-saivie-teal">Delivery &amp; babies</h3>
      <p className="text-xs text-muted-foreground">Each baby stays linked to the pregnancy. Age is calculated from birth date.</p></div>
      <span className="rounded-full border border-saivie-border px-3 py-1 text-xs">Vaccines · not included yet</span></div>
    {(records.isPending || episodes.isPending) && <p role="status">Loading delivery records...</p>}
    {records.isError && <p role="alert">{records.error.message} <Button variant="link" onClick={() => void records.refetch()}>Retry</Button></p>}
    {episodes.isError && <p role="alert">{episodes.error.message} <Button variant="link" onClick={() => void episodes.refetch()}>Retry pregnancy</Button></p>}
    {records.isSuccess && episodes.isSuccess && [...episodes.data].sort((a, b) => b.details.number - a.details.number).map((episode) => {
      const record = records.data.find((item) => item.episodeId === episode.id);
      const current = episode.details.status === "current";
      const gestation = current ? pregnancyGestation(episode.details) : null;
      const canDeliver = !["Miscarriage", "Termination"].includes(episode.details.outcome);
      return <section key={episode.id} className="space-y-4 rounded-2xl border border-saivie-border bg-white p-4 sm:p-6" aria-label={`Pregnancy ${episode.details.number} delivery`}>
        <div className="flex flex-wrap items-center gap-2"><h4 className="font-serif text-lg font-semibold text-saivie-teal">Pregnancy {episode.details.number}</h4>
          <span className="rounded-full bg-[#e3efea] px-2 py-1 text-xs">{current ? "Current" : "Past"}{gestation ? ` · ${gestation.weeks}w ${gestation.days}d` : episode.details.startDate || episode.details.lmp ? ` · ${episode.details.startDate || episode.details.lmp}` : ""}{episode.details.endDate ? ` – ${episode.details.endDate}` : ""}</span></div>
        {record ? <>
          <p className="text-sm font-medium">{record.deliveryDate} · {record.deliveryMode} · {record.babies.length} {record.babies.length === 1 ? "baby" : "babies"}</p>
          <p className="text-xs">Place: {record.deliveryPlace || "Not recorded"} · Complications: {record.complications || "Not recorded"}</p>
          <p className="text-xs">Postpartum review: {record.postpartumReviewDate || "Not scheduled"}</p>
          <div className="space-y-2">{record.babies.map((baby, index) => <div key={index} className="flex items-start gap-3 rounded-xl border border-dashed border-[#cfe2dc] p-3">
            <BabyIcon className="mt-1 h-6 w-6 shrink-0 text-saivie-teal" aria-hidden="true" /><div className="min-w-0">
              <p className="break-words text-sm font-semibold">Baby {index + 1}{baby.name ? ` · ${baby.name}` : ""} · {baby.outcome}</p>
              <p className="text-xs">Born {baby.birthDate}{baby.birthTime ? ` ${baby.birthTime} IST` : ""} · {babyAge(baby)}</p>
              <p className="text-xs">{baby.sex || "Sex not recorded"} · {baby.birthWeightGrams != null ? `${baby.birthWeightGrams} g at birth` : "Birth weight not recorded"}</p>
            </div></div>)}</div>
          {editing?.id === record.id ? <BabyRecordEditor key={editing.version} record={editing} pending={busy} onSave={(babies) => mutation.mutate({ record: editing, babies })} onCancel={() => { setEditing(null); mutation.reset(); }} /> :
            <Button size="sm" variant="outline" disabled={busy || !!creating || !!outcomeEpisode} onClick={() => { mutation.reset(); setEditing(record); }}>Update baby records / Add baby</Button>}
        </> : <>
          <div className="grid items-center gap-5 sm:grid-cols-[minmax(180px,280px)_1fr]">
            <div className="mx-auto flex w-full max-w-[300px] items-end gap-2">
              <div className="min-w-0 flex-1"><RecordScenarioIllustration scenario="deliveries" pregnancy={current} decorative /></div>
              <div className="min-w-0 flex-1 pb-2"><EmptyCradleIllustration decorative /></div>
            </div>
            <div className="space-y-3"><h5 className="font-serif text-2xl font-semibold text-saivie-teal">{episode.details.outcome === "Not recorded" ? "No delivery recorded" : `Outcome: ${episode.details.outcome}`}</h5>
              <p className="text-sm text-muted-foreground">{current ? "Record the delivery once it has happened. Each baby you add stays linked to this pregnancy." : "Complete this pregnancy's outcome for a clear clinical history. Historical entries do not change current care."}</p>
              <div className="flex flex-wrap gap-2">
                {canDeliver && <Button disabled={busy || !!editing || !!creating || !!outcomeEpisode} onClick={() => { mutation.reset(); setCreating(episode); }}>{current ? "Record delivery" : "Record delivery / babies"}</Button>}
                {!["Live birth", "Stillbirth"].includes(episode.details.outcome) && <Button variant="outline" disabled={busy || !!editing || !!creating || !!outcomeEpisode} onClick={() => { outcomeMutation.reset(); setOutcomeEpisode(episode); }}>{current ? "Record another outcome" : "Record outcome / Not known"}</Button>}
              </div></div>
          </div>
          {canDeliver && <div className="space-y-3 rounded-xl border border-dashed border-[#bfd3cb] bg-[#f8fbf9] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you will record</p>
            <div className="flex flex-wrap gap-2">{["Delivery date", "Mode", "Place", "Number of babies", "Complications"].map((label) => <span key={label} className="rounded-full border bg-white px-3 py-1 text-xs">{label}</span>)}</div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-3">
              <div className="flex items-center gap-2"><BabyIcon className="h-6 w-6 text-saivie-teal" aria-hidden="true" /><div><p className="text-sm font-medium">Baby details</p><p className="text-xs text-muted-foreground">Birth date · sex · birth weight · outcome. Age is calculated from birth date.</p></div></div>
              <Button size="sm" variant="outline" disabled={busy || !!editing || !!creating || !!outcomeEpisode} onClick={() => { mutation.reset(); setCreating(episode); }}><Plus className="mr-1 h-3 w-3" />Add baby</Button>
            </div>
          </div>}
        </>}
        {creating?.id === episode.id && <DeliveryForm key={episode.id} patientId={patientId} episode={episode} initialDate={episode.details.endDate || deliveryToday()} pending={busy} onSubmit={(delivery) => mutation.mutate({ delivery })} onCancel={() => { setCreating(null); mutation.reset(); }} />}
        {outcomeEpisode?.id === episode.id && <PregnancyOutcomeForm key={episode.id} episode={episode} pending={busy} onSubmit={(input) => outcomeMutation.mutate(input)} onCancel={() => { setOutcomeEpisode(null); outcomeMutation.reset(); }} />}
      </section>;
    })}
    {records.isSuccess && episodes.isSuccess && !episodes.data.length && <p className="rounded-xl border bg-white p-4 text-sm">No pregnancy episodes recorded. Add or review pregnancy history in Pregnancy summary first.</p>}
    {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
    {outcomeMutation.isError && <p role="alert" className="text-sm text-destructive">{outcomeMutation.error.message}</p>}
  </section>;
}
