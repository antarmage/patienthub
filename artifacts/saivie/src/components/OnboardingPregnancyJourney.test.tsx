import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OnboardingPregnancyJourney } from "./OnboardingPregnancyJourney";
import { initialForm } from "@/lib/onboardingFlow";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";

const context: PregnancyVisitContext = {
  pregnancy: false, repeat: false, episodeId: null, label: "No pregnancy context established",
  asOf: "2026-11-05", previousAppointmentCount: 0, answers: null, trends: { bp: [], weight: [], hb: [], sugar: [] },
};
test("saved pregnant survey has a journey card even when repeat routing was not established", () => {
  const form = structuredClone(initialForm);
  form.pregnancies.currentStatus = "Yes";
  form.cycle.lastPeriod = "2026-04-16";
  const html = renderToStaticMarkup(<OnboardingPregnancyJourney context={context} form={form} />);
  assert.ok(html.includes('data-testid="pregnancy-journey-card"'));
  assert.ok(html.includes("29 weeks, 0 days"));
  assert.ok(html.includes("Saved survey LMP (patient-reported; care team to confirm)"));
  assert.equal(context.pregnancy, false);
  assert.equal(context.repeat, false);
});
test("missing saved dating shows the journey without converting old weeks answers into current gestation", () => {
  const form = structuredClone(initialForm);
  form.pregnancies.currentStatus = "Yes";
  form.pregnancies.weeksPregnant = "29";
  const html = renderToStaticMarkup(<OnboardingPregnancyJourney context={context} form={form} />);
  assert.ok(html.includes("Every visit is part of your journey"));
  assert.ok(!html.includes("29 weeks"));
  assert.equal(renderToStaticMarkup(<OnboardingPregnancyJourney context={context} form={initialForm} />), "");
});
