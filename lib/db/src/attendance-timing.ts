import { z } from "zod/v4";

export const attendanceShiftSchema = z.object({
  shiftStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  graceMinutes: z.number().int().min(0).max(1440),
}).strict();

export type AttendanceShift = z.infer<typeof attendanceShiftSchema>;
export type AttendanceTiming = {
  shiftStart: string | null;
  graceMinutes: number | null;
  lateMinutes: number | null;
};

export function attendanceTiming(date: string, clockIn: string | null | undefined, shift: AttendanceShift | null): AttendanceTiming {
  if (!clockIn || !shift?.shiftStart) return { shiftStart: null, graceMinutes: null, lateMinutes: null };
  const parsed = attendanceShiftSchema.parse({ shiftStart: shift.shiftStart, graceMinutes: shift.graceMinutes });
  const expected = Date.parse(`${date}T${parsed.shiftStart}:00+05:30`);
  const actual = Date.parse(clockIn);
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) throw new Error("Cannot calculate attendance timing from an invalid date or clock-in.");
  const delay = actual - expected;
  return {
    shiftStart: parsed.shiftStart,
    graceMinutes: parsed.graceMinutes,
    lateMinutes: delay > parsed.graceMinutes * 60_000 ? Math.ceil(delay / 60_000) : 0,
  };
}

export function attendanceTimingLabel(minutes: number | null | undefined) {
  return minutes == null ? "Late tracking not configured" : minutes > 0 ? `Late by ${minutes} ${minutes === 1 ? "minute" : "minutes"}` : "On time";
}
