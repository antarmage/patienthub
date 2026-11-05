import assert from "node:assert/strict";
import test from "node:test";
import { receptionVitals } from "./receptionVitals";
import { visitTrail } from "./visitTrail";

test("vitals show the recorder's name and a readable IST time, not raw audit values", () => {
  const vitals = {
    bp: "100/60", height: 162, weight: 66.8,
    recordedAt: "2026-11-05T12:11:59.303Z",
    recordedBy: "synthetic-staff-id", recordedByName: "Reception staff",
  };
  const details = receptionVitals(vitals) as Record<string, unknown>;
  assert.equal(details["Recorded by"], "Reception staff");
  assert.match(String(details["Recorded at"]), /5 Nov 2026/);
  assert.match(String(details["Recorded at"]), /5:41 pm/i);
  assert.match(String(details["Recorded at"]), /IST|GMT\+5:30/);
  assert.equal(details.bp, "100/60");
  assert.equal(details.height, 162);
  assert.equal(details.weight, 66.8);
  assert.doesNotMatch(JSON.stringify(details), /synthetic-staff-id|recordedByName|2026-11-05T/);
  assert.equal(vitals.recordedBy, "synthetic-staff-id");
});

test("missing staff and invalid times are explicit without exposing IDs or inventing values", () => {
  assert.deepEqual(receptionVitals({ recordedBy: "deleted-staff", recordedByName: null, recordedAt: "invalid" }), {
    "Recorded at": "Invalid recorded time", "Recorded by": "Staff member unavailable",
  });
  assert.deepEqual(receptionVitals({ bp: "110/70" }), { bp: "110/70" });
  assert.equal(receptionVitals(null), null);
});

test("appointment-only and saved consultations both use the correct vitals recorder", () => {
  const trail = visitTrail([
    { id: 1, appointmentId: 1, date: "2026-11-05", vitals: { recordedBy: "doctor", recordedByName: null } },
  ], [
    { id: 1, date: "2026-11-05", vitals: { bp: "100/60", recordedBy: "desk", recordedByName: "Reception staff" } },
    { id: 2, date: "2026-11-05", vitals: { recordedBy: "desk", recordedByName: "Reception staff" } },
  ]);
  assert.deepEqual(receptionVitals(trail.find((row) => !row.appointmentOnly)?.vitals), {
    bp: "100/60", "Recorded by": "Staff member unavailable",
  });
  assert.deepEqual(receptionVitals(trail.find((row) => row.appointmentOnly)?.vitals), {
    "Recorded by": "Reception staff",
  });
});
