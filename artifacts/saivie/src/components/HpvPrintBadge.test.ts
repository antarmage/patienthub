import assert from "node:assert/strict";
import test from "node:test";
import { hpvPrintBadgeHtml } from "./HpvPrintBadge";

test("shared print badge distinguishes reported, partial, negative and unknown vaccination", () => {
    for (const [answer, status] of [
        ["Yes, all doses", "protected"], ["Yes, some doses", "in-progress"],
        ["No", "not-vaccinated"], ["Not sure", "unknown"], ["", "not-recorded"],
    ]) {
        const html = hpvPrintBadgeHtml(answer);
        assert.ok(html.includes(`data-testid="hpv-print-badge-${status}"`));
        assert.ok(html.includes("print-color-adjust:exact"));
        assert.equal(html.includes("<svg"), status === "protected" || status === "in-progress");
    }
    assert.ok(hpvPrintBadgeHtml("No", "protected").includes('data-testid="hpv-print-badge-protected"'));
    assert.ok(hpvPrintBadgeHtml(undefined, "in-progress").includes('data-testid="hpv-print-badge-in-progress"'));
});
