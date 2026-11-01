import assert from "node:assert/strict";
import test from "node:test";
import { clinicalCareMode } from "./clinicalCareMode";
import { prescriptionTestOptions } from "./prescriptionTests";

test("patient types determine care rather than a static fertility fallback", () => {
    for (const [type, expected] of [
        ["Pregnant", "pregnancy"], ["Pregnancy", "pregnancy"], ["Antenatal", "pregnancy"], ["OBS", "pregnancy"],
        ["Fertility", "natural_conception"], ["Infertility", "natural_conception"], ["TTC", "natural_conception"],
        ["IVF cycle", "ivf"], ["IUI", "iui"], ["Ovulation induction", "induction"],
        ["PCOS", "hormone_care"], ["Irregular period", "hormone_care"],
        ["Postpartum", "postpartum"], ["MTP", "general"], ["Gynecology", "general"], ["General", "general"],
    ]) assert.equal(clinicalCareMode({ type }), expected, type);
    assert.equal(clinicalCareMode({}), "general");
    assert.equal(clinicalCareMode({ mode: "ivf" }), "ivf");
    assert.equal(clinicalCareMode({ mode: "pregnancy" }), "pregnancy");
    assert.equal(clinicalCareMode({ pregnancyStatus: "Pregnant" }), "pregnancy");
    assert.equal(clinicalCareMode({ type: "Pregnant", mode: "ttc" }), "pregnancy");
    assert.equal(clinicalCareMode({ type: "MTP", pregnancyStatus: "Pregnant" }), "general");
    assert.equal(clinicalCareMode({ type: "PCOS", mode: "ttc" }), "hormone_care");
});

test("non-fertility investigation options do not suggest follicular monitoring", () => {
    for (const type of ["General", "Gynecology", "PCOS", "Irregular period", "Postpartum", "MTP", "Pregnant"]) {
        assert.ok(!prescriptionTestOptions(type, 30).tests.some(({ name }) => name.includes("Follicular")), type);
    }
    assert.ok(prescriptionTestOptions("Pregnant", 30).tests.some(({ name }) => name.includes("Growth Scan")));
    assert.ok(prescriptionTestOptions("MTP", null).tests.some(({ name }) => name.includes("Confirm Intrauterine")));
});
