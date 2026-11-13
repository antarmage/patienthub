import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { clinicDate } from "../../../../lib/db/src/follow-up";
import { expenseDateSchema, expenseDraftSchema, expensePaymentMethodSchema, expenseRecordSchema, expenseTotals, type ExpenseDraft, type ExpenseRecord } from "../../../../lib/db/src/expenses";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { DateInput } from "./ui/date-input";

type ExpenseFormDraft = Omit<ExpenseDraft, "entryType" | "itemName" | "unit" | "quantity" | "unitPrice"> & {
  itemName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};
const monthStart = () => `${clinicDate().slice(0, 7)}-01`;
const blankDraft = (): ExpenseFormDraft => ({ date: clinicDate(), amount: 0, category: "", description: "", paymentMethod: "cash", itemName: "", unit: "", quantity: "", unitPrice: "" });
const money = (amount: number) => amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });

export function Expenses({ owner = false, token }: { owner?: boolean; token?: string }) {
  const queryClient = useQueryClient();
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(clinicDate);
  const [draft, setDraft] = useState(blankDraft);
  const [entryType, setEntryType] = useState<"general" | "daily_purchase" | "monthly_expense">("general");
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
    setEntryType("general");
    if (fileInput.current) fileInput.current.value = "";
    setError("");
  };
  const save = useMutation({
    mutationFn: async () => {
      const { itemName, unit, quantity, unitPrice, ...generalDraft } = draft;
      const entry = entryType === "daily_purchase" ? {
        ...generalDraft,
        date: draft.date,
        amount: Number(quantity) * Number(unitPrice),
        category: "Supplies",
        description: `Purchase: ${quantity} ${unit} of ${itemName}`,
        entryType,
        itemName,
        unit,
        quantity,
        unitPrice,
      } : {
        ...generalDraft,
        date: entryType === "monthly_expense" ? `${draft.date.slice(0, 7)}-01` : draft.date,
        entryType,
      };
      const parsed = expenseDraftSchema.safeParse(entry);
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
      const savedDate = entryType === "monthly_expense" ? `${draft.date.slice(0, 7)}-01` : draft.date;
      setStart(savedDate);
      setEnd(entryType === "monthly_expense"
        ? new Date(Date.UTC(Number(savedDate.slice(0, 4)), Number(savedDate.slice(5, 7)), 0)).toISOString().slice(0, 10)
        : savedDate);
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
  const expensesByCategory = Object.entries((records.data || []).reduce<Record<string, number>>((categories, record) => {
    categories[record.category] = (categories[record.category] || 0) + record.amount;
    return categories;
  }, {})).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  const monthlyExpenses = (records.data || []).filter((record) => record.entryType === "monthly_expense").reduce((sum, record) => sum + record.amount, 0);
  const dayToDayExpenses = totals.total - monthlyExpenses;
  const periodDays = filterValid
    ? Math.max(1, Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1)
    : 1;
  const spendTrend = totals.daily.slice(0, 14).reverse();
  const highestDailySpend = Math.max(0, ...spendTrend.map((day) => day.amount));
  return <section className="space-y-5" aria-label="Expense tracking">
    <header><h2 className="font-serif text-2xl font-bold text-saivie-plum">Expenses</h2><p className="mt-1 text-sm text-muted-foreground">Record clinic spending, including daily item purchases and total expenses by month. Only owners can edit or delete saved entries.</p></header>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-saivie-border bg-white p-4" aria-label="Expense reporting period">
      <div><Label htmlFor="expense-from">From</Label><DateInput id="expense-from" value={start} onValueChange={setStart} onInput={(event) => setStart(event.currentTarget.value)} required /></div>
      <div><Label htmlFor="expense-to">To</Label><DateInput id="expense-to" value={end} onValueChange={setEnd} onInput={(event) => setEnd(event.currentTarget.value)} required /></div>
      <Button variant="outline" onClick={() => { setStart(clinicDate()); setEnd(clinicDate()); }}>Today</Button>
      <Button variant="outline" disabled={!filterValid || records.isFetching} onClick={() => void records.refetch()}>Refresh</Button>
      {!filterValid && <p role="alert" className="w-full text-sm text-rose-700">Choose a valid date range with the start on or before the end.</p>}
    </section>
    {owner && records.isSuccess && <>
      <section className="space-y-4" aria-label="Clinic expense dashboard" data-testid="expense-dashboard">
        <header>
          <h3 className="font-serif text-xl font-bold text-saivie-plum">Clinic expense dashboard</h3>
          <p className="mt-1 text-sm text-muted-foreground">Understand total outflow, recurring monthly bills and day-to-day spending for the selected period.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total expenses", amount: totals.total, color: "text-saivie-plum", testId: "expense-total" },
            { label: "Monthly bills", amount: monthlyExpenses, color: "text-amber-700", testId: "expense-monthly-total" },
            { label: "Day-to-day spend", amount: dayToDayExpenses, color: "text-saivie-teal", testId: "expense-day-to-day-total" },
            { label: "Period average / day", amount: totals.total / periodDays, color: "text-blue-700", testId: "expense-daily-average" },
          ].map((metric) => (
            <Card key={metric.label} className="border-saivie-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                <p className={`mt-2 text-xl font-bold ${metric.color}`} data-testid={metric.testId}>{money(metric.amount)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-saivie-border bg-white p-5" aria-label="Expense categories">
            <h4 className="font-semibold text-saivie-plum">Where the money goes</h4>
            {expensesByCategory.length === 0 ? <p className="py-6 text-sm text-muted-foreground">No expenses recorded for this period.</p> : (
              <ul className="mt-4 space-y-4">
                {expensesByCategory.map(({ category, amount }) => (
                  <li key={category}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-saivie-plum">{category}</span>
                      <span className="shrink-0 font-semibold text-saivie-plum">{money(amount)} <span className="font-normal text-muted-foreground">({totals.total > 0 ? Math.round((amount / totals.total) * 100) : 0}%)</span></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-saivie-sage/50" role="presentation">
                      <div className="h-full rounded-full bg-saivie-teal" style={{ width: `${totals.total > 0 ? (amount / totals.total) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-saivie-border bg-white p-5" aria-label="Daily expense trend">
            <h4 className="font-semibold text-saivie-plum">Daily spend trend</h4>
            <p className="mt-1 text-xs text-muted-foreground">Latest 14 spending days; monthly bills are excluded from this trend.</p>
            {spendTrend.length === 0 ? <p className="py-6 text-sm text-muted-foreground">No day-to-day spending recorded for this period.</p> : (
              <div className="mt-5 flex min-h-36 items-end gap-2 overflow-x-auto pb-1" role="img" aria-label={`Daily spending amounts for latest spending days: ${spendTrend.map((day) => `${day.date}, ${money(day.amount)}`).join("; ")}`}>
                {spendTrend.map((day) => (
                  <div key={day.date} className="flex min-w-8 flex-1 flex-col items-center justify-end gap-2" title={`${day.date}: ${money(day.amount)}`}>
                    <div className="w-full rounded-t bg-saivie-teal/80" style={{ height: `${Math.max(4, (day.amount / highestDailySpend) * 96)}px` }} />
                    <span className="text-[10px] text-muted-foreground">{day.date.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </>}
    <form className="space-y-4 rounded-2xl border border-saivie-border bg-white p-5" onSubmit={(event) => { event.preventDefault(); setError(""); save.mutate(); }}>
      <h3 className="font-semibold">{editing === null ? "Add expense" : `Edit expense #${editing}`}</h3>
      <div className="max-w-sm"><Label htmlFor="expense-entry-type">Entry type</Label><select id="expense-entry-type" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={entryType} onChange={(event) => setEntryType(event.target.value === "daily_purchase" ? event.target.value : event.target.value === "monthly_expense" ? event.target.value : "general")}>
        <option value="general">General expense</option><option value="daily_purchase">Daily item purchase</option><option value="monthly_expense">Monthly expense</option>
      </select></div>
      <fieldset disabled={save.isPending || remove.isPending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><Label htmlFor="expense-date">{entryType === "monthly_expense" ? "Expense month" : "Date"}</Label>{entryType === "monthly_expense"
          ? <Input id="expense-date" type="month" value={draft.date.slice(0, 7)} max={clinicDate().slice(0, 7)} onChange={(event) => setDraft({ ...draft, date: `${event.target.value}-01` })} required />
          : <DateInput id="expense-date" value={draft.date} onValueChange={(date) => setDraft({ ...draft, date })} onInput={(event) => setDraft({ ...draft, date: event.currentTarget.value })} max={clinicDate()} required />}</div>
        {entryType === "daily_purchase" ? <>
          <div><Label htmlFor="expense-item-name">Item</Label><Input id="expense-item-name" value={draft.itemName} maxLength={100} placeholder="e.g. Tea" onChange={(event) => setDraft({ ...draft, itemName: event.target.value })} required /></div>
          <div><Label htmlFor="expense-item-unit">Unit</Label><Input id="expense-item-unit" value={draft.unit} maxLength={40} placeholder="e.g. packets, cups, boxes" onChange={(event) => setDraft({ ...draft, unit: event.target.value })} required /></div>
          <div><Label htmlFor="expense-item-quantity">Quantity purchased</Label><Input id="expense-item-quantity" type="number" step="0.001" min="0.001" max="1000000" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} required /></div>
          <div><Label htmlFor="expense-item-price">Price per unit (INR)</Label><Input id="expense-item-price" type="number" step="0.01" min="0.01" max="100000000" value={draft.unitPrice} onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })} required /></div>
          <div><Label htmlFor="expense-amount">Total (INR)</Label><Input id="expense-amount" type="text" value={money(Number(draft.quantity || 0) * Number(draft.unitPrice || 0))} readOnly aria-readonly="true" /></div>
        </> : <>
          <div><Label htmlFor="expense-amount">Amount (INR)</Label><Input id="expense-amount" type="number" step="0.01" min="0.01" max="100000000" value={draft.amount || ""} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} required /></div>
          <div><Label htmlFor="expense-category">Category</Label><Input id="expense-category" list="expense-categories" value={draft.category} maxLength={100} onChange={(event) => setDraft({ ...draft, category: event.target.value })} required /><datalist id="expense-categories">{["Supplies", "Utilities", "Rent", "Maintenance", "Travel", "Staff welfare", "Other"].map((category) => <option key={category} value={category} />)}</datalist></div>
        </>}
        <div><Label htmlFor="expense-payment">Payment method</Label><select id="expense-payment" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.paymentMethod} onChange={(event) => {
          const paymentMethod = expensePaymentMethodSchema.parse(event.target.value);
          setDraft({ ...draft, paymentMethod });
        }}>{[["cash", "Cash"], ["card", "Card"], ["upi", "UPI"], ["bank_transfer", "Bank transfer"], ["other", "Other"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {entryType !== "daily_purchase" && <div className="sm:col-span-2"><Label htmlFor="expense-description">Description</Label><Textarea id="expense-description" value={draft.description} maxLength={2000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} required /></div>}
        <div className="sm:col-span-2"><Label htmlFor="expense-receipt">Receipt (optional)</Label><Input ref={fileInput} id="expense-receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setReceipt(event.target.files?.[0] || null)} /><p className="mt-1 text-xs text-muted-foreground">PDF, JPG or PNG, up to 5 MB.{editing !== null && " Leave empty to keep the current receipt; selecting a file replaces it."}</p></div>
      </fieldset>
      <div className="flex gap-2"><Button type="submit" disabled={save.isPending || remove.isPending}>{save.isPending ? "Saving..." : editing === null ? "Save expense" : "Save changes"}</Button>{editing !== null && <Button type="button" variant="outline" disabled={save.isPending} onClick={reset}>Cancel edit</Button>}</div>
    </form>
    <section className="space-y-4 rounded-2xl border border-saivie-border bg-white p-5" aria-label="Expense tracking">
      {filterValid && records.isPending && <p role="status">Loading expenses...</p>}
      {filterValid && records.isError && <p role="alert" className="text-rose-700">{records.error.message}</p>}
      {filterValid && records.isSuccess && <>
        <p className="text-lg font-semibold">Total: {money(totals.total)} <span className="text-sm font-normal text-muted-foreground">({records.data.length} entries)</span></p>
        <div className="flex flex-wrap gap-2" aria-label="Daily totals">{totals.daily.map((day) => <p key={day.date} className="rounded-lg bg-saivie-sage/40 px-3 py-2 text-sm">{day.date}: <strong>{money(day.amount)}</strong></p>)}</div>
          {!records.data.length ? <p className="py-6 text-center text-muted-foreground">No expenses recorded for these dates.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{["Date / month", "Category", "Description / item", "Amount", "Payment", "Receipt", ...(owner ? ["Actions"] : [])].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead><tbody>
          {records.data.map((record) => <tr key={record.id} className="border-b align-top">
              <td className="whitespace-nowrap p-3">{record.entryType === "monthly_expense" ? record.date.slice(0, 7) : record.date}</td><td className="p-3">{record.category}</td><td className="max-w-sm whitespace-pre-wrap break-words p-3">{record.itemName ? <><div className="font-medium">{record.itemName}</div><div className="text-xs text-muted-foreground">{record.quantity} {record.unit} x {money(record.unitPrice || 0)} per unit</div></> : record.description}</td><td className="whitespace-nowrap p-3 font-semibold">{money(record.amount)}</td><td className="p-3">{record.paymentMethod?.replace(/_/g, " ") || "Not recorded"}</td>
            <td className="p-3">{record.receiptName ? <Button variant="link" disabled={downloading !== null} onClick={() => void download(record)}>{downloading === record.id ? "Loading..." : "Download receipt"}</Button> : "No receipt"}</td>
            {owner && <td className="p-3"><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={save.isPending || remove.isPending} onClick={() => {
              const payment = expensePaymentMethodSchema.safeParse(record.paymentMethod?.toLowerCase().replace(/ /g, "_"));
              const editType = record.entryType === "daily_purchase" ? "daily_purchase" : record.entryType === "monthly_usage" || record.entryType === "monthly_expense" ? "monthly_expense" : "general";
              setEntryType(editType);
              setDraft({ date: record.date, amount: record.amount, category: record.category, description: record.description || "", paymentMethod: payment.success ? payment.data : "other", itemName: editType === "daily_purchase" ? record.itemName || "" : "", unit: editType === "daily_purchase" ? record.unit || "" : "", quantity: editType === "daily_purchase" ? record.quantity?.toString() || "" : "", unitPrice: editType === "daily_purchase" ? record.unitPrice?.toString() || "" : "" });
              setEditing(record.id); setReceipt(null); setError(payment.success ? "" : "The original payment method is missing or not a supported option. Select the correct method before saving."); if (fileInput.current) fileInput.current.value = "";
            }}>Edit</Button>{deleting === record.id ? <><Button variant="destructive" disabled={remove.isPending} onClick={() => { setError(""); remove.mutate(record.id); }}>Confirm delete</Button><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button></> : <Button variant="outline" disabled={save.isPending || remove.isPending} onClick={() => setDeleting(record.id)}>Delete</Button>}</div></td>}
          </tr>)}
        </tbody></table></div>}
      </>}
    </section>
  </section>;
}
