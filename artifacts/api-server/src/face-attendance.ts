import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import { z } from "zod/v4";
import { FACE_MODEL, FACE_MATCH_THRESHOLD, faceCheckInSchema, faceDescriptorSchema, faceDistance, faceEnrollmentSchema, faceExceptionSchema, faceReviewSchema } from "../../../lib/db/src/face-attendance";
import { clinicDate } from "../../../lib/db/src/follow-up";
import type { AccessActor } from "./clinical-access";
import { isReceptionReader } from "./reception-access";
import { readAttendanceTiming } from "./attendance-shifts";
import { attendanceTiming } from "../../../lib/db/src/attendance-timing";

class FaceAttendanceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const faceAttendanceEnabled = () => process.env.STAFF_FACE_ATTENDANCE_ENABLED === "true";

function encryptionKey() {
  const raw = process.env.STAFF_FACE_ENCRYPTION_KEY || "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32 || key.toString("base64") !== raw) throw new FaceAttendanceError(503, "Face enrollment is not configured. Ask the administrator to configure biometric encryption, or request owner approval.");
  return key;
}

export function sealFaceTemplate(descriptor: number[]) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(faceDescriptorSchema.parse(descriptor)), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function openFaceTemplate(value: string) {
  const bytes = Buffer.from(value, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return faceDescriptorSchema.parse(JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8")));
}

export async function ensureFaceAttendanceSchema(client: Pick<PoolClient, "query">) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS staff_face_enrollments (
      employee_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      encrypted_descriptor text NOT NULL,
      model text NOT NULL,
      approved_by varchar NOT NULL REFERENCES users(id),
      approved_at timestamptz NOT NULL DEFAULT now(),
      consent_confirmed_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS staff_attendance_reviews (
      id serial PRIMARY KEY,
      employee_id varchar NOT NULL REFERENCES users(id),
      date date NOT NULL,
      requested_at timestamptz NOT NULL DEFAULT now(),
      reason text NOT NULL,
      decision text NOT NULL DEFAULT 'pending',
      reviewed_by varchar REFERENCES users(id),
      reviewed_at timestamptz
    );
    CREATE UNIQUE INDEX IF NOT EXISTS staff_attendance_pending_idx
      ON staff_attendance_reviews(employee_id, date) WHERE decision = 'pending';
  `);
}

export interface FaceProfile { descriptor: number[]; model: typeof FACE_MODEL; approvedAt: string }
export interface FaceEmployee { id: string; name: string; enrolled: boolean }
export interface AttendanceReview { id: number; employeeName: string; date: string; requestedAt: string; reason: string; decision: string }
export interface FaceAttendanceStore {
  profile(employeeId: string): Promise<FaceProfile | null>;
  employees(): Promise<FaceEmployee[]>;
  enroll(employeeId: string, descriptor: number[], ownerId: string): Promise<void>;
  revoke(employeeId: string): Promise<void>;
  checkIn(employeeId: string, descriptor: number[]): Promise<void>;
  requestReview(employeeId: string, reason: string): Promise<void>;
  reviews(employeeId?: string): Promise<AttendanceReview[]>;
  review(id: number, decision: "approved" | "rejected", ownerId: string): Promise<void>;
}

export function createFaceAttendanceStore(pool: Pool): FaceAttendanceStore {
  async function transaction<T>(employeeId: string, work: (tx: PoolClient) => Promise<T>) {
    const tx = await pool.connect();
    try {
      await tx.query("BEGIN");
      await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`staff-attendance:${employeeId}`]);
      const result = await work(tx);
      await tx.query("COMMIT");
      return result;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    } finally { tx.release(); }
  }
  async function profile(employeeId: string): Promise<FaceProfile | null> {
    const row = (await pool.query<{ encrypted_descriptor: string; model: string; approved_at: Date }>(
      "SELECT encrypted_descriptor, model, approved_at FROM staff_face_enrollments WHERE employee_id=$1", [employeeId],
    )).rows[0];
    if (!row) return null;
    if (row.model !== FACE_MODEL) throw new FaceAttendanceError(409, "Face enrollment needs updating by the owner.");
    return { descriptor: openFaceTemplate(row.encrypted_descriptor), model: FACE_MODEL, approvedAt: row.approved_at.toISOString() };
  }
  async function ensureWorkDay(tx: PoolClient, employeeId: string, date: string) {
    const record = (await tx.query<{ clock_in: string | null; status: string | null }>(
      "SELECT clock_in,status FROM attendance WHERE employee_id=$1 AND date=$2 FOR UPDATE", [employeeId, date],
    )).rows[0];
    if (record?.clock_in) throw new FaceAttendanceError(409, "You have already checked in today.");
    if (record?.status === "clinic_closed") throw new FaceAttendanceError(409, "The clinic is closed on this date.");
    if (record && ["leave", "regular_day_off", "pending_approval"].includes(record.status || "")) {
      throw new FaceAttendanceError(409, record.status === "pending_approval" ? "An attendance request is already awaiting owner approval." : "Set today to a work day before checking in.");
    }
  }
  async function writeAttendance(tx: PoolClient, employeeId: string, date: string, status: string, clockIn: string | null, notes: string, requestedAt?: string) {
    const timing = await readAttendanceTiming(tx, employeeId, date, clockIn || requestedAt || null);
    if (!clockIn) timing.lateMinutes = null;
    const result = await tx.query(`
      INSERT INTO attendance(employee_id,employee_name,role,date,status,clock_in,notes,shift_start,grace_minutes,late_minutes)
      SELECT id,coalesce(nullif(display_name,''),username),'Receptionist',$2,$3,$4,$5,$6,$7,$8 FROM users
      WHERE id=$1 AND role IN ('staff','receptionist')
      ON CONFLICT(employee_id,date) DO UPDATE SET
        status=EXCLUDED.status,clock_in=EXCLUDED.clock_in,notes=EXCLUDED.notes,
        clock_out=NULL,hours_worked=NULL,shift_start=EXCLUDED.shift_start,
        grace_minutes=EXCLUDED.grace_minutes,late_minutes=EXCLUDED.late_minutes
      RETURNING id
    `, [employeeId, date, status, clockIn, notes, timing.shiftStart, timing.graceMinutes, timing.lateMinutes]);
    if (!result.rowCount) throw new FaceAttendanceError(409, "Receptionist account is no longer available.");
  }
  return {
    profile,
    async employees() {
      return (await pool.query<FaceEmployee>(`
        SELECT u.id,coalesce(nullif(u.display_name,''),u.username) AS name,
          (e.employee_id IS NOT NULL) AS enrolled
        FROM users u LEFT JOIN staff_face_enrollments e ON e.employee_id=u.id
        WHERE u.role IN ('staff','receptionist') ORDER BY name
      `)).rows;
    },
    async enroll(employeeId, descriptor, ownerId) {
      const encrypted = sealFaceTemplate(descriptor);
      const result = await pool.query(`
        INSERT INTO staff_face_enrollments(employee_id,encrypted_descriptor,model,approved_by)
        SELECT id,$2,$3,$4 FROM users WHERE id=$1 AND role IN ('staff','receptionist')
        ON CONFLICT(employee_id) DO UPDATE SET encrypted_descriptor=EXCLUDED.encrypted_descriptor,
          model=EXCLUDED.model,approved_by=EXCLUDED.approved_by,approved_at=now(),consent_confirmed_at=now()
        RETURNING employee_id
      `, [employeeId, encrypted, FACE_MODEL, ownerId]);
      if (!result.rowCount) throw new FaceAttendanceError(404, "Receptionist account not found.");
    },
    async revoke(employeeId) {
      await pool.query("DELETE FROM staff_face_enrollments WHERE employee_id=$1", [employeeId]);
    },
    async checkIn(employeeId, descriptor) {
      await transaction(employeeId, async (tx) => {
        const now = new Date();
        const date = clinicDate(now);
        await ensureWorkDay(tx, employeeId, date);
        const row = (await tx.query<{ encrypted_descriptor: string; model: string }>(
          "SELECT encrypted_descriptor,model FROM staff_face_enrollments WHERE employee_id=$1 FOR SHARE", [employeeId],
        )).rows[0];
        if (!row || row.model !== FACE_MODEL) throw new FaceAttendanceError(409, "Ask the owner to enroll your photo first, or request owner approval.");
        if (faceDistance(openFaceTemplate(row.encrypted_descriptor), descriptor) > FACE_MATCH_THRESHOLD) {
          throw new FaceAttendanceError(422, "Face did not match the enrolled photo. Try again or request owner approval.");
        }
        await writeAttendance(tx, employeeId, date, "present", now.toISOString(), "Browser face match; no liveness or trusted-camera verification.");
      });
    },
    async requestReview(employeeId, reason) {
      await transaction(employeeId, async (tx) => {
        const now = new Date();
        const date = clinicDate(now);
        await ensureWorkDay(tx, employeeId, date);
        await tx.query("INSERT INTO staff_attendance_reviews(employee_id,date,reason,requested_at) VALUES($1,$2,$3,$4)", [employeeId, date, reason, now.toISOString()]);
        await writeAttendance(tx, employeeId, date, "pending_approval", null, "Awaiting owner approval; not counted as present.", now.toISOString());
      });
    },
    async reviews(employeeId) {
      return (await pool.query<AttendanceReview>(`
        SELECT r.id,coalesce(nullif(u.display_name,''),u.username) AS "employeeName",
          r.date::text AS date,r.requested_at::text AS "requestedAt",r.reason,r.decision
        FROM staff_attendance_reviews r JOIN users u ON u.id=r.employee_id
        WHERE ($1::varchar IS NULL AND r.decision='pending') OR r.employee_id=$1
        ORDER BY r.requested_at DESC LIMIT 100
      `, [employeeId || null])).rows;
    },
    async review(id, decision, ownerId) {
      const found = (await pool.query<{ employee_id: string }>("SELECT employee_id FROM staff_attendance_reviews WHERE id=$1", [id])).rows[0];
      if (!found) throw new FaceAttendanceError(404, "Attendance request not found.");
      await transaction(found.employee_id, async (tx) => {
        const row = (await tx.query<{ employee_id: string; date: string; requested_at: Date; decision: string }>(
          "SELECT employee_id,date::text,requested_at,decision FROM staff_attendance_reviews WHERE id=$1 FOR UPDATE", [id],
        )).rows[0];
        if (row.decision !== "pending") throw new FaceAttendanceError(409, "This request has already been reviewed.");
        const clockIn = decision === "approved" ? row.requested_at.toISOString() : null;
        const savedShift = (await tx.query<{ shiftStart: string | null; graceMinutes: number | null }>(
          'SELECT shift_start AS "shiftStart",grace_minutes AS "graceMinutes" FROM attendance WHERE employee_id=$1 AND date=$2 FOR UPDATE',
          [row.employee_id, row.date],
        )).rows[0];
        const timing = attendanceTiming(row.date, clockIn, savedShift?.shiftStart && savedShift.graceMinutes !== null
          ? { shiftStart: savedShift.shiftStart, graceMinutes: savedShift.graceMinutes } : null);
        const changed = await tx.query(`
          UPDATE attendance SET status=$3,clock_in=$4,notes=$5,shift_start=$6,grace_minutes=$7,late_minutes=$8
          WHERE employee_id=$1 AND date=$2 AND status='pending_approval' AND clock_in IS NULL
          RETURNING id
        `, [row.employee_id, row.date, decision === "approved" ? "present" : "rejected",
          clockIn,
          `Attendance ${decision} by owner ${ownerId}; requested at ${row.requested_at.toISOString()}.`,
          timing.shiftStart, timing.graceMinutes, timing.lateMinutes]);
        if (!changed.rowCount) throw new FaceAttendanceError(409, "Attendance has changed. Refresh and review the current record.");
        await tx.query("UPDATE staff_attendance_reviews SET decision=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$1", [id, decision, ownerId]);
      });
    },
  };
}

export function registerFaceAttendanceRoutes(app: Express, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>, store: FaceAttendanceStore) {
  for (const [base, owner] of [["/api/staff/face-attendance", false], ["/api/owner/face-attendance", true]] as const) {
    app.use(base, async (req, res, next) => {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Sign in to manage attendance." }); return; }
      if (!("userId" in actor) || (owner ? actor.role !== "owner" : !isReceptionReader(actor))) {
        res.status(403).json({ error: owner ? "Owner access required." : "Receptionist access required." }); return;
      }
      res.locals.faceActor = actor;
      res.set("Cache-Control", "no-store");
      next();
    });
  }
  const handler = (work: (req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response, next: (error?: unknown) => void) => {
      try { await work(req, res); }
      catch (error) {
        if (error instanceof FaceAttendanceError) { res.status(error.status).json({ error: error.message }); return; }
        if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues.map((issue) => issue.message).join("; ") }); return; }
        next(error);
      }
    };
  app.get("/api/staff/face-attendance", handler(async (_req, res) => {
    const enabled = faceAttendanceEnabled();
    res.json({ enabled, profile: enabled ? await store.profile(res.locals.faceActor.userId) : null, reviews: await store.reviews(res.locals.faceActor.userId) });
  }));
  app.post("/api/staff/face-attendance/check-in", handler(async (req, res) => {
    if (!faceAttendanceEnabled()) throw new FaceAttendanceError(409, "Face check-in is not enabled. Use the regular check-in option.");
    const input = faceCheckInSchema.parse(req.body);
    await store.checkIn(res.locals.faceActor.userId, input.descriptor);
    res.json({ status: "present" });
  }));
  app.post("/api/staff/face-attendance/request-review", handler(async (req, res) => {
    const input = faceExceptionSchema.parse(req.body);
    await store.requestReview(res.locals.faceActor.userId, input.reason);
    res.status(201).json({ status: "pending_approval" });
  }));
  app.get("/api/owner/face-attendance", handler(async (_req, res) => {
    res.json({ enabled: faceAttendanceEnabled(), employees: await store.employees(), reviews: await store.reviews() });
  }));
  app.put("/api/owner/face-attendance/enrollment/:employeeId", handler(async (req, res) => {
    const input = faceEnrollmentSchema.parse(req.body);
    await store.enroll(String(req.params.employeeId), input.descriptor, res.locals.faceActor.userId);
    res.json({ enrolled: true });
  }));
  app.delete("/api/owner/face-attendance/enrollment/:employeeId", handler(async (req, res) => {
    await store.revoke(String(req.params.employeeId));
    res.json({ enrolled: false });
  }));
  app.post("/api/owner/face-attendance/reviews/:id", handler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const input = faceReviewSchema.parse(req.body);
    await store.review(id, input.decision, res.locals.faceActor.userId);
    res.json({ decision: input.decision });
  }));
}
