import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface ReferralRequest { patientId?: number; appointmentId?: number }

interface Referral {
  id: number;
  patientId: number;
  partnerId: number;
  partnerName: string;
  patientName: string;
  serviceName: string;
  basePrice: number;
  status: "referred" | "report_received" | "cancelled";
  referredAt: string;
}

const SCAN_PATTERN = /usg|ultra|scan|sono|imaging|doppler|nt |anomaly/i;

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Scans sent to partner diagnostic centres. Commission figures are owner-only and never shown here.
export function ReferralsCard({ patients, request, onRequestHandled }: {
  patients: any[];
  request: ReferralRequest | null;
  onRequestHandled: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const partners = useQuery<{ id: number; name: string }[]>({ queryKey: ["/api/referral-partners"] });
  const catalog = useQuery<any[]>({ queryKey: ["/api/billing-catalog"] });
  const referrals = useQuery<Referral[]>({ queryKey: ["/api/diagnostic-referrals"] });

  const scans = useMemo(
    () => (catalog.data || []).filter((c) => c.isActive !== false && (SCAN_PATTERN.test(c.category || "") || SCAN_PATTERN.test(c.name || ""))),
    [catalog.data],
  );

  const reset = () => { setPatientId(""); setAppointmentId(null); setPartnerId(""); setCatalogId(""); setServiceName(""); setPrice(""); setNotes(""); };

  useEffect(() => {
    if (!request) return;
    reset();
    if (request.patientId) setPatientId(String(request.patientId));
    setAppointmentId(request.appointmentId ?? null);
    setOpen(true);
    onRequestHandled();
  }, [request, onRequestHandled]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/diagnostic-referrals"] });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/diagnostic-referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: Number(partnerId),
          serviceName,
          catalogItemId: catalogId ? Number(catalogId) : null,
          basePrice: Number(price) || 0,
          appointmentId,
          notes: notes || null,
          date: localDate(),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to save referral");
    },
    onSuccess: () => { refresh(); setOpen(false); reset(); toast({ title: "Referral saved" }); },
    onError: (err: Error) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/diagnostic-referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, receivedDate: localDate() }),
      });
      if (!res.ok) throw new Error("Failed to update referral");
    },
    onSuccess: refresh,
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const pending = (referrals.data || []).filter((r) => r.status === "referred");
  const canSave = patientId && partnerId && serviceName.trim();

  return (
    <>
      <Card className="border-slate-200 shadow-sm" data-testid="card-referrals">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
            <ScanLine className="h-5 w-5 text-indigo-500" /> Scans awaiting report
          </CardTitle>
          <Button size="sm" variant="outline" className="h-8" onClick={() => { reset(); setOpen(true); }} data-testid="btn-new-referral">
            Refer for scan
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {pending.slice(0, 6).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{r.patientName}</p>
                <p className="truncate text-xs text-slate-500">{r.serviceName} · {r.partnerName} · {r.referredAt}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700" onClick={() => setStatus.mutate({ id: r.id, status: "report_received" })} data-testid={`btn-report-received-${r.id}`}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Report received
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={() => { if (window.confirm("Cancel this referral?")) setStatus.mutate({ id: r.id, status: "cancelled" }); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">No scans waiting for a report</p>}
          {pending.length > 6 && <p className="px-5 py-2 text-center text-xs text-slate-400">+{pending.length - 6} more</p>}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refer patient for scan</DialogTitle>
            <DialogDescription>Mark "Report received" once the patient brings the report back.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger data-testid="select-referral-patient"><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Diagnostic centre</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger data-testid="select-referral-partner"><SelectValue placeholder={partners.data?.length ? "Select centre" : "No centres added by owner yet"} /></SelectTrigger>
                <SelectContent>{(partners.data || []).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Scan</Label>
              <Select
                value={catalogId}
                onValueChange={(v) => {
                  setCatalogId(v);
                  const item = scans.find((c) => String(c.id) === v);
                  if (item) { setServiceName(item.name); setPrice(String(item.price)); }
                }}
              >
                <SelectTrigger data-testid="select-referral-scan"><SelectValue placeholder="Choose from catalog" /></SelectTrigger>
                <SelectContent>{scans.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} · ₹{c.price}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Scan name</Label>
                <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. Anomaly scan" />
              </div>
              <div className="space-y-1">
                <Label>Price (₹)</Label>
                <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!canSave || create.isPending} data-testid="btn-save-referral">Save referral</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
