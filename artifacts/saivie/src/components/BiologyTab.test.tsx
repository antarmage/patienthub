import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BiologyTab from "./BiologyTab";
import PregnancyTrackersTab from "./PregnancyTrackersTab";
import PregnancyMovementTracker from "./PregnancyMovementTracker";

test("pregnancy Body shows symptom guidance, available trackers and reading links", () => {
  const html = renderToStaticMarkup(<BiologyTab mode="pregnancy" patient={{}} onOpenTracker={() => {}} />);
  assert.match(html, /Normal, or ask\?/);
  assert.match(html, /Contact your maternity team immediately/);
  assert.match(html, /aria-label="Add weight"/);
  assert.match(html, /aria-label="Add blood pressure"/);
  assert.match(html, /aria-label="Add baby movements"/);
  assert.match(html, /https:\/\/www\.nhs\.uk\/pregnancy\/keeping-well\/your-babys-movements\//);
  assert.doesNotMatch(renderToStaticMarkup(<BiologyTab mode="general" patient={{}} />), /Normal, or ask\?/);
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
