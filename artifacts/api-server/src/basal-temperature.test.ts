import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { basalTemperatureInputSchema, basalTemperatureRecordSchema } from "../../../lib/db/src/basal-temperature";
import { registerBasalTemperature, type createBasalTemperatureStore } from "./basal-temperature";

const input = { temperature: 36.52, unit: "C", measuredAt: "2026-01-01T07:30:00+05:30", notes: "  Before getting up  " };

test("basal temperature validates units, decimals, time and notes", () => {
  const result = basalTemperatureInputSchema.parse(input);
  assert.equal(result.temperature, 36.52);
  assert.equal(result.notes, "Before getting up");
  assert.ok(basalTemperatureInputSchema.safeParse({ ...input, temperature: 97.74, unit: "F" }).success);
  for (const invalid of [
    { ...input, temperature: 97.74 },
    { ...input, temperature: 36.52, unit: "F" },
    { ...input, measuredAt: "invalid" },
    { ...input, measuredAt: new Date(Date.now() + 86400000).toISOString() },
    { ...input, patientId: 2 },
  ]) assert.equal(basalTemperatureInputSchema.safeParse(invalid).success, false);
});

test("temperature routes save the owning patient's readings and reject cross-patient access", async () => {
  const app = express();
  app.use(express.json());
  const readings: Awaited<ReturnType<ReturnType<typeof createBasalTemperatureStore>["list"]>> = [];
  const store: ReturnType<typeof createBasalTemperatureStore> = {
    list: async () => readings,
    create: async (id, value) => {
      assert.equal(id, 1);
      const record = { ...value, id: readings.length + 1, measuredAt: new Date(value.measuredAt).toISOString() };
      readings.push(record);
      return record;
    },
  };
  registerBasalTemperature(app, store, async (req) =>
    req.headers.authorization === "patient" ? { patientId: 1 }
      : req.headers.authorization === "other" ? { patientId: 2 }
        : req.headers.authorization === "doctor" ? { userId: "doctor", role: "clinician" } : null);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (method: string, role?: string, body?: unknown) => fetch(`http://127.0.0.1:${address.port}/api/patients/1/basal-temperature-logs`, {
    method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    for (const role of [undefined, "other", "doctor"]) {
      for (const method of ["GET", "POST"]) {
        assert.equal((await request(method, role, method === "POST" ? input : undefined)).status, role ? 403 : 401);
      }
    }
    assert.equal((await request("POST", "patient", { ...input, temperature: 99 })).status, 400);
    assert.equal(readings.length, 0);
    const saved = await request("POST", "patient", input);
    assert.equal(saved.status, 201);
    const record = basalTemperatureRecordSchema.parse(await saved.json());
    assert.equal(record.temperature, 36.52);
    assert.equal(record.unit, "C");
    assert.equal(record.notes, "Before getting up");
    const listed = await request("GET", "patient");
    assert.equal(listed.status, 200);
    assert.match(listed.headers.get("cache-control") || "", /no-store/);
    assert.deepEqual(await listed.json(), [record]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
