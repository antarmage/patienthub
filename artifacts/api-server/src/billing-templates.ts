import type { Express, Request, Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { personalBillingTemplates, billingCatalog, inventoryItems } from "@workspace/db";
import { billingTemplateDraftSchema, type BillingTemplateDraft, type PersonalBillingTemplate } from "../../../lib/db/src/billing-templates";
import { db } from "./db";

export interface BillingTemplateStore {
  list(userId: string): Promise<PersonalBillingTemplate[]>;
  save(userId: string, draft: BillingTemplateDraft, id?: number): Promise<PersonalBillingTemplate | undefined>;
  remove(userId: string, id: number): Promise<boolean>;
}

export const billingTemplateStore: BillingTemplateStore = {
  async list(userId) {
    const rows = await db.select().from(personalBillingTemplates).where(eq(personalBillingTemplates.userId, userId));
    return rows.map(({ id, name, groupName, items }) => ({ id, name, groupName, items }));
  },
  async save(userId, draft, id) {
    const serviceIds = draft.items.flatMap((item) => item.catalogItemId == null ? [] : [item.catalogItemId]);
    const productIds = draft.items.flatMap((item) => item.inventoryItemId == null ? [] : [item.inventoryItemId]);
    const [services, products] = await Promise.all([
      db.select({ id: billingCatalog.id, isActive: billingCatalog.isActive }).from(billingCatalog).where(inArray(billingCatalog.id, serviceIds)),
      db.select({ id: inventoryItems.id, isActive: inventoryItems.isActive, sellingPrice: inventoryItems.sellingPrice }).from(inventoryItems).where(inArray(inventoryItems.id, productIds)),
    ]);
    if (services.length !== serviceIds.length || products.length !== productIds.length
      || services.some((item) => item.isActive === false)
      || products.some((item) => !item.isActive || item.sellingPrice == null)) {
      throw Object.assign(new Error("One or more template items are unavailable. Review the template items."), { status: 400 });
    }
    const rows = id == null
      ? await db.insert(personalBillingTemplates).values({ ...draft, userId }).returning()
      : await db.update(personalBillingTemplates).set(draft).where(and(eq(personalBillingTemplates.id, id), eq(personalBillingTemplates.userId, userId))).returning();
    const saved = rows[0];
    return saved ? { id: saved.id, name: saved.name, groupName: saved.groupName, items: saved.items } : undefined;
  },
  async remove(userId, id) {
    const rows = await db.delete(personalBillingTemplates).where(and(eq(personalBillingTemplates.id, id), eq(personalBillingTemplates.userId, userId))).returning({ id: personalBillingTemplates.id });
    return rows.length > 0;
  },
};

export function registerBillingTemplateRoutes(
  app: Express,
  authenticate: (req: Request, res: Response) => Promise<string | null>,
  store: BillingTemplateStore = billingTemplateStore,
) {
  app.get("/api/billing-templates", async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;
    res.json(await store.list(userId));
  });
  const save = async (req: Request, res: Response) => {
    const userId = await authenticate(req, res);
    if (!userId) return;
    const id = req.params.id == null ? undefined : Number(req.params.id);
    if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0)) return res.status(400).json({ error: "Invalid template ID" });
    const parsed = billingTemplateDraftSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") });
    const template = await store.save(userId, parsed.data, id);
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.status(id == null ? 201 : 200).json(template);
  };
  app.post("/api/billing-templates", save);
  app.patch("/api/billing-templates/:id", save);
  app.delete("/api/billing-templates/:id", async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid template ID" });
    if (!await store.remove(userId, id)) return res.status(404).json({ error: "Template not found" });
    res.status(204).send();
  });
}
