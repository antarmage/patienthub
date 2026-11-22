import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PatientHealthRecord from "./PatientHealthRecord";
import PatientPrograms from "./PatientPrograms";
import PatientNutritionPlusPreview from "./PatientNutritionPlusPreview";
import PregnancyCareDashboard from "./PregnancyCareDashboard";

function renderRecord(overrides: Partial<React.ComponentProps<typeof PatientHealthRecord>> = {}) {
  const client = new QueryClient();
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <PatientHealthRecord
        patient={{}}
        patientId={1}
        medications={[]}
        labResults={[]}
        visitHistory={[]}
        initialSection="overview"
        onBack={() => {}}
        onScheduleMedicationReminder={() => {}}
        onOpenPrograms={() => {}}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  client.clear();
  return html;
}

test("health record overview uses real empty states and offers the five record sections", () => {
  const html = renderRecord();
  assert.match(html, /Profile · 40% complete/);
  assert.match(html, /Your visits will appear here/);
  assert.match(html, /Your lab reports will appear here/);
  assert.match(html, /No current medicines recorded/);
  for (const label of ["Open visits", "Open lab reports", "Open medications", "Open nutrition", "Open exercise"]) {
    assert.ok(html.includes(label), label);
  }
  assert.doesNotMatch(html, /Health record sections|aria-pressed=/);
  assert.match(html, /Sharing and export options are not available/);
});

test("pregnancy record without visits, lab results or medicines shows the getting-started design", () => {
  const html = renderRecord({ pregnancy: true, onOpenTrack: () => {} });
  assert.match(html, /ready when you are/);
  assert.match(html, /Start wherever you like/);
  assert.match(html, /No visits, lab results or medicines have been recorded here yet/);
  assert.match(html, /Profile · 40% complete/);
  for (const action of ["View visits", "Open lab reports", "View medications", "Track measurements"]) {
    assert.ok(html.includes(action), action);
  }
  assert.doesNotMatch(html, /Nothing is saved yet|Profile · 0% complete|Ask my clinic to share/);
});

test("getting-started design is hidden when records exist or a source is unavailable", () => {
  for (const overrides of [
    { visitHistory: [{ id: 1 }] },
    { labResults: [{ id: 2 }] },
    { medications: [{ id: 3, status: "stopped" }] },
    { medicationsLoading: true },
    { medicationsError: true },
    { labResultsLoading: true },
    { labResultsError: true },
    { visitHistoryLoading: true },
    { visitHistoryError: true },
    { pregnancy: false },
  ]) {
    const html = renderRecord({ pregnancy: true, ...overrides });
    assert.doesNotMatch(html, /Start wherever you like/, JSON.stringify(overrides));
  }
});

test("medicine loading and errors are not shown as an empty list", () => {
  const loading = renderRecord({ initialSection: "medications", medicationsLoading: true });
  assert.match(loading, /Loading medicines/);
  assert.doesNotMatch(loading, /No current medicines added yet/);
  const failed = renderRecord({ initialSection: "medications", medicationsError: true, onRetryMedications: () => {} });
  assert.match(failed, /Unable to load your medicines/);
  assert.match(failed, />Retry<\/button>/);
  assert.doesNotMatch(failed, /No current medicines added yet/);
});

test("each record detail has a way back to the health record without section tabs", () => {
  for (const section of ["medications", "lab-reports", "history"] as const) {
    const html = renderRecord({ initialSection: section });
    assert.match(html, /<\/svg> Health record<\/button>/, section);
    assert.doesNotMatch(html, /Health record sections|aria-pressed=/, section);
  }
});

test("health record overview reflects saved values without inventing clinical status", () => {
  const html = renderRecord({
    medications: [{ id: 1, name: "Folic acid", status: "active", dose: "400 mcg" }],
    labResults: [{ id: 2, testName: "Haemoglobin", value: null, unit: "g/dL", results: { rawValue: "<10" } }],
    visitHistory: [{ id: 3, visitType: "Check-up", date: "2026-03-01" }],
  });
  assert.match(html, /Profile · 70% complete/);
  assert.match(html, /Folic acid/);
  assert.match(html, /400 mcg/);
  assert.match(html, /Haemoglobin/);
  assert.match(html, /&lt;10 g\/dL/);
  assert.match(html, /Check-up/);
  assert.doesNotMatch(html, /In range|Critical Risk|10\.8/);
});

test("medication reminder opens the medication section directly", () => {
  const html = renderRecord({
    initialSection: "medications",
    medications: [{ id: 1, name: "Folic acid", status: "active" }],
  });
  assert.match(html, /Your medications,.*simply/);
  assert.match(html, /Folic acid/);
  assert.doesNotMatch(html, /Health record overview/);
});

test("medication design shows recorded details and flags unconfirmed patient-reported medicines", () => {
  const html = renderRecord({
    initialSection: "medications",
    medications: [
      { id: 1, name: "Folic acid", status: "active", dose: "400 mcg", frequency: "Once daily", endDate: "2026-12-01" },
      { id: 2, name: "Thyroid tablet", status: "active", notes: "Exact thyroid product requires clinician reconciliation." },
      { id: 3, name: "Past medicine", status: "stopped" },
    ],
  });
  assert.match(html, /All medications/);
  assert.match(html, /2<\/p><p[^>]*>current medicines recorded/);
  assert.match(html, /400 mcg · Once daily/);
  assert.match(html, /End date 01 Dec 2026/);
  assert.match(html, /Thyroid tablet/);
  assert.match(html, /Review with care team/);
  assert.match(html, /not confirmed/);
  assert.match(html, /Past medications/);
  assert.doesNotMatch(html, /Refill in|doses taken|>Taken<|>Skip<|>Later</);
});

test("medication design explains empty records and unavailable schedules", () => {
  const html = renderRecord({ initialSection: "medications" });
  assert.match(html, /No current medicines added yet/);
  assert.match(html, /Scheduled dose tracking is not available here yet/);
  assert.match(html, /Check before you take anything new/);
});

test("lab reports show recorded values and report ranges without invented interpretations", () => {
  const html = renderRecord({
    initialSection: "lab-reports",
    labResults: [
      { id: 1, date: "2025-01-02", testName: "TSH", unit: "mIU/L", results: { rawValue: "<0.01", referenceRange: "0.5–4", reviewedByPatient: true } },
      { id: 2, date: "2025-02-02", testName: "Glucose", value: 0, unit: "mg/dL", referenceMin: 70, referenceMax: 92 },
      { id: 3, date: "2025-03-02", testName: "Blood group", results: { rawValue: "O positive" } },
    ],
  });
  assert.match(html, /Your lab reports,.*in plain words/);
  assert.match(html, /3<\/p><p[^>]*>saved results/);
  assert.ok(html.indexOf("Blood group") < html.indexOf("Glucose"));
  assert.match(html, /&lt;0\.01 mIU\/L/);
  assert.match(html, /0 mg\/dL/);
  assert.match(html, /Report reference range: 0\.5–4/);
  assert.match(html, /Report reference range: 70–92 mg\/dL/);
  assert.match(html, /Confirmed by you/);
  assert.match(html, /Upload report/);
  assert.doesNotMatch(html, /in range|to discuss|due now|10\.8 g\/dL/i);
});

test("lab results distinguish empty, loading and failed records", () => {
  const empty = renderRecord({ initialSection: "lab-reports" });
  assert.match(empty, /Your lab reports will appear here/);
  const loading = renderRecord({ initialSection: "lab-reports", labResultsLoading: true });
  assert.match(loading, /Loading results/);
  assert.doesNotMatch(loading, /saved results|Your lab reports will appear here/);
  const failed = renderRecord({ initialSection: "lab-reports", labResultsError: true, onRetryLabResults: () => {} });
  assert.match(failed, /Unable to load your lab results/);
  assert.match(failed, />Retry<\/button>/);
  assert.doesNotMatch(failed, /saved results|Your lab reports will appear here/);
});

test("visit page presents saved history and the next open appointment", () => {
  const html = renderRecord({
    initialSection: "history",
    visitHistory: [
      { id: 1, date: "2025-01-02", visitType: "First visit" },
      { id: 2, date: "2025-02-03", visitType: "Check-up", providerId: 7, vitals: { bp: "112/70", weight: 58.4, fundalHeight: 24, pog: "14 weeks", followUpDate: "2025-03-03" }, planNotes: "Review next month." },
    ],
    providers: [{ id: 7, name: "Dr Example" }],
    appointments: [
      { id: 1, date: "2001-01-01", type: "Past appointment" },
      { id: 2, date: "2099-01-01", type: "Cancelled appointment", status: "cancelled" },
      { id: 3, date: "2099-01-02", time: "10:00", type: "Follow-up", providerId: 7, visitMode: "telemedicine", status: "scheduled" },
    ],
    onBookAppointment: () => {},
  });
  assert.match(html, /2 visits recorded/);
  assert.ok(html.indexOf("Check-up") < html.indexOf("First visit"));
  for (const value of ["Dr Example", "112/70", "58.4 kg", "24 cm", "14 weeks", "Review next month.", "Follow-up: 03 Mar 2025", "02 Jan 2099", "10:00", "Video call", "Book an appointment"]) {
    assert.ok(html.includes(value), value);
  }
  assert.doesNotMatch(html, /Past appointment|Cancelled appointment|112\/68|Add a past visit|Add to calendar/);
});

test("visit page distinguishes empty, loading and failed records", () => {
  const empty = renderRecord({ initialSection: "history" });
  assert.match(empty, /0 visits recorded/);
  assert.match(empty, /Your visit history will appear here/);
  assert.match(empty, /No upcoming appointment/);
  const loading = renderRecord({ initialSection: "history", visitHistoryLoading: true, appointmentsLoading: true });
  assert.match(loading, /Loading visits/);
  assert.doesNotMatch(loading, /0 visits recorded|No upcoming appointment/);
  const failed = renderRecord({
    initialSection: "history",
    visitHistoryError: true,
    appointmentsError: true,
    onRetryVisits: () => {},
    onRetryAppointments: () => {},
  });
  assert.match(failed, /Unable to load your visits/);
  assert.match(failed, /Unable to load appointments/);
  assert.equal((failed.match(/>Retry<\/button>/g) || []).length, 2);
  assert.doesNotMatch(failed, /0 visits recorded|No upcoming appointment/);
});

test("program shortcuts open their requested pregnancy category", () => {
  for (const [category, expected] of [["Move", "Prenatal strength"], ["Nourish", "Iron-rich foods"]] as const) {
    const html = renderToStaticMarkup(<PatientPrograms pregnancy week={14} mode="pregnancy" initialCategory={category} />);
    assert.ok(html.includes(expected), category);
  }
  const overview = renderToStaticMarkup(<PatientPrograms pregnancy week={14} mode="pregnancy" />);
  assert.doesNotMatch(overview, /Iron-rich foods/);
});

test("pregnancy nutrition uses the supplied design without invented results or pricing", () => {
  const html = renderToStaticMarkup(<PatientPrograms pregnancy week={14} mode="pregnancy" initialCategory="Nourish" onOpenLabReports={() => {}} onBookNutrition={() => {}} />);
  for (const content of ["Week 14", "Iron-rich foods", "Today&#x27;s basics", "Go gently with", "Your meal plan", "From your record", "Pick what you need", "Good to know", "See my results", "Book a session"]) {
    assert.ok(html.includes(content), content);
  }
  assert.match(html, /not available here yet/);
  assert.doesNotMatch(html, /haemoglobin is worth a chat|\[PRICE\]|Unlock Plus/);
  const unknownWeek = renderToStaticMarkup(<PatientPrograms pregnancy week={null} mode="pregnancy" initialCategory="Nourish" />);
  assert.doesNotMatch(unknownWeek, /Week 24/);
  const nonPregnancy = renderToStaticMarkup(<PatientPrograms pregnancy={false} week={null} initialCategory="Nourish" />);
  assert.match(nonPregnancy, /Food that works/);
});

test("purchased nutrition design is explicitly a sample preview, not an active purchase", () => {
  const html = renderToStaticMarkup(<PatientNutritionPlusPreview onBack={() => {}} />);
  for (const content of ["Plus preview", "Example only", "Today&#x27;s plan", "This week&#x27;s shopping list", "Your food choices", "Your nutritionist", "No lab results were used"]) {
    assert.ok(html.includes(content), content);
  }
  assert.doesNotMatch(html, /Plus active|haemoglobin was flagged/i);
  for (const action of ["Swap", "Open list", "Edit choices", "Message"]) {
    assert.match(html, new RegExp(`<button[^>]*disabled=""[^>]*>${action}</button>`));
  }
});

test("care team page does not display an unreviewed AI risk label", () => {
  const html = renderToStaticMarkup(
    <PregnancyCareDashboard
      patient={{ riskScore: { level: "Critical", patientSummary: "AI assessment" } }}
      week={14}
      appointments={[]}
      medications={[]}
      labResults={[]}
      visitHistory={[]}
      weightLogs={[]}
      onBook={() => {}}
      onOpenTrack={() => {}}
      onOpenRecords={() => {}}
    />,
  );
  assert.doesNotMatch(html, /Critical risk|AI assessment|Updated by AI/);
  assert.match(html, /Book an appointment/);
});
