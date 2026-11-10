import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { clinicDate } from "../../../../lib/db/src/follow-up";
import { expenseDateSchema, expenseDraftSchema, expenseRecordSchema, expenseTotals, type ExpenseDraft, type ExpenseRecord } from "../../../../lib/db/src/expenses";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { DateInput } from "./ui/date-input";

const blankDraft = (): ExpenseDraft => ({ date: clinicDate(), amount: 0, category: "", description: "", paymentMethod: "cash" });
const money = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });

export function Expenses({ owner = false, token }: { owner?: boolean; token?: string }) {
  const queryClient = useQueryClient();
  const [start, setStart] = useState(clinicDate);
  const [end, setEnd] = useState(clinicDate);
  const [draft, setDraft] = useState(blankDraft);
  const [editing, setEditing] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const request = (url: string, init?: RequestInit) => authenticatedFetch(url, { ...init, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) });
  const filterValid = expenseDateSchema.safeParse(start).success && expenseDateSchema.safeParse(end).success && start <= end;
  const records = useQuery({
    queryKey: ["/api/expenses", owner ? "owner" : "reception", start, end], enabled: filterValid,
    queryFn: async () => expenseRecordSchema.array().parse(await readApiResponse(await request(`/api/expenses?startDate=${start}&endDate=${end}`))),
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/owner/expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/owner/dashboard"] }),
    ]);
  };
  const reset = () => {
    setDraft(blankDraft()); setEditing(null); setReceipt(null);
    if (fileInput.current) fileInput.current.value = "";
    setError("");
  };
  const save = useMutation({
    mutationFn: async () => {
      const parsed = expenseDraftSchema.safeParse(draft);
      if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
      if (receipt && (receipt.size > 5 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(receipt.type))) {
        throw new Error("Choose a PDF, JPG or PNG receipt up to 5 MB.");
      }
      const body = new FormData();
      for (const [key, value] of Object.entries(parsed.data)) body.append(key, String(value));
      if (receipt) body.append("receipt", receipt);
      await readApiResponse(await request(`/api/expenses${editing === null ? "" : `/${editing}`}`, { method: editing === null ? "POST" : "PATCH", body }));
    },
    onSuccess: async () => {
      setStart(draft.date); setEnd(draft.date);
      reset();
      await refresh();
    },
    onError: (cause) => setError(cause.message),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => {
      const response = await request(`/api/expenses/${id}`, { method: "DELETE" });
      if (!response.ok) await readApiResponse(response);
    },
    onSuccess: async (_, id) => { setDeleting(null); if (editing === id) reset(); await refresh(); },
    onError: (cause) => setError(cause.message),
  });
  const download = async (record: ExpenseRecord) => {
    setError(""); setDownloading(record.id);
    try {
      const response = await request(`/api/expenses/${record.id}/receipt`);
      if (!response.ok) await readApiResponse(response);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = record.receiptName || "Receipt"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not download receipt."); }
    finally { setDownloading(null); }
  };
  const totals = expenseTotals(records.data || []);
  return <section className="space-y-5" aria-label="Daily expenses">
    <header><h2 className="font-serif text-2xl font-bold text-saivie-plum">Expenses</h2><p className="mt-1 text-sm text-muted-foreground">Record daily clinic spending and track expenses by date. Only owners can edit or delete saved entries.</p></header>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <form className="space-y-4 rounded-2xl border border-saivie-border bg-white p-5" onSubmit={(event) => { event.preventDefault(); setError(""); save.mutate(); }}>
      <h3 className="font-semibold">{editing === null ? "Add expense" : `Edit expense #${editing}`}</h3>
      <fieldset disabled={save.isPending || remove.isPending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><Label htmlFor="expense-date">Date</Label><DateInput id="expense-date" value={draft.date} onValueChange={(date) => setDraft({ ...draft, date })} onInput={(event) => setDraft({ ...draft, date: event.currentTarget.value })} max={clinicDate()} required /></div>
        <div><Label htmlFor="expense-amount">Amount (INR)</Label><Input id="expense-amount" type="number" step="0.01" min="0.01" max="100000000" value={draft.amount || ""} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} required /></div>
        <div><Label htmlFor="expense-category">Category</Label><Input id="expense-category" list="expense-categories" value={draft.category} maxLength={100} onChange={(event) => setDraft({ ...draft, category: event.target.value })} required /><datalist id="expense-categories">{["Supplies", "Utilities", "Rent", "Maintenance", "Travel", "Staff welfare", "Other"].map((category) => <option key={category} value={category} />)}</datalist></div>
        <div><Label htmlFor="expense-payment">Payment method</Label><select id="expense-payment" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.paymentMethod} onChange={(event) => {
          const paymentMethod = expenseDraftSchema.shape.paymentMethod.parse(event.target.value);
          setDraft({ ...draft, paymentMethod });
        }}>{[["cash", "Cash"], ["card", "Card"], ["upi", "UPI"], ["bank_transfer", "Bank transfer"], ["other", "Other"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="sm:col-span-2"><Label htmlFor="expense-description">Description</Label><Textarea id="expense-description" value={draft.description} maxLength={2000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} required /></div>
        <div className="sm:col-span-2"><Label htmlFor="expense-receipt">Receipt (optional)</Label><Input ref={fileInput} id="expense-receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setReceipt(event.target.files?.[0] || null)} /><p className="mt-1 text-xs text-muted-foreground">PDF, JPG or PNG, up to 5 MB.{editing !== null && " Leave empty to keep the current receipt; selecting a file replaces it."}</p></div>
      </fieldset>
      <div className="flex gap-2"><Button type="submit" disabled={save.isPending || remove.isPending}>{save.isPending ? "Saving..." : editing === null ? "Save expense" : "Save changes"}</Button>{editing !== null && <Button type="button" variant="outline" disabled={save.isPending} onClick={reset}>Cancel edit</Button>}</div>
    </form>
    <section className="space-y-4 rounded-2xl border border-saivie-border bg-white p-5" aria-label="Expense tracking">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label htmlFor="expense-from">From</Label><DateInput id="expense-from" value={start} onValueChange={setStart} onInput={(event) => setStart(event.currentTarget.value)} required /></div>
        <div><Label htmlFor="expense-to">To</Label><DateInput id="expense-to" value={end} onValueChange={setEnd} onInput={(event) => setEnd(event.currentTarget.value)} required /></div>
        <Button variant="outline" onClick={() => { setStart(clinicDate()); setEnd(clinicDate()); }}>Today</Button>
        <Button variant="outline" disabled={!filterValid || records.isFetching} onClick={() => void records.refetch()}>Refresh</Button>
      </div>
      {!filterValid && <p role="alert" className="text-sm text-rose-700">Choose a valid date range with the start on or before the end.</p>}
      {filterValid && records.isPending && <p role="status">Loading expenses...</p>}
      {filterValid && records.isError && <p role="alert" className="text-rose-700">{records.error.message}</p>}
      {filterValid && records.isSuccess && <>
        <p className="text-lg font-semibold">Total: {money(totals.total)} <span className="text-sm font-normal text-muted-foreground">({records.data.length} entries)</span></p>
        <div className="flex flex-wrap gap-2" aria-label="Daily totals">{totals.daily.map((day) => <p key={day.date} className="rounded-lg bg-saivie-sage/40 px-3 py-2 text-sm">{day.date}: <strong>{money(day.amount)}</strong></p>)}</div>
        {!records.data.length ? <p className="py-6 text-center text-muted-foreground">No expenses recorded for these dates.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{["Date", "Category", "Description", "Amount", "Payment", "Receipt", ...(owner ? ["Actions"] : [])].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead><tbody>
          {records.data.map((record) => <tr key={record.id} className="border-b align-top">
            <td className="whitespace-nowrap p-3">{record.date}</td><td className="p-3">{record.category}</td><td className="max-w-sm whitespace-pre-wrap break-words p-3">{record.description}</td><td className="whitespace-nowrap p-3 font-semibold">{money(record.amount)}</td><td className="p-3">{record.paymentMethod?.replace(/_/g, " ") || "Not recorded"}</td>
            <td className="p-3">{record.receiptName ? <Button variant="link" disabled={downloading !== null} onClick={() => void download(record)}>{downloading === record.id ? "Loading..." : "Download receipt"}</Button> : "No receipt"}</td>
            {owner && <td className="p-3"><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={save.isPending || remove.isPending} onClick={() => {
              const payment = expenseDraftSchema.shape.paymentMethod.safeParse(record.paymentMethod?.toLowerCase().replace(/ /g, "_"));
              setDraft({ date: record.date, amount: record.amount, category: record.category, description: record.description || "", paymentMethod: payment.success ? payment.data : "other" });
              setEditing(record.id); setReceipt(null); setError(payment.success ? "" : "The original payment method is missing or not a supported option. Select the correct method before saving."); if (fileInput.current) fileInput.current.value = "";
            }}>Edit</Button>{deleting === record.id ? <><Button variant="destructive" disabled={remove.isPending} onClick={() => { setError(""); remove.mutate(record.id); }}>Confirm delete</Button><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button></> : <Button variant="outline" disabled={save.isPending || remove.isPending} onClick={() => setDeleting(record.id)}>Delete</Button>}</div></td>}
          </tr>)}
        </tbody></table></div>}
      </>}
    </section>
  </section>;
}
