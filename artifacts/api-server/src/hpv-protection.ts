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

// A patient is protected once every dose of any one HPV schedule is recorded by the clinic.
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
