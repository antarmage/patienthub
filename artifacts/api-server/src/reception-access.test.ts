import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { registerClinicalAccess, type AccessActor } from "./clinical-access";
import {
  assertPreconsult, prepareReceptionVitals, receptionMeasurements,
  receptionVitalsSchema, registerReceptionAccessRoutes,
} from "./reception-access";

const actors: Record<string, AccessActor> = {
  doctor: { userId: "doctor", role: "clinician" }, owner: { userId: "owner", role: "owner" },
  reception: { userId: "reception", role: "staff" }, desk: { userId: "desk", role: "receptionist" },
  admin: { userId: "admin", role: "admin" }, patient: { patientId: 7 },
  unknown: { userId: "unknown", role: "unknown" },
};
const patient = {
  id: 7, name: "Patient", history: { onboarding: { lastPeriod: "2026-01-01" } },
  condition: "Clinical", lmp: "2026-01-01", clinicianNote: "PRIVATE", futureSecret: "PRIVATE",
};
type Store = { visible: boolean; updatedBy?: string; updatedAt?: string; writes: number; vitals: unknown; lmp: string | null; status: string; seenAt: string | null };
const freshStore = (): Store => ({ visible: false, writes: 0, vitals: { pulse: 72, rr: 18, secret: "PRIVATE" }, lmp: null, status: "checked-in", seenAt: null });

async function harness(store: Store, run: (request: (path: string, actor?: string, method?: string, body?: unknown) => Promise<Response>) => Promise<void>) {
  const app = express();
  app.use(express.json());
  const authenticate = async (req: express.Request) => actors[String(req.headers["x-test-actor"])] ?? null;
  registerClinicalAccess(app, { authenticate, clinicalDetailsVisible: async () => store.visible, appointmentPatientId: async () => 7 });
  registerReceptionAccessRoutes(app, {
    authenticate,
    clinicalDetailsVisible: async () => store.visible,
    async saveClinicalDetailsVisible(visible, userId) {
      store.visible = visible; store.updatedBy = userId; store.updatedAt = new Date().toISOString(); store.writes++;
    },
    async getVitals(id) {
      if (id !== 4) throw Object.assign(new Error("Appointment or associated patient not found"), { status: 404 });
      return { appointmentId: id, patientId: 7, vitals: receptionMeasurements(store.vitals), lmp: store.lmp };
    },
    async saveVitals(id, input, userId) {
      if (id !== 4) throw Object.assign(new Error("Appointment or associated patient not found"), { status: 404 });
      assertPreconsult({ status: store.status, seenAt: store.seenAt, completedAt: null });
      const result = prepareReceptionVitals(store.vitals, input, userId);
      store.vitals = result.vitals; store.lmp = result.patientReportedLmp.value; store.writes++;
      return { appointmentId: id, patientId: 7, vitals: receptionMeasurements(store.vitals), lmp: store.lmp };
    },
  });
  app.use((req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) store.writes++;
    if (req.path.includes("clinical-notes")) return res.json([{ id: 1, isPrivate: 0 }, { id: 2, isPrivate: true }, { id: 3, isPrivate: 1 }]);
    if (req.path.includes("invoices")) return res.json({ total: 600, diagnoses: ["PRIVATE"], diagnosisEncounterId: 1 });
    if (req.path.endsWith("/file")) return res.type("application/pdf").send("report bytes");
    res.json(req.path === "/api/patients" ? [patient] : patient);
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (path: string, actor?: string, method = "GET", body?: unknown) => fetch(`http://127.0.0.1:${address.port}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(actor ? { "X-Test-Actor": actor } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try { await run(request); } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

test("default off, clinician/owner-only configuration, persisted policy survives app recreation and revocation", async () => {
  const store = freshStore();
  await harness(store, async (request) => {
    for (const method of ["GET", "PUT"]) {
      assert.equal((await request("/api/clinic/reception-access", undefined, method, method === "PUT" ? {} : undefined)).status, 401);
      for (const actor of method === "PUT" ? ["patient", "unknown", "admin"] : ["patient", "unknown"]) assert.equal((await request("/api/clinic/reception-access", actor, method, method === "PUT" ? {} : undefined)).status, 403);
    }
    for (const actor of ["reception", "desk", "admin", "doctor", "owner"]) {
      assert.deepEqual(await (await request("/api/clinic/reception-access", actor)).json(), { clinicalDetailsVisible: false, canRecordVitals: true });
    }
    for (const actor of ["reception", "desk"]) assert.equal((await request("/api/clinic/reception-access", actor, "PUT", { clinicalDetailsVisible: true })).status, 403);
    for (const body of [{}, { clinicalDetailsVisible: "true" }, { clinicalDetailsVisible: true, updatedBy: "spoof" }]) {
      assert.equal((await request("/api/clinic/reception-access", "doctor", "PUT", body)).status, 400);
    }
    assert.equal(store.writes, 0);
    assert.equal((await request("/api/patients/7/visit-history", "reception")).status, 403);
    assert.equal((await request("/api/clinic/reception-access", "doctor", "PUT", { clinicalDetailsVisible: true })).status, 200);
    assert.equal(store.updatedBy, "doctor");
    assert.ok(Number.isFinite(Date.parse(store.updatedAt!)));
  });
  await harness(store, async (request) => {
    assert.deepEqual(await (await request("/api/clinic/reception-access", "reception")).json(), { clinicalDetailsVisible: true, canRecordVitals: true });
    for (const actor of ["reception", "desk"]) {
      for (const path of ["/api/patients", "/api/patients/7", "/api/desk/patients/7"]) {
        const response = await request(path, actor);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        const body = await response.json(), row = Array.isArray(body) ? body[0] : body;
        assert.equal(row.condition, "Clinical");
        assert.deepEqual(row.history, patient.history);
        assert.equal(row.futureSecret, undefined); assert.equal(row.clinicianNote, undefined);
      }
      for (const path of ["/api/patients/7/visit-history", "/api/visit-history", "/api/patients/7/medications", "/api/medications", "/api/documents", "/api/patients/7/documents", "/api/patients/7/pregnancy-metrics", "/api/patients/7/lab-results", "/api/patients/7/diagnoses"]) {
        assert.equal((await request(path, actor)).status, 200, path);
      }
      assert.equal(await (await request("/api/patients/7/documents/8/file", actor)).text(), "report bytes");
      for (const path of ["/api/clinical-notes", "/api/patients/7/clinical-notes"]) assert.deepEqual(await (await request(path, actor)).json(), [{ id: 1, isPrivate: 0 }]);
    }
    assert.equal((await request("/api/patients/7/visit-history", "admin")).status, 403);
    const before = store.writes;
    for (const [path, method, body] of [
      ["/api/patients/7/manual-prescription", "POST", {}], ["/api/patients/7/diagnoses", "PUT", {}],
      ["/api/medications/1", "PATCH", {}], ["/api/clinical-notes/1", "DELETE", {}],
      ["/api/patients/7", "PATCH", { history: {} }], ["/api/appointments/4", "PATCH", { vitals: {} }],
      ["/api/invoices/1", "PATCH", { diagnosisEncounterId: 1 }],
      ["/api/google-drive/import-lab-reports", "POST", {}], ["/api/google-sheets/sync", "POST", {}],
      ["/api/ocr/prescription", "POST", {}],
    ] as const) assert.equal((await request(path, "reception", method, body)).status, 403, path);
    assert.equal((await request("/api/icd10/search", "reception")).status, 403);
    assert.equal(store.writes, before);
    assert.deepEqual(await (await request("/api/invoices/1", "reception")).json(), { total: 600 });
    assert.equal((await request("/api/clinic/reception-access", "owner", "PUT", { clinicalDetailsVisible: false })).status, 200);
    assert.equal(store.updatedBy, "owner");
    assert.equal((await request("/api/patients/7/documents/8/file", "reception")).status, 403);
    assert.equal((await request("/api/visit-history", "reception")).status, 403);
    assert.deepEqual(await (await request("/api/patients/7", "reception")).json(), { id: 7, name: "Patient" });
    assert.equal((await request("/api/patients/7/visit-history", "doctor")).status, 200);
    assert.equal((await request("/api/patients/7/visit-history", "patient")).status, 200);
    assert.equal((await request("/api/patients/8/visit-history", "patient")).status, 403);
  });
});

test("vitals entry and minimal prefill work with clinical read off without queue transitions", async () => {
  const store = freshStore();
  await harness(store, async (request) => {
    for (const method of ["GET", "POST"]) {
      assert.equal((await request("/api/appointments/4/reception-vitals", undefined, method, method === "POST" ? {} : undefined)).status, 401);
      for (const actor of ["patient", "unknown", "admin"]) assert.equal((await request("/api/appointments/4/reception-vitals", actor, method, method === "POST" ? {} : undefined)).status, 403);
    }
    assert.deepEqual(await (await request("/api/appointments/4/reception-vitals", "reception")).json(), { appointmentId: 4, patientId: 7, vitals: { pulse: 72 }, lmp: null });
    const response = await request("/api/appointments/4/reception-vitals", "desk", "POST", {
      vitals: { bp: "120/80", weight: "60", height: "165", temp: "98.6", recordedAt: "spoof" }, lmp: "2026-01-01",
    });
    assert.equal(response.status, 200);
    const body = await response.json() as { vitals: Record<string, unknown>; lmp: string | null };
    assert.equal(body.vitals.temp, 98.6);
    const beforeInvalidTemperature = store.writes;
    const invalidTemperature = await request("/api/appointments/4/reception-vitals", "desk", "POST", { vitals: { pulse: 80, temp: 37 }, lmp: null });
    assert.equal(invalidTemperature.status, 400);
    assert.deepEqual(await invalidTemperature.json(), { error: "Temperature must be between 86 and 113 °F" });
    assert.equal(store.writes, beforeInvalidTemperature);
    assert.equal(body.vitals.pulse, 72); assert.equal(body.vitals.weight, 60); assert.equal(body.vitals.recordedBy, "desk");
    assert.notEqual(body.vitals.recordedAt, "spoof"); assert.equal(body.lmp, "2026-01-01");
    assert.equal((store.vitals as Record<string, unknown>).rr, 18);
    assert.equal(store.status, "checked-in"); assert.equal(store.seenAt, null); assert.equal(store.visible, false);
    for (const actor of ["reception", "doctor", "owner"]) {
      assert.equal((await request("/api/appointments/4/reception-vitals", actor, "POST", { vitals: null, lmp: null })).status, 200);
    }
    assert.equal((store.vitals as Record<string, unknown>).pulse, 72);
    for (const path of ["/api/appointments/4abc/reception-vitals", "/api/appointments/0/reception-vitals", "/api/appointments/9007199254740992/reception-vitals"]) {
      assert.equal((await request(path, "reception")).status, 400);
    }
    assert.equal((await request("/api/appointments/99/reception-vitals", "reception")).status, 404);
    assert.equal((await request("/api/appointments/99/reception-vitals", "reception", "POST", { vitals: null, lmp: null })).status, 404);
    const before = store.writes;
    store.seenAt = new Date().toISOString();
    assert.equal((await request("/api/appointments/4/reception-vitals", "reception", "POST", { vitals: { pulse: 80 }, lmp: null })).status, 409);
    store.seenAt = null; store.status = "completed";
    assert.equal((await request("/api/appointments/4/reception-vitals", "doctor", "POST", { vitals: { pulse: 80 }, lmp: null })).status, 409);
    assert.equal(store.writes, before);
  });
});

test("measurement validation rejects provenance, clinical fields, impossible dates, invalid BP and nonfinite/coerced values", () => {
  const valid = { vitals: { bp: "120/80", pulse: 70, temp: 98.6, spo2: 99, weight: 60, height: 165, bmi: 22 }, lmp: "2026-01-01" };
  assert.ok(receptionVitalsSchema.safeParse(valid).success);
  const invalid: unknown[] = [
    {}, { ...valid, patientId: 8 }, { ...valid, status: "completed" },
    ...["2026-02-30", "0000-01-01", "2999-01-01", "yesterday"].map((lmp) => ({ ...valid, lmp })),
    { ...valid, vitals: {} }, { ...valid, vitals: { recordedAt: "spoof" } },
    ...["120", "80/120", "10/5", "300/80", "120/200"].map((bp) => ({ ...valid, vitals: { bp } })),
    ...[NaN, Infinity, -Infinity, true, {}, [], "", "Infinity", "70bpm", -1, 251].map((pulse) => ({ ...valid, vitals: { pulse } })),
    ...[36.8, 85.9, 113.1].map((temp) => ({ ...valid, vitals: { temp } })), { ...valid, vitals: { spo2: 101 } },
    { ...valid, vitals: { weight: 0 } }, { ...valid, vitals: { height: 0 } },
    { ...valid, vitals: { bmi: -1 } }, { ...valid, vitals: { recordedBy: "doctor", pulse: 70 } },
  ];
  for (const body of invalid) assert.equal(receptionVitalsSchema.safeParse(body).success, false, JSON.stringify(body));
  for (const status of ["seen", "in-consultation", "completed", "cancelled", "no-show", "unknown"]) {
    assert.throws(() => assertPreconsult({ status, seenAt: null, completedAt: null }), /before consultation/);
  }
  assert.throws(() => assertPreconsult({ status: "scheduled", seenAt: null, completedAt: "2026-01-01" }));
  const update = prepareReceptionVitals({ bp: "110/70", pulse: 72 }, { vitals: { pulse: 80, recordedAt: "spoof" }, lmp: null }, "reception", "2026-01-01T00:00:00Z");
  assert.deepEqual(update.vitals, { bp: "110/70", pulse: 80, recordedAt: "2026-01-01T00:00:00Z", recordedBy: "reception" });
  assert.deepEqual(update.patientReportedLmp, { value: null, source: "patient-reported", recordedAt: "2026-01-01T00:00:00Z", recordedBy: "reception" });
});

test("reception temperature accepts Fahrenheit decimals and exact bounds without changing stored units", () => {
  for (const temp of [86, 98.6, 100.4, 113, "86", "98.6", "113"]) {
    const result = receptionVitalsSchema.safeParse({ vitals: { temp }, lmp: null });
    assert.ok(result.success);
    assert.equal(result.data.vitals?.temp, Number(temp));
  }
});
