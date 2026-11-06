import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { bookingCatalogSchema, bookingCategoryInput, type BookingCategory } from "../../../../lib/db/src/booking-catalog";
import { Button } from "@/components/ui/button";

const inputClass = "rounded border border-saivie-border p-2 text-sm";
export function BookingCatalogManager({ token, services }: { token: string; services: { id: number; name: string }[] }) {
  const cache = useQueryClient();
  const url = "/api/owner/booking-catalog";
  const queryKey = [url, token];
  const query = useQuery({ queryKey, queryFn: async () => bookingCatalogSchema.parse(await receptionRequest(url, { headers: { Authorization: `Bearer ${token}` } })), retry: false });
  const [editing, setEditing] = useState<BookingCategory | "new" | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const mutation = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body: unknown }) => receptionRequest(url + path, {
      method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    }),
    onSuccess: async () => {
      setEditing(null); setServiceId(null);
      await cache.invalidateQueries({ queryKey: [url] }); await cache.invalidateQueries({ queryKey: ["/api/booking-catalog"] });
    },
  });
  if (query.isPending) return <p role="status">Loading booking categories...</p>;
  if (query.isError && !query.data) return <p role="alert">{query.error.message} <Button onClick={() => { void query.refetch(); }}>Retry</Button></p>;
  const state = query.data;
  if (!state) return null;
  const selectedService = services.find((service) => service.id === serviceId);
  const assignment = state.assignments.find((item) => item.serviceId === serviceId);
  return <section className="space-y-3 rounded-xl border border-saivie-border bg-white p-4">
    <h3 className="font-semibold">Booking categories and service assignments</h3>
    <p className="text-sm">These are booking tabs, separate from billing categories. One service may belong to multiple tabs; fees and service IDs stay unchanged. Archived categories are hidden from booking, but services remain under All.</p>
    <Button disabled={mutation.isPending || !!editing || serviceId !== null} onClick={() => { setEditing("new"); mutation.reset(); }}>Add booking category</Button>
    {mutation.isError && <p role="alert" className="text-rose-700">{mutation.error.message}</p>}
    {query.isError && <p role="alert">Refresh failed: {query.error.message}. Previously loaded configuration retained.</p>}
    <div className="flex flex-wrap gap-2">{state.categories.map((category) => <Button key={category.id} variant="outline" disabled={mutation.isPending || !!editing || serviceId !== null}
      onClick={() => { setEditing(category); mutation.reset(); }}>{category.name} · {category.isActive ? "Active" : "Archived"} · order {category.sortOrder}</Button>)}</div>
    {editing && <CategoryForm key={typeof editing === "string" ? editing : editing.id} category={editing} busy={mutation.isPending}
      onCancel={() => setEditing(null)} onSave={(body) => mutation.mutate({ path: editing === "new" ? "/categories" : `/categories/${editing.id}`, method: editing === "new" ? "POST" : "PUT", body })} />}
    <label className="block text-sm">Find a service to assign<input className={`ml-2 ${inputClass}`} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    <div className="max-h-64 overflow-y-auto space-y-2">{services.filter((service) => service.name.toLowerCase().includes(search.toLowerCase())).map((service) => {
      const assigned = state.assignments.find((item) => item.serviceId === service.id);
      return <div key={service.id} className="flex items-center justify-between gap-2 border-t pt-2 text-sm">
        <span>{service.name} · {state.categories.filter((category) => assigned?.categoryIds.includes(category.id)).map((category) => category.name).join(", ") || "Unassigned"}</span>
        <Button variant="outline" disabled={mutation.isPending || !!editing || serviceId !== null} onClick={() => { setServiceId(service.id); mutation.reset(); }}>Assign categories</Button>
      </div>;
    })}</div>
    {selectedService && <AssignmentForm key={`${selectedService.id}`} serviceName={selectedService.name} categories={state.categories}
      initial={assignment?.categoryIds || []} version={assignment?.version || 0} busy={mutation.isPending}
      onCancel={() => setServiceId(null)} onSave={(body) => mutation.mutate({ path: `/services/${selectedService.id}`, method: "PUT", body })} />}
    <Button variant="link" disabled={mutation.isPending || !!editing || serviceId !== null} onClick={() => { void query.refetch(); }}>Reload configuration</Button>
    {(editing || serviceId !== null) && <p className="text-xs">If another owner changed this record, cancel and reload before editing again. Unsaved values remain available after a failed save.</p>}
  </section>;
}
function CategoryForm({ category, busy, onCancel, onSave }: {
  category: BookingCategory | "new"; busy: boolean; onCancel: () => void; onSave: (body: unknown) => void;
}) {
  const [data, setData] = useState(category === "new" ? { name: "", sortOrder: 80, isActive: true, careArea: "" as BookingCategory["careArea"], description: "" }
    : { name: category.name, sortOrder: category.sortOrder, isActive: category.isActive, careArea: category.careArea, description: category.description });
  const [error, setError] = useState("");
  return <form className="space-y-3 border p-3" onSubmit={(event) => {
    event.preventDefault(); const parsed = bookingCategoryInput.safeParse(data);
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join("; ")); return; }
    onSave(category === "new" ? parsed.data : { ...parsed.data, expectedVersion: category.version });
  }}><fieldset disabled={busy} className="space-y-3">
    <label className="block">Category name <input required className={inputClass} value={data.name} onChange={(event) => setData({ ...data, name: event.target.value })} /></label>
    <label className="block">Display order <input required type="number" min={0} max={10000} className={inputClass} value={data.sortOrder} onChange={(event) => setData({ ...data, sortOrder: Number(event.target.value) })} /></label>
    <label className="block">Suggested for care area <select className={inputClass} value={data.careArea} onChange={(event) => {
      const area = bookingCategoryInput.shape.careArea.parse(event.target.value); setData({ ...data, careArea: area });
    }}>{["", "Pregnancy", "Fertility", "Gynae", "PCOS", "Menopause"].map((area) => <option key={area} value={area}>{area || "No automatic suggestion"}</option>)}</select></label>
    <label className="block">Booking guidance <textarea className={inputClass} value={data.description} onChange={(event) => setData({ ...data, description: event.target.value })} /></label>
    <label className="block"><input type="checkbox" checked={data.isActive} onChange={(event) => setData({ ...data, isActive: event.target.checked })} /> Active booking tab</label>
    {error && <p role="alert">{error}</p>}<Button>Save category</Button> <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
  </fieldset></form>;
}
function AssignmentForm({ serviceName, categories, initial, version, busy, onSave, onCancel }: {
  serviceName: string; categories: BookingCategory[]; initial: number[]; version: number; busy: boolean;
  onSave: (body: unknown) => void; onCancel: () => void;
}) {
  const [ids, setIds] = useState(initial);
  return <form className="space-y-3 border p-3" onSubmit={(event) => { event.preventDefault(); onSave({ categoryIds: ids, expectedVersion: version }); }}>
    <fieldset disabled={busy}><legend>Booking categories for {serviceName}</legend>
      {categories.map((category) => <label key={category.id} className="block text-sm"><input type="checkbox" checked={ids.includes(category.id)}
        disabled={!category.isActive && !initial.includes(category.id)} onChange={(event) => setIds(event.target.checked ? [...ids, category.id] : ids.filter((id) => id !== category.id))} />
        {category.name}{!category.isActive ? " (archived)" : ""}</label>)}
      <Button>Save assignments</Button> <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
    </fieldset>
  </form>;
}
