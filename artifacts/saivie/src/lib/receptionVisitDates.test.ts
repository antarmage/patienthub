import assert from "node:assert/strict";
import test from "node:test";
import { receptionVisitDates } from "./receptionVisitDates";

test("visit dates are newest first, grouping same-day records without mutating the API list", () => {
  const visits = [{ id: 1, date: "2025-12-31" }, { id: 2, date: "2026-11-01" }, { id: 3, date: "2026-11-01" }];
  const groups = receptionVisitDates(visits);
  assert.deepEqual(groups.map((group) => group.date), ["2026-11-01", "2025-12-31"]);
  assert.equal(groups[0].label, "1 Nov 2026");
  assert.deepEqual(groups[0].records.map((visit) => visit.id), [2, 3]);
  assert.equal(visits[0].id, 1);
});

test("missing and invalid visit dates remain visible without fabricated dates", () => {
  const groups = receptionVisitDates([{ date: "2026-02-30" }, {}, { date: "2026-01-01" }]);
  assert.deepEqual(groups.map((group) => group.date), ["2026-01-01", ""]);
  assert.equal(groups[1].label, "Date not recorded");
  assert.equal(groups[1].records.length, 2);
  assert.deepEqual(receptionVisitDates([]), []);
});
