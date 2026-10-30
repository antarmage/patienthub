import assert from "node:assert/strict";
import { it } from "node:test";
import { hpvProtection, hpvSurveyAnswer } from "./hpvProtection.ts";

it("treats either the survey answer or clinic records as proof of HPV protection", () => {
    assert.equal(hpvProtection("Yes, all doses", null), "protected");
    assert.equal(hpvProtection("No", "protected"), "protected");
    assert.equal(hpvProtection("Yes, some doses", "protected"), "protected");
    assert.equal(hpvProtection("Yes, some doses", null), "in-progress");
    assert.equal(hpvProtection("Not sure", "in-progress"), "in-progress");
    assert.equal(hpvProtection("No", null), null);
    assert.equal(hpvProtection("", undefined), null);
});

it("reads the HPV answer from the onboarding survey", () => {
    assert.equal(hpvSurveyAnswer({ history: { onboarding: { gyn: { hpvVaccine: " Yes, all doses " } } } }), "Yes, all doses");
    assert.equal(hpvSurveyAnswer({ history: {} }), "");
    assert.equal(hpvSurveyAnswer(null), "");
});
