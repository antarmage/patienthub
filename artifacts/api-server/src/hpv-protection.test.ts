import assert from "node:assert/strict";
import { it } from "node:test";
import express from "express";
import { createServer } from "node:http";
import { hpvClinicStatuses, registerHpvStatusRoute } from "./hpv-protection";

const schedules = [
  { id: 1, vaccineName: "HPV9", eligibility: "age", doseOffsetsMonths: [0, 6], doseGestationalWeeks: [] },
  { id: 2, vaccineName: "HPV9", eligibility: "age", doseOffsetsMonths: [0, 2, 6], doseGestationalWeeks: [] },
  { id: 3, vaccineName: "Tdap", eligibility: "pregnancy", doseOffsetsMonths: [], doseGestationalWeeks: [27] },
];

it("marks all doses of an HPV schedule as protected and partial doses as in progress", () => {
  const records = [
    { patientId: 10, scheduleId: 2, doseNumber: 1 },
    { patientId: 10, scheduleId: 2, doseNumber: 2 },
    { patientId: 10, scheduleId: 2, doseNumber: 3 },
    { patientId: 11, scheduleId: 2, doseNumber: 1 },
    { patientId: 11, scheduleId: 2, doseNumber: 3 },
    { patientId: 12, scheduleId: 3, doseNumber: 1 },
    { patientId: 13, scheduleId: 1, doseNumber: 1 },
    { patientId: 13, scheduleId: 1, doseNumber: 2 },
  ];
  assert.deepEqual(hpvClinicStatuses([10, 11, 12, 13], schedules, records), { 10: "protected", 11: "in-progress", 13: "protected" });
});

it("only reports the requested patients", () => {
  const records = [{ patientId: 10, scheduleId: 1, doseNumber: 1 }];
  assert.deepEqual(hpvClinicStatuses([99], schedules, records), {});
});

it("combines patient answers and clinic doses through a narrow authenticated HPV endpoint", async () => {
  const app = express();
  let reads = 0;
  registerHpvStatusRoute(app, {
    authenticate: async (req) => req.headers.authorization === "patient" ? { patientId: 1 } :
      typeof req.headers.authorization === "string" ? { userId: "test", role: req.headers.authorization } : null,
    clinicStatuses: async () => { reads++; return { 2: "protected", 3: "in-progress", 99: "protected" }; },
    surveyAnswers: async () => [
      { id: 1, answer: " Yes, all doses " }, { id: 2, answer: "Yes, some doses" },
      { id: 3, answer: "No" }, { id: 4, answer: "Yes, some doses" },
      { id: 5, answer: "No" }, { id: 6, answer: "Not sure" }, { id: 7, answer: null },
      { id: 99, answer: "Yes, all doses" },
    ],
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (role?: string, ids = "1,2,3,4,5,6,7") => fetch(`http://127.0.0.1:${address.port}/api/hpv-protection?patientIds=${ids}`, { headers: role ? { Authorization: role } : {} });
  try {
    assert.equal((await request()).status, 401);
    for (const role of ["patient", "unknown"]) assert.equal((await request(role)).status, 403);
    for (const ids of ["", "1,invalid", "0", "-1", "1.5", "9007199254740992", Array.from({ length: 501 }, (_, i) => i + 1).join(",")]) {
      assert.equal((await request("staff", ids)).status, 400);
    }
    assert.equal(reads, 0);
    for (const role of ["staff", "receptionist", "clinician", "owner", "admin"]) {
      const response = await request(role);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(await response.json(), { 1: "protected", 2: "protected", 3: "in-progress", 4: "in-progress" });
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
