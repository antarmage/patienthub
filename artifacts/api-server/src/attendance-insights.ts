import type { Express, Request, Response } from "express";
import type { AccessActor } from "./clinical-access";
import { isReceptionReader } from "./reception-access";
import { attendanceInsightRecordSchema, attendanceMonthDays, attendanceMonthSchema, attendanceYearDays, attendanceYearSchema, type AttendanceInsightRecord } from "../../../lib/db/src/attendance-insights";

interface InsightStore {
  staff(employeeId: string, start: string, end: string): Promise<AttendanceInsightRecord[]>;
  all(start: string, end: string): Promise<AttendanceInsightRecord[]>;
  employees(): Promise<{ id: string; name: string }[]>;
}

export function registerAttendanceInsightsRoutes(
  app: Express,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
  store: InsightStore,
) {
  for (const [url, owner] of [["/api/staff/attendance-insights", false], ["/api/owner/attendance-insights", true]] as const) {
    app.get(url, async (req, res) => {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Sign in to view attendance insights." }); return; }
      if (!("userId" in actor) || (owner ? actor.role !== "owner" : !isReceptionReader(actor))) {
        res.status(403).json({ error: owner ? "Owner access required." : "Receptionist access required." }); return;
      }
      if (req.query.year !== undefined && req.query.month !== undefined) {
        res.status(400).json({ error: "Choose either a year or a month, not both." }); return;
      }
      const period = req.query.year !== undefined
        ? attendanceYearSchema.safeParse(req.query.year)
        : attendanceMonthSchema.safeParse(req.query.month);
      if (!period.success) { res.status(400).json({ error: "Choose a valid year in YYYY format or month in YYYY-MM format." }); return; }
      const { start, end } = req.query.year !== undefined ? attendanceYearDays(period.data) : attendanceMonthDays(period.data);
      res.set("Cache-Control", "private, no-store");
      if (owner) {
        const [employees, records] = await Promise.all([store.employees(), store.all(start, end)]);
        res.json({ employees, records: records.map((record) => attendanceInsightRecordSchema.parse(record)) });
      } else {
        const records = await store.staff(actor.userId, start, end);
        res.json({ records: records.map((record) => attendanceInsightRecordSchema.parse(record)) });
      }
    });
  }
}
