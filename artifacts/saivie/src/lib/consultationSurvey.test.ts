import assert from "node:assert/strict";
import { it } from "node:test";
import {
    consultationDirectionsByPath, consultationSurveyForVisit, guidedQuestionsByDirection,
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
