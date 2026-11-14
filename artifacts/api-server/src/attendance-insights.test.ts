import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { attendanceMonthDays, attendanceMonthSchema, attendanceYearDays, attendanceYearSchema } from "../../../lib/db/src/attendance-insights";
import { registerAttendanceInsightsRoutes } from "./attendance-insights";

test("monthly calendar covers leap years, month boundaries and Monday-first alignment", () => {
  assert.equal(attendanceMonthDays("2024-02").dates.length, 29);
  assert.equal(attendanceMonthDays("2025-02").dates.length, 28);
  assert.equal(attendanceMonthDays("2026-11").offset, 6);
  assert.equal(attendanceMonthDays("2026-06").offset, 0);
  assert.equal(attendanceMonthDays("2026-12").end, "2026-12-31");
  assert.equal(attendanceMonthDays("0001-01").start, "0001-01-01");
  for (const value of ["0000-01", "2026-00", "2026-13", "2026-1", "2026-11-01", "anything"]) {
    assert.equal(attendanceMonthSchema.safeParse(value).success, false);
  }
});

test("year calendars cover leap days, all months, week alignment and supported year boundaries", () => {
  for (const year of ["0001", "2024", "2025", "2026", "9999"]) {
    const calendar = attendanceYearDays(year);
    assert.equal(calendar.dates.length, year === "2024" ? 366 : 365);
    assert.equal(calendar.start, `${year}-01-01`);
    assert.equal(calendar.end, `${year}-12-31`);
    assert.equal(calendar.months.length, 12);
    assert.equal(calendar.months[0].column, 1);
    assert.equal(new Set(calendar.dates).size, calendar.dates.length);
    assert.equal(calendar.columns, Math.ceil((calendar.offset + calendar.dates.length) / 7));
    for (const month of calendar.months) assert.equal(month.column, Math.floor((calendar.offset + calendar.dates.indexOf(month.date)) / 7) + 1);
  }
  assert.equal(attendanceYearDays("2024").offset, 0);
  assert.ok(attendanceYearDays("2024").dates.includes("2024-02-29"));
  assert.ok(!attendanceYearDays("2025").dates.includes("2025-02-29"));
  for (const value of ["0000", "24", "20260", "2026-11", "anything", "", ["2026"]]) assert.equal(attendanceYearSchema.safeParse(value).success, false);
});

test("month and year insights are read-only, staff-scoped, owner-only and contain only status projection", async () => {
  const calls: unknown[][] = [];
  const record = { employeeId: "staff-1", employeeName: "Test Staff", date: "2026-11-01", status: "present", lateMinutes: 12 };
  const app = express();
  registerAttendanceInsightsRoutes(app, async (req) => {
    const role = req.headers["x-role"];
    if (typeof role !== "string") return null;
    return role === "patient" ? { patientId: 1 } : { userId: `${role}-1`, role };
  }, {
    async staff(id, start, end) { calls.push([id, start, end]); return [{ ...record, employeeId: id, notes: "Should not be returned" }]; },
    async all(start, end) { calls.push(["all", start, end]); return [record]; },
    async employees() { return [{ id: "staff-1", name: "Test Staff" }]; },
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (owner: boolean, role?: string, month = "2026-11", method = "GET") => fetch(`http://127.0.0.1:${address.port}/api/${owner ? "owner" : "staff"}/attendance-insights?month=${month}&employeeId=someone-else`, {
    method, headers: role ? { "x-role": role } : {},
  });
  try {
    for (const owner of [true, false]) {
      assert.equal((await request(owner)).status, 401);
      assert.equal((await request(owner, "patient")).status, 403);
      assert.equal((await request(owner, "admin")).status, 403);
    }
    assert.equal((await request(true, "staff")).status, 403);
    assert.equal((await request(false, "owner")).status, 403);
    assert.equal(calls.length, 0);
    assert.equal((await request(false, "staff", "2026-13")).status, 400);
    assert.equal(calls.length, 0);
    for (const role of ["staff", "receptionist"]) {
      const response = await request(false, role);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(await response.json(), { records: [{ ...record, employeeId: `${role}-1` }] });
      assert.deepEqual(calls.at(-1), [`${role}-1`, "2026-11-01", "2026-11-30"]);
    }
    const owner = await request(true, "owner", "2024-02");
    assert.deepEqual(await owner.json(), { employees: [{ id: "staff-1", name: "Test Staff" }], records: [record] });
    assert.deepEqual(calls.at(-1), ["all", "2024-02-01", "2024-02-29"]);
    for (const role of ["staff", "receptionist", "owner"]) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/${role === "owner" ? "owner" : "staff"}/attendance-insights?year=2024&employeeId=someone-else`, { headers: { "x-role": role } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(await response.json(), role === "owner"
        ? { employees: [{ id: "staff-1", name: "Test Staff" }], records: [record] }
        : { records: [{ ...record, employeeId: `${role}-1` }] });
      assert.deepEqual(calls.at(-1), [role === "owner" ? "all" : `${role}-1`, "2024-01-01", "2024-12-31"]);
    }
    const count = calls.length;
    for (const query of ["year=0000", "year=2024&month=2024-02", "year=2024&year=2025", "year=202", "year=2024-02"]) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/staff/attendance-insights?${query}`, { headers: { "x-role": "staff" } });
      assert.equal(response.status, 400);
    }
    assert.equal(calls.length, count);
    assert.equal((await request(false, "staff", "2026-11", "POST")).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
