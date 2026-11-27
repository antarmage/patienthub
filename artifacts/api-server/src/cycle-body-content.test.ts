import test from "node:test";
import assert from "node:assert/strict";
import { assembleCycleBodyFeed, cycleBodyContext } from "./cycle-body-content";
import { cycleBodyCatalogueSchema } from "../../../lib/db/src/cycle-body-content";

const now = new Date("2026-11-27T12:00:00");
const input = { lmp: null, periodDate: "2026-11-14", pregnant: false, history: { onboarding: { cycle: { cycleLength: 28, regularity: "Regular" } } } };

test("cycle engine resolves period prompt and changes phase with the recorded day and length", () => {
  assert.deepEqual(cycleBodyContext(input, now), { cycleDay: 14, cycleLength: 28, phase: "ovulation" });
  assert.deepEqual(cycleBodyContext({ ...input, periodDate: "2026-11-06" }, now), { cycleDay: 22, cycleLength: 28, phase: "luteal" });
  assert.deepEqual(cycleBodyContext({ ...input, history: { onboarding: { cycle: { cycleLength: 32, regularity: "Regular" } } } }, now),
    { cycleDay: 14, cycleLength: 32, phase: "follicular" });
});

test("cycle engine withholds education for ineligible or incomplete cycle data", () => {
  assert.equal(cycleBodyContext({ ...input, pregnant: true }, now), null);
  assert.equal(cycleBodyContext({ ...input, periodDate: "2026-10-01" }, now), null);
  assert.equal(cycleBodyContext({ ...input, periodDate: "2026-11-28" }, now), null);
  assert.equal(cycleBodyContext({ ...input, history: {} }, now), null);
  assert.equal(cycleBodyContext({ ...input, history: { onboarding: { cycle: { cycleLength: 28, regularity: "Irregular" } } } }, now), null);
});

test("cycle feed selects validated engine copy and retains generation provenance", () => {
  const signal = { title: "Generic signal", body: "Generic education" };
  const copy = {
    title: "Generic title", introduction: "Generic introduction", todayRead: "Generic daily education",
    hormoneTitle: "Hormones", hormoneDescription: "Illustrative only",
    temperatureTitle: "Temperature", temperatureBody: "General education",
    signalsTitle: "Signals", signals: { focus: signal, temperature: signal, metabolism: signal, hormones: signal },
    patternsTitle: "Reported information", patternsIntroduction: "Reported cycle information",
  };
  const catalogue = cycleBodyCatalogueSchema.parse({
    menstrual: copy, follicular: copy, ovulation: { ...copy, todayRead: "Ovulation education" }, luteal: copy,
  });
  const feed = assembleCycleBodyFeed(cycleBodyContext(input, now), catalogue);
  assert.equal(feed.status, "available");
  if (feed.status === "available") {
    assert.equal(feed.content.todayRead, "Ovulation education");
    assert.equal(feed.reviewStatus, "not_clinically_reviewed");
  }
  assert.equal(cycleBodyCatalogueSchema.safeParse({ menstrual: copy }).success, false);
});
