import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { authenticatedFetch, readApiResponse } from "./authenticatedFetch";
import { readOnboardingSession } from "./onboardingResponse";

export function onboardingFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = window.location.hash.slice(1);
  const headers = new Headers(init?.headers);
  if (token) headers.set("X-Onboarding-Token", token);
  return (token ? fetch : authenticatedFetch)(input, { ...init, headers, credentials: token ? "omit" : "same-origin", cache: "no-store" });
}

export function useOnboardingSession(id: string | undefined) {
  const token = useSyncExternalStore((changed) => { window.addEventListener("hashchange", changed); return () => window.removeEventListener("hashchange", changed); }, () => window.location.hash.slice(1));
  return useQuery({
    queryKey: ["/api/onboarding", id, token],
    queryFn: async ({ signal }) => {
      const body = await readApiResponse(await onboardingFetch("/api/onboarding", { headers: { "X-Appointment-Id": String(id) }, signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }));
      return readOnboardingSession(body);
    },
    retry: false,
    staleTime: 30000,
    refetchOnMount: false,
    gcTime: 0,
  });
}
