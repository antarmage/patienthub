import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { clinicDate } from "../../../lib/db/src/follow-up";
import type { Attendance, InsertAttendance } from "../../../lib/db/src/schema/schema";
import { attendanceWeek, registerStaffAttendanceRoutes, type StaffAttendanceStore } from "./staff-attendance";

test("receptionists can manage their own weekly attendance and status, but not another role's records", async () => {
  const rows = new Map<string, Attendance>();
  const store: StaffAttendanceStore = {
    async list(employeeId, start, end) {
      return [...rows.values()].filter((row) => row.employeeId === employeeId && row.date >= start && row.date <= end);
    },
    async save(record: InsertAttendance) {
      const saved = { ...record, id: rows.get(`${record.employeeId}:${record.date}`)?.id || rows.size + 1 };
      rows.set(`${record.employeeId}:${record.date}`, saved as Attendance);
      return saved as Attendance;
    },
  };
  const app = express();
  app.use(express.json());
  registerStaffAttendanceRoutes(app, async (req, res) => {
    const role = req.headers["x-test-role"];
    if (typeof role !== "string") { res.status(401).json({ error: "Sign in." }); return null; }
    return { userId: String(req.headers["x-test-user"] || role), role };
  }, store, async (userId) => `Receptionist ${userId}`);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const root = `http://127.0.0.1:${address.port}`;
  const today = clinicDate();
  const week = attendanceWeek(today);
  const request = (path: string, role?: string, action?: string, date = today, user = "receptionist-1") => fetch(`${root}${path}`, {
    method: action ? "POST" : "GET",
    headers: {
      ...(role ? { "x-test-role": role } : {}),
      "x-test-user": user,
      ...(action ? { "Content-Type": "application/json" } : {}),
    },
    ...(action ? { body: JSON.stringify({ action, date }) } : {}),
  });
  try {
    assert.equal((await request(`/api/staff/attendance?startDate=${week.start}&endDate=${week.end}`)).status, 401);
    assert.equal((await request(`/api/staff/attendance?startDate=${week.start}&endDate=${week.end}`, "owner")).status, 403);
    const anotherReceptionistRows: unknown = await (await request(`/api/staff/attendance?startDate=${week.start}&endDate=${week.end}`, "receptionist", undefined, today, "another-receptionist")).json();
    assert.ok(Array.isArray(anotherReceptionistRows));
    assert.equal(anotherReceptionistRows.length, 0);
    assert.equal((await request("/api/staff/attendance", "receptionist", "leave")).status, 200);
    assert.equal(rows.get(`receptionist-1:${today}`)?.status, "leave");
    assert.equal((await request("/api/staff/attendance", "receptionist", "regular_day_off")).status, 200);
    assert.equal(rows.get(`receptionist-1:${today}`)?.status, "regular_day_off");
    if (week.end > today) {
      const nextDay = new Date(`${today}T00:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      assert.equal((await request("/api/staff/attendance", "receptionist", "regular_day_off", nextDay.toISOString().slice(0, 10))).status, 409);
    }
    assert.equal((await request("/api/staff/attendance", "receptionist", "work_day")).status, 200);
    assert.equal(rows.get(`receptionist-1:${today}`)?.status, "scheduled");
    assert.equal((await request("/api/staff/attendance", "receptionist", "clock_in")).status, 200);
    assert.equal((await request("/api/staff/attendance", "receptionist", "clock_in")).status, 409);
    assert.equal((await request("/api/staff/attendance", "receptionist", "clock_out")).status, 200);
    assert.equal((await request("/api/staff/attendance", "receptionist", "clock_out")).status, 409);
    assert.equal((await request("/api/staff/attendance", "receptionist", "leave", week.end < today ? week.end : "2099-01-01")).status, 400);
    assert.equal((await request(`/api/staff/attendance?startDate=${today}&endDate=${today}`, "receptionist")).status, 400);
    assert.equal(rows.get(`receptionist-1:${today}`)?.employeeName, "Receptionist receptionist-1");
    assert.equal(rows.get(`receptionist-1:${today}`)?.status, "present");
    assert.ok(rows.get(`receptionist-1:${today}`)?.clockIn);
    assert.ok(rows.get(`receptionist-1:${today}`)?.clockOut);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
