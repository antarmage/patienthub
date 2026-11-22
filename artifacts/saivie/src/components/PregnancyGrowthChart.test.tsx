import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import PregnancyGrowthChart from "./PregnancyGrowthChart";

test("the weight plot uses the supplied value for the selected week", () => {
  const html = renderToStaticMarkup(<PregnancyGrowthChart currentWeek={24} />);
  assert.match(html, /Week 24: 600 g/);
  const charts = [...html.matchAll(/<svg[^>]*>[\s\S]*?<\/svg>/g)].map((match) => match[0]);
  assert.equal(charts.length, 1);
  const points = charts[0].match(/<polyline points="([^"]+)"/)?.[1].split(" ");
  const marker = charts[0].match(/<circle cx="([^"]+)" cy="([^"]+)"/);
  assert.ok(points && marker);
  assert.equal(points.length, 36);
  assert.equal(`${marker[1]},${marker[2]}`, points[24 - 8]);
  assert.equal(Number(marker[2]), 135 - 600 * 115 / 4000);
  assert.match(html, /Unvalidated illustrative values/);
  assert.doesNotMatch(html, /Length \(cm\)|Week 24: 30 cm/);
});

test("missing and out-of-range weeks do not invent or clamp a current marker", () => {
  for (const [week, message] of [[null, "Pregnancy week is not available"], [7, "outside the supplied data"], [44, "outside the supplied data"]] as const) {
    const html = renderToStaticMarkup(<PregnancyGrowthChart currentWeek={week} />);
    assert.ok(html.includes(message));
    assert.doesNotMatch(html, /<circle/);
  }
  assert.match(renderToStaticMarkup(<PregnancyGrowthChart currentWeek={43} />), /Week 43: 3717 g/);
});
