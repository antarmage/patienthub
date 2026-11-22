export const patientPortalModes = ["general", "pregnancy", "postpartum", "menopause", "ttc", "ivf"] as const;

export type PatientPortalMode = (typeof patientPortalModes)[number];
export type PatientStage = "periods" | "pregnancy" | "postpartum" | "menopause";
export type PatientStageMode = Extract<PatientPortalMode, "general" | "pregnancy" | "postpartum" | "menopause">;
export type FertilitySupportMode = Extract<PatientPortalMode, "ttc" | "ivf">;

export function isPatientPortalMode(mode: string | null): mode is PatientPortalMode {
  return mode !== null && patientPortalModes.includes(mode as PatientPortalMode);
}

export function patientStageForMode(mode: PatientPortalMode): PatientStage {
  if (mode === "pregnancy" || mode === "postpartum" || mode === "menopause") return mode;
  return "periods";
}

export function patientStageStorageKey(patientId: string | number): string {
  return `saiviePatientStage:${patientId}`;
}

export function getSavedPatientMode(
  storage: Pick<Storage, "getItem">,
  patientId: string | number,
): PatientPortalMode | null {
  const savedMode = storage.getItem(patientStageStorageKey(patientId));
  return isPatientPortalMode(savedMode) ? savedMode : null;
}

export function savePatientMode(
  storage: Pick<Storage, "setItem">,
  patientId: string | number,
  mode: PatientPortalMode,
): void {
  storage.setItem(patientStageStorageKey(patientId), mode);
}
