import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import {
  babyAge, deliveryInputSchema, deliveryRecordSchema, deliveryToday,
  type Baby, type DeliveryInput, type DeliveryRecord,
} from "../../../../lib/db/src/delivery";
import { readPregnancyEpisodes } from "@/lib/pregnancyOverview";
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
  </fieldset>;
}

export function DeliveryForm({ patientId, initialDate = deliveryToday(), forcedMode, pending, onSubmit, onCancel }: {
  patientId: number; initialDate?: string; forcedMode?: "Caesarean"; pending: boolean;
  onSubmit: (input: DeliveryInput) => void; onCancel: () => void;
}) {
  const episodes = useDeliveryEpisodes(patientId);
  const formId = useId();
  const current = episodes.data?.find((episode) => episode.details.status === "current");
  const [deliveryDate, setDeliveryDate] = useState(initialDate);
  const [deliveryMode, setDeliveryMode] = useState<string>(forcedMode || "");
  const [babies, setBabies] = useState<BabyDraft[]>([newBaby(initialDate)]);
  const [reviewDate, setReviewDate] = useState("");
  const [error, setError] = useState("");
  return <form className="space-y-3 rounded-xl border border-saivie-blush bg-white p-4" aria-label="Record delivery and babies" onSubmit={(event) => {
    event.preventDefault();
    const parsed = deliveryInputSchema.safeParse({
      episodeId: current?.id, episodeVersion: current?.version, deliveryDate, deliveryMode, babies,
      postpartumReviewDate: reviewDate || null,
    });
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")); return; }
    setError(""); onSubmit(parsed.data);
  }}>
    <h3 className="font-semibold">Confirm delivery and baby outcomes</h3>
    <p className="text-sm">Saving ends this pregnancy and starts postpartum care. Pregnancy history is preserved; surgical recovery remains separate.</p>
    {episodes.isPending && <p role="status">Loading pregnancy...</p>}
    {episodes.isError && <p role="alert">{episodes.error.message} <Button type="button" variant="link" onClick={() => void episodes.refetch()}>Retry</Button></p>}
    {episodes.isSuccess && !current && <p role="alert">No current pregnancy episode. Create or review it in Pregnancy summary before recording delivery.</p>}
    {current && <p className="text-sm">Pregnancy {current.details.number}{current.details.fetusCount ? ` · ${current.details.fetusCount} fetus(es) recorded` : ""}</p>}
    <fieldset disabled={pending} className="space-y-3">
      <div><Label htmlFor={`${formId}-date`}>Delivery completion date (last baby born)</Label><DateInput id={`${formId}-date`} required value={deliveryDate} max={deliveryToday()} onValueChange={setDeliveryDate} /></div>
      <div><Label htmlFor={`${formId}-mode`}>Delivery mode</Label><select id={`${formId}-mode`} required disabled={!!forcedMode} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={deliveryMode} onChange={(event) => setDeliveryMode(event.target.value)}><option value="">Select delivery mode</option>{["Vaginal", "Caesarean", "Assisted vaginal", "Other"].map((mode) => <option key={mode}>{mode}</option>)}</select></div>
      {babies.map((baby, index) => <div key={index}><BabyFields baby={baby} index={index} onChange={(value) => setBabies((rows) => rows.map((row, i) => i === index ? value : row))} />
        {babies.length > 1 && <Button type="button" variant="ghost" onClick={() => setBabies((rows) => rows.filter((_, i) => i !== index))}>Remove baby {index + 1}</Button>}</div>)}
      <Button type="button" variant="outline" disabled={babies.length >= 10} onClick={() => setBabies((rows) => [...rows, newBaby(deliveryDate)])}>Add another baby</Button>
      <div><Label htmlFor={`${formId}-review`}>Postpartum review date (optional)</Label><DateInput id={`${formId}-review`} value={reviewDate} min={deliveryDate} onValueChange={setReviewDate} /><p className="mt-1 text-xs text-muted-foreground">Replaces the antenatal next-review date. No appointment or message is sent automatically. Leave blank if not yet decided.</p></div>
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={pending || !current || !episodes.isSuccess}>{pending ? "Saving..." : forcedMode ? "Confirm caesarean delivery & completion" : "Confirm delivery"}</Button><Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>Back</Button></div>
  </form>;
}

function BabyRecordEditor({ record, pending, onSave, onCancel }: {
  record: DeliveryRecord; pending: boolean; onSave: (babies: Baby[]) => void; onCancel: () => void;
}) {
  const [babies, setBabies] = useState(record.babies);
  return <form className="space-y-3" aria-label="Update baby records" onSubmit={(event) => { event.preventDefault(); onSave(babies); }}>
    <p className="text-xs text-muted-foreground">Birth details and baby order remain fixed. Update names or record a subsequent death without changing the outcome at birth.</p>
    {babies.map((baby, index) => <BabyFields key={index} editing disabled={pending} baby={baby} index={index} onChange={(value) => {
      if (value.outcome === "Live birth" || value.outcome === "Stillbirth") {
        const updated: Baby = { ...value, outcome: value.outcome };
        setBabies((rows) => rows.map((row, i) => i === index ? updated : row));
      }
    }} />)}
    <Button disabled={pending} type="submit">Save baby updates</Button><Button disabled={pending} type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
  </form>;
}

export function DeliveryRecords({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient();
  const episodes = useDeliveryEpisodes(patientId);
  const [creating, setCreating] = useState(false);
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
    onSuccess: async () => { setCreating(false); setEditing(null); await refreshDeliveryQueries(queryClient, patientId); },
  });
  return <section className="space-y-3 rounded-2xl border border-saivie-border bg-white p-4" aria-label="Delivery and baby records">
    <h3 className="font-serif font-semibold text-saivie-teal">Delivery &amp; babies</h3>
    <p className="text-xs text-muted-foreground">Each baby stays linked to the pregnancy. Age is calculated from birth date; vaccines are not included yet.</p>
    {(records.isPending || episodes.isPending) && <p role="status">Loading delivery records...</p>}
    {records.isError && <p role="alert">{records.error.message} <Button variant="link" onClick={() => void records.refetch()}>Retry</Button></p>}
    {episodes.isError && <p role="alert">{episodes.error.message} <Button variant="link" onClick={() => void episodes.refetch()}>Retry pregnancy</Button></p>}
    {records.data?.map((record) => <section key={record.id} className="space-y-2 rounded-xl border p-3">
      <h4 className="text-sm font-semibold">{record.deliveryDate} · {record.deliveryMode} · Pregnancy {episodes.data?.find((episode) => episode.id === record.episodeId)?.details.number ?? `#${record.episodeId}`}</h4>
      <p className="text-xs">Postpartum review: {record.postpartumReviewDate || "Not scheduled"}</p>
      {record.babies.map((baby, index) => <p key={index} className="break-words text-sm">Baby {index + 1}{baby.name ? ` · ${baby.name}` : ""} · {baby.outcome} · Born {baby.birthDate}{baby.birthTime ? ` ${baby.birthTime} IST` : ""} · {babyAge(baby)}</p>)}
      {editing?.id === record.id ? <BabyRecordEditor key={editing.version} record={editing} pending={mutation.isPending} onSave={(babies) => mutation.mutate({ record: editing, babies })} onCancel={() => { setEditing(null); mutation.reset(); }} /> :
        <Button size="sm" variant="outline" disabled={mutation.isPending || creating} onClick={() => { mutation.reset(); setEditing(record); }}>Update baby records</Button>}
    </section>)}
    {records.isSuccess && !records.data.length && <p className="text-sm">No delivery recorded.</p>}
    {!creating && episodes.data?.some((episode) => episode.details.status === "current") && <Button variant="outline" disabled={mutation.isPending || !!editing} onClick={() => { mutation.reset(); setCreating(true); }}>Record delivery (vaginal or other)</Button>}
    {creating && <DeliveryForm patientId={patientId} pending={mutation.isPending} onSubmit={(delivery) => mutation.mutate({ delivery })} onCancel={() => { setCreating(false); mutation.reset(); }} />}
    {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
  </section>;
}
