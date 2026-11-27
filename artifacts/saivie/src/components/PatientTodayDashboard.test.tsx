import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import PatientTodayDashboard from "./PatientTodayDashboard";

function renderDashboard(lmp: string | null, mode = "pregnancy") {
  const noop = () => {};
  return renderToStaticMarkup(
    <PatientTodayDashboard
      mode={mode}
      patient={{ id: 1, name: "Test", lmp }}
      pregnancyEpisode={null}
      appointments={[]}
      medications={[]}
      labResults={[]}
      medicationReminderDue={false}
      onBook={noop}
      onOpenCare={noop}
      onOpenRecord={noop}
      onOpenMedicationReminder={noop}
      onOpenStageSwitcher={noop}
      onUpdatePregnancy={noop}
      showPregnancyLossSupport={false}
      onDismissPregnancyLossSupport={noop}
      postpartumWeek={null}
    />,
  );
}

test("cycle dashboard matches the new layout without inventing predictions or plans", () => {
  const html = renderDashboard(null, "general");
  assert.match(html, /Today&#x27;s plan/);
  assert.match(html, /Share your check-in/);
  assert.match(html, /Cycle history/);
  assert.match(html, /Cycle dates and patterns aren&#x27;t available here yet/);
  assert.match(html, /Cycle recommendations are not available yet/);
  assert.match(html, /bg-\[#FFB534\]/);
  assert.doesNotMatch(html, /bg-\[#8EC5FF\]/);
  assert.doesNotMatch(html, /DAY 14|OVULATION|7-day streak|Luteal phase starts|phase-aware guidance|Presentations and hard conversations|Estimated next period/);
  assert.match(html, /Book an appointment/);
});

test("pregnancy week indicator shows the current week with a dark centre", () => {
  const lmp = new Date(Date.now() - 24 * 7 * 86400000).toISOString().slice(0, 10);
  const html = renderDashboard(lmp);
  assert.match(html, /Today is week 24/);
  assert.match(html, /<circle cx="65" cy="46" r="11"[^>]*><\/circle><circle cx="65" cy="46" r="4\.5" fill="var\(--ink\)"><\/circle>/);
});

test("pregnancy week indicator does not invent a current week when the date is missing", () => {
  const html = renderDashboard(null);
  assert.match(html, /Pregnancy week not available/);
  assert.match(html, /Week not available/);
  assert.doesNotMatch(html, /r="11"/);
  assert.doesNotMatch(html, /Your baby can|second trimester/);
});

test("first and last week markers fit inside the ribbon", () => {
  for (const [week, cx, cy] of [[1, "12.5", "14"], [40, "345", "46"]] as const) {
    const lmp = new Date(Date.now() - week * 7 * 86400000).toISOString().slice(0, 10);
    const html = renderDashboard(lmp);
    assert.match(html, /viewBox="0 0 358 64"/);
    assert.ok(html.includes(`<circle cx="${cx}" cy="${cy}" r="11"`));
  }
});
