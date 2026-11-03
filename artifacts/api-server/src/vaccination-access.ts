import type { AccessActor } from "./clinical-access";

type StaffActor = Extract<AccessActor, { userId: string }>;

export function canUseVaccinationWorkflow(actor: AccessActor | null): actor is StaffActor {
  return Boolean(actor && "role" in actor && ["clinician", "owner", "receptionist", "staff"].includes(actor.role));
}

export function canManageVaccinationSchedules(actor: AccessActor | null): actor is StaffActor {
  return Boolean(actor && "role" in actor && ["clinician", "owner"].includes(actor.role));
}
