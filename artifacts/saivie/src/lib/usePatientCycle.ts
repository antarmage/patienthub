import { useQuery } from "@tanstack/react-query";
import { estimateCyclePhase, localDemoCycleSample } from "./patientGreeting";

type CyclePatient = {
  id?: number | string;
  name?: string | null;
  lmp?: string | null;
  cycleLength?: number | string | null;
  history?: {
    onboarding?: { cycle?: { regularity?: string; cycleLength?: number | string | null; lastPeriod?: string | null } };
    patientReportedLmp?: { value?: string | null };
  } | null;
};

export function usePatientCycle(patient: CyclePatient | null | undefined, enabled: boolean) {
  const patientId = Number(patient?.id);
  const periodQuery = useQuery<{ value?: { date?: string | null } | null }>({
    queryKey: ["/api/patients", patientId, "period-prompt"],
    enabled: enabled && Number.isSafeInteger(patientId) && patientId > 0,
  });
  const onboardingCycle = patient?.history?.onboarding?.cycle;
  const regularity = typeof onboardingCycle?.regularity === "string" ? onboardingCycle.regularity : "";
  const recordedLmp = patient?.lmp || periodQuery.data?.value?.date || onboardingCycle?.lastPeriod
    || patient?.history?.patientReportedLmp?.value || null;
  const recordedLength = patient?.cycleLength ?? onboardingCycle?.cycleLength;
  const hasLength = recordedLength !== null && recordedLength !== undefined && String(recordedLength).trim() !== "";
  const sample = periodQuery.isFetched && !/irregular|unpredictable/i.test(regularity) &&
    (!recordedLmp || !hasLength)
    ? localDemoCycleSample(patient?.name, typeof window === "undefined" ? "" : window.location.hostname)
    : null;
  const lmp = recordedLmp || sample?.lmp || null;
  const cycleLength = hasLength ? recordedLength : sample?.cycleLength;
  const phase = enabled && !/irregular|unpredictable/i.test(regularity)
    ? estimateCyclePhase(lmp, cycleLength)
    : null;

  return { lmp, cycleLength, regularity, phase, usingDemoSample: Boolean(sample), periodQuery };
}
