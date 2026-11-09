import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceptionMedicinesEmptyState, ReceptionPatientDetailsTabs } from "./ReceptionPatientDetails";
import { Tabs } from "./ui/tabs";
import { clinicalCareMode } from "@/lib/clinicalCareMode";

test("non-pregnant patient details omit Pregnancy while retaining the other tabs", () => {
  for (const type of ["General", "Gynecology", "PCOS", "Fertility", "IVF", "Postpartum", "MTP"]) {
    const html = renderToStaticMarkup(<Tabs defaultValue="visits"><ReceptionPatientDetailsTabs pregnancy={clinicalCareMode({ type }) === "pregnancy"} /></Tabs>);
    assert.ok(!html.includes(">Pregnancy<"), type);
    for (const label of ["Visit dates", "Patient history", "Medicines", "Reports", "Vaccines"]) assert.ok(html.includes(`>${label}<`), `${type}: ${label}`);
  }
});

test("pregnant patient details retain the Pregnancy tab", () => {
  for (const patient of [{ type: "Pregnancy" }, { type: "Antenatal" }, { type: "General", pregnancyStatus: "Pregnant" }]) {
    const html = renderToStaticMarkup(<Tabs defaultValue="visits"><ReceptionPatientDetailsTabs pregnancy={clinicalCareMode(patient) === "pregnancy"} /></Tabs>);
    assert.ok(html.includes(">Pregnancy<"));
  }
});

test("reception medicines uses a read-only empty card even when non-prescribing visits exist", () => {
  for (const visits of [[], [{ id: 1 }], [{ id: 1, prescriptions: [] }], [{ prescriptions: { medicines: [{ name: "" }] } }]]) {
    const html = renderToStaticMarkup(<ReceptionMedicinesEmptyState medicines={[]} visits={visits} onVisitDates={() => {}} />);
    assert.ok(html.includes('aria-label="No medicines recorded"'));
    assert.ok(html.includes("No medicines recorded"));
    assert.ok(html.includes("does not confirm that the patient takes no medicines"));
    assert.ok(html.includes("patient-reported medicines"));
    assert.ok(html.includes("View visit dates"));
    assert.ok(html.includes('data-records-scenario="medicines"'));
    assert.ok(html.includes('data-patient-context="general"'));
    assert.ok(html.includes('data-illustration-part="woman"'));
    assert.ok(!html.includes("Add medicine"));
  }
});

test("reception medicine artwork follows the patient's pregnancy context", () => {
  const html = renderToStaticMarkup(<ReceptionMedicinesEmptyState medicines={[]} visits={[]} pregnancy onVisitDates={() => {}} />);
  assert.ok(html.includes('data-patient-context="pregnancy"'));
  assert.ok(html.includes('data-illustration-part="medicines"'));
});

test("reception medicines does not show the empty card for medicines or either prescription format", () => {
  for (const [medicines, visits] of [
    [[{ id: 1, name: "Synthetic medicine" }], []],
    [[], [{ prescriptions: [{ name: "Synthetic medicine" }] }]],
    [[], [{ prescriptions: { medicines: ["Synthetic medicine"] } }]],
  ]) {
    const html = renderToStaticMarkup(<ReceptionMedicinesEmptyState medicines={medicines} visits={visits} onVisitDates={() => {}} />);
    assert.equal(html, "");
  }
});
