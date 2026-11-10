import { z } from "zod/v4";
import { clinicDate } from "./follow-up";

export const expenseDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date.");

export const expenseDraftSchema = z.object({
  date: expenseDateSchema.refine((value) => value <= clinicDate(), "Expense date cannot be in the future."),
  amount: z.union([z.number(), z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Enter an amount with at most two decimal places.")]).transform(Number).pipe(
    z.number().positive().max(100_000_000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "Use at most two decimal places."),
  ),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
  paymentMethod: z.enum(["cash", "card", "upi", "bank_transfer", "other"]),
}).strict();
export type ExpenseDraft = z.infer<typeof expenseDraftSchema>;
export const expenseRecordSchema = z.object({
  id: z.number().int().positive(),
  date: expenseDateSchema,
  amount: z.number().finite(),
  category: z.string(),
  description: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  receiptName: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string().nullable(),
});
export type ExpenseRecord = z.infer<typeof expenseRecordSchema>;

export function expenseTotals(records: ExpenseRecord[]) {
  const daily = new Map<string, number>();
  for (const record of records) daily.set(record.date, (daily.get(record.date) || 0) + Math.round(record.amount * 100));
  return {
    total: [...daily.values()].reduce((sum, amount) => sum + amount, 0) / 100,
    daily: [...daily.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, amount]) => ({ date, amount: amount / 100 })),
  };
}
