import { useQuery } from "@tanstack/react-query";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { useEffect } from "react";
import type { HpvProtection } from "@/lib/hpvProtection";

export function useHpvClinicStatuses(patientIds: Array<number | null | undefined>) {
    const ids = Array.from(new Set(patientIds.filter((id): id is number => typeof id === "number" && id > 0))).sort((a, b) => a - b);
    const query = useQuery<Record<string, HpvProtection>>({
        queryKey: ["/api/hpv-protection", ids.join(",")],
        queryFn: async ({ signal }) => {
            const statuses: Record<string, HpvProtection> = {};
            for (let offset = 0; offset < ids.length; offset += 500) {
                const batch = ids.slice(offset, offset + 500);
                const data = await receptionRequest<unknown>(`/api/hpv-protection?patientIds=${batch.join(",")}`, { signal });
                if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("The HPV API returned invalid vaccination statuses");
                for (const [key, value] of Object.entries(data)) {
                    if (!/^[1-9]\d*$/.test(key) || !batch.includes(Number(key)) || (value !== "protected" && value !== "in-progress")) {
                        throw new Error("The HPV API returned invalid vaccination statuses");
                    }
                    statuses[key] = value;
                }
            }
            return statuses;
        },
        enabled: ids.length > 0,
        staleTime: 60_000,
        refetchInterval: 30_000,
    });
    useEffect(() => {
        if (query.error) console.warn("Could not load HPV vaccination badges:", query.error.message);
    }, [query.error]);
    return (patientId: number | null | undefined): HpvProtection | null =>
        (patientId && query.data?.[String(patientId)]) || null;
}
