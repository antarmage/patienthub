import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AttendanceInsights, AttendanceYearGrid } from "./AttendanceInsights";
import { attendanceInsightStatus } from "../../../../lib/db/src/attendance-insights";

const record = { employeeId: "test-staff", employeeName: "Test Staff", date: "2026-11-01", status: "present" };

test("year heatmap has one square per day, month labels, exact status colors and totals", () => {
  const html = renderToStaticMarkup(<AttendanceYearGrid year="2026" today="2026-11-14" records={[
    record, { ...record, date: "2026-11-02", status: "regular_day_off" },
    { ...record, date: "2026-11-03", status: "leave" }, { ...record, date: "2026-11-04", status: "pending_approval" },
  ]} />);
  assert.equal((html.match(/aria-pressed=/g) || []).length, 365);
  for (const month of ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]) assert.ok(html.includes(`>${month}</span>`), month);
  assert.ok(html.includes("overflow-x-auto"));
  assert.ok(html.includes('title="2026-01-01: Not recorded"'));
  assert.ok(html.includes('title="2026-12-31: Future day"'));
  assert.match(html, /title="2026-11-01: Present"[^>]+bg-emerald-500/);
  assert.match(html, /title="2026-11-02: Weekly off"[^>]+bg-orange-400/);
  assert.match(html, /title="2026-11-03: Leave"[^>]+bg-red-500/);
  assert.match(html, /title="2026-11-04: Pending approval"[^>]+bg-violet-400/);
  assert.ok(html.includes("2026-11-15: Future day"));
  assert.ok(html.includes("2026-11-05: Not recorded"));
  assert.ok(html.includes("Present: <strong>1</strong>"));
  assert.ok(html.includes("Weekly off: <strong>1</strong>"));
  assert.ok(html.includes("Leave: <strong>1</strong>"));
  assert.ok(html.includes("Missing records are not automatically marked absent"));
  assert.notEqual(attendanceInsightStatus("pending_approval").color, attendanceInsightStatus("present").color);
});

test("owner can select employees including legacy names without mixing their yearly totals", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/owner/attendance-insights", "owner-test", "2026"], {
    employees: [{ id: "test-staff", name: "Test Staff" }, { id: "another-staff", name: "Other Staff" }],
    records: [record, { ...record, employeeId: "another-staff", date: "2026-11-02" }, { ...record, employeeId: null, employeeName: "Legacy Staff" }],
  });
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><AttendanceInsights token="owner-test" today="2026-11-14" /></QueryClientProvider>);
    assert.ok(html.includes("Employee"));
    assert.ok(html.includes("Other Staff"));
    assert.ok(html.includes("Legacy Staff (legacy records)"));
    assert.ok(html.includes("Present: <strong>1</strong>"));
    assert.ok(html.includes("2026-11-02: Not recorded"));
  } finally { client.clear(); }
});

test("staff insights have year selection without another employee selector", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/staff/attendance-insights", null, "2026"], { records: [] });
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><AttendanceInsights today="2026-11-14" /></QueryClientProvider>);
    assert.ok(html.includes('type="number"'));
    assert.ok(html.includes('aria-label="Attendance years"'));
    for (const year of ["2026", "2025", "2024", "2023"]) assert.ok(html.includes(`>${year}</button>`));
    assert.ok(html.includes("No attendance recorded for this year"));
    assert.ok(!html.includes("insights-employee"));
    assert.equal((html.match(/title="\d{4}-\d{2}-\d{2}:/g) || []).length, 365);
  } finally { client.clear(); }
});

test("leap-year heatmap includes February 29 and excludes adjacent years", () => {
  const html = renderToStaticMarkup(<AttendanceYearGrid year="2024" records={[record]} today="2026-11-14" />);
  assert.equal((html.match(/aria-pressed=/g) || []).length, 366);
  assert.ok(html.includes('title="2024-02-29: Not recorded"'));
  assert.ok(!html.includes("2023-12-31:"));
  assert.ok(!html.includes("2025-01-01:"));
  assert.ok(html.includes("Present: <strong>0</strong>"));
});

test("late arrivals keep present color and counts, with a dot, accessible delay and monthly totals", () => {
  const html = renderToStaticMarkup(<AttendanceYearGrid year="2026" today="2026-11-14" records={[
    { ...record, lateMinutes: 12 }, { ...record, date: "2026-11-02", lateMinutes: 0 }, { ...record, date: "2026-11-03", lateMinutes: null },
  ]} />);
  assert.match(html, /title="2026-11-01: Present, Late by 12 minutes"[^>]+bg-emerald-500/);
  assert.ok(html.includes("Present: <strong>3</strong>"));
  assert.ok(html.includes("Late arrivals: <strong>1</strong>"));
  assert.ok(html.includes("Nov late: <strong>1</strong>"));
  assert.ok(html.includes("Jan late: <strong>0</strong>"));
  assert.ok(html.includes("Late arrival (dot)"));
  assert.ok(html.includes("Late arrivals remain present"));
  assert.ok(html.includes('title="2026-11-02: Present"'));
  assert.ok(html.includes('title="2026-11-03: Present"'));
});
