import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getOnboardingQuestions, getRelevantIntake, initialForm, isOnboardingStep, type IntakeForm, type OptionalHistory } from "./onboardingFlow.ts";
import { guidedQuestionsByDirection, surveyDirectionsForConcerns } from "./consultationSurvey.ts";

const short: OptionalHistory = { cycle: false, gyn: false, pregnancy: false, background: false };
const all: OptionalHistory = { cycle: true, gyn: true, pregnancy: true, background: true };
const formFor = (...concerns: string[]): IntakeForm => ({ ...structuredClone(initialForm), concerns });
const ids = (form: IntakeForm, extra = short) => getOnboardingQuestions(form, extra).map((question) => question.id);

describe("one-question onboarding", () => {
    it("keeps the baseline short without unrelated or sensitive follow-ups", () => {
        assert.deepEqual(ids(formFor()), [
            "name", "dob", "concerns", "chiefComplaint", "conditions", "medications",
            "allergies", "surgeries", "familyHistory", "extraBackground", "review",
        ]);
    });

    it("routes breast and bowel screening only to matching concerns or conditions", () => {
        assert.ok(ids(formFor("Breast problem")).includes("mammogram"));
        assert.ok(!ids(formFor("Breast problem")).includes("colonoscopy"));
        assert.ok(ids(formFor("Gut / bowel problems")).includes("colonoscopy"));
        for (const condition of ["Breast problem", "Irritable bowel syndrome", "Gut / bowel problems"]) {
            const form = formFor();
            form.health.conditions = [condition];
            assert.ok(ids(form).includes(condition === "Breast problem" ? "mammogram" : "colonoscopy"));
        }
        assert.ok(!ids(formFor("Routine checkup")).includes("mammogram"));
        assert.ok(!ids(formFor("Routine checkup")).includes("colonoscopy"));
    });

    it("shows pain questions only for a pain concern", () => {
        const painIds = ["painLocation", "painDuration", "painSeverity", "painSymptoms"];
        for (const id of painIds) {
            assert.ok(ids(formFor("Abdominal or pelvic pain")).includes(id));
            assert.ok(!ids(formFor("Breast problem")).includes(id));
        }
    });

    it("shows period history for fertility, missed periods and abnormal bleeding", () => {
        for (const concern of ["Fertility", "Missed or late period", "Irregular or heavy bleeding"]) {
            const result = ids(formFor(concern));
            assert.ok(result.includes("lastPeriod"));
            assert.ok(result.includes("cycleSymptoms"));
            assert.equal(result.includes("lateBy"), concern === "Missed or late period");
            assert.equal(result.includes("pregnancyTest"), concern === "Missed or late period");
        }
    });

    it("asks gestation and due date only after confirmed current pregnancy", () => {
        const form = formFor("Pregnancy care");
        for (const status of ["", "No", "Not sure", "Yes"]) {
            form.pregnancies.currentStatus = status;
            assert.equal(ids(form).includes("weeksPregnant"), status === "Yes");
            assert.equal(ids(form).includes("dueDate"), status === "Yes");
        }
    });

    it("reveals extra questions only after opting in", () => {
        const form = formFor("Fertility", "Birth control");
        form.pregnancies.total = "2";
        form.gyn.sexuallyActive = "Yes";
        for (const id of ["menarcheAge", "lastPap", "hpvVaccine", "firstEncounterAge", "partnerCount", "vaginal", "miscarriages", "smoking", "alcohol", "referredBy"]) {
            assert.ok(!ids(form).includes(id), `${id} should be opt-in`);
            assert.ok(ids(form, all).includes(id), `${id} should be reachable`);
        }
        form.gyn.sexuallyActive = "No";
        assert.ok(!ids(form, all).includes("firstEncounterAge"));
    });

    it("does not ask pregnancy outcome details when total pregnancies is zero or unanswered", () => {
        const form = formFor("Pregnancy care");
        for (const total of ["", "0"]) {
            form.pregnancies.total = total;
            assert.ok(!ids(form, all).includes("vaginal"));
            assert.ok(!ids(form, all).includes("extraPregnancy"));
        }
    });

    it("deduplicates overlapping concern questions and keeps review last", () => {
        const form = formFor("Fertility", "Missed or late period", "Irregular or heavy bleeding", "Abdominal or pelvic pain", "Pregnancy care", "Birth control");
        form.pregnancies.total = "2";
        form.pregnancies.currentStatus = "Yes";
        const result = ids(form, all);
        assert.equal(result.length, new Set(result).size);
        assert.equal(result.filter((id) => id === "lastPeriod").length, 1);
        assert.equal(result.at(-1), "review");
    });

    it("keeps skipped pregnancy counts blank and explicit zero distinct", () => {
        const form = formFor("Pregnancy care");
        assert.equal(getRelevantIntake(form, short).pregnancies.total, "");
        form.pregnancies.total = "0";
        assert.equal(getRelevantIntake(form, short).pregnancies.total, "0");
    });

    it("drops hidden follow-up answers without erasing back-navigation drafts", () => {
        const form = formFor("Pregnancy care", "Breast problem");
        form.pregnancies.currentStatus = "No";
        form.pregnancies.weeksPregnant = "12";
        form.pregnancies.dueDate = "2027-04-20";
        form.pregnancies.total = "0";
        form.pregnancies.miscarriages = "2";
        form.lifestyle.mammogram = "Within 1 year";
        form.lifestyle.colonoscopy = "Never had one";
        form.lifestyle.smoking = "Current";
        const result = getRelevantIntake(form, short);
        assert.equal(result.pregnancies.weeksPregnant, "");
        assert.equal(result.pregnancies.dueDate, "");
        assert.equal(result.pregnancies.miscarriages, "");
        assert.equal(result.lifestyle.mammogram, "Within 1 year");
        assert.equal(result.lifestyle.colonoscopy, "");
        assert.equal(result.lifestyle.smoking, "");
        assert.equal(form.pregnancies.weeksPregnant, "12");
        assert.equal(form.lifestyle.smoking, "Current");
    });

    it("excludes prior answers after changing the concern or declining extra history", () => {
        const form = formFor("Routine checkup");
        form.cycle.symptoms = ["Menstrual cramps"];
        form.pain.severity = "Severe";
        form.gyn.partnerCount = "2";
        const result = getRelevantIntake(form, short);
        assert.deepEqual(result.cycle.symptoms, []);
        assert.equal(result.pain.severity, "");
        assert.equal(result.gyn.partnerCount, "");
    });

    it("retains no-issues answers and preserves the existing submission schema", () => {
        const form = formFor("Irregular or heavy bleeding");
        form.cycle.symptoms = ["I am totally OK (no issues)"];
        form.health.medications = "Not taking any";
        const result = getRelevantIntake(form, short);
        assert.deepEqual(result.cycle.symptoms, ["I am totally OK (no issues)"]);
        assert.equal(result.health.medications, "Not taking any");
        assert.deepEqual(Object.keys(result).sort(), Object.keys(initialForm).sort());
    });

    it("does not ask for condition details after selecting none", () => {
        const form = formFor();
        form.health.conditions = ["None of these"];
        assert.ok(!ids(form).includes("medicalDetails"));
    });

    it("asks direction questions in the patient survey and preserves submitted answers", () => {
        const form = formFor("Fertility");
        form.consultation = {
            directions: ["Ovulatory timing"],
            answers: { "Are cycles regular?": "Usually regular", "Has ovulation been confirmed previously?": "Not sure" },
        };
        const questions = getOnboardingQuestions(form, short);
        assert.ok(questions.some((question) => question.id === "surveyDirections" && question.section === "survey"));
        assert.ok(questions.some((question) => question.id === "survey:Are cycles regular?" && question.section === "survey"));
        assert.equal(questions.at(-1)?.id, "review");
        assert.deepEqual(getRelevantIntake(form, short).consultation, form.consultation);
    });

    it("removes unrelated topics and answers after a concern or selection changes", () => {
        const form = formFor("Fertility");
        form.consultation = {
            directions: ["Ovulatory timing", "Partner evaluation"],
            answers: { "Are cycles regular?": "No", "Has partner evaluation been discussed?": "Yes" },
        };
        form.consultation.directions = ["Partner evaluation"];
        assert.deepEqual(getRelevantIntake(form, short).consultation.answers, { "Has partner evaluation been discussed?": "Yes" });
        form.concerns = ["Pregnancy care"];
        const result = getRelevantIntake(form, short);
        assert.deepEqual(result.consultation, { directions: [], answers: {} });
        assert.ok(!ids(form).includes("survey:Are cycles regular?"));
        assert.equal(form.consultation.answers["Are cycles regular?"], "No");
    });
});

it("treats every survey step as valid even when its question text contains commas", () => {
    const allDirections = Object.keys(guidedQuestionsByDirection);
    for (let start = 0; start < allDirections.length; start += 3) {
        const directions = allDirections.slice(start, start + 3);
        const concerns = ["Irregular or heavy bleeding", "Abdominal or pelvic pain", "Fertility", "I am pregnant", "Pregnancy care",
            "Birth control", "Routine checkup", "Missed or late period", "Possible pregnancy"];
        const form = { ...formFor(...concerns), consultation: { directions, answers: {} } };
        const questions = getOnboardingQuestions(form, all);
        for (const question of questions) assert.ok(isOnboardingStep(questions, question.id), question.id);
    }
    const bleeding = formFor("Irregular or heavy bleeding");
    bleeding.consultation = { directions: surveyDirectionsForConcerns(bleeding.concerns).slice(0, 3), answers: {} };
    const questions = getOnboardingQuestions(bleeding, short);
    assert.ok(questions.some((question) => question.id.includes(",")), "fixture must include a comma question");
    assert.equal(isOnboardingStep(questions, "survey:Any dizziness"), false);
});
