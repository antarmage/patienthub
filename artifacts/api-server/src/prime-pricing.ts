import type { BillingCatalog, InventoryItem, Patient, PrimePricingRules } from "@workspace/db";

export interface RequestedInvoiceItem {
  catalogItemId?: number;
  inventoryItemId?: number;
  quantity: number;
}

export interface CalculatedInvoiceItem extends RequestedInvoiceItem {
  name: string;
  category: string;
  price: number;
  taxableSubtotal: number;
  taxRate: number;
  taxAmount: number;
  catalogPriceIncludesTax: boolean;
  discountAmount: number;
  discountLabel: string | null;
  lineTotal: number;
}

export interface InvoiceQuote {
  items: CalculatedInvoiceItem[];
  subtotal: number;
  tax: number;
  discountTotal: number;
  discountDetails: Array<{ catalogItemId?: number; inventoryItemId?: number; name: string; amount: number; label: string }>;
  total: number;
  isPrimeMember: boolean;
}

const roundCurrency = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
const categoryKey = (category: string | null | undefined) => (category || "").trim().toLowerCase();

export function calculateInvoiceQuote(
  requestedItems: RequestedInvoiceItem[],
  catalog: BillingCatalog[],
  patient: Patient,
  rules: PrimePricingRules,
  inventory: InventoryItem[] = [],
): InvoiceQuote {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new Error("Add at least one billable service");
  }

  const eligibleConsultationIds = new Set(rules.consultationItemIds || []);
  const isPrimeMember = patient.isPrimeMember === true;
  const items = requestedItems.map((requested) => {
    const hasCatalogId = Number.isInteger(requested.catalogItemId) && Number(requested.catalogItemId) > 0;
    const hasInventoryId = Number.isInteger(requested.inventoryItemId) && Number(requested.inventoryItemId) > 0;
    if (hasCatalogId === hasInventoryId) {
      throw new Error("Invalid catalog item");
    }
    if (!Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > 1000) {
      throw new Error("Item quantity must be between 1 and 1000");
    }

    if (hasInventoryId) {
      const product = inventory.find((item) => item.id === requested.inventoryItemId && item.isActive);
      if (!product || product.sellingPrice == null || !Number.isFinite(Number(product.sellingPrice)) || Number(product.sellingPrice) < 0) {
        throw new Error("A selected product is unavailable or has no selling price");
      }
      if (requested.quantity > product.quantity) {
        throw new Error(`Only ${product.quantity} ${product.unit} of ${product.name} in stock`);
      }
      const price = Number(product.sellingPrice);
      const taxRate = Math.max(0, Number(product.taxRate) || 0);
      const total = roundCurrency(price * requested.quantity);
      const taxableSubtotal = taxRate > 0 ? roundCurrency(total / (1 + taxRate / 100)) : total;
      const discountPercent = Math.min(100, Math.max(0, Number(isPrimeMember ? product.primeDiscountPercent : product.nonPrimeDiscountPercent) || 0));
      const discountAmount = roundCurrency(taxableSubtotal * discountPercent / 100);
      const taxAmount = roundCurrency((taxableSubtotal - discountAmount) * taxRate / 100);
      return {
        inventoryItemId: product.id,
        name: product.name,
        category: product.category || "Product",
        price,
        quantity: requested.quantity,
        taxableSubtotal,
        taxRate,
        taxAmount,
        catalogPriceIncludesTax: taxRate > 0,
        discountAmount,
        discountLabel: discountAmount > 0
          ? `${isPrimeMember ? "Prime" : "Non-Prime"} product discount ${discountPercent}%`
          : null,
        lineTotal: roundCurrency(taxableSubtotal + taxAmount - discountAmount),
      };
    }

    const catalogItem = catalog.find((item) => item.id === requested.catalogItemId && item.isActive !== false);
    if (!catalogItem) throw new Error("A selected service is no longer available");

    const price = Number(catalogItem.price);
    if (!Number.isFinite(price) || price < 0) throw new Error(`Invalid catalog price for ${catalogItem.name}`);

    const category = catalogItem.category || "Other";
    const isConsultation = categoryKey(category) === "consultation";
    const isLabTest = categoryKey(category) === "lab test";
    const taxRate = isConsultation ? 0 : Math.max(0, Number(catalogItem.taxRate) || 0);
    const catalogAmount = roundCurrency(price * requested.quantity);
    const catalogPriceIncludesTax = isLabTest && taxRate > 0;
    const taxableSubtotal = catalogPriceIncludesTax
      ? roundCurrency(catalogAmount / (1 + taxRate / 100))
      : catalogAmount;
    let discountAmount = 0;
    let discountLabel: string | null = null;

    if (isPrimeMember && isConsultation && eligibleConsultationIds.has(catalogItem.id)) {
      const consultationFee = Math.max(0, Number(rules.consultationFee) || 0);
      discountAmount = roundCurrency(Math.min(taxableSubtotal, Math.max(0, taxableSubtotal - consultationFee * requested.quantity)));
      if (discountAmount > 0) discountLabel = `Prime consultation fee ₹${consultationFee}`;
    } else if (isPrimeMember && isLabTest) {
      const discountPercent = Math.min(100, Math.max(0, Number(rules.labDiscountPercent) || 0));
      discountAmount = roundCurrency(taxableSubtotal * discountPercent / 100);
      if (discountAmount > 0) discountLabel = `Prime lab discount ${discountPercent}%`;
    }
    const taxAmount = roundCurrency((taxableSubtotal - discountAmount) * taxRate / 100);

    return {
      catalogItemId: catalogItem.id,
      name: catalogItem.name,
      category,
      price,
      quantity: requested.quantity,
      taxableSubtotal,
      taxRate,
      taxAmount,
      catalogPriceIncludesTax,
      discountAmount,
      discountLabel,
      lineTotal: roundCurrency(taxableSubtotal + taxAmount - discountAmount),
    };
  });

  const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.taxableSubtotal, 0));
  const tax = roundCurrency(items.reduce((sum, item) => sum + item.taxAmount, 0));
  const discountTotal = roundCurrency(items.reduce((sum, item) => sum + item.discountAmount, 0));
  const discountDetails = items
    .filter((item) => (item.catalogItemId || item.inventoryItemId) && item.discountAmount > 0 && item.discountLabel)
    .map((item) => ({
      ...(item.catalogItemId ? { catalogItemId: item.catalogItemId } : {}),
      ...(item.inventoryItemId ? { inventoryItemId: item.inventoryItemId } : {}),
      name: item.name,
      amount: item.discountAmount,
      label: item.discountLabel!,
    }));

  return {
    items,
    subtotal,
    tax,
    discountTotal,
    discountDetails,
    total: roundCurrency(subtotal + tax - discountTotal),
    isPrimeMember,
  };
}