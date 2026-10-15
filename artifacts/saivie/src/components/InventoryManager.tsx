import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, PackagePlus, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  catalogItemId: number | null;
  unit: string;
  quantity: number;
  lowStockThreshold: number;
  batchNumber: string | null;
  expiryDate: string | null;
  supplier: string | null;
  notes: string | null;
  isActive: boolean;
}

export const INVENTORY_CATEGORIES = ["Supplement", "Vaccine", "Medicine", "Consumable", "Other"];
const EXPIRY_WARNING_DAYS = 30;

export function useInventory() {
  return useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    refetchInterval: 60000,
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Failed to load inventory");
      return res.json();
    },
  });
}

export function getStockStatus(item: InventoryItem): "out" | "low" | "ok" {
  if (item.quantity <= 0) return "out";
  if (item.quantity <= item.lowStockThreshold) return "low";
  return "ok";
}

export function getExpiryStatus(item: InventoryItem): "expired" | "soon" | "ok" {
  if (!item.expiryDate) return "ok";
  const days = Math.ceil((new Date(String(item.expiryDate).slice(0, 10)).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  return days <= EXPIRY_WARNING_DAYS ? "soon" : "ok";
}

export function getInventoryAlerts(items: InventoryItem[]) {
  const active = items.filter((i) => i.isActive);
  return {
    stock: active.filter((i) => getStockStatus(i) !== "ok"),
    expiry: active.filter((i) => getExpiryStatus(i) !== "ok"),
  };
}

const emptyForm = { name: "", category: "Supplement", catalogItemId: "none", unit: "units", quantity: "0", lowStockThreshold: "5", batchNumber: "", expiryDate: "", supplier: "" };

export function InventoryManager({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useInventory();
  const { data: catalog = [] } = useQuery<any[]>({
    queryKey: ["/api/billing-catalog"],
    queryFn: async () => {
      const res = await fetch("/api/billing-catalog");
      return res.ok ? res.json() : [];
    },
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [adjusting, setAdjusting] = useState<{ item: InventoryItem; direction: 1 | -1 } | null>(null);
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const onError = (err: Error) => {
    if (err.message === "AUTH") {
      onSignOut();
      toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
      return;
    }
    toast({ title: "Inventory update failed", description: err.message, variant: "destructive" });
  };
  const failure = async (res: Response, fallback: string) => {
    if (res.status === 401 || res.status === 403) return new Error("AUTH");
    return new Error((await res.json().catch(() => ({}))).error || fallback);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        category: form.category,
        catalogItemId: form.catalogItemId === "none" ? null : Number(form.catalogItemId),
        unit: form.unit,
        quantity: Number(form.quantity) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 0,
        batchNumber: form.batchNumber || null,
        expiryDate: form.expiryDate || null,
        supplier: form.supplier || null,
      };
      const res = await fetch(editing ? `/api/inventory/${editing.id}` : "/api/inventory", {
        method: editing ? "PATCH" : "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await failure(res, "Failed to save");
    },
    onSuccess: () => { refresh(); setIsFormOpen(false); toast({ title: editing ? "Item updated" : "Item added" }); },
    onError,
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!adjusting) return;
      const res = await fetch(`/api/inventory/${adjusting.item.id}/adjust`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ change: adjusting.direction * (Number(amount) || 0), reason }),
      });
      if (!res.ok) throw await failure(res, "Failed to adjust");
    },
    onSuccess: () => { refresh(); setAdjusting(null); },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw await failure(res, "Failed to delete");
    },
    onSuccess: () => { refresh(); toast({ title: "Item removed" }); },
    onError,
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setIsFormOpen(true); };
  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name, category: item.category, catalogItemId: item.catalogItemId ? String(item.catalogItemId) : "none", unit: item.unit, quantity: String(item.quantity),
      lowStockThreshold: String(item.lowStockThreshold), batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate ? String(item.expiryDate).slice(0, 10) : "", supplier: item.supplier || "",
    });
    setIsFormOpen(true);
  };
  const openAdjust = (item: InventoryItem, direction: 1 | -1) => { setAdjusting({ item, direction }); setAmount("1"); setReason(""); };

  const alerts = useMemo(() => getInventoryAlerts(items), [items]);
  const visible = items.filter((i) =>
    (category === "all" || i.category === category) && (!search.trim() || i.name.toLowerCase().includes(search.trim().toLowerCase())),
  );

  return (
    <div className="space-y-4" data-testid="view-inventory">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory</h2>
          <p className="text-sm text-slate-500">
            {alerts.stock.length} low or out of stock · {alerts.expiry.length} expiring or expired
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSignOut}>Sign out</Button>
          <Button onClick={openAdd} data-testid="btn-add-inventory"><PackagePlus className="mr-2 h-4 w-4" /> Add item</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search items" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-inventory-search" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {INVENTORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">In stock</th>
              <th className="px-3 py-3">Alert at</th>
              <th className="px-3 py-3">Expiry</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((item) => {
              const stock = getStockStatus(item);
              const expiry = getExpiryStatus(item);
              return (
                <tr key={item.id} data-testid={`inventory-row-${item.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    {item.batchNumber && <p className="text-xs text-slate-500">Batch {item.batchNumber}</p>}
                    {item.catalogItemId && <p className="text-xs text-teal-600">Auto-deducts when billed</p>}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{item.category}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span></td>
                  <td className="px-3 py-3 text-slate-600">{item.lowStockThreshold}</td>
                  <td className="px-3 py-3 text-slate-600">{item.expiryDate ? String(item.expiryDate).slice(0, 10) : "—"}</td>
                  <td className="space-x-1 px-3 py-3">
                    {stock === "out" && <Badge className="border-0 bg-rose-100 text-rose-700">Out of stock</Badge>}
                    {stock === "low" && <Badge className="border-0 bg-amber-100 text-amber-700">Low stock</Badge>}
                    {expiry === "expired" && <Badge className="border-0 bg-rose-100 text-rose-700">Expired</Badge>}
                    {expiry === "soon" && <Badge className="border-0 bg-orange-100 text-orange-700">Expiring soon</Badge>}
                    {stock === "ok" && expiry === "ok" && <Badge className="border-0 bg-emerald-100 text-emerald-700">OK</Badge>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openAdjust(item, -1)} aria-label="Use stock" data-testid={`btn-inv-use-${item.id}`}><Minus className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openAdjust(item, 1)} aria-label="Add stock" data-testid={`btn-inv-add-${item.id}`}><Plus className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(item)}>Edit</Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" aria-label="Delete item"
                        onClick={() => { if (window.confirm(`Remove ${item.name} from inventory?`)) deleteMutation.mutate(item.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">{isLoading ? "Loading..." : "No inventory items yet"}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit item" : "Add inventory item"}</DialogTitle>
            <DialogDescription>{editing ? "Use the + / − buttons to change stock so it is logged." : "Add a product you keep in stock."}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Protein powder 1kg" data-testid="input-inv-name" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INVENTORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="tubs, vials, strips" />
            </div>
            {!editing && (
              <div className="space-y-1">
                <Label>Opening stock</Label>
                <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="input-inv-quantity" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Low-stock alert at</Label>
              <Input type="number" min={0} value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} data-testid="input-inv-threshold" />
            </div>
            <div className="space-y-1">
              <Label>Batch no.</Label>
              <Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Expiry date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Billing item (deduct stock when billed)</Label>
              <Select value={form.catalogItemId} onValueChange={(v) => setForm({ ...form, catalogItemId: v })}>
                <SelectTrigger data-testid="select-inv-catalog"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked to billing</SelectItem>
                  {catalog.filter((c: any) => c.isActive !== false).map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name} · {c.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()} data-testid="btn-inv-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjusting} onOpenChange={(open) => !open && setAdjusting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{adjusting?.direction === 1 ? "Add stock" : "Use stock"} — {adjusting?.item.name}</DialogTitle>
            <DialogDescription>Currently {adjusting?.item.quantity} {adjusting?.item.unit} in stock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-inv-adjust" />
            </div>
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={adjusting?.direction === 1 ? "e.g. New delivery" : "e.g. Given to patient"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjusting(null)}>Cancel</Button>
            <Button disabled={!(Number(amount) > 0) || adjustMutation.isPending} onClick={() => adjustMutation.mutate()} data-testid="btn-inv-adjust-save">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
