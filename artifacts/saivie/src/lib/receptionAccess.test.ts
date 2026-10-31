import assert from "node:assert/strict";
import test from "node:test";
import { fetchReceptionAccess } from "./receptionAccess";

test("clinic-wide receptionist access uses explicit boolean permissions", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    clinicalDetailsVisible: false, canRecordVitals: true,
  }), { headers: { "Content-Type": "application/json" } }));
  assert.deepEqual(await fetchReceptionAccess(), { clinicalDetailsVisible: false, canRecordVitals: true });
});

test("invalid settings cannot enable clinical viewing through truthy values or missing fields", async (t) => {
  for (const body of [{ clinicalDetailsVisible: "false", canRecordVitals: true }, { clinicalDetailsVisible: true }, [], null]) {
    const mocked = t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }));
    await assert.rejects(fetchReceptionAccess(), /invalid settings/);
    mocked.mock.restore();
  }
});

test("clinic permission failures are explicit, not success-shaped disabled defaults", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response('{"error":"Authentication required"}', {
    status: 401, headers: { "Content-Type": "application/json" },
  }));
  await assert.rejects(fetchReceptionAccess(), /Authentication required/);
});
