import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FACE_MODEL } from "../../../../lib/db/src/face-attendance";
import { clinicDate } from "../../../../lib/db/src/follow-up";
import { AttendanceCamera } from "./AttendanceCamera";
import { StaffAttendance } from "./StaffAttendance";
import { OwnerFaceAttendance } from "./OwnerFaceAttendance";

function render(element: React.ReactNode, enabled: boolean, status?: string, enrolled = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/staff/face-attendance", null], {
    enabled, profile: enrolled ? { descriptor: Array(128).fill(0.1), model: FACE_MODEL, approvedAt: new Date().toISOString() } : null,
  });
  const today = clinicDate();
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  client.setQueryData(["/api/staff/attendance", null, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)], status ? [{
    id: 1, date: today, clockIn: null, clockOut: null, status, hoursWorked: null,
  }] : []);
  client.setQueryData(["/api/owner/face-attendance", "test-token"], {
    enabled, employees: [{ id: "test-staff", name: "Test Receptionist", enrolled }],
    reviews: [{ id: 1, employeeName: "Test Receptionist", date: today, requestedAt: new Date().toISOString(), reason: "Camera unavailable", decision: "pending" }],
  });
  try { return renderToStaticMarkup(<QueryClientProvider client={client}>{element}</QueryClientProvider>); }
  finally { client.clear(); }
}

test("camera check-in asks for consent and explains local processing and spoofing limits", () => {
  const html = render(<AttendanceCamera ready />, true);
  for (const text of ["Welcome!", "Check In", "I agree to use my camera", "Camera images stay on this device", "not a liveness check", "Request owner approval"]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes("<video"));
});

test("missing enrollment and disabled rollout have explicit next steps", () => {
  assert.ok(render(<AttendanceCamera ready />, true, undefined, false).includes("Ask the owner to enroll your photo first"));
  const html = render(<StaffAttendance />, false);
  assert.ok(html.includes("Face check-in is not enabled yet"));
  assert.ok(html.includes(">Clock in<"));
  assert.ok(html.includes("Regular day off"));
  assert.ok(html.includes(">Leave<"));
  assert.ok(!render(<StaffAttendance />, true).includes(">Clock in<"));
});

test("pending and completed attendance cannot offer another camera check-in", () => {
  for (const status of ["pending_approval", "present", "leave", "regular_day_off"]) {
    const html = render(<AttendanceCamera ready status={status} />, true);
    assert.ok(!html.includes(">Check In<"));
    assert.ok(!html.includes("Request owner approval"));
  }
  const pending = render(<StaffAttendance />, true, "pending_approval");
  assert.ok(pending.includes("You will be marked present only after the owner approves it"));
  assert.ok(pending.includes("Pending owner approval"));
  assert.ok(!pending.includes(">Clock in<"));
});

test("owner can enroll with consent, remove enrollment and review the actual request time", () => {
  const html = render(<OwnerFaceAttendance token="test-token" />, true);
  for (const text of ["Face enrollment", "Test Receptionist", "obtained their consent", "Approve &amp; enroll photo", "Pending attendance approvals", "Camera unavailable", "Approve attendance", ">Reject<", "Approval records this as the clock-in time", "not tamper-proof"]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes("0.1,0.1"));
});

test("main attendance card offers clock-out only after a clock-in and before clock-out", () => {
  const clockIn = new Date().toISOString();
  for (const enabled of [true, false]) {
    const active = render(<AttendanceCamera ready status="present" clockIn={clockIn} onClockOut={() => {}} />, enabled);
    assert.ok(active.includes(">Clock Out<"));
    assert.ok(!active.includes(">Check In<"));
    const done = render(<AttendanceCamera ready status="present" clockIn={clockIn} clockOut={clockIn} onClockOut={() => {}} />, enabled);
    assert.ok(done.includes("You are checked out!"));
    assert.ok(!done.includes(">Clock Out<"));
    const pending = render(<AttendanceCamera ready status="pending_approval" onClockOut={() => {}} />, enabled);
    assert.ok(!pending.includes(">Clock Out<"));
  }
  const saving = render(<AttendanceCamera ready clockIn={clockIn} onClockOut={() => {}} updating attendanceError="Could not record clock-out" />, true);
  assert.ok(saving.includes("Recording clock-out..."));
  assert.ok(saving.includes("Could not record clock-out"));
  assert.ok(saving.includes("disabled="));
});
