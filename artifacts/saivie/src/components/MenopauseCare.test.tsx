import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MenopauseCare, MenopauseHealthMap, MenopauseProgress, PatientMenopauseCare } from "./MenopauseCare";
import { emptyMenopauseIntake, menopausePatientView, type MenopauseEntry, type MenopauseState } from "../../../../lib/db/src/menopause";
import { readClinicianNavigation, clinicianNavigationSearch } from "@/lib/clinicianNavigation";

function renderState(state: MenopauseState, audience: "doctor" | "patient" = "doctor", host = false, refreshFailed = false) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["/api/patients/1/menopause", audience], state);
  if (refreshFailed) client.getQueryCache().find({ queryKey: ["/api/patients/1/menopause", audience] })?.setState({
    status: "error", error: new Error("Synthetic connection failure"), fetchStatus: "idle",
  });
  try {
    return renderToStaticMarkup(<QueryClientProvider client={client}>{host
      ? <PatientMenopauseCare patientId={1} patientName="Synthetic Patient" />
      : <MenopauseCare patientId={1} patientName="Synthetic Patient" audience={audience} />}</QueryClientProvider>);
  } finally { client.clear(); }
}
const intake: MenopauseEntry = {
  id: 1, date: "2026-11-01", appointmentId: null, createdAt: "2026-11-01T10:00:00Z", recordedBy: "Patient", source: "Patient",
  record: { kind: "intake", data: { ...emptyMenopauseIntake(), priorities: "Sleep better",
    safety: { ...emptyMenopauseIntake().safety, bleeding: "Yes" }, symptoms: { ...emptyMenopauseIntake().symptoms, sleep: 3 } } },
};
const approved: MenopauseEntry = {
  id: 2, date: "2026-11-02", appointmentId: 10, createdAt: "2026-11-02T10:00:00Z", recordedBy: "Synthetic Doctor", source: "Clinician",
  approvedStage: "Perimenopause",
  record: { kind: "plan", data: { assessmentId: 1, status: "Approved", summary: "Discussed symptoms", treatment: "See saved prescription",
    lifestyle: "Agreed activity", investigations: "", goals: "Improve sleep", safetyAdvice: "Contact clinic for new bleeding", reviewDate: "2026-12-01", safetyReviewed: true } },
};

test("menopause pathway is opt-in: no patient entry point for unenrolled patients and no replacement of existing modes", () => {
  const state = { enabled: false, version: 0, entries: [] };
  assert.equal(renderState(state, "patient", true), "");
  const doctor = renderState(state);
  assert.match(doctor, /Enable menopause care/);
  assert.doesNotMatch(doctor, /Record intake|Doctor assessment \(private|Track symptoms/);
  assert.match(doctor, /No diagnosis is inferred/);
});

test("doctor workspace exposes entry flows and saved safety concerns, while patient UI excludes clinical authoring", () => {
  const state = { enabled: true, version: 2, entries: [approved, intake] };
  const doctor = renderState(state);
  assert.match(doctor, /Record intake/); assert.match(doctor, /Doctor assessment/);
  assert.match(doctor, /Create \/ revise care plan/); assert.match(doctor, /Reported safety concerns in saved history/);
  assert.match(doctor, /Synthetic Doctor/); assert.match(doctor, /IST/);
  const patient = renderState(menopausePatientView(state), "patient", true);
  assert.match(patient, /Track symptoms/); assert.match(patient, /Record intake/);
  assert.doesNotMatch(patient, /Enable menopause care|Pause menopause care|Create \/ revise care plan|Doctor assessment/);
  assert.match(patient, /not monitored for emergencies/);
  const paused = renderState({ ...state, enabled: false }, "patient", true);
  assert.doesNotMatch(paused, /Track symptoms/);
  assert.match(paused, /saved history is retained/);
  assert.match(paused, /Menopause Health Map/);
});

test("a failed refresh retains the cached workspace instead of unmounting entry forms", () => {
  const state = { enabled: true, version: 2, entries: [intake] };
  for (const audience of ["doctor", "patient"] as const) {
    const html = renderState(state, audience, audience === "patient", true);
    assert.match(html, /Showing previously loaded history/);
    assert.match(html, /unsaved answers are retained/);
    assert.match(html, /Track symptoms/);
    assert.match(html, /Synthetic connection failure/);
  }
});

test("patient Health Map is escaped, source-labelled, printable only after approval and keeps review distinct from booking", () => {
  const html = renderToStaticMarkup(<MenopauseHealthMap patientName="<script>alert(1)</script>" entry={approved} />);
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Print \/ save PDF/); assert.match(html, /not a booked appointment/);
  assert.match(html, /not a prescription/); assert.match(html, /Perimenopause/);
  const draft: MenopauseEntry = { ...approved, record: approved.record.kind === "plan" ? { kind: "plan", data: { ...approved.record.data, status: "Draft" } } : approved.record };
  assert.doesNotMatch(renderToStaticMarkup(<MenopauseHealthMap patientName="Synthetic" entry={draft} />), /Print \/ save PDF/);
});

test("symptom comparison renders recorded severe-to-none readings, missing values and accessible trend points", () => {
  const latest: MenopauseEntry = { ...intake, id: 3, date: "2026-11-03", record: {
    kind: "intake", data: { ...emptyMenopauseIntake(), priorities: "Follow-up", symptoms: { ...emptyMenopauseIntake().symptoms, sleep: 0 } },
  } };
  const html = renderToStaticMarkup(<MenopauseProgress entries={[latest, intake]} />);
  assert.match(html, /Severe/); assert.match(html, /None/);
  assert.match(html, /Not recorded/); assert.match(html, /No comparison yet/);
  assert.match(html, /role="img"/); assert.equal((html.match(/<circle/g) || []).length, 2);
  assert.match(html, /not a time-scaled chart/);
});

test("menopause tab deep-links without changing existing consultation or pregnancy navigation", () => {
  assert.equal(readClinicianNavigation("patientId=1&tab=menopause").tab, "menopause");
  assert.match(clinicianNavigationSearch("", { patientId: 1, view: "patient_detail", tab: "menopause", step: "reason" }), /tab=menopause/);
  assert.equal(readClinicianNavigation("patientId=1&tab=consultation&step=plan").step, "plan");
  assert.equal(readClinicianNavigation("patientId=1&tab=vaccines").tab, "vaccines");
});
