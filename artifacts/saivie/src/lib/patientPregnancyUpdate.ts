import { localDateKey } from "@/lib/patientHealthRecord";

export const PREGNANCY_INACTIVITY_DAYS = 14;
export type PatientPregnancyUpdateAction = "baby-arrived" | "pregnancy-loss" | "no-longer-pregnant";

function validDateKey(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value;
}

export function shouldShowPregnancyCheckin(
  dueDate: string | null | undefined,
  lastLoggedDate: string | null | undefined,
  now = new Date(),
): boolean {
  const today = localDateKey(now);
  if (validDateKey(dueDate) && dueDate <= today) return true;
  if (!validDateKey(lastLoggedDate)) return false;
  const elapsedDays = Math.floor(
    (new Date(`${today}T00:00:00`).getTime() - new Date(`${lastLoggedDate}T00:00:00`).getTime()) / 86400000,
  );
  return elapsedDays >= PREGNANCY_INACTIVITY_DAYS;
}

export function postpartumWeek(startDate: string | null | undefined, now = new Date()): number | null {
  if (!validDateKey(startDate)) return null;
  const today = localDateKey(now);
  const elapsedDays = Math.floor(
    (new Date(`${today}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000,
  );
  return elapsedDays < 0 ? 1 : Math.floor(elapsedDays / 7) + 1;
}

export function postpartumStartStorageKey(patientId: string | number): string {
  return `saiviePatientPostpartumStart:${patientId}`;
}

export function savePostpartumStartDate(
  storage: Pick<Storage, "setItem">,
  patientId: string | number,
  date: string,
): void {
  storage.setItem(postpartumStartStorageKey(patientId), date);
}

export function getPostpartumStartDate(
  storage: Pick<Storage, "getItem">,
  patientId: string | number,
): string | null {
  const date = storage.getItem(postpartumStartStorageKey(patientId));
  return validDateKey(date) ? date : null;
}
