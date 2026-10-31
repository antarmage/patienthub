import type { BillingTemplateItem } from "../../../../lib/db/src/billing-templates";

export interface BillingTemplateOption {
    id: number;
    name: string;
    price: number;
    taxRate: number;
    kind: "catalog" | "inventory";
    isActive: boolean;
}

export function resolveTemplateItems(items: BillingTemplateItem[], options: BillingTemplateOption[]) {
    return items.map((item) => {
        const kind = item.catalogItemId != null ? "catalog" : "inventory";
        const id = item.catalogItemId ?? item.inventoryItemId;
        const option = options.find((entry) => entry.kind === kind && entry.id === id);
        if (!option || !option.isActive) throw new Error("A template item is no longer available. Edit the template before using it.");
        return { ...item, name: option.name, price: option.price, taxRate: option.taxRate, isEstimated: true };
    });
}
