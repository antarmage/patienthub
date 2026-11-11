import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { registerExpenseRoutes, type ExpenseReceipt, type ExpenseStore } from "./expenses";
import { expenseDraftSchema, expenseRecordSchema, expenseTotals, type ExpenseRecord } from "../../../lib/db/src/expenses";

test("expense validation requires positive amounts, real nonfuture dates and explicit payment details", () => {
  const draft = { date: "2026-04-01", amount: "12.34", category: "Supplies", description: "Office stationery", paymentMethod: "cash" };
  assert.equal(expenseDraftSchema.parse(draft).amount, 12.34);
  for (const changes of [{ amount: true }, { amount: "" }, { amount: 0 }, { amount: -1 }, { amount: 1.234 }, { amount: Infinity }, { date: "2026-02-30" }, { date: "2099-01-01" }, { description: " " }, { category: "" }, { paymentMethod: "invalid" }, { createdBy: "someone-else" }, { receiptName: "untrusted.pdf" }]) {
    assert.equal(expenseDraftSchema.safeParse({ ...draft, ...changes }).success, false, JSON.stringify(changes));
  }
});

test("itemized purchases and monthly usage require complete item details and calculate totals", () => {
  const draft = { date: "2026-04-01", amount: 1, category: "Supplies", description: "Monthly usage", paymentMethod: "cash", itemName: "Tea", unit: "packs", quantity: "3.5", unitPrice: "120.00" };
  assert.equal(expenseDraftSchema.parse(draft).amount, 420);
  assert.equal(expenseDraftSchema.parse({ ...draft, entryType: "daily_purchase", date: "2026-04-02" }).date, "2026-04-02");
  assert.equal(expenseDraftSchema.parse({ ...draft, entryType: "daily_purchase" }).entryType, "daily_purchase");
  assert.equal(expenseDraftSchema.parse(draft).entryType, "general");
  assert.equal(expenseDraftSchema.safeParse({ ...draft, entryType: "unexpected" }).success, false);
  for (const changes of [{ unit: undefined }, { quantity: "0" }, { unitPrice: "1.239" }, { itemName: " " }]) {
    assert.equal(expenseDraftSchema.safeParse({ ...draft, ...changes }).success, false, JSON.stringify(changes));
  }
});

test("daily and range totals use paise and are ordered by expense date", () => {
  const base: ExpenseRecord = { id: 1, date: "2026-04-02", amount: 0.1, category: "Other", entryType: "general", description: "", paymentMethod: "cash", receiptName: null, createdAt: null, createdBy: null };
  assert.deepEqual(expenseTotals([base, { ...base, id: 2, amount: 0.2 }, { ...base, id: 3, date: "2026-04-01", amount: 10 }]), {
    total: 10.3, daily: [{ date: "2026-04-02", amount: 0.3 }, { date: "2026-04-01", amount: 10 }],
  });
  assert.deepEqual(expenseTotals([]), { total: 0, daily: [] });
});

test("expense API authorizes before uploads, persists validated entries and restricts corrections to owners", async () => {
  const rows = new Map<number, ExpenseRecord>();
  const receipts = new Map<number, ExpenseReceipt>();
  let nextId = 1;
  const store: ExpenseStore = {
    async list(start, end) { return [...rows.values()].filter((row) => row.date >= start && row.date <= end); },
    async save(draft, userId, receipt, id) {
      if (id !== undefined && !rows.has(id)) return undefined;
      const previous = id === undefined ? undefined : rows.get(id);
      const record = { ...draft, id: id ?? nextId++, createdAt: previous?.createdAt || new Date().toISOString(), createdBy: previous?.createdBy || userId, receiptName: receipt?.name || previous?.receiptName || null };
      rows.set(record.id, record);
      if (receipt) receipts.set(record.id, receipt);
      return record;
    },
    async remove(id) { receipts.delete(id); return rows.delete(id); },
    async receipt(id) { return receipts.get(id); },
  };
  const app = express();
  app.use(express.json());
  registerExpenseRoutes(app, async (req, res) => {
    const role = req.headers["x-test-role"];
    if (typeof role !== "string") { res.status(401).json({ error: "Sign in." }); return null; }
    return { userId: `user-${role}`, role };
  }, store);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const root = `http://127.0.0.1:${address.port}`;
  const request = (path: string, role?: string, method = "GET", body?: unknown) => fetch(`${root}${path}`, {
    method, headers: { ...(role ? { "x-test-role": role } : {}), ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  });
  const range = "?startDate=2026-04-01&endDate=2026-04-30";
  const draft = { date: "2026-04-02", amount: 123.45, category: "Supplies", description: "Office stationery", paymentMethod: "upi" };
  try {
    assert.equal((await request(`/api/expenses${range}`)).status, 401);
    for (const role of ["patient", "clinician", "admin", "nurse"]) {
      assert.equal((await request(`/api/expenses${range}`, role)).status, 403);
      assert.equal((await request("/api/expenses", role, "POST", draft)).status, 403);
    }
    assert.equal(rows.size, 0);
    assert.equal((await request("/api/expenses", "staff", "POST", { ...draft, amount: -1 })).status, 400);
    assert.equal((await request("/api/expenses", "staff", "POST", { ...draft, createdBy: "owner" })).status, 400);
    const createdResponse = await request("/api/expenses", "receptionist", "POST", draft);
    assert.equal(createdResponse.status, 201);
    const created = expenseRecordSchema.parse(await createdResponse.json());
    assert.equal(created.amount, 123.45);
    assert.equal(created.createdBy, "user-receptionist");
    for (const role of ["receptionist", "staff", "owner"]) {
      assert.equal((await request(`/api/expenses${range}`, role)).status, 200);
      assert.equal(expenseRecordSchema.array().parse(await (await request(`/api/expenses${range}`, role)).json()).length, 1);
    }
    assert.equal(expenseRecordSchema.array().parse(await (await request("/api/expenses?startDate=2026-05-01&endDate=2026-05-31", "owner")).json()).length, 0);
    for (const path of ["/api/expenses", "/api/expenses?startDate=2026-02-30&endDate=2026-04-30", "/api/expenses?startDate=2026-05-01&endDate=2026-04-01"]) {
      assert.equal((await request(path, "owner")).status, 400);
    }
    for (const role of ["staff", "receptionist"]) {
      assert.equal((await request(`/api/expenses/${created.id}`, role, "PATCH", draft)).status, 403);
      assert.equal((await request(`/api/expenses/${created.id}`, role, "DELETE")).status, 403);
      assert.equal((await request(`/api/owner/expenses${range}`, role)).status, 403);
      assert.equal((await request("/api/owner/expenses", role, "POST", draft)).status, 403);
    }
    assert.equal((await request(`/api/expenses/${created.id}`, "owner", "PATCH", { ...draft, amount: 150 })).status, 200);
    assert.equal(rows.get(created.id)?.amount, 150);
    assert.equal(rows.get(created.id)?.createdBy, "user-receptionist");
    const fileBody = (bytes: string, name = "receipt.pdf", type = "application/pdf") => {
      const form = new FormData();
      for (const [key, value] of Object.entries(draft)) form.set(key, String(value));
      form.set("receipt", new Blob([bytes], { type }), name);
      return form;
    };
    const receiptBytes = "%PDF-1.4\nsynthetic receipt\n%%EOF";
    const uploaded = await request("/api/expenses", "staff", "POST", fileBody(receiptBytes));
    assert.equal(uploaded.status, 201);
    const rawReceipt = await uploaded.json();
    assert.ok(rawReceipt && typeof rawReceipt === "object");
    assert.ok(!("fileData" in rawReceipt));
    assert.ok(!("data" in rawReceipt));
    const withReceipt = expenseRecordSchema.parse(rawReceipt);
    assert.equal(withReceipt.receiptName, "receipt.pdf");
    assert.equal((await request(`/api/expenses/${withReceipt.id}/receipt`)).status, 401);
    const download = await request(`/api/expenses/${withReceipt.id}/receipt`, "receptionist");
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "application/pdf");
    assert.equal(download.headers.get("cache-control"), "no-store");
    assert.equal(await download.text(), receiptBytes);
    assert.equal((await request("/api/expenses", "staff", "POST", fileBody("<html>not a PDF</html>"))).status, 400);
    assert.equal((await request("/api/expenses", "staff", "POST", fileBody(receiptBytes, "fake.png", "image/png"))).status, 400);
    assert.equal((await request("/api/expenses", "staff", "POST", fileBody("%PDF-" + "x".repeat(5 * 1024 * 1024)))).status, 400);
    assert.equal((await request(`/api/expenses/${withReceipt.id}`, "owner", "PATCH", draft)).status, 200);
    assert.equal(await (await request(`/api/expenses/${withReceipt.id}/receipt`, "owner")).text(), receiptBytes);
    assert.equal((await request(`/api/expenses/${withReceipt.id}`, "owner", "DELETE")).status, 204);
    assert.equal((await request(`/api/expenses/${withReceipt.id}/receipt`, "owner")).status, 404);
    assert.equal((await request(`/api/expenses/${withReceipt.id}`, "owner", "DELETE")).status, 404);
    assert.equal((await request("/api/expenses/not-an-id", "owner", "PATCH", draft)).status, 400);
    assert.equal((await request("/api/expenses/999", "owner", "PATCH", draft)).status, 404);
    assert.equal((await request(`/api/owner/expenses${range}`, "owner")).status, 200);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
