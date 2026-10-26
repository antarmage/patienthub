import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { NoRecordsIllustration } from "./NoRecordsIllustration";

type AnyRecord = Record<string, any>;

export interface TimelineMedicine {
  name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");

export function visitMedicines(visit: AnyRecord | null | undefined): TimelineMedicine[] {
  const raw = Array.isArray(visit?.prescriptions) ? visit!.prescriptions : Array.isArray(visit?.prescriptions?.medicines) ? visit!.prescriptions.medicines : [];
  return raw
    .map((med: unknown) => (typeof med === "string" ? { name: med } : med && typeof med === "object" ? (med as AnyRecord) : null))
    .filter((med: AnyRecord | null): med is AnyRecord => Boolean(med && text(med.name)))
    .map((med: AnyRecord) => ({ name: text(med.name), dose: text(med.dose), frequency: text(med.frequency), duration: text(med.duration), instructions: text(med.instructions) }));
}

export function visitTests(visit: AnyRecord | null | undefined): string[] {
  const raw = Array.isArray(visit?.labsOrdered) ? visit!.labsOrdered : [];
  return raw.map((test: unknown) => (typeof test === "string" ? test.trim() : text((test as AnyRecord | null)?.name))).filter(Boolean);
}

export function sortVisitsNewestFirst<T extends AnyRecord>(visits: T[]): T[] {
  return [...visits].sort((a, b) => String(b.date || "").slice(0, 10).localeCompare(String(a.date || "").slice(0, 10)) || Number(b.id || 0) - Number(a.id || 0));
}

const formatDate = (value: unknown) => {
  const iso = String(value || "").slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Date not recorded";
};

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2 text-xs">
      <span className="font-semibold uppercase tracking-wide text-[10px] text-saivie-teal">{label}</span>
      <span className="whitespace-pre-wrap text-saivie-plum">{value}</span>
    </div>
  );
}

export function PatientVisitTimeline({ visits, isLoading, isError, onRetry }: { visits: AnyRecord[]; isLoading?: boolean; isError?: boolean; onRetry?: () => void }) {
  const sorted = useMemo(() => sortVisitsNewestFirst(visits), [visits]);
  const [selectedId, setSelectedId] = useState<unknown>(sorted[0]?.id ?? null);
  useEffect(() => {
    if (!sorted.some((visit) => visit.id === selectedId)) setSelectedId(sorted[0]?.id ?? null);
  }, [sorted, selectedId]);

  if (isError) return <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">Unable to load visits. {onRetry && <button type="button" className="ml-1 underline" onClick={onRetry}>Retry</button>}</div>;
  if (isLoading) return <p role="status" className="p-4 text-xs text-saivie-plum">Loading visits…</p>;
  if (!sorted.length) return (
    <div className="px-6 py-8 text-center text-xs text-saivie-plum" data-testid="visit-timeline-empty">
      <NoRecordsIllustration decorative />
      <p className="mt-2">No visits recorded</p>
    </div>
  );

  const visit = sorted.find((item) => item.id === selectedId) || sorted[0];
  const vitals: AnyRecord = visit.vitals && typeof visit.vitals === "object" ? visit.vitals : {};
  const medicines = visitMedicines(visit);
  const tests = visitTests(visit);
  const examination = text(typeof visit.examination === "string" ? visit.examination : visit.examination?.findings) || text(visit.objective);
  const vitalsLine = [
    text(vitals.bp) && `BP ${text(vitals.bp)}`,
    text(vitals.pulse) && `PR ${text(vitals.pulse)}`,
    text(vitals.weight) && `Wt ${text(vitals.weight)} kg`,
    text(vitals.spo2) && `SpO2 ${text(vitals.spo2)}%`,
    text(vitals.pog) && `POG ${text(vitals.pog)}`,
    text(vitals.eod) && `EDD ${formatDate(vitals.eod)}`,
  ].filter(Boolean).join(" · ");
  const followUp = [text(vitals.followUpDate) && formatDate(vitals.followUpDate), text(visit.followUpPlan)].filter(Boolean).join(" · ");

  return (
    <div className="grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-[260px_1fr]" data-testid="patient-visit-timeline">
      <ol className="space-y-1 md:max-h-[calc(100vh-220px)] md:overflow-y-auto" aria-label="Visits">
        {sorted.map((item) => {
          const active = item.id === visit.id;
          const count = visitMedicines(item).length;
          return (
            <li key={String(item.id)}>
              <button type="button" aria-current={active ? "true" : undefined} onClick={() => setSelectedId(item.id)} data-testid={`visit-timeline-item-${item.id}`}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left ${active ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border bg-saivie-ivory text-saivie-plum hover:bg-saivie-surface-muted"}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">{formatDate(item.date)}</span>
                  <span className={`block truncate text-[11px] ${active ? "text-white/80" : "text-saivie-plum/80"}`}>{text(item.diagnosis) || text(item.chiefComplaint) || text(item.visitType) || "Visit"}</span>
                </span>
                {count > 0 && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white/20" : "bg-saivie-sage text-saivie-teal"}`}>Rx {count}</span>}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </button>
            </li>
          );
        })}
      </ol>

      <article className="space-y-3 rounded-lg border border-saivie-border bg-saivie-ivory p-4" data-testid="visit-prescription">
        <header className="flex flex-wrap items-center gap-2 border-b border-saivie-border pb-2">
          <FileText className="h-4 w-4 text-saivie-teal" />
          <h3 className="text-sm font-bold text-saivie-plum">{formatDate(visit.date)}</h3>
          {[text(visit.visitType), text(vitals.patientType)].filter(Boolean).map((tag) => <span key={tag} className="rounded border border-saivie-border px-1.5 py-0.5 text-[10px] text-saivie-plum">{tag}</span>)}
        </header>
        <div className="space-y-1.5">
          <Row label="Vitals" value={vitalsLine} />
          <Row label="Complaint" value={text(visit.chiefComplaint)} />
          <Row label="O/E" value={examination} />
          <Row label="Diagnosis" value={text(visit.diagnosis)} />
        </div>
        <section>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-saivie-teal">Rx</h4>
          {medicines.length ? (
            <table className="w-full text-xs">
              <tbody>
                {medicines.map((med, index) => (
                  <tr key={`${med.name}-${index}`} className="border-b border-saivie-border last:border-0">
                    <td className="py-1.5 pr-2 font-semibold text-saivie-plum">{index + 1}. {med.name}</td>
                    <td className="py-1.5 pr-2 text-saivie-plum">{med.dose}</td>
                    <td className="py-1.5 pr-2 font-semibold text-saivie-teal">{med.frequency}</td>
                    <td className="py-1.5 pr-2 text-saivie-plum">{med.duration}</td>
                    <td className="py-1.5 text-saivie-plum/80">{med.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-xs text-saivie-plum/80">No prescription saved for this visit</p>}
        </section>
        <div className="space-y-1.5">
          <Row label="Tests" value={tests.join(", ")} />
          <Row label="Advice" value={text(visit.planNotes)} />
          <Row label="Follow-up" value={followUp} />
        </div>
      </article>
    </div>
  );
}
