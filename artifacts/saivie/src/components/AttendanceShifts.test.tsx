import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OwnerAttendanceShifts, StaffAttendanceShift } from "./AttendanceShifts";
import { AttendanceCamera } from "./AttendanceCamera";

test("owner can configure each staff start and grace without an assumed shift time", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/owner/attendance-shifts", "owner-test"], { employees: [
    { id: "staff-1", name: "Test Staff", shiftStart: "10:00", graceMinutes: 10 },
    { id: "staff-2", name: "Other Staff", shiftStart: null, graceMinutes: 0 },
  ] });
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><OwnerAttendanceShifts token="owner-test" /></QueryClientProvider>);
    for (const text of ["Shift times &amp; late arrivals", "Shift start (IST)", "Grace (minutes)", 'type="time"', 'value="10:00"', 'value="10"', 'value=""', "Other Staff", "Late tracking not configured", "Save shift", "Disable tracking", "not existing records"]) assert.ok(html.includes(text), text);
  } finally { client.clear(); }
});

test("staff see their configured shift and late hero while remaining present with clock-out available", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/staff/attendance-shift", null], { shift: { shiftStart: "10:00", graceMinutes: 10 } });
  client.setQueryData(["/api/staff/face-attendance", null], { enabled: false, profile: null });
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><StaffAttendanceShift /><AttendanceCamera ready status="present" clockIn="2026-11-14T04:42:00Z" lateMinutes={12} onClockOut={() => {}} /></QueryClientProvider>);
    for (const text of ["10:00 IST", "10 minutes of grace", "You are checked in!", "Late by 12 minutes", "Clock Out"]) assert.ok(html.includes(text), text);
    client.setQueryData(["/api/staff/attendance-shift", null], { shift: null });
    const missing = renderToStaticMarkup(<QueryClientProvider client={client}><StaffAttendanceShift /></QueryClientProvider>);
    assert.ok(missing.includes("Late tracking is not configured"));
    assert.ok(!missing.includes("10:00 IST"));
  } finally { client.clear(); }
});
