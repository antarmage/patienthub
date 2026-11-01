import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { authenticatedFetch, readApiResponse } from "./authenticatedFetch";

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
      return z.object({
        appointment: z.object({ id: z.number(), surveyKind: z.string(), chiefComplaint: z.string().nullable() }),
        patient: z.object({ id: z.number(), name: z.string(), dob: z.string().nullable(), referredBy: z.string().nullable(), hpvProtection: z.enum(["protected", "in-progress"]).nullable() }),
      }).parse(body);
    },
    retry: false,
    staleTime: 30000,
    refetchOnMount: false,
    gcTime: 0,
  });
}
