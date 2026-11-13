import type { Express, Request, Response } from "express";
import { z } from "zod/v4";
import { clinicDate } from "../../../lib/db/src/follow-up";
import type { Attendance, InsertAttendance } from "../../../lib/db/src/schema/schema";
import type { AccessActor } from "./clinical-access";

type Actor = Extract<AccessActor, { userId: string }>;
type AttendanceAction = "clock_in" | "clock_out" | "regular_day_off" | "leave" | "work_day";
export interface StaffAttendanceStore {
  list(employeeId: string, startDate: string, endDate: string): Promise<Attendance[]>;
  save(record: InsertAttendance): Promise<Attendance>;
}

const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }),
  action: z.enum(["clock_in", "clock_out", "regular_day_off", "leave", "work_day"]),
}).strict();

export function attendanceWeek(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const mondayOffset = (parsed.getUTCDay() + 6) % 7;
  const start = new Date(parsed);
  start.setUTCDate(start.getUTCDate() - mondayOffset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function registerStaffAttendanceRoutes(
  app: Express,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
  store: StaffAttendanceStore,
  staffName: (userId: string) => Promise<string>,
) {
  app.use("/api/staff/attendance", async (req, res, next) => {
    const actor = await authenticate(req, res);
    if (!actor) return;
    if (!("userId" in actor)) {
      res.status(403).json({ error: "Receptionist attendance access required." });
      return;
    }
    if (actor.role !== "receptionist") {
      res.status(403).json({ error: "Receptionist attendance access required." });
      return;
    }
    res.locals.attendanceActor = actor;
    next();
  });

  app.get("/api/staff/attendance", async (req, res) => {
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : "";
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : "";
    const week = attendanceWeek(clinicDate());
    if (startDate !== week.start || endDate !== week.end) {
      res.status(400).json({ error: "Attendance can only be viewed for the current week." });
      return;
    }
    const actor: Actor = res.locals.attendanceActor;
    res.set("Cache-Control", "no-store").json(await store.list(actor.userId, week.start, week.end));
  });

  app.post("/api/staff/attendance", async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") });
      return;
    }
    const actor: Actor = res.locals.attendanceActor;
    const today = clinicDate();
    const week = attendanceWeek(today);
    const { date, action } = parsed.data;
    if (date < week.start || date > week.end) {
      res.status(400).json({ error: "Attendance updates must be within the current week." });
      return;
    }
    if ((action === "clock_in" || action === "clock_out") && date !== today) {
      res.status(400).json({ error: "Clock-in and clock-out are only available for today." });
      return;
    }
    if (action !== "clock_in" && action !== "clock_out" && date < today) {
      res.status(400).json({ error: "Past attendance cannot be changed." });
      return;
    }

    const existing = (await store.list(actor.userId, date, date))[0];
    if (action === "regular_day_off") {
      const anotherDayOff = (await store.list(actor.userId, week.start, week.end))
        .some((record) => record.date !== date && record.status === "regular_day_off");
      if (anotherDayOff) {
        res.status(409).json({ error: "Only one regular day off can be recorded per week. Change the existing day off first." });
        return;
      }
    }
    const now = new Date().toISOString();
    let record: InsertAttendance;
    if (action === "clock_in") {
      if (existing?.clockIn) {
        res.status(409).json({ error: "You have already clocked in today." });
        return;
      }
      if (existing?.status === "leave" || existing?.status === "regular_day_off") {
        res.status(409).json({ error: "Change this day to a work day before clocking in." });
        return;
      }
      record = {
        employeeId: actor.userId, employeeName: await staffName(actor.userId), role: "Receptionist",
        date, clockIn: now, clockOut: null, status: "present", hoursWorked: null,
      };
    } else if (action === "clock_out") {
      if (!existing?.clockIn || existing.clockOut) {
        res.status(409).json({ error: "Clock in first; clock out can only be recorded once." });
        return;
      }
      const hoursWorked = Math.max(0, (Date.parse(now) - Date.parse(existing.clockIn)) / 3_600_000);
      record = {
        employeeId: actor.userId, employeeName: existing.employeeName, role: existing.role,
        date, clockIn: existing.clockIn, clockOut: now, status: "present",
        hoursWorked: Math.round(hoursWorked * 100) / 100, notes: existing.notes,
      };
    } else {
      if (existing?.clockIn) {
        res.status(409).json({ error: "A day with a clock-in cannot be changed to leave or a day off." });
        return;
      }
      const status = action === "regular_day_off" ? "regular_day_off" : action === "leave" ? "leave" : "scheduled";
      record = {
        employeeId: actor.userId, employeeName: await staffName(actor.userId), role: "Receptionist",
        date, clockIn: null, clockOut: null, status, hoursWorked: null,
      };
    }
    res.json(await store.save(record));
  });
}
