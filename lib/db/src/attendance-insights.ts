import { z } from "zod/v4";

export const attendanceMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine((month) => !month.startsWith("0000"), "Choose a valid month.");

export function attendanceMonthDays(value: string) {
  const month = attendanceMonthSchema.parse(value);
  const start = `${month}-01`;
  const last = new Date(`${start}T00:00:00Z`);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  return {
    start,
    end: last.toISOString().slice(0, 10),
    offset: (new Date(`${start}T00:00:00Z`).getUTCDay() + 6) % 7,
    dates: Array.from({ length: last.getUTCDate() }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`),
  };
}

export const attendanceInsightRecordSchema = z.object({
  employeeId: z.string().nullable(),
  employeeName: z.string(),
  date: z.string(),
  status: z.string().nullable(),
});

export type AttendanceInsightRecord = z.infer<typeof attendanceInsightRecordSchema>;

export function attendanceInsightStatus(status: string | null | undefined) {
  switch (status) {
    case "present": return { label: "Present", color: "bg-emerald-500" };
    case "half-day": return { label: "Half day", color: "bg-emerald-300" };
    case "regular_day_off": return { label: "Weekly off", color: "bg-orange-400" };
    case "leave": return { label: "Leave", color: "bg-red-500" };
    case "pending_approval": return { label: "Pending approval", color: "bg-violet-400" };
    case "rejected": return { label: "Request rejected", color: "bg-slate-500" };
    case "absent": return { label: "Absent", color: "bg-slate-700" };
    case "scheduled": return { label: "Scheduled work day", color: "bg-gray-200" };
    default: return { label: status ? `Other: ${status}` : "Not recorded", color: "bg-gray-200" };
  }
}
