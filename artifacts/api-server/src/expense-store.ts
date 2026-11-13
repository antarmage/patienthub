import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { expenses, expenseReceipts } from "@workspace/db";
import { db } from "./db";
import type { ExpenseStore } from "./expenses";

export const expenseStore: ExpenseStore = {
  async list(start, end) {
    return db.select().from(expenses).where(and(gte(expenses.date, start), lte(expenses.date, end))).orderBy(desc(expenses.date), desc(expenses.id));
  },
  async save(draft, userId, receipt, id) {
    return db.transaction(async (tx) => {
      const changes = {
        ...draft,
        itemName: draft.itemName ?? null,
        unit: draft.unit ?? null,
        quantity: draft.quantity ?? null,
        unitPrice: draft.unitPrice ?? null,
        ...(receipt ? { receiptName: receipt.name } : {}),
      };
      const [saved] = id === undefined
        ? await tx.insert(expenses).values({ ...changes, createdBy: userId }).returning()
        : await tx.update(expenses).set({ ...changes, updatedAt: new Date().toISOString(), updatedBy: userId }).where(eq(expenses.id, id)).returning();
      if (!saved) return undefined;
      if (receipt) await tx.insert(expenseReceipts).values({ expenseId: saved.id, mimeType: receipt.mimeType, fileData: receipt.data.toString("base64") })
        .onConflictDoUpdate({ target: expenseReceipts.expenseId, set: { mimeType: receipt.mimeType, fileData: receipt.data.toString("base64") } });
      return saved;
    });
  },
  async markReimbursementPaid(id, userId) {
    const [saved] = await db.update(expenses).set({
      reimbursementPaidAt: new Date().toISOString(),
      reimbursementPaidBy: userId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }).where(and(
      eq(expenses.id, id),
      eq(expenses.reimbursementRequested, true),
      isNull(expenses.reimbursementPaidAt),
    )).returning();
    if (saved) return saved;
    const [existing] = await db.select().from(expenses).where(and(
      eq(expenses.id, id),
      eq(expenses.reimbursementRequested, true),
    ));
    return existing;
  },
  async remove(id) {
    return (await db.delete(expenses).where(eq(expenses.id, id)).returning({ id: expenses.id })).length > 0;
  },
  async receipt(id) {
    const [row] = await db.select({ name: expenses.receiptName, mimeType: expenseReceipts.mimeType, data: expenseReceipts.fileData })
      .from(expenseReceipts).innerJoin(expenses, eq(expenses.id, expenseReceipts.expenseId)).where(eq(expenses.id, id));
    return row ? { name: row.name || "Receipt", mimeType: row.mimeType, data: Buffer.from(row.data, "base64") } : undefined;
  },
};
