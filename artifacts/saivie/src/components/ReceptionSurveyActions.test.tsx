import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceptionSurveyBadge } from "./ReceptionSurveyActions";

test("reception survey flags distinguish filled, pending and unavailable, including lab surveys", () => {
  for (const surveyType of ["consultation", "lab"]) {
    for (const surveyCompleted of [true, false, undefined]) {
      const html = renderToStaticMarkup(<ReceptionSurveyBadge appointment={{ id: 12, patientId: 3, surveyType, surveyCompleted }} />);
      assert.ok(html.includes('data-testid="flow-survey-12"'));
      assert.ok(html.includes(surveyType === "lab" ? "Lab survey" : "Survey"));
      assert.ok(html.includes(surveyCompleted === undefined ? "status unavailable" : surveyCompleted ? "filled" : "pending"));
    }
  }
});
