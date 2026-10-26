import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Partner { id: number; name: string; commissionPercent: number; isActive: boolean }
interface ReferralRow {
  id: number;
  patientName: string;
  partnerName: string;
  serviceName: string;
  basePrice: number;
  status: string;
  referredAt: string;
  reportReceivedAt: string | null;
  commissionPercent: number | null;
  commissionAmount: number | null;
}
interface Summary { months: { month: string; count: number; billed: number; commission: number }[]; referrals: ReferralRow[] }

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

interface PartnerService { id: number; partnerId: number; name: string; price: number; isActive: boolean }

// Each centre's own scan rate card (patient price). "Refer for scan" uses these when the centre is chosen.
function PartnerPriceList({ partnerId, request }: { partnerId: number; request: (url: string, init?: RequestInit) => Promise<any> }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ["owner-partner-services", partnerId];
  const services = useQuery<PartnerService[]>({ queryKey: key, queryFn: () => request(`/api/owner/referral-partners/${partnerId}/services`) });
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<number, string>>({});

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["/api/referral-partners", partnerId, "services"] });
  };
  const onError = (err: Error) => toast({ title: "Could not save", description: err.message, variant: "destructive" });

  const add = useMutation({
    mutationFn: (body: object) => request(`/api/owner/referral-partners/${partnerId}/services`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (rows: PartnerService[]) => { setName(""); setPrice(""); setPaste(""); setShowPaste(false); refresh(); toast({ title: `${rows.length} scan price${rows.length === 1 ? "" : "s"} saved` }); },
    onError,
  });
  const update = useMutation({
    mutationFn: ({ id, ...data }: { id: number; price?: number; isActive?: boolean }) =>
      request(`/api/owner/referral-partner-services/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_d, vars) => { setPriceDrafts((d) => { const { [vars.id]: _x, ...rest } = d; return rest; }); refresh(); },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: number) => request(`/api/owner/referral-partner-services/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError,
  });

  const rows = services.data || [];
  return (
    <div className="space-y-2 border-t border-saivie-border bg-saivie-surface-muted/40 px-4 py-3" data-testid={`partner-prices-${partnerId}`}>
      {services.isLoading && <p className="text-xs text-saivie-plum">Loading…</p>}
      {services.isError && <p className="text-xs text-rose-700">Couldn't load prices.</p>}
      {services.isSuccess && rows.length === 0 && <p className="text-xs text-saivie-plum">No scan prices yet.</p>}
      {rows.length > 0 && (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map((s) => {
              const draft = priceDrafts[s.id] ?? String(s.price);
              return (
                <tr key={s.id} className={s.isActive ? "" : "opacity-50"}>
                  <td className="py-1.5 pr-2 text-saivie-plum">{s.name}</td>
                  <td className="w-52 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs text-saivie-plum">₹</span>
                      <Input type="number" min={0} className="h-7 w-24" value={draft} onChange={(e) => setPriceDrafts({ ...priceDrafts, [s.id]: e.target.value })} aria-label={`${s.name} price`} />
                      {draft !== String(s.price) && draft !== "" && <Button size="sm" className="h-7 px-2" onClick={() => update.mutate({ id: s.id, price: Number(draft) })}>Save</Button>}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" aria-label={`Remove ${s.name}`} onClick={() => { if (window.confirm(`Remove ${s.name}?`)) remove.mutate(s.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Input className="h-8 w-56" placeholder="Scan name" value={name} onChange={(e) => setName(e.target.value)} data-testid={`input-service-name-${partnerId}`} />
        <Input className="h-8 w-24" type="number" min={0} placeholder="₹ Price" value={price} onChange={(e) => setPrice(e.target.value)} data-testid={`input-service-price-${partnerId}`} />
        <Button size="sm" disabled={!name.trim() || price === "" || add.isPending} onClick={() => add.mutate({ rows: [{ name, price: Number(price) }] })} data-testid={`btn-add-service-${partnerId}`}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>
        <Button size="sm" variant="ghost" onClick={() => setShowPaste(!showPaste)}>Paste list</Button>
      </div>
      {showPaste && (
        <div className="space-y-2">
          <Textarea rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"One per line, e.g.\nAnomaly Scan 2600\nGrowth Scan 1500"} data-testid={`input-service-paste-${partnerId}`} />
          <Button size="sm" disabled={!paste.trim() || add.isPending} onClick={() => add.mutate({ text: paste })}>Save list</Button>
        </div>
      )}
    </div>
  );
}

export function ReferralsManager({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [openPrices, setOpenPrices] = useState<number | null>(null);

  const request = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, { ...init, headers });
    if (res.status === 401 || res.status === 403) {
      onSignOut();
      throw new Error("Session expired, please sign in again");
    }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Request failed");
    return res.status === 204 ? null : res.json();
  };

  const partners = useQuery<Partner[]>({ queryKey: ["owner-referral-partners", token], queryFn: () => request("/api/owner/referral-partners") });
  const summary = useQuery<Summary>({ queryKey: ["owner-referral-summary", token], queryFn: () => request("/api/owner/referral-summary") });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["owner-referral-partners"] });
    queryClient.invalidateQueries({ queryKey: ["owner-referral-summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/owner/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/referral-partners"] });
  };
  const onError = (err: Error) => toast({ title: "Could not save", description: err.message, variant: "destructive" });

  const addPartner = useMutation({
    mutationFn: () => request("/api/owner/referral-partners", { method: "POST", body: JSON.stringify({ name, commissionPercent: Number(percent) }) }),
    onSuccess: () => { setName(""); setPercent(""); refresh(); },
    onError,
  });
  const updatePartner = useMutation({
    mutationFn: ({ id, ...data }: { id: number; commissionPercent?: number; isActive?: boolean }) =>
      request(`/api/owner/referral-partners/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_d, vars) => { setDrafts((d) => { const { [vars.id]: _x, ...rest } = d; return rest; }); refresh(); toast({ title: "Partner updated" }); },
    onError,
  });
  const removePartner = useMutation({
    mutationFn: (id: number) => request(`/api/owner/referral-partners/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError,
  });

  const thisMonth = new Date().toISOString().slice(0, 7);
  const current = summary.data?.months.find((m) => m.month === thisMonth);
  const pending = (summary.data?.referrals || []).filter((r) => r.status === "referred");

  return (
    <div className="space-y-6" data-testid="view-referrals">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-saivie-plum">Referral Commission</h2>
          <p className="mt-1 text-sm text-saivie-plum">Commission is earned when the patient's report is received, and counts toward revenue for that month.</p>
        </div>
        <Button variant="outline" onClick={onSignOut}>Sign out</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-saivie-plum">This month's commission</p><p className="mt-1 text-2xl font-bold text-emerald-600" data-testid="text-referral-month">{inr(current?.commission || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-saivie-plum">Scans completed this month</p><p className="mt-1 text-2xl font-bold text-saivie-plum">{current?.count || 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-saivie-plum">Awaiting report</p><p className="mt-1 text-2xl font-bold text-amber-600">{pending.length}</p></CardContent></Card>
      </div>

      <Card className="border-saivie-border shadow-sm">
        <CardHeader><CardTitle className="text-base">Diagnostic centres & commission %</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(partners.data || []).map((p) => {
            const draft = drafts[p.id] ?? String(p.commissionPercent);
            return (
              <div key={p.id} className="rounded-lg border border-saivie-border">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <p className="min-w-40 flex-1 font-semibold text-saivie-plum">{p.name}{!p.isActive && <Badge className="ml-2 border-0 bg-saivie-sage text-saivie-plum">Inactive</Badge>}</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpenPrices(openPrices === p.id ? null : p.id)} aria-expanded={openPrices === p.id} data-testid={`btn-partner-prices-${p.id}`}>
                    Scan prices {openPrices === p.id ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
                  </Button>
                  <Input type="number" min={0} max={100} step="0.1" className="h-8 w-24" value={draft} onChange={(e) => setDrafts({ ...drafts, [p.id]: e.target.value })} data-testid={`input-commission-${p.id}`} />
                  <span className="text-sm text-saivie-plum">%</span>
                  <Button size="sm" disabled={draft === String(p.commissionPercent) || draft === ""} onClick={() => updatePartner.mutate({ id: p.id, commissionPercent: Number(draft) })}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => updatePartner.mutate({ id: p.id, isActive: !p.isActive })}>{p.isActive ? "Deactivate" : "Activate"}</Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" aria-label="Remove partner"
                    onClick={() => { if (window.confirm(`Remove ${p.name}? Partners with past referrals are only deactivated.`)) removePartner.mutate(p.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {openPrices === p.id && <PartnerPriceList partnerId={p.id} request={request} />}
              </div>
            );
          })}
          {partners.data?.length === 0 && <p className="text-sm text-saivie-plum">No centres added yet.</p>}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Input className="h-9 w-56" placeholder="Centre name (e.g. SP Diagnostics)" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-partner-name" />
            <Input className="h-9 w-28" type="number" min={0} max={100} step="0.1" placeholder="Commission %" value={percent} onChange={(e) => setPercent(e.target.value)} data-testid="input-partner-percent" />
            <Button onClick={() => addPartner.mutate()} disabled={!name.trim() || percent === "" || addPartner.isPending} data-testid="btn-add-partner"><Plus className="mr-1 h-4 w-4" /> Add centre</Button>
          </div>
          <p className="text-xs text-saivie-plum">Changing a percentage only affects reports received afterwards; past commissions stay as earned.</p>
        </CardContent>
      </Card>

      <Card className="border-saivie-border shadow-sm">
        <CardHeader><CardTitle className="text-base">Monthly referral bonus</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-saivie-surface-muted text-left text-xs font-bold uppercase text-saivie-plum">
              <tr><th className="px-4 py-3">Month</th><th className="px-3 py-3">Scans</th><th className="px-3 py-3">Billed value</th><th className="px-3 py-3 text-right">Commission</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(summary.data?.months || []).map((m) => (
                <tr key={m.month}><td className="px-4 py-3 font-medium">{monthLabel(m.month)}</td><td className="px-3 py-3">{m.count}</td><td className="px-3 py-3">{inr(m.billed)}</td><td className="px-3 py-3 text-right font-bold text-emerald-600">{inr(m.commission)}</td></tr>
              ))}
              {summary.data?.months.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-saivie-plum">No commission earned yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-saivie-border shadow-sm">
        <CardHeader><CardTitle className="text-base">All referrals</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-saivie-surface-muted text-left text-xs font-bold uppercase text-saivie-plum">
              <tr><th className="px-4 py-3">Patient</th><th className="px-3 py-3">Scan</th><th className="px-3 py-3">Centre</th><th className="px-3 py-3">Referred</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Commission</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(summary.data?.referrals || []).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.patientName}</td>
                  <td className="px-3 py-3">{r.serviceName} <span className="text-xs text-saivie-plum">{inr(r.basePrice)}</span></td>
                  <td className="px-3 py-3">{r.partnerName}</td>
                  <td className="px-3 py-3">{r.referredAt}</td>
                  <td className="px-3 py-3">
                    {r.status === "report_received" ? <Badge className="border-0 bg-emerald-100 text-emerald-700">Report received</Badge>
                      : r.status === "cancelled" ? <Badge className="border-0 bg-saivie-sage text-saivie-plum">Cancelled</Badge>
                      : <Badge className="border-0 bg-amber-100 text-amber-700">Awaiting report</Badge>}
                  </td>
                  <td className="px-3 py-3 text-right">{r.commissionAmount != null ? `${inr(r.commissionAmount)} (${r.commissionPercent}%)` : "—"}</td>
                </tr>
              ))}
              {summary.data?.referrals.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-saivie-plum">No referrals yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
