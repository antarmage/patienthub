import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import pg from "pg";
import { attendanceShiftSchema, attendanceTiming, attendanceTimingLabel, type AttendanceShift } from "../../../lib/db/src/attendance-timing";
import { createAttendanceShiftStore, ensureAttendanceShiftSchema, registerAttendanceShiftRoutes } from "./attendance-shifts";

test("late timing uses IST, exact grace boundary, rounded minutes from start and no unconfigured inference", () => {
  const shift = { shiftStart: "10:00", graceMinutes: 10 };
  for (const clock of ["2026-11-14T03:30:00Z", "2026-11-14T04:30:00Z", "2026-11-14T04:40:00Z"]) {
    assert.deepEqual(attendanceTiming("2026-11-14", clock, shift), { ...shift, lateMinutes: 0 });
  }
  assert.equal(attendanceTiming("2026-11-14", "2026-11-14T04:40:00.001Z", shift).lateMinutes, 11);
  assert.equal(attendanceTiming("2026-11-14", "2026-11-14T10:12:00+05:30", shift).lateMinutes, 12);
  assert.equal(attendanceTiming("2026-11-14", "2026-11-14T04:30:01Z", { ...shift, graceMinutes: 0 }).lateMinutes, 1);
  assert.equal(attendanceTiming("2026-11-14", "2026-11-13T18:35:00Z", { shiftStart: "00:00", graceMinutes: 0 }).lateMinutes, 5);
  for (const policy of [null, { ...shift, shiftStart: null }]) {
    assert.deepEqual(attendanceTiming("2026-11-14", "2026-11-14T04:45:00Z", policy), { shiftStart: null, graceMinutes: null, lateMinutes: null });
  }
  assert.equal(attendanceTiming("2026-11-14", null, shift).lateMinutes, null);
  assert.throws(() => attendanceTiming("bad", "bad", shift), /invalid date/);
  assert.equal(attendanceTimingLabel(null), "Late tracking not configured");
  assert.equal(attendanceTimingLabel(0), "On time");
  assert.equal(attendanceTimingLabel(1), "Late by 1 minute");
  assert.equal(attendanceTimingLabel(12), "Late by 12 minutes");
  for (const invalid of [
    { ...shift, shiftStart: "24:00" }, { ...shift, shiftStart: "9:00" }, { ...shift, shiftStart: "09:60" },
    { ...shift, graceMinutes: -1 }, { ...shift, graceMinutes: 1.5 }, { ...shift, graceMinutes: 1441 },
    { ...shift, graceMinutes: "10" }, { ...shift, employeeId: "another" },
  ]) assert.equal(attendanceShiftSchema.safeParse(invalid).success, false);
});

test("only owner can configure shifts, staff read only their own and errors are explicit", async () => {
  const saved = new Map<string, AttendanceShift>();
  const calls: unknown[][] = [];
  const app = express();
  app.use(express.json());
  registerAttendanceShiftRoutes(app, async (req) => {
    const role = req.headers["x-role"];
    if (typeof role !== "string") return null;
    return role === "patient" ? { patientId: 1 } : { userId: `${role}-1`, role };
  }, {
    async employees() { return [{ id: "staff-1", name: "Test Staff", shiftStart: null, graceMinutes: 0 }]; },
    async get(id) { calls.push(["get", id]); return saved.get(id) || null; },
    async save(id, shift, ownerId) { calls.push(["save", id, shift, ownerId]); if (id !== "staff-1") return false; saved.set(id, shift); return true; },
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (path: string, role?: string, method = "GET", body?: unknown) => fetch(`http://127.0.0.1:${address.port}/api/${path}`, {
    method, headers: { ...(role ? { "x-role": role } : {}), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const shift = { shiftStart: "10:00", graceMinutes: 10 };
  try {
    assert.equal((await request("owner/attendance-shifts")).status, 401);
    assert.equal((await request("staff/attendance-shift")).status, 401);
    assert.equal((await request("owner/attendance-shifts/staff-1", undefined, "PUT", shift)).status, 401);
    for (const role of ["staff", "receptionist", "patient", "admin", "clinician"]) {
      assert.equal((await request("owner/attendance-shifts", role)).status, 403);
      assert.equal((await request("owner/attendance-shifts/staff-1", role, "PUT", shift)).status, 403);
    }
    for (const role of ["patient", "owner", "admin", "clinician"]) assert.equal((await request("staff/attendance-shift", role)).status, 403);
    assert.equal(calls.length, 0);
    const response = await request("owner/attendance-shifts", "owner");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), { employees: [{ id: "staff-1", name: "Test Staff", shiftStart: null, graceMinutes: 0 }] });
    for (const invalid of [{ ...shift, graceMinutes: -1 }, { ...shift, shiftStart: "25:00" }, { ...shift, updatedBy: "another" }]) {
      assert.equal((await request("owner/attendance-shifts/staff-1", "owner", "PUT", invalid)).status, 400);
    }
    assert.equal(calls.length, 0);
    assert.equal((await request("owner/attendance-shifts/missing", "owner", "PUT", shift)).status, 404);
    assert.equal((await request("owner/attendance-shifts/staff-1", "owner", "PUT", shift)).status, 200);
    assert.deepEqual(calls.at(-1), ["save", "staff-1", shift, "owner-1"]);
    for (const role of ["staff", "receptionist"]) {
      const own = await request("staff/attendance-shift?employeeId=staff-1", role);
      assert.equal(own.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(await own.json(), { shift: role === "staff" ? shift : null });
      assert.deepEqual(calls.at(-1), ["get", `${role}-1`]);
      assert.equal((await request("staff/attendance-shift", role, "PUT", shift)).status, 404);
    }
    assert.equal((await request("owner/attendance-shifts/staff-1", "owner", "PUT", { ...shift, shiftStart: null })).status, 200);
    assert.equal(saved.get("staff-1")?.shiftStart, null);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});

test("shift SQL store persists owner policy, scopes staff and bootstraps snapshot columns idempotently", async (t) => {
  const pool = new pg.Pool();
  const queries: { sql: string; args: unknown[] }[] = [];
  let found = true;
  t.mock.method(pool, "query", async (sql: string, args: unknown[] = []) => {
    queries.push({ sql, args });
    return { rows: found ? [{ id: "staff-1", name: "Test Staff", shiftStart: "10:00", graceMinutes: 10 }] : [], rowCount: found ? 1 : 0 };
  });
  try {
    await ensureAttendanceShiftSchema(pool);
    assert.match(queries.at(-1)!.sql, /CREATE TABLE IF NOT EXISTS staff_attendance_shifts/);
    assert.match(queries.at(-1)!.sql, /ADD COLUMN IF NOT EXISTS late_minutes/);
    const store = createAttendanceShiftStore(pool);
    await store.save("staff-1", { shiftStart: "10:00", graceMinutes: 10 }, "owner-1");
    assert.match(queries.at(-1)!.sql, /ON CONFLICT\(employee_id\) DO UPDATE/);
    assert.deepEqual(queries.at(-1)!.args.slice(0, 4), ["staff-1", "10:00", 10, "owner-1"]);
    await store.get("staff-1");
    assert.deepEqual(queries.at(-1)!.args, ["staff-1"]);
    found = false;
    assert.equal(await store.get("missing"), null);
    assert.equal(await store.save("missing", { shiftStart: null, graceMinutes: 0 }, "owner-1"), false);
  } finally { await pool.end(); }
});
