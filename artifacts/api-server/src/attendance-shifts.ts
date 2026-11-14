import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import { attendanceShiftSchema, attendanceTiming, type AttendanceShift } from "../../../lib/db/src/attendance-timing";
import type { AccessActor } from "./clinical-access";
import { isReceptionReader } from "./reception-access";

type ShiftEmployee = AttendanceShift & { id: string; name: string };
export interface AttendanceShiftStore {
  employees(): Promise<ShiftEmployee[]>;
  get(employeeId: string): Promise<AttendanceShift | null>;
  save(employeeId: string, shift: AttendanceShift, ownerId: string): Promise<boolean>;
}
const staffRoles = ["staff", "receptionist", "nurse", "clinician", "owner", "admin"];

export async function ensureAttendanceShiftSchema(client: Pick<PoolClient, "query">) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS staff_attendance_shifts (
      employee_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      shift_start text CHECK (shift_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
      grace_minutes integer NOT NULL CHECK (grace_minutes BETWEEN 0 AND 1440),
      updated_by varchar NOT NULL REFERENCES users(id)
    );
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_start text;
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS grace_minutes integer;
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_minutes integer;
  `);
}

export async function readAttendanceTiming(client: Pick<PoolClient, "query">, employeeId: string, date: string, clockIn: string | null) {
  const shift = (await client.query<AttendanceShift>(
    'SELECT shift_start AS "shiftStart", grace_minutes AS "graceMinutes" FROM staff_attendance_shifts WHERE employee_id=$1',
    [employeeId],
  )).rows[0];
  return attendanceTiming(date, clockIn, shift || null);
}

export function createAttendanceShiftStore(pool: Pool): AttendanceShiftStore {
  return {
    async employees() {
      return (await pool.query<ShiftEmployee>(`
        SELECT u.id,coalesce(nullif(u.display_name,''),u.username) AS name,
          s.shift_start AS "shiftStart",coalesce(s.grace_minutes,0) AS "graceMinutes"
        FROM users u LEFT JOIN staff_attendance_shifts s ON s.employee_id=u.id
        WHERE u.role=ANY($1::text[]) ORDER BY name
      `, [staffRoles])).rows;
    },
    async get(employeeId) {
      return (await pool.query<AttendanceShift>(`
        SELECT shift_start AS "shiftStart",grace_minutes AS "graceMinutes"
        FROM staff_attendance_shifts WHERE employee_id=$1
      `, [employeeId])).rows[0] || null;
    },
    async save(employeeId, shift, ownerId) {
      return !!(await pool.query(`
        INSERT INTO staff_attendance_shifts(employee_id,shift_start,grace_minutes,updated_by)
        SELECT id,$2,$3,$4 FROM users WHERE id=$1 AND role=ANY($5::text[])
        ON CONFLICT(employee_id) DO UPDATE SET shift_start=EXCLUDED.shift_start,
          grace_minutes=EXCLUDED.grace_minutes,updated_by=EXCLUDED.updated_by
        RETURNING employee_id
      `, [employeeId, shift.shiftStart, shift.graceMinutes, ownerId, staffRoles])).rowCount;
    },
  };
}

export function registerAttendanceShiftRoutes(app: Express, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>, store: AttendanceShiftStore) {
  for (const [base, owner] of [["/api/owner/attendance-shifts", true], ["/api/staff/attendance-shift", false]] as const) {
    app.use(base, async (req, res, next) => {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Sign in to view attendance shifts." }); return; }
      if (!("userId" in actor) || (owner ? actor.role !== "owner" : !isReceptionReader(actor))) {
        res.status(403).json({ error: owner ? "Owner access required." : "Receptionist access required." }); return;
      }
      res.locals.shiftActor = actor;
      res.set("Cache-Control", "private, no-store");
      next();
    });
  }
  app.get("/api/owner/attendance-shifts", async (_req, res) => { res.json({ employees: await store.employees() }); });
  app.get("/api/staff/attendance-shift", async (_req, res) => { res.json({ shift: await store.get(res.locals.shiftActor.userId) }); });
  app.put("/api/owner/attendance-shifts/:id", async (req, res) => {
    const parsed = attendanceShiftSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Set a shift start in HH:MM (IST) and a whole-number grace period from 0 to 1440 minutes." }); return; }
    if (!await store.save(String(req.params.id), parsed.data, res.locals.shiftActor.userId)) {
      res.status(404).json({ error: "Staff account not found." }); return;
    }
    res.json({ saved: true });
  });
}
