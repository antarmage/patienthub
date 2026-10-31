import { z } from "zod/v4";

export const billingTemplateItemSchema = z.object({
  catalogItemId: z.number().int().positive().optional(),
  inventoryItemId: z.number().int().positive().optional(),
  quantity: z.number().int().min(1).max(1000),
}).strict().refine((item) => (item.catalogItemId != null) !== (item.inventoryItemId != null), "Choose one service or product per item");

export const billingTemplateDraftSchema = z.object({
  name: z.string().trim().min(1).max(100),
  groupName: z.string().trim().min(1).max(100),
  items: z.array(billingTemplateItemSchema).min(1).max(100),
}).strict().refine((template) => {
  const keys = template.items.map((item) => item.catalogItemId != null ? `catalog:${item.catalogItemId}` : `inventory:${item.inventoryItemId}`);
  return new Set(keys).size === keys.length;
}, "Combine duplicate items using quantity");

export type BillingTemplateItem = z.infer<typeof billingTemplateItemSchema>;
export type BillingTemplateDraft = z.infer<typeof billingTemplateDraftSchema>;
export interface PersonalBillingTemplate extends BillingTemplateDraft {
  id: number;
}
