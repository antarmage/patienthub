import { useQuery } from "@tanstack/react-query";
import { receptionRequest } from "./authenticatedFetch";

export interface ReceptionAccess {
  clinicalDetailsVisible: boolean;
  canRecordVitals: boolean;
}

export async function fetchReceptionAccess(signal?: AbortSignal): Promise<ReceptionAccess> {
  const body = await receptionRequest<unknown>("/api/clinic/reception-access", { signal });
  if (!body || typeof body !== "object" ||
      !("clinicalDetailsVisible" in body) || typeof body.clinicalDetailsVisible !== "boolean" ||
      !("canRecordVitals" in body) || typeof body.canRecordVitals !== "boolean") {
    throw new Error("The clinic access API returned invalid settings.");
  }
  return { clinicalDetailsVisible: body.clinicalDetailsVisible, canRecordVitals: body.canRecordVitals };
}

export function useReceptionAccess(enabled = true) {
  return useQuery({
    queryKey: ["/api/clinic/reception-access"],
    queryFn: ({ signal }) => fetchReceptionAccess(signal),
    enabled,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    retry: false,
  });
}
