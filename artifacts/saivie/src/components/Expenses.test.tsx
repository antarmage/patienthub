import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Expenses } from "./Expenses";
import { clinicDate } from "../../../../lib/db/src/follow-up";
import type { ExpenseRecord } from "../../../../lib/db/src/expenses";

function render(owner: boolean, rows: ExpenseRecord[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const today = clinicDate();
  client.setQueryData(["/api/expenses", owner ? "owner" : "reception", today, today], rows);
  try { return renderToStaticMarkup(<QueryClientProvider client={client}><Expenses owner={owner} /></QueryClientProvider>); }
  finally { client.clear(); }
}
const expense: ExpenseRecord = { id: 1, date: clinicDate(), category: "Supplies", description: "Office stationery", amount: 120.5, paymentMethod: "cash", receiptName: "receipt.pdf", createdAt: null, createdBy: "staff" };

test("receptionists can enter all expense fields and see totals and receipts, but no edit/delete actions", () => {
  const html = render(false, [expense]);
  for (const label of ["Add expense", "Amount (INR)", "Category", "Description", "Payment method", "Receipt (optional)", "Save expense", "Office stationery", "Download receipt", "Daily totals", "From", "To", "120.50"]) assert.ok(html.includes(label), label);
  assert.ok(!html.includes(">Edit<"));
  assert.ok(!html.includes(">Delete<"));
});

test("owners can correct or delete expenses in the shared tracking view", () => {
  const html = render(true, [expense]);
  assert.ok(html.includes(">Edit<"));
  assert.ok(html.includes(">Delete<"));
  assert.ok(html.includes("Office stationery"));
});

test("empty daily ledger is explicit and shows a zero total", () => {
  const html = render(false, []);
  assert.ok(html.includes("No expenses recorded for these dates."));
  assert.ok(html.includes("0.00"));
});
