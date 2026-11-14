import type { Express, Request, Response } from "express";
import type { AccessActor } from "./clinical-access";
import { isReceptionReader } from "./reception-access";
import { attendanceInsightRecordSchema, attendanceMonthDays, attendanceMonthSchema, type AttendanceInsightRecord } from "../../../lib/db/src/attendance-insights";

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
      const month = attendanceMonthSchema.safeParse(req.query.month);
      if (!month.success) { res.status(400).json({ error: "Choose a valid month in YYYY-MM format." }); return; }
      const { start, end } = attendanceMonthDays(month.data);
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
