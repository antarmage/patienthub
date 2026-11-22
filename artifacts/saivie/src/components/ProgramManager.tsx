import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { programInputSchema, programSchema, type Program, type ProgramInput } from "../../../../lib/db/src/patient-programs";

const responseSchema = z.object({ programs: z.array(programSchema), canPublish: z.boolean() });
const fieldClass = "w-full rounded-lg border border-saivie-border bg-white px-3 py-2 text-sm";
const buttonClass = "min-h-11 rounded-full bg-saivie-plum px-5 text-sm font-bold text-white disabled:opacity-50";
const secondaryClass = "min-h-11 rounded-full border border-saivie-border bg-white px-5 text-sm font-bold disabled:opacity-50";

export default function ProgramManager() {
  const cache = useQueryClient();
  const token = sessionStorage.getItem("billing_staff_token") || "";
  const query = useQuery({
    queryKey: ["/api/program-management", token],
    queryFn: async () => responseSchema.parse(await receptionRequest("/api/program-management")),
    retry: false,
  });
  const [editing, setEditing] = useState<Program | "new" | null>(null);
  const [reviewing, setReviewing] = useState<Program | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const mutation = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body: unknown }) =>
      receptionRequest(`/api/program-management${path}`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setEditing(null); setReviewing(null); setReviewed(false);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["/api/program-management"] }),
        cache.invalidateQueries({ queryKey: ["/api/patient-programs"] }),
      ]);
    },
  });
  if (query.isPending) return <p role="status">Loading programs...</p>;
  if (query.isError && !query.data) return <p role="alert">Could not load programs: {query.error.message} <button type="button" className="underline" onClick={() => void query.refetch()}>Retry</button></p>;
  if (!query.data) return null;

  return (
    <section className="mx-auto max-w-5xl space-y-5 text-saivie-plum">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-bold">Programs</h1>
        <p className="text-sm">Create pregnancy nutrition and exercise programs. A clinician or owner reviews and publishes each version. Published Free programs appear in the patient portal; Plus remains staff-only.</p>
        <p className="text-sm">To change a published program, a clinician or owner must unpublish it first. It will be hidden from patients until reviewed and published again.</p>
      </header>
      {query.isError && <p role="alert">Refresh failed: {query.error.message}. Reload before making changes.</p>}
      {mutation.isError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{mutation.error.message}</p>}
      <button type="button" className={buttonClass} disabled={!!editing || !!reviewing || mutation.isPending || query.isError} onClick={() => { mutation.reset(); setEditing("new"); }}>Create program</button>
      {editing && <ProgramForm key={editing === "new" ? "new" : editing.id} program={editing} busy={mutation.isPending}
        onCancel={() => { setEditing(null); mutation.reset(); }}
        onSave={(input) => mutation.mutate(editing === "new"
          ? { path: "", method: "POST", body: input }
          : { path: `/${editing.id}`, method: "PUT", body: { ...input, expectedVersion: editing.version } })} />}
      {query.data.programs.length === 0 && <p>No programs created yet.</p>}
      <div className="space-y-4">
        {query.data.programs.map((program) => (
          <article key={program.id} className="space-y-3 rounded-2xl border border-saivie-border bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide">{program.category} · {program.tier} · {program.status} · version {program.version}</p>
            <h2 className="font-serif text-2xl font-bold">{program.title}</h2>
            {program.description && <p className="whitespace-pre-wrap text-sm">{program.description}</p>}
            <ol className="list-decimal space-y-3 pl-5">
              {program.sessions.map((session, index) => <li key={index}><h3 className="font-bold">{session.title}</h3><p className="whitespace-pre-wrap text-sm">{session.content}</p></li>)}
            </ol>
            {program.sessions.length === 0 && <p className="text-sm">No sessions added yet.</p>}
            {reviewing?.id === program.id ? (
              <div className="space-y-3 rounded-xl bg-saivie-surface-muted p-4">
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} /> I have reviewed this program and its sessions for patient use.</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={buttonClass} disabled={!reviewed || mutation.isPending} onClick={() => mutation.mutate({ path: `/${program.id}/publish`, method: "POST", body: { expectedVersion: program.version, reviewed: true } })}>Publish reviewed program</button>
                  <button type="button" className={secondaryClass} disabled={mutation.isPending} onClick={() => { setReviewing(null); setReviewed(false); mutation.reset(); }}>Cancel review</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {program.status === "draft" && <button type="button" className={secondaryClass} disabled={!!editing || !!reviewing || mutation.isPending || query.isError} onClick={() => { mutation.reset(); setEditing(program); }}>Edit draft</button>}
                {program.status === "draft" && query.data.canPublish && <button type="button" className={secondaryClass} disabled={!!editing || !!reviewing || mutation.isPending || query.isError} onClick={() => { mutation.reset(); setReviewing(program); setReviewed(false); }}>Review for publishing</button>}
                {program.status === "published" && query.data.canPublish && <button type="button" className={secondaryClass} disabled={!!editing || !!reviewing || mutation.isPending || query.isError} onClick={() => {
                  if (window.confirm("Unpublish this program? Free programs will no longer be shown to patients.")) mutation.mutate({ path: `/${program.id}/unpublish`, method: "POST", body: { expectedVersion: program.version } });
                }}>Unpublish</button>}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ProgramForm({ program, busy, onCancel, onSave }: {
  program: Program | "new"; busy: boolean; onCancel: () => void; onSave: (input: ProgramInput) => void;
}) {
  const [input, setInput] = useState<ProgramInput>(program === "new"
    ? { title: "", description: "", category: "nutrition", tier: "free", sessions: [] }
    : { title: program.title, description: program.description, category: program.category, tier: program.tier, sessions: program.sessions });
  const [error, setError] = useState("");
  return (
    <form className="space-y-4 rounded-2xl border border-saivie-border bg-white p-5" onSubmit={(event) => {
      event.preventDefault();
      const parsed = programInputSchema.safeParse(input);
      if (!parsed.success) { setError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")); return; }
      setError(""); onSave(parsed.data);
    }}>
      <fieldset disabled={busy} className="space-y-4">
        <legend className="font-serif text-2xl font-bold">{program === "new" ? "New program" : "Edit draft"}</legend>
        <label className="block space-y-1 text-sm font-semibold">Title<input className={fieldClass} required maxLength={120} value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} /></label>
        <label className="block space-y-1 text-sm font-semibold">Description<textarea className={fieldClass} maxLength={2000} value={input.description} onChange={(event) => setInput({ ...input, description: event.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm font-semibold">Category<select className={fieldClass} value={input.category} onChange={(event) => setInput({ ...input, category: programInputSchema.shape.category.parse(event.target.value) })}><option value="nutrition">Nutrition</option><option value="exercise">Exercise</option></select></label>
          <label className="block space-y-1 text-sm font-semibold">Access<select className={fieldClass} value={input.tier} onChange={(event) => setInput({ ...input, tier: programInputSchema.shape.tier.parse(event.target.value) })}><option value="free">Free</option><option value="plus">Plus (staff-only)</option></select></label>
        </div>
        <h3 className="font-bold">Sessions</h3>
        {input.sessions.map((session, index) => <div key={index} className="space-y-3 rounded-xl border border-saivie-border p-3">
          <h4 className="font-semibold">Session {index + 1}</h4>
          <label className="block space-y-1 text-sm">Session title<input className={fieldClass} required maxLength={120} value={session.title} onChange={(event) => setInput({ ...input, sessions: input.sessions.map((item, i) => i === index ? { ...item, title: event.target.value } : item) })} /></label>
          <label className="block space-y-1 text-sm">Session content<textarea className={fieldClass} required maxLength={5000} value={session.content} onChange={(event) => setInput({ ...input, sessions: input.sessions.map((item, i) => i === index ? { ...item, content: event.target.value } : item) })} /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryClass} disabled={index === 0} onClick={() => setInput({ ...input, sessions: input.sessions.map((item, i) => i === index - 1 ? input.sessions[index] : i === index ? input.sessions[index - 1] : item) })}>Move up</button>
            <button type="button" className={secondaryClass} disabled={index === input.sessions.length - 1} onClick={() => setInput({ ...input, sessions: input.sessions.map((item, i) => i === index + 1 ? input.sessions[index] : i === index ? input.sessions[index + 1] : item) })}>Move down</button>
            <button type="button" className={secondaryClass} onClick={() => setInput({ ...input, sessions: input.sessions.filter((_, i) => i !== index) })}>Remove session</button>
          </div>
        </div>)}
        <button type="button" className={secondaryClass} disabled={input.sessions.length >= 50} onClick={() => setInput({ ...input, sessions: [...input.sessions, { title: "", content: "" }] })}>Add session</button>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex flex-wrap gap-2"><button type="submit" className={buttonClass}>Save draft</button><button type="button" className={secondaryClass} onClick={onCancel}>Cancel</button></div>
      </fieldset>
    </form>
  );
}
