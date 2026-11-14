import assert from "node:assert/strict";
import test from "node:test";
import type { Attendance, InsertAttendance } from "../../../lib/db/src/schema/schema";

test("ordinary attendance stores server-computed timing and preserves snapshots at clock-out after policy changes", async (t) => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/not-used";
  const { pool } = await import("./db");
  const { DatabaseStorage } = await import("./storage");
  const queries: { text: string; values: unknown[] }[] = [];
  let previous: Attendance | null = null;
  let shiftStart = "10:00";
  const record: InsertAttendance = {
    employeeId: "staff-1", employeeName: "Test Staff", date: "2026-11-14",
    clockIn: "2026-11-14T04:42:00Z", clockOut: null, status: "present", role: "Receptionist",
    lateMinutes: 0, shiftStart: "12:00", graceMinutes: 60,
  };
  t.mock.method(pool, "query", async (query: { text: string }, values: unknown[] = []) => {
    queries.push({ text: query.text, values });
    if (query.text.includes('from "staff_attendance_shifts"')) return { rows: [["staff-1", shiftStart, 10, "owner-1"]], rowCount: 1 };
    if (query.text.includes('from "attendance"')) return { rows: previous ? [[previous.id, previous.employeeId, previous.employeeName, previous.role, previous.date, previous.clockIn, previous.clockOut, previous.status, previous.hoursWorked, previous.notes, previous.shiftStart, previous.graceMinutes, previous.lateMinutes]] : [], rowCount: previous ? 1 : 0 };
    if (query.text.includes('insert into "attendance"')) return { rows: [[1, "staff-1", "Test Staff", "Receptionist", record.date, record.clockIn, record.clockOut, "present", null, null, "10:00", 10, 12]], rowCount: 1 };
    throw new Error(`Unexpected SQL in attendance test: ${query.text}`);
  });
  try {
    const storage = new DatabaseStorage();
    const saved = await storage.saveStaffAttendance(record);
    assert.equal(saved.lateMinutes, 12);
    const firstInsert = queries.find((entry) => entry.text.includes('insert into "attendance"'));
    assert.ok(firstInsert);
    assert.ok(firstInsert.values.includes("10:00"));
    assert.ok(!firstInsert.values.includes("12:00"));
    assert.ok(firstInsert.values.includes(12));
    previous = saved;
    shiftStart = "15:00";
    queries.length = 0;
    await storage.saveStaffAttendance({ ...record, clockOut: "2026-11-14T12:00:00Z" });
    assert.ok(!queries.some((entry) => entry.text.includes('from "staff_attendance_shifts"')));
    const clockOut = queries.at(-1)!;
    assert.ok(clockOut.values.includes(12));
    assert.ok(clockOut.values.includes("10:00"));
    assert.ok(!clockOut.values.includes("15:00"));
    previous = { ...saved, shiftStart: null, graceMinutes: null, lateMinutes: null };
    queries.length = 0;
    await storage.saveStaffAttendance({ ...record, clockOut: "2026-11-14T12:00:00Z" });
    assert.ok(!queries.some((entry) => entry.text.includes('from "staff_attendance_shifts"')));
    assert.ok(!queries.at(-1)!.values.includes(12));
    queries.length = 0;
    await storage.createAttendance(record);
    assert.ok(queries.at(-1)!.values.includes("15:00"));
    assert.ok(queries.at(-1)!.values.includes(0));
    assert.ok(!queries.at(-1)!.values.includes("12:00"));
  } finally {
    await pool.end();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  }
});
