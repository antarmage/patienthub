import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { localDateKey } from "@/lib/patientHealthRecord";
import PatientTodayDashboard from "./PatientTodayDashboard";

function renderDashboard(lmp: string | null, mode = "pregnancy", cycleLength?: number, periodDate: string | null = null) {
  const noop = () => {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { queryFn: async () => ({ value: null }), retry: false } },
  });
  queryClient.setQueryData(["/api/patients", 1, "period-prompt"], {
    value: periodDate ? { date: periodDate, estimated: false } : null,
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <PatientTodayDashboard
        mode={mode}
        patient={{ id: 1, name: "Test", lmp, cycleLength }}
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
      />
    </QueryClientProvider>,
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

test("cycle dashboard shows the estimated peak window only with LMP and cycle length", () => {
  const lastPeriod = new Date();
  lastPeriod.setDate(lastPeriod.getDate() - 13);
  const lmp = localDateKey(lastPeriod);
  const estimated = renderDashboard(null, "general", 28, lmp);
  assert.match(estimated, /DAY 14 · ESTIMATED OVULATION/);
  assert.match(estimated, /Peak fertility window\. Energy levels are high\./);
  assert.match(estimated, /Timing and energy vary/);

  const missingCycleLength = renderDashboard(null, "general", undefined, lmp);
  assert.doesNotMatch(missingCycleLength, /Peak fertility window|ESTIMATED OVULATION/);
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
