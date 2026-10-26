import assert from "node:assert/strict";
import { it } from "node:test";
import { directoryAppointmentUrl, directoryPatientIds, fetchDirectoryAppointments } from "./patientDirectory.ts";
import { readAppointmentRange } from "../../../api-server/src/appointment-range.ts";

it("fetches the directory's dates independently from today's dashboard dates", () => {
  assert.equal(directoryAppointmentUrl("2026-10-01", ""), "/api/appointments?from=2026-10-01");
  assert.equal(directoryAppointmentUrl("", "2026-10-31"), "/api/appointments?to=2026-10-31");
  assert.equal(directoryAppointmentUrl("2026-09-01", "2026-10-31"), "/api/appointments?from=2026-09-01&to=2026-10-31");
});

it("fetches October 1 onwards with no to parameter and retains the API error on failure", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ error: "Authentication required" }), { status: 403, headers: { "content-type": "application/json" } });
  });
  await assert.rejects(fetchDirectoryAppointments("2026-10-01", ""), /HTTP 403.*Authentication required/);
  assert.deepEqual(calls, ["/api/appointments?from=2026-10-01"]);
});

it("returns historical appointments for an open-ended range", async (t) => {
  const appointments = [{ patientId: 1, date: "2026-10-01", status: "completed" }, { patientId: 2, date: "2026-10-20", status: "completed" }];
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(appointments), { headers: { "content-type": "application/json" } }));
  assert.deepEqual(await fetchDirectoryAppointments("2026-10-01", ""), appointments);
});

it("reports incorrect API routing and malformed results rather than treating them as no patients", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response("<html>App</html>", { headers: { "content-type": "text/html" } }));
  await assert.rejects(fetchDirectoryAppointments("2026-10-01", ""), /page instead of JSON/);
  mock.mock.mockImplementation(async () => new Response('{"appointments":[]}', { headers: { "content-type": "application/json" } }));
  await assert.rejects(fetchDirectoryAppointments("2026-10-01", ""), /invalid appointment list/);
});

it("includes both boundaries, historical appointments and all statuses except cancellations", () => {
  const appointments = [
    { patientId: 1, date: "2026-10-01", status: "completed" },
    { patientId: 2, date: "2026-10-12", status: "no-show" },
    { patientId: 3, date: "2026-10-26", status: "checked-in" },
    { patientId: 4, date: "2026-10-31", status: "scheduled" },
    { patientId: 5, date: "2026-09-30", status: "completed" },
    { patientId: 6, date: "2026-10-02", status: "Cancelled" },
    { patientId: 7, date: "2026-10-03", status: "canceled" },
    { patientId: 1, date: "2026-10-10", status: "completed" },
  ];
  assert.deepEqual([...directoryPatientIds(appointments, "2026-10-01", "2026-10-31")], ["1", "2", "3", "4"]);
  assert.deepEqual([...directoryPatientIds(appointments, "2026-10-01", "")], ["1", "2", "3", "4"]);
  assert.deepEqual([...directoryPatientIds(appointments, "", "2026-10-01")], ["1", "5"]);
});

it("does not truncate ranges longer than 31 days and validates server range inputs", () => {
  assert.deepEqual(readAppointmentRange("2026-01-01", "2026-10-31"), { from: "2026-01-01", to: "2026-10-31" });
  assert.deepEqual(readAppointmentRange("2026-10-01", undefined), { from: "2026-10-01" });
  assert.deepEqual(readAppointmentRange(undefined, "2026-10-31"), { to: "2026-10-31" });
  for (const [from, to] of [["2026-02-30", undefined], ["invalid", undefined], ["2026-10-31", "2026-10-01"], [["2026-10-01"], undefined], ["", undefined], [undefined, {}]]) {
    assert.equal(readAppointmentRange(from, to), null);
  }
});
