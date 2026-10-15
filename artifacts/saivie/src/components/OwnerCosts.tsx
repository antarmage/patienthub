import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OwnerAuthGate } from "@/components/OwnerAuthGate";

export type CostKind = "inventory" | "catalog";
interface CostMaps { inventory: Record<string, number>; catalog: Record<string, number> }

const COSTS_KEY = ["/api/owner/costs"];

// Purchase / lab cost prices. Only loads (and only allows edits) with an owner session token.
export function useOwnerCosts(tokenOverride?: string | null) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => tokenOverride ?? sessionStorage.getItem("desk_token"));
  useEffect(() => {
    if (tokenOverride !== undefined) setToken(tokenOverride);
  }, [tokenOverride]);

  const query = useQuery<CostMaps>({
    queryKey: [...COSTS_KEY, token],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/owner/costs", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem("desk_token");
        setToken(null);
        throw new Error("Owner session expired");
      }
      if (!res.ok) throw new Error("Failed to load cost prices");
      return res.json();
    },
  });

  const saveCost = async (kind: CostKind, id: number, costPrice: number | null) => {
    const res = await fetch(`/api/owner/costs/${kind}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ costPrice }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to save cost price");
    await queryClient.invalidateQueries({ queryKey: COSTS_KEY });
  };

  return {
    unlocked: !!token && !!query.data,
    costs: query.data,
    refresh: () => queryClient.invalidateQueries({ queryKey: COSTS_KEY }),
    unlock: (newToken: string) => setToken(newToken),
    saveCost,
  };
}

function Done({ token, onDone }: { token: string; onDone: (token: string) => void }) {
  useEffect(() => onDone(token), [token, onDone]);
  return null;
}

export function UnlockCostsButton({ onUnlocked }: { onUnlocked: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid="btn-unlock-costs">
        <Lock className="mr-1.5 h-3.5 w-3.5" /> Show cost prices
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Owner sign-in required</DialogTitle></DialogHeader>
          <OwnerAuthGate>
            {({ token }) => <Done token={token} onDone={(t) => { onUnlocked(t); setOpen(false); }} />}
          </OwnerAuthGate>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const formatCost = (n?: number | null) => (n == null ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);
