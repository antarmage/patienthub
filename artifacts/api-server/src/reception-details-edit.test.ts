import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import type { Patient } from "@workspace/db";
import { registerClinicalAccess, type AccessActor } from "./clinical-access";
import {
  commitReceptionDetailsEdit, prepareReceptionDetailsEdit, receptionDetailsEditSchema, receptionDetailsProjection,
  registerReceptionDetailsEditRoutes, reservedReceptionHistoryKey,
} from "./reception-details-edit";

const actors: Record<string, AccessActor> = {
  staff: { userId: "staff-id", role: "staff" },
  receptionist: { userId: "desk-id", role: "receptionist" },
  clinician: { userId: "doctor-id", role: "clinician" },
  owner: { userId: "owner-id", role: "owner" },
  admin: { userId: "admin-id", role: "admin" },
  patient: { patientId: 7 }, foreign: { patientId: 8 },
  unknown: { userId: "unknown-id", role: "unknown" },
};
const fixture = (): Patient => ({
  id: 7, name: "Patient", age: 30, phone: "123", email: "patient@example.test",
  address: "Address", dob: "1996-01-01", type: "Pregnant", lmp: "2026-01-01",
  height: "160", weight: 60, pregnancyStatus: "active", condition: "Patient details",
  contraception: null,
  history: {
    medical: ["Old medical history"], allergies: ["Penicillin"], family: { maternal: "Diabetes", paternal: "Healthy" },
    obstetric: { gravida: "2", bloodGroup: "A+", clinicianAssessment: "PRIVATE" },
    conception: { source: "Clinician", recordedAt: "2026-01-01" },
    patientConception: { appointmentId: 4 }, onboardingAppointmentId: 4,
    patientReportedLmp: { recordedBy: "nurse", value: "2026-01-01" },
    receptionDetailsEditAudit: [{ editedBy: "previous", previous: { name: "Old name" } }],
    assessment: "PRIVATE", clinician: { note: "PRIVATE" }, privateNotes: "PRIVATE",
    secretToken: "PRIVATE", diagnosis: "Clinician diagnosis",
  },
  clinicianNote: "PRIVATE", riskScore: { score: 42 }, plan: "Clinician plan",
} as Patient);

async function harness(run: (request: (path: string, actor?: string, method?: string, body?: unknown) => Promise<Response>,
  store: { patient: Patient; reads: number; writes: number; genericWrites: number }) => Promise<void>) {
  const store = { patient: fixture(), reads: 0, writes: 0, genericWrites: 0 };
  const app = express();
  app.use(express.json({ limit: "150kb" }));
  const authenticate = async (req: express.Request) => actors[String(req.headers["x-test-actor"])] ?? null;
  registerClinicalAccess(app, {
    authenticate, appointmentPatientId: async () => 7, clinicalDetailsVisible: async () => false,
  });
  registerReceptionDetailsEditRoutes(app, {
    authenticate,
    async getPatient(id) { store.reads++; return id === 7 ? store.patient : undefined; },
    async savePatient(id, input, actor) {
      if (id !== 7) throw Object.assign(new Error("Patient not found"), { status: 404 });
      const update = prepareReceptionDetailsEdit(store.patient, input, actor, "2026-11-01T00:00:00Z");
      store.patient = { ...store.patient, ...update }; store.writes++;
      return store.patient;
    },
  });
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status || 500).json({ error: "Invalid request" });
  });
  app.use((req, res) => {
    if (req.method !== "GET") store.genericWrites++;
    res.json(store.patient);
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (path: string, actor?: string, method = "GET", body?: unknown) =>
    fetch(`http://127.0.0.1:${address.port}${path}`, {
      method, headers: { "Content-Type": "application/json", ...(actor ? { "X-Test-Actor": actor } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  try { await run(request, store); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

const endpoint = "/api/patients/7/reception-details-edit";
test("editable projection is directly available immediately to persisted permitted staff roles only", async () => {
  await harness(async (request, store) => {
    for (const method of ["GET", "PATCH"]) {
      const body = method === "PATCH" ? { age: 31 } : undefined;
      assert.equal((await request(endpoint, undefined, method, body)).status, 401);
      for (const actor of ["admin", "patient", "foreign", "unknown"]) {
        assert.equal((await request(endpoint, actor, method, body)).status, 403, actor);
      }
    }
    assert.equal(store.reads, 0); assert.equal(store.writes, 0);
    for (const actor of ["staff", "receptionist", "clinician", "owner"]) {
      const response = await request(endpoint, actor);
      assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
      const body = await response.json() as Record<string, any>;
      assert.deepEqual({ ...body }, receptionDetailsProjection(store.patient));
      assert.deepEqual(Object.keys(body).sort(), [
        "id", "name", "age", "phone", "email", "address", "dob", "type", "lmp",
        "height", "weight", "pregnancyStatus", "condition", "contraception", "history",
      ].sort());
      assert.equal(typeof body.id, "number");
      assert.equal(body.patient, undefined);
      assert.deepEqual(body.history.obstetric, { gravida: "2", bloodGroup: "A+" });
      assert.deepEqual(body.history.medical, ["Old medical history"]);
      assert.equal(JSON.stringify(body).includes("PRIVATE"), false);
      assert.equal((await request(endpoint, actor, "PATCH", { age: 31 })).status, 200);
    }
    assert.equal(store.writes, 4);
    assert.equal(store.genericWrites, 0);
  });
});

test("missing patients and invalid IDs return controlled errors without writes", async () => {
  await harness(async (request, store) => {
    for (const method of ["GET", "PATCH"]) {
      const body = method === "PATCH" ? { age: 31 } : undefined;
      assert.equal((await request("/api/patients/99/reception-details-edit", "staff", method, body)).status, 404);
      for (const id of ["0", "-1", "foo", "7.5", "01", "2147483648", "9007199254740993"]) {
        assert.equal((await request(`/api/patients/${id}/reception-details-edit`, "staff", method, body)).status, 400, id);
      }
    }
    assert.equal(store.writes, 0);
  });
});

test("strict typed validation rejects unknown fields, bad dates, ranges, history and reserved namespaces", async () => {
  const invalid: unknown[] = [
    {}, [], null, { id: 7 }, { ["__proto__"]: null }, { constructor: null },
    { clinicianNote: "overwrite" }, { plan: "overwrite" }, { riskScore: {} },
    { visitHistory: [] }, { prescriptions: [] }, { name: " " }, { name: "x".repeat(201) },
    { age: "30" }, { age: -1 }, { age: 131 }, { age: 1.5 }, { age: null },
    { weight: "60" }, { weight: 0 }, { weight: 501 }, { height: 160 }, { height: "20" }, { height: "251" },
    { dob: "2026-02-30" }, { dob: "0000-01-01" }, { dob: "2999-01-01" },
    { lmp: "2026-2-1" }, { lmp: "2999-01-01" }, { lmp: "" }, { email: "bad-email" },
    { pregnancyStatus: "made-up" }, { history: null }, { history: [] }, { history: "text" },
    { history: { medical: "x".repeat(100_000) } },
  ];
  for (const key of [
    "receptionDetailsEditAudit", "patientReportedLmp", "patientConception", "conception",
    "onboardingAppointmentId", "pregnancyFollowUps", "clinician", "assessment", "privateNotes", "auditLog",
    "provenance", "recordedBy", "source", "diagnosis", "secretToken", "__proto__", "constructor",
  ]) {
    invalid.push({ history: { [key]: null } }, { history: { obstetric: { [key]: "spoof" } } });
    assert.equal(reservedReceptionHistoryKey(key), true);
  }
  let deep: Record<string, unknown> = {};
  for (let i = 0; i < 22; i++) deep = { child: deep };
  invalid.push({ history: deep });
  await harness(async (request, store) => {
    for (const body of invalid) assert.equal((await request(endpoint, "staff", "PATCH", body)).status, 400, JSON.stringify(body).slice(0, 150));
    assert.equal(store.writes, 0);
  });
  for (const value of [undefined, Number.NaN, Number.POSITIVE_INFINITY, BigInt(1)]) {
    assert.equal(receptionDetailsEditSchema.safeParse({ history: { medical: value } }).success, false);
  }
});

test("PATCH all editable fields deep-merges history, keeps independent clinical records and retains server revisions", async () => {
  await harness(async (request, store) => {
    const before = structuredClone(store.patient);
    const update = {
      name: " Updated Patient ", age: 31, phone: null, email: "", address: "Updated",
      dob: "1995-02-28", type: "Pregnant", lmp: "2026-02-01", height: "165.5", weight: 65.5,
      pregnancyStatus: "pregnant", condition: "Updated details", contraception: "None",
      history: { medical: ["New history"], family: { maternal: null },
        obstetric: { gravida: "3", surgicalHistory: "Patient reported", bloodGroup: "B+", eod: "2999-01-01" } },
    };
    const response = await request(endpoint, "receptionist", "PATCH", update);
    assert.equal(response.status, 200);
    const projection = await response.json() as Record<string, any>;
    assert.equal(projection.name, "Updated Patient");
    assert.equal(projection.phone, null);
    const history = store.patient.history as Record<string, any>;
    assert.deepEqual(history.family, { maternal: null, paternal: "Healthy" });
    assert.deepEqual(history.allergies, ["Penicillin"]);
    assert.equal(history.obstetric.clinicianAssessment, "PRIVATE");
    assert.equal(history.obstetric.eod, "2999-01-01");
    for (const key of ["conception", "patientConception", "patientReportedLmp", "onboardingAppointmentId", "clinician", "assessment"]) {
      assert.deepEqual(history[key], (before.history as Record<string, unknown>)[key]);
    }
    for (const key of ["clinicianNote", "riskScore", "plan"] as const) assert.deepEqual(store.patient[key], before[key]);
    assert.equal(history.receptionDetailsEditAudit.length, 2);
    const revision = history.receptionDetailsEditAudit[1];
    assert.equal(revision.editedBy, "desk-id"); assert.equal(revision.role, "receptionist");
    assert.equal(revision.editedAt, "2026-11-01T00:00:00Z"); assert.equal(revision.source, "reception-details-edit");
    assert.ok(revision.fields.includes("history.obstetric.gravida"));
    assert.deepEqual(revision.previous, receptionDetailsProjection(before));
    assert.equal(projection.history.receptionDetailsEditAudit, undefined);
    assert.equal(projection.history.obstetric.clinicianAssessment, undefined);

    const second = await request(endpoint, "staff", "PATCH", {
      history: { obstetric: { gravida: null } }, weight: null, dob: null, lmp: null, pregnancyStatus: null,
    });
    assert.equal(second.status, 200);
    const after = store.patient.history as Record<string, any>;
    assert.equal(after.obstetric.gravida, null); assert.equal(after.obstetric.bloodGroup, "B+");
    assert.equal(after.receptionDetailsEditAudit.length, 3);
    assert.deepEqual(after.receptionDetailsEditAudit[1], revision);
    assert.equal(after.receptionDetailsEditAudit[2].previous.weight, 65.5);
    assert.equal((await request(endpoint, "staff", "PATCH", { history: { obstetric: null } })).status, 400);
    assert.equal(after.obstetric.clinicianAssessment, "PRIVATE");
  });
});

test("complete editable history round-trips without deleting hidden nested provenance", async () => {
  await harness(async (request, store) => {
    const editable = await (await request(endpoint, "staff")).json() as Record<string, any>;
    editable.history.obstetric.gravida = "4";
    delete editable.id;
    assert.equal((await request(endpoint, "staff", "PATCH", editable)).status, 200);
    const history = store.patient.history as Record<string, any>;
    assert.equal(history.obstetric.clinicianAssessment, "PRIVATE");
    assert.equal(history.obstetric.gravida, "4");
    assert.equal(history.receptionDetailsEditAudit.length, 2);
  });
});

test("registration-only revisions retain legacy audit and bounds include omitted editable history", () => {
  const current = fixture();
  (current.history as Record<string, unknown>).receptionDetailsEditAudit = { legacy: "retained" };
  const update = prepareReceptionDetailsEdit(current, { name: "New name" }, { userId: "staff-id", role: "staff" });
  assert.deepEqual((update.history.receptionDetailsEditAudit as any[])[0], { retainedPreviousAudit: { legacy: "retained" } });
  const large = fixture();
  large.history = { medical: "x".repeat(99_900) };
  assert.throws(() => prepareReceptionDetailsEdit(large, { history: { allergies: "x".repeat(200) } },
    { userId: "staff-id", role: "staff" }), /Merged editable history/);
});

test("transaction reads the locked latest row, retains sequential revisions, and rolls back failures", async () => {
  let patient = fixture();
  let previous: Promise<void> = Promise.resolve();
  const transaction = async (input: Parameters<typeof commitReceptionDetailsEdit>[2], fail = false) => {
    const waiting = previous;
    let release!: () => void;
    previous = new Promise<void>((resolve) => { release = resolve; });
    let locked = false;
    let pending: Patient | undefined;
    try {
      const result = await commitReceptionDetailsEdit({
        async lockPatient(id) {
          await waiting;
          assert.equal(id, 7); locked = true;
          return structuredClone(patient);
        },
        async updatePatient(id, update) {
          assert.equal(locked, true); assert.equal(id, 7);
          pending = { ...patient, ...update };
          if (fail) throw new Error("Simulated database failure");
          return pending;
        },
      }, 7, input, { userId: "staff-id", role: "staff" });
      patient = pending!;
      return result;
    } finally { release(); }
  };
  await Promise.all([
    transaction({ history: { family: { maternal: "Updated" } }, age: 31 }),
    transaction({ history: { family: { paternal: "Updated" } }, weight: 62 }),
  ]);
  const history = patient.history as Record<string, any>;
  assert.deepEqual(history.family, { maternal: "Updated", paternal: "Updated" });
  assert.equal(patient.age, 31); assert.equal(patient.weight, 62);
  assert.equal(history.receptionDetailsEditAudit.length, 3);
  assert.equal(history.receptionDetailsEditAudit[2].previous.age, 31);
  assert.equal(history.receptionDetailsEditAudit[2].previous.history.family.maternal, "Updated");
  const before = structuredClone(patient);
  await assert.rejects(transaction({ history: { medical: "Discarded" }, name: "Discarded" }, true), /database failure/);
  assert.deepEqual(patient, before);
  await assert.rejects(commitReceptionDetailsEdit({
    lockPatient: async () => undefined,
    updatePatient: async () => { throw new Error("Must not write"); },
  }, 99, { age: 31 }, { userId: "staff-id", role: "staff" }), { status: 404 });
});

test("generic authoring endpoints stay denied even after a permitted receptionist details edit", async () => {
  await harness(async (request, store) => {
    assert.equal((await request(endpoint, "staff", "PATCH", { history: { medical: "Patient reported" } })).status, 200);
    for (const actor of ["staff", "receptionist"]) {
      for (const [path, method, body] of [
        ["/api/patients/7", "PATCH", { history: {} }],
        ["/api/desk/patients/7", "PATCH", { condition: "Clinical" }],
        ["/api/patients/7/visit-history", "POST", {}],
        ["/api/patients/7/diagnoses", "PUT", {}],
        ["/api/patients/7/manual-prescription", "POST", {}],
        ["/api/patients/7/clinical-notes", "POST", {}],
        ["/api/clinical-notes/1", "PATCH", {}],
        ["/api/medications/1", "PATCH", {}],
        ["/api/appointments/4", "PATCH", { notes: "Clinical", seenAt: "2026-11-01" }],
      ] as const) assert.equal((await request(path, actor, method, body)).status, 403, path);
    }
    assert.equal(store.genericWrites, 0);
  });
});
