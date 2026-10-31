import assert from "node:assert/strict";
import test from "node:test";
import { calendarDate, calendarDateValue, calendarWeekStart, shiftCalendarDays } from "./calendarDates.ts";

test("calendar dates round-trip without UTC timezone shifts", () => {
  for (const value of ["2026-11-01", "2024-02-29", "1950-01-03"]) {
    assert.equal(calendarDateValue(calendarDate(value)!), value);
  }
  for (const value of ["2026-02-29", "2026-13-01", "2026-04-31", "", "11/01/2026"]) {
    assert.equal(calendarDate(value), undefined);
  }
});

test("date strips cross month and year boundaries using local calendar days", () => {
  assert.equal(calendarDateValue(shiftCalendarDays(calendarDate("2026-12-31")!, 1)), "2027-01-01");
  assert.equal(calendarDateValue(calendarWeekStart(calendarDate("2026-11-04")!)), "2026-11-01");
  assert.equal(calendarDateValue(shiftCalendarDays(calendarDate("2026-03-08")!, 7)), "2026-03-15");
});
