import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { ReceptionPatientList } from "./ReceptionPatientList";
import { calendarDateValue } from "@/lib/calendarDates";
import type { ReceptionAppointment } from "@/lib/receptionTimeline";

function renderSearch(search: string, state: { patientsLoading?: boolean; patientsError?: boolean } = {}, appointments: ReceptionAppointment[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const today = calendarDateValue(new Date());
  client.setQueryData(["/api/appointments", "reception-timeline", today, today], appointments);
  const noop = () => {};
  try {
    return renderToStaticMarkup(<QueryClientProvider client={client}><Router ssrPath="/staff">
      <ReceptionPatientList
        patients={[{ id: 501, name: "Synthetic Patient", phone: "+91 98765 43210" }, { id: 502, name: "Another Patient" }]}
        providers={[]} patientsLoading={false} patientsError={false} {...state}
        search={search} onSearch={noop} onRetryPatients={noop} onRegister={noop}
        onPayment={noop} onWhatsApp={noop} onTranscribePrescription={noop}
        onRecordVitals={noop} onCheckIn={noop} onEditPatient={noop}
      />
    </Router></QueryClientProvider>);
  } finally {
    client.clear();
  }
}

test("reception search finds patients without any loaded appointments by name, formatted phone and ID", () => {
  for (const search of ["synthetic", "9876543210", "#501"]) {
    const html = renderSearch(search);
    assert.ok(html.includes('data-testid="reception-patient-search-501"'), search);
    assert.ok(!html.includes('data-testid="reception-patient-search-502"'), search);
    assert.ok(html.includes('/staff/booking?patientId=501'));
    assert.ok(!html.includes(">View patient details<"), "clinical detail action remains permission-gated");
  }
});

test("appointment results share normalized phone and exact ID matching", () => {
  const appointments = [{ id: 11, patientId: 501, providerId: null, date: calendarDateValue(new Date()), time: "09:00" }];
  for (const search of ["98765 43210", "#501"]) {
    assert.ok(renderSearch(search, {}, appointments).includes('data-testid="reception-patient-row-11"'), search);
  }
  assert.ok(!renderSearch("#50", {}, appointments).includes('data-testid="reception-patient-row-11"'));
});

test("reception search distinguishes no matches, loading and contact errors", () => {
  assert.ok(renderSearch("unknown").includes("No patients match your search."));
  const loading = renderSearch("synthetic", { patientsLoading: true });
  assert.ok(loading.includes("Searching patients..."));
  assert.ok(!loading.includes('data-testid="reception-patient-search-501"'));
  const failed = renderSearch("synthetic", { patientsError: true });
  assert.ok(failed.includes("Unable to search patients."));
  assert.ok(!failed.includes("No patients match your search."));
  assert.ok(!renderSearch(" ").includes('aria-label="Patient search results"'));
});
