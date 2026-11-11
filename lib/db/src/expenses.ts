import { z } from "zod/v4";
import { clinicDate } from "./follow-up";

export const expenseDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date.");

export const expensePaymentMethodSchema = z.enum(["cash", "card", "upi", "bank_transfer", "other"]);

export const expenseDraftSchema = z.object({
  date: expenseDateSchema.refine((value) => value <= clinicDate(), "Expense date cannot be in the future."),
  amount: z.union([z.number(), z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Enter an amount with at most two decimal places.")]).transform(Number).pipe(
    z.number().positive().max(100_000_000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "Use at most two decimal places."),
  ),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
  paymentMethod: expensePaymentMethodSchema,
  entryType: z.enum(["general", "daily_purchase", "monthly_usage"]).default("general"),
  itemName: z.string().trim().min(1).max(100).optional(),
  unit: z.string().trim().min(1).max(40).optional(),
  quantity: z.union([z.number(), z.string().regex(/^\d+(?:\.\d{1,3})?$/, "Enter a quantity with at most three decimal places.")]).transform(Number).pipe(
    z.number().positive().max(1_000_000),
  ).optional(),
  unitPrice: z.union([z.number(), z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a unit price with at most two decimal places.")]).transform(Number).pipe(
    z.number().positive().max(100_000_000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "Use at most two decimal places."),
  ).optional(),
}).strict().superRefine((draft, context) => {
  const itemFields = [draft.itemName, draft.unit, draft.quantity, draft.unitPrice];
  if (itemFields.some((value) => value !== undefined) && itemFields.some((value) => value === undefined)) {
    context.addIssue({ code: "custom", message: "Item name, unit, quantity and unit price must all be provided together." });
  }
  if (draft.entryType !== "general" && itemFields.some((value) => value === undefined)) {
    context.addIssue({ code: "custom", message: "Item purchases and monthly usage require item name, unit, quantity and unit price." });
  }
}).transform((draft) => draft.itemName && draft.quantity !== undefined && draft.unitPrice !== undefined
  ? { ...draft, amount: Math.round(draft.quantity * draft.unitPrice * 100) / 100 }
  : draft);
export type ExpenseDraft = z.infer<typeof expenseDraftSchema>;
export const expenseRecordSchema = z.object({
  id: z.number().int().positive(),
  date: expenseDateSchema,
  amount: z.number().finite(),
  category: z.string(),
  entryType: z.enum(["general", "daily_purchase", "monthly_usage"]).default("general"),
  description: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  itemName: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
  unitPrice: z.number().positive().nullable().optional(),
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
