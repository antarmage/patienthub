import assert from "node:assert/strict";
import { it } from "node:test";
import { initialLabSurvey, labSurveyErrors, labSurveyFlags, labSurveyPayload, labSurveyRows, surveyKindFor } from "./labSurvey.ts";

it("routes lab bookings to the lab survey unless staff override it", () => {
    assert.equal(surveyKindFor({ type: "Lab Test" }), "lab");
    assert.equal(surveyKindFor({ type: "Blood Test / Lab Work" }), "lab");
    assert.equal(surveyKindFor({ type: "Consultation" }), "consultation");
    assert.equal(surveyKindFor({ type: "Lab Test", surveyType: "consultation" }), "consultation");
    assert.equal(surveyKindFor({ type: "Follow-up", surveyType: "lab" }), "lab");
    assert.equal(surveyKindFor(null), "consultation");
});

it("requires a name, the tests or a prescription, and the last meal", () => {
    assert.equal(labSurveyErrors(initialLabSurvey, false).length, 3);
    const form = { ...initialLabSurvey, name: "A", lastMeal: "8–12 hours ago" };
    assert.equal(labSurveyErrors(form, false).length, 1);
    assert.deepEqual(labSurveyErrors(form, true), []);
    assert.deepEqual(labSurveyErrors({ ...form, tests: "TSH" }, false), []);
});

it("drops 'None' when real answers exist and keeps other medicines", () => {
    const payload = labSurveyPayload({ ...initialLabSurvey, name: " A ", medicines: ["Thyroid medicine"], otherMedicine: " Iron ", allergies: ["None"] });
    assert.equal(payload.patientDetails.name, "A");
    assert.deepEqual(payload.labSurvey.medicines, ["Thyroid medicine", "Iron"]);
    assert.deepEqual(payload.labSurvey.allergies, ["None"]);
});

it("flags fasting, biotin, fainting and allergies for the lab team", () => {
    const flags = labSurveyFlags({
        lastMeal: "Less than 2 hours ago", medicines: ["Biotin / hair-skin-nail supplement"],
        bloodDrawConcerns: ["I have fainted during a blood draw"], allergies: ["Latex"], recentIllness: "No",
    }).map((flag) => flag.text).join(" | ");
    assert.match(flags, /Not fasting/);
    assert.match(flags, /biotin/);
    assert.match(flags, /lying down/);
    assert.match(flags, /Allergy: Latex/);
    assert.doesNotMatch(flags, /Recent illness/);
    assert.deepEqual(labSurveyFlags({ lastMeal: "More than 12 hours ago", allergies: ["None"] }), []);
    assert.deepEqual(labSurveyRows({ tests: "CBC", prescriptionDocumentId: 4 }), [["Tests requested", "CBC"], ["Prescription", "Uploaded by patient (see Documents)"]]);
});
