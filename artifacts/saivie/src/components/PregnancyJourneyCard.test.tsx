import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PregnancyJourneyCard } from "./PregnancyJourneyCard";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";

const context: PregnancyVisitContext = {
  pregnancy: true, repeat: true, episodeId: 1, label: "Pregnancy 1", asOf: "2026-11-05",
  previousAppointmentCount: 3, answers: null, trends: { bp: [], weight: [], hb: [], sugar: [] },
  weightReference: {
    lmp: "2026-04-16", dueDate: null, endDate: null, datingBasis: "LMP", maternalHeightCm: null,
    prePregnancyWeightKg: null, fetusCount: null, datingSource: "Recorded patient/intake LMP",
  },
};
const render = (value = context) => renderToStaticMarkup(<PregnancyJourneyCard context={value} />);

test("journey card uses selected appointment dating and labels the symbolic illustration without a size claim", () => {
  const html = render();
  for (const text of ["29 weeks, 0 days", "Your third trimester", "16 Apr 2026", "21 Jan 2027",
    "5 Nov 2026", "Recorded patient/intake LMP", "not a scan or to scale", "actual size, health or development",
    'role="img"', "<title", "<desc"]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes("cm"));
  assert.equal(render({ ...context, pregnancy: false }), "");
});

test("clinical EDD takes priority over LMP without calling reported dates confirmed", () => {
  const html = render({ ...context, weightReference: { ...context.weightReference!, dueDate: "2027-02-11",
    datingBasis: "Ultrasound", datingSource: undefined } });
  assert.ok(html.includes("26 weeks, 0 days"));
  assert.ok(html.includes("Your second trimester"));
  assert.ok(html.includes("11 Feb 2027"));
  assert.ok(html.includes("16 Apr 2026"));
  assert.ok(html.includes("not the LMP"));
  assert.ok(!html.includes("21 Jan 2027"));
});

test("journey starts at 14w0d and changes trimester at 28w0d", () => {
  assert.equal(render({ ...context, asOf: "2026-07-22" }), "");
  for (const [asOf, expected] of [["2026-07-23", "Your second trimester"],
    ["2026-10-28", "Your second trimester"], ["2026-10-29", "Your third trimester"]]) {
    assert.ok(render({ ...context, asOf }).includes(expected), asOf);
  }
});

test("missing, invalid, pre-pregnancy and ended dating hide the journey", () => {
  for (const weightReference of [null, { ...context.weightReference!, lmp: "invalid" },
    { ...context.weightReference!, lmp: "2027-01-01" }, { ...context.weightReference!, endDate: "2026-11-01" },
    { ...context.weightReference!, datingBasis: "Not recorded" as const }]) {
    const html = render({ ...context, weightReference });
    assert.equal(html, "");
  }
});

test("MTP suppression hides the entire journey even after 14 weeks", () => {
  assert.equal(render({ ...context, journeySuppressed: true }), "");
  assert.ok(render({ ...context, journeySuppressed: false }).includes("29 weeks, 0 days"));
});
