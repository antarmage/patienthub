import test from "node:test";
import assert from "node:assert/strict";
import { buildPregnancyContentFeed } from "./patient-content";

const weekGuide = (week: number) => ({
  fruit: "Lemon",
  length: "8.7 cm",
  weight: "43 g",
  development: ["Baby can squint and frown"],
  symptoms: ["Energy boost", "Nasal congestion", "Glowing skin"],
  dos: ["Check blood pressure"],
  donts: ["Avoid decongestants without advice"],
  nutrition: "Include iron-rich foods",
});

test("buildPregnancyContentFeed adds pregnancy, medication and risk blocks", () => {
  const feed = buildPregnancyContentFeed({
    patientId: 345,
    lmp: "2026-08-01",
    medications: [{ name: "Thyroid tablet", status: "active", notes: "Needs clinician review" }],
    riskScore: { level: "Medium", patientSummary: "Continue scheduled antenatal monitoring." },
    weekGuide,
  });

  assert.equal(feed.patientId, 345);
  assert.equal(feed.journey, "pregnancy");
  assert.equal(feed.blocks.some((block) => block.id === "active-medication-review"), true);
  assert.equal(feed.blocks.some((block) => block.id === "current-care-watch"), true);
  assert.ok(feed.blocks.every((block) => block.assetVersion));
});

test("buildPregnancyContentFeed omits medication block for missing or completed medicines", () => {
  const feed = buildPregnancyContentFeed({
    patientId: 345,
    lmp: null,
    medications: [{ name: "Completed medicine", status: "completed" }],
    weekGuide,
  });

  assert.equal(feed.week, null);
  assert.equal(feed.blocks.some((block) => block.id === "active-medication-review"), false);
});

test("buildPregnancyContentFeed excludes patientSummary for a missing risk summary", () => {
  const feed = buildPregnancyContentFeed({
    patientId: 345,
    lmp: null,
    medications: [],
    riskScore: { level: "Low" },
    weekGuide,
  });

  assert.equal(feed.blocks.some((block) => block.id === "current-care-watch"), false);
});
