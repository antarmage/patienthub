import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BiologyTab from "./BiologyTab";
import PregnancyTrackersTab from "./PregnancyTrackersTab";
import PregnancyMovementTracker from "./PregnancyMovementTracker";
import { localDateKey } from "@/lib/patientHealthRecord";
import { estimateCyclePhase, type CycleBodyFeed } from "../../../../lib/db/src/cycle-body-content";

const engineCopy = {
  title: "Engine body headline",
  introduction: "Engine introduction",
  todayRead: "Engine daily education",
  hormoneTitle: "Engine hormone heading",
  hormoneDescription: "Illustrative hormone patterns, not your measurements",
  temperatureTitle: "Engine temperature heading",
  temperatureBody: "Engine temperature education",
  signalsTitle: "Engine signals heading",
  signals: {
    focus: { title: "Engine focus", body: "Engine focus education" },
    temperature: { title: "Engine temperature", body: "Engine temperature education" },
    metabolism: { title: "Engine metabolism", body: "Engine metabolism education" },
    hormones: { title: "Engine hormones", body: "Engine hormones education" },
  },
  patternsTitle: "Engine patterns heading",
  patternsIntroduction: "Engine patterns education",
};

function renderCycleBody(patient: { cycleLength?: number; history?: { onboarding?: { cycle?: { cycleLength?: number; regularity?: string } } } }, periodDate: string | null = null, feed?: CycleBodyFeed) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, queryFn: async () => ({ value: null }) } } });
  client.setQueryData(["/api/patients", 1, "period-prompt"], { value: periodDate ? { date: periodDate } : null });
  const length = patient.cycleLength ?? patient.history?.onboarding?.cycle?.cycleLength;
  const regularity = patient.history?.onboarding?.cycle?.regularity || "";
  const phase = /irregular/i.test(regularity) ? null : estimateCyclePhase(periodDate, length);
  client.setQueryData(["/api/patients", 1, "cycle-body-content", periodDate, length, regularity], feed ?? (phase ? {
    status: "available", cycleDay: phase.cycleDay, cycleLength: Number(length), phase: "follicular",
    content: engineCopy, source: "ai_generated", reviewStatus: "not_clinically_reviewed", assetVersion: "test",
  } : { status: "unavailable", reason: "Cycle education unavailable." }));
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}><BiologyTab mode="general" patient={{ id: 1, ...patient }} /></QueryClientProvider>,
    );
  } finally {
    client.clear();
  }
}

function periodDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

test("pregnancy Body shows symptom guidance, available trackers and reading links", () => {
  const html = renderToStaticMarkup(<BiologyTab mode="pregnancy" patient={{}} onOpenTracker={() => {}} />);
  assert.match(html, /Normal, or ask\?/);
  assert.match(html, /Contact your maternity team immediately/);
  assert.match(html, /aria-label="Add weight"/);
  assert.match(html, /aria-label="Add blood pressure"/);
  assert.match(html, /aria-label="Add baby movements"/);
  assert.match(html, /https:\/\/www\.nhs\.uk\/pregnancy\/keeping-well\/your-babys-movements\//);
  assert.doesNotMatch(renderCycleBody({}), /Normal, or ask\?/);
});

test("cycle Body uses saved period date and cycle length for its estimated day and marker", () => {
  const html = renderCycleBody({ history: { onboarding: { cycle: { cycleLength: 32, regularity: "Regular" } } } }, periodDaysAgo(9));
  assert.match(html, /DAY 10 · ESTIMATED/);
  assert.match(html, /Estimated day 10 of 32/);
  assert.match(html, /Engine daily education/);
  assert.match(html, /Engine focus education/);
  assert.match(html, /Engine body headline/);
  assert.match(html, /Log temperature/);
  assert.match(html, /Day 32/);
  const marker = html.match(/<line x1="([^"]+)"[^>]*data-testid="cycle-today-marker"/);
  assert.ok(marker);
  assert.ok(Math.abs(Number(marker[1]) - (4 + 9 * 342 / 31)) < 0.001);
  assert.match(html, /Illustrative hormone patterns, not your measurements/);
  assert.doesNotMatch(html, /Estrogen is near its peak|confirms ovulation/);
});

test("cycle Body does not invent a day or hormone phase for missing, stale or irregular data", () => {
  for (const [patient, date] of [
    [{}, null],
    [{ cycleLength: 28 }, periodDaysAgo(30)],
    [{ history: { onboarding: { cycle: { cycleLength: 28, regularity: "Irregular" } } } }, periodDaysAgo(13)],
  ] as const) {
    const html = renderCycleBody(patient, date);
    assert.match(html, /CYCLE DAY UNAVAILABLE/);
    assert.doesNotMatch(html, /data-testid="cycle-today-marker"|DAY 14 · ESTIMATED/);
  }
});

test("cycle Body moves the marker and description as the cycle advances", () => {
  const html = renderCycleBody({ cycleLength: 28 }, periodDaysAgo(20));
  assert.match(html, /DAY 21 · ESTIMATED/);
  assert.match(html, /Engine daily education/);
  const marker = html.match(/<line x1="([^"]+)"[^>]*data-testid="cycle-today-marker"/);
  assert.ok(marker && Number(marker[1]) > 167 && Number(marker[1]) < 346);
});

test("unavailable engine content shows its reason without frontend educational substitutes", () => {
  const html = renderCycleBody({ cycleLength: 28 }, periodDaysAgo(13), {
    status: "unavailable", reason: "Cycle education is paused for this stage.",
  });
  assert.match(html, /Cycle education is paused for this stage/);
  assert.doesNotMatch(html, /Engine daily education|Estrogen typically rises|data-testid="cycle-today-marker"/);
});

test("movement log opens from the shortcut and warns that changes need immediate care", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/patients/1/pregnancy-movement-observations", 2], [{
    id: 1, episodeId: 2, observation: "changed", notes: "Example", createdAt: "2026-01-01T00:00:00Z",
  }]);
  try {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <PregnancyTrackersTab patient={{}} patientId={1} medications={[]} initialTracker="baby-movements" pregnancyEpisode={{ id: 2, details: { status: "current" } }} />
      </QueryClientProvider>,
    );
    assert.match(html, /What did you notice\?/);
    assert.match(html, /Contact your maternity team immediately/);
    assert.match(html, /not monitored and does not notify your care team/);
    assert.match(html, /Example/);
    assert.ok(html.indexOf("What did you notice?") < html.indexOf("Water Intake"));
    const missing = renderToStaticMarkup(<QueryClientProvider client={client}><PregnancyMovementTracker patientId={1} episodeId={null} initiallyOpen /></QueryClientProvider>);
    assert.match(missing, /A current pregnancy record is needed/);
    assert.doesNotMatch(missing, /Save observation/);
  } finally {
    client.clear();
  }
});

test("tracker shortcuts open the selected measurement form first", () => {
  for (const [tracker, placeholder] of [["weight", "Weight in kg"], ["blood-pressure", "Systolic"]] as const) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    try {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <PregnancyTrackersTab patient={{}} patientId={1} medications={[]} initialTracker={tracker} />
        </QueryClientProvider>,
      );
      assert.match(html, new RegExp(`placeholder="${placeholder}"`));
      assert.ok(html.indexOf(`placeholder="${placeholder}"`) < html.indexOf("Water Intake"));
    } finally {
      client.clear();
    }
  }
});
