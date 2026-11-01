import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import type { Appointment, InsertAppointment, Patient, Provider, VisitHistory, Document, PatientDocument } from "@workspace/db";
import type { AccessActor } from "./clinical-access";
import { createGoogleMeeting, exchangeGoogleCode, googleAuthorizationUrl, onlineConfig, OnlineConsultationError, onlineTokenHash, openOnlineSecret, sealOnlineSecret } from "./google-meet";
import { isPaperTranscription } from "./prescription-transcriptions";

export interface OnlineSession {
  appointmentId: number;
  tokenHash: string;
  encryptedToken: string;
  revoked: boolean;
  sharedVisitIds: number[];
  sharedDocumentIds: number[];
}
export interface OnlineStore {
  providerForUser(userId: string): Promise<Provider | undefined>;
  connection(providerId: number): Promise<string | undefined>;
  saveConnection(providerId: number, userId: string, token: string): Promise<void>;
  disconnect(providerId: number, userId: string): Promise<void>;
  saveState(hash: string, providerId: number, userId: string): Promise<void>;
  consumeState(hash: string): Promise<{ providerId: number; userId: string } | undefined>;
  appointment(id: number): Promise<Appointment | undefined>;
  provider(id: number): Promise<Provider | undefined>;
  patient(id: number): Promise<Patient | undefined>;
  session(id: number): Promise<OnlineSession | undefined>;
  sessionByHash(hash: string): Promise<OnlineSession | undefined>;
  createBooking(body: InsertAppointment, session: Omit<OnlineSession, "appointmentId">): Promise<Appointment>;
  ensureSession(id: number, meetingUrl: string, session: Omit<OnlineSession, "appointmentId">, expected: Pick<Appointment, "patientId" | "providerId">): Promise<OnlineSession>;
  share(id: number, visitIds: number[], documentIds: number[], userId: string): Promise<void>;
  revoke(id: number, userId: string): Promise<void>;
  visits(patientId: number): Promise<VisitHistory[]>;
  documents(patientId: number): Promise<Document[]>;
  patientDocument(id: number): Promise<PatientDocument | undefined>;
  readFile(doc: PatientDocument): Promise<Buffer | null>;
}

function newSession(): Omit<OnlineSession, "appointmentId"> {
  const token = crypto.randomBytes(32).toString("base64url");
  return { tokenHash: onlineTokenHash(token), encryptedToken: sealOnlineSecret(token), revoked: false, sharedVisitIds: [], sharedDocumentIds: [] };
}
export function consultationExpiry(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new OnlineConsultationError(400, "Invalid appointment date.");
  const start = Date.parse(`${date}T00:00:00+05:30`);
  if (!Number.isFinite(start) || new Date(start + 5.5 * 3600000).toISOString().slice(0, 10) !== date) throw new OnlineConsultationError(400, "Invalid appointment date.");
  return start + 31 * 86400000;
}
export function consultationAvailable(appointment: Appointment, session: OnlineSession, now = Date.now()) {
  return !session.revoked && appointment.visitMode === "telemedicine" &&
    !["cancelled", "canceled", "no-show"].includes(String(appointment.status).toLowerCase()) &&
    now < consultationExpiry(appointment.date);
}
function safeId(value: unknown): number {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isSafeInteger(id) || id < 1) throw new OnlineConsultationError(400, "Invalid ID.");
  return id;
}
function ids(value: unknown): number[] {
  if (!Array.isArray(value) || value.length > 100) throw new OnlineConsultationError(400, "Select at most 100 records.");
  return [...new Set(value.map(safeId))];
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function visitBelongsToOnlineAppointment(visit: VisitHistory, appointmentId: number): boolean {
  const prescription = record(visit.prescriptions);
  return visit.appointmentId === appointmentId ||
    (visit.patientId !== null && isPaperTranscription(visit, visit.patientId) && prescription.linkedAppointmentId === appointmentId);
}
export function sharedPrescription(visit: VisitHistory) {
  const prescriptions = record(visit.prescriptions);
  const medicines = Array.isArray(visit.prescriptions) ? visit.prescriptions : prescriptions.medicines;
  return { id: visit.id, date: visit.date, medicines: Array.isArray(medicines) ? medicines.map((item) => {
    const row = record(item);
    return Object.fromEntries(["name", "medicine", "dose", "dosage", "frequency", "duration", "instructions"].filter((key) => typeof row[key] === "string" || typeof row[key] === "number").map((key) => [key, row[key]]));
  }) : [], advice: visit.planNotes, followUp: visit.followUpPlan };
}
function shareUrl(session: OnlineSession) {
  return `${onlineConfig().origin}/consultation#${openOnlineSecret(session.encryptedToken)}`;
}

export function createOnlineConsultations(store: OnlineStore, createMeeting = createGoogleMeeting) {
  return {
    async createBooking(body: InsertAppointment) {
      if (!body.providerId || !body.patientId) throw new OnlineConsultationError(400, "Online appointments require a patient and doctor.");
      safeId(body.providerId); safeId(body.patientId);
      if (typeof body.time !== "string" || !/^(?:(?:0?[1-9]|1[0-2]):[0-5]\d\s*(?:AM|PM)|(?:[01]\d|2[0-3]):[0-5]\d)$/i.test(body.time.trim())) throw new OnlineConsultationError(400, "Select a valid appointment time.");
      if (!await store.patient(body.patientId)) throw new OnlineConsultationError(404, "Patient not found.");
      const expiry = consultationExpiry(body.date);
      if (expiry <= Date.now()) throw new OnlineConsultationError(400, "This appointment date is too old for an online consultation.");
      const connection = await store.connection(body.providerId);
      if (!connection) throw new OnlineConsultationError(409, "This doctor must connect Google Meet in Profile & Settings before an online appointment can be booked.");
      const meeting = await createMeeting(connection);
      return store.createBooking({ ...body, telemedicineLink: meeting }, newSession());
    },
    async ensureSession(id: number) {
      const appointment = await store.appointment(id);
      if (!appointment) throw new OnlineConsultationError(404, "Appointment not found.");
      if (!appointment.patientId || !appointment.providerId) throw new OnlineConsultationError(400, "Select a patient and doctor first.");
      if (["cancelled", "canceled", "no-show"].includes(String(appointment.status).toLowerCase()) || consultationExpiry(appointment.date) <= Date.now()) throw new OnlineConsultationError(410, "This appointment is no longer available.");
      const existing = await store.session(id);
      if (existing) {
        if (!consultationAvailable(appointment, existing)) throw new OnlineConsultationError(410, "This consultation link has been revoked or is unavailable.");
        return { appointment, session: existing };
      }
      const connection = await store.connection(appointment.providerId);
      if (!connection) throw new OnlineConsultationError(409, "The doctor must connect Google Meet in Profile & Settings.");
      const meeting = await createMeeting(connection);
      const session = await store.ensureSession(id, meeting, newSession(), appointment);
      const updated = await store.appointment(id);
      if (!updated) throw new OnlineConsultationError(404, "Appointment not found.");
      return { appointment: updated, session };
    },
    async patientSession(token: string) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new OnlineConsultationError(404, "Consultation link not found.");
      const session = await store.sessionByHash(onlineTokenHash(token));
      const appointment = session ? await store.appointment(session.appointmentId) : undefined;
      if (!session || !appointment || !appointment.patientId) throw new OnlineConsultationError(404, "Consultation link not found.");
      if (!consultationAvailable(appointment, session)) throw new OnlineConsultationError(410, "This consultation link has expired, been revoked, or the appointment was cancelled.");
      return { session, appointment };
    },
  };
}

export function registerOnlineConsultationRoutes(app: Express, store: OnlineStore, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  const service = createOnlineConsultations(store);
  const handle = (work: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" });
    try { await work(req, res); } catch (error) {
      if (res.headersSent) return;
      if (!(error instanceof OnlineConsultationError)) console.error("[online-consultations] Request failed:", error instanceof Error ? error.name : "Unknown error");
      res.status(error instanceof OnlineConsultationError ? error.status : 502).json({ error: error instanceof OnlineConsultationError ? error.message : "Online consultation service failed. Check the Google account connection or retry." });
    }
  };
  async function staff(req: Request, res: Response, doctorOnly = false) {
    const actor = await authenticate(req, res);
    if (!actor) {
      if (!res.headersSent) res.status(401).json({ error: "Authentication required." });
      return null;
    }
    if (!("role" in actor) || !(doctorOnly ? ["clinician", "owner"] : ["staff", "receptionist", "admin", "clinician", "owner"]).includes(actor.role)) {
      res.status(403).json({ error: doctorOnly ? "Clinician access required." : "Staff access required." });
      return null;
    }
    return actor;
  }
  async function doctor(req: Request, res: Response) {
    const actor = await staff(req, res, true);
    if (!actor) return null;
    const provider = await store.providerForUser(actor.userId);
    if (!provider) throw new OnlineConsultationError(409, "Your staff account is not linked to a doctor. Ask the administrator to set your provider account.");
    return { actor, provider };
  }
  async function ownerOfAppointment(req: Request, res: Response) {
    const actor = await staff(req, res, true);
    if (!actor) return null;
    const appointment = await store.appointment(safeId(req.params.id));
    if (!appointment) throw new OnlineConsultationError(404, "Appointment not found.");
    const provider = await store.providerForUser(actor.userId);
    if (actor.role !== "owner" && provider?.id !== appointment.providerId) throw new OnlineConsultationError(403, "Only this appointment's doctor may share its clinical records.");
    return { actor, appointment };
  }
  app.get("/api/online/google/status", handle(async (req, res) => {
    const current = await doctor(req, res);
    if (!current) return;
    let configured = true;
    try { onlineConfig(); } catch (error) { if (!(error instanceof OnlineConsultationError)) throw error; configured = false; }
    res.json({ configured, connected: !!await store.connection(current.provider.id), providerName: current.provider.name });
  }));
  app.post("/api/online/google/connect", handle(async (req, res) => {
    const current = await doctor(req, res);
    if (!current) return;
    const state = crypto.randomBytes(32).toString("base64url");
    const url = googleAuthorizationUrl(state);
    await store.saveState(onlineTokenHash(state), current.provider.id, current.actor.userId);
    res.cookie("saivie_google_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600000, path: "/api/online/google/callback" });
    res.json({ url });
  }));
  app.get("/api/online/google/callback", handle(async (req, res) => {
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookie = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("saivie_google_state="))?.slice("saivie_google_state=".length);
    if (!/^[A-Za-z0-9_-]{43}$/.test(state) || cookie !== state) throw new OnlineConsultationError(400, "Google connection verification failed. Start again from doctor settings.");
    const saved = await store.consumeState(onlineTokenHash(state));
    res.clearCookie("saivie_google_state", { path: "/api/online/google/callback", secure: true, httpOnly: true, sameSite: "lax" });
    if (!saved) throw new OnlineConsultationError(400, "Google connection request expired. Start again.");
    if (typeof req.query.code !== "string" || req.query.error) throw new OnlineConsultationError(400, "Google account connection was not approved.");
    await store.saveConnection(saved.providerId, saved.userId, await exchangeGoogleCode(req.query.code));
    res.redirect(`${onlineConfig().origin}/clinician?googleMeet=connected`);
  }));
  app.delete("/api/online/google/connection", handle(async (req, res) => {
    const current = await doctor(req, res);
    if (!current) return;
    await store.disconnect(current.provider.id, current.actor.userId);
    res.json({ disconnected: true });
  }));
  app.get("/api/appointments/:id/online-session", handle(async (req, res) => {
    if (!await staff(req, res)) return;
    const id = safeId(req.params.id);
    const appointment = await store.appointment(id);
    const session = await store.session(id);
    if (!appointment || !session) throw new OnlineConsultationError(404, "No patient consultation page has been created for this appointment.");
    if (!consultationAvailable(appointment, session)) throw new OnlineConsultationError(410, "Consultation page is unavailable.");
    res.json({ patientUrl: shareUrl(session), meetingUrl: appointment.telemedicineLink, expiresAt: new Date(consultationExpiry(appointment.date)).toISOString() });
  }));
  app.get("/api/appointments/:id/online-sharing", handle(async (req, res) => {
    const current = await ownerOfAppointment(req, res);
    if (!current) return;
    const session = await store.session(current.appointment.id);
    if (!session || !current.appointment.patientId) throw new OnlineConsultationError(404, "No online consultation page.");
    const [visits, documents] = await Promise.all([store.visits(current.appointment.patientId), store.documents(current.appointment.patientId)]);
    res.json({ sharedVisitIds: session.sharedVisitIds, sharedDocumentIds: session.sharedDocumentIds, revoked: session.revoked,
      visits: visits.filter((visit) => visitBelongsToOnlineAppointment(visit, current.appointment.id)).map((visit) => ({ id: visit.id, date: visit.date, name: visit.visitType || "Prescription" })),
      documents: documents.map((doc) => ({ id: doc.id, date: doc.date, name: doc.name })) });
  }));
  app.patch("/api/appointments/:id/online-sharing", handle(async (req, res) => {
    const current = await ownerOfAppointment(req, res);
    if (!current) return;
    if (!current.appointment.patientId || !await store.session(current.appointment.id)) throw new OnlineConsultationError(404, "No online consultation page.");
    const visitIds = ids(req.body?.visitIds), documentIds = ids(req.body?.documentIds);
    const [visits, documents] = await Promise.all([store.visits(current.appointment.patientId), store.documents(current.appointment.patientId)]);
    if (visitIds.some((id) => !visits.some((visit) => visit.id === id && visitBelongsToOnlineAppointment(visit, current.appointment.id))) ||
        documentIds.some((id) => !documents.some((doc) => doc.id === id))) throw new OnlineConsultationError(400, "Selected records do not belong to this patient and appointment.");
    await store.share(current.appointment.id, visitIds, documentIds, current.actor.userId);
    res.json({ saved: true });
  }));
  app.delete("/api/appointments/:id/online-session", handle(async (req, res) => {
    const current = await ownerOfAppointment(req, res);
    if (!current) return;
    await store.revoke(current.appointment.id, current.actor.userId);
    res.json({ revoked: true });
  }));
  const limiter = rateLimit({ windowMs: 60000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });
  app.get("/api/online/patient", limiter, handle(async (req, res) => {
    const { session, appointment } = await service.patientSession(String(req.headers["x-consultation-token"] || ""));
    const [provider, visits, documents] = await Promise.all([appointment.providerId ? store.provider(appointment.providerId) : undefined, store.visits(appointment.patientId!), store.documents(appointment.patientId!)]);
    res.json({ appointment: { date: appointment.date, time: appointment.time, duration: appointment.duration, status: appointment.status, meetingUrl: appointment.telemedicineLink },
      doctor: { name: provider?.name || "Doctor", specialty: provider?.specialty || "", clinicName: provider?.clinicName || "Saivie" },
      expiresAt: new Date(consultationExpiry(appointment.date)).toISOString(),
      prescriptions: visits.filter((visit) => visitBelongsToOnlineAppointment(visit, appointment.id) && session.sharedVisitIds.includes(visit.id)).map(sharedPrescription),
      reports: documents.filter((doc) => session.sharedDocumentIds.includes(doc.id)).map((doc) => ({ id: doc.id, name: doc.name, date: doc.date, description: doc.description, hasFile: typeof record(doc.metadata).patientDocumentId === "number" })),
    });
  }));
  app.get("/api/online/patient/reports/:id/file", limiter, handle(async (req, res) => {
    const { session, appointment } = await service.patientSession(String(req.headers["x-consultation-token"] || ""));
    const id = safeId(req.params.id);
    const doc = (await store.documents(appointment.patientId!)).find((doc) => doc.id === id && session.sharedDocumentIds.includes(id));
    if (!doc) throw new OnlineConsultationError(404, "Shared report not found.");
    const originalId = record(doc.metadata).patientDocumentId;
    const original = typeof originalId === "number" ? await store.patientDocument(originalId) : undefined;
    if (!original || original.patientId !== appointment.patientId) throw new OnlineConsultationError(404, "Original shared report not found.");
    const bytes = await store.readFile(original);
    if (!bytes) throw new OnlineConsultationError(404, "Report file not available.");
    const mime = ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(original.mimeType || "") ? original.mimeType! : "application/octet-stream";
    res.set({ "Content-Type": mime, "Content-Disposition": "attachment" }).send(bytes);
  }));
  return { ...service, shareUrl };
}
