import assert from "node:assert/strict";
import test from "node:test";
import { fetchCheckInVitals, receptionVitals } from "./receptionVitals";
import { visitTrail } from "./visitTrail";

test("summary loads saved check-in vitals for the exact appointment and refreshes changed readings", async (t) => {
  let pulse = 82;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(input, "/api/appointments/20/reception-vitals");
    assert.equal(init?.signal, signal);
    return Response.json({ appointmentId: 20, patientId: 7, vitals: { bp: "118/76", pulse, height: "160", weight: "61", recordedBy: "staff" } });
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await fetchCheckInVitals(20, 7, signal), { bp: "118/76", pulse: 82, height: "160", weight: "61" });
  pulse = 88;
  assert.equal((await fetchCheckInVitals(20, 7, signal))?.pulse, 88);
});

test("summary rejects mismatched records, missing vitals and API failures instead of using stale props", async (t) => {
  for (const body of [
    { appointmentId: 21, patientId: 7, vitals: { bp: "118/76" } },
    { appointmentId: 20, patientId: 8, vitals: { bp: "118/76" } },
    { appointmentId: 20, patientId: 7 },
    { appointmentId: 20, patientId: 7, vitals: [] },
  ]) {
    const mock = t.mock.method(globalThis, "fetch", async () => Response.json(body));
    await assert.rejects(fetchCheckInVitals(20, 7), /invalid or mismatched/);
    mock.mock.restore();
  }
  const failure = t.mock.method(globalThis, "fetch", async () => Response.json({ error: "Measurements unavailable" }, { status: 503 }));
  await assert.rejects(fetchCheckInVitals(20, 7), /Measurements unavailable/);
  failure.mock.restore();
  t.mock.method(globalThis, "fetch", async () => Response.json({ appointmentId: 20, patientId: 7, vitals: null }));
  assert.equal(await fetchCheckInVitals(20, 7), null);
});

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
