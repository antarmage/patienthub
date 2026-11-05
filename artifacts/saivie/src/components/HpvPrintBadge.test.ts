import assert from "node:assert/strict";
import test from "node:test";
import { cervicalCancerPreventionHtml, hpvPrintBadgeHtml } from "./HpvPrintBadge";

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

test("unvaccinated summary explains cervical cancer risk without diagnosing and lists prevention options", () => {
    const html = cervicalCancerPreventionHtml("No");
    for (const text of ["cervical-cancer-prevention-not-vaccinated", "Patient reports no HPV vaccination",
        "Persistent infection with high-risk HPV", "does not mean you have HPV or cancer",
        "cannot determine your personal cancer risk", "Vaccination:", "Pap smear", "HPV testing",
        "VIA", "colposcopy", "biopsy", "Avoid tobacco", "deferred during pregnancy",
        "do not treat existing HPV", "Screening is still needed after vaccination",
        "bleeding after sex", "WHO: cervical cancer", "CDC: HPV vaccination considerations"]) {
        assert.ok(html.includes(text), text);
    }
});

test("prevention advice distinguishes incomplete and unknown vaccination and respects clinic completion", () => {
    assert.equal(cervicalCancerPreventionHtml("Yes, all doses"), "");
    assert.equal(cervicalCancerPreventionHtml("No", "protected"), "");
    const partial = cervicalCancerPreventionHtml("No", "in-progress");
    assert.ok(partial.includes("completion is not documented"));
    assert.ok(!partial.includes("Patient reports no HPV vaccination"));
    for (const answer of ["Not sure", "", undefined]) {
        const html = cervicalCancerPreventionHtml(answer);
        assert.ok(html.includes("Check vaccination records"));
        assert.ok(!html.includes("Patient reports no HPV vaccination"));
    }
});
