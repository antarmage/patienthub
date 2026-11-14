import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OwnerStaffProfilePhoto, StaffProfileAvatar } from "./StaffProfilePhoto";
import { AttendanceCamera } from "./AttendanceCamera";
import { FACE_MODEL } from "../../../../lib/db/src/face-attendance";

const photo = "data:image/jpeg;base64,/9j/4AAQ/9k=";
test("staff avatar fallback displays initials without an external image", () => {
  const html = renderToStaticMarkup(<StaffProfileAvatar name="Test Receptionist" photo={null} />);
  assert.ok(html.includes("TR"));
  assert.ok(!html.includes("<img"));
});

test("owner photo editor displays upload and deletion separately from biometric enrollment", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/owner/staff-profile-photo", "test-owner", "test-staff"], { name: "Test Receptionist", photo });
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><OwnerStaffProfilePhoto employeeId="test-staff" name="Test Receptionist" token="test-owner" /></QueryClientProvider>);
    assert.ok(html.includes('type="file"'));
    assert.ok(html.includes("Profile photo for Test Receptionist"));
    assert.ok(html.includes("Remove photo"));
    assert.ok(!html.includes("Remove enrollment"));
    assert.ok(!html.includes("Save profile photo"));
  } finally { client.clear(); }
});

test("attendance welcome uses the staff profile name without treating it as verified attendance", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/staff/profile", null], { name: "Test Receptionist", photo });
  client.setQueryData(["/api/staff/face-attendance", null], { enabled: true, profile: { descriptor: Array(128).fill(0.1), model: FACE_MODEL, approvedAt: new Date().toISOString() } });
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><AttendanceCamera ready /></QueryClientProvider>);
    assert.ok(html.includes("Welcome, Test Receptionist!"));
    assert.ok(html.includes("Check In"));
    assert.ok(html.includes("I agree to use my camera"));
    assert.ok(!html.includes("You are checked in!"));
  } finally { client.clear(); }
});
