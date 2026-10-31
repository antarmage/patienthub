import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { billingTemplateDraftSchema, type BillingTemplateDraft, type BillingTemplateItem, type PersonalBillingTemplate } from "../../../../lib/db/src/billing-templates";
import { resolveTemplateItems, type BillingTemplateOption } from "@/lib/billingTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface BillingTemplatesProps {
    currentItems: BillingTemplateItem[];
    currentName: string;
    options: BillingTemplateOption[];
    defaults: Record<string, { label: string; items: string[] }>;
    onApply: (name: string, items: ReturnType<typeof resolveTemplateItems>) => void;
}

export function BillingTemplates({ currentItems, currentName, options, defaults, onApply }: BillingTemplatesProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const token = sessionStorage.getItem("billing_staff_token");
    const queryKey = ["/api/billing-templates", token];
    const [group, setGroup] = useState("");
    const [editingId, setEditingId] = useState<number | undefined>();
    const [draft, setDraft] = useState<BillingTemplateDraft | null>(null);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const query = useQuery<PersonalBillingTemplate[]>({
        queryKey,
        enabled: !!token,
        queryFn: async () => {
            const res = await fetch("/api/billing-templates", { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not load your templates");
            return data;
        },
    });
    const templates = query.data || [];
    const groups = useMemo(() => [...new Set(templates.map((template) => template.groupName))].sort(), [templates]);
    const startEditing = (value: BillingTemplateDraft, id?: number) => {
        setDraft({ name: value.name, groupName: value.groupName, items: value.items.map((item) => ({ ...item })) });
        setEditingId(id);
        setSearch("");
        setError("");
    };
    const save = useMutation({
        mutationFn: async (value: BillingTemplateDraft) => {
            const res = await fetch(`/api/billing-templates${editingId == null ? "" : `/${editingId}`}`, {
                method: editingId == null ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(value),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not save template");
            return data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey });
            setDraft(null);
            setGroup("");
            toast({ title: "Personal billing template saved" });
        },
        onError: (err: Error) => setError(err.message),
    });
    const remove = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/billing-templates/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Could not delete template");
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey });
            setDraft(null);
            setGroup("");
            toast({ title: "Template deleted" });
        },
        onError: (err: Error) => setError(err.message),
    });
    const pending = save.isPending || remove.isPending;
    const copyDefault = (label: string, names: string[]) => {
        const items: BillingTemplateItem[] = [];
        for (const name of names) {
            const option = options.find((item) => item.kind === "catalog" && item.name === name && item.isActive);
            if (!option) {
                toast({ title: "Template needs review", description: `${name} is not available in the billing catalog.`, variant: "destructive" });
                return;
            }
            items.push({ catalogItemId: option.id, quantity: 1 });
        }
        startEditing({ name: label, groupName: "General", items });
    };
    return (
        <div className="mt-4 space-y-3 border-t border-saivie-border pt-4" data-testid="personal-billing-templates">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-saivie-plum">My grouped templates</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={!token} onClick={() => startEditing({ name: "", groupName: group || "General", items: [] })}><Plus className="mr-1 h-3.5 w-3.5" />New template</Button>
                    <Button variant="outline" size="sm" disabled={!token || currentItems.length === 0} onClick={() => startEditing({ name: currentName, groupName: group || "General", items: currentItems })} data-testid="btn-save-bill-template"><Save className="mr-1 h-3.5 w-3.5" />Save current items</Button>
                </div>
            </div>
            {!token ? <p role="alert" className="text-xs text-amber-800">Sign in again to save templates privately to your receptionist account. <Link href="/" className="underline">Go to sign in</Link></p>
                : query.isLoading ? <p className="text-xs">Loading your templates...</p>
                    : query.isError ? <div role="alert" className="text-xs text-rose-600">{query.error.message} <Button variant="link" size="sm" onClick={() => query.refetch()}>Retry</Button> <Link href="/">Sign in again</Link></div>
                        : <>
                            {groups.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Template groups">
                                <Button size="sm" variant={group === "" ? "secondary" : "outline"} onClick={() => setGroup("")}>All groups</Button>
                                {groups.map((name) => <Button key={name} size="sm" variant={group === name ? "secondary" : "outline"} onClick={() => setGroup(name)}>{name}</Button>)}
                            </div>}
                            <div className="flex flex-wrap gap-2">
                                {templates.filter((template) => !group || template.groupName === group).map((template) => (
                                    <div key={template.id} className="flex items-center rounded-full border border-saivie-border">
                                        <Button variant="ghost" size="sm" data-testid={`btn-personal-template-${template.id}`} onClick={() => {
                                            try { onApply(template.name, resolveTemplateItems(template.items, options)); }
                                            catch (err) {
                                                if (!(err instanceof Error)) throw err;
                                                toast({ title: "Could not apply template", description: err.message, variant: "destructive" });
                                            }
                                        }}>{template.name}</Button>
                                        <Button variant="ghost" size="icon" aria-label={`Edit template ${template.name}`} data-testid={`btn-edit-template-${template.id}`} onClick={() => startEditing(template, template.id)}><Pencil className="h-3.5 w-3.5" /></Button>
                                    </div>
                                ))}
                            </div>
                            {templates.length === 0 && <p className="text-xs text-saivie-plum">No saved templates yet. Save your current items or copy a built-in template.</p>}
                        </>}
            <details>
                <summary className="cursor-pointer text-xs text-saivie-teal">Edit a built-in template as a personal copy</summary>
                <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(defaults).map(([key, value]) => <Button key={key} variant="outline" size="sm" disabled={!token} onClick={() => copyDefault(value.label, value.items)}>{value.label}<Pencil className="ml-1 h-3 w-3" /></Button>)}
                </div>
            </details>
            <Dialog open={draft != null} onOpenChange={(open) => { if (!open && !pending) setDraft(null); }}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId == null ? "Save personal template" : "Edit personal template"}</DialogTitle>
                        <DialogDescription>Only your account can use this template. Group services and products for faster billing; current prices and GST apply when used.</DialogDescription>
                    </DialogHeader>
                    {draft && <fieldset disabled={pending} className="space-y-4">
                        <div className="space-y-1"><Label htmlFor="billing-template-name">Template name</Label><Input id="billing-template-name" maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
                        <div className="space-y-1"><Label htmlFor="billing-template-group">Group</Label><Input id="billing-template-group" list="billing-template-groups" maxLength={100} value={draft.groupName} onChange={(event) => setDraft({ ...draft, groupName: event.target.value })} placeholder="Pregnancy, Gynecology, Labs..." /><datalist id="billing-template-groups">{groups.map((name) => <option key={name} value={name} />)}</datalist></div>
                        <div className="space-y-2">
                            {draft.items.map((item, index) => {
                                const option = options.find((entry) => entry.kind === (item.catalogItemId != null ? "catalog" : "inventory") && entry.id === (item.catalogItemId ?? item.inventoryItemId));
                                return <div key={`${item.catalogItemId != null ? "catalog" : "inventory"}:${item.catalogItemId ?? item.inventoryItemId}`} className="flex items-center gap-2">
                                    <span className="flex-1 text-sm">{option?.name || "Unavailable item"}{option && !option.isActive ? " (inactive)" : ""}</span>
                                    <Input type="number" min={1} max={1000} step={1} className="w-20" aria-label={`Quantity for ${option?.name || "unavailable item"}`} value={item.quantity} onChange={(event) => setDraft({ ...draft, items: draft.items.map((line, i) => i === index ? { ...line, quantity: Number(event.target.value) } : line) })} />
                                    <Button variant="ghost" size="icon" aria-label={`Remove ${option?.name || "unavailable item"}`} onClick={() => setDraft({ ...draft, items: draft.items.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button>
                                </div>;
                            })}
                        </div>
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a service or product to add" aria-label="Search template items" />
                        <div className="max-h-44 overflow-y-auto">
                            {options.filter((option) => option.isActive && option.name.toLowerCase().includes(search.trim().toLowerCase())).map((option) => {
                                const added = draft.items.some((item) => option.kind === "catalog" ? item.catalogItemId === option.id : item.inventoryItemId === option.id);
                                return <div key={`${option.kind}:${option.id}`} className="flex items-center justify-between gap-2 py-1">
                                    <span className="text-sm">{option.name} <span className="text-xs text-saivie-plum">({option.kind === "catalog" ? "Service" : "Product"})</span></span>
                                    <Button size="sm" variant="outline" disabled={added} onClick={() => setDraft({ ...draft, items: [...draft.items, { ...(option.kind === "catalog" ? { catalogItemId: option.id } : { inventoryItemId: option.id }), quantity: 1 }] })}>{added ? "Added" : "Add"}</Button>
                                </div>;
                            })}
                        </div>
                    </fieldset>}
                    {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                    <DialogFooter>
                        {editingId != null && <Button variant="destructive" disabled={pending} onClick={() => { if (window.confirm("Delete this personal template? Existing invoices will not change.")) remove.mutate(editingId); }}>Delete template</Button>}
                        <Button variant="outline" disabled={pending} onClick={() => setDraft(null)}>Cancel</Button>
                        <Button disabled={pending || !draft} onClick={() => {
                            const parsed = billingTemplateDraftSchema.safeParse(draft);
                            if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join("; ")); return; }
                            try { resolveTemplateItems(parsed.data.items, options); }
                            catch (err) { if (!(err instanceof Error)) throw err; setError(err.message); return; }
                            setError("");
                            save.mutate(parsed.data);
                        }} data-testid="btn-save-personal-template">{save.isPending ? "Saving..." : "Save template"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
