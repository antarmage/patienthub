import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReceptionDashboard, getArrivalState } from "./ReceptionDashboard";

test("receptionist dashboard exposes completion in patient flow and waiting queue without clinical visibility", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const noop = () => {};
  const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><ReceptionDashboard
      logisticsOnly clinicalDetailsVisible={false}
      appointments={[{ id: 11, patientId: 1, patient: "Synthetic", date: today, time: "09:00", status: "checked-in" },
        { id: 12, patientId: 1, patient: "Synthetic", date: today, time: "10:00", status: "in-consultation" },
        { id: 13, patientId: 1, patient: "Synthetic", date: today, time: "11:00", status: "scheduled" }]}
      patients={[{ id: 1, name: "Synthetic" }]} tasks={[]} followUps={[]} pendingAppointmentId={null}
      sheetStatus={null} syncResult={null} lastSyncedAt={null} isSyncing={false} onSync={noop}
      onUpdateAppointment={noop} onCheckIn={noop} onComplete={noop} onAfterVisit={noop}
      onRecordPrescription={noop} onUploadPrescription={noop} prescribedAppointmentIds={new Set()}
      onOpenTask={noop} onOpenPatient={noop} onRegisterPatient={noop} onUploadReport={noop}
      onViewSchedule={noop} onFindPatient={noop} onViewFollowUps={noop} upcomingAppointments={[]} onCallFollowUp={noop}
    /></QueryClientProvider>);
    assert.ok(html.includes('data-testid="flow-reception-complete-11"'));
    assert.ok(html.includes('data-testid="queue-reception-complete-11"'));
    assert.ok(html.includes('data-testid="flow-reception-complete-12"'));
    assert.ok(!html.includes('data-testid="flow-reception-complete-13"'));
  } finally { client.clear(); }
});

test("reception stages recognize status-only attendance and consultation records", () => {
  for (const status of ["seen", "in-consultation", "in-progress", "with_doctor"]) {
    assert.equal(getArrivalState({ status }), "in-consultation");
  }
  assert.equal(getArrivalState({ status: "arrived" }), "waiting");
  assert.equal(getArrivalState({ status: "completed", seenAt: "recorded" }), "completed");
});
