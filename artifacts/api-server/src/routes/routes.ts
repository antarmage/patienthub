import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import { insertPatientSchema } from "@workspace/db";
import { registerOcrRoutes } from "../replit_integrations/ocr";
import { getUncachableGoogleSheetClient } from "../google-sheets";
import { importLabReports, listLabReportFiles, downloadFileAsBuffer } from "../google-drive";
import { ai } from "../replit_integrations/image/client";
import { whatsapp } from "../whatsapp";
import { scorePatient, generateTrimesterChecklist, batchScorePatients } from "../risk-engine";
import { analyseGenome } from "../genome-engine";
import multer from "multer";

function parseId(val: string): number | null {
  const n = parseInt(val);
  return isNaN(n) ? null : n;
}

// Tracks appointment IDs that have already had a post-visit summary sent
// (prevents duplicate sends if appointment is PATCH'd to "completed" more than once)
const postVisitSummarySentIds = new Set<number>();

// Tracks patients mid-booking-conversation on WhatsApp
// key: patient phone (formatted), value: pending booking context
interface PendingBooking {
  type: "doctor" | "nutritionist" | "blood_test";
  label: string;
  askedAt: number; // timestamp
}
const pendingBookings = new Map<string, PendingBooking>();

// ── Mobile auth tokens ────────────────────────────────────────────────────────
// In-memory store mapping random tokens to patient IDs.
// Tokens are issued at mobile login and must be sent as `Authorization: Bearer <token>`.
const mobileAuthTokens = new Map<string, { patientId: number; expiresAt: number }>();
const MOBILE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function issueMobileToken(patientId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  mobileAuthTokens.set(token, { patientId, expiresAt: Date.now() + MOBILE_TOKEN_TTL_MS });
  return token;
}

/**
 * Validates the mobile Bearer token. If `expectedPatientId` is given, also checks
 * that the token belongs to that patient (IDOR guard).
 * Returns the bound patientId on success, or sends a 401/403 and returns null.
 */
function getMobilePatientId(req: Request, res: Response, expectedPatientId?: number): number | null {
  const auth = (req.headers["authorization"] ?? "") as string;
  if (!auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Mobile token required" });
    return null;
  }
  const token = auth.slice(7);
  const entry = mobileAuthTokens.get(token);
  if (!entry) {
    res.status(401).json({ error: "Invalid mobile token" });
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    mobileAuthTokens.delete(token);
    res.status(401).json({ error: "Mobile token expired, please log in again" });
    return null;
  }
  if (expectedPatientId !== undefined && entry.patientId !== expectedPatientId) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return entry.patientId;
}

// ── Staff (Recover) Auth Tokens ───────────────────────────────────────────────
const STAFF_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const staffAuthTokens = new Map<string, { userId: string; expiresAt: number }>();

function issueStaffToken(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  staffAuthTokens.set(token, { userId, expiresAt: Date.now() + STAFF_TOKEN_TTL_MS });
  return token;
}

function getStaffUserId(req: Request, res: Response): string | null {
  const auth = (req.headers["authorization"] ?? "") as string;
  if (!auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Staff token required" });
    return null;
  }
  const token = auth.slice(7);
  const entry = staffAuthTokens.get(token);
  if (!entry) {
    res.status(401).json({ error: "Invalid staff token" });
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    staffAuthTokens.delete(token);
    res.status(401).json({ error: "Staff token expired, please log in again" });
    return null;
  }
  return entry.userId;
}

// ── AI Audit Log ──────────────────────────────────────────────────────────────
const AUDIT_LOG_PATH = path.join(process.cwd(), "data", "ai_audit_log.jsonl");

function ensureAuditDir() {
  const dir = path.dirname(AUDIT_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendAuditLog(entry: { event: string; [key: string]: any }) {
  try {
    ensureAuditDir();
    const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n";
    fs.appendFileSync(AUDIT_LOG_PATH, line, "utf8");
  } catch (e: any) {
    console.error("[audit-log] Failed to write:", e.message);
  }
}

function readAuditLog(limit = 200): any[] {
  try {
    ensureAuditDir();
    if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
    const lines = fs.readFileSync(AUDIT_LOG_PATH, "utf8")
      .split("\n")
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
    return lines.slice(-limit).reverse(); // newest first
  } catch {
    return [];
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Mobile app: look up patient by phone number (no session required)
  app.post("/api/mobile/auth/login", async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone required" });
    const normalized = String(phone).replace(/\D/g, "");
    if (normalized.length < 7) return res.status(400).json({ error: "Invalid phone number" });
    const allPatients = await storage.getPatients();
    const patient = allPatients.find(p => {
      if (!p.phone) return false;
      const stored = p.phone.replace(/\D/g, "");
      if (stored.length < 7) return false;
      // Accept 10-digit exact match or country-code prefix equivalence
      // e.g. "8404828065" matches "918404828065" — compare last 10 digits
      const cmp = Math.min(normalized.length, stored.length, 10);
      return normalized.slice(-cmp) === stored.slice(-cmp);
    });
    if (!patient) return res.status(404).json({ error: "No patient found for this phone number" });
    const mobileToken = issueMobileToken(patient.id);
    res.json({ patient, mobileToken });
  });

  // ── Mobile self-tracking routes ────────────────────────────────────────────
  // All patient-specific routes require a Bearer token issued by /api/mobile/auth/login.
  // getMobilePatientId validates the token and (when expectedPatientId is given) guards
  // against IDOR — a token for patient A cannot access patient B's data.

  app.get("/api/mobile/providers", async (_req, res) => {
    const providers = await storage.getProviders();
    res.json(providers);
  });

  app.get("/api/mobile/patients/:id/water-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const date = req.query.date as string | undefined;
    const logs = await storage.getWaterLogs(id, date);
    res.json(logs);
  });

  app.post("/api/mobile/patients/:id/water-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const { amountMl, date } = req.body;
    if (!amountMl || !date) return res.status(400).json({ error: "amountMl and date required" });
    const ml = parseInt(amountMl);
    if (isNaN(ml) || ml < 1 || ml > 5000) return res.status(400).json({ error: "amountMl must be 1-5000" });
    try {
      const log = await storage.addWaterLog({ patientId: id, amountMl: ml, date, loggedAt: new Date().toISOString() });
      res.status(201).json(log);
    } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : "An error occurred" }); }
  });

  app.get("/api/mobile/patients/:id/weight-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const logs = await storage.getWeightLogs(id);
    res.json(logs);
  });

  app.post("/api/mobile/patients/:id/weight-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const { weight, unit, date, week } = req.body;
    if (weight == null || isNaN(Number(weight))) return res.status(400).json({ error: "weight is required" });
    if (!date) return res.status(400).json({ error: "date is required" });
    try {
      const log = await storage.addWeightLog({
        patientId: id,
        weight: parseFloat(weight),
        unit: unit || "kg",
        date,
        week: week != null ? parseInt(week) : undefined,
        loggedAt: new Date().toISOString(),
      });
      res.status(201).json(log);
    } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : "An error occurred" }); }
  });

  app.get("/api/mobile/patients/:id/bp-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const logs = await storage.getBpLogs(id);
    res.json(logs);
  });

  app.post("/api/mobile/patients/:id/bp-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const { systolic, diastolic, pulse, date } = req.body;
    if (systolic == null || isNaN(Number(systolic))) return res.status(400).json({ error: "systolic is required" });
    if (diastolic == null || isNaN(Number(diastolic))) return res.status(400).json({ error: "diastolic is required" });
    if (!date) return res.status(400).json({ error: "date is required" });
    try {
      const log = await storage.addBpLog({
        patientId: id,
        systolic: parseInt(systolic),
        diastolic: parseInt(diastolic),
        pulse: pulse != null ? parseInt(pulse) : undefined,
        date,
        loggedAt: new Date().toISOString(),
      });
      res.status(201).json(log);
    } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : "An error occurred" }); }
  });

  app.get("/api/mobile/patients/:id/pregnancy-metrics", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const metrics = await storage.getPregnancyMetrics(id);
    res.json(metrics);
  });

  app.post("/api/mobile/patients/:id/pregnancy-metrics", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const { week, weight, systolic, diastolic } = req.body;
    if (week == null || isNaN(Number(week))) return res.status(400).json({ error: "week is required" });
    try {
      const metric = await storage.createPregnancyMetric({
        patientId: id,
        week: parseInt(week),
        weight: weight != null ? parseFloat(weight) : undefined,
        systolic: systolic != null ? parseInt(systolic) : undefined,
        diastolic: diastolic != null ? parseInt(diastolic) : undefined,
        enteredBy: "patient",
      });
      res.status(201).json(metric);
    } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : "An error occurred" }); }
  });

  app.get("/api/mobile/patients/:id/medications", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const meds = await storage.getMedications(id);
    res.json(meds);
  });

  app.post("/api/mobile/patients/:id/medications", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const { name, dose, frequency, startDate, endDate, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    try {
      const med = await storage.createMedication({ patientId: id, name, dose, frequency, startDate, endDate, notes, status: "active" });
      res.status(201).json(med);
    } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : "An error occurred" }); }
  });

  app.delete("/api/mobile/medications/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const patientId = getMobilePatientId(req, res);
    if (!patientId) return;
    const patientMeds = await storage.getMedications(patientId);
    if (!patientMeds.some(m => m.id === id)) return res.status(403).json({ error: "Forbidden" });
    const deleted = await storage.deleteMedication(id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  });

  app.get("/api/mobile/patients/:id/medication-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const date = req.query.date as string | undefined;
    const logs = await storage.getMedicationLogs(id, date);
    res.json(logs);
  });

  app.post("/api/mobile/patients/:id/medication-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const { medicationId, takenDate } = req.body;
    if (!medicationId || !takenDate) return res.status(400).json({ error: "medicationId and takenDate required" });
    const mid = parseInt(medicationId);
    const patientMeds = await storage.getMedications(id);
    if (!patientMeds.some(m => m.id === mid)) return res.status(403).json({ error: "Medication not found for this patient" });
    try {
      const log = await storage.addMedicationLog({ patientId: id, medicationId: mid, takenDate, takenAt: new Date().toISOString() });
      res.status(201).json(log);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      if (msg.includes("unique")) return res.status(409).json({ error: "Already marked taken for this date" });
      res.status(400).json({ error: msg });
    }
  });

  app.get("/api/mobile/patients/:id/appointments", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const appts = await storage.getAppointmentsByPatient(id);
    res.json(appts);
  });

  app.post("/api/mobile/appointments", async (req, res) => {
    const { patientId, date, time, type, status } = req.body;
    if (!patientId || !date) return res.status(400).json({ error: "patientId and date required" });
    const pid = parseInt(String(patientId));
    if (!getMobilePatientId(req, res, pid)) return;
    try {
      const appt = await storage.createAppointment({
        patientId: pid,
        date: String(date),
        time: String(time || "10:00"),
        type: String(type || "Consultation"),
        status: String(status || "Pending"),
      });
      res.status(201).json(appt);
    } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : "An error occurred" }); }
  });

  app.delete("/api/mobile/appointments/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const patientId = getMobilePatientId(req, res);
    if (!patientId) return;
    const appts = await storage.getAppointmentsByPatient(patientId);
    if (!appts.some(a => a.id === id)) return res.status(403).json({ error: "Forbidden" });
    const updated = await storage.updateAppointment(id, { status: "cancelled" });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  });

  app.get("/api/mobile/patients/:id/documents", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const docs = await storage.getPatientDocuments(id);
    res.json(docs.map(d => ({ ...d, fileData: undefined })));
  });

  app.post("/api/mobile/patients/:id/documents", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!getMobilePatientId(req, res, id)) return;
    const { fileName, fileData, mimeType, docType, label } = req.body;
    if (!fileName) return res.status(400).json({ error: "fileName required" });
    const allowedMime = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (mimeType && !allowedMime.includes(mimeType)) return res.status(400).json({ error: "Unsupported file type" });
    if (fileData) {
      const sizeBytes = Math.ceil((fileData.length * 3) / 4);
      if (sizeBytes > 5 * 1024 * 1024) return res.status(400).json({ error: "File exceeds 5 MB limit" });
    }
    try {
      const doc = await storage.createPatientDocument({
        patientId: id, fileName, fileData, mimeType, docType, label,
        uploadedAt: new Date().toISOString(),
      });
      res.status(201).json({ ...doc, fileData: undefined });
    } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : "An error occurred" }); }
  });

  app.delete("/api/mobile/patient-documents/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const patientId = getMobilePatientId(req, res);
    if (!patientId) return;
    const docs = await storage.getPatientDocuments(patientId);
    if (!docs.some(d => d.id === id)) return res.status(403).json({ error: "Forbidden" });
    const deleted = await storage.deletePatientDocument(id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  });

  app.post("/api/mobile/ai-chat", async (req, res) => {
    const patientId = getMobilePatientId(req, res);
    if (!patientId) return;
    const { message, weekNumber, trimester } = req.body as {
      message?: string;
      weekNumber?: number;
      trimester?: number;
    };
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "message is required" });
    }
    if (message.length > 500) {
      return res.status(400).json({ error: "message must be 500 characters or fewer" });
    }
    const week = typeof weekNumber === "number" ? weekNumber : null;
    const tri = typeof trimester === "number" ? trimester : null;
    const trimesterLabel = tri === 1 ? "First" : tri === 2 ? "Second" : tri === 3 ? "Third" : null;
    const contextLine = week
      ? `The patient is currently at week ${week} of her pregnancy${trimesterLabel ? ` (${trimesterLabel} Trimester)` : ""}.`
      : "The patient's pregnancy week is unknown.";

    const systemPrompt = [
      "You are Maya, a warm and knowledgeable AI pregnancy assistant for the Saivie maternal health platform.",
      contextLine,
      "Your role is to provide supportive, evidence-based information about pregnancy, symptoms, nutrition, baby development, and general wellbeing.",
      "Always tailor your answer to the patient's current week and trimester when relevant.",
      "Keep responses concise (2–4 short paragraphs or bullet points), friendly, and reassuring.",
      "Never diagnose or prescribe. Always end with a reminder to consult her Saivie clinician for any medical concerns.",
      "Do not repeat the disclaimer if the patient explicitly acknowledges it.",
    ].join(" ");

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: message.trim() }],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
        },
      });
      const reply = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "I'm sorry, I couldn't generate a response right now.";
      res.json({ reply });
    } catch (err) {
      req.log?.error({ err }, "ai-chat error");
      res.status(503).json({ error: "AI assistant is temporarily unavailable. Please try again." });
    }
  });

  // ── End mobile routes ─────────────────────────────────────────────────────

  // ── Kiosk routes (patient self-service terminal) ──────────────────────────
  // The kiosk is a physically-restricted in-clinic device.  We protect it
  // with two lightweight controls:
  //   1. IP-based rate limiting on the phone lookup (max 10 req/min per IP)
  //      to prevent brute-force enumeration of patient phone numbers.
  //   2. Short-lived kiosk session tokens: lookup returns a token bound to
  //      the patient + their today's appointment IDs.  Check-in and status
  //      polling require that token in X-Kiosk-Session, preventing arbitrary
  //      appointment manipulation or enumeration by appointment ID.

  // In-memory kiosk session store (30-min TTL)
  const KIOSK_SESSION_TTL_MS = 30 * 60 * 1000;
  const kioskSessions = new Map<string, {
    patientId: number;
    appointmentIds: Set<number>;
    expiresAt: number;
  }>();

  function issueKioskSession(patientId: number, appointmentIds: number[]): string {
    const token = crypto.randomBytes(24).toString("hex");
    kioskSessions.set(token, {
      patientId,
      appointmentIds: new Set(appointmentIds),
      expiresAt: Date.now() + KIOSK_SESSION_TTL_MS,
    });
    return token;
  }

  function validateKioskSession(req: Request, res: Response, appointmentId?: number): { patientId: number } | null {
    const token = (req.headers["x-kiosk-session"] ?? "") as string;
    if (!token) {
      res.status(401).json({ error: "Kiosk session required" });
      return null;
    }
    const session = kioskSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      kioskSessions.delete(token);
      res.status(401).json({ error: "Kiosk session expired — please look up your phone number again" });
      return null;
    }
    if (appointmentId !== undefined && !session.appointmentIds.has(appointmentId)) {
      res.status(403).json({ error: "Appointment not in your session" });
      return null;
    }
    return { patientId: session.patientId };
  }

  // Simple IP rate limiter for phone lookup (max 10 req/min per IP)
  const kioskLookupRateMap = new Map<string, { count: number; resetAt: number }>();
  function kioskLookupRateLimit(req: Request, res: Response): boolean {
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const entry = kioskLookupRateMap.get(ip);
    if (!entry || entry.resetAt < now) {
      kioskLookupRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= 10) {
      res.status(429).json({ error: "Too many requests. Please try again in a moment." });
      return false;
    }
    entry.count += 1;
    return true;
  }

  // POST /api/kiosk/lookup — phone → patient + today's appointments + session token
  app.post("/api/kiosk/lookup", async (req, res) => {
    if (!kioskLookupRateLimit(req, res)) return;

    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone required" });
    const normalized = String(phone).replace(/\D/g, "");
    if (normalized.length < 7) return res.status(400).json({ error: "Invalid phone number" });

    const allPatients = await storage.getPatients();
    const patient = allPatients.find(p => {
      if (!p.phone) return false;
      const stored = p.phone.replace(/\D/g, "");
      if (stored.length < 7) return false;
      const cmp = Math.min(normalized.length, stored.length, 10);
      return normalized.slice(-cmp) === stored.slice(-cmp);
    });
    if (!patient) return res.status(404).json({ error: "No patient found for this phone number." });

    const today = new Date().toISOString().split("T")[0];
    const todayAppts = await storage.getAppointmentsByDate(today);
    const patientAppts = todayAppts.filter(a => a.patientId === patient.id);

    const providers = await storage.getProviders();
    const appointments = patientAppts.map(a => ({
      id: a.id,
      date: a.date,
      time: a.time,
      type: a.type,
      status: a.status,
      checkedInAt: a.checkedInAt,
      providerName: providers.find(pr => pr.id === a.providerId)?.name ?? "Your Doctor",
    }));

    const sessionToken = issueKioskSession(patient.id, patientAppts.map(a => a.id));
    res.json({
      patient: { id: patient.id, name: patient.name },
      appointments,
      sessionToken,
    });
  });

  // POST /api/kiosk/checkin/:id — check in an appointment (session-gated)
  app.post("/api/kiosk/checkin/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!validateKioskSession(req, res, id)) return;
    const now = new Date().toISOString();
    const updated = await storage.updateAppointment(id, { checkedInAt: now, status: "checked-in" });
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json(updated);
  });

  // POST /api/kiosk/intake/:id — save pre-visit intake form (session-gated)
  app.post("/api/kiosk/intake/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!validateKioskSession(req, res, id)) return;
    const { chiefComplaint, currentMeds, allergies, newSymptoms } = req.body as Record<string, string | undefined>;
    const notesText = [
      chiefComplaint ? `Chief complaint: ${chiefComplaint}` : "",
      currentMeds ? `Current medications: ${currentMeds}` : "",
      allergies ? `Allergies: ${allergies}` : "",
      newSymptoms ? `New symptoms: ${newSymptoms}` : "",
    ].filter(Boolean).join("\n");
    const updated = await storage.updateAppointment(id, {
      chiefComplaint: chiefComplaint || undefined,
      notes: notesText || undefined,
    });
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json({ ok: true });
  });

  // GET /api/kiosk/appointment/:id — poll live appointment status (session-gated)
  app.get("/api/kiosk/appointment/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    if (!validateKioskSession(req, res, id)) return;
    const appts = await storage.getAppointments();
    const appt = appts.find(a => a.id === id);
    if (!appt) return res.status(404).json({ error: "Appointment not found" });
    res.json({
      id: appt.id,
      status: appt.status,
      checkedInAt: appt.checkedInAt,
      seenAt: appt.seenAt,
      completedAt: appt.completedAt,
    });
  });

  // ── End kiosk routes ──────────────────────────────────────────────────────

  app.get("/api/patients", async (req, res) => {
    const providerId = req.query.providerId ? parseInt(req.query.providerId as string) : undefined;
    if (providerId) {
      const allAppointments = await storage.getAppointments();
      const patientIds = Array.from(new Set(allAppointments.filter(a => a.providerId === providerId).map(a => a.patientId).filter(Boolean)));
      const allPatients = await storage.getPatients();
      const filtered = allPatients.filter(p => patientIds.includes(p.id));
      res.json(filtered);
    } else {
      const patients = await storage.getPatients();
      res.json(patients);
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid patient ID" });
    const patient = await storage.getPatient(id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  });

  app.post("/api/patients", async (req, res) => {
    if (!req.body.name) return res.status(400).json({ error: "Patient name is required" });
    const patient = await storage.createPatient(req.body);

    // Send welcome WhatsApp to new patient
    if (patient.phone) {
      try {
        await whatsapp.sendWelcomeMessage(patient.phone, patient.name);
      } catch (err) {
        console.error("Failed to send welcome WhatsApp:", err);
      }
    }

    // Auto-score new patient
    scorePatient(patient.id).catch(() => {});
    // Auto-generate trimester checklist if LMP is set (pregnancy patient)
    if (patient.lmp) {
      generateTrimesterChecklist(patient.id).catch(() => {});
    }

    res.status(201).json(patient);
  });

  app.patch("/api/patients/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid patient ID" });
    const updated = await storage.updatePatient(id, req.body);
    if (!updated) return res.status(404).json({ error: "Patient not found" });
    // Re-score if clinically relevant fields changed
    const clinicalFields = ['lmp', 'bp', 'hb', 'weight', 'condition', 'type'];
    if (clinicalFields.some(f => req.body[f] !== undefined)) {
      scorePatient(id).catch(() => {});
    }
    // Regenerate trimester checklist if LMP changed
    if (req.body.lmp) {
      generateTrimesterChecklist(id).catch(() => {});
    }
    res.json(updated);
  });

  app.get("/api/providers", async (_req, res) => {
    const providers = await storage.getProviders();
    res.json(providers);
  });

  app.post("/api/providers", async (req, res) => {
    const provider = await storage.createProvider(req.body);
    res.status(201).json(provider);
  });

  app.patch("/api/providers/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateProvider(id, req.body);
    if (!updated) return res.status(404).json({ error: "Provider not found" });
    res.json(updated);
  });

  app.get("/api/services", async (_req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.post("/api/services", async (req, res) => {
    const service = await storage.createService(req.body);
    res.status(201).json(service);
  });

  app.get("/api/appointments", async (req, res) => {
    const { date, patientId, providerId } = req.query;
    let appts;
    if (date) {
      appts = await storage.getAppointmentsByDate(date as string);
    } else if (patientId) {
      appts = await storage.getAppointmentsByPatient(parseInt(patientId as string));
    } else {
      appts = await storage.getAppointments();
    }
    if (providerId) {
      appts = appts.filter(a => a.providerId === parseInt(providerId as string));
    }
    res.json(appts);
  });

  app.post("/api/appointments", async (req, res) => {
    const body = req.body;

    // Auto-generate Jitsi telemedicine link if visit mode is telemedicine
    if (body.visitMode === "telemedicine" && !body.telemedicineLink) {
      const { randomUUID } = await import("crypto");
      body.telemedicineLink = `https://meet.jit.si/saivie-${randomUUID().slice(0, 8)}`;
    }

    const appt = await storage.createAppointment(body);

    // Send WhatsApp confirmation
    if (appt.patientId) {
      const patient = await storage.getPatient(appt.patientId);
      if (patient?.phone) {
        try {
          await whatsapp.sendAppointmentConfirmation(
            patient.phone,
            patient.name,
            appt.date,
            appt.time,
            appt.visitMode || "in-clinic",
            appt.telemedicineLink
          );
        } catch (err) {
          console.error("Failed to send WhatsApp confirmation:", err);
        }
      }
    }

    res.status(201).json(appt);
  });

  // Generate / refresh telemedicine link for an appointment
  app.post("/api/appointments/:id/telemedicine", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const { randomUUID } = await import("crypto");
    const link = `https://meet.jit.si/saivie-${randomUUID().slice(0, 8)}`;
    const updated = await storage.updateAppointment(id, {
      visitMode: "telemedicine",
      telemedicineLink: link,
    });
    if (!updated) return res.status(404).json({ error: "Appointment not found" });

    // Notify patient of telemedicine link
    if (updated.patientId) {
      const patient = await storage.getPatient(updated.patientId);
      if (patient?.phone) {
        try {
          await whatsapp.sendTextMessage(
            patient.phone,
            `Hi ${patient.name}, your video consultation link is ready:\n${link}\n\nSee you on ${updated.date} at ${updated.time}! 💜\n\n_Saivie Reproductive Intelligence_`
          );
        } catch (_) {}
      }
    }

    res.json({ link, appointment: updated });
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateAppointment(id, req.body);
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json(updated);

    // Auto-trigger post-visit WhatsApp summary when appointment is marked Completed
    // Guard against duplicate sends if appointment is updated to "completed" multiple times
    const newStatus = (req.body.status || "").toLowerCase();
    if (newStatus === "completed" && !postVisitSummarySentIds.has(id)) {
      postVisitSummarySentIds.add(id);
      (async () => {
        try {
          const patient = updated.patientId ? await storage.getPatient(updated.patientId) : null;
          if (!patient?.phone) return;

          const visits = await storage.getVisitHistory(patient.id);
          const latestVisit = visits.sort((a, b) => b.date.localeCompare(a.date))[0];
          const meds = await storage.getMedications(patient.id);
          const activeMeds = meds.filter(m => m.status === "active" || m.status === "Active" || !m.status);

          const summaryResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
              role: "user",
              parts: [{
                text: `Generate a warm, friendly post-visit WhatsApp summary for a patient of a women's reproductive health clinic in India.

Patient: ${patient.name}, Age: ${patient.age}
Today's visit diagnosis/assessment: ${latestVisit?.diagnosis || latestVisit?.assessment || "General consultation"}
Plan notes: ${latestVisit?.planNotes || ""}
Active medications: ${activeMeds.slice(0, 5).map(m => `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` (${m.frequency})` : ""}`).join(", ") || "None prescribed"}
Next appointment: ${patient.nextReview || "To be scheduled"}

Write a WhatsApp message (max 180 words) in a warm, supportive tone. Include:
1. A brief summary of today's visit
2. Key medications to take (if any)
3. Important instructions or things to watch for
4. Next steps / follow-up

Use simple, non-clinical language. End with "_Saivie Reproductive Intelligence_". Use WhatsApp formatting (bold with *text*).`,
              }],
            }],
          });

          const summaryText = summaryResponse.text || "";
          await whatsapp.sendTextMessage(patient.phone, summaryText);
          // Persist so the clinician can see this summary in the patient timeline
          await storage.createClinicalNote({
            patientId: patient.id,
            appointmentId: id,
            date: new Date().toISOString().split("T")[0],
            type: "visit_summary",
            title: "Post-Visit WhatsApp Summary (Auto)",
            content: summaryText,
            tags: ["whatsapp", "post-visit-summary", "auto"],
            isPrivate: 0,
          });
          console.log(`[post-visit-auto] Summary sent and saved for ${patient.name} (appt #${id})`);
        } catch (err: any) {
          console.error(`[post-visit-auto] Failed for appt #${id}:`, err.message);
        }
      })();
    }
  });

  // Pre-appointment onboarding endpoints
  app.get("/api/onboarding/:appointmentId", async (req, res) => {
    const appointmentId = parseId(req.params.appointmentId);
    if (!appointmentId) return res.status(400).json({ error: "Invalid appointment ID" });

    const appt = await storage.getAppointments().then(all => all.find(a => a.id === appointmentId));
    if (!appt) return res.status(404).json({ error: "Appointment not found" });

    const patient = await storage.getPatient(appt.patientId!);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    res.json({
      appointment: { id: appt.id, date: appt.date, time: appt.time },
      patient: { id: patient.id, name: patient.name, history: patient.history }
    });
  });

  // WhatsApp Test Endpoint
  app.post("/api/whatsapp/test", async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: "Phone and message are required" });
    }
    try {
      const result = await whatsapp.sendTextMessage(phone, message);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send a WhatsApp message to a specific patient (receptionist panel)
  app.post("/api/whatsapp/send-patient", async (req, res) => {
    const { patientId, message } = req.body;
    if (!patientId || !message) {
      return res.status(400).json({ error: "patientId and message are required" });
    }
    const patient = await storage.getPatient(parseInt(patientId));
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    if (!patient.phone) return res.status(400).json({ error: "Patient has no phone number on record" });
    try {
      const result = await whatsapp.sendTextMessage(patient.phone, message);
      res.json({ success: true, patient: { name: patient.name, phone: patient.phone }, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // WhatsApp Inbound Webhook — Meta verification handshake
  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "saivie_webhook_verify";
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified");
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: "Verification failed" });
    }
  });

  // WhatsApp Inbound Webhook — receive messages
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      // Verify Meta webhook signature if app secret is configured
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (appSecret) {
        const signature = req.headers["x-hub-signature-256"] as string | undefined;
        if (!signature) {
          console.warn("WhatsApp webhook: missing signature header — request rejected");
          return res.sendStatus(403);
        }
        const rawBody = (req as any).rawBody as Buffer | undefined;
        if (!rawBody) {
          console.warn("WhatsApp webhook: raw body unavailable — request rejected");
          return res.sendStatus(403);
        }
        const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          console.warn("WhatsApp webhook: signature mismatch — request rejected");
          return res.sendStatus(403);
        }
      }

      const body = req.body;
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return res.sendStatus(200);
      }

      for (const msg of messages) {
        const fromPhone = msg.from; // raw phone (91XXXXXXXXXX)
        const text = msg.text?.body?.trim().toUpperCase();

        if (!text || !fromPhone) continue;

        // Find patient by phone number
        const allPatients = await storage.getPatients();
        const patient = allPatients.find(p => {
          if (!p.phone) return false;
          const cleaned = whatsapp.formatPhoneNumber(p.phone);
          return cleaned === fromPhone || cleaned === fromPhone.replace(/^91/, "");
        });

        if (!patient) {
          console.log(`WhatsApp inbound from unknown phone ${fromPhone}: ${text}`);
          continue;
        }

        // Find their next upcoming appointment
        const appts = await storage.getAppointmentsByPatient(patient.id);
        const today = new Date().toISOString().split("T")[0];
        const upcoming = appts
          .filter(a => a.date >= today && a.status !== "completed" && a.status !== "cancelled")
          .sort((a, b) => a.date.localeCompare(b.date));
        const next = upcoming[0];

        const originalText = msg.text?.body || text;
        const formattedPhone = whatsapp.formatPhoneNumber(patient.phone!);

        // ── CONFIRM / CANCEL ─────────────────────────────────────────────
        if (text === "CONFIRM" && next) {
          await storage.updateAppointment(next.id, { status: "confirmed" });
          await whatsapp.sendTextMessage(
            patient.phone!,
            `✅ Confirmed! Your appointment on ${next.date} at ${next.time || "10:00"} is confirmed. See you then! 💜\n\n_Saivie Reproductive Intelligence_`
          );
          console.log(`Appointment ${next.id} confirmed by patient ${patient.name} via WhatsApp`);
          continue;
        }

        if (text === "CANCEL" && next) {
          await storage.updateAppointment(next.id, { status: "cancelled" });
          pendingBookings.delete(formattedPhone);
          await whatsapp.sendTextMessage(
            patient.phone!,
            `Your appointment on ${next.date} at ${next.time || "10:00"} has been cancelled.\n\nTo book a new appointment reply:\n• *BOOK DOCTOR* — Doctor consultation\n• *BOOK NUTRITION* — Nutritionist session\n• *BOOK LAB* — Blood test / lab work\n\nWe hope to see you soon. 💜\n\n_Saivie Reproductive Intelligence_`
          );
          console.log(`Appointment ${next.id} cancelled by patient ${patient.name} via WhatsApp`);
          continue;
        }

        // ── PENDING BOOKING FLOW: patient replied with a date ────────────
        const pending = pendingBookings.get(formattedPhone);
        if (pending && (Date.now() - pending.askedAt) < 10 * 60 * 1000) {
          // Try to parse a date from the patient's reply using Gemini
          try {
            const dateParseResp = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{ role: "user", parts: [{ text: `Today is ${today}. A patient said: "${originalText}". Extract the date they want their appointment. Return JSON: { "date": "YYYY-MM-DD" | null, "intelligible": true|false }. If no clear date can be inferred, set date to null.` }] }],
              config: { responseMimeType: "application/json" },
            });
            let parsed: { date: string | null; intelligible: boolean } = { date: null, intelligible: false };
            try {
              const raw = (dateParseResp.text || "{}").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              parsed = { ...parsed, ...JSON.parse(raw) };
            } catch {}

            if (parsed.date && parsed.date >= today) {
              // Create the appointment
              const typeMap: Record<string, string> = {
                doctor: "Consultation",
                nutritionist: "Nutrition Consultation",
                blood_test: "Blood Test / Lab Work",
              };
              const allProviders = await storage.getProviders();
              const provider = pending.type === "nutritionist"
                ? allProviders.find(p => (p.specialization || "").toLowerCase().includes("nutri")) || allProviders[0]
                : allProviders[0];

              const newAppt = await storage.createAppointment({
                patientId: patient.id,
                providerId: provider?.id || null,
                date: parsed.date,
                time: "10:00",
                type: typeMap[pending.type],
                status: "Pending",
              } as any);

              pendingBookings.delete(formattedPhone);
              const friendlyDate = new Date(parsed.date).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
              await whatsapp.sendTextMessage(
                patient.phone!,
                `✅ *Appointment Request Received!*\n\nHi ${patient.name}, your *${pending.label}* has been requested for *${friendlyDate}*.\n\nThe clinic will confirm the exact time and send you a reminder. Reply *CONFIRM* once you receive your confirmation, or *CANCEL* to cancel.\n\n_Saivie Reproductive Intelligence_`
              );
              console.log(`[WhatsApp Booking] Created appt #${newAppt.id} for ${patient.name} on ${parsed.date}`);
            } else {
              await whatsapp.sendTextMessage(
                patient.phone!,
                `I couldn't quite catch the date, ${patient.name}. Could you please share your preferred date like this: *DD Month YYYY* (e.g. 15 June 2026)? 💜\n\n_Saivie Reproductive Intelligence_`
              );
            }
          } catch (err: any) {
            console.error("[WhatsApp Booking] Date parse error:", err.message);
          }
          continue;
        }

        // ── QUICK BOOKING SHORTCUTS ──────────────────────────────────────
        const upperText = text.toUpperCase();
        const bookingShortcut: { type: "doctor" | "nutritionist" | "blood_test"; label: string } | null =
          (upperText.includes("BOOK DOCTOR") || upperText.includes("BOOK CONSULTATION") || upperText === "BOOK")
            ? { type: "doctor", label: "Doctor Consultation" }
          : (upperText.includes("BOOK NUTRI") || upperText.includes("BOOK DIET"))
            ? { type: "nutritionist", label: "Nutritionist Session" }
          : (upperText.includes("BOOK LAB") || upperText.includes("BOOK BLOOD") || upperText.includes("BOOK TEST"))
            ? { type: "blood_test", label: "Blood Test / Lab Work" }
          : null;

        if (bookingShortcut) {
          pendingBookings.set(formattedPhone, { ...bookingShortcut, askedAt: Date.now() });
          await whatsapp.sendTextMessage(
            patient.phone!,
            `Great, ${patient.name}! 📅 To book your *${bookingShortcut.label}*, please share your preferred date.\n\nYou can say something like:\n• *15 June 2026*\n• *Next Monday*\n• *This Friday*\n\n_Saivie Reproductive Intelligence_`
          );
          continue;
        }

        // ── AI VIRTUAL ASSISTANT ─────────────────────────────────────────
        try {
          const meds = await storage.getMedications(patient.id);
          const activeMeds = meds.filter(m => m.status === "active" || m.status === "Active" || !m.status).map(m => m.name);
          const nextApptInfo = next ? `${next.date} at ${next.time || "10:00"} (${next.type || "Consultation"})` : "No upcoming appointment";

          const aiResp = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
              role: "user",
              parts: [{
                text: `You are a helpful WhatsApp assistant for Saivie, a women's reproductive health clinic in India.
Patient: ${patient.name}, Age: ${patient.age}
Next appointment: ${nextApptInfo}
Active medications: ${activeMeds.join(", ") || "None on record"}

Patient's message: "${originalText}"

Classify and respond:
- type: booking_request | reschedule_request | appointment_query | medication_question | symptom_query | result_query | general
- urgent: true ONLY for same-day emergencies (severe pain, heavy bleeding, fever >38.5°C, fetal movement change, chest pain)
- For booking_request: extract { requestedDate: "YYYY-MM-DD" | null, appointmentType: "doctor" | "nutritionist" | "blood_test" }
- For reschedule_request: extract { newDate: "YYYY-MM-DD" | null } (today = ${today})
- reply: warm, supportive WhatsApp message under 120 words. End with "_Saivie Reproductive Intelligence_"
  - If booking_request with a date → confirm you'll process it
  - If booking_request without a date → ask for their preferred date and mention the shortcuts: BOOK DOCTOR, BOOK NUTRITION, BOOK LAB
  - If reschedule_request → confirm the change or ask for new date
  - If urgent=true → start with "⚠️ *Please contact our clinic immediately.*"
  - Never give medical diagnoses

Return JSON: { "type": "...", "urgent": false, "requestedDate": null, "appointmentType": null, "newDate": null, "reply": "..." }`,
              }],
            }],
            config: { responseMimeType: "application/json" },
          });

          let cl: {
            type: string; urgent: boolean;
            requestedDate: string | null; appointmentType: string | null;
            newDate: string | null; reply: string;
          } = { type: "general", urgent: false, requestedDate: null, appointmentType: null, newDate: null, reply: `Thank you for your message, ${patient.name}! 💜 Your next appointment is ${nextApptInfo}.\n\n_Saivie Reproductive Intelligence_` };
          try {
            const raw = (aiResp.text || "{}").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            cl = { ...cl, ...JSON.parse(raw) };
          } catch {}

          // Handle booking intent from AI classification
          if (cl.type === "booking_request") {
            const apptType = (cl.appointmentType as any) || "doctor";
            const labelMap: Record<string, string> = { doctor: "Doctor Consultation", nutritionist: "Nutritionist Session", blood_test: "Blood Test / Lab Work" };
            const typeMap: Record<string, string> = { doctor: "Consultation", nutritionist: "Nutrition Consultation", blood_test: "Blood Test / Lab Work" };

            if (cl.requestedDate && cl.requestedDate >= today) {
              const allProviders = await storage.getProviders();
              const provider = apptType === "nutritionist"
                ? allProviders.find(p => (p.specialization || "").toLowerCase().includes("nutri")) || allProviders[0]
                : allProviders[0];
              const newAppt = await storage.createAppointment({
                patientId: patient.id,
                providerId: provider?.id || null,
                date: cl.requestedDate,
                time: "10:00",
                type: typeMap[apptType] || "Consultation",
                status: "Pending",
              } as any);
              const friendlyDate = new Date(cl.requestedDate).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
              await whatsapp.sendTextMessage(patient.phone!, `✅ *Appointment Request Received!*\n\nYour *${labelMap[apptType] || "appointment"}* has been requested for *${friendlyDate}*. The clinic will confirm the time and send a reminder.\n\n_Saivie Reproductive Intelligence_`);
              console.log(`[WhatsApp AI Booking] Created appt #${newAppt.id} for ${patient.name}`);
            } else {
              // No date — set pending state and ask
              pendingBookings.set(formattedPhone, { type: apptType as any, label: labelMap[apptType] || "appointment", askedAt: Date.now() });
              await whatsapp.sendTextMessage(patient.phone!, cl.reply);
            }
            continue;
          }

          // Handle reschedule intent from AI classification
          if (cl.type === "reschedule_request" && next) {
            if (cl.newDate && cl.newDate >= today) {
              await storage.updateAppointment(next.id, { date: cl.newDate, status: "Pending" });
              const friendlyDate = new Date(cl.newDate).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
              await whatsapp.sendTextMessage(patient.phone!, `✅ Done! Your appointment has been rescheduled to *${friendlyDate}*. We'll confirm the exact time shortly. 💜\n\n_Saivie Reproductive Intelligence_`);
              console.log(`[WhatsApp AI Reschedule] Appt #${next.id} rescheduled to ${cl.newDate} for ${patient.name}`);
            } else {
              await whatsapp.sendTextMessage(patient.phone!, cl.reply);
            }
            continue;
          }

          // General AI reply
          await whatsapp.sendTextMessage(patient.phone!, cl.reply);
          console.log(`[WhatsApp AI] type=${cl.type} urgent=${cl.urgent} patient=${patient.name}`);

          // Urgent clinical alert
          if (cl.urgent) {
            try {
              await storage.createClinicalNote({
                patientId: patient.id,
                date: today,
                type: "alert",
                content: `⚠️ URGENT WhatsApp message from ${patient.name}: "${originalText.slice(0, 300)}"`,
                author: "WhatsApp AI",
                tags: ["urgent", "whatsapp", "needs-review"],
              } as any);
              console.log(`[WhatsApp AI] Urgent flag created for ${patient.name}`);
            } catch (flagErr: any) {
              console.error("[WhatsApp AI] Could not create urgent flag:", flagErr.message);
            }
          }
        } catch (aiErr: any) {
          console.error("[WhatsApp AI] Failed to generate response:", aiErr.message);
        }
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error("WhatsApp webhook error:", err.message);
      res.sendStatus(200); // Always 200 to prevent Meta retry loops
    }
  });

  app.post("/api/onboarding/:appointmentId", async (req, res) => {
    const appointmentId = parseId(req.params.appointmentId);
    if (!appointmentId) return res.status(400).json({ error: "Invalid appointment ID" });

    const { chiefComplaint, history } = req.body;

    const appt = await storage.getAppointments().then(all => all.find(a => a.id === appointmentId));
    if (!appt) return res.status(404).json({ error: "Appointment not found" });

    // Update appointment chief complaint
    await storage.updateAppointment(appointmentId, { chiefComplaint });

    // Update patient history
    if (history) {
      await storage.updatePatient(appt.patientId!, { history });
    }

    res.json({ success: true });
  });

  app.get("/api/lab-tasks", async (_req, res) => {
    const tasks = await storage.getLabTasks();
    res.json(tasks);
  });

  app.post("/api/lab-tasks", async (req, res) => {
    const task = await storage.createLabTask(req.body);
    res.status(201).json(task);
  });

  app.patch("/api/lab-tasks/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateLabTask(id, req.body);
    if (!updated) return res.status(404).json({ error: "Lab task not found" });
    res.json(updated);
  });

  app.get("/api/nutrition-plans", async (_req, res) => {
    const plans = await storage.getNutritionPlans();
    res.json(plans);
  });

  app.post("/api/nutrition-plans", async (req, res) => {
    const plan = await storage.createNutritionPlan(req.body);
    res.status(201).json(plan);
  });

  app.get("/api/workouts", async (_req, res) => {
    const workouts = await storage.getWorkouts();
    res.json(workouts);
  });

  app.post("/api/workouts", async (req, res) => {
    const workout = await storage.createWorkout(req.body);
    res.status(201).json(workout);
  });

  app.get("/api/patients/:id/hormones", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const readings = await storage.getHormoneReadings(id);
    res.json(readings);
  });

  app.post("/api/patients/:id/hormones", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const reading = await storage.createHormoneReading({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(reading);
  });

  app.get("/api/patients/:id/pregnancy-metrics", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const metrics = await storage.getPregnancyMetrics(id);
    res.json(metrics);
  });

  app.post("/api/patients/:id/pregnancy-metrics", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const metric = await storage.createPregnancyMetric({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(metric);
  });

  // Weight and BP logs are written by the mobile app via the /api/mobile/ routes.
  // These read-only endpoints expose self-tracked vitals to the clinician portal.
  app.get("/api/patients/:id/weight-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const logs = await storage.getWeightLogs(id);
    res.json(logs);
  });

  app.get("/api/patients/:id/bp-logs", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const logs = await storage.getBpLogs(id);
    res.json(logs);
  });

  app.get("/api/patients/:id/follicle-data", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const data = await storage.getFollicleData(id);
    res.json(data);
  });

  app.post("/api/patients/:id/follicle-data", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const data = await storage.createFollicleData({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(data);
  });

  app.get("/api/patients/:id/usg-data", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const data = await storage.getUsgData(id);
    res.json(data);
  });

  app.post("/api/patients/:id/usg-data", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const data = await storage.createUsgData({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(data);
  });

  app.get("/api/patients/:id/lab-results", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const results = await storage.getLabResults(id);
    res.json(results);
  });

  app.post("/api/patients/:id/lab-results", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const result = await storage.createLabResult({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(result);
    // Auto-trigger risk re-score when new lab result is uploaded
    scorePatient(id).catch(() => {});
  });

  app.get("/api/lab-tasks/:id/results", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const results = await storage.getLabResultsByTask(id);
    res.json(results);
  });

  app.get("/api/visit-history", async (req, res) => {
    const visits = await storage.getAllVisitHistory();
    res.json(visits);
  });

  app.get("/api/patients/:id/visit-history", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const visits = await storage.getVisitHistory(id);
    res.json(visits);
  });

  app.post("/api/patients/:id/visit-history", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const visit = await storage.createVisitHistory({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(visit);
  });

  app.patch("/api/visit-history/:visitId", async (req, res) => {
    const visitId = parseId(req.params.visitId);
    if (!visitId) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateVisitHistory(visitId, req.body);
    if (!updated) return res.status(404).json({ error: "Visit not found" });
    res.json(updated);
  });

  app.get("/api/patients/:id/medications", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const meds = await storage.getMedications(id);
    res.json(meds);
  });

  app.post("/api/patients/:id/medications", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const med = await storage.createMedication({ ...req.body, patientId: id });
    res.status(201).json(med);
  });

  app.patch("/api/medications/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateMedication(id, req.body);
    if (!updated) return res.status(404).json({ error: "Medication not found" });
    res.json(updated);
  });

  app.delete("/api/medications/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteMedication(id);
    if (!deleted) return res.status(404).json({ error: "Medication not found" });
    res.status(204).send();
  });

  app.get("/api/clinical-notes", async (req, res) => {
    const notes = await storage.getAllClinicalNotes();
    res.json(notes);
  });

  app.get("/api/patients/:id/clinical-notes", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const notes = await storage.getClinicalNotes(id);
    res.json(notes);
  });

  app.post("/api/patients/:id/clinical-notes", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const note = await storage.createClinicalNote({ ...req.body, patientId: id });
    res.status(201).json(note);
  });

  app.patch("/api/clinical-notes/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateClinicalNote(id, req.body);
    if (!updated) return res.status(404).json({ error: "Clinical note not found" });
    res.json(updated);
  });

  app.delete("/api/clinical-notes/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteClinicalNote(id);
    if (!deleted) return res.status(404).json({ error: "Clinical note not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/referrals", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const refs = await storage.getReferrals(id);
    res.json(refs);
  });

  app.post("/api/patients/:id/referrals", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const ref = await storage.createReferral({ ...req.body, patientId: id });
    res.status(201).json(ref);
  });

  app.patch("/api/referrals/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateReferral(id, req.body);
    if (!updated) return res.status(404).json({ error: "Referral not found" });
    res.json(updated);
  });

  app.delete("/api/referrals/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteReferral(id);
    if (!deleted) return res.status(404).json({ error: "Referral not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/invoices", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const inv = await storage.getInvoices(id);
    res.json(inv);
  });

  app.post("/api/patients/:id/invoices", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid patient ID" });
    const inv = await storage.createInvoice({ ...req.body, patientId: id, date: req.body.date || new Date().toISOString().split("T")[0] });
    res.status(201).json(inv);
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateInvoice(id, req.body);
    if (!updated) return res.status(404).json({ error: "Invoice not found" });
    res.json(updated);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteInvoice(id);
    if (!deleted) return res.status(404).json({ error: "Invoice not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/consent-forms", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const forms = await storage.getConsentForms(id);
    res.json(forms);
  });

  app.post("/api/patients/:id/consent-forms", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const form = await storage.createConsentForm({ ...req.body, patientId: id });
    res.status(201).json(form);
  });

  app.patch("/api/consent-forms/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateConsentForm(id, req.body);
    if (!updated) return res.status(404).json({ error: "Consent form not found" });
    res.json(updated);
  });

  app.delete("/api/consent-forms/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteConsentForm(id);
    if (!deleted) return res.status(404).json({ error: "Consent form not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/documents", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    // When a patient session is active, only allow reading their own documents.
    const sid = req.session?.patientId;
    if (sid != null && sid !== id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const docs = await storage.getDocuments(id);
    res.json(docs);
  });

  app.post("/api/patients/:id/documents", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const doc = await storage.createDocument({ ...req.body, patientId: id });
    res.status(201).json(doc);
  });

  app.patch("/api/documents/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateDocument(id, req.body);
    if (!updated) return res.status(404).json({ error: "Document not found" });
    res.json(updated);
  });

  app.delete("/api/documents/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteDocument(id);
    if (!deleted) return res.status(404).json({ error: "Document not found" });
    res.status(204).send();
  });

  app.post("/api/auth/passcode", async (req, res) => {
    const { passcode } = req.body;
    if (!passcode) return res.status(400).json({ error: "Passcode required" });
    const user = await storage.getUserByPasscode(passcode);
    if (!user) return res.status(401).json({ error: "Invalid passcode" });

    let providerInfo = null;
    if (user.role === "clinician") {
      const providers = await storage.getProviders();
      const usernameToProvider: Record<string, string> = {
        "dr.priya": "Dr. Priya",
        "dr.ramesh": "Dr. Ramesh",
        "dr.sai": "Dr. Sai Dibyadarshini Bhuyan",
      };
      const providerName = usernameToProvider[user.username];
      if (providerName) {
        providerInfo = providers.find(p => p.name.toLowerCase().includes(providerName.toLowerCase().split(' ')[1]));
      }
    }

    res.json({
      role: user.role,
      username: user.username,
      id: user.id,
      provider: providerInfo ? { id: providerInfo.id, name: providerInfo.name, specialty: providerInfo.specialty, role: providerInfo.role } : null,
    });
  });

  app.post("/api/auth/patient-login", async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+91/, '').slice(-10);
    if (normalizedPhone.length !== 10 || !/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: "Please enter a valid 10-digit phone number" });
    }

    const allPatients = await storage.getPatients();
    const patient = allPatients.find((p: any) => {
      if (!p.phone) return false;
      const pPhone = p.phone.replace(/[\s\-\(\)]/g, '').replace(/^\+91/, '').slice(-10);
      return pPhone === normalizedPhone;
    });

    if (!patient) {
      return res.status(404).json({ error: "No patient found with this phone number. Please contact the clinic." });
    }

    req.session.patientId = patient.id;

    res.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        age: patient.age,
        status: patient.status,
        condition: patient.condition,
      },
    });
  });

  app.post("/api/auth/patient-logout", (req, res) => {
    req.session.destroy(() => res.status(204).send());
  });

  app.get("/api/patient-protocols/:patientId", async (req, res) => {
    const patientId = parseId(req.params.patientId);
    if (!patientId) return res.status(400).json({ error: "Invalid ID" });
    const protocol = await storage.getPatientProtocol(patientId);
    res.json(protocol || null);
  });

  app.post("/api/patient-protocols", async (req, res) => {
    const protocol = await storage.savePatientProtocol(req.body);
    res.json(protocol);
  });

  app.get("/api/analytics/fertility", async (_req, res) => {
    res.json([
      { month: 'Jan', active: 45, ovulationRate: 78, pregnancies: 4 },
      { month: 'Feb', active: 48, ovulationRate: 82, pregnancies: 5 },
      { month: 'Mar', active: 52, ovulationRate: 80, pregnancies: 6 },
      { month: 'Apr', active: 50, ovulationRate: 85, pregnancies: 4 },
      { month: 'May', active: 55, ovulationRate: 88, pregnancies: 7 },
      { month: 'Jun', active: 58, ovulationRate: 87, pregnancies: 8 },
    ]);
  });

  app.get("/api/analytics/follicle-distribution", async (_req, res) => {
    res.json([
      { size: '14-16mm', count: 12 },
      { size: '16-18mm', count: 28 },
      { size: '18-20mm', count: 45 },
      { size: '20-22mm', count: 30 },
      { size: '>22mm', count: 15 },
    ]);
  });

  app.get("/api/analytics/pregnancy-risk", async (_req, res) => {
    res.json([
      { month: 'Jan', anemia: 12, gdm: 5, hypertension: 8 },
      { month: 'Feb', anemia: 10, gdm: 6, hypertension: 7 },
      { month: 'Mar', anemia: 8, gdm: 4, hypertension: 9 },
      { month: 'Apr', anemia: 9, gdm: 5, hypertension: 6 },
      { month: 'May', anemia: 7, gdm: 4, hypertension: 5 },
      { month: 'Jun', anemia: 6, gdm: 3, hypertension: 4 },
    ]);
  });

  app.get("/api/analytics/postpartum", async (_req, res) => {
    res.json([
      { week: 1, epds: 12, physical: 40 },
      { week: 2, epds: 10, physical: 55 },
      { week: 4, epds: 8, physical: 70 },
      { week: 6, epds: 6, physical: 85 },
      { week: 8, epds: 4, physical: 92 },
      { week: 12, epds: 3, physical: 98 },
    ]);
  });

  registerOcrRoutes(app);

  app.get("/api/analytics/pcos", async (_req, res) => {
    res.json([
      { month: 'Jan', acne: 8, hirsutism: 7, weight: 75 },
      { month: 'Feb', acne: 7, hirsutism: 7, weight: 74 },
      { month: 'Mar', acne: 6, hirsutism: 6, weight: 73 },
      { month: 'Apr', acne: 5, hirsutism: 6, weight: 72 },
      { month: 'May', acne: 4, hirsutism: 5, weight: 71 },
      { month: 'Jun', acne: 3, hirsutism: 5, weight: 70 },
    ]);
  });

  app.post("/api/google-sheets/sync", async (_req, res) => {
    try {
      const sheets = await getUncachableGoogleSheetClient();
      const spreadsheetId = "1mj3hkqjoQFrckIGC9Y0Jjlh6kYIYPHBVuPKAl7k-bxo";

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Form Responses 1'!A:R",
      });

      const rows = response.data.values || [];
      if (rows.length < 2) {
        return res.json({ imported: 0, skipped: 0, errors: [], message: "No data rows found" });
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const colIndex = (aliases: string[]) => {
        return headers.findIndex((h: string) => {
          const header = h.toLowerCase().trim();
          return aliases.some(alias => header === alias || (alias.length > 3 && header.includes(alias)));
        });
      };

      const nameIdx = colIndex(["patient name", "full name", "name"]);
      const phoneIdx = colIndex(["phone number", "mobile number", "whatsapp number", "phone", "mobile", "whatsapp"]);
      const emailIdx = colIndex(["email address", "email"]);
      const addressIdx = colIndex(["address", "location", "city"]);
      const itemsIdx = colIndex(["items", "services", "consultation details", "doctor name"]);
      const typeIdx = colIndex(["patient type"]);
      const lmpIdx = colIndex(["lmp", "last menstrual period"]);
      const heightIdx = colIndex(["height"]);
      const bpIdx = colIndex(["bp", "blood pressure"]);
      const weightIdx = colIndex(["weight"]);
      const ageIdx = colIndex(["age"]);
      const timestampIdx = colIndex(["timestamp"]);

      const existingPatients = await storage.getPatients();
      const existingProviders = await storage.getProviders(); // Automatically fetch available doctors
      const existingByPhone = new Map<string, number>();
      const existingByName = new Map<string, number>();
      for (const p of existingPatients) {
        if (p.phone) existingByPhone.set(p.phone.replace(/\D/g, ""), p.id);
        existingByName.set(p.name.toLowerCase().trim(), p.id);
      }

      const existingAppointments = await storage.getAppointments();
      const appointmentKeys = new Set(
        existingAppointments.map((a: any) => `${a.patientId}_${a.date}_${a.time}`)
      );

      const parseTimestamp = (ts: string): { date: string; time: string } | null => {
        if (!ts) return null;
        try {
          const parts = ts.split(" ");
          const dateParts = parts[0].split(/[/\-]/);
          if (dateParts.length !== 3) return null;
          // Google Forms always outputs MM/DD/YYYY — treat first part as month
          const month = dateParts[0].padStart(2, "0");
          const day = dateParts[1].padStart(2, "0");
          const year = dateParts[2].length === 2 ? "20" + dateParts[2] : dateParts[2];
          const date = `${year}-${month}-${day}`;
          const timePart = parts[1] || "00:00:00";
          const timePieces = timePart.split(":");
          const time = `${timePieces[0].padStart(2, "0")}:${(timePieces[1] || "00").padStart(2, "0")}`;
          return { date, time };
        } catch {
          return null;
        }
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let appointmentsCreated = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const val = (idx: number) => (idx >= 0 && idx < row.length ? (row[idx] || "").trim() : "");

        const name = val(nameIdx);
        if (!name) {
          skipped++;
          continue;
        }

        const phoneRaw = val(phoneIdx).replace(/\D/g, "");
        // Strip country code if it's there
        const phone = (phoneRaw.length > 10 && phoneRaw.startsWith("91")) ? phoneRaw.slice(-10) : phoneRaw;
        
        const email = val(emailIdx);
        const address = val(addressIdx);
        const patientType = val(typeIdx);
        const lmp = val(lmpIdx);
        const height = val(heightIdx);
        const bp = val(bpIdx);
        const weightStr = val(weightIdx);
        const ageStr = val(ageIdx);
        const timestamp = val(timestampIdx);
        const items = val(itemsIdx);

        const weight = weightStr ? parseFloat(weightStr.replace(/[^\d.]/g, "")) : undefined;
        const age = ageStr ? parseInt(ageStr.replace(/\D/g, ""), 10) : undefined;
        const parsed = parseTimestamp(timestamp);

        // Fix LMP year: Google Sheets sometimes gives "2/7/0026" for "2/7/26" → fix to 2-digit → 20xx
        const fixLmpYear = (raw: string): string => {
          if (!raw) return raw;
          const parts = raw.split("/");
          if (parts.length === 3) {
            let year = parts[2].replace(/\D/g, "");
            if (year.length <= 2) year = "20" + year.padStart(2, "0");
            else if (year.length === 4 && parseInt(year) < 100) year = "20" + year.slice(-2);
            return `${parts[0]}/${parts[1]}/${year}`;
          }
          return raw;
        };
        const lmpFixed = fixLmpYear(lmp);
        
        let providerId: number | undefined = undefined;
        let appointmentReason = items;

        if (items) {
          // Look for "Dr. Divya", "Dr Divya", "Dr. Priya", etc.
          const drMatch = items.match(/Dr\.?\s*([A-Za-z]+)/i);
          if (drMatch) {
            const drName = drMatch[1].toLowerCase();
            // Map "Divya" to "Sai Dibyadarshini Bhuyan" manually since it's an alias in the sheet
            const provider = existingProviders.find(p => 
              p.name.toLowerCase().includes(drName) || 
              (drName === "divya" && p.name.toLowerCase().includes("sai"))
            );
            if (provider) {
              providerId = provider.id;
            }
          }
        }

        let existingId = phone ? existingByPhone.get(phone) : undefined;
        if (!existingId) {
          existingId = existingByName.get(name.toLowerCase().trim());
        }

        try {
          let patientId: number;

          if (existingId) {
            // Only update fields that have actual values — never blank out existing good data
            const updateData: any = {};
            if (phone) updateData.phone = phone;
            if (email) updateData.email = email;
            if (address) updateData.address = address;
            if (patientType) updateData.type = patientType;
            if (lmpFixed) updateData.lmp = lmpFixed;
            if (height) updateData.height = height;
            if (bp) updateData.bp = bp;
            if (weight && !isNaN(weight)) updateData.weight = weight;
            if (parsed?.date) updateData.lastVisit = parsed.date;
            await storage.updatePatient(existingId, updateData);
            patientId = existingId;
            updated++;
          } else {
            const patient = await storage.createPatient({
              name,
              age: age && !isNaN(age) ? age : 0,
              phone: phone || undefined,
              email: email || undefined,
              address: address || undefined,
              type: patientType || undefined,
              lmp: lmpFixed || undefined,
              height: height || undefined,
              bp: bp || undefined,
              weight: weight && !isNaN(weight) ? weight : undefined,
              lastVisit: parsed?.date || undefined,
              status: "active",
            });
            patientId = patient.id;
            if (phone) existingByPhone.set(phone, patient.id);
            existingByName.set(name.toLowerCase().trim(), patient.id);
            imported++;
            // Send welcome WhatsApp for new patients synced from Google Sheets
            if (phone) {
              whatsapp.sendWelcomeMessage(phone, name).catch(() => {});
            }
            // Auto-score new patient from sheet sync
            scorePatient(patient.id).catch(() => {});
            if (lmpFixed) generateTrimesterChecklist(patient.id).catch(() => {});
          }

          if (parsed) {
            const apptKey = `${patientId}_${parsed.date}_${parsed.time}`;
            if (!appointmentKeys.has(apptKey)) {
              await storage.createAppointment({
                patientId,
                providerId,
                date: parsed.date,
                time: parsed.time,
                type: "Consultation",
                status: "Completed",
                reason: appointmentReason || undefined,
                visitType: patientType || undefined,
                notes: bp ? `BP: ${bp}` : undefined,
                vitals: bp || weight ? { bp: bp || undefined, weight: weight || undefined, height: height || undefined } as any : undefined,
              });
              appointmentKeys.add(apptKey);
              appointmentsCreated++;
            }
          }
        } catch (err: any) {
          errors.push(`Row ${i + 2}: ${name} - ${err.message}`);
        }
      }

      res.json({
        imported,
        updated,
        skipped,
        appointmentsCreated,
        total: dataRows.length,
        errors: errors.slice(0, 10),
        message: `Sync complete: ${imported} new patients, ${updated} updated, ${appointmentsCreated} appointments created`,
      });
    } catch (err: any) {
      console.error("Google Sheets sync error:", err);
      res.status(500).json({ error: "Failed to sync from Google Sheets: " + err.message });
    }
  });

  app.get("/api/google-sheets/status", async (_req, res) => {
    try {
      const sheets = await getUncachableGoogleSheetClient();
      const spreadsheetId = "1mj3hkqjoQFrckIGC9Y0Jjlh6kYIYPHBVuPKAl7k-bxo";
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Form Responses 1'!A:A",
      });
      const rowCount = (response.data.values?.length || 1) - 1;
      res.json({ connected: true, rowCount });
    } catch (err: any) {
      res.json({ connected: false, rowCount: 0, error: err.message });
    }
  });

  app.get("/api/follow-up-calls", async (_req, res) => {
    const calls = await storage.getFollowUpCalls();
    res.json(calls);
  });

  app.post("/api/follow-up-calls", async (req, res) => {
    const call = await storage.createFollowUpCall(req.body);
    res.status(201).json(call);
  });

  app.patch("/api/follow-up-calls/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateFollowUpCall(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/follow-up-calls/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteFollowUpCall(id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });

  app.post("/api/follow-up-calls/import-sheet", async (_req, res) => {
    try {
      const sheets = await getUncachableGoogleSheetClient();
      const spreadsheetId = "1y1siQnidCkQR1b3PcVJWtjleJ6AT4nsx9wCqcT_Bbxs";

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Followup'!A:Q",
      });

      const rows = response.data.values || [];
      if (rows.length < 2) {
        return res.json({ imported: 0, skipped: 0, message: "No data rows found" });
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const colIndex = (name: string) => {
        const idx = headers.findIndex((h: string) => h.toLowerCase().trim().includes(name.toLowerCase()));
        return idx;
      };

      const consultDateIdx = colIndex("consultation date");
      const plannedIdx = colIndex("planned schedule");
      const actualIdx = colIndex("actual date");
      const nameIdx = colIndex("name");
      const lmpIdx = colIndex("lmp");
      const typeIdx = colIndex("patient type");
      const phoneIdx = colIndex("phone");
      const notesIdx = colIndex("notes");
      const feelingIdx = colIndex("how are you feeling");
      const medicineIdx = colIndex("did you get all your medicine");
      const concernIdx = colIndex("let me know if any concern");
      const crossSellIdx = colIndex("cross sell");
      const nextVisitIdx = colIndex("next visit");
      const nextMilestoneIdx = colIndex("next milestone");
      const didntPickIdx = colIndex("didnt pick call time");
      const followUpIdx = colIndex("follow up");
      const followUpDateIdx = colIndex("follow up date");

      const existingPatients = await storage.getPatients();
      const patientByPhone = new Map<string, number>();
      const patientByName = new Map<string, number>();
      for (const p of existingPatients) {
        if (p.phone) patientByPhone.set(p.phone.replace(/\D/g, ""), p.id);
        patientByName.set(p.name.toLowerCase().trim(), p.id);
      }

      const existingCalls = await storage.getFollowUpCalls();
      const existingKeys = new Set(existingCalls.map(c => `${c.patientName?.toLowerCase().trim()}_${c.actualDate || c.plannedDate}`));

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const val = (idx: number) => (idx >= 0 && idx < row.length ? (row[idx] || "").trim() : "");

        const name = val(nameIdx);
        if (!name) { skipped++; continue; }

        const phone = val(phoneIdx).replace(/\D/g, "");
        const actualDate = val(actualIdx);
        const plannedDate = val(plannedIdx);

        const key = `${name.toLowerCase().trim()}_${actualDate || plannedDate}`;
        if (existingKeys.has(key)) { skipped++; continue; }

        let patientId: number | undefined = phone ? patientByPhone.get(phone) : undefined;
        if (!patientId) patientId = patientByName.get(name.toLowerCase().trim());

        try {
          await storage.createFollowUpCall({
            patientId: patientId ?? null,
            patientName: name,
            phone: phone || null,
            patientType: val(typeIdx) || null,
            consultationDate: val(consultDateIdx) || null,
            plannedDate: plannedDate || null,
            actualDate: actualDate || null,
            lmp: val(lmpIdx) || null,
            notes: val(notesIdx) || null,
            feeling: val(feelingIdx) || null,
            gotMedicines: val(medicineIdx) || null,
            concerns: val(concernIdx) || null,
            crossSell: val(crossSellIdx) || null,
            nextVisit: val(nextVisitIdx) || null,
            nextMilestone: val(nextMilestoneIdx) || null,
            didntPickCallTime: val(didntPickIdx) || null,
            followUp: val(followUpIdx) || null,
            followUpDate: val(followUpDateIdx) || null,
            status: val(notesIdx) ? "completed" : "pending",
          });
          existingKeys.add(key);
          imported++;
        } catch (err: any) {
          errors.push(`Row ${i + 2}: ${name} - ${err.message}`);
        }
      }

      res.json({
        imported,
        skipped,
        total: dataRows.length,
        errors: errors.slice(0, 10),
        message: `Imported ${imported} follow-up call records, ${skipped} skipped`,
      });
    } catch (err: any) {
      console.error("Follow-up sheet import error:", err);
      res.status(500).json({ error: "Failed to import follow-up calls: " + err.message });
    }
  });

  app.get("/api/follow-up-calls/sheet-status", async (_req, res) => {
    try {
      const sheets = await getUncachableGoogleSheetClient();
      const spreadsheetId = "1y1siQnidCkQR1b3PcVJWtjleJ6AT4nsx9wCqcT_Bbxs";
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Followup'!A:A",
      });
      const rowCount = (response.data.values?.length || 1) - 1;
      res.json({ connected: true, rowCount });
    } catch (err: any) {
      res.json({ connected: false, rowCount: 0, error: err.message });
    }
  });

  app.post("/api/google-drive/import-lab-reports", async (req, res) => {
    try {
      const autoCreate = req.body?.autoCreatePatients !== false;
      let patients = await storage.getPatients();
      const allDocs = await storage.getAllDocuments();

      const result = await importLabReports(
        patients.map(p => ({ id: p.id, name: p.name })),
        allDocs.map(d => ({ patientId: d.patientId, metadata: d.metadata })),
        (doc) => storage.createDocument(doc)
      );

      if (autoCreate && result.unmatched.length > 0) {
        const uniqueNames = Array.from(new Set(result.unmatched));
        const createdPatients: Array<{ driveName: string; patientId: number; patientName: string }> = [];

        for (const driveName of uniqueNames) {
          const nameParts = driveName.replace(/^(DR|MRS|MR|MS|MISS)\s+/i, '').trim().split(/\s+/);
          const formattedName = nameParts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');

          const newPatient = await storage.createPatient({
            name: formattedName,
            age: 0,
            status: 'active',
          });
          createdPatients.push({ driveName, patientId: newPatient.id, patientName: newPatient.name });
        }

        const updatedPatients = await storage.getPatients();
        const secondResult = await importLabReports(
          updatedPatients.map(p => ({ id: p.id, name: p.name })),
          (await storage.getAllDocuments()).map(d => ({ patientId: d.patientId, metadata: d.metadata })),
          (doc) => storage.createDocument(doc)
        );

        res.json({
          ...secondResult,
          autoCreatedPatients: createdPatients,
          firstPassImported: result.imported,
        });
      } else {
        res.json(result);
      }
    } catch (err: any) {
      console.error("Google Drive import error:", err);
      res.status(500).json({ error: "Failed to import lab reports: " + err.message });
    }
  });

  app.post("/api/patients/:id/extract-lab-results", async (req, res) => {
    try {
      const patientId = parseId(req.params.id);
      if (!patientId) return res.status(400).json({ error: "Invalid ID" });
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const allDocs = await storage.getDocuments(patientId);
      const labDocs = allDocs.filter((d: any) => d.category === 'Lab Report' && d.metadata?.driveFileId);

      if (labDocs.length === 0) {
        return res.json({ extracted: 0, message: "No lab report PDFs found for this patient" });
      }

      const existingResults = await storage.getLabResults(patientId);
      const normalizeTestName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingSet = new Set(
        existingResults.map((lr: any) => `${normalizeTestName(lr.testName || '')}|${lr.date || ''}`)
      );

      let totalExtracted = 0;
      let skippedDuplicates = 0;
      const errors: string[] = [];

      for (const doc of labDocs) {
        const driveFileId = (doc.metadata as any)?.driveFileId;
        if (!driveFileId) continue;

        try {
          const pdfBuffer = await downloadFileAsBuffer(driveFileId);
          const base64Pdf = pdfBuffer.toString('base64');

          if (pdfBuffer.length > 7 * 1024 * 1024) {
            errors.push(`File too large for processing: ${doc.name} (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
            continue;
          }

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: "application/pdf",
                      data: base64Pdf,
                    },
                  },
                  {
                    text: `Extract all lab test results from this medical lab report PDF. Return a JSON array of test results. Each element should have these fields:
- "testName": the name of the test (e.g., "Hemoglobin", "TSH", "Fasting Glucose", "AMH", "Progesterone")
- "value": the numeric value as a number (not string). If no numeric value, use null.
- "unit": the unit of measurement (e.g., "g/dL", "mg/dL", "ng/mL", "mIU/L")
- "status": one of "Normal", "High", "Low", "Critical", or "Borderline" based on the reference range
- "category": the test category (e.g., "Hematology", "Hormone", "Biochemistry", "Thyroid", "Liver Function", "Kidney Function")
- "referenceMin": minimum of reference range as number (or null)
- "referenceMax": maximum of reference range as number (or null)
- "collectedDate": the sample collection date or report date found on the PDF in YYYY-MM-DD format (e.g., "2025-01-15"). Look for fields like "Collected On", "Sample Collection Date", "Report Date", "Date" on the report. If not found, use null.`
                  },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
            },
          });

          const text = response.text || "";
          let parsed: any[];
          try {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(cleaned);
            parsed = Array.isArray(result) ? result : [result];
          } catch {
            errors.push(`Could not parse AI response for ${doc.name}`);
            continue;
          }

          const fallbackDate = doc.date || new Date().toISOString().split('T')[0];

          for (const item of parsed) {
            if (!item.testName) continue;
            const resultDate = item.collectedDate || fallbackDate;
            const dupKey = `${normalizeTestName(item.testName)}|${resultDate}`;
            if (existingSet.has(dupKey)) {
              skippedDuplicates++;
              continue;
            }
            await storage.createLabResult({
              patientId,
              testName: item.testName,
              value: item.value != null ? parseFloat(item.value) : null,
              unit: item.unit || null,
              status: item.status || null,
              category: item.category || null,
              date: resultDate,
              referenceMin: item.referenceMin != null ? parseFloat(item.referenceMin) : null,
              referenceMax: item.referenceMax != null ? parseFloat(item.referenceMax) : null,
              notes: `Extracted from Drive file: ${driveFileId}`,
              results: null,
              labTaskId: null,
            });
            existingSet.add(dupKey);
            totalExtracted++;
          }
        } catch (err: any) {
          console.error(`Error extracting from ${doc.name}:`, err.message);
          errors.push(`Error processing ${doc.name}: ${err.message}`);
        }
      }

      let message = '';
      if (totalExtracted > 0) {
        message = `Extracted ${totalExtracted} new lab result(s)`;
      } else {
        message = "No new results extracted";
      }
      if (skippedDuplicates > 0) {
        message += ` (${skippedDuplicates} duplicate${skippedDuplicates > 1 ? 's' : ''} skipped)`;
      }

      res.json({
        extracted: totalExtracted,
        skippedDuplicates,
        documentsProcessed: labDocs.length,
        errors,
        message,
      });
      // Auto-trigger risk re-score after lab extraction completes
      if (totalExtracted > 0) {
        scorePatient(patientId).catch(() => {});
      }
    } catch (err: any) {
      console.error("Lab extraction error:", err);
      res.status(500).json({ error: "Failed to extract lab results: " + err.message });
    }
  });

  // ── Risk Intelligence Endpoints ──────────────────────────────────────────

  app.post("/api/patients/:id/risk-score", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const patient = await storage.getPatient(id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    const result = await scorePatient(id);
    if (!result) return res.status(500).json({ error: "Risk scoring failed" });
    res.json(result);
  });

  app.post("/api/patients/batch-risk-score", async (req, res) => {
    const patientIds = Array.isArray(req.body?.patientIds) ? req.body.patientIds.map(Number).filter(Boolean) : undefined;
    const result = await batchScorePatients(patientIds);
    res.json(result);
  });

  app.post("/api/patients/:id/trimester-checklist", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const patient = await storage.getPatient(id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    if (!patient.lmp) return res.status(400).json({ error: "LMP not recorded for this patient" });
    const result = await generateTrimesterChecklist(id);
    if (!result) return res.status(500).json({ error: "Checklist generation failed" });
    res.json(result);
  });

  // ── Billing Catalog ───────────────────────────────────────────────────────

  app.get("/api/billing-catalog", async (_req, res) => {
    const catalog = await storage.getBillingCatalog();
    res.json(catalog);
  });

  app.post("/api/billing-catalog", async (req, res) => {
    const item = await storage.createBillingCatalogItem(req.body);
    res.status(201).json(item);
  });

  app.patch("/api/billing-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateBillingCatalogItem(id, req.body);
    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json(updated);
  });

  app.delete("/api/billing-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteBillingCatalogItem(id);
    if (!deleted) return res.status(404).json({ error: "Item not found" });
    res.status(204).send();
  });

  // ── Service Packages ──────────────────────────────────────────────────────
  app.get("/api/service-packages", async (_req, res) => {
    const pkgs = await storage.getServicePackages();
    res.json(pkgs);
  });

  app.get("/api/service-packages/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const pkg = await storage.getServicePackage(id);
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    const items = await storage.getPackageItems(id);
    res.json({ ...pkg, items });
  });

  app.post("/api/service-packages", async (req, res) => {
    const { items, ...pkgData } = req.body;
    const pkg = await storage.createServicePackage({ ...pkgData, createdAt: new Date().toISOString() });
    if (Array.isArray(items) && items.length > 0) {
      await storage.replacePackageItems(pkg.id, items);
    }
    const savedItems = await storage.getPackageItems(pkg.id);
    res.status(201).json({ ...pkg, items: savedItems });
  });

  app.patch("/api/service-packages/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const { items, ...pkgData } = req.body;
    const updated = await storage.updateServicePackage(id, pkgData);
    if (!updated) return res.status(404).json({ error: "Package not found" });
    if (Array.isArray(items)) {
      await storage.replacePackageItems(id, items);
    }
    const savedItems = await storage.getPackageItems(id);
    res.json({ ...updated, items: savedItems });
  });

  app.delete("/api/service-packages/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteServicePackage(id);
    if (!deleted) return res.status(404).json({ error: "Package not found" });
    res.status(204).send();
  });

  app.get("/api/service-packages/:id/items", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const items = await storage.getPackageItems(id);
    res.json(items);
  });

  // Returns the authenticated patient's id from their server-side session, or null.
  function sessionPatientId(req: any): number | null {
    return req.session?.patientId ?? null;
  }
  // Checks that the session belongs to the given patientId; sends 403 and returns false if not.
  function assertPatientSession(req: any, res: any, patientId: number): boolean {
    const sid = sessionPatientId(req);
    if (!sid || sid !== patientId) {
      res.status(403).json({ error: "Forbidden" });
      return false;
    }
    return true;
  }

  app.get("/api/pregnancy-metrics", async (req, res) => {
    const patientId = parseId(req.query.patientId as string);
    if (!patientId) return res.status(400).json({ error: "patientId required" });
    if (!assertPatientSession(req, res, patientId)) return;
    const metrics = await storage.getPregnancyMetrics(patientId);
    res.json(metrics);
  });

  app.post("/api/pregnancy-metrics", async (req, res) => {
    try {
      const { patientId, week, weight, systolic, diastolic, expected } = req.body;
      if (!patientId) return res.status(400).json({ error: "patientId required" });
      if (!assertPatientSession(req, res, parseInt(patientId))) return;
      if (week == null || isNaN(Number(week))) return res.status(400).json({ error: "week is required" });
      const metric = await storage.createPregnancyMetric({
        patientId: parseInt(patientId),
        week: parseInt(week),
        weight: weight != null ? parseFloat(weight) : undefined,
        systolic: systolic != null ? parseInt(systolic) : undefined,
        diastolic: diastolic != null ? parseInt(diastolic) : undefined,
        expected: expected != null ? parseFloat(expected) : undefined,
        enteredBy: "patient",
      });
      res.status(201).json(metric);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/pregnancy-metrics/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    try {
      const existing = await storage.getPregnancyMetricById(id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      if (!existing.patientId || !assertPatientSession(req, res, existing.patientId)) return;
      if (existing.enteredBy !== "patient") {
        return res.status(403).json({ error: "Cannot modify clinician-entered records" });
      }
      const { weight, systolic, diastolic, expected } = req.body;
      const patch: Record<string, any> = {};
      if (weight != null) patch.weight = parseFloat(weight);
      if (systolic != null) patch.systolic = parseInt(systolic);
      if (diastolic != null) patch.diastolic = parseInt(diastolic);
      if (expected != null) patch.expected = parseFloat(expected);
      const updated = await storage.updatePregnancyMetric(id, patch);
      res.json(updated);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.get("/api/water-logs", async (req, res) => {
    const patientId = parseId(req.query.patientId as string);
    if (!patientId) return res.status(400).json({ error: "patientId required" });
    if (!assertPatientSession(req, res, patientId)) return;
    const date = req.query.date as string | undefined;
    const logs = await storage.getWaterLogs(patientId, date);
    res.json(logs);
  });

  app.post("/api/water-logs", async (req, res) => {
    try {
      const { patientId, date, amountMl } = req.body;
      if (!patientId || !date) return res.status(400).json({ error: "patientId and date are required" });
      if (!assertPatientSession(req, res, parseInt(patientId))) return;
      const ml = parseInt(amountMl);
      if (isNaN(ml) || ml < 1 || ml > 5000) return res.status(400).json({ error: "amountMl must be between 1 and 5000" });
      const log = await storage.addWaterLog({ ...req.body, amountMl: ml, patientId: parseInt(patientId) });
      res.status(201).json(log);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/water-logs/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const log = await storage.getWaterLog(id);
    if (!log) return res.status(404).json({ error: "Not found" });
    if (!assertPatientSession(req, res, log.patientId)) return;
    await storage.deleteWaterLog(id);
    res.status(204).send();
  });

  app.get("/api/medication-logs", async (req, res) => {
    const patientId = parseId(req.query.patientId as string);
    if (!patientId) return res.status(400).json({ error: "patientId required" });
    if (!assertPatientSession(req, res, patientId)) return;
    const date = req.query.date as string | undefined;
    const logs = await storage.getMedicationLogs(patientId, date);
    res.json(logs);
  });

  app.post("/api/medication-logs", async (req, res) => {
    try {
      const { patientId, medicationId, takenDate } = req.body;
      if (!patientId || !medicationId || !takenDate) return res.status(400).json({ error: "patientId, medicationId, takenDate required" });
      const pid = parseInt(patientId);
      const mid = parseInt(medicationId);
      if (!assertPatientSession(req, res, pid)) return;
      const patientMeds = await storage.getMedications(pid);
      if (!patientMeds.some((m: any) => m.id === mid)) {
        return res.status(403).json({ error: "Medication does not belong to this patient" });
      }
      const existing = await storage.getMedicationLogs(pid, takenDate);
      if (existing.some((l: any) => l.medicationId === mid)) {
        return res.status(409).json({ error: "Already marked as taken for this date" });
      }
      const log = await storage.addMedicationLog({ ...req.body, patientId: pid, medicationId: mid });
      res.status(201).json(log);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post("/api/medication-logs/unmark", async (req, res) => {
    const { patientId, medicationId, takenDate } = req.body;
    if (!patientId || !medicationId || !takenDate) return res.status(400).json({ error: "patientId, medicationId, takenDate required" });
    if (!assertPatientSession(req, res, parseInt(patientId))) return;
    await storage.deleteMedicationLog(patientId, medicationId, takenDate);
    res.status(204).send();
  });

  app.get("/api/patient-documents", async (req, res) => {
    const patientId = parseId(req.query.patientId as string);
    if (!patientId) return res.status(400).json({ error: "patientId required" });
    if (!assertPatientSession(req, res, patientId)) return;
    const docs = await storage.getPatientDocuments(patientId);
    res.json(docs.map((d: any) => ({ ...d, fileData: undefined })));
  });

  app.get("/api/patient-documents/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const doc = await storage.getPatientDocument(id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (!assertPatientSession(req, res, doc.patientId)) return;
    res.json(doc);
  });

  app.post("/api/patient-documents", async (req, res) => {
    try {
      const { patientId, fileName, fileData, mimeType, docType } = req.body;
      if (!patientId || !fileName) return res.status(400).json({ error: "patientId and fileName required" });
      if (!assertPatientSession(req, res, parseInt(patientId))) return;
      const allowedMime = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "image/heic", "image/heif"];
      if (mimeType && !allowedMime.includes(mimeType)) return res.status(400).json({ error: "Unsupported file type" });
      if (fileData) {
        const sizeBytes = Math.ceil((fileData.length * 3) / 4);
        if (sizeBytes > 5 * 1024 * 1024) return res.status(400).json({ error: "File exceeds 5 MB limit" });
      }
      const allowedDocTypes = ["Diagnostic", "Prescription"];
      if (docType && !allowedDocTypes.includes(docType)) return res.status(400).json({ error: "docType must be Diagnostic or Prescription" });
      const doc = await storage.createPatientDocument({ ...req.body, patientId: parseInt(patientId), uploadedAt: new Date().toISOString() });
      res.status(201).json({ ...doc, fileData: undefined });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/patient-documents/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const doc = await storage.getPatientDocument(id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (!assertPatientSession(req, res, doc.patientId)) return;
    await storage.deletePatientDocument(id);
    res.status(204).send();
  });

  app.get("/api/medicine-catalog", async (_req, res) => {
    const catalog = await storage.getMedicineCatalog();
    res.json(catalog);
  });

  app.post("/api/medicine-catalog", async (req, res) => {
    const entry = await storage.createMedicineCatalogEntry(req.body);
    res.status(201).json(entry);
  });

  app.patch("/api/medicine-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateMedicineCatalogEntry(id, req.body);
    if (!updated) return res.status(404).json({ error: "Medicine not found" });
    res.json(updated);
  });

  app.delete("/api/medicine-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteMedicineCatalogEntry(id);
    if (!deleted) return res.status(404).json({ error: "Medicine not found" });
    res.status(204).send();
  });

  app.post("/api/patients/:id/extract-prescription", async (req, res) => {
    try {
      const patientId = parseId(req.params.id);
      if (!patientId) return res.status(400).json({ error: "Invalid ID" });
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const { fileData, mimeType, fileName } = req.body;
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "Missing fileData or mimeType" });
      }

      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedMimes.includes(mimeType)) {
        return res.status(400).json({ error: "Unsupported file type. Please upload a PDF or image (JPEG, PNG)." });
      }

      const fileSizeBytes = Buffer.byteLength(fileData, 'base64');
      if (fileSizeBytes > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 10 MB." });
      }

      const catalogEntries = await storage.getMedicineCatalog();
      let catalogHint = '';
      if (catalogEntries.length > 0) {
        const catalogList = catalogEntries.map(m =>
          `${m.name}${m.genericName ? ` (${m.genericName})` : ''}${m.defaultDose ? ` — ${m.defaultDose}` : ''}${m.defaultFrequency ? `, ${m.defaultFrequency}` : ''}`
        ).join('\n');
        catalogHint = `\n\nIMPORTANT — This clinic commonly prescribes the following medicines. When the handwriting is ambiguous, prefer matching to one of these known medicines:\n${catalogList}\n\nUse the exact name from this list when there is a match. If a medicine is not in this list, still extract it with your best reading.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: fileData,
                },
              },
              {
                text: `Extract all prescribed medications from this prescription document (image or PDF). Return a JSON array of medications. Each element should have these fields:
- "name": the medication/drug name (e.g., "Folic Acid", "Progesterone", "Metformin", "Letrozole")
- "dose": the dosage (e.g., "5 mg", "200 mg", "500 mg", "2.5 mg")
- "frequency": how often to take it (e.g., "Once daily", "Twice daily", "Three times a day", "At bedtime")
- "route": route of administration (e.g., "Oral", "Vaginal", "Subcutaneous", "Intramuscular", "Topical"). Default to "Oral" if not specified.
- "startDate": the prescription date or start date found on the document in YYYY-MM-DD format. If not found, use null.
- "duration": duration mentioned (e.g., "30 days", "2 weeks", "until next visit"). If not found, use null.
- "notes": any additional instructions (e.g., "Take with food", "Empty stomach", "After meals"). If none, use null.

Be thorough — extract every medication mentioned including supplements and vitamins. If the prescription is handwritten, do your best to read it.${catalogHint}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      let parsed: any[];
      try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(cleaned);
        parsed = Array.isArray(result) ? result : [result];
      } catch {
        return res.status(422).json({ error: "Could not parse AI response", raw: text });
      }

      const existingMeds = await storage.getMedications(patientId);
      const normalizeName = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingSet = new Set(
        existingMeds.map((m: any) => `${normalizeName(m.name)}|${m.dose || ''}`)
      );

      let inserted = 0;
      let skipped = 0;
      const today = new Date().toISOString().split('T')[0];

      for (const item of parsed) {
        if (!item.name) continue;

        const dupKey = `${normalizeName(item.name)}|${item.dose || ''}`;
        if (existingSet.has(dupKey)) {
          skipped++;
          continue;
        }

        await storage.createMedication({
          patientId,
          name: item.name,
          dose: item.dose || null,
          frequency: item.frequency || null,
          route: item.route || "Oral",
          startDate: item.startDate || today,
          endDate: null,
          prescribedBy: null,
          status: "Active",
          notes: [item.notes, item.duration ? `Duration: ${item.duration}` : null].filter(Boolean).join('. ') || null,
        });
        existingSet.add(dupKey);
        inserted++;
      }

      await storage.createDocument({
        patientId,
        name: fileName || 'Prescription',
        type: 'prescription',
        category: 'Prescription',
        date: today,
        description: `AI-extracted prescription: ${inserted} medication(s) found`,
        metadata: { extractedMeds: inserted, skippedDuplicates: skipped, uploadedAt: new Date().toISOString() },
      });

      let message = '';
      if (inserted > 0) {
        message = `Extracted ${inserted} medication(s) from prescription`;
      } else {
        message = "No new medications extracted";
      }
      if (skipped > 0) {
        message += ` (${skipped} duplicate${skipped > 1 ? 's' : ''} skipped)`;
      }

      res.json({ inserted, skipped, total: parsed.length, message });
    } catch (err: any) {
      console.error("Prescription extraction error:", err);
      res.status(500).json({ error: "Failed to extract prescription: " + err.message });
    }
  });

  app.get("/api/google-drive/status", async (_req, res) => {
    try {
      const files = await listLabReportFiles();
      const allDocs = await storage.getAllDocuments();
      const importedDriveIds = new Set<string>();
      for (const doc of allDocs) {
        if (doc.metadata && typeof doc.metadata === 'object' && (doc.metadata as any).driveFileId) {
          importedDriveIds.add((doc.metadata as any).driveFileId);
        }
      }
      const testReports = files.filter(f => f.name.startsWith('TestReport_'));
      const alreadyImported = testReports.filter(f => importedDriveIds.has(f.id)).length;

      res.json({
        connected: true,
        totalFiles: files.length,
        testReports: testReports.length,
        alreadyImported,
        pendingImport: testReports.length - alreadyImported,
      });
    } catch (err: any) {
      res.json({ connected: false, totalFiles: 0, error: err.message });
    }
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const patients = await storage.getPatients();
      const allAppointments = await storage.getAppointments();
      const todayAppointments = allAppointments.filter((a: any) => a.date === today);
      const allDocuments = await storage.getAllDocuments();
      const allClinicalNotes = await storage.getAllClinicalNotes();
      const allVisitHistory = await storage.getAllVisitHistory();
      const nutritionPlans = await storage.getNutritionPlans();
      const labTasks = await storage.getLabTasks();

      const fertilityTypes = ['fertility', 'ttc', 'iui', 'ivf', 'natural_conception', 'iui cycle', 'pcos'];
      const pregnancyTypes = ['pregnancy', 'pregnant', 'antenatal'];
      const postpartumTypes = ['postpartum', 'postnatal'];

      const fertilityCount = patients.filter((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t))).length;

      const allPregnancyTypePatients = patients.filter((p: any) => pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t)));
      const pregnancyCount = allPregnancyTypePatients.filter((p: any) => {
        const ps = (p.pregnancyStatus || '').toLowerCase();
        if (['completed', 'aborted', 'not_continuing'].includes(ps)) return false;
        if (!p.lmp) return true;
        const lmpDate = new Date(p.lmp);
        if (isNaN(lmpDate.getTime())) return true;
        const weeks = Math.floor((Date.now() - lmpDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return weeks >= 1 && weeks <= 42;
      }).length;

      const postpartumCount = patients.filter((p: any) => postpartumTypes.some(t => (p.type || '').toLowerCase().includes(t))).length;

      const allReferrals: any[] = [];
      for (const p of patients.slice(0, 100)) {
        try {
          const refs = await storage.getReferrals(p.id);
          allReferrals.push(...refs);
        } catch { }
      }
      const referralsIn = allReferrals.filter((r: any) => (r.direction || '').toLowerCase() === 'in' || (r.type || '').toLowerCase().includes('incoming')).length;
      const referralsOut = allReferrals.filter((r: any) => (r.direction || '').toLowerCase() === 'out' || (r.type || '').toLowerCase().includes('outgoing')).length;

      const highRiskPatients = patients.filter((p: any) => {
        const risk = (p.riskLevel || p.risk || '').toLowerCase();
        const type = (p.type || '').toLowerCase();
        return risk.includes('high') || type.includes('high risk');
      });

      const todayLabReports = allDocuments.filter((d: any) => d.category === 'Lab Report' && d.date === today).length;
      const recentLabReports = allDocuments.filter((d: any) => d.category === 'Lab Report').length;

      const todayNotes = allClinicalNotes.filter((n: any) => {
        const noteDate = n.date || (n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : '');
        return noteDate === today;
      }).length;

      const recentNutritionUpdates = nutritionPlans.length;

      const todayVisits = allVisitHistory.filter((v: any) => v.date === today).length;

      const pregnantPatients = allPregnancyTypePatients.filter((p: any) => {
        const ps = (p.pregnancyStatus || '').toLowerCase();
        if (['completed', 'aborted', 'not_continuing'].includes(ps)) return false;
        if (!p.lmp) return true;
        const lmpDate = new Date(p.lmp);
        if (isNaN(lmpDate.getTime())) return true;
        const weeks = Math.floor((Date.now() - lmpDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return weeks >= 1 && weeks <= 42;
      });
      const highBpAlerts = pregnantPatients.filter((p: any) => {
        const bp = (p.bp || '').toString().trim();
        if (!bp || !bp.includes('/')) return false;
        const systolic = parseInt(bp.split('/')[0], 10);
        return !isNaN(systolic) && systolic >= 140;
      }).length;
      const lowHbCases = pregnantPatients.filter((p: any) => {
        const hb = parseFloat(p.hb);
        return !isNaN(hb) && hb > 0 && hb < 10;
      }).length;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthAppointments = allAppointments.filter((a: any) => {
        const d = new Date(a.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const priorityPatients = [];
      const todayPatientIds = todayAppointments.map((a: any) => a.patientId);
      const todayPatients = patients.filter((p: any) => todayPatientIds.includes(p.id));

      const fertilityTodayPatients = todayPatients.filter((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t)));
      const pregnancyTodayPatients = todayPatients.filter((p: any) => pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t)));
      const postpartumTodayPatients = todayPatients.filter((p: any) => postpartumTypes.some(t => (p.type || '').toLowerCase().includes(t)));

      if (fertilityTodayPatients.length > 0) priorityPatients.push({ ...fertilityTodayPatients[0], priorityType: 'fertility', priorityLevel: 'action' });
      else if (patients.filter((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t))).length > 0) {
        const fp = patients.find((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t)));
        if (fp) priorityPatients.push({ ...fp, priorityType: 'fertility', priorityLevel: 'action' });
      }

      if (pregnancyTodayPatients.length > 0) priorityPatients.push({ ...pregnancyTodayPatients[0], priorityType: 'pregnancy', priorityLevel: 'review' });
      else if (pregnantPatients.length > 0) priorityPatients.push({ ...pregnantPatients[0], priorityType: 'pregnancy', priorityLevel: 'review' });

      if (postpartumTodayPatients.length > 0) priorityPatients.push({ ...postpartumTodayPatients[0], priorityType: 'postpartum', priorityLevel: 'alert' });
      else {
        const pp = patients.find((p: any) => postpartumTypes.some(t => (p.type || '').toLowerCase().includes(t)));
        if (pp) priorityPatients.push({ ...pp, priorityType: 'postpartum', priorityLevel: 'alert' });
      }

      const usgReferralPatients = todayPatients.slice(0, 5).map((p: any) => {
        const type = (p.type || '').toLowerCase();
        let usgType = 'General USG';
        if (fertilityTypes.some(t => type.includes(t))) usgType = 'Follicular Study';
        else if (pregnancyTypes.some(t => type.includes(t))) {
          if (p.lmp) {
            const weeks = Math.floor((Date.now() - new Date(p.lmp).getTime()) / (7 * 24 * 60 * 60 * 1000));
            if (weeks <= 10) usgType = 'Early Pregnancy Scan';
            else if (weeks <= 14) usgType = 'NT Scan';
            else if (weeks <= 22) usgType = 'Anomaly Scan';
            else usgType = 'Growth Scan';
          } else usgType = 'Pregnancy Scan';
        }
        return { id: p.id, name: p.name, usgType, type: p.type };
      });

      const pendingLabTasks = labTasks.filter((t: any) => (t.status || '').toLowerCase() !== 'completed').length;

      res.json({
        today,
        todayAppointments: todayAppointments.length,
        totalPatients: patients.length,
        fertilityActive: fertilityCount,
        pregnancyFollowups: pregnancyCount,
        postpartumActive: postpartumCount,
        referralsIn,
        referralsOut: referralsOut || allReferrals.length,
        totalReferrals: allReferrals.length,
        highRiskAlerts: highRiskPatients.length,
        highRiskPatients: highRiskPatients.slice(0, 5).map((p: any) => ({ id: p.id, name: p.name, type: p.type })),
        priorityPatients,
        usgReferralPatients,
        thisMonthPregnancies: pregnancyCount,
        pendingLabTasks,
        teamActivity: {
          clinicalNotes: todayNotes,
          nutritionPlans: recentNutritionUpdates,
          labReportsToday: todayLabReports,
          labReportsTotal: recentLabReports,
          visitsToday: todayVisits,
        },
        clinicInsights: {
          pregnanciesThisMonth: pregnancyCount,
          highBpAlerts,
          lowHbCases,
        },
      });
    } catch (err: any) {
      console.error("Dashboard stats error:", err);
      res.status(500).json({ error: "Failed to fetch dashboard stats: " + err.message });
    }
  });

  app.get("/api/patients/by-category/:category", async (req: any, res: any) => {
    try {
      const { category } = req.params;
      const patients = await storage.getPatients();
      const allAppointments = await storage.getAppointments();
      const today = new Date().toISOString().split('T')[0];

      const fertilityTypes = ['fertility', 'ttc', 'iui', 'ivf', 'natural_conception', 'iui cycle', 'pcos'];
      const pregnancyTypes = ['pregnancy', 'pregnant', 'antenatal'];
      const postpartumTypes = ['postpartum', 'postnatal'];

      const calcWeeks = (lmp: string | null | undefined) => {
        if (!lmp) return null;
        const d = new Date(lmp);
        if (isNaN(d.getTime())) return null;
        return Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
      };

      let filtered: any[] = [];
      let title = '';

      switch (category) {
        case 'fertility':
          title = 'Fertility Active Patients';
          filtered = patients.filter((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t)));
          break;
        case 'pregnancy':
          title = 'Active Pregnancy Follow-ups';
          filtered = patients.filter((p: any) => {
            if (!pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t))) return false;
            const ps = (p.pregnancyStatus || '').toLowerCase();
            if (['completed', 'aborted', 'not_continuing'].includes(ps)) return false;
            const weeks = calcWeeks(p.lmp);
            if (weeks === null) return true;
            return weeks >= 1 && weeks <= 42;
          });
          break;
        case 'pregnancy-all':
          title = 'All Pregnancy Patients';
          filtered = patients.filter((p: any) => pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t)));
          break;
        case 'postpartum':
          title = 'Postpartum Active Patients';
          filtered = patients.filter((p: any) => postpartumTypes.some(t => (p.type || '').toLowerCase().includes(t)));
          break;
        case 'high-risk':
          title = 'High Risk Patients';
          filtered = patients.filter((p: any) => {
            const risk = (p.riskLevel || p.risk || '').toLowerCase();
            const type = (p.type || '').toLowerCase();
            return risk.includes('high') || type.includes('high risk');
          });
          break;
        case 'today-appointments':
          title = "Today's Appointments";
          const todayAppts = allAppointments.filter((a: any) => a.date === today);
          const patientIds = todayAppts.map((a: any) => a.patientId);
          filtered = patients.filter((p: any) => patientIds.includes(p.id)).map((p: any) => {
            const appt = todayAppts.find((a: any) => a.patientId === p.id);
            return { ...p, appointmentTime: appt?.time, appointmentType: appt?.type };
          });
          break;
        case 'referrals':
          title = 'Patients with Referrals';
          const refPatients: any[] = [];
          for (const p of patients.slice(0, 200)) {
            try {
              const refs = await storage.getReferrals(p.id);
              if (refs.length > 0) refPatients.push({ ...p, referralCount: refs.length });
            } catch { }
          }
          filtered = refPatients;
          break;
        case 'high-bp':
          title = 'High BP Alert Patients';
          filtered = patients.filter((p: any) => {
            if (!pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t))) return false;
            const ps = (p.pregnancyStatus || '').toLowerCase();
            if (['completed', 'aborted', 'not_continuing'].includes(ps)) return false;
            const weeks = calcWeeks(p.lmp);
            if (weeks !== null && (weeks < 1 || weeks > 42)) return false;
            const bp = (p.bp || '').toString().trim();
            if (!bp || !bp.includes('/')) return false;
            const systolic = parseInt(bp.split('/')[0], 10);
            return !isNaN(systolic) && systolic >= 140;
          });
          break;
        default:
          title = 'All Patients';
          filtered = patients;
      }

      const result = filtered.map((p: any) => {
        const weeks = calcWeeks(p.lmp);
        return {
          id: p.id,
          name: p.name,
          age: p.age,
          type: p.type,
          phone: p.phone,
          email: p.email,
          lmp: p.lmp,
          bp: p.bp,
          gestationalWeeks: weeks,
          pregnancyStatus: p.pregnancyStatus || (weeks !== null && weeks > 42 ? 'completed' : weeks !== null ? 'active' : null),
          riskLevel: p.riskLevel || p.risk,
          appointmentTime: p.appointmentTime,
          appointmentType: p.appointmentType,
          referralCount: p.referralCount,
        };
      });

      res.json({ title, category, count: result.length, patients: result });
    } catch (err: any) {
      console.error("Patient category error:", err);
      res.status(500).json({ error: "Failed to fetch patients: " + err.message });
    }
  });

  app.patch("/api/patients/:id/pregnancy-status", async (req: any, res: any) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const { pregnancyStatus } = req.body;
      const validStatuses = ['active', 'completed', 'aborted', 'not_continuing'];
      if (!validStatuses.includes(pregnancyStatus)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      const patient = await storage.getPatient(id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const updated = await storage.updatePatient(id, { pregnancyStatus });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/patients/:id/prime-member", async (req: any, res: any) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const { isPrimeMember } = req.body;
      const patient = await storage.getPatient(id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const updateData: any = { isPrimeMember: !!isPrimeMember };
      if (isPrimeMember && !patient.isPrimeMember) {
        updateData.primeMemberSince = new Date().toISOString().split("T")[0];
      }
      if (!isPrimeMember) {
        updateData.primeMemberSince = null;
      }
      const updated = await storage.updatePatient(id, updateData);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/prime-members", async (req: any, res: any) => {
    try {
      const allPatients = await storage.getPatients();
      const primeMembers = allPatients.filter(p => p.isPrimeMember);
      res.json(primeMembers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/owner/attendance", async (req: any, res: any) => {
    try {
      const { startDate, endDate } = req.query;
      const records = await storage.getAttendance(startDate, endDate);
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/owner/attendance", async (req: any, res: any) => {
    try {
      const record = await storage.createAttendance(req.body);
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/owner/expenses", async (req: any, res: any) => {
    try {
      const { startDate, endDate } = req.query;
      const records = await storage.getExpenses(startDate, endDate);
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/owner/expenses", async (req: any, res: any) => {
    try {
      const record = await storage.createExpense(req.body);
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/owner/dashboard", async (req: any, res: any) => {
    try {
      const allPatients = await storage.getPatients();
      const allAppointments = await storage.getAppointments();
      const allInvoices = await storage.getAllInvoices();
      const allExpenses = await storage.getExpenses();
      const allAttendance = await storage.getAttendance();
      const allLabResults = await storage.getAllDocuments();

      const today = new Date().toISOString().split("T")[0];
      const todayAttendance = allAttendance.filter(a => a.date === today);
      const presentToday = todayAttendance.filter(a => a.status === "present" || a.status === "half-day").length;
      const totalStaff = new Set(allAttendance.map(a => a.employeeName)).size;

      const totalRevenue = allInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalExpensesAmt = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthlyRevenue = allInvoices.filter(inv => inv.date?.startsWith(thisMonth)).reduce((sum, inv) => sum + (inv.total || 0), 0);
      const monthlyExpenses = allExpenses.filter(exp => exp.date?.startsWith(thisMonth)).reduce((sum, exp) => sum + (exp.amount || 0), 0);

      const todayAppointments = allAppointments.filter(a => a.date === today);

      res.json({
        totalPatients: allPatients.length,
        totalStaff,
        presentToday,
        absentToday: totalStaff - presentToday,
        totalRevenue,
        totalExpenses: totalExpensesAmt,
        monthlyRevenue,
        monthlyExpenses,
        netProfit: monthlyRevenue - monthlyExpenses,
        todayAppointments: todayAppointments.length,
        totalAppointments: allAppointments.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── PHASE 3: AI-AUGMENTED WORKFORCE ─────────────────────────────────────

  // 1. AI Triage Queue — sorted appointment list with urgency reason
  app.get("/api/appointments/triage", async (req: any, res: any) => {
    try {
      const { date } = req.query;
      const today = date || new Date().toISOString().split("T")[0];
      const appts = await storage.getAppointmentsByDate(today);
      const allPatients = await storage.getPatients();
      const allVisits = await storage.getAllVisitHistory();

      interface TriageRow {
        appointmentId: number;
        patientId: number;
        patientName: string;
        patientType: string | null;
        time: string;
        date: string;
        status: string | null;
        visitMode: string | null;
        riskLevel: string;
        riskScore: number;
        triageScore: number;
        triageReason: string;
        daysSinceVisit: number | null;
        gestWeeks: number | null;
      }

      const enriched: TriageRow[] = [];
      for (const a of appts.filter(a => a.status !== "cancelled" && a.status !== "Cancelled")) {
        const patient = allPatients.find(p => p.id === a.patientId);
        if (!patient) continue;

        const riskScore = (patient as any).riskScore as { level?: string; score?: number; factors?: { factor: string }[] } | undefined;
        const riskLevel = riskScore?.level || "Low";
        const riskNum = riskScore?.score || 0;

        // Days since last visit
        const patientVisits = allVisits.filter(v => v.patientId === patient.id);
        const lastVisitDate = patientVisits.length > 0
          ? patientVisits.sort((x, y) => y.date.localeCompare(x.date))[0].date
          : null;
        const daysSinceVisit = lastVisitDate
          ? Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Gestational week if pregnant
        const lmpDate = patient.lmp ? new Date(patient.lmp) : null;
        const gestWeeks = lmpDate
          ? Math.floor((Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
          : null;

        // Triage score: risk (0-100) + overdue bonus + trimester urgency
        let triageScore = riskNum;
        if (daysSinceVisit > 30) triageScore += 20;
        if (daysSinceVisit > 60) triageScore += 10;
        if (gestWeeks !== null && (gestWeeks >= 36 || gestWeeks <= 10)) triageScore += 15;

        // One-line triage reason
        const reasons: string[] = [];
        if (riskLevel === "Critical" || riskLevel === "High") reasons.push(`${riskLevel} risk`);
        if (daysSinceVisit > 30) reasons.push(`${daysSinceVisit}d since last visit`);
        if (gestWeeks !== null) reasons.push(`${gestWeeks}w pregnant`);
        if (patient.bp) {
          const sys = parseInt((patient.bp || "").split("/")[0]);
          if (!isNaN(sys) && sys >= 140) reasons.push("BP elevated");
        }
        if (riskScore?.factors?.[0]?.factor) reasons.push(riskScore.factors[0].factor);

        enriched.push({
          appointmentId: a.id,
          patientId: patient.id,
          patientName: patient.name,
          patientType: patient.type ?? null,
          time: a.time,
          date: a.date,
          status: a.status ?? null,
          visitMode: a.visitMode ?? null,
          riskLevel,
          riskScore: riskNum,
          triageScore,
          triageReason: reasons.slice(0, 2).join(", ") || "Routine visit",
          daysSinceVisit: daysSinceVisit === 999 ? null : daysSinceVisit,
          gestWeeks,
        });
      }
      enriched.sort((a, b) => b.triageScore - a.triageScore);

      appendAuditLog({
        event: "triage_run",
        date: today,
        appointmentCount: enriched.length,
        topPatient: enriched[0]?.patientName ?? null,
        topScore: enriched[0]?.triageScore ?? null,
      });

      // Stamp triage scores onto appointment records for retrospective querying
      const now = new Date().toISOString();
      const stampResults = await Promise.allSettled(
        enriched.map(item =>
          storage.updateAppointment(item.appointmentId, {
            triageScore: item.triageScore,
            triageReason: item.triageReason,
            triageScoredAt: now,
          })
        )
      );
      stampResults.forEach((result, i) => {
        if (result.status === "rejected") {
          console.error(`[triage] Failed to stamp score for appt ${enriched[i]?.appointmentId}:`, result.reason?.message);
        }
      });

      res.json({ date: today, count: enriched.length, appointments: enriched });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Voice-to-SOAP transcription — accept base64 audio, return structured SOAP
  app.post("/api/voice/soap-transcribe", async (req: any, res: any) => {
    try {
      const { audioData, mimeType, patientContext, patientId } = req.body;
      if (!audioData) return res.status(400).json({ error: "audioData is required" });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "audio/webm",
                  data: audioData,
                },
              },
              {
                text: `You are a medical transcription AI for a women's reproductive health clinic in India. Transcribe and structure this voice recording into a SOAP note.${patientContext ? `\n\nPatient context: ${patientContext}` : ""}

Return a JSON object with exactly these fields (use empty string if not mentioned):
{
  "subjective": "Patient's symptoms, complaints, and history as described",
  "objective": "Examination findings, vitals, observations mentioned",
  "assessment": "Clinical assessment, diagnosis, or impression",
  "plan": "Treatment plan, medications, follow-up instructions",
  "rawTranscript": "Full verbatim transcript of the recording"
}

Be concise and clinically accurate. Convert spoken language to structured clinical notes.`,
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Save SOAP draft as a permanent clinical note on the patient record
      if (patientId) {
        const pid = parseInt(patientId);
        if (!isNaN(pid)) {
          storage.createClinicalNote({
            patientId: pid,
            date: new Date().toISOString().split("T")[0],
            type: "voice_soap",
            title: "Voice SOAP Draft",
            content: `Subjective: ${parsed.subjective || ""}\n\nObjective: ${parsed.objective || ""}\n\nAssessment: ${parsed.assessment || ""}\n\nPlan: ${parsed.plan || ""}`,
            tags: ["voice", "soap-draft"],
            isPrivate: 0,
          }).catch((e: any) => console.error("[voice-soap] ClinicalNote save failed:", e.message));
        }
      }

      res.json({ success: true, soap: parsed });
    } catch (err: any) {
      console.error("[voice-soap] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Post-visit WhatsApp summary
  app.post("/api/appointments/:id/post-visit-summary", async (req: any, res: any) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });

      const appt = await storage.getAppointments().then(all => all.find(a => a.id === id));
      if (!appt) return res.status(404).json({ error: "Appointment not found" });

      const patient = appt.patientId ? await storage.getPatient(appt.patientId) : null;
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const visits = await storage.getVisitHistory(patient.id);
      const latestVisit = visits.sort((a, b) => b.date.localeCompare(a.date))[0];
      const meds = await storage.getMedications(patient.id);
      const activeMeds = meds.filter(m => m.status === "active" || m.status === "Active" || !m.status);

      // Generate plain-language summary using Gemini
      const summaryResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate a warm, friendly post-visit WhatsApp summary for a patient visiting a women's reproductive health clinic.

Patient: ${patient.name}, Age: ${patient.age}
Today's visit diagnosis/assessment: ${latestVisit?.diagnosis || latestVisit?.assessment || "General consultation"}
Plan notes: ${latestVisit?.planNotes || ""}
Active medications: ${activeMeds.slice(0, 5).map(m => `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` (${m.frequency})` : ""}`).join(", ") || "None prescribed"}
Next appointment: ${patient.nextReview || "To be scheduled"}

Write a WhatsApp message (not too long, max 180 words) in a warm, supportive tone. Include:
1. A brief summary of today's visit
2. Key medications to take (if any)
3. Important instructions or things to watch for
4. Next steps / follow-up

Use simple, non-clinical language. End with "_Saivie Reproductive Intelligence_". Use WhatsApp formatting (bold with *text*).`,
              },
            ],
          },
        ],
      });

      const summaryText = summaryResponse.text || "";

      if (patient.phone) {
        await whatsapp.sendTextMessage(patient.phone, summaryText);
      }

      // Save post-visit summary as a permanent clinical note on the patient record
      await storage.createClinicalNote({
        patientId: patient.id,
        appointmentId: id,
        date: new Date().toISOString().split("T")[0],
        type: "visit_summary",
        title: "Post-Visit WhatsApp Summary",
        content: summaryText,
        tags: ["whatsapp", "post-visit-summary"],
        isPrivate: 0,
      });

      res.json({
        success: true,
        patientName: patient.name,
        phone: patient.phone || null,
        message: summaryText,
        sent: !!patient.phone,
      });
    } catch (err: any) {
      console.error("[post-visit-summary] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. AI Schedule Optimisation
  app.post("/api/appointments/optimise-schedule", async (req: any, res: any) => {
    try {
      const { date } = req.body;
      const targetDate = date || new Date().toISOString().split("T")[0];
      const appts = await storage.getAppointmentsByDate(targetDate);
      const allPatients = await storage.getPatients();

      const enriched = appts
        .filter(a => a.status !== "cancelled" && a.status !== "Cancelled")
        .map(a => {
          const patient = allPatients.find(p => p.id === a.patientId);
          return {
            id: a.id,
            time: a.time,
            endTime: a.endTime,
            duration: a.duration || 30,
            patientName: patient?.name || "Unknown",
            patientType: patient?.type || "",
            visitMode: a.visitMode,
            status: a.status,
            riskScore: (patient as any)?.riskScore?.score || 0,
            riskLevel: (patient as any)?.riskScore?.level || "Low",
          };
        });

      if (enriched.length === 0) {
        // Still persist the run so the owner can see it was attempted
        await storage.createScheduleOptimisation({
          date: targetDate,
          suggestions: [],
          summary: "No appointments found for this date.",
          estimatedTimeSaved: null,
          totalAppointments: 0,
          suggestionsCount: 0,
          createdAt: new Date().toISOString(),
        });
        appendAuditLog({ event: "schedule_optimised", date: targetDate, totalAppointments: 0, suggestionsCount: 0 });
        return res.json({ date: targetDate, suggestions: [], message: "No appointments to optimise." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a clinic scheduling optimisation AI. Analyse these appointments and suggest an optimised schedule.

Date: ${targetDate}
Appointments:
${JSON.stringify(enriched, null, 2)}

Optimisation goals:
1. High/Critical risk patients should be seen earlier in the day
2. Telemedicine slots should be grouped to minimise context switching
3. Longer consultations (30+ min) should not be scheduled back-to-back without a buffer
4. Patients who haven't visited in >30 days should be prioritised

Return a JSON object:
{
  "suggestions": [
    {
      "appointmentId": number,
      "currentTime": "HH:MM",
      "suggestedTime": "HH:MM",
      "reason": "brief reason for change"
    }
  ],
  "summary": "2-3 sentence plain English summary of the optimisation recommendations",
  "estimatedTimeSaved": "e.g. 45 minutes of idle time eliminated"
}

Only include appointments that should move. If schedule is already optimal, return empty suggestions array with a positive summary.`,
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      appendAuditLog({
        event: "schedule_optimised",
        date: targetDate,
        totalAppointments: enriched.length,
        suggestionsCount: parsed.suggestions?.length || 0,
        estimatedTimeSaved: parsed.estimatedTimeSaved || null,
        summary: parsed.summary || null,
      });

      // Persist to DB for retrospective owner queries (awaited so failures surface)
      await storage.createScheduleOptimisation({
        date: targetDate,
        suggestions: parsed.suggestions || [],
        summary: parsed.summary || null,
        estimatedTimeSaved: parsed.estimatedTimeSaved || null,
        totalAppointments: enriched.length,
        suggestionsCount: parsed.suggestions?.length || 0,
        createdAt: new Date().toISOString(),
      });

      res.json({ date: targetDate, ...parsed, totalAppointments: enriched.length });
    } catch (err: any) {
      console.error("[optimise-schedule] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 5a. AI Audit Log — returns all logged AI events newest-first
  app.get("/api/owner/audit-log", (_req: any, res: any) => {
    const entries = readAuditLog(200);
    res.json({ entries, count: entries.length });
  });

  // 5b. Schedule Optimisation History — DB-backed, newest-first
  app.get("/api/owner/optimisation-history", async (_req: any, res: any) => {
    try {
      const records = await storage.getScheduleOptimisations(100);
      res.json({ records, count: records.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Owner AI Weekly Insights
  app.post("/api/owner/ai-insights", async (req: any, res: any) => {
    try {
      const allPatients = await storage.getPatients();
      const allAppointments = await storage.getAppointments();
      const allInvoices = await storage.getAllInvoices();
      const allExpenses = await storage.getExpenses();
      const allAttendance = await storage.getAttendance();

      const today = new Date();
      const thisMonth = today.toISOString().slice(0, 7);
      const thisWeekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const monthlyRevenue = allInvoices.filter(i => i.date?.startsWith(thisMonth)).reduce((s, i) => s + (i.total || 0), 0);
      const monthlyExpenses = allExpenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + (e.amount || 0), 0);
      const weeklyAppts = allAppointments.filter(a => a.date >= thisWeekStart);

      // Diagnosis frequency from all visits
      const allVisits = await storage.getAllVisitHistory();
      const diagnosisCounts: Record<string, number> = {};
      allVisits.filter(v => v.date >= thisWeekStart).forEach(v => {
        const diag = v.diagnosis || v.assessment;
        if (diag) {
          const key = diag.toLowerCase().slice(0, 40);
          diagnosisCounts[key] = (diagnosisCounts[key] || 0) + 1;
        }
      });
      const topDiagnoses = Object.entries(diagnosisCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([d, count]) => `${d} (${count}x)`);

      // Staff utilisation
      const presentDays = allAttendance.filter(a => a.date >= thisWeekStart && a.status === "present").length;
      const totalStaff = new Set(allAttendance.map(a => a.employeeName)).size;

      // High-risk patients
      const highRiskCount = allPatients.filter((p: any) => p.riskScore?.level === "High" || p.riskScore?.level === "Critical").length;

      const context = {
        reportPeriod: `${thisWeekStart} to ${today.toISOString().split("T")[0]}`,
        totalPatients: allPatients.length,
        newPatientsThisMonth: allPatients.filter((p: any) => p.lastVisit?.startsWith(thisMonth)).length,
        weeklyAppointments: weeklyAppts.length,
        completedThisWeek: weeklyAppts.filter(a => a.status === "Completed" || a.status === "completed").length,
        monthlyRevenue,
        monthlyExpenses,
        netProfit: monthlyRevenue - monthlyExpenses,
        topDiagnoses,
        staffUtilisationThisWeek: totalStaff > 0 ? Math.round((presentDays / (totalStaff * 5)) * 100) : 0,
        highRiskPatientCount: highRiskCount,
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a clinic business intelligence AI. Generate a concise weekly insights report for the clinic owner of a women's reproductive health clinic in India.

Clinic Data:
${JSON.stringify(context, null, 2)}

Return a JSON object:
{
  "headline": "One compelling sentence summarising the week",
  "sections": [
    {
      "title": "Patient Volume",
      "insight": "2-3 sentence insight about appointment trends and patient activity",
      "trend": "up" | "down" | "stable",
      "metric": "key number or % to highlight"
    },
    {
      "title": "Revenue & Finance",
      "insight": "2-3 sentence insight about revenue, expenses, and profitability",
      "trend": "up" | "down" | "stable",
      "metric": "key number or % to highlight"
    },
    {
      "title": "Clinical Focus",
      "insight": "2-3 sentence insight about the most common conditions and clinical patterns this week",
      "trend": "up" | "down" | "stable",
      "metric": "key number or % to highlight"
    },
    {
      "title": "Staff & Operations",
      "insight": "2-3 sentence insight about staff attendance, utilisation, and operational efficiency",
      "trend": "up" | "down" | "stable",
      "metric": "key number or % to highlight"
    }
  ],
  "actionItems": ["specific recommended action 1", "specific recommended action 2", "specific recommended action 3"],
  "generatedAt": "${new Date().toISOString()}"
}`,
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ success: true, insights: parsed, context });
    } catch (err: any) {
      console.error("[ai-insights] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Post-Op (SaivieRecover tablet) routes ────────────────────────────────────

  // Staff login: authenticate using username+password stored in users table
  app.post("/api/postop/auth/login", async (req, res) => {
    const { username, passcode } = req.body;
    if (!username || !passcode) return res.status(400).json({ error: "username and passcode required" });
    const user = await storage.getUserByPasscode(passcode);
    if (!user || user.username !== username) return res.status(401).json({ error: "Invalid credentials" });
    const staffToken = issueStaffToken(user.id);
    res.json({ staffToken, user: { id: user.id, username: user.username, role: user.role } });
  });

  // Search patients (staff-authenticated)
  app.get("/api/postop/patients", async (req, res) => {
    if (!getStaffUserId(req, res)) return;
    const q = ((req.query.q as string) || "").toLowerCase().trim();
    const all = await storage.getPatients();
    const results = q
      ? all.filter(p => p.name?.toLowerCase().includes(q) || p.phone?.includes(q)).slice(0, 20)
      : all.slice(0, 20);
    res.json(results);
  });

  // Get post-op observations for a patient (requires valid staff Bearer token)
  app.get("/api/postop/observations/:patientId", async (req, res) => {
    if (!getStaffUserId(req, res)) return;
    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) return res.status(400).json({ error: "Invalid patient ID" });
    const obs = await storage.getPostopObservations(patientId);
    res.json(obs);
  });

  // Create a new post-op observation
  app.post("/api/postop/observations", async (req, res) => {
    const staffUserId = getStaffUserId(req, res);
    if (!staffUserId) return;
    const {
      patientId, observedAt, painScore, systolic, diastolic, pulse,
      nausea, mobility, woundCondition, notes
    } = req.body;
    if (!patientId || !observedAt) return res.status(400).json({ error: "patientId and observedAt required" });
    const staffUser = await storage.getUser(staffUserId);
    const obs = await storage.createPostopObservation({
      patientId: parseInt(patientId),
      observedAt,
      painScore: painScore != null ? parseInt(painScore) : null,
      systolic: systolic != null ? parseInt(systolic) : null,
      diastolic: diastolic != null ? parseInt(diastolic) : null,
      pulse: pulse != null ? parseInt(pulse) : null,
      nausea: !!nausea,
      mobility: mobility || null,
      woundCondition: woundCondition || null,
      notes: notes || null,
      recordedBy: staffUser?.username || staffUserId,
    });
    res.status(201).json(obs);
  });

  app.use("/api", (err: any, _req: any, res: any, _next: any) => {
    console.error("API Error:", err.message);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return httpServer;
}

// ── SaivieDesk (Receptionist Intake) Routes ───────────────────────────────────

// Helper: validate desk staff token AND verify receptionist/admin role
async function getDeskStaffUserId(req: Request, res: Response): Promise<string | null> {
  const userId = getStaffUserId(req, res);
  if (!userId) return null;
  const user = await storage.getUser(userId);
  if (!user || (user.role !== "receptionist" && user.role !== "admin")) {
    res.status(403).json({ error: "Access denied. Receptionist or admin role required." });
    return null;
  }
  return userId;
}

// Tightly-scoped intake schema — only the fields a receptionist may set
const deskIntakeFields = {
  name: true, phone: true, age: true, email: true, address: true,
  lmp: true, dob: true, procedureDate: true,
  mode: true, referredBy: true, condition: true, clinicianNote: true,
} as const;

const deskCreateSchema = insertPatientSchema.pick(deskIntakeFields);
const deskUpdateSchema = insertPatientSchema.pick(deskIntakeFields).partial();

async function handleDeskAuth(req: Request, res: Response) {
  try {
    const { identifier, username, passcode, pin } = req.body as {
      identifier?: string; username?: string; passcode?: string; pin?: string;
    };
    // Accept identifier (username or phone) or the legacy username field
    const id = (identifier ?? username ?? "").trim();
    const secret = (pin ?? passcode ?? "").trim();
    if (!id || !secret) {
      return res.status(400).json({ error: "identifier (username or phone) and PIN are required" });
    }
    // Look up the staff member by PIN first, then verify identifier matches username or phone
    const userByPin = await storage.getUserByPasscode(secret);
    let user = userByPin && (userByPin.username === id || userByPin.phone === id) ? userByPin : undefined;

    // If no match by PIN+identifier, try phone lookup and validate PIN separately
    if (!user) {
      const userByPhone = await storage.getUserByPhone(id);
      if (userByPhone?.password === secret) user = userByPhone;
    }
    // Finally try username lookup
    if (!user) {
      const userByUsername = await storage.getUserByUsername(id);
      if (userByUsername?.password === secret) user = userByUsername;
    }

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.role !== "receptionist" && user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Receptionist or admin role required." });
    }
    const staffToken = issueStaffToken(user.id);
    res.json({ staffToken, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
}

export async function registerDeskRoutes(app: Express) {
  // POST /api/desk/auth — receptionist / admin login (primary path)
  app.post("/api/desk/auth", handleDeskAuth);

  // POST /api/staff/auth — alias used by some clients
  app.post("/api/staff/auth", handleDeskAuth);

  // GET /api/desk/patients?search= — search patients (receptionist/admin only)
  app.get("/api/desk/patients", async (req, res) => {
    if (!(await getDeskStaffUserId(req, res))) return;
    try {
      const q = ((req.query.search as string) || (req.query.q as string) || "").toLowerCase().trim();
      const all = await storage.getPatients();
      const results = q
        ? all.filter(p => p.name?.toLowerCase().includes(q) || p.phone?.includes(q) || p.email?.toLowerCase().includes(q)).slice(0, 30)
        : all.slice(0, 30);
      res.json(results);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // GET /api/desk/patients/:id — get single patient by ID (receptionist/admin only)
  app.get("/api/desk/patients/:id", async (req, res) => {
    if (!(await getDeskStaffUserId(req, res))) return;
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: "Invalid patient ID" }); return; }
      const patient = await storage.getPatient(id);
      if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
      res.json(patient);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // POST /api/desk/patients — create new patient (receptionist/admin only)
  app.post("/api/desk/patients", async (req, res) => {
    if (!(await getDeskStaffUserId(req, res))) return;
    try {
      const parsed = deskCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid patient data", issues: parsed.error.flatten().fieldErrors });
        return;
      }
      const data = parsed.data;
      const phone = data.phone?.trim();
      if (phone) {
        const all = await storage.getPatients();
        const duplicate = all.find(p => p.phone === phone);
        if (duplicate) {
          res.status(409).json({ error: "A patient with this phone number already exists", existingId: duplicate.id });
          return;
        }
      }
      const patient = await storage.createPatient(data);
      res.status(201).json(patient);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // PATCH /api/desk/patients/:id — update patient (receptionist/admin only)
  app.patch("/api/desk/patients/:id", async (req, res) => {
    if (!(await getDeskStaffUserId(req, res))) return;
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: "Invalid patient ID" }); return; }
      const parsed = deskUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid patient data", issues: parsed.error.flatten().fieldErrors });
        return;
      }
      const data = parsed.data;
      const newPhone = data.phone?.trim();
      if (newPhone) {
        const all = await storage.getPatients();
        const conflict = all.find(p => p.phone === newPhone && p.id !== id);
        if (conflict) {
          res.status(409).json({ error: "Another patient already has this phone number", existingId: conflict.id });
          return;
        }
      }
      const patient = await storage.updatePatient(id, data);
      if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
      res.json(patient);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // GET /api/desk/providers — get providers list (receptionist/admin only)
  app.get("/api/desk/providers", async (req, res) => {
    if (!(await getDeskStaffUserId(req, res))) return;
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // POST /api/desk/appointments — book appointment (receptionist/admin only)
  app.post("/api/desk/appointments", async (req, res) => {
    if (!(await getDeskStaffUserId(req, res))) return;
    try {
      const { patientId, providerId, serviceId, date, time, type, reason, visitType } = req.body as {
        patientId: string | number;
        providerId?: string | number;
        serviceId?: string | number;
        date: string;
        time: string;
        type?: string;
        reason?: string;
        visitType?: string;
      };
      if (!patientId || !date || !time) return res.status(400).json({ error: "patientId, date and time required" });
      const appt = await storage.createAppointment({
        patientId: Number(patientId),
        providerId: providerId ? Number(providerId) : null,
        serviceId: serviceId ? Number(serviceId) : null,
        date,
        time,
        type: type || "Consultation",
        reason: reason || null,
        visitType: visitType || null,
        status: "Confirmed",
      });
      res.status(201).json(appt);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });
}

// ── SaivieGene Genome Routes ──────────────────────────────────────────────────
export async function registerGenomeRoutes(app: Express): Promise<void> {
  const genomeJobs = new Map<string, { status: "processing" | "done" | "error"; patientId?: number; fileName?: string }>();

  const genomeUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  }).single("file");

  // POST /api/genome/upload — accept genome file and start async analysis
  app.post("/api/genome/upload", (req: Request, res: Response) => {
    genomeUpload(req, res, async (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "File upload error" });
        return;
      }
    try {
      const patientId = getMobilePatientId(req, res);
      if (!patientId) return;

      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        res.status(400).json({ error: "No genome file uploaded" });
        return;
      }

      const jobId = crypto.randomBytes(16).toString("hex");
      const fileName = file.originalname ?? "genome.vcf";

      genomeJobs.set(jobId, { status: "processing", patientId, fileName });

      // Kick off async analysis
      (async () => {
        try {
          const content = file.buffer.toString("utf8");
          const result = analyseGenome(content, fileName);

          const client = await (await import("../db")).pool.connect();
          try {
            await client.query(
              `INSERT INTO genome_analyses
                (patient_id, job_id, status, file_name, snp_count, health_risks, predispositions, pharmacogenomics, traits, raw_markers, analysed_at, created_at)
               VALUES ($1, $2, 'done', $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (job_id) DO UPDATE SET
                status = 'done',
                snp_count = EXCLUDED.snp_count,
                health_risks = EXCLUDED.health_risks,
                predispositions = EXCLUDED.predispositions,
                pharmacogenomics = EXCLUDED.pharmacogenomics,
                traits = EXCLUDED.traits,
                raw_markers = EXCLUDED.raw_markers,
                analysed_at = EXCLUDED.analysed_at`,
              [
                patientId,
                jobId,
                fileName,
                result.snpCount,
                JSON.stringify(result.healthRisks),
                JSON.stringify(result.predispositions),
                JSON.stringify(result.pharmacogenomics),
                JSON.stringify(result.traits),
                JSON.stringify(result.rawMarkers),
                new Date().toISOString(),
                new Date().toISOString(),
              ]
            );
          } finally {
            client.release();
          }

          genomeJobs.set(jobId, { status: "done", patientId, fileName });
        } catch (err) {
          genomeJobs.set(jobId, { status: "error", patientId, fileName });
        }
      })();

      res.status(202).json({ jobId, status: "processing" });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
    });
  });

  // GET /api/genome/status/:jobId — poll analysis status
  app.get("/api/genome/status/:jobId", async (req: Request, res: Response) => {
    const patientId = getMobilePatientId(req, res);
    if (!patientId) return;

    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
    const job = genomeJobs.get(jobId);

    if (!job) {
      // Check DB
      try {
        const client = await (await import("../db")).pool.connect();
        try {
          const result = await client.query(
            "SELECT status FROM genome_analyses WHERE job_id = $1 AND patient_id = $2",
            [jobId, patientId]
          );
          if (result.rows.length === 0) {
            res.status(404).json({ error: "Job not found" });
            return;
          }
          res.json({ jobId, status: result.rows[0].status });
        } finally {
          client.release();
        }
      } catch (err: unknown) {
        res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
      }
      return;
    }

    if (job.patientId !== patientId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json({ jobId, status: job.status });
  });

  // GET /api/genome/analyze/:jobId — alias for status polling (matches expected contract)
  app.get("/api/genome/analyze/:jobId", async (req: Request, res: Response) => {
    const patientId = getMobilePatientId(req, res);
    if (!patientId) return;
    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
    const job = genomeJobs.get(jobId);
    if (!job) {
      try {
        const client = await (await import("../db")).pool.connect();
        try {
          const result = await client.query(
            "SELECT status FROM genome_analyses WHERE job_id = $1 AND patient_id = $2",
            [jobId, patientId]
          );
          if (result.rows.length === 0) { res.status(404).json({ error: "Job not found" }); return; }
          res.json({ jobId, status: result.rows[0].status });
        } finally { client.release(); }
      } catch (err: unknown) {
        res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
      }
      return;
    }
    if (job.patientId !== patientId) { res.status(403).json({ error: "Forbidden" }); return; }
    res.json({ jobId, status: job.status });
  });

  // GET /api/genome/results — get most recent analysis results for the authenticated patient
  app.get("/api/genome/results", async (req: Request, res: Response) => {
    const patientId = getMobilePatientId(req, res);
    if (!patientId) return;

    try {
      const client = await (await import("../db")).pool.connect();
      try {
        const result = await client.query(
          `SELECT id, status, file_name, snp_count, health_risks, predispositions, pharmacogenomics, traits, analysed_at
           FROM genome_analyses
           WHERE patient_id = $1 AND status = 'done'
           ORDER BY analysed_at DESC
           LIMIT 1`,
          [patientId]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: "No genome analysis found" });
          return;
        }

        const row = result.rows[0];
        res.json({
          id: row.id,
          status: row.status,
          fileName: row.file_name,
          snpCount: row.snp_count,
          healthRisks: row.health_risks ?? [],
          predispositions: row.predispositions ?? [],
          pharmacogenomics: row.pharmacogenomics ?? [],
          traits: row.traits ?? [],
          analysedAt: row.analysed_at,
        });
      } finally {
        client.release();
      }
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // GET /api/genome/results/patient/:patientId — clinician portal: get patient genome insights.
  // Access requires: valid staff Bearer token OR a clinician-role session user.
  app.get("/api/genome/results/patient/:patientId", async (req: Request, res: Response) => {
    const auth = (req.headers["authorization"] ?? "") as string;
    const hasStaffToken = auth.startsWith("Bearer ") && staffAuthTokens.has(auth.slice(7));
    const sessionPatientId = ((req as any).session)?.patientId as number | undefined;
    if (!hasStaffToken && !sessionPatientId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    // If accessed via session (not staff token), verify the session user is a clinician.
    if (!hasStaffToken && sessionPatientId) {
      try {
        const authClient = await (await import("../db")).pool.connect();
        try {
          const userRow = await authClient.query(
            `SELECT u.role FROM users u
             JOIN patients p ON p.id = $1
             WHERE u.phone = p.phone OR u.id::text = p.id::text
             LIMIT 1`,
            [sessionPatientId]
          );
          // Allow clinician role or fall through to allow portal sessions broadly
          // (clinician portal sessions are valid for read-only genome access)
          const role = userRow.rows[0]?.role ?? "patient";
          if (role === "patient") {
            // A plain patient can only fetch their own genome data
            const pid = parseId(Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId);
            if (pid !== sessionPatientId) {
              res.status(403).json({ error: "Access denied: clinician role required to view other patients' genome data" });
              return;
            }
          }
        } finally { authClient.release(); }
      } catch {
        // DB check failed — fall through conservatively (deny unless staff token)
        if (!hasStaffToken) {
          res.status(403).json({ error: "Unable to verify access permissions" });
          return;
        }
      }
    }
    try {
      const pid = parseId(Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId);
      if (!pid) { res.status(400).json({ error: "Invalid patient ID" }); return; }

      const client = await (await import("../db")).pool.connect();
      try {
        const result = await client.query(
          `SELECT id, status, file_name, snp_count, health_risks, predispositions, pharmacogenomics, traits, analysed_at
           FROM genome_analyses
           WHERE patient_id = $1 AND status = 'done'
           ORDER BY analysed_at DESC
           LIMIT 1`,
          [pid]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: "No genome analysis found for this patient" });
          return;
        }

        const row = result.rows[0];
        res.json({
          id: row.id,
          status: row.status,
          fileName: row.file_name,
          snpCount: row.snp_count,
          healthRisks: row.health_risks ?? [],
          predispositions: row.predispositions ?? [],
          pharmacogenomics: row.pharmacogenomics ?? [],
          traits: row.traits ?? [],
          analysedAt: row.analysed_at,
        });
      } finally {
        client.release();
      }
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // GET /api/genome/report — generate and download an HTML report
  app.get("/api/genome/report", async (req: Request, res: Response) => {
    const patientId = getMobilePatientId(req, res);
    if (!patientId) return;

    try {
      const client = await (await import("../db")).pool.connect();
      try {
        const result = await client.query(
          `SELECT file_name, snp_count, health_risks, predispositions, pharmacogenomics, traits, analysed_at
           FROM genome_analyses
           WHERE patient_id = $1 AND status = 'done'
           ORDER BY analysed_at DESC LIMIT 1`,
          [patientId]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: "No analysis found" });
          return;
        }

        const row = result.rows[0];
        const date = row.analysed_at ? new Date(row.analysed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Unknown date";

        const html = generateReportHtml({
          fileName: row.file_name,
          snpCount: row.snp_count,
          healthRisks: row.health_risks ?? [],
          predispositions: row.predispositions ?? [],
          pharmacogenomics: row.pharmacogenomics ?? [],
          traits: row.traits ?? [],
          date,
        });

        res.setHeader("Content-Type", "text/html");
        res.setHeader("Content-Disposition", `attachment; filename="saiviegene-report.html"`);
        res.send(html);
      } finally {
        client.release();
      }
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });
}

function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateReportHtml(data: {
  fileName: string;
  snpCount: number;
  healthRisks: Array<{ name: string; risk: string; score: number; description: string }>;
  predispositions: Array<{ name: string; likelihood: string; gene: string; description: string }>;
  pharmacogenomics: Array<{ drug: string; response: string; gene: string; recommendation: string }>;
  traits: Array<{ trait: string; value: string; description: string }>;
  date: string;
}): string {
  const riskColor = (r: string) => r === "high" ? "#ef4444" : r === "moderate" ? "#f59e0b" : "#22c55e";
  const likeColor = (l: string) => l === "elevated" ? "#ef4444" : l === "reduced" ? "#22c55e" : "#94a3b8";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>SaivieGene Genome Report</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0e1a; color: #e2e8f0; margin: 0; padding: 24px; }
  .header { background: linear-gradient(135deg, #1a1f35, #0f1525); border: 1px solid #2a3050; border-radius: 16px; padding: 32px; margin-bottom: 24px; }
  .logo { font-size: 14px; font-weight: 700; letter-spacing: 4px; color: #d4a017; margin-bottom: 16px; }
  h1 { font-size: 28px; margin: 0 0 8px 0; color: #f1f5f9; }
  .subtitle { color: #64748b; font-size: 14px; }
  .section { background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .section h2 { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #d4a017; letter-spacing: 1px; text-transform: uppercase; }
  .item { border-bottom: 1px solid #1e293b; padding: 12px 0; }
  .item:last-child { border-bottom: none; }
  .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .item-name { font-weight: 600; color: #f1f5f9; font-size: 15px; }
  .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
  .item-desc { color: #64748b; font-size: 13px; line-height: 1.5; }
  .gene { color: #7dd3fc; font-family: monospace; font-size: 12px; margin-top: 4px; }
  .rec { color: #a3e635; font-size: 13px; margin-top: 6px; font-style: italic; }
  .disclaimer { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 12px; color: #475569; line-height: 1.6; }
  .stats { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 16px; }
  .stat { background: #0f172a; border-radius: 8px; padding: 12px 16px; }
  .stat-val { font-size: 20px; font-weight: 700; color: #d4a017; }
  .stat-lab { font-size: 12px; color: #64748b; margin-top: 2px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">⬡ SAIVIEGENE</div>
  <h1>Genome Analysis Report</h1>
  <div class="subtitle">Analysed: ${escHtml(data.date)} &nbsp;·&nbsp; File: ${escHtml(data.fileName)}</div>
  <div class="stats">
    <div class="stat"><div class="stat-val">${escHtml(data.snpCount.toLocaleString())}</div><div class="stat-lab">SNPs Analysed</div></div>
    <div class="stat"><div class="stat-val">${escHtml(data.healthRisks.length + data.predispositions.length)}</div><div class="stat-lab">Conditions Screened</div></div>
    <div class="stat"><div class="stat-val">${escHtml(data.pharmacogenomics.length)}</div><div class="stat-lab">Drug Interactions</div></div>
  </div>
</div>

<div class="section">
  <h2>🛡 Health Risks</h2>
  ${data.healthRisks.map((r) => `
  <div class="item">
    <div class="item-header">
      <div class="item-name">${escHtml(r.name)}</div>
      <span class="badge" style="background:${riskColor(r.risk)}22;color:${riskColor(r.risk)}">${escHtml(r.risk?.toUpperCase())}</span>
    </div>
    <div class="item-desc">${escHtml(r.description)}</div>
  </div>`).join("")}
</div>

<div class="section">
  <h2>🧬 Disease Predispositions</h2>
  ${data.predispositions.map((p) => `
  <div class="item">
    <div class="item-header">
      <div class="item-name">${escHtml(p.name)}</div>
      <span class="badge" style="background:${likeColor(p.likelihood)}22;color:${likeColor(p.likelihood)}">${escHtml(p.likelihood?.toUpperCase())}</span>
    </div>
    <div class="gene">Gene: ${escHtml(p.gene)}</div>
    <div class="item-desc">${escHtml(p.description)}</div>
  </div>`).join("")}
</div>

<div class="section">
  <h2>💊 Pharmacogenomics</h2>
  ${data.pharmacogenomics.map((pgx) => `
  <div class="item">
    <div class="item-header">
      <div class="item-name">${escHtml(pgx.drug)}</div>
      <span class="badge" style="background:#7c3aed22;color:#a78bfa">${escHtml(pgx.response?.toUpperCase())}</span>
    </div>
    <div class="gene">Gene: ${escHtml(pgx.gene)}</div>
    <div class="rec">→ ${escHtml(pgx.recommendation)}</div>
  </div>`).join("")}
</div>

<div class="section">
  <h2>✨ Traits & Ancestry</h2>
  ${data.traits.map((t) => `
  <div class="item">
    <div class="item-header">
      <div class="item-name">${escHtml(t.trait)}</div>
      <span class="badge" style="background:#0d916022;color:#34d399">${escHtml(t.value)}</span>
    </div>
    <div class="item-desc">${escHtml(t.description)}</div>
  </div>`).join("")}
</div>

<div class="disclaimer">
  <strong>Medical Disclaimer:</strong> This report is generated for informational and educational purposes only. It does not constitute medical advice, diagnosis, or treatment recommendations. Genetic predispositions identified here do not guarantee the development of any condition. Always consult a qualified healthcare professional before making any health decisions. SaivieGene complies with applicable data protection and HIPAA privacy regulations.
</div>
</body>
</html>`;
}
