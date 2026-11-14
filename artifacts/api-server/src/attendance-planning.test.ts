import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import pg from "pg";
import { planningLastDate, timeOffInputSchema, type TimeOffInput, type TimeOffRequest } from "../../../lib/db/src/attendance-planning";
import { clinicDate } from "../../../lib/db/src/follow-up";
import { AttendancePlanningError, createAttendancePlanningStore, ensureAttendancePlanningSchema, registerAttendancePlanningRoutes, validateTimeOff, type AttendancePlanningStore } from "./attendance-planning";

const input: TimeOffInput = { kind: "leave", startDate: "2026-11-16", endDate: "2026-11-17", period: "full_day", reason: "Personal time" };
const pending: TimeOffRequest = { ...input, id: 1, employeeId: "staff-1", employeeName: "Test Staff", decision: "pending",
  requestedAt: "2026-11-14T09:00:00Z", reviewedAt: null, reviewNote: null };

test("three-month policy clamps month ends and validates real dates, ranges, reasons and half-days", () => {
  assert.equal(planningLastDate("2026-11-14"), "2027-02-14");
  assert.equal(planningLastDate("2026-01-31"), "2026-04-30");
  for (const change of [{ startDate: "2026-02-30" }, { endDate: "2026-11-15" }, { reason: " " },
    { kind: "weekly_off" }, { period: "night" }]) {
    assert.equal(timeOffInputSchema.safeParse({ ...input, ...change }).success, false);
  }
  assert.equal(timeOffInputSchema.safeParse({ ...input, period: "morning" }).success, true);
  assert.equal(timeOffInputSchema.safeParse({ ...input, kind: "weekly_off", endDate: input.startDate }).success, true);
  validateTimeOff({ ...input, endDate: "2027-02-14" }, [], [], "2026-11-14");
  assert.throws(() => validateTimeOff({ ...input, endDate: "2027-02-15" }, [], [], "2026-11-14"), AttendancePlanningError);
  assert.throws(() => validateTimeOff(input, [], [], "2026-11-18"), AttendancePlanningError);
});

test("planning rejects overlaps, closures, clock-ins and multiple weekly offs without treating pending leave as approved", () => {
  validateTimeOff(input, [], [], "2026-11-14");
  for (const status of ["clinic_closed", "pending_approval", "regular_day_off", "leave", "half-day"]) {
    assert.throws(() => validateTimeOff(input, [{ date: input.startDate, status, clockIn: null }], [], "2026-11-14"), AttendancePlanningError);
  }
  assert.throws(() => validateTimeOff(input, [{ date: input.startDate, status: "present", clockIn: "2026-11-16T04:00:00Z" }], [], "2026-11-14"), AttendancePlanningError);
  assert.throws(() => validateTimeOff(input, [], [pending], "2026-11-14"), AttendancePlanningError);
  validateTimeOff(input, [], [{ ...pending, decision: "rejected" }], "2026-11-14");
  const weekly: TimeOffInput = { ...input, kind: "weekly_off", endDate: input.startDate };
  assert.throws(() => validateTimeOff(weekly, [{ date: "2026-11-22", status: "regular_day_off", clockIn: null }], [], "2026-11-14"), AttendancePlanningError);
  assert.throws(() => validateTimeOff(weekly, [], [{ ...pending, kind: "weekly_off", startDate: "2026-11-22", endDate: "2026-11-22" }], "2026-11-14"), AttendancePlanningError);
});

test("application endpoints enforce staff/owner roles, scope identity, validate input and surface conflicts", async () => {
  const calls: unknown[][] = [];
  const store: AttendancePlanningStore = {
    async list(id) { calls.push(["list", id]); return []; },
    async apply(id, body) { calls.push(["apply", id, body]); },
    async cancel(id, requestId) { calls.push(["cancel", id, requestId]); throw new AttendancePlanningError(409, "Already reviewed."); },
    async review(id, requestId, decision, note) { calls.push(["review", id, requestId, decision, note]); },
  };
  const app = express();
  app.use(express.json());
  registerAttendancePlanningRoutes(app, async (req) => typeof req.headers["x-role"] === "string"
    ? { userId: `${req.headers["x-role"]}-1`, role: req.headers["x-role"] } : null, store);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (url: string, role?: string, body?: unknown) => fetch(`http://127.0.0.1:${address.port}/api/${url}`, {
    method: body === undefined ? "GET" : "POST", headers: { ...(role ? { "x-role": role } : {}), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    assert.equal((await request("staff/time-off")).status, 401);
    for (const role of ["owner", "admin", "clinician", "patient"]) assert.equal((await request("staff/time-off", role)).status, 403);
    for (const role of ["staff", "receptionist", "admin", "clinician"]) assert.equal((await request("owner/time-off", role)).status, 403);
    const own = await request("staff/time-off?employeeId=other", "staff");
    assert.equal(own.status, 200);
    assert.equal(own.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(calls.at(-1), ["list", "staff-1"]);
    assert.equal((await request("staff/time-off", "staff", input)).status, 200);
    assert.deepEqual(calls.at(-1), ["apply", "staff-1", input]);
    assert.equal((await request("staff/time-off", "staff", { ...input, employeeId: "other" })).status, 400);
    assert.equal((await request("staff/time-off", "staff", { ...input, reason: "" })).status, 400);
    assert.equal((await request("owner/time-off", "owner")).status, 200);
    assert.deepEqual(calls.at(-1), ["list", undefined]);
    assert.equal((await request("owner/time-off/1/review", "staff", { decision: "approved", note: "" })).status, 403);
    assert.equal((await request("owner/time-off/1/review", "owner", { decision: "approved", note: "" })).status, 200);
    assert.deepEqual(calls.at(-1), ["review", "owner-1", 1, "approved", ""]);
    assert.equal((await request("owner/time-off/1/review", "owner", { decision: "pending", note: "" })).status, 400);
    const cancelled = await request("staff/time-off/1/withdraw", "staff", {});
    assert.equal(cancelled.status, 409);
    assert.deepEqual(await cancelled.json(), { error: "Already reviewed." });
    assert.deepEqual(calls.at(-1), ["cancel", "staff-1", 1]);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});

test("PostgreSQL applications persist, approve atomically, reject/withdraw safely and serialize competing requests", {
  skip: !process.env.ATTENDANCE_PLANNING_TEST_DATABASE_URL,
}, async () => {
  const pool = new pg.Pool({ connectionString: process.env.ATTENDANCE_PLANNING_TEST_DATABASE_URL });
  try {
    await pool.query(`CREATE TABLE users(id varchar PRIMARY KEY,username text,display_name text,role text);
      INSERT INTO users VALUES('staff-1','Test Staff',NULL,'staff'),('staff-2','Other Staff',NULL,'receptionist'),('owner-1','Owner',NULL,'owner');
      CREATE TABLE attendance(id serial PRIMARY KEY,employee_id varchar,employee_name text,role text,date date,status text,
        clock_in text,clock_out text,hours_worked real,late_minutes integer,notes text,UNIQUE(employee_id,date));`);
    await ensureAttendancePlanningSchema(pool);
    await ensureAttendancePlanningSchema(pool);
    const store = createAttendancePlanningStore(pool);
    const today = clinicDate();
    const day = (offset: number) => { const date = new Date(`${today}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
    const leave = { ...input, startDate: day(2), endDate: day(3) };
    await store.apply("staff-1", leave);
    assert.equal((await pool.query("SELECT * FROM attendance")).rowCount, 0);
    const first = (await store.list("staff-1"))[0];
    assert.equal(first.decision, "pending");
    assert.equal((await store.list("staff-2")).length, 0);
    await assert.rejects(store.cancel("staff-2", first.id), AttendancePlanningError);
    await store.review("owner-1", first.id, "approved", "Approved");
    assert.deepEqual((await pool.query("SELECT status FROM attendance ORDER BY date")).rows, [{ status: "leave" }, { status: "leave" }]);
    assert.equal((await store.list("staff-1"))[0].reviewNote, "Approved");
    await assert.rejects(store.review("owner-1", first.id, "rejected", ""), AttendancePlanningError);
    await store.review("owner-1", first.id, "cancelled", "Change of plan");
    assert.deepEqual((await pool.query("SELECT status FROM attendance ORDER BY date")).rows, [{ status: "scheduled" }, { status: "scheduled" }]);
    assert.equal((await store.list("staff-1"))[0].decision, "cancelled");
    await store.apply("staff-1", { ...leave, startDate: day(5), endDate: day(5), period: "morning" });
    const half = (await store.list("staff-1")).find((row) => row.decision === "pending")!;
    await store.review("owner-1", half.id, "approved", "");
    assert.deepEqual((await pool.query("SELECT status,time_off_period FROM attendance WHERE date=$1", [day(5)])).rows, [{ status: "half-day", time_off_period: "morning" }]);
    await pool.query("UPDATE attendance SET clock_in=$2 WHERE date=$1", [day(5), `${day(5)}T08:00:00Z`]);
    await assert.rejects(store.review("owner-1", half.id, "cancelled", ""), AttendancePlanningError);
    const weekly = { ...leave, kind: "weekly_off" as const, startDate: day(14), endDate: day(14) };
    const simultaneous = await Promise.allSettled([store.apply("staff-1", weekly), store.apply("staff-1", weekly)]);
    assert.equal(simultaneous.filter((row) => row.status === "fulfilled").length, 1);
    const off = (await store.list("staff-1")).find((row) => row.decision === "pending")!;
    await store.cancel("staff-1", off.id);
    assert.equal((await store.list("staff-1")).find((row) => row.id === off.id)?.decision, "cancelled");
    await store.apply("staff-1", weekly);
    const rejected = (await store.list("staff-1")).find((row) => row.decision === "pending")!;
    await store.review("owner-1", rejected.id, "rejected", "Choose another day");
    assert.equal((await pool.query("SELECT * FROM attendance WHERE date=$1", [weekly.startDate])).rowCount, 0);
    await store.apply("staff-1", { ...leave, startDate: day(7), endDate: day(8) });
    const conflict = (await store.list("staff-1")).find((row) => row.decision === "pending")!;
    await pool.query("INSERT INTO attendance(employee_id,employee_name,date,status) VALUES('staff-1','Test Staff',$1,'clinic_closed')", [day(8)]);
    await assert.rejects(store.review("owner-1", conflict.id, "approved", ""), AttendancePlanningError);
    assert.equal((await pool.query("SELECT * FROM attendance WHERE date=$1", [day(7)])).rowCount, 0);
    assert.equal((await store.list("staff-1")).find((row) => row.id === conflict.id)?.decision, "pending");
  } finally { await pool.end(); }
});
