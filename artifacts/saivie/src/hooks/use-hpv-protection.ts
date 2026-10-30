import { useQuery } from "@tanstack/react-query";
import type { HpvProtection } from "@/lib/hpvProtection";

export function useHpvClinicStatuses(patientIds: Array<number | null | undefined>) {
    const ids = Array.from(new Set(patientIds.filter((id): id is number => typeof id === "number" && id > 0))).sort((a, b) => a - b);
    const query = useQuery<Record<string, HpvProtection>>({
        queryKey: ["/api/hpv-protection", ids.join(",")],
        queryFn: async () => {
            const res = await fetch(`/api/hpv-protection?patientIds=${ids.join(",")}`);
            if (!res.ok) throw new Error("Could not load HPV vaccination status");
            return res.json();
        },
        enabled: ids.length > 0,
        staleTime: 60_000,
    });
    return (patientId: number | null | undefined): HpvProtection | null =>
        (patientId && query.data?.[String(patientId)]) || null;
}
