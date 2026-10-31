import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { registerBillingTemplateRoutes, type BillingTemplateStore } from "./billing-templates";
import type { PersonalBillingTemplate } from "../../../lib/db/src/billing-templates";

test("personal template CRUD requires authentication, validates input and never operates as another user", async () => {
  const records = new Map<number, PersonalBillingTemplate & { userId: string }>();
  let nextId = 1;
  const store: BillingTemplateStore = {
    async list(userId) { return [...records.values()].filter((row) => row.userId === userId); },
    async save(userId, draft, id) {
      if (id != null && records.get(id)?.userId !== userId) return undefined;
      const record = { ...draft, userId, id: id ?? nextId++ };
      records.set(record.id, record);
      return record;
    },
    async remove(userId, id) { return records.get(id)?.userId === userId && records.delete(id); },
  };
  const app = express();
  app.use(express.json());
  registerBillingTemplateRoutes(app, async (req, res) => {
    const token = req.headers.authorization;
    if (token !== "Bearer staff-a" && token !== "Bearer staff-b") {
      res.status(401).json({ error: "Staff token required" });
      return null;
    }
    return token.slice(7);
  }, store);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/billing-templates`;
  const request = (token: string, suffix = "", method = "GET", body?: unknown) =>
    fetch(`${url}${suffix}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body == null ? {} : { body: JSON.stringify(body) }) });
  try {
    assert.equal((await fetch(url)).status, 401);
    const draft = { name: "Follow-up", groupName: "Gynecology", items: [{ catalogItemId: 1, quantity: 2 }] };
    const created = await request("staff-a", "", "POST", draft);
    assert.equal(created.status, 201);
    const record = await created.json();
    assert.ok(record && typeof record === "object" && "id" in record && typeof record.id === "number");
    assert.equal((await request("staff-b")).status, 200);
    assert.deepEqual(await (await request("staff-b")).json(), []);
    assert.equal((await request("staff-b", `/${record.id}`, "PATCH", draft)).status, 404);
    assert.equal((await request("staff-b", `/${record.id}`, "DELETE")).status, 404);
    assert.equal((await request("staff-a", `/${record.id}`, "PATCH", { ...draft, groupName: "Pregnancy" })).status, 200);
    const updated = await (await request("staff-a")).json();
    assert.ok(Array.isArray(updated));
    assert.equal(updated[0].groupName, "Pregnancy");
    assert.equal((await request("staff-a", "", "POST", { ...draft, userId: "staff-b" })).status, 400);
    assert.equal((await request("staff-a", "/1abc", "PATCH", draft)).status, 400);
    assert.equal((await request("staff-a", "", "POST", { ...draft, items: [] })).status, 400);
    assert.equal((await request("staff-a", `/${record.id}`, "DELETE")).status, 204);
    assert.deepEqual(await (await request("staff-a")).json(), []);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});
