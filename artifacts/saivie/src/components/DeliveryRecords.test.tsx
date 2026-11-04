import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeliveryForm, DeliveryRecords } from "./DeliveryRecords";
import type { DeliveryRecord } from "../../../../lib/db/src/delivery";
import type { PregnancyEpisode } from "../../../../lib/db/src/pregnancy-episodes";
import { clinicalCareMode } from "@/lib/clinicalCareMode";
import { patientGestation } from "@/lib/clinicalPatientList";
import { getPregnancyReminders } from "@/lib/pregnancyMilestones";
import { bookingPatientCategory } from "@/lib/bookingPatients";

const pastEpisode: PregnancyEpisode = {
  id: 3, patientId: 1, version: 1, updatedAt: "2020-10-01", records: [],
  details: { number: 2, status: "past", startDate: "2020-01-01", endDate: "2020-10-01", lmp: "2020-01-01",
    dueDate: "2020-10-07", datingBasis: "LMP", outcome: "Not recorded", deliveryMode: "Not recorded", conceptionMethod: "", notes: "" },
};
function render(element: React.ReactNode, records: DeliveryRecord[] = [], current = true, extra: PregnancyEpisode[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["/api/patients", 1, "pregnancy-episodes"], [{
    id: 2, patientId: 1, version: 1, details: { number: 1, status: current ? "current" : "past", fetusCount: 2 },
  }, ...extra]);
  client.setQueryData(["/api/patients", 1, "deliveries"], records);
  try { return renderToStaticMarkup(<QueryClientProvider client={client}>{element}</QueryClientProvider>); }
  finally { client.clear(); }
}
test("delivery form requires explicit outcomes, supports multiple babies and explains automatic status changes", () => {
  const html = render(<DeliveryForm patientId={1} initialDate="2020-10-01" forcedMode="Caesarean" pending={false} onSubmit={() => {}} onCancel={() => {}} />);
  assert.match(html, /Saving ends this pregnancy and starts postpartum care/);
  assert.match(html, /Select outcome/);
  assert.match(html, /Add another baby/);
  assert.match(html, /India time/);
  assert.match(html, /Sex at birth/);
  assert.match(html, /Birth weight \(grams/);
  assert.match(html, /Delivery place/);
  assert.match(html, /Complications/);
  assert.match(html, /No appointment or message is sent automatically/);
  assert.match(html, /Confirm caesarean delivery &amp; completion/);
  assert.doesNotMatch(html, /value="Live birth" selected/);
});

test("delivery workspace shows distinct current and past pregnancy cards with baby entry actions", () => {
  const html = render(<DeliveryRecords patientId={1} />, [], true, [pastEpisode]);
  assert.match(html, /aria-label="Pregnancy 1 delivery"/);
  assert.match(html, /aria-label="Pregnancy 2 delivery"/);
  assert.match(html, /Record another outcome/);
  assert.match(html, /Record outcome \/ Not known/);
  assert.match(html, /What you will record/);
  assert.match(html, /Birth date · sex · birth weight · outcome/);
  assert.match(html, /data-records-scenario="deliveries"/);
  assert.match(html, /data-illustration-part="empty-cradle"/);
  assert.match(html, /viewBox="0 0 170 150"/);
  assert.match(html, /Vaccines · not included yet/);
});

test("historical delivery entry explicitly preserves current care and omits current postpartum review", () => {
  const html = render(<DeliveryForm patientId={1} episode={pastEpisode} initialDate="2020-10-01" pending={false} onSubmit={() => {}} onCancel={() => {}} />);
  assert.match(html, /Current pregnancy, care status and review date remain unchanged/);
  assert.doesNotMatch(html, /Saving ends this pregnancy|Postpartum review date/);
});
test("delivery form blocks missing current pregnancy and baby records retain separate outcomes", () => {
  const missing = render(<DeliveryForm patientId={1} pending={false} onSubmit={() => {}} onCancel={() => {}} />, [], false);
  assert.match(missing, /No current pregnancy episode/);
  assert.match(missing, /type="submit" disabled/);
  const records: DeliveryRecord[] = [{
    id: 1, patientId: 1, episodeId: 2, surgeryPlanId: null, version: 1,
    deliveryDate: "2020-10-01", deliveryMode: "Vaginal", postpartumReviewDate: null,
    babies: [
      { name: "Synthetic baby", birthDate: "2020-10-01", birthTime: "10:00", outcome: "Live birth", deathDate: "2020-10-03" },
      { name: "", birthDate: "2020-10-01", birthTime: null, outcome: "Stillbirth", deathDate: null },
    ],
  }];
  const html = render(<DeliveryRecords patientId={1} />, records, false);
  assert.match(html, /Baby 1.*Synthetic baby/);
  assert.match(html, /Baby 2.*Stillbirth/);
  assert.match(html, /Died 2020-10-03 \(age 2 days\)/);
  assert.match(html, /Update baby records/);
  assert.match(html, /Postpartum review: Not scheduled/);
  assert.doesNotMatch(html, /Record delivery \(vaginal or other\)/);
});

test("postpartum projection suppresses antenatal gestation/reminders while retaining historical LMP", () => {
  const pregnant = { id: 1, name: "Synthetic patient", type: "Pregnant", pregnancyStatus: "pregnant", lmp: "2020-01-01" };
  const postpartum = { ...pregnant, type: "Postpartum", pregnancyStatus: "completed" };
  const today = new Date("2020-06-01T12:00:00+05:30");
  assert.ok(getPregnancyReminders([pregnant], today).length > 0);
  assert.deepEqual(getPregnancyReminders([postpartum], today), []);
  assert.equal(clinicalCareMode(postpartum), "postpartum");
  assert.equal(bookingPatientCategory(postpartum), "Postpartum");
  assert.equal(patientGestation(postpartum, "2020-06-01").pregnant, false);
  assert.equal(postpartum.lmp, "2020-01-01");
});
