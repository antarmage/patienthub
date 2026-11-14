import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OwnerTimeOff, StaffTimeOff, TimeOffForm } from "./AttendanceTimeOff";

const pending = { id: 1, employeeId: "staff-test", employeeName: "Test Staff", kind: "leave", startDate: "2026-11-16",
  endDate: "2026-11-17", period: "morning", reason: "Personal time", decision: "pending",
  requestedAt: "2026-11-14T04:00:00Z", reviewedAt: null, reviewNote: null };

test("leave form includes a bounded range, reason and morning/afternoon options; weekly off is one full day", () => {
  const leave = renderToStaticMarkup(<TimeOffForm today="2026-11-14" selection={{ kind: "leave", date: "2026-11-16" }} pending={false} onSubmit={() => {}} />);
  for (const value of ["Start date", "End date", "Reason", "Morning half-day", "Afternoon half-day", "Submit application", 'max="2027-02-14"']) assert.ok(leave.includes(value), value);
  const off = renderToStaticMarkup(<TimeOffForm today="2026-11-14" selection={{ kind: "weekly_off", date: "2026-11-16" }} pending onSubmit={() => {}} />);
  assert.ok(!off.includes("End date"));
  assert.ok(!off.includes("Morning half-day"));
  assert.ok(off.includes("One approved or pending full-day weekly off"));
  assert.ok(off.includes('disabled=""'));
});

test("staff see pending applications and withdrawal; only the owner sees approve/reject controls and history", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const data = { requests: [pending, { ...pending, id: 2, decision: "rejected", reviewNote: "Please choose another date" }] };
  client.setQueryData(["/api/staff/time-off", null], data);
  client.setQueryData(["/api/owner/time-off", "owner-test"], data);
  try {
    const staff = renderToStaticMarkup(<QueryClientProvider client={client}><StaffTimeOff today="2026-11-14" selection={null} onClose={() => {}} /></QueryClientProvider>);
    assert.ok(staff.includes("Pending owner approval"));
    assert.ok(staff.includes("Morning half-day"));
    assert.ok(staff.includes(">Withdraw<"));
    assert.ok(staff.includes("Application history"));
    assert.ok(!staff.includes(">Approve<"));
    const owner = renderToStaticMarkup(<QueryClientProvider client={client}><OwnerTimeOff token="owner-test" /></QueryClientProvider>);
    for (const value of ["Test Staff", ">Approve<", ">Reject<", "Owner note", "Please choose another date"]) assert.ok(owner.includes(value), value);
    assert.equal((owner.match(/>Approve</g) || []).length, 1);
  } finally { client.clear(); }
});
