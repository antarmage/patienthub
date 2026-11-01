import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { checkInIsToday, registerClinicalAccess, rescheduledLogistics, type AccessActor } from "./clinical-access";

const patient = {
  id: 7, name: "Test Patient", phone: "0000000000", age: 28, dob: "1998-01-01",
  email: "patient@example.invalid", address: "Test address", mode: "in-clinic",
  lastVisit: "2026-10-30", nextReview: "2026-11-02", isPrimeMember: true,
  condition: "PRIVATE", type: "Pregnant", lmp: "2026-01-01", pregnancyStatus: "active",
  history: { diagnosis: "PRIVATE" }, clinicianNote: "PRIVATE", riskScore: { level: "High" },
  trimesterChecklist: ["PRIVATE"], weight: 60, plan: "PRIVATE", futureClinicalField: "PRIVATE",
};
const appointment = {
  id: 4, patientId: 7, providerId: 2, date: "2026-11-01", time: "10:00",
  type: "Consultation", status: "scheduled", checkedInAt: null, seenAt: null,
  completedAt: null, paymentStatus: "unpaid", followUpDate: "2026-11-07",
  reason: "PRIVATE", notes: "PRIVATE", vitals: { bp: "PRIVATE" },
  chiefComplaint: "PRIVATE", followUpNotes: "PRIVATE", triageReason: "PRIVATE",
  surveyCompleted: true,
};

async function harness(run: (request: (path: string, actor?: string, method?: string, body?: unknown) => Promise<Response>, writes: () => number) => Promise<void>) {
  const actors = new Map<string, AccessActor>([
    ["doctor", { userId: "doctor", role: "clinician" }],
    ["owner", { userId: "owner", role: "owner" }],
    ["reception", { userId: "reception", role: "staff" }],
    ["desk", { userId: "desk", role: "receptionist" }],
    ["admin", { userId: "admin", role: "admin" }],
    ["patient", { patientId: 7 }],
    ["other-patient", { patientId: 8 }],
    ["unknown-role", { userId: "unknown", role: "unknown" }],
  ]);
  let writeCount = 0;
  const app = express();
  app.use(express.json());
  registerClinicalAccess(app, {
    async authenticate(req) {
      // Simulate the production token/session resolver, never trusting a submitted role.
      return actors.get(String(req.headers.authorization || "").replace(/^Bearer /, "")) ??
        (req.headers.cookie === "patient-session=own" ? { patientId: 7 } : null);
    },
    async appointmentPatientId(id) { return id === 4 ? 7 : null; },
  });
  app.use((req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      writeCount++;
      res.status(req.method === "POST" ? 201 : 200);
    }
    if (req.path === "/api/invoices" || req.path.endsWith("/invoices")) {
      res.json([{ id: 1, patientId: 7, total: 600, paymentStatus: "paid", diagnoses: [{ code: "PRIVATE" }], diagnosisEncounterId: 9 }]);
    } else if (/\/api\/invoices\/[^/]+$/.test(req.path)) {
      res.json({ id: 1, patientId: 7, total: 600, diagnoses: [{ code: "PRIVATE" }], diagnosisEncounterId: 9 });
    } else if (req.path.includes("/appointments")) {
      res.json(req.method === "GET" ? [appointment] : { ...appointment, ...req.body });
    } else if (req.path.includes("/by-category/")) {
      res.json({ category: "today-appointments", patients: [patient], count: 1 });
    } else if (req.path.endsWith("/clinical-notes")) {
      res.json([{ id: 1, isPrivate: 0 }, { id: 2, isPrivate: 1 }]);
    } else if (["/api/patients", "/api/desk/patients", "/api/prime-members", "/api/postop/patients"].includes(req.path)) {
      res.json(req.method === "GET" ? [patient] : patient);
    } else {
      res.json(patient);
    }
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (path: string, actor?: string, method = "GET", body?: unknown) => fetch(`http://127.0.0.1:${address.port}${path}`, {
    method,
    headers: {
      ...(actor === "cookie-patient" ? { Cookie: "patient-session=own" } : actor ? { Authorization: `Bearer ${actor}` } : {}),
      "Content-Type": "application/json",
      "X-Appointment-Id": "4",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    await run(request, () => writeCount);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("appointment history requires clinical permission or the matching patient session", async () => {
  await harness(async (request, writes) => {
    const path = "/api/patients/7/appointment-history";
    assert.equal((await request(path)).status, 401);
    for (const actor of ["reception", "desk", "admin", "other-patient", "unknown-role"]) {
      assert.equal((await request(path, actor)).status, 403, actor);
    }
    for (const actor of ["doctor", "owner", "patient"]) {
      const response = await request(path, actor);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
    assert.equal(writes(), 0);
  });
});

test("clinical authoring is protected before storage, including aliases, malformed IDs and case-insensitive routes", async () => {
  await harness(async (request, writes) => {
    const endpoints: [string, string][] = [
      ["/api/patients/7/manual-prescription", "POST"],
      ["/api/patients/7/medications", "POST"], ["/api/medications/1", "PATCH"], ["/api/medications/1", "DELETE"],
      ["/api/patients/7/visit-history", "POST"], ["/api/visit-history/1", "PATCH"],
      ["/api/patients/7/clinical-notes", "POST"], ["/api/clinical-notes/1", "PATCH"], ["/api/clinical-notes/1", "DELETE"],
      ["/api/patients/7/diagnoses", "PUT"], ["/api/patients/7/conception", "PATCH"],
      ["/api/patients/7/pregnancy-status", "PATCH"],
      ["/api/patients/7/documents", "POST"], ["/api/documents/1", "PATCH"], ["/api/documents/1", "DELETE"],
      ["/api/patients/7/extract-prescription", "POST"], ["/api/patients/7/parse-prescription", "POST"],
      ["/api/ocr/prescription", "POST"], ["/api/google-sheets/sync", "POST"],
      ["/api/google-drive/import-lab-reports", "POST"],
      ["/api/appointments/4/post-visit-summary", "POST"],
      ["/api/patients/7abc/manual-prescription", "POST"], ["/API/PATIENTS/7/MANUAL-PRESCRIPTION", "POST"],
      ["/api/patients/7%2Fother/manual-prescription", "POST"],
      ["/api/patients/%37/manual-prescription", "POST"],
      ["/api/patients/7%ZZ/manual-prescription", "POST"],
    ];
    for (const [path, method] of endpoints) {
      assert.equal((await request(path, undefined, method, {})).status, 401, path);
      assert.equal((await request(path, "invalid-token", method, {})).status, 401, path);
      for (const actor of ["reception", "desk", "admin", "patient", "unknown-role"]) {
        assert.equal((await request(path, actor, method, {})).status, 403, `${actor} ${path}`);
      }
    }
    assert.equal(writes(), 0);
    for (const actor of ["doctor", "owner"]) {
      for (const [path, method] of endpoints) assert.ok((await request(path, actor, method, {})).ok, `${actor} ${path}`);
    }
    assert.equal(writes(), endpoints.length * 2);
  });
});

test("receptionists can read server-derived survey completion but cannot submit that flag", async () => {
    await harness(async (request, writes) => {
      const response = await request("/api/appointments", "reception");
      assert.equal(response.status, 200);
      const rows = await response.json();
      assert.ok(Array.isArray(rows));
      assert.equal(rows[0].surveyCompleted, true);
      assert.equal("vitals" in rows[0], false);
      assert.equal("history" in rows[0], false);
      assert.equal((await request("/api/appointments/4", "reception", "PATCH", { surveyCompleted: true })).status, 403);
      assert.equal(writes(), 0);
  });
});

test("patient lists/details and registration responses contain only explicitly allowed logistics", async () => {
  await harness(async (request, writes) => {
    const paths = ["/api/patients", "/api/patients/7", "/api/desk/patients", "/api/desk/patients/7", "/api/prime-members", "/api/postop/patients", "/api/patients/%37", "/api/desk/patients/7%2Fother"];
    for (const path of paths) {
      assert.equal((await request(path)).status, 401);
      for (const actor of ["reception", "desk", "admin"]) {
        const response = await request(path, actor);
        assert.equal(response.status, 200);
        const body = await response.json();
        const row = Array.isArray(body) ? body[0] : body;
        assert.equal(row.name, patient.name);
        assert.equal(row.phone, patient.phone);
        assert.equal(row.age, patient.age);
        assert.equal(row.isPrimeMember, true);
        assert.equal(JSON.stringify(row).includes("PRIVATE"), false);
        for (const key of ["condition", "type", "lmp", "pregnancyStatus", "history", "riskScore", "trimesterChecklist", "weight", "plan", "futureClinicalField"]) assert.equal(key in row, false, key);
      }
    }
    for (const path of ["/api/patients", "/api/patients/7", "/api/desk/patients", "/api/desk/patients/7"]) {
      const method = path.endsWith("/7") ? "PATCH" : "POST";
      assert.equal((await request(path, "reception", method, { name: "Name", phone: "0000000000", age: 28 })).status, method === "POST" ? 201 : 200);
      for (const field of ["history", "condition", "clinicianNote", "lmp", "type", "plan", "riskScore", "id"]) {
        assert.equal((await request(path, "reception", method, { [field]: "forbidden" })).status, 403, field);
      }
    }
    assert.equal(writes(), 4);
    assert.equal((await request("/api/patients/by-category/high-risk", "reception")).status, 403);
    const today = await (await request("/api/patients/by-category/today-appointments", "reception")).json();
    assert.ok(today && typeof today === "object" && "patients" in today && Array.isArray(today.patients));
    assert.equal(today.patients[0].name, patient.name);
    assert.equal("condition" in today.patients[0], false);
    const doctor = await (await request("/api/patients/7", "doctor")).json();
    assert.ok(doctor && typeof doctor === "object" && "condition" in doctor);
    assert.equal(doctor.condition, "PRIVATE");
  });
});

test("own-patient clinical reads keep session/mobile access and reject cross-patient/list access", async () => {
  await harness(async (request) => {
    for (const path of ["/api/patients/7", "/api/patients/7/visit-history", "/api/patients/7/medications", "/api/patients/7/clinical-notes", "/api/patients/7/diagnoses", "/api/patients/7/documents", "/api/patients/7/documents/1/file"]) {
      assert.equal((await request(path)).status, 401, path);
      assert.equal((await request(path, "reception")).status, path === "/api/patients/7" ? 200 : 403, path);
      for (const actor of ["doctor", "patient", "cookie-patient"]) assert.equal((await request(path, actor)).status, 200, `${actor} ${path}`);
      assert.equal((await request(path, "other-patient")).status, 403, path);
    }
    for (const path of ["/api/patients", "/api/visit-history", "/api/clinical-notes", "/api/documents"]) {
      assert.equal((await request(path, "patient")).status, 403);
    }
    assert.equal((await request("/api/onboarding", "patient")).status, 200);
    assert.equal((await request("/api/onboarding", "other-patient")).status, 403);
    assert.equal((await request("/api/onboarding/4", "reception", "POST", {})).status, 403);
    assert.equal((await request("/api/onboarding/4", "patient", "POST", { history: { diagnosis: "fabricated" } })).status, 403);
    assert.equal((await request("/api/onboarding/4", "patient", "POST", { history: { onboarding: { symptoms: "reported" } } })).status, 201);
    assert.deepEqual(await (await request("/api/patients/7/clinical-notes", "patient")).json(), [{ id: 1, isPrivate: 0 }]);
    assert.deepEqual(await (await request("/api/patients/7/clinical-notes", "doctor")).json(), [{ id: 1, isPrivate: 0 }, { id: 2, isPrivate: 1 }]);
  });
});

test("receptionists retain booking/check-in/reschedule/billing logistics but cannot record clinical appointment data", async () => {
  await harness(async (request, writes) => {
    const listed = await (await request("/api/appointments?date=2026-11-01", "reception")).json();
    assert.ok(Array.isArray(listed));
    assert.equal(listed[0].patientId, 7);
    assert.equal(listed[0].followUpDate, appointment.followUpDate);
    for (const field of ["notes", "vitals", "reason", "chiefComplaint", "followUpNotes", "triageReason"]) assert.equal(field in listed[0], false, field);
    for (const body of [
      { status: "checked-in", checkedInAt: new Date().toISOString() },
      { date: "2026-11-02", time: "11:00", providerId: 3 },
      { status: "no-show" }, { status: "cancelled" }, { paymentStatus: "paid", billingAmount: 600 },
    ]) assert.equal((await request("/api/appointments/4", "reception", "PATCH", body)).status, 200);
    for (const body of [
      { notes: "Rx" }, { vitals: { bp: "120/80" } }, { chiefComplaint: "Diagnosis" },
      { seenAt: new Date().toISOString() }, { completedAt: new Date().toISOString() },
      { status: "completed" }, { status: "seen" }, { status: "in-consultation" },
    ]) assert.equal((await request("/api/appointments/4", "reception", "PATCH", body)).status, 403);
    const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const created = await request("/api/appointments", "reception", "POST", {
      patientId: 7, providerId: 2, date: today, time: "10:00", status: "checked-in",
      checkedInAt: new Date().toISOString(), reason: "Booking prefill",
    });

    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.ok(createdBody && typeof createdBody === "object");
    assert.equal("reason" in createdBody, false);
    assert.equal((await request("/api/appointments", "reception", "POST", { date: "2000-01-01", status: "checked-in" })).status, 400);
    assert.equal((await request("/api/appointments/4", "reception", "PATCH", { checkedInAt: "invalid" })).status, 400);
    assert.equal((await request("/api/appointments/4", "patient", "PATCH", { status: "completed" })).status, 403);
    assert.equal(writes(), 6);
    // Unrelated intended billing and patient self-tracking routes remain outside this scoped policy.
    assert.equal((await request("/api/invoices", "reception", "POST", { patientId: 7 })).status, 201);
    assert.equal((await request("/api/patient-protocols", "reception", "POST", { patientId: 7 })).status, 201);
    assert.equal((await request("/api/mobile/patients/7/medications", "patient", "POST", { name: "Self-tracked" })).status, 201);
  });
});

test("rescheduling clears stale arrival state without changing unchanged bookings or payment updates", () => {
  const current = { date: "2026-11-01", time: "10:00", providerId: 2 };
  for (const patch of [{ date: "2026-11-02" }, { time: "11:00" }, { providerId: 3 }]) {
    assert.deepEqual(rescheduledLogistics(current, patch), { ...patch, status: "scheduled", checkedInAt: null });
  }
  const payment = { paymentStatus: "paid" };
  assert.equal(rescheduledLogistics(current, payment), payment);
  const same = { ...current, status: "checked-in", checkedInAt: "2026-11-01T04:30:00Z" };
  assert.equal(rescheduledLogistics(current, same), same);
});

test("PATCH check-in validates the persisted appointment date and cannot check in future/past bookings", () => {
  const now = Date.parse("2026-10-31T21:00:00Z");
  const arrived = { status: "checked-in", checkedInAt: new Date(now).toISOString() };
  for (const date of ["2026-10-31", "2026-11-02"]) {
    assert.equal(checkInIsToday({ date }, arrived, now), false);
    assert.equal(checkInIsToday({ date }, { status: "checked-in" }, now), false);
    assert.equal(checkInIsToday({ date }, { checkedInAt: arrived.checkedInAt }, now), false);
    assert.equal(checkInIsToday({ date }, { status: "cancelled" }, now), true);
    const rescheduled = rescheduledLogistics({ date: "2026-11-01", time: "10:00", providerId: 2 }, { ...arrived, date });
    assert.deepEqual(rescheduled, { date, status: "scheduled", checkedInAt: null });
    assert.equal(checkInIsToday({ date: "2026-11-01" }, rescheduled, now), true);
  }
  assert.equal(checkInIsToday({ date: "2026-11-01" }, arrived, now), true);
});

test("invoice billing remains staff-accessible but diagnosis linkage and response disclosure are clinical-only", async () => {
  await harness(async (request, writes) => {
    for (const path of ["/api/invoices", "/api/patients/7/invoices", "/api/invoices/1"]) {
      assert.equal((await request(path)).status, 401);
      const response = await request(path, "reception");
      assert.equal(response.status, 200);
      const body = await response.json();
      const row = Array.isArray(body) ? body[0] : body;
      assert.ok(row && typeof row === "object");
      assert.equal("diagnoses" in row, false);
      assert.equal("diagnosisEncounterId" in row, false);
      assert.equal(row.total, 600);
    }
    for (const field of ["diagnoses", "diagnosisEncounterId"]) {
      assert.equal((await request("/api/patients/7/invoices", "reception", "POST", { [field]: 9 })).status, 403);
      assert.equal((await request("/api/invoices/1", "reception", "PATCH", { [field]: 9 })).status, 403);
    }
    assert.equal(writes(), 0);
    assert.equal((await request("/api/patients/7/invoices", "reception", "POST", { items: [], paymentMethod: "cash" })).status, 201);
    assert.equal((await request("/api/invoices/1", "reception", "PATCH", { paymentStatus: "paid" })).status, 200);
    assert.equal((await request("/api/patients/7/invoice-quote", "reception", "POST", { items: [] })).status, 201);
    assert.equal((await request("/api/patients/7/invoices", "doctor", "POST", { diagnosisEncounterId: 9 })).status, 201);
    assert.equal((await request("/api/patients/7/invoices", "owner", "POST", { diagnosisEncounterId: 9 })).status, 201);
    assert.equal((await request("/api/patients/7/invoices", "patient")).status, 200);
    assert.equal((await request("/api/patients/7/invoices", "other-patient")).status, 403);
    assert.equal((await request("/api/invoices", "patient")).status, 403);
  });
});
