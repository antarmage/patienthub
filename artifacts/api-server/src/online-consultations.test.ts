import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import type { Appointment, Patient, Provider, VisitHistory, Document, PatientDocument } from "@workspace/db";
import { consultationAvailable, consultationExpiry, createOnlineConsultations, registerOnlineConsultationRoutes, sharedPrescription, visitBelongsToOnlineAppointment, type OnlineSession, type OnlineStore } from "./online-consultations";
import { onlineConfig, OnlineConsultationError, onlineTokenHash, openOnlineSecret, sealOnlineSecret } from "./google-meet";

process.env.PUBLIC_APP_URL = "https://clinic.example.invalid";
process.env.GOOGLE_MEET_CLIENT_ID = "test-client";
process.env.GOOGLE_MEET_CLIENT_SECRET = "test-secret";
process.env.GOOGLE_MEET_TOKEN_KEY = "11".repeat(32);
const token = "a".repeat(43);
const appointment: Appointment = {
  id: 4, patientId: 7, providerId: 2, serviceId: null, date: "2099-11-01", time: "10:00 AM",
  endTime: null, duration: 30, type: "Consultation", status: "scheduled", reason: null,
  chiefComplaint: "PRIVATE", visitType: "Consultation", visitMode: "telemedicine", surveyType: null,
  priority: null, room: null, billingCode: null, billingAmount: null, paymentStatus: null,
  insuranceClaim: null, checkedInAt: null, seenAt: null, completedAt: null, followUpDate: null,
  followUpNotes: null, notes: "PRIVATE", vitals: null, patientReportedLmp: null,
  telemedicineLink: "https://meet.google.com/abc-defg-hij", whatsappReminderSent: null,
  triageScore: null, triageReason: null, triageScoredAt: null,
};
const provider: Provider = { id: 2, name: "Test Doctor", role: "doctor", specialty: "Gynecology", availability: null, qualification: null, regNumber: null, regCouncil: null, regYear: null, additionalQualifications: null, clinicName: "Test Clinic", clinicAddress: null, clinicPhone: null, clinicTiming: null, photoUrl: null };
const patient = { id: 7, name: "PRIVATE", history: { private: "PRIVATE" } } as Patient;
const visit: VisitHistory = { id: 11, patientId: 7, appointmentId: 4, providerId: 2, date: appointment.date,
  visitType: "Consultation", chiefComplaint: "PRIVATE", diagnosis: "PRIVATE", vitals: null, examination: null, subjective: null, objective: null, assessment: "PRIVATE", assessmentDetails: null,
  planNotes: "Shared advice", prescriptions: { medicines: [{ name: "Test medicine", dose: "1", secret: "PRIVATE" }], originalPrescription: "PRIVATE" }, procedures: null, labsOrdered: null, followUpPlan: "Shared follow-up", outcome: null };
const doc: Document = { id: 21, patientId: 7, name: "Shared report", type: "report", category: null, date: appointment.date, uploadedBy: 2, description: "Shared description", metadata: { private: "PRIVATE", patientDocumentId: 31 } };
const originalReport: PatientDocument = { id: 31, patientId: 7, fileName: "synthetic-report.pdf", fileData: null, s3Key: null, mimeType: "application/pdf", docType: "report", trimester: null, label: null, uploadedAt: appointment.date };

function fixture() {
  let current = { ...appointment };
  let saved: OnlineSession | undefined = { appointmentId: 4, tokenHash: onlineTokenHash(token), encryptedToken: sealOnlineSecret(token), revoked: false, sharedVisitIds: [], sharedDocumentIds: [] };
  let connection: string | undefined = "test-encrypted-refresh-token";
  let writes = 0;
  let reportOwner = 7;
  const store: OnlineStore = {
    async providerForUser(userId) { return userId === "doctor" ? provider : undefined; },
    async provider(id) { return id === 2 ? provider : undefined; },
    async patient(id) { return id === 7 ? patient : undefined; },
    async connection() { return connection; },
    async saveConnection() { writes++; },
    async disconnect() { connection = undefined; },
    async saveState() { writes++; },
    async consumeState() { return undefined; },
    async appointment(id) { return id === 4 ? current : undefined; },
    async session(id) { return id === 4 ? saved : undefined; },
    async sessionByHash(hash) { return saved?.tokenHash === hash ? saved : undefined; },
    async createBooking(body, session) { writes++; current = { ...current, ...body }; saved = { ...session, appointmentId: 4 }; return current; },
    async ensureSession(_id, meeting, session) { writes++; current = { ...current, telemedicineLink: meeting, visitMode: "telemedicine" }; saved = { ...session, appointmentId: 4 }; return saved; },
    async share(_id, visitIds, documentIds) { writes++; saved = { ...saved!, sharedVisitIds: visitIds, sharedDocumentIds: documentIds }; },
    async revoke() { writes++; saved = { ...saved!, revoked: true }; },
    async visits() { return [visit, { ...visit, id: 12, appointmentId: 5 }]; },
    async documents() { return [doc]; },
    async patientDocument(id) { return id === 31 ? { ...originalReport, patientId: reportOwner } : undefined; },
    async readFile() { return Buffer.from("synthetic report bytes"); },
  };
  return { store, writes: () => writes, disconnect: () => { connection = undefined; }, noSession: () => { saved = undefined; }, cancel: () => { current.status = "cancelled"; }, crossPatientFile: () => { reportOwner = 8; } };
}

test("invalid portal origins return actionable configuration errors", () => {
  const previous = process.env.PUBLIC_APP_URL;
  try {
    for (const origin of ["not-a-url", "http://clinic.example.invalid", "https://clinic.example.invalid/subpath", "https://user:password@clinic.example.invalid"]) {
      process.env.PUBLIC_APP_URL = origin;
      assert.throws(onlineConfig, (error: unknown) => error instanceof OnlineConsultationError && error.status === 503);
    }
  } finally { process.env.PUBLIC_APP_URL = previous; }
});

test("private tokens are encrypted and tamper-resistant; expiry is end of day plus 30 days in India", () => {
  const sealed = sealOnlineSecret(token);
  assert.notEqual(sealed, token);
  assert.equal(openOnlineSecret(sealed), token);
  assert.throws(() => openOnlineSecret(sealed.slice(0, -4)));
  assert.equal(new Date(consultationExpiry("2026-11-01")).toISOString(), "2026-12-01T18:30:00.000Z");
  assert.throws(() => consultationExpiry("2026-02-30"));
  const session = { revoked: false } as OnlineSession;
  assert.equal(consultationAvailable(appointment, session, consultationExpiry(appointment.date) - 1), true);
  assert.equal(consultationAvailable(appointment, session, consultationExpiry(appointment.date)), false);
  assert.equal(consultationAvailable({ ...appointment, status: "cancelled" }, session), false);
});

test("online booking requires a connected doctor; Google failures never create an appointment", async () => {
  const f = fixture(); f.noSession(); f.disconnect();
  const service = createOnlineConsultations(f.store, async () => "https://meet.google.com/abc-defg-hij");
  await assert.rejects(service.createBooking({ patientId: 7, providerId: 2, date: appointment.date, time: appointment.time }), /connect Google Meet/);
  assert.equal(f.writes(), 0);
  const ready = fixture(); ready.noSession();
  await assert.rejects(createOnlineConsultations(ready.store, async () => { throw new Error("Google unavailable"); }).createBooking({ patientId: 7, providerId: 2, date: appointment.date, time: appointment.time }), /Google unavailable/);
  assert.equal(ready.writes(), 0);
  const booked = await createOnlineConsultations(ready.store, async () => "https://meet.google.com/abc-defg-hij").createBooking({ patientId: 7, providerId: 2, date: appointment.date, time: appointment.time, visitMode: "telemedicine" });
  assert.equal(booked.telemedicineLink, "https://meet.google.com/abc-defg-hij");
  assert.equal(f.writes(), 0);
  const saved = await ready.store.session(4);
  assert.ok(saved && saved.tokenHash.length === 64);
  assert.deepEqual(saved?.sharedVisitIds, []);
});

test("meeting action reuses an existing session and cancellation denies both sharing and patient access", async () => {
  const f = fixture();
  let meetings = 0;
  const service = createOnlineConsultations(f.store, async () => { meetings++; return appointment.telemedicineLink!; });
  await service.ensureSession(4); await service.ensureSession(4);
  assert.equal(meetings, 0);
  assert.equal(f.writes(), 0);
  f.cancel();
  await assert.rejects(service.ensureSession(4), /no longer available/);
  await assert.rejects(service.patientSession(token), /cancelled/);
});

test("shared prescription projection never exposes clinical notes, diagnoses, source scans or unknown medicine fields", () => {
  const result = sharedPrescription(visit);
  assert.equal(JSON.stringify(result).includes("PRIVATE"), false);
  assert.equal(result.advice, "Shared advice");
});

test("source-backed paper transcriptions use their explicit appointment link, never same-day inference", () => {
  const paper = { ...visit, appointmentId: null, prescriptions: { source: "receptionist-paper-transcription", doctorIssuedPaper: true, linkedAppointmentId: 4 } };
  assert.equal(visitBelongsToOnlineAppointment(paper, 4), true);
  assert.equal(visitBelongsToOnlineAppointment(paper, 5), false);
  assert.equal(visitBelongsToOnlineAppointment({ ...visit, appointmentId: null }, 4), false);
  assert.equal(visitBelongsToOnlineAppointment({ ...paper, prescriptions: { linkedAppointmentId: 4 } }, 4), false);
});

test("private page defaults to no records; only appointment doctor explicitly shares; revocation is enforced", async () => {
  const f = fixture();
  const app = express(); app.use(express.json());
  registerOnlineConsultationRoutes(app, f.store, async (req) => {
    const role = req.headers.authorization;
    return role === "doctor" ? { userId: "doctor", role: "clinician" } : role === "reception" ? { userId: "reception", role: "staff" } : role === "other-doctor" ? { userId: "other", role: "clinician" } : null;
  });
  const server = createServer(app); await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const getPage = () => fetch(`${base}/api/online/patient`, { headers: { "X-Consultation-Token": token } });
  const share = (actor: string, visitIds: number[], documentIds: number[]) => fetch(`${base}/api/appointments/4/online-sharing`, { method: "PATCH", headers: { Authorization: actor, "Content-Type": "application/json" }, body: JSON.stringify({ visitIds, documentIds }) });
  try {
    const first = await getPage(); assert.equal(first.status, 200);
    assert.equal(first.headers.get("cache-control"), "no-store");
    const body = await first.json();
    assert.ok(body && typeof body === "object" && "prescriptions" in body && "reports" in body);
    assert.deepEqual(body.prescriptions, []); assert.deepEqual(body.reports, []);
    assert.equal(JSON.stringify(body).includes("PRIVATE"), false);
    assert.equal((await fetch(`${base}/api/online/patient`)).status, 404);
    assert.equal((await fetch(`${base}/api/online/google/status`)).status, 401);
    assert.equal((await fetch(`${base}/api/online/google/status`, { headers: { Authorization: "reception" } })).status, 403);
    assert.equal((await fetch(`${base}/api/online/google/callback?state=${token}&code=synthetic`)).status, 400);
    assert.equal((await fetch(`${base}/api/online/google/callback?state=${token}&code=synthetic`, { headers: { Cookie: `saivie_google_state=${token}` } })).status, 400);
    assert.equal((await fetch(`${base}/api/online/patient/reports/21/file`, { headers: { "X-Consultation-Token": token } })).status, 404);
    assert.equal((await share("reception", [11], [21])).status, 403);
    assert.equal((await share("other-doctor", [11], [21])).status, 403);
    assert.equal((await share("doctor", [12], [21])).status, 400);
    assert.equal((await share("doctor", [11], [99])).status, 400);
    assert.equal(f.writes(), 0);
    assert.equal((await share("doctor", [11], [21])).status, 200);
    const shared = await (await getPage()).json();
    assert.ok(shared && typeof shared === "object" && "prescriptions" in shared && Array.isArray(shared.prescriptions) && "reports" in shared && Array.isArray(shared.reports));
    assert.equal(shared.prescriptions.length, 1); assert.equal(shared.reports.length, 1);
    assert.equal(JSON.stringify(shared).includes("PRIVATE"), false);
    const file = await fetch(`${base}/api/online/patient/reports/21/file`, { headers: { "X-Consultation-Token": token } });
    assert.equal(file.status, 200);
    assert.equal(file.headers.get("content-type"), "application/pdf");
    assert.equal(await file.text(), "synthetic report bytes");
    f.crossPatientFile();
    assert.equal((await fetch(`${base}/api/online/patient/reports/21/file`, { headers: { "X-Consultation-Token": token } })).status, 404);
    assert.equal((await fetch(`${base}/api/online/patient/reports/99/file`, { headers: { "X-Consultation-Token": token } })).status, 404);
    assert.equal((await fetch(`${base}/api/appointments/4/online-session`, { method: "DELETE", headers: { Authorization: "doctor" } })).status, 200);
    assert.equal((await getPage()).status, 410);
    assert.equal((await fetch(`${base}/api/appointments/4/online-session`, { headers: { Authorization: "reception" } })).status, 410);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
