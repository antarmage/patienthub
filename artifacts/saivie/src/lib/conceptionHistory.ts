export const conceptionMethods = [
  "Spontaneous / natural conception", "Ovulation induction / timed intercourse",
  "IUI", "IVF / ICSI", "Other", "Not known / not recorded",
] as const;

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function conceptionHistory(history: unknown, lmp: string | undefined, appointmentId?: number) {
  const root = record(history);
  const saved = record(root.conception);
  const intake = record(root.onboarding);
  const pregnancy = record(intake.pregnancies);
  const cycle = record(intake.cycle);
  const retainedPatient = record(root.patientConception);
  const samePregnancy = (savedLmp: unknown, savedAppointment: unknown) =>
    Boolean(lmp && savedLmp === lmp) ||
    Boolean(!lmp && !savedLmp && appointmentId && String(savedAppointment) === String(appointmentId));
  const clinician = saved.source === "Clinician" && samePregnancy(saved.lmp, saved.appointmentId);
  const patient = pregnancy.currentStatus === "Yes" && conceptionMethods.some((method) => method === pregnancy.conceptionMethod) &&
    (Boolean(appointmentId && String(root.onboardingAppointmentId) === String(appointmentId)) ||
      Boolean(lmp && cycle.lastPeriod === lmp));
  const retained = samePregnancy(retainedPatient.lmp, retainedPatient.appointmentId);
  const data = clinician ? saved : patient ? pregnancy : retained ? retainedPatient : {};
  const method = conceptionMethods.find((method) => method === data.conceptionMethod) || "";
  return {
    method,
    details: typeof data.conceptionDetails === "string" ? data.conceptionDetails : "",
    source: method ? clinician ? "Clinician" : "Patient-reported" : "",
  };
}
