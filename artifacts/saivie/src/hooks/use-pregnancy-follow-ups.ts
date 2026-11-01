import { useQuery } from "@tanstack/react-query";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { readPregnancyFollowUps } from "@/lib/pregnancyFollowUps";

export function usePregnancyFollowUps(
  patientIds: number[],
  canSave = true,
  enabled = true,
) {
  const ids = [...new Set(patientIds)].sort((a, b) => a - b);
  return useQuery({
    queryKey: ["pregnancy-follow-ups", canSave, ids.join(",")],
    enabled: enabled && ids.length > 0,
    queryFn: async ({ signal }) => {
      if (!canSave) {
        const entries = await Promise.all(
          ids.map(
            async (id) =>
              [
                String(id),
                await receptionRequest(
                  `/api/patients/${id}/pregnancy-episodes/follow-up`,
                  { signal },
                ),
              ] as const,
          ),
        );
        return readPregnancyFollowUps(Object.fromEntries(entries), ids);
      }
      const result = {};
      for (let offset = 0; offset < ids.length; offset += 500) {
        const batch = ids.slice(offset, offset + 500);
        Object.assign(
          result,
          readPregnancyFollowUps(
            await receptionRequest("/api/pregnancy-follow-ups/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ patientIds: batch }),
              signal,
            }),
            batch,
          ),
        );
      }
      return readPregnancyFollowUps(result, ids);
    },
    retry: false,
    refetchInterval: 30_000,
  });
}
