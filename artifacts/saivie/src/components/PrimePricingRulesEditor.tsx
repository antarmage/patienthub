import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, CheckCircle2, IndianRupee, Loader2, LogOut, Save, ShieldAlert } from "lucide-react";
import { OwnerAuthCard } from "@/components/OwnerAuthCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PrimePricingRules {
  consultationFee: number;
  consultationItemIds: number[];
  labDiscountPercent: number;
}

const defaultRules: PrimePricingRules = {
  consultationFee: 600,
  consultationItemIds: [],
  labDiscountPercent: 20,
};

export function PrimePricingRulesEditor() {
  const queryClient = useQueryClient();
  const [authToken, setAuthToken] = useState<string | null>(() => sessionStorage.getItem("desk_token"));
  const [rules, setRules] = useState<PrimePricingRules>(defaultRules);
  const rulesQueryKey = ["/api/owner/prime-pricing", authToken];

  const signOut = () => {
    sessionStorage.removeItem("desk_token");
    setAuthToken(null);
    setRules(defaultRules);
  };

  const rulesQuery = useQuery<PrimePricingRules>({
    queryKey: rulesQueryKey,
    enabled: !!authToken,
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/owner/prime-pricing", { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.status === 401 || res.status === 403) {
        signOut();
        throw new Error("Owner session expired. Please sign in again.");
      }
      if (!res.ok) throw new Error("Failed to load Prime pricing rules");
      return res.json();
    },
  });

  const catalogQuery = useQuery<any[]>({ queryKey: ["/api/billing-catalog"] });
  const catalog = catalogQuery.data || [];
  const consultationItems = catalog.filter((item: any) =>
    item.isActive !== false && (item.category || "").trim().toLowerCase() === "consultation"
  );

  useEffect(() => {
    if (rulesQuery.data) setRules(rulesQuery.data);
  }, [rulesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/owner/prime-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(rules),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save Prime pricing rules");
      return data as PrimePricingRules;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(rulesQueryKey, data);
      setRules(data);
    },
  });

  if (!authToken) {
    return <OwnerAuthCard onAuthenticated={setAuthToken} />;
  }

  if (rulesQuery.isLoading || catalogQuery.isLoading) {
    return <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading Prime pricing rules...</div>;
  }

  const updateNumber = (field: "consultationFee" | "labDiscountPercent", value: string) => {
    const parsed = value === "" ? 0 : Number(value);
    setRules((current) => ({ ...current, [field]: Number.isFinite(parsed) ? parsed : 0 }));
    saveMutation.reset();
  };

  const toggleConsultation = (id: number, checked: boolean) => {
    setRules((current) => ({
      ...current,
      consultationItemIds: checked
        ? [...new Set([...current.consultationItemIds, id])]
        : current.consultationItemIds.filter((itemId) => itemId !== id),
    }));
    saveMutation.reset();
  };

  return (
    <div className="space-y-6" data-testid="view-prime-pricing">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Prime Pricing</h2>
          <p className="mt-1 text-sm text-slate-500">Configure automatic Prime member pricing for eligible bills.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Prime member rules</span>
          <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>

      {rulesQuery.isError && <p role="alert" className="text-sm text-rose-600">{(rulesQuery.error as Error).message}</p>}
      {catalogQuery.isError && <p role="alert" className="text-sm text-rose-600">Unable to load the service catalog. Prime rules are read-only until it is available.</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
        <div className="space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-base"><IndianRupee className="h-4 w-4 text-emerald-700" />Consultation fee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="max-w-xs space-y-1.5">
                <label htmlFor="prime-consultation-fee" className="text-sm font-medium">Prime fee per eligible consultation</label>
                <Input id="prime-consultation-fee" type="number" min="0" max="100000" step="1" value={rules.consultationFee} onChange={(e) => updateNumber("consultationFee", e.target.value)} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Eligible consultation services</p>
                {consultationItems.length ? (
                  <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                    {consultationItems.map((item: any) => (
                      <label key={item.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
                        <Checkbox checked={rules.consultationItemIds.includes(item.id)} onCheckedChange={(checked) => toggleConsultation(item.id, checked === true)} />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <span className="text-xs text-slate-500">MRP ₹{Number(item.price || 0).toLocaleString("en-IN")}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">No active items in the Consultation category.</p>
                )}
                <p className="mt-2 text-xs text-slate-500">Only selected catalog items receive the Prime fee. Other consultations remain at catalog price.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-base"><BadgePercent className="h-4 w-4 text-emerald-700" />Lab test discount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              <div className="max-w-xs space-y-1.5">
                <label htmlFor="prime-lab-discount" className="text-sm font-medium">Discount on Lab Test MRP</label>
                <div className="relative">
                  <Input id="prime-lab-discount" type="number" min="0" max="100" step="0.1" value={rules.labDiscountPercent} onChange={(e) => updateNumber("labDiscountPercent", e.target.value)} className="pr-9" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">Applies to every active Lab Test catalog item for Prime members. For GST-inclusive MRP, the taxable value is derived first, the discount is applied, then GST is calculated on the discounted value.</p>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
            <CardContent className="flex gap-3 p-4">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-950">Consultation GST</p>
                <p className="text-xs leading-5 text-amber-900">All Consultation-category services are billed at 0% GST per clinic policy. Confirm this treatment with your tax advisor before using it for issued invoices. Lab GST follows each catalog item’s tax rate.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Rule summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3"><span className="text-slate-600">Selected consultation</span><span className="font-semibold text-slate-900">₹{rules.consultationFee.toLocaleString("en-IN")}</span></div>
              <div className="flex items-start justify-between gap-3"><span className="text-slate-600">Lab tests</span><span className="font-semibold text-slate-900">{rules.labDiscountPercent}% off MRP</span></div>
              <div className="flex items-start justify-between gap-3"><span className="text-slate-600">Selected services</span><span className="font-semibold text-slate-900">{rules.consultationItemIds.length}</span></div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button className="w-full bg-emerald-700 hover:bg-emerald-800" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || rulesQuery.isError || catalogQuery.isError || rules.consultationFee < 0 || rules.consultationFee > 100000 || rules.labDiscountPercent < 0 || rules.labDiscountPercent > 100} data-testid="btn-save-prime-pricing">
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Prime pricing
            </Button>
            {saveMutation.isSuccess && <p className="flex items-center justify-center gap-1 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />Rules saved</p>}
            {saveMutation.isError && <p role="alert" className="text-sm text-rose-600">{saveMutation.error.message}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}