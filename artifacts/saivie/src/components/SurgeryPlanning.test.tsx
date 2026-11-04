import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SurgeryPlanningPage } from "./SurgeryPlanning";

const plan = {
  id: 2, patientId: 7, procedureName: "Synthetic procedure", plannedDate: "2027-05-10",
  surgeonId: 3, surgeonName: "Synthetic surgeon", notes: "Saved rationale",
  status: "planned", completedAt: null, closedAt: null, createdAt: "2026-11-03", updatedAt: "2026-11-03",
  team: { nursing_home: null, anesthetist: null, pediatrician: null, ot_assistant: null },
};

function render({ pregnancy = true, status = "", ready = true }: { pregnancy?: boolean; status?: string; ready?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["/api/patients", 7, "surgeries"], status ? [{ ...plan, status }] : []);
  client.setQueryData(["/api/providers", "surgery-planning"], [{ id: 3, name: "Synthetic surgeon" }]);
  client.setQueryData(["/api/surgery-care-network"], []);
  try {
    return renderToStaticMarkup(<QueryClientProvider client={client}><SurgeryPlanningPage
      patient={{ id: 7, name: "Synthetic patient", lmp: "2026-08-10" }} pregnancy={pregnancy}
      onConsultation={() => {}} onRecord={() => {}} onInvestigations={() => {}} onVitals={() => {}}
      appointments={[{ id: 1, date: "2099-01-01", type: "Synthetic USG", status: "scheduled" }, { id: 2, date: "2099-01-02", type: "Cancelled test", status: "cancelled" }]}
      appointmentsReady={ready}
    /></QueryClientProvider>);
  } finally { client.clear(); }
}

test("surgery workspace uses an in-page form and discloses unavailable workflows", () => {
  const html = render();
  assert.match(html, /data-testid="surgery-planning-page"/);
  assert.match(html, /What are you planning/);
  assert.match(html, /Readiness checklist/);
  assert.match(html, /Plan summary/);
  assert.match(html, /Not assessed/);
  assert.match(html, /Draft saving is not available/);
  assert.match(html, /Theatre requests are not available/);
  assert.match(html, /id="surgery-plan-form-7"/);
  assert.match(html, /form="surgery-plan-form-7"/);
  assert.match(html, /Synthetic USG/);
  assert.doesNotMatch(html, /Cancelled test|role="dialog"|0\/9|5 blockers/);
});

test("non-pregnancy surgery does not show delivery or gestational shortcuts", () => {
  const html = render({ pregnancy: false });
  assert.match(html, /Gynae surgery/);
  assert.match(html, /Other procedure/);
  assert.match(html, /Previous procedure details/);
  assert.doesNotMatch(html, /Mode of delivery|37w 0d|EDD|Previous delivery details/);
});

test("saved surgery lifecycle controls remain available and one-open-plan behavior is retained", () => {
  const planned = render({ status: "planned" });
  assert.match(planned, /Edit plan/);
  assert.match(planned, /Mark surgery completed/);
  assert.match(planned, /Cancel surgery/);
  assert.match(planned, /Saved rationale/);
  assert.doesNotMatch(planned, /id="surgery-plan-form-7"/);
  const recovery = render({ status: "completed" });
  assert.match(recovery, /Discharge from recovery/);
  assert.doesNotMatch(recovery, /Mark surgery completed|id="surgery-plan-form-7"/);
});

test("unavailable appointments do not appear as confirmed bookings", () => {
  const html = render({ ready: false });
  assert.match(html, /Appointment records unavailable or loading/);
  assert.doesNotMatch(html, /Synthetic USG/);
});
