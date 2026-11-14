import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AttendanceInsights, AttendanceMonthGrid } from "./AttendanceInsights";
import { attendanceInsightStatus } from "../../../../lib/db/src/attendance-insights";

const record = { employeeId: "test-staff", employeeName: "Test Staff", date: "2026-11-01", status: "present" };

test("month squares have exact requested colors, dates, counts and distinct pending state", () => {
  const html = renderToStaticMarkup(<AttendanceMonthGrid month="2026-11" today="2026-11-14" records={[
    record, { ...record, date: "2026-11-02", status: "regular_day_off" },
    { ...record, date: "2026-11-03", status: "leave" }, { ...record, date: "2026-11-04", status: "pending_approval" },
  ]} />);
  assert.equal((html.match(/aria-pressed=/g) || []).length, 30);
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

test("owner can select employees including legacy names without mixing their monthly totals", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/owner/attendance-insights", "owner-test", "2026-11"], {
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

test("staff insights are month-selectable without another employee selector", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/staff/attendance-insights", null, "2026-11"], { records: [] });
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><AttendanceInsights today="2026-11-14" /></QueryClientProvider>);
    assert.ok(html.includes('type="month"'));
    assert.ok(html.includes("No attendance recorded for this month"));
    assert.ok(!html.includes("insights-employee"));
    assert.equal((html.match(/aria-pressed=/g) || []).length, 30);
  } finally { client.clear(); }
});
