import React from "react";
import assert from "node:assert/strict";
import { it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConsultationVitalsTrends, bloodPressureInPeriod } from "./ConsultationVitalsTrends.tsx";
import { VitalsSparklineGrid } from "./VitalsSparklineGrid.tsx";

it("charts only recorded readings in the selected calendar period, in date order", () => {
  const reading = (date: string) => ({ date, systolic: 120, diastolic: 80 });
  const logs = ["2026-03-01", "2026-02-23", "2026-03-02", "2026-02-22", "2026-02-01", "2025-12-02", "invalid"].map(reading);
  const today = new Date(2026, 2, 1, 15);
  assert.deepEqual(bloodPressureInPeriod(logs, 7, today).map((log) => log.date), ["2026-02-23", "2026-03-01"]);
  assert.equal(bloodPressureInPeriod(logs, 30, today).length, 4);
  assert.equal(bloodPressureInPeriod(logs, 90, today).length, 5);
  assert.equal(logs[0].date, "2026-03-01");
  assert.deepEqual(bloodPressureInPeriod([], 7, today), []);
});

it("shows an explicit empty trend instead of sample chart data", () => {
  const html = renderToStaticMarkup(<ConsultationVitalsTrends logs={[]} />);
  assert.ok(html.includes("No blood pressure readings in this period."));
  assert.ok(!html.includes('data-testid="consultation-bp-chart"'));
});

it("does not invent a temperature or normal findings when rail vitals are missing", () => {
  const html = renderToStaticMarkup(<VitalsSparklineGrid onAdoptVitals={() => {}} />);
  assert.ok(html.includes("Not recorded"));
  assert.ok(!html.includes("98.4"));
  assert.ok(!html.includes("Normal range"));
  assert.ok(!html.includes("Afebrile"));
  assert.ok(html.includes("disabled"));
  const recorded = renderToStaticMarkup(<VitalsSparklineGrid vitals={{ bp: "120/80", temp: 98.4 }} />);
  assert.ok(recorded.includes("120/80"));
  assert.ok(recorded.includes("98.4"));
  assert.ok(recorded.includes("Afebrile"));
});
