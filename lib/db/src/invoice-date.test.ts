import assert from "node:assert/strict";
import test from "node:test";
import { canBackdateInvoice, invoiceDateBounds, invoiceDateError, resolveInvoiceDate } from "./invoice-date";

test("financial year starts on 1 April in India, including the UTC midnight boundary", () => {
  assert.deepEqual(invoiceDateBounds(new Date("2026-03-31T18:29:59Z")), { today: "2026-03-31", earliest: "2025-04-01" });
  assert.deepEqual(invoiceDateBounds(new Date("2026-03-31T18:30:00Z")), { today: "2026-04-01", earliest: "2026-04-01" });
  assert.deepEqual(invoiceDateBounds(new Date("2027-01-01T00:00:00Z")), { today: "2027-01-01", earliest: "2026-04-01" });
});

test("bill dates must be real calendar dates within the current financial year and not in the future", () => {
  const now = new Date("2026-11-09T12:00:00Z");
  for (const date of ["2026-04-01", "2026-07-12", "2026-11-09"]) assert.equal(invoiceDateError(date, now), null);
  for (const date of [null, 20261109, "", "2026-4-01", "2026-02-30", "2026-04-31", "2026-00-01", "2026-13-01", "2026-03-31", "2026-11-10", "2026-11-09T00:00:00Z"]) {
    assert.ok(invoiceDateError(date, now), `Should reject ${date}`);
  }
  assert.equal(invoiceDateError("2024-02-29", new Date("2024-03-01T00:00:00Z")), null);
  assert.ok(invoiceDateError("2025-02-29", new Date("2025-03-01T00:00:00Z")));
});

test("backdating is restricted to receptionist, legacy reception staff and owner roles", () => {
  const now = new Date("2026-11-09T12:00:00Z");
  for (const role of ["staff", "receptionist", "owner"]) {
    assert.equal(canBackdateInvoice(role), true);
    assert.deepEqual(resolveInvoiceDate("2026-04-01", role, now), { date: "2026-04-01" });
  }
  for (const role of ["clinician", "nurse", "nutritionist", "admin", "", "patient"]) {
    assert.equal(canBackdateInvoice(role), false);
    const result = resolveInvoiceDate("2026-04-01", role, now);
    assert.ok("error" in result);
    assert.equal(result.status, 403);
    assert.deepEqual(resolveInvoiceDate("2026-11-09", role, now), { date: "2026-11-09" });
  }
});

test("omitted bill dates default to India today, but explicit empty or invalid dates fail", () => {
  const now = new Date("2026-11-08T19:00:00Z");
  assert.deepEqual(resolveInvoiceDate(undefined, "staff", now), { date: "2026-11-09" });
  assert.deepEqual(resolveInvoiceDate("2026-11-09", "clinician", now), { date: "2026-11-09" });
  for (const date of ["", null, "2026-11-10", "2026-03-31"]) {
    const result = resolveInvoiceDate(date, "owner", now);
    assert.ok("error" in result);
    assert.equal(result.status, 400);
  }
});
