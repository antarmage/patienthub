import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  assessmentStatuses, evidenceKey,
  type AssessmentDraft, type EvidenceFact, type EvidenceRelation,
} from "@/lib/consultationAssessment";

export function ConsultationAssessment({ draft, onChange, facts, diagnoses, loading, errors, onRetry, missing }: {
  draft: AssessmentDraft;
  onChange: (draft: AssessmentDraft) => void;
  facts: EvidenceFact[];
  diagnoses: string[];
  loading: boolean;
  errors: string[];
  onRetry: () => void;
  missing: string[];
}) {
  const [filter, setFilter] = useState<"relevant" | "all" | "review">("relevant");
  const [expanded, setExpanded] = useState(false);
  const reviewFor = (fact: EvidenceFact) => draft.evidence.find((review) => evidenceKey(review) === evidenceKey(fact));
  const update = (fact: EvidenceFact, change: { reviewed?: boolean; relation?: EvidenceRelation | "" }) => {
    const key = evidenceKey(fact);
    onChange({ ...draft, evidence: [
      ...draft.evidence.filter((review) => evidenceKey(review) !== key),
      { ...fact, reviewed: false, relation: "", ...reviewFor(fact), ...change },
    ] });
  };
  const filtered = facts.filter((fact) => filter === "all" || (filter === "review" ? !reviewFor(fact)?.reviewed : fact.relevant));
  const visible = expanded ? filtered : filtered.slice(0, 5);
  const reviewedCount = facts.filter((fact) => reviewFor(fact)?.reviewed).length;
  const previousReviews = draft.evidence.filter((review) => !facts.some((fact) => evidenceKey(fact) === evidenceKey(review)));
  return <div className="space-y-4" data-testid="consultation-assessment">
    <section className="space-y-3">
      <label className="block text-xs font-semibold">Diagnosis / clinical impression
        <Input id="input-consultation-assessment" data-testid="input-consultation-assessment"
          list="consultation-diagnoses" value={draft.impression}
          onChange={(event) => onChange({ ...draft, impression: event.target.value })}
          placeholder="Search previous diagnoses or write an impression" className="mt-1" />
      </label>
      <datalist id="consultation-diagnoses">{diagnoses.map((diagnosis) => <option key={diagnosis} value={diagnosis} />)}</datalist>
      <label className="block text-xs font-semibold">Assessment status
        <select className="mt-1 h-10 w-full rounded-xl border bg-card px-3 text-sm" value={draft.status}
          onChange={(event) => onChange({ ...draft, status: assessmentStatuses.find((status) => status === event.target.value) || "" })}>
          <option value="">Choose certainty (optional)</option>
          {assessmentStatuses.map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      <details open={draft.reasoning ? true : undefined}>
        <summary className="cursor-pointer text-xs font-semibold">Additional reasoning (optional)</summary>
        <Textarea aria-label="Additional reasoning" value={draft.reasoning} className="mt-2 min-h-[80px]"
          onChange={(event) => onChange({ ...draft, reasoning: event.target.value })} placeholder="Uncertainty, alternatives, risk or other clinical reasoning" />
      </details>
    </section>
    <section className="rounded-xl border border-saivie-border p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Evidence from the record</h3>
        <span className="text-xs text-muted-foreground">{reviewedCount} of {facts.length} reviewed</span>
      </div>
      <p className="text-xs text-muted-foreground">Review is not verification. No diagnosis is inferred.</p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Evidence filters">
        {([["relevant", "Relevant"], ["all", "All sources"], ["review", "Needs review"]] as const).map(([value, label]) =>
          <Button key={value} type="button" size="sm" variant={filter === value ? "default" : "outline"} aria-pressed={filter === value}
            onClick={() => { setFilter(value); setExpanded(false); }}>{label}</Button>)}
      </div>
      {loading && <p role="status" className="text-xs">Loading records...</p>}
      {errors.length > 0 && <div role="alert" className="text-xs text-destructive">
        Could not load: {errors.join(", ")}. Evidence may be incomplete. <button type="button" className="underline" onClick={onRetry}>Retry</button>
      </div>}
      {visible.map((fact) => {
        const review = reviewFor(fact);
        return <article key={evidenceKey(fact)} className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-semibold">{fact.label}</p>
          {fact.value.length > 240 ? <details>
            <summary className="cursor-pointer whitespace-pre-wrap break-words text-sm">{fact.value.slice(0, 240)}... <span className="text-xs underline">Full recorded text</span></summary>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{fact.value}</p>
          </details> : <p className="whitespace-pre-wrap break-words text-sm">{fact.value}</p>}
          <p className="text-[11px] text-muted-foreground">{fact.source} · {fact.date || "Date not recorded"}</p>
          {fact.comparison && <p className="text-xs text-amber-800">{fact.comparison}</p>}
          {fact.href && <a href={fact.href} target="_blank" rel="noopener noreferrer" className="text-xs text-saivie-teal underline">Open original report</a>}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={review?.reviewed || false} onChange={(event) => update(fact, { reviewed: event.target.checked })} />
              Reviewed<span className="sr-only">: {fact.label}</span>
            </label>
            <select aria-label={`Link ${fact.label} to assessment`} value={review?.relation || ""}
              className="min-w-0 max-w-full rounded-lg border bg-card p-1 text-xs"
              onChange={(event) => update(fact, { relation: event.target.value as EvidenceRelation | "" })}>
              <option value="">Not linked</option><option value="supporting">Supporting</option>
              <option value="challenging">Challenging</option><option value="contextual">Contextual</option>
            </select>
          </div>
        </article>;
      })}
      {!loading && filtered.length === 0 && <p className="text-xs">No items in this view.</p>}
      {filtered.length > 5 && <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>{expanded ? "Show fewer" : `Show all ${filtered.length} items`}</Button>}
      {visible.some((fact) => !reviewFor(fact)?.reviewed) && <Button type="button" variant="outline" size="sm" onClick={() => {
        const keys = new Set(visible.map(evidenceKey));
        onChange({ ...draft, evidence: [
          ...draft.evidence.filter((review) => !keys.has(evidenceKey(review))),
          ...visible.map((fact) => ({ ...fact, reviewed: true, relation: reviewFor(fact)?.relation || "" as const })),
        ] });
      }}>Mark visible items reviewed</Button>}
      {missing.map((message) => <p key={message} className="text-xs text-muted-foreground">{message}</p>)}
      {previousReviews.length > 0 && <details>
        <summary className="text-xs cursor-pointer">Previously saved evidence ({previousReviews.length}) — source changed or unavailable</summary>
        {previousReviews.map((fact) => <div key={evidenceKey(fact)} className="mt-2 border-t pt-2 text-xs">
          <p>{fact.label}: {fact.value}</p><p>{fact.source} · {fact.date || "Date not recorded"} · {fact.relation || "Not linked"} · {fact.reviewed ? "Previously reviewed" : "Not reviewed"}</p>
          <button type="button" className="underline" onClick={() => onChange({ ...draft, evidence: draft.evidence.filter((item) => evidenceKey(item) !== evidenceKey(fact)) })}>Remove saved link</button>
        </div>)}
      </details>}
    </section>
    <p className="text-xs text-saivie-teal">Save note saves the assessment and evidence review together.</p>
  </div>;
}
