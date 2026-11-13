import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import pg from "pg";
import { FACE_MODEL, FACE_MATCH_THRESHOLD, faceCheckInSchema, faceDescriptorSchema, faceDistance, faceEnrollmentSchema } from "../../../lib/db/src/face-attendance";
import { createFaceAttendanceStore, openFaceTemplate, registerFaceAttendanceRoutes, sealFaceTemplate, type FaceAttendanceStore } from "./face-attendance";

const descriptor = Array.from({ length: 128 }, () => 0.1);

test("face descriptors and consent are strict, including threshold boundaries", () => {
  for (const invalid of [[], descriptor.slice(1), [...descriptor, 0], Array(128).fill(0), [NaN, ...descriptor.slice(1)], [Infinity, ...descriptor.slice(1)], [3, ...descriptor.slice(1)]]) {
    assert.equal(faceDescriptorSchema.safeParse(invalid).success, false);
  }
  assert.equal(faceCheckInSchema.safeParse({ descriptor, model: FACE_MODEL, matched: true }).success, false);
  assert.equal(faceCheckInSchema.safeParse({ descriptor, model: "another-model" }).success, false);
  assert.equal(faceEnrollmentSchema.safeParse({ descriptor, model: FACE_MODEL }).success, false);
  assert.equal(faceEnrollmentSchema.safeParse({ descriptor, model: FACE_MODEL, consentConfirmed: false }).success, false);
  assert.equal(faceEnrollmentSchema.safeParse({ descriptor, model: FACE_MODEL, consentConfirmed: true }).success, true);
  assert.equal(faceDistance(descriptor, descriptor), 0);
  assert.equal(faceDistance(descriptor, [0.6, ...descriptor.slice(1)]), FACE_MATCH_THRESHOLD);
  assert.ok(faceDistance(descriptor, [0.601, ...descriptor.slice(1)]) > FACE_MATCH_THRESHOLD);
});

test("templates are encrypted with unique IVs and reject tampering, wrong keys and missing configuration", () => {
  const previous = process.env.STAFF_FACE_ENCRYPTION_KEY;
  try {
    delete process.env.STAFF_FACE_ENCRYPTION_KEY;
    assert.throws(() => sealFaceTemplate(descriptor), /not configured/);
    process.env.STAFF_FACE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    const sealed = sealFaceTemplate(descriptor);
    assert.notEqual(sealed, sealFaceTemplate(descriptor));
    assert.ok(!sealed.includes(JSON.stringify(descriptor)));
    assert.deepEqual(openFaceTemplate(sealed), descriptor);
    const damaged = Buffer.from(sealed, "base64");
    damaged[damaged.length - 1] ^= 1;
    assert.throws(() => openFaceTemplate(damaged.toString("base64")));
    process.env.STAFF_FACE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    assert.throws(() => openFaceTemplate(sealed));
    process.env.STAFF_FACE_ENCRYPTION_KEY += "!";
    assert.throws(() => sealFaceTemplate(descriptor), /not configured/);
  } finally {
    if (previous === undefined) delete process.env.STAFF_FACE_ENCRYPTION_KEY;
    else process.env.STAFF_FACE_ENCRYPTION_KEY = previous;
  }
});

test("face endpoints enforce role/employee scoping, strict payloads, feature flag and owner-only decisions", async () => {
  const previous = process.env.STAFF_FACE_ATTENDANCE_ENABLED;
  process.env.STAFF_FACE_ATTENDANCE_ENABLED = "true";
  const calls: unknown[][] = [];
  const store: FaceAttendanceStore = {
    async profile(id) { calls.push(["profile", id]); return { descriptor, model: FACE_MODEL, approvedAt: new Date().toISOString() }; },
    async employees() { return [{ id: "staff-1", name: "Test staff", enrolled: true }]; },
    async enroll(...args) { calls.push(["enroll", ...args]); },
    async revoke(...args) { calls.push(["revoke", ...args]); },
    async checkIn(...args) { calls.push(["checkIn", ...args]); },
    async requestReview(...args) { calls.push(["requestReview", ...args]); },
    async reviews(id) { calls.push(["reviews", id]); return []; },
    async review(...args) { calls.push(["review", ...args]); },
  };
  const app = express();
  app.use(express.json());
  registerFaceAttendanceRoutes(app, async (req) => {
    const role = req.headers["x-role"];
    if (typeof role !== "string") return null;
    return role === "patient" ? { patientId: 1 } : { userId: `${role}-1`, role };
  }, store);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (path: string, role?: string, method = "GET", body?: unknown) => fetch(`http://127.0.0.1:${address.port}/api/${path}`, {
    method, headers: { ...(role ? { "x-role": role } : {}), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    assert.equal((await request("staff/face-attendance")).status, 401);
    for (const role of ["patient", "owner", "admin", "clinician"]) {
      assert.equal((await request("staff/face-attendance", role)).status, 403);
    }
    assert.equal(calls.length, 0);
    for (const role of ["staff", "receptionist"]) {
      const state = await request("staff/face-attendance", role);
      assert.equal(state.status, 200);
      assert.equal(state.headers.get("cache-control"), "no-store");
      assert.ok(calls.some((call) => call[0] === "profile" && call[1] === `${role}-1`));
      assert.ok(calls.some((call) => call[0] === "reviews" && call[1] === `${role}-1`));
    }
    const input = { descriptor, model: FACE_MODEL };
    assert.equal((await request("staff/face-attendance/check-in", "staff", "POST", { ...input, employeeId: "another-staff" })).status, 400);
    assert.equal((await request("staff/face-attendance/check-in", "staff", "POST", input)).status, 200);
    assert.deepEqual(calls.at(-1), ["checkIn", "staff-1", descriptor]);
    process.env.STAFF_FACE_ATTENDANCE_ENABLED = "false";
    assert.equal((await request("staff/face-attendance/check-in", "staff", "POST", input)).status, 409);
    const disabled = await (await request("staff/face-attendance", "staff")).json();
    assert.deepEqual(disabled, { enabled: false, profile: null, reviews: [] });
    assert.equal((await request("staff/face-attendance/request-review", "staff", "POST", { reason: " no " })).status, 400);
    const pending = await request("staff/face-attendance/request-review", "staff", "POST", { reason: " Camera unavailable " });
    assert.equal(pending.status, 201);
    assert.deepEqual(await pending.json(), { status: "pending_approval" });
    assert.deepEqual(calls.at(-1), ["requestReview", "staff-1", "Camera unavailable"]);
    for (const role of ["staff", "receptionist", "patient", "admin", "clinician"]) {
      assert.equal((await request("owner/face-attendance", role)).status, 403);
      assert.equal((await request("owner/face-attendance/enrollment/staff-1", role, "PUT", { ...input, consentConfirmed: true })).status, 403);
      assert.equal((await request("owner/face-attendance/enrollment/staff-1", role, "DELETE")).status, 403);
      assert.equal((await request("owner/face-attendance/reviews/1", role, "POST", { decision: "approved" })).status, 403);
    }
    const owner = await (await request("owner/face-attendance", "owner")).json();
    assert.deepEqual(owner, { enabled: false, employees: [{ id: "staff-1", name: "Test staff", enrolled: true }], reviews: [] });
    assert.equal((await request("owner/face-attendance/enrollment/staff-1", "owner", "PUT", input)).status, 400);
    assert.equal((await request("owner/face-attendance/enrollment/staff-1", "owner", "PUT", { ...input, consentConfirmed: true })).status, 200);
    assert.deepEqual(calls.at(-1), ["enroll", "staff-1", descriptor, "owner-1"]);
    assert.equal((await request("owner/face-attendance/enrollment/staff-1", "owner", "DELETE")).status, 200);
    assert.deepEqual(calls.at(-1), ["revoke", "staff-1"]);
    assert.equal((await request("owner/face-attendance/reviews/0", "owner", "POST", { decision: "approved" })).status, 400);
    assert.equal((await request("owner/face-attendance/reviews/1", "owner", "POST", { decision: "pending" })).status, 400);
    for (const decision of ["approved", "rejected"]) {
      assert.equal((await request("owner/face-attendance/reviews/1", "owner", "POST", { decision })).status, 200);
      assert.deepEqual(calls.at(-1), ["review", 1, decision, "owner-1"]);
    }
  } finally {
    if (previous === undefined) delete process.env.STAFF_FACE_ATTENDANCE_ENABLED;
    else process.env.STAFF_FACE_ATTENDANCE_ENABLED = previous;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("SQL store locks employee transitions, rejects mismatches/pending/off days and rolls back failures", async (t) => {
  const previous = process.env.STAFF_FACE_ENCRYPTION_KEY;
  process.env.STAFF_FACE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  const pool = new pg.Pool();
  const tx = Object.assign(new pg.Client(), { release() {} });
  const queries: { sql: string; args: unknown[] }[] = [];
  let attendance: { clock_in: string | null; status: string } | undefined;
  let enrollment: { encrypted_descriptor: string; model: string } | undefined = { encrypted_descriptor: sealFaceTemplate(descriptor), model: FACE_MODEL };
  const requestedAt = new Date("2026-03-01T04:30:00Z");
  let decision = "pending";
  let changed = true;
  t.mock.method(pool, "connect", async () => tx);
  t.mock.method(pool, "query", async () => ({ rows: [{ employee_id: "staff-1" }], rowCount: 1 }));
  t.mock.method(tx, "query", async (sql: string, args: unknown[] = []) => {
    queries.push({ sql, args });
    if (sql.includes("SELECT clock_in")) return { rows: attendance ? [attendance] : [], rowCount: attendance ? 1 : 0 };
    if (sql.includes("SELECT encrypted_descriptor")) return { rows: enrollment ? [enrollment] : [], rowCount: enrollment ? 1 : 0 };
    if (sql.includes("SELECT employee_id,date::text")) return { rows: [{ employee_id: "staff-1", date: "2026-03-01", requested_at: requestedAt, decision }], rowCount: 1 };
    if (sql.includes("UPDATE attendance SET")) return { rows: changed ? [{ id: 1 }] : [], rowCount: changed ? 1 : 0 };
    return { rows: [{ id: 1 }], rowCount: 1 };
  });
  t.mock.method(tx, "release", () => {});
  const store = createFaceAttendanceStore(pool);
  try {
    await store.checkIn("staff-1", descriptor);
    assert.match(queries[1].sql, /pg_advisory_xact_lock/);
    assert.deepEqual(queries[1].args, ["staff-attendance:staff-1"]);
    const present = queries.find((entry) => entry.sql.includes("INSERT INTO attendance"));
    assert.ok(present);
    assert.equal(present.args[2], "present");
    assert.ok(Number.isFinite(Date.parse(String(present.args[3]))));
    assert.equal(queries.at(-1)?.sql, "COMMIT");
    for (const record of [{ status: "pending_approval", clock_in: null }, { status: "leave", clock_in: null }, { status: "regular_day_off", clock_in: null }, { status: "present", clock_in: new Date().toISOString() }]) {
      queries.length = 0; attendance = record;
      await assert.rejects(() => store.checkIn("staff-1", descriptor));
      assert.equal(queries.at(-1)?.sql, "ROLLBACK");
      assert.ok(!queries.some((entry) => entry.sql.includes("INSERT INTO attendance")));
    }
    attendance = undefined;
    await assert.rejects(() => store.checkIn("staff-1", [0.601, ...descriptor.slice(1)]), /did not match/);
    enrollment = undefined;
    await assert.rejects(() => store.checkIn("staff-1", descriptor), /enroll your photo/);
    queries.length = 0;
    await store.requestReview("staff-1", "Camera not available");
    const pending = queries.find((entry) => entry.sql.includes("INSERT INTO attendance"));
    assert.equal(pending?.args[2], "pending_approval");
    assert.equal(pending?.args[3], null);
    assert.equal(queries.at(-1)?.sql, "COMMIT");
    for (const approved of [true, false]) {
      queries.length = 0;
      await store.review(1, approved ? "approved" : "rejected", "owner-1");
      const update = queries.find((entry) => entry.sql.includes("UPDATE attendance SET"));
      assert.deepEqual(update?.args.slice(0, 4), ["staff-1", "2026-03-01", approved ? "present" : "rejected", approved ? requestedAt.toISOString() : null]);
      assert.match(update?.sql || "", /status='pending_approval' AND clock_in IS NULL/);
      assert.equal(queries.at(-1)?.sql, "COMMIT");
    }
    decision = "approved";
    await assert.rejects(() => store.review(1, "approved", "owner-1"), /already been reviewed/);
    assert.equal(queries.at(-1)?.sql, "ROLLBACK");
    decision = "pending"; changed = false;
    await assert.rejects(() => store.review(1, "approved", "owner-1"), /Attendance has changed/);
    assert.equal(queries.at(-1)?.sql, "ROLLBACK");
  } finally {
    if (previous === undefined) delete process.env.STAFF_FACE_ENCRYPTION_KEY;
    else process.env.STAFF_FACE_ENCRYPTION_KEY = previous;
    await pool.end();
  }
});
