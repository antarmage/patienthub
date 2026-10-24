import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { getPrintBrandStyles } from "./brand.ts";

const tokens = readFileSync(new URL("../../../../lib/brand/tokens.css", import.meta.url), "utf8");
const palette = Object.fromEntries([...tokens.matchAll(/--saivie-([\w-]+):\s*(#[A-Fa-f0-9]{6});/g)].map((match) => [match[1], match[2]]));

function luminance(hex: string) {
    const channels = [1, 3, 5].map((offset) => {
        const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

it("preserves the exact approved Saivie palette", () => {
    for (const [name, hex] of Object.entries({
        ivory: "#FFFFFC", sage: "#CFE2DC", blush: "#E5C4DB", plum: "#3E3440",
        teal: "#2F6B60", rose: "#8D5B7B", gold: "#B38B56",
        "surface-muted": "#F4F8F5", "surface-blush": "#F8EEF5", border: "#D8E2DD",
    })) assert.equal(palette[name], hex);
});

it("meets AA contrast for body text and primary actions", () => {
    for (const [foreground, background] of [["plum", "ivory"], ["plum", "sage"], ["plum", "blush"], ["ivory", "teal"], ["rose", "ivory"], ["teal", "sage"]]) {
        const a = luminance(palette[foreground]), b = luminance(palette[background]);
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
    }
});

it("makes the shared web theme available in every production web app", () => {
    for (const app of ["saivie", "saivie-desk", "saivie-recover", "saiviegene"]) {
        const css = readFileSync(new URL(`../../../${app}/src/index.css`, import.meta.url), "utf8");
        assert.ok(css.includes('lib/brand/saivie.css'), `${app} missing shared tokens`);
    }
});

it("copies current document tokens into standalone prints and rejects missing tokens", () => {
    const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    const oldGetComputedStyle = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
    let missing = false;
    Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: {} } });
    Object.defineProperty(globalThis, "getComputedStyle", {
        configurable: true,
        value: () => ({
            getPropertyValue: (property: string) => missing ? "" : palette[property.replace("--saivie-", "")] || palette.plum,
        }),
    });
    try {
        const css = getPrintBrandStyles();
        assert.ok(css.includes("--saivie-teal:#2F6B60;"));
        assert.ok(css.includes("--saivie-blush:#E5C4DB;"));
        missing = true;
        assert.throws(getPrintBrandStyles, /Missing Saivie brand token/);
    } finally {
        if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
        else Reflect.deleteProperty(globalThis, "document");
        if (oldGetComputedStyle) Object.defineProperty(globalThis, "getComputedStyle", oldGetComputedStyle);
        else Reflect.deleteProperty(globalThis, "getComputedStyle");
    }
});
