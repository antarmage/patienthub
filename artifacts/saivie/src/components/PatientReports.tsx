import React, { useState } from "react";
import { ExternalLink, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AnyRecord = Record<string, any>;

export type ReportKind = "Lab" | "USG";

export function reportKind(doc: AnyRecord | null | undefined): ReportKind | null {
  const text = `${doc?.type || ""} ${doc?.category || ""}`;
  if (/usg|ultrasound/i.test(text)) return "USG";
  if (/lab|blood/i.test(text)) return "Lab";
  return null;
}

export function reportFileLink(patientId: number | string | null | undefined, doc: AnyRecord | null | undefined): { url: string; external: boolean } | null {
  if (!doc) return null;
  if (patientId != null && doc.id != null && doc.metadata?.patientDocumentId) {
    return { url: `/api/patients/${patientId}/documents/${doc.id}/file`, external: false };
  }
  const drive = doc.metadata?.driveViewUrl;
  if (typeof drive === "string" && /^https:\/\//.test(drive)) return { url: drive, external: true };
  return null;
}

function formatDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function ReportViewButton({ patientId, doc, className = "" }: { patientId: number | string | null | undefined; doc: AnyRecord; className?: string }) {
  const [open, setOpen] = useState(false);
  const link = reportFileLink(patientId, doc);
  if (!link) return null;
  const testId = `button-view-report-${doc.id}`;
  if (link.external) {
    return (
      <a href={link.url} target="_blank" rel="noopener noreferrer" data-testid={testId} className={`inline-flex h-7 items-center gap-1 rounded-md border border-saivie-border px-2 text-[11px] font-medium text-saivie-teal hover:bg-saivie-surface-muted ${className}`}>
        <ExternalLink className="h-3 w-3" /> View
      </a>
    );
  }
  return (
    <>
      <Button type="button" size="sm" variant="outline" className={`h-7 gap-1 px-2 text-[11px] text-saivie-teal ${className}`} onClick={() => setOpen(true)} data-testid={testId}>
        <Eye className="h-3 w-3" /> View
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined} className="flex h-[90vh] max-w-5xl flex-col gap-2 p-3">
          <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0 pr-8">
            <DialogTitle className="truncate text-sm">{doc.name || "Report"}</DialogTitle>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs text-saivie-teal hover:underline">
              <ExternalLink className="h-3 w-3" /> New tab
            </a>
          </DialogHeader>
          {open && <iframe src={link.url} title={doc.name || "Report"} className="min-h-0 w-full flex-1 rounded border border-saivie-border bg-white" data-testid="report-viewer-frame" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PatientReportsList({ patientId, documents, isLoading, isError, onRetry }: { patientId: number | string | null | undefined; documents: AnyRecord[]; isLoading?: boolean; isError?: boolean; onRetry?: () => void }) {
  const reports = documents
    .filter((doc) => reportKind(doc))
    .sort((a, b) => String(b.date || b.createdAt || "").localeCompare(String(a.date || a.createdAt || "")));

  return (
    <section className="rounded-lg border border-saivie-border bg-white" data-testid="patient-reports">
      <h3 className="flex items-center gap-2 border-b border-saivie-border px-3 py-2 text-xs font-bold uppercase tracking-wide text-saivie-plum">
        <FileText className="h-3.5 w-3.5 text-saivie-teal" /> Reports
        {reports.length > 0 && <span className="ml-auto rounded-full bg-saivie-sage px-1.5 text-[10px] text-saivie-teal">{reports.length}</span>}
      </h3>
      {isLoading ? (
        <p className="px-3 py-2 text-xs text-saivie-plum">Loading…</p>
      ) : isError ? (
        <p className="px-3 py-2 text-xs text-rose-700">
          Couldn't load reports. {onRetry && <button type="button" className="font-semibold underline" onClick={onRetry}>Retry</button>}
        </p>
      ) : reports.length === 0 ? (
        <p className="px-3 py-2 text-xs text-saivie-plum">No lab or USG reports uploaded.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {reports.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2 px-3 py-1.5" data-testid={`report-row-${doc.id}`}>
              <span className={`w-9 shrink-0 rounded px-1 text-center text-[10px] font-bold ${reportKind(doc) === "USG" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{reportKind(doc)}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-saivie-plum" title={doc.name}>{doc.name || "Report"}</span>
              <span className="shrink-0 text-[10px] text-saivie-plum">{formatDate(doc.date)}</span>
              {reportFileLink(patientId, doc) ? <ReportViewButton patientId={patientId} doc={doc} /> : <span className="w-12 shrink-0 text-right text-[10px] text-slate-400">No file</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
