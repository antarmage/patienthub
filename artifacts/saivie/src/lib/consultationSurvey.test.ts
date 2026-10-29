import assert from "node:assert/strict";
import { it } from "node:test";
import {
    consultationDirectionsByPath, consultationSurveyForVisit, guidedQuestionsByDirection, hasVisitSurvey,
    patientSurveyPrompt, readConsultationSurvey, surveyDirectionLabels, surveyDirectionsForConcerns, surveyQuestions,
} from "./consultationSurvey.ts";

it("routes all former doctor directions into patient-friendly survey topics", () => {
    for (const directions of Object.values(consultationDirectionsByPath)) {
        for (const direction of directions) {
            assert.ok(surveyDirectionLabels[direction]);
            assert.equal(guidedQuestionsByDirection[direction].length, 4);
            for (const question of guidedQuestionsByDirection[direction]) {
                assert.ok(!/\bthe patient\b/i.test(patientSurveyPrompt(question)), question);
            }
        }
    }
    assert.deepEqual(surveyDirectionsForConcerns(["Fertility"]), consultationDirectionsByPath["Fertility evaluation"]);
    assert.deepEqual(surveyDirectionsForConcerns(["Menopause"]), consultationDirectionsByPath.Menopause);
    assert.deepEqual(surveyDirectionsForConcerns(["Vaginal discharge or infection"]), consultationDirectionsByPath["Vaginal discharge or infection"]);
    assert.deepEqual(surveyDirectionsForConcerns(["Breast problem"]), consultationDirectionsByPath.Other);
    assert.deepEqual(surveyDirectionsForConcerns([]), []);
});

it("deduplicates overlapping topics and questions", () => {
    const directions = surveyDirectionsForConcerns(["Missed or late period", "Irregular or heavy bleeding"]);
    assert.equal(directions.length, 3);
    const questions = surveyQuestions(["Vasomotor or genitourinary symptoms", "Bleeding impact"]);
    assert.equal(questions.filter((question) => question === "What treatments have been tried?").length, 1);
});

it("normalizes saved surveys without inventing answers or selecting topics", () => {
    for (const value of [undefined, null, {}, "survey", []]) {
        assert.deepEqual(readConsultationSurvey(value), { directions: [], answers: {} });
    }
    const survey = readConsultationSurvey({
        directions: ["Ovulatory timing", "Ovulatory timing", "unknown", "__proto__", "constructor"],
        answers: { "Are cycles regular?": "No", "What is the average cycle length?": "   ", unrelated: "Old answer" },
    });
    assert.deepEqual(survey.directions, ["Ovulatory timing"]);
    assert.equal(survey.answers["Are cycles regular?"], "No");
    assert.equal(survey.answers.unrelated, undefined);
    assert.equal(survey.answers["Has ovulation been confirmed previously?"], undefined);
    assert.equal(readConsultationSurvey({ directions: Object.keys(guidedQuestionsByDirection), answers: {} }).directions.length, 3);
});

it("prefills only the matching appointment and does not leak another visit's answers", () => {
    const consultation = { directions: ["Ovulatory timing"], answers: { "Are cycles regular?": "Usually regular" } };
    const history = { onboardingAppointmentId: 42, onboarding: { consultation } };
    assert.deepEqual(consultationSurveyForVisit(history, 42), consultation);
    assert.deepEqual(consultationSurveyForVisit(history, "42"), consultation);
    for (const appointment of [43, null, undefined]) {
        assert.deepEqual(consultationSurveyForVisit(history, appointment), { directions: [], answers: {} });
    }
    assert.deepEqual(consultationSurveyForVisit({ onboarding: { consultation } }, 42), { directions: [], answers: {} });
    assert.deepEqual(consultationSurveyForVisit(null, 42), { directions: [], answers: {} });
});

it("preselects survey concern/directions and lets the doctor change or fill them", async () => {
    const { effectiveConsultationSurvey, toggleConsultationPath, toggleConsultationDirection, surveyQuestions } = await import("./consultationSurvey.ts");
    const question = surveyQuestions(["Cycle pattern and timing"])[0];
    const survey = { directions: ["Cycle pattern and timing"], answers: { [question]: "35 days" } };
    let edits: any = { answers: {} };
    let current = effectiveConsultationSurvey(survey, edits);
    assert.deepEqual(current.paths, ["Menstrual concern"]);
    assert.deepEqual(current.directions, ["Cycle pattern and timing"]);
    assert.equal(current.fromPatient(question), true);

    edits = toggleConsultationPath(current, edits, "Pelvic pain");
    current = effectiveConsultationSurvey(survey, edits);
    edits = toggleConsultationDirection(current, edits, "Pain timing and pattern");
    edits = { ...edits, answers: { ...edits.answers, [question]: "40 days" } };
    current = effectiveConsultationSurvey(survey, edits);
    assert.deepEqual(current.paths, ["Menstrual concern", "Pelvic pain"]);
    assert.deepEqual(current.directions, ["Cycle pattern and timing", "Pain timing and pattern"]);
    assert.equal(current.answers[question], "40 days");
    assert.equal(current.fromPatient(question), false);

    edits = toggleConsultationPath(current, edits, "Menstrual concern");
    current = effectiveConsultationSurvey(survey, edits);
    assert.deepEqual(current.directions, ["Pain timing and pattern"]);

    const empty = effectiveConsultationSurvey({ directions: [], answers: {} }, { answers: {} });
    assert.deepEqual([empty.paths, empty.directions], [[], []]);
    let full: any = { answers: {} };
    for (const direction of ["Pain timing and pattern", "Pregnancy or infection safety screen", "Relevant pelvic history", "Symptom timeline"]) {
        full = toggleConsultationDirection(effectiveConsultationSurvey({ directions: [], answers: {} }, full), full, direction);
    }
    assert.equal(full.directions.length, 3);
});

it("preselects pregnancy on follow-up without carrying forward old survey answers", async () => {
    const { effectiveConsultationSurvey, toggleConsultationPath } = await import("./consultationSurvey.ts");
    const history = {
        onboardingAppointmentId: 42,
        onboarding: { consultation: { directions: ["Maternal symptoms"], answers: { "When did symptoms begin?": "Last week" } } },
    };
    const survey = consultationSurveyForVisit(history, 43);
    const pregnancy = ["Pregnancy-related concern"];
    const current = effectiveConsultationSurvey(survey, { answers: {} }, pregnancy);
    assert.deepEqual(current.paths, pregnancy);
    assert.deepEqual(current.directions, []);
    assert.deepEqual(current.answers, {});
    assert.equal(current.fromPatient("When did symptoms begin?"), false);
    const edits = toggleConsultationPath(current, { answers: {} }, pregnancy[0]);
    assert.deepEqual(effectiveConsultationSurvey(survey, edits, pregnancy).paths, []);
    assert.deepEqual(effectiveConsultationSurvey(survey, { answers: {} }).paths, []);
});

it("keeps current survey concerns alongside pregnancy and avoids duplicate selection", async () => {
    const { effectiveConsultationSurvey } = await import("./consultationSurvey.ts");
    const pregnancy = ["Pregnancy-related concern"];
    const survey = { directions: ["Pain timing and pattern", "Maternal symptoms"], answers: {} };
    const current = effectiveConsultationSurvey(survey, { answers: {} }, pregnancy);
    assert.deepEqual(current.paths, ["Pelvic pain", "Pregnancy-related concern"]);
    assert.deepEqual(current.directions, survey.directions);
});

it("marks the survey filled only for the appointment it was submitted against", () => {
    assert.equal(hasVisitSurvey({ onboardingAppointmentId: 42 }, 42), true);
    assert.equal(hasVisitSurvey({ onboardingAppointmentId: "42" }, 42), true);
    assert.equal(hasVisitSurvey({ onboardingAppointmentId: 41 }, 42), false);
    assert.equal(hasVisitSurvey({}, 42), false);
    assert.equal(hasVisitSurvey(null, 42), false);
    assert.equal(hasVisitSurvey({ onboardingAppointmentId: 42 }, undefined), false);
});
