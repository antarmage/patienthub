import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { receptionFollowUpPatients, registerReceptionFollowUpRoutes } from "./reception-follow-up";

const patients = [
  { id: 1, name: "Recent", phone: "100", lastVisit: "2026-10-19", pregnancyStatus: "not-pregnant" },
  { id: 2, name: "Pregnant", phone: null, lastVisit: "2026-10-18", pregnancyStatus: "pregnant" },
  { id: 3, name: "No visit", phone: null, lastVisit: null, pregnancyStatus: "pregnant" },
  { id: 4, name: "Delivered", phone: null, lastVisit: null, pregnancyStatus: "delivered" },
  { id: 5, name: "Unknown", phone: null, lastVisit: "invalid", pregnancyStatus: null },
  { id: 6, name: "Active pregnancy", phone: null, lastVisit: null, pregnancyStatus: "active" },
];

test("recent visitors use exactly 14 India calendar dates, deduplicate and exclude future/unattended appointments", () => {
  const result = receptionFollowUpPatients(patients, [
    { patientId: 1, date: "2026-11-01", status: "completed" },
    { patientId: 1, date: "2026-11-02", status: "completed" },
    { patientId: 2, date: "2026-10-31", status: "scheduled" },
    { patientId: 5, date: "2026-10-31", status: "cancelled" },
  ], [{ patientId: 4, date: "2026-10-19" }], "2026-11-01");
  assert.equal(result.startDate, "2026-10-19");
  assert.deepEqual(result.recent.map((row) => [row.patientId, row.lastVisit]), [[1, "2026-11-01"], [4, "2026-10-19"]]);
  assert.deepEqual(result.pregnant.map((row) => row.patientId), [2, 6, 3]);
  assert.equal(result.pregnant[1].lastVisit, null);
  assert.deepEqual(Object.keys(result.recent[0]).sort(), ["lastVisit", "name", "patientId", "phone", "pregnant"]);
});

test("follow-up patient lists require persisted staff roles and never expose clinical records", async () => {
  const app = express();
  let reads = 0;
  registerReceptionFollowUpRoutes(app, {
    authenticate: async (req) => req.headers.authorization === "staff" ? { userId: "staff", role: "staff" } : req.headers.authorization === "patient" ? { patientId: 1 } : null,
    patients: async () => { reads++; return patients; },
    appointments: async () => [],
    visits: async () => [],
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/reception/follow-up-patients`;
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: "patient" } })).status, 403);
    assert.equal(reads, 0);
    const response = await fetch(url, { headers: { Authorization: "staff" } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.json();
    assert.ok(body && typeof body === "object" && "pregnant" in body && Array.isArray(body.pregnant));
    assert.equal(body.pregnant.length, 3);
    assert.equal("pregnancyStatus" in body.pregnant[0], false);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
