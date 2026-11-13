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
  client.setQueryData(["/api/expenses", owner ? "owner" : "reception", `${today.slice(0, 7)}-01`, today], rows);
  try { return renderToStaticMarkup(<QueryClientProvider client={client}><Expenses owner={owner} /></QueryClientProvider>); }
  finally { client.clear(); }
}
const expense: ExpenseRecord = { id: 1, date: clinicDate(), category: "Supplies", entryType: "general", description: "Office stationery", amount: 120.5, paymentMethod: "cash", receiptName: "receipt.pdf", createdAt: null, createdBy: "staff" };

test("receptionists can enter all expense fields and see totals and receipts, but no edit/delete actions", () => {
  const html = render(false, [expense]);
  for (const label of ["Add expense", "Amount (INR)", "Category", "Description", "Payment method", "Receipt (optional)", "Save expense", "Office stationery", "Download receipt", "Daily totals", "From", "To", "120.50"]) assert.ok(html.includes(label), label);
  assert.ok(!html.includes("Clinic expense dashboard"));
  assert.ok(!html.includes(">Edit<"));
  assert.ok(!html.includes(">Delete<"));
});

test("owners can understand expense totals and breakdowns and correct or delete expenses", () => {
  const html = render(true, [expense, { ...expense, id: 2, date: `${clinicDate().slice(0, 7)}-01`, entryType: "monthly_expense", category: "Utilities", description: "Electricity bill", amount: 2500 }]);
  for (const label of ["Clinic expense dashboard", "Total expenses", "Monthly bills", "Day-to-day spend", "Period average / day", "Where the money goes", "Daily spend trend", "Latest 14 spending days", "₹2,620.50", "₹2,500.00"]) assert.ok(html.includes(label), label);
  assert.ok(html.includes(">Edit<"));
  assert.ok(html.includes(">Delete<"));
  assert.ok(html.includes("Office stationery"));
  assert.ok(html.includes("Monthly expense"));
  assert.ok(html.includes("Electricity bill"));
  assert.ok(html.includes(clinicDate().slice(0, 7)));
  assert.ok(!html.includes("Quantity used this month"));
  assert.ok(!html.includes("Monthly item usage"));
});

test("daily item purchases keep their purchase date and show purchased quantities", () => {
  const html = render(true, [{ ...expense, entryType: "daily_purchase", itemName: "Coffee", unit: "boxes", quantity: 2, unitPrice: 75 }]);
  assert.ok(html.includes("Daily item purchase"));
  assert.ok(html.includes("Coffee"));
  assert.ok(html.includes("2 boxes x"));
  assert.ok(!html.includes("Quantity used this month"));
});

test("empty daily ledger is explicit and shows a zero total", () => {
  const html = render(false, []);
  assert.ok(html.includes("No expenses recorded for these dates."));
  assert.ok(html.includes("0.00"));
});
