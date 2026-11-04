import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaperPrescriptionWork, PaperWorkBadge, PaperWorkStatusAction } from "./PaperPrescriptionWork";
import { PaperPrescriptionTranscriptions } from "./PaperPrescriptionTranscriptions";
import { calendarDateValue } from "@/lib/calendarDates";
import type { PaperWorkRow } from "../../../../lib/db/src/paper-prescription-work";

const row: PaperWorkRow = {
  appointmentId: 4, patientId: 7, patientName: "Synthetic patient", providerId: 1, providerName: "Synthetic doctor",
  date: "2020-10-01", time: "09:00", status: "pending", transcriptionId: null, recordedAt: null, recordedBy: null,
  reason: null, updatedAt: null, updatedBy: null, version: 0,
};
function render(element: React.ReactNode, work: PaperWorkRow[] = [row]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/paper-prescription-work", "backlog", "", calendarDateValue(new Date()), "pending", 0], { rows: work, total: work.length });
  try { return renderToStaticMarkup(<QueryClientProvider client={client}>{element}</QueryClientProvider>); }
  finally { client.clear(); }
}
test("paper backlog starts with all historical pending work, exact visit identity and Not required action", () => {
  const html = render(<PaperPrescriptionWork onTranscribe={() => {}} />);
  assert.match(html, /Paper prescription work/);
  assert.match(html, /Completed consultations become pending automatically/);
  assert.match(html, /blank = all history/);
  assert.match(html, /data-testid="paper-work-4"/);
  assert.match(html, /Synthetic patient.*#4/);
  assert.match(html, /1 pending in this work filter/);
  assert.match(html, /Paper Rx: Pending/);
  assert.match(html, /Paper entry not required/);
  assert.match(html, /Record paper prescription/);
});
test("recorded badges expose entry attribution but no status override; exemptions can be reopened", () => {
  const recorded = { ...row, status: "recorded" as const, recordedBy: "Synthetic receptionist", recordedAt: "2020-10-02T03:30:00Z", transcriptionId: 50 };
  const html = render(<><PaperWorkBadge row={recorded} /><PaperWorkStatusAction row={recorded} /></>);
  assert.match(html, /Paper Rx: Recorded/);
  assert.match(html, /Entered by Synthetic receptionist/);
  assert.doesNotMatch(html, /Paper entry not required|Reopen paper entry/);
  const exempt = { ...row, status: "not_required" as const, reason: "Digital prescription issued", updatedBy: "Synthetic receptionist" };
  const exemption = render(<><PaperWorkBadge row={exempt} /><PaperWorkStatusAction row={exempt} /></>);
  assert.match(exemption, /Paper Rx: Not required/);
  assert.match(exemption, /Digital prescription issued/);
  assert.match(exemption, /Reopen paper entry/);
});
test("paper work empty state does not invent recorded or pending items", () => {
  const html = render(<PaperPrescriptionWork onTranscribe={() => {}} />, []);
  assert.match(html, /0 pending in this work filter/);
  assert.match(html, /No paper-entry work matches this filter/);
  assert.doesNotMatch(html, /data-testid="paper-work-/);
});

test("the paper-entry editor is not mounted before choosing an appointment/transcription", () => {
  const html = render(<PaperPrescriptionTranscriptions patient={{ id: 7, name: "Synthetic patient" }} appointment={{ id: 4, date: "2020-10-01" }} onClose={() => {}} />);
  assert.doesNotMatch(html, /Transcribe doctor|Prescription entry steps|Linked to appointment/);
});
