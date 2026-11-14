export const STAFF_SESSION_IDLE_MS = 60 * 60 * 1000;
const clinicOffsetMs = 330 * 60 * 1000;

export function clinicWorkingHours(now: number): boolean {
  const local = new Date(now + clinicOffsetMs);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  return minutes >= 510 && minutes < 1230;
}

export function staffSessionExpiry(now: number): number {
  const local = new Date(now + clinicOffsetMs);
  const opening = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 8, 30) - clinicOffsetMs;
  const idleExpiry = now + STAFF_SESSION_IDLE_MS;
  if (!clinicWorkingHours(now) && !(now < opening && idleExpiry >= opening)) return idleExpiry;
  const closing = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 20, 30) - clinicOffsetMs;
  return closing + STAFF_SESSION_IDLE_MS;
}
