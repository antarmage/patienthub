import type { Express, Request, Response } from "express";
import { isReceptionReader } from "./reception-access";

export type AccessActor = { userId: string; role: string } | { patientId: number };
export interface ClinicalAccessDependencies {
  authenticate(req: Request, res: Response): Promise<AccessActor | null>;
  appointmentPatientId(id: number): Promise<number | null>;
  clinicalDetailsVisible?(): Promise<boolean>;
  onboardingPatientId?(id: number, token: string): Promise<number | null>;
}

export const registrationFields = {
  name: true, phone: true, age: true, email: true, address: true,
  dob: true, avatar: true, mode: true, referredBy: true, insurance: true,
} as const;

const patientLogisticsFields = new Set([
  "id", ...Object.keys(registrationFields), "lastVisit", "nextReview",
  "isPrimeMember", "primeMemberSince",
]);
const patientClinicalFields = new Set([
  ...patientLogisticsFields, "status", "focus", "cycleDay", "referredTo", "vaccination",
  "contraception", "history", "type", "mood", "weight", "hb", "functional", "intervention",
  "plan", "condition", "lmp", "procedureDate", "height", "bp", "pregnancyStatus",
  "riskScore", "trimesterChecklist",
]);
const appointmentLogisticsFields = new Set([
  "id", "patientId", "providerId", "serviceId", "date", "time", "endTime", "duration",
  "type", "status", "visitType", "visitMode", "surveyType", "surveyCompleted", "priority", "room",
  "billingCode", "billingAmount", "paymentStatus", "insuranceClaim", "checkedInAt",
  "seenAt", "completedAt", "followUpDate", "telemedicineLink", "whatsappReminderSent",
  "patientConsultationUrl", "notificationStatus",
]);
const appointmentWriteFields = new Set([...appointmentLogisticsFields].filter((key) => !["id", "seenAt", "completedAt", "patientConsultationUrl", "notificationStatus"].includes(key)));
appointmentWriteFields.delete("surveyCompleted");
appointmentWriteFields.add("suppressNotification");
appointmentWriteFields.add("reason");

function project(row: unknown, fields: Set<string>): unknown {
  if (Array.isArray(row)) return row.map((item) => project(item, fields));
  if (!row || typeof row !== "object") return row;
  return Object.fromEntries(Object.entries(row).filter(([key]) => fields.has(key)));
}

function invoiceLogistics(row: unknown): unknown {
  if (Array.isArray(row)) return row.map(invoiceLogistics);
  if (!row || typeof row !== "object") return row;
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== "diagnoses" && key !== "diagnosisEncounterId"));
}

export function patientLogistics(row: unknown): unknown {
  return project(row, patientLogisticsFields);
}

function recoveryPatientProjection(row: unknown): unknown {
  if (Array.isArray(row)) return row.map(recoveryPatientProjection);
  if (!row || typeof row !== "object") return row;
  const result = project(row, patientLogisticsFields);
  if (!result || typeof result !== "object" || !("surgery" in row)) return result;
  return { ...result, surgery: project(row.surgery, new Set(["id", "procedureName", "plannedDate", "completedAt", "surgeonName"])) };
}

export function rescheduledLogistics(
  current: { date: string; time: string; providerId: number | null },
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const changed = ["date", "time", "providerId"].some((key) =>
    patch[key] !== undefined && String(patch[key]) !== String(current[key as keyof typeof current]));
  return changed ? { ...patch, status: "scheduled", checkedInAt: null } : patch;
}

export function checkInIsToday(
  current: { date: string },
  patch: Record<string, unknown>,
  now = Date.now(),
): boolean {
  if (String(patch.status || "").toLowerCase() !== "checked-in" && patch.checkedInAt == null) return true;
  const today = new Date(now + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  return String(patch.date ?? current.date).slice(0, 10) === today;
}

const patientClinicalPath = /^\/api\/patients\/([^/]+)\/(conception|pregnancy-status|appointment-history|visit-history|medications|clinical-notes|diagnoses|documents|hormones|pregnancy-metrics|weight-logs|bp-logs|follicle-data|usg-data|lab-results|referrals|risk-score|trimester-checklist|manual-prescription|extract-prescription|parse-prescription|extract-lab-results)(?:\/[^/]+\/file)?\/?$/;
const clinicalCollectionPath = /^\/api\/(visit-history|clinical-notes|documents|medications|referrals)(?:\/[^/]+)?\/?$/;
const clinicianToolPath = /^\/api\/(?:ocr\/prescription|icd10\/search|patients\/batch-risk-score|google-sheets\/sync|google-drive\/import-lab-reports|voice\/soap-transcribe|appointments\/[^/]+\/post-visit-summary|appointments\/triage|appointments\/optimise-schedule)\/?$/;
const patientRecordPath = /^\/api\/(?:desk\/)?patients(?:\/[^/]+)?\/?$/;
const patientListAliasPath = /^\/api\/(?:prime-members|postop\/patients|patients\/by-category\/[^/]+)\/?$/;
const appointmentPath = /^\/api\/(?:desk\/)?appointments(?:\/[^/]+(?:\/telemedicine)?)?\/?$/;

function isClinician(actor: AccessActor): boolean {
  return "role" in actor && ["clinician", "owner"].includes(actor.role);
}

export function receptionCompletion(
  appointment: { date: string; status?: string | null; checkedInAt?: string | null; seenAt?: string | null; completedAt?: string | null },
  now = new Date(),
): { error: string } | { status: "completed"; completedAt: string } {
  const status = String(appointment.status || "").toLowerCase().replace(/[\s_]/g, "-");
  const today = new Date(now.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment.date) || appointment.date > today)
    return { error: "Future appointments cannot be marked complete." };
  if (["cancelled", "canceled", "no-show"].includes(status))
    return { error: "Cancelled or no-show appointments cannot be marked complete." };
  if (!appointment.completedAt && status !== "completed" && !appointment.checkedInAt && !appointment.seenAt
    && !["checked-in", "arrived", "seen", "in-consultation", "in-progress", "with-doctor"].includes(status))
    return { error: "Check in the patient before marking the consultation complete." };
  return { status: "completed", completedAt: appointment.completedAt || now.toISOString() };
}

function isStaff(actor: AccessActor): actor is Extract<AccessActor, { role: string }> {
  return "role" in actor && ["staff", "receptionist", "admin", "owner", "clinician"].includes(actor.role);
}

function ownPatient(actor: AccessActor, id: number): boolean {
  return "patientId" in actor && actor.patientId === id;
}

function restrictBody(req: Request, res: Response, allowed: Set<string>): boolean {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "Expected an object" });
    return false;
  }
  const forbidden = Object.keys(req.body).filter((key) => !allowed.has(key));
  if (forbidden.length) {
    res.status(403).json({ error: "Clinician access required for clinical fields", fields: forbidden });
    return false;
  }
  return true;
}

// Register before the route handlers: reject unauthorized requests before any storage or upload work.
export function registerClinicalAccess(app: Express, dependencies: ClinicalAccessDependencies): void {
  app.use(async (req, res, next) => {
    const path = req.path.toLowerCase();
    const read = req.method === "GET" || req.method === "HEAD";
    const clinicalPatient = path.match(patientClinicalPath) || path.match(/^\/api\/patients\/([^/]+)\/(pregnancy-episodes)(?:\/[^/]+)?\/?$/);
    const clinicalCollection = clinicalCollectionPath.test(path);
    const clinicianTool = clinicianToolPath.test(path);
    const patientRecord = patientRecordPath.test(path);
    const patientListAlias = patientListAliasPath.test(path);
    const appointment = appointmentPath.test(path);
    const patientInvoice = path.match(/^\/api\/patients\/([^/]+)\/(invoices|invoice-quote)\/?$/);
    const invoice = !!patientInvoice || /^\/api\/invoices(?:\/[^/]+(?:\/email)?)?\/?$/.test(path);
    const primeMutation = /^\/api\/patients\/[^/]+\/prime-member\/?$/.test(path);
    const onboarding = /^\/api\/onboarding(?:\/[^/]+)?\/?$/.test(path);
    if (onboarding) res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    if (!clinicalPatient && !clinicalCollection && !clinicianTool && !patientRecord && !patientListAlias && !appointment && !invoice && !primeMutation && !onboarding) return next();

    try {
      let resolvedActor: AccessActor | null;
      if (onboarding && req.headers["x-onboarding-token"] !== undefined) {
        const id = Number(read ? req.headers["x-appointment-id"] : req.params.appointmentId || path.split("/").at(-1));
        const token = req.headers["x-onboarding-token"];
        const patientId = typeof token === "string" ? await dependencies.onboardingPatientId?.(id, token) : null;
        if (!patientId) { res.status(410).json({ error: "This private onboarding link is invalid, expired, replaced, or the appointment was cancelled. Ask your clinic for a new link." }); return; }
        resolvedActor = { patientId };
      } else {
        resolvedActor = await dependencies.authenticate(req, res);
      }
      const actor = resolvedActor;
      if (!actor) {
        if (!res.headersSent) res.status(401).json({ error: "Authentication required" });
        return;
      }
      const clinician = isClinician(actor);
      const staff = isStaff(actor);
      const receptionRead = read && isReceptionReader(actor) && await dependencies.clinicalDetailsVisible?.() === true;
      if (read) res.setHeader("Cache-Control", "private, no-store");
      const deny = () => res.status(403).json({ error: "Clinician access required" });
      if (invoice) {
        if (!staff && !(read && patientInvoice && ownPatient(actor, Number(patientInvoice[1])))) {
          res.status(403).json({ error: "Staff or own-patient invoice access required" });
          return;
        }
        if (!read && !clinician && (req.body?.diagnosisEncounterId !== undefined || req.body?.diagnoses !== undefined)) {
          deny();
          return;
        }
        if (staff) res.locals.accessRole = actor.role;
        if (staff && !clinician) {
          const json = res.json.bind(res);
          res.json = ((body: unknown) => json(res.statusCode >= 400 ? body : invoiceLogistics(body))) as Response["json"];
        }
        return next();
      }
      if (clinicalPatient || clinicalCollection || clinicianTool) {
        if (clinician) return next();
        if (receptionRead && !clinicianTool) {
          res.locals.receptionClinicalRead = true;
          if (path.includes("/clinical-notes")) {
            const json = res.json.bind(res);
            res.json = ((body: unknown) => json(res.statusCode < 400 && Array.isArray(body)
              ? body.filter((note) => note?.isPrivate !== 1 && note?.isPrivate !== true)
              : body)) as Response["json"];
          }
          return next();
        }
        if (read && clinicalPatient && ownPatient(actor, Number(clinicalPatient[1]))) {
          res.locals.accessPatientId = Number(clinicalPatient[1]);
          if (clinicalPatient[2] === "clinical-notes") {
            const json = res.json.bind(res);
            res.json = ((body: unknown) => json(res.statusCode < 400 && Array.isArray(body)
              ? body.filter((note) => note?.isPrivate !== 1 && note?.isPrivate !== true)
              : body)) as Response["json"];
          }
          return next();
        }
        deny();
        return;
      }
      if (onboarding) {
        const appointmentId = Number(read ? req.headers["x-appointment-id"] : req.params.appointmentId || path.split("/").at(-1));
        if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) {
          res.status(400).json({ error: "Invalid appointment ID" });
          return;
        }
        if (!clinician) {
          const patientId = await dependencies.appointmentPatientId(appointmentId);
          if (patientId === null || !ownPatient(actor, patientId)) {
            res.status(403).json({ error: "Forbidden" });
            return;
          }
          res.locals.onboardingPatientId = patientId;
          if (!read && req.body?.history != null) {
            const history = req.body.history;
            if (!history || typeof history !== "object" || Array.isArray(history) ||
                Object.keys(history).some((key) => !["onboarding", "labSurvey", "medical", "surgical", "drug", "allergies", "family", "pregnancyDatingEstimate"].includes(key))) {
              res.status(403).json({ error: "Only patient intake history may be submitted" });
              return;
            }
          }
        }
        return next();
      }
      if (patientRecord && read && "patientId" in actor) {
        const id = Number(path.split("/").filter(Boolean).at(-1));
        if (!ownPatient(actor, id)) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
        return next();
      }
      if (appointment && "patientId" in actor && read) {
        res.locals.accessPatientId = actor.patientId;
        return next();
      }
      if (!staff) {
        res.status(403).json({ error: "Staff access required" });
        return;
      }
      res.locals.accessRole = actor.role;
      if (!clinician && !receptionRead && path.includes("/by-category/") &&
          !["all", "all-patients", "today-appointments"].includes(path.split("/").filter(Boolean).at(-1) || "")) {
        deny();
        return;
      }
      if (!read && !clinician && patientRecord &&
          !restrictBody(req, res, new Set(Object.keys(registrationFields)))) return;
      if (!read && !clinician && appointment && !path.endsWith("/telemedicine") &&
          !restrictBody(req, res, appointmentWriteFields)) return;
      if (!read && !clinician && appointment && !path.endsWith("/telemedicine")) {
        const status = req.body?.status;
        const normalizedStatus = status == null ? null : String(status).toLowerCase();
        const receptionCompleting = isReceptionReader(actor) && req.method === "PATCH" && normalizedStatus === "completed";
        if (receptionCompleting && (Object.keys(req.body).length !== 1 || !/^\/api\/(?:desk\/)?appointments\/\d+\/?$/.test(path))) {
          res.status(403).json({ error: "Submit consultation completion separately from other appointment changes" });
          return;
        }
        if (normalizedStatus != null && !receptionCompleting && !["scheduled", "booked", "confirmed", "checked-in", "cancelled", "no-show"].includes(normalizedStatus)) {
          res.status(403).json({ error: "Only clinicians may record clinical appointment states" });
          return;
        }
        if (req.body?.checkedInAt != null && (typeof req.body.checkedInAt !== "string" || !Number.isFinite(Date.parse(req.body.checkedInAt)))) {
          res.status(400).json({ error: "Invalid check-in time" });
          return;
        }
        if (req.method === "POST" && (normalizedStatus === "checked-in" || req.body?.checkedInAt != null)) {
          const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
          if (req.body.date !== today || normalizedStatus !== "checked-in") {
            res.status(400).json({ error: "Walk-in appointments must be booked for today" });
            return;
          }
        }
      }

      const json = res.json.bind(res);
      if (!clinician && (patientRecord || patientListAlias || primeMutation)) {
        const patientResponse = (body: unknown) => path === "/api/postop/patients" ? recoveryPatientProjection(body) : receptionRead ? project(body, patientClinicalFields) : patientLogistics(body);
        res.json = ((body: unknown) => {
          if (res.statusCode >= 400) return json(body);
          if (path.includes("/by-category/") && body && typeof body === "object") {
            return json({ ...body, patients: patientResponse((body as { patients?: unknown }).patients) });
          }
          return json(patientResponse(body));
        }) as Response["json"];
      }
      if (!clinician && appointment) {
        res.json = ((body: unknown) => {
          if (res.statusCode >= 400) return json(body);
          if (body && typeof body === "object" && "appointment" in body) {
            return json({ ...body, appointment: project(body.appointment, appointmentLogisticsFields) });
          }
          return json(project(body, appointmentLogisticsFields));
        }) as Response["json"];
      }
      next();
    } catch (error) {
      next(error);
    }
  });
}
