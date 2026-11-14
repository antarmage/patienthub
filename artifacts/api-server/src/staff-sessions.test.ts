import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import pg from "pg";
import express from "express";
import { createServer } from "node:http";
import { clinicWorkingHours, staffSessionExpiry } from "../../../lib/db/src/staff-session-policy";
import { createStaffSessions, ensureStaffSessionSchema, registerStaffSessionRenewal } from "./staff-sessions";

const time = (clock: string) => Date.parse(`2026-11-14T${clock}:00+05:30`);

test("clinic session policy protects the full shift and uses a one-hour outside-hours expiry", () => {
  assert.equal(clinicWorkingHours(time("08:29")), false);
  assert.equal(clinicWorkingHours(time("08:30")), true);
  assert.equal(clinicWorkingHours(time("20:29")), true);
  assert.equal(clinicWorkingHours(time("20:30")), false);
  for (const clock of ["07:30", "08:30", "12:00", "20:29"]) {
    assert.equal(staffSessionExpiry(time(clock)), time("21:30"), clock);
  }
  for (const clock of ["06:00", "07:29", "20:30", "22:00"]) {
    assert.equal(staffSessionExpiry(time(clock)), time(clock) + 3_600_000, clock);
  }
  assert.equal(staffSessionExpiry(Date.parse("2026-11-14T23:45:00+05:30")), Date.parse("2026-11-15T00:45:00+05:30"));
});

test("persistent sessions hash credentials, renew atomically, survive a new service instance and reject expired credentials", async (t) => {
  const pool = new pg.Pool();
  let now = time("09:00");
  const rows = new Map<string, { user_id: string; expires_at: Date }>();
  t.mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    const key = String(values[0]);
    if (sql.startsWith("DELETE")) {
      for (const [key, row] of rows) if (+row.expires_at <= +(values[0] as Date)) rows.delete(key);
      return { rows: [] };
    }
    if (sql.startsWith("INSERT")) {
      rows.set(key, { user_id: String(values[1]), expires_at: values[2] as Date });
      return { rows: [] };
    }
    const row = rows.get(key);
    if (sql.startsWith("SELECT")) return { rows: row && +row.expires_at > +(values[1] as Date) ? [row] : [] };
    assert.ok(sql.includes("GREATEST(expires_at, $2)") && sql.includes("expires_at > $3 RETURNING"));
    if (!row || +row.expires_at <= +(values[2] as Date)) return { rows: [] };
    row.expires_at = new Date(Math.max(+row.expires_at, +(values[1] as Date)));
    return { rows: [{ expires_at: row.expires_at }] };
  });
  const sessions = createStaffSessions(pool, () => now);
  const token = await sessions.issue("staff-test");
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.ok(!rows.has(token));
  assert.ok(rows.has(crypto.createHash("sha256").update(token).digest("hex")));
  assert.equal((await createStaffSessions(pool, () => now).read(token))?.user_id, "staff-test");
  now = time("20:00");
  assert.equal((await sessions.read(token))?.expires_at.toISOString(), new Date(time("21:30")).toISOString());
  now = time("20:45");
  assert.equal(+(await sessions.renew(token, false))!, time("21:30"));
  assert.equal(+(await sessions.renew(token, true))!, time("21:45"));
  now = time("21:45");
  assert.equal(await sessions.read(token), null);
  assert.equal(await sessions.renew(token, true), null);
  assert.equal(await sessions.read("invalid"), null);
  await pool.end();
});

test("renewal route requires a valid token and boolean visibility and surfaces storage failures", async (t) => {
  const pool = new pg.Pool();
  let failure = false;
  t.mock.method(pool, "query", async (_sql: string, values: unknown[]) => {
    if (failure) throw new Error("Synthetic storage failure");
    if (values[0] !== crypto.createHash("sha256").update("a".repeat(64)).digest("hex")) return { rows: [] };
    return { rows: [{ user_id: "staff-test", expires_at: new Date(time("21:30")) }] };
  });
  const app = express(); app.use(express.json());
  registerStaffSessionRenewal(app, createStaffSessions(pool, () => time("10:00")));
  app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(503).json({ error: "Session storage unavailable" }));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const renew = (body: unknown, token?: string) => fetch(`http://127.0.0.1:${address.port}/api/staff/session/renew`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await renew({ visible: true })).status, 401);
    assert.equal((await renew({ visible: true }, "b".repeat(64))).status, 401);
    assert.equal((await renew({}, "a".repeat(64))).status, 400);
    const response = await renew({ visible: false }, "a".repeat(64));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { expiresAt: new Date(time("21:30")).toISOString() });
    failure = true;
    assert.equal((await renew({ visible: true }, "a".repeat(64))).status, 503);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  }
});

test("PostgreSQL persists renewal across pool restarts and never resurrects expired sessions", {
  skip: !process.env.STAFF_SESSION_TEST_DATABASE_URL,
}, async () => {
  const url = new URL(process.env.STAFF_SESSION_TEST_DATABASE_URL!);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname === "/staff_sessions_test", "Use a disposable local staff_sessions_test database.");
  const config = { connectionString: process.env.STAFF_SESSION_TEST_DATABASE_URL };
  let pool = new pg.Pool(config);
  let now = time("09:00");
  try {
    await pool.query("CREATE TABLE users (id varchar PRIMARY KEY)");
    await pool.query("INSERT INTO users (id) VALUES ('staff-test')");
    await ensureStaffSessionSchema(pool);
    const token = await createStaffSessions(pool, () => now).issue("staff-test");
    await pool.end();
    pool = new pg.Pool(config);
    const sessions = createStaffSessions(pool, () => now);
    assert.equal((await sessions.read(token))?.user_id, "staff-test");
    now = time("20:45");
    assert.equal(+(await sessions.renew(token, false))!, time("21:30"));
    assert.equal(+(await sessions.renew(token, true))!, time("21:45"));
    const stored = await pool.query("SELECT token_hash FROM staff_auth_sessions");
    assert.notEqual(stored.rows[0].token_hash, token);
    now = time("21:45");
    assert.equal(await sessions.renew(token, true), null);
    assert.equal(await sessions.read(token), null);
  } finally { await pool.end(); }
});
