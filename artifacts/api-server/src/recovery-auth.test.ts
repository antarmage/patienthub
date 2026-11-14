import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { registerRecoveryPasscodeLogin } from "./recovery-auth";

test("recovery passcode login identifies unique staff, rejects ambiguous/nonstaff accounts and limits attempts", async () => {
  const app = express(); app.use(express.json());
  let issued = 0;
  registerRecoveryPasscodeLogin(app, {
    usersForPasscode: async (passcode) => passcode === "unique-test" ? [{ id: "nurse", username: "nurse.test", role: "staff" }] :
      passcode === "duplicate-test" ? [{ id: "a", username: "a", role: "staff" }, { id: "b", username: "b", role: "staff" }] :
      passcode === "patient-test" ? [{ id: "patient", username: "patient", role: "patient" }] : [],
    issueToken: async () => { issued++; return "synthetic-session"; },
  });
  const server = createServer(app); await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const login = (passcode: unknown) => fetch(`http://127.0.0.1:${address.port}/api/postop/auth/passcode`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
  try {
    assert.equal((await login("")).status, 400);
    assert.equal((await login(123)).status, 400);
    assert.equal((await login("missing")).status, 401);
    assert.equal((await login("duplicate-test")).status, 401);
    assert.equal((await login("patient-test")).status, 403);
    assert.equal(issued, 0);
    const response = await login("unique-test");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { staffToken: "synthetic-session", user: { id: "nurse", username: "nurse.test", role: "staff" } });
    assert.equal(issued, 1);
    for (let i = 0; i < 4; i++) assert.equal((await login("missing")).status, 401);
    assert.equal((await login("unique-test")).status, 429);
    assert.equal(issued, 1);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
