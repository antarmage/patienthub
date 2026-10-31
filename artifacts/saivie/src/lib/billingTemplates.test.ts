import assert from "node:assert/strict";
import test from "node:test";
import { billingTemplateDraftSchema } from "../../../../lib/db/src/billing-templates.ts";
import { resolveTemplateItems } from "./billingTemplates.ts";

const option = { id: 1, name: "Consultation", kind: "catalog" as const, price: 750, taxRate: 0, isActive: true };
const draft = { name: " Follow-up ", groupName: " Gynecology ", items: [{ catalogItemId: 1, quantity: 2 }] };

test("saved groups and names are trimmed and only item references and quantities are persisted", () => {
    const parsed = billingTemplateDraftSchema.parse(draft);
    assert.equal(parsed.name, "Follow-up");
    assert.equal(parsed.groupName, "Gynecology");
    assert.deepEqual(parsed.items, [{ catalogItemId: 1, quantity: 2 }]);
    assert.equal(billingTemplateDraftSchema.safeParse({ ...draft, userId: "other" }).success, false);
    assert.equal(billingTemplateDraftSchema.safeParse({ ...draft, items: [{ catalogItemId: 1, quantity: 1, price: 1 }] }).success, false);
});

test("invalid names, groups, quantities, mixed IDs and duplicate lines are rejected", () => {
    for (const value of [
        { ...draft, name: " " }, { ...draft, groupName: "" }, { ...draft, items: [] },
        ...[0, -1, 1.5, 1001].map((quantity) => ({ ...draft, items: [{ catalogItemId: 1, quantity }] })),
        { ...draft, items: [{ quantity: 1 }] },
        { ...draft, items: [{ catalogItemId: 1, inventoryItemId: 1, quantity: 1 }] },
        { ...draft, items: [draft.items[0], draft.items[0]] },
    ]) assert.equal(billingTemplateDraftSchema.safeParse(value).success, false);
});

test("applying a saved template uses current prices and GST and keeps services distinct from products", () => {
    const items = [{ catalogItemId: 1, quantity: 2 }, { inventoryItemId: 1, quantity: 3 }];
    const resolved = resolveTemplateItems(items, [option, { ...option, kind: "inventory", name: "Product", price: 60, taxRate: 18 }]);
    assert.equal(resolved[0].price, 750);
    assert.equal(resolved[1].price, 60);
    assert.equal(resolved[1].taxRate, 18);
    assert.equal(resolved[1].quantity, 3);
    assert.equal(resolveTemplateItems([items[0]], [{ ...option, price: 900 }])[0].price, 900);
});

test("missing or inactive items prevent partial application", () => {
    assert.throws(() => resolveTemplateItems([{ catalogItemId: 1, quantity: 1 }], []), /no longer available/);
    assert.throws(() => resolveTemplateItems([{ catalogItemId: 1, quantity: 1 }], [{ ...option, isActive: false }]), /no longer available/);
});
