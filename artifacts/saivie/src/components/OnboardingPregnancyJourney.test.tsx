import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OnboardingPregnancyJourney } from "./OnboardingPregnancyJourney";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";

const context: PregnancyVisitContext = {
  pregnancy: false, repeat: false, episodeId: null, label: "No pregnancy context established",
  asOf: "2026-11-05", previousAppointmentCount: 0, answers: null, trends: { bp: [], weight: [], hb: [], sugar: [] },
};
test("non-pregnancy and missing appointment context never show a journey", () => {
  for (const value of [context, null]) {
    assert.equal(renderToStaticMarkup(<OnboardingPregnancyJourney context={value} />), "");
  }
});
test("established pregnancy without dating hides the journey until gestation is established", () => {
  const html = renderToStaticMarkup(<OnboardingPregnancyJourney context={{ ...context, pregnancy: true }} />);
  assert.equal(html, "");
});
test("established pregnancy retains appointment-specific dating", () => {
  const html = renderToStaticMarkup(<OnboardingPregnancyJourney context={{ ...context, pregnancy: true,
    weightReference: { lmp: "2026-04-16", dueDate: null, endDate: null, datingBasis: "LMP",
      maternalHeightCm: null, prePregnancyWeightKg: null, fetusCount: null, datingSource: "Recorded LMP" },
  }} />);
  assert.ok(html.includes('data-testid="pregnancy-journey-card"'));
  assert.ok(html.includes("29 weeks, 0 days"));
});
