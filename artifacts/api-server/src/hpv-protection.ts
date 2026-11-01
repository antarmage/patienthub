import type { Express, Request, Response } from "express";
import type { AccessActor } from "./clinical-access";

export type HpvClinicStatus = "protected" | "in-progress";

type ScheduleLike = {
  id: number;
  vaccineName: string;
  eligibility: string;
  doseOffsetsMonths: unknown;
  doseGestationalWeeks: unknown;
};
type RecordLike = { patientId: number; scheduleId: number; doseNumber: number };

const doseCount = (schedule: ScheduleLike) => {
  const doses = schedule.eligibility === "pregnancy" ? schedule.doseGestationalWeeks : schedule.doseOffsetsMonths;
  return Array.isArray(doses) ? doses.length : 0;
};

// The legacy "protected" status means all scheduled doses are recorded, not immunity.
export function hpvClinicStatuses(
  patientIds: number[],
  schedules: ScheduleLike[],
  records: RecordLike[],
): Record<number, HpvClinicStatus> {
  const hpvSchedules = new Map(schedules.filter((s) => /hpv/i.test(s.vaccineName)).map((s) => [s.id, s]));
  const wanted = new Set(patientIds);
  const doses = new Map<number, Map<number, Set<number>>>();
  for (const record of records) {
    if (!wanted.has(record.patientId) || !hpvSchedules.has(record.scheduleId)) continue;
    const bySchedule = doses.get(record.patientId) ?? new Map<number, Set<number>>();
    const set = bySchedule.get(record.scheduleId) ?? new Set<number>();
    set.add(record.doseNumber);
    bySchedule.set(record.scheduleId, set);
    doses.set(record.patientId, bySchedule);
  }
  const result: Record<number, HpvClinicStatus> = {};
  for (const [patientId, bySchedule] of doses) {
    const complete = [...bySchedule].some(([scheduleId, set]) => {
      const total = doseCount(hpvSchedules.get(scheduleId)!);
      return total > 0 && Array.from({ length: total }, (_, i) => i + 1).every((n) => set.has(n));
    });
    result[patientId] = complete ? "protected" : "in-progress";
  }
  return result;
}

export function registerHpvStatusRoute(app: Express, dependencies: {
  authenticate(req: Request, res: Response): Promise<AccessActor | null>;
  clinicStatuses(ids: number[]): Promise<Record<number, HpvClinicStatus>>;
  surveyAnswers(ids: number[]): Promise<{ id: number; answer: string | null }[]>;
}) {
  app.get("/api/hpv-protection", async (req, res) => {
    const actor = await dependencies.authenticate(req, res);
    if (!actor) {
      if (!res.headersSent) res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!("role" in actor) || !["staff", "receptionist", "clinician", "owner", "admin"].includes(actor.role)) {
      return res.status(403).json({ error: "Staff access required" });
    }
    const raw = req.query.patientIds;
    if (typeof raw !== "string" || !/^[1-9]\d*(?:,[1-9]\d*)*$/.test(raw)) return res.status(400).json({ error: "Valid patientIds are required" });
    const ids = [...new Set(raw.split(",").map(Number))];
    if (ids.length > 500 || ids.some((id) => !Number.isSafeInteger(id))) return res.status(400).json({ error: "Request up to 500 valid patient IDs" });
    const [statuses, answers] = await Promise.all([dependencies.clinicStatuses(ids), dependencies.surveyAnswers(ids)]);
    for (const { id, answer } of answers) {
      if (!ids.includes(id)) continue;
      if (answer?.trim() === "Yes, all doses") statuses[id] = "protected";
      else if (answer?.trim() === "Yes, some doses" && !statuses[id]) statuses[id] = "in-progress";
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.json(Object.fromEntries(ids.filter((id) => statuses[id]).map((id) => [id, statuses[id]])));
  });
}
