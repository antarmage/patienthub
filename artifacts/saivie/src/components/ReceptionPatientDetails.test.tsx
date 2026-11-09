import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceptionMedicinesEmptyState } from "./ReceptionPatientDetails";

test("reception medicines uses a read-only empty card even when non-prescribing visits exist", () => {
  for (const visits of [[], [{ id: 1 }], [{ id: 1, prescriptions: [] }], [{ prescriptions: { medicines: [{ name: "" }] } }]]) {
    const html = renderToStaticMarkup(<ReceptionMedicinesEmptyState medicines={[]} visits={visits} onVisitDates={() => {}} />);
    assert.ok(html.includes('aria-label="No medicines recorded"'));
    assert.ok(html.includes("No medicines recorded"));
    assert.ok(html.includes("does not confirm that the patient takes no medicines"));
    assert.ok(html.includes("patient-reported medicines"));
    assert.ok(html.includes("View visit dates"));
    assert.ok(!html.includes("Add medicine"));
  }
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
