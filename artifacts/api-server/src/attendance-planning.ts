import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import { z } from "zod/v4";
import { planningLastDate, timeOffInputSchema, type TimeOffInput, type TimeOffRequest } from "../../../lib/db/src/attendance-planning";
import { clinicDate } from "../../../lib/db/src/follow-up";
import type { AccessActor } from "./clinical-access";
import { isReceptionReader } from "./reception-access";
import { attendanceWeek } from "./staff-attendance";

export class AttendancePlanningError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export interface AttendancePlanningStore {
  list(employeeId?: string): Promise<TimeOffRequest[]>;
  apply(employeeId: string, input: TimeOffInput): Promise<void>;
  cancel(employeeId: string, id: number): Promise<void>;
  review(ownerId: string, id: number, decision: "approved" | "rejected" | "cancelled", note: string): Promise<void>;
}
type PlannedAttendance = { date: string; status: string | null; clockIn: string | null };

export function validateTimeOff(input: TimeOffInput, records: PlannedAttendance[], requests: TimeOffRequest[], today: string) {
  if (input.startDate < today || input.endDate > planningLastDate(today)) {
    throw new AttendancePlanningError(400, "Choose dates from today through the next three months.");
  }
  if (records.some((row) => row.date >= input.startDate && row.date <= input.endDate &&
    (row.clockIn || ["clinic_closed", "pending_approval", "leave", "regular_day_off", "half-day"].includes(row.status || "")))) {
    throw new AttendancePlanningError(409, "A selected date is closed, already started, awaiting attendance approval, or already approved as time off. Choose other dates.");
  }
  if (requests.some((row) => row.decision === "pending" && row.startDate <= input.endDate && row.endDate >= input.startDate)) {
    throw new AttendancePlanningError(409, "You already have a pending application for a selected date.");
  }
  if (input.kind === "weekly_off") {
    const week = attendanceWeek(input.startDate);
    if (records.some((row) => row.status === "regular_day_off" && row.date >= week.start && row.date <= week.end) ||
      requests.some((row) => row.kind === "weekly_off" && row.decision === "pending" && row.startDate >= week.start && row.startDate <= week.end)) {
      throw new AttendancePlanningError(409, "Only one approved or pending weekly off is allowed per week.");
    }
  }
}

export async function ensureAttendancePlanningSchema(client: Pick<PoolClient, "query">) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS staff_time_off_requests (
      id serial PRIMARY KEY,
      employee_id varchar NOT NULL REFERENCES users(id),
      kind text NOT NULL CHECK (kind IN ('leave','weekly_off')),
      start_date date NOT NULL,
      end_date date NOT NULL CHECK (end_date >= start_date),
      period text NOT NULL CHECK (period IN ('full_day','morning','afternoon')),
      reason text NOT NULL,
      decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected','cancelled')),
      requested_at timestamptz NOT NULL DEFAULT now(),
      reviewed_by varchar REFERENCES users(id),
      reviewed_at timestamptz,
      review_note text,
      CHECK (kind <> 'weekly_off' OR (start_date = end_date AND period = 'full_day'))
    );
    CREATE INDEX IF NOT EXISTS staff_time_off_employee_idx ON staff_time_off_requests(employee_id,start_date,end_date);
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS time_off_period text CHECK (time_off_period IN ('morning','afternoon'));
  `);
}

const requestSelect = `SELECT r.id,r.employee_id AS "employeeId",
  coalesce(nullif(u.display_name,''),u.username) AS "employeeName",r.kind,
  r.start_date::text AS "startDate",r.end_date::text AS "endDate",r.period,r.reason,r.decision,
  r.requested_at::text AS "requestedAt",r.reviewed_at::text AS "reviewedAt",r.review_note AS "reviewNote"
  FROM staff_time_off_requests r JOIN users u ON u.id=r.employee_id`;

export function createAttendancePlanningStore(pool: Pool): AttendancePlanningStore {
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
  async function validate(tx: PoolClient, employeeId: string, input: TimeOffInput, exceptId?: number) {
    validateTimeOff(input, [], [], clinicDate());
    const start = attendanceWeek(input.startDate).start;
    const end = attendanceWeek(input.endDate).end;
    const records = (await tx.query<PlannedAttendance>(
      'SELECT date::text AS date,status,clock_in AS "clockIn" FROM attendance WHERE employee_id=$1 AND date BETWEEN $2 AND $3 FOR UPDATE',
      [employeeId, start, end],
    )).rows;
    const requests = (await tx.query<TimeOffRequest>(`${requestSelect}
      WHERE r.employee_id=$1 AND r.decision='pending' AND r.start_date <= $3 AND r.end_date >= $2
        AND ($4::integer IS NULL OR r.id <> $4)`, [employeeId, start, end, exceptId ?? null])).rows;
    validateTimeOff(input, records, requests, clinicDate());
  }
  async function find(id: number) {
    const row = (await pool.query<TimeOffRequest>(`${requestSelect} WHERE r.id=$1`, [id])).rows[0];
    if (!row) throw new AttendancePlanningError(404, "Application not found.");
    return row;
  }
  return {
    async list(employeeId) {
      return (await pool.query<TimeOffRequest>(`${requestSelect}
        WHERE ($1::varchar IS NULL OR r.employee_id=$1)
        ORDER BY (r.decision='pending') DESC,r.requested_at DESC`, [employeeId ?? null])).rows;
    },
    async apply(employeeId, input) {
      await transaction(employeeId, async (tx) => {
        await validate(tx, employeeId, input);
        await tx.query(`INSERT INTO staff_time_off_requests(employee_id,kind,start_date,end_date,period,reason)
          VALUES($1,$2,$3,$4,$5,$6)`, [employeeId, input.kind, input.startDate, input.endDate, input.period, input.reason]);
      });
    },
    async cancel(employeeId, id) {
      await transaction(employeeId, async (tx) => {
        const changed = await tx.query(`UPDATE staff_time_off_requests SET decision='cancelled',reviewed_at=now()
          WHERE id=$1 AND employee_id=$2 AND decision='pending' RETURNING id`, [id, employeeId]);
        if (!changed.rowCount) throw new AttendancePlanningError(409, "Only your own pending applications can be withdrawn. Refresh the list.");
      });
    },
    async review(ownerId, id, decision, note) {
      const found = await find(id);
      await transaction(found.employeeId, async (tx) => {
        const row = (await tx.query<TimeOffRequest>(`${requestSelect} WHERE r.id=$1 FOR UPDATE OF r`, [id])).rows[0];
        if (!row || row.decision !== (decision === "cancelled" ? "approved" : "pending")) {
          throw new AttendancePlanningError(409, "This application has already changed. Refresh the list.");
        }
        if (decision === "cancelled") {
          if (row.startDate < clinicDate()) throw new AttendancePlanningError(409, "Approved time off that has already started cannot be cancelled.");
          const dates = (await tx.query<{ date: string; status: string; clockIn: string | null; notes: string | null }>(
            'SELECT date::text AS date,status,clock_in AS "clockIn",notes FROM attendance WHERE employee_id=$1 AND date BETWEEN $2 AND $3 FOR UPDATE',
            [row.employeeId, row.startDate, row.endDate],
          )).rows;
          const expectedDays = (Date.parse(row.endDate) - Date.parse(row.startDate)) / 86400000 + 1;
          const expectedStatus = row.kind === "weekly_off" ? "regular_day_off" : row.period === "full_day" ? "leave" : "half-day";
          if (dates.length !== expectedDays || dates.some((date) => date.clockIn || date.status !== expectedStatus || date.notes !== `Time-off application #${id} approved by owner.`)) {
            throw new AttendancePlanningError(409, "Attendance has changed or a selected day has started. Approved time off cannot be cancelled.");
          }
          await tx.query(`UPDATE attendance SET status='scheduled',time_off_period=NULL,notes=$4
            WHERE employee_id=$1 AND date BETWEEN $2 AND $3`,
          [row.employeeId, row.startDate, row.endDate, `Time-off application #${id} cancelled by owner.`]);
        }
        if (decision === "approved") {
          await validate(tx, row.employeeId, row, id);
          const status = row.kind === "weekly_off" ? "regular_day_off" : row.period === "full_day" ? "leave" : "half-day";
          const saved = await tx.query(`INSERT INTO attendance(employee_id,employee_name,role,date,status,time_off_period,notes)
            SELECT u.id,coalesce(nullif(u.display_name,''),u.username),'Receptionist',d::date,$4,$5,$6
            FROM users u CROSS JOIN generate_series($2::date,$3::date,'1 day'::interval) d
            WHERE u.id=$1 AND u.role IN ('staff','receptionist')
            ON CONFLICT(employee_id,date) DO UPDATE SET status=EXCLUDED.status,time_off_period=EXCLUDED.time_off_period,
              notes=EXCLUDED.notes,clock_in=NULL,clock_out=NULL,hours_worked=NULL,late_minutes=NULL
            RETURNING id`, [row.employeeId, row.startDate, row.endDate, status,
            row.period === "full_day" ? null : row.period, `Time-off application #${id} approved by owner.`]);
          if (!saved.rowCount) throw new AttendancePlanningError(409, "Receptionist account is no longer available.");
        }
        await tx.query(`UPDATE staff_time_off_requests SET decision=$2,reviewed_by=$3,reviewed_at=now(),review_note=$4 WHERE id=$1`,
          [id, decision, ownerId, note || null]);
      });
    },
  };
}

export function registerAttendancePlanningRoutes(app: Express, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>, store: AttendancePlanningStore) {
  for (const [base, owner] of [["/api/staff/time-off", false], ["/api/owner/time-off", true]] as const) {
    app.use(base, async (req, res, next) => {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Sign in to manage time-off applications." }); return; }
      if (!("userId" in actor) || (owner ? actor.role !== "owner" : !isReceptionReader(actor))) {
        res.status(403).json({ error: owner ? "Owner access required." : "Receptionist access required." }); return;
      }
      res.locals.timeOffActor = actor;
      res.set("Cache-Control", "private, no-store");
      next();
    });
    app.get(base, async (_req, res) => { res.json({ requests: await store.list(owner ? undefined : res.locals.timeOffActor.userId) }); });
  }
  const run = async (res: Response, work: () => Promise<void>) => {
    try { await work(); res.json({ saved: true }); }
    catch (error) {
      if (error instanceof AttendancePlanningError) { res.status(error.status).json({ error: error.message }); return; }
      throw error;
    }
  };
  app.post("/api/staff/time-off", async (req, res) => {
    const parsed = timeOffInputSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") }); return; }
    await run(res, () => store.apply(res.locals.timeOffActor.userId, parsed.data));
  });
  app.post("/api/staff/time-off/:id/withdraw", async (req, res) => {
    const id = z.coerce.number().int().positive().safeParse(req.params.id);
    if (!id.success) { res.status(400).json({ error: "Invalid application ID." }); return; }
    await run(res, () => store.cancel(res.locals.timeOffActor.userId, id.data));
  });
  app.post("/api/owner/time-off/:id/review", async (req, res) => {
    const id = z.coerce.number().int().positive().safeParse(req.params.id);
    const input = z.object({ decision: z.enum(["approved", "rejected", "cancelled"]), note: z.string().trim().max(1000) }).strict().safeParse(req.body);
    if (!id.success || !input.success) { res.status(400).json({ error: "Choose approve, reject, or cancel approval and a review note of at most 1000 characters." }); return; }
    await run(res, () => store.review(res.locals.timeOffActor.userId, id.data, input.data.decision, input.data.note));
  });
}
