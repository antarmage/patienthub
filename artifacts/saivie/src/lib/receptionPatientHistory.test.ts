import assert from "node:assert/strict";
import test from "node:test";
import { hasHistoryValue, historyText, receptionPatientHistory } from "./receptionPatientHistory";

test("history overview uses recorded intake fields and distinguishes reported LMP", () => {
  const summary = receptionPatientHistory({ lmp: "2026-10-12", cycleLength: 28, history: {
    family: ["Diabetes"], onboarding: { cycle: { lastPeriod: "2026-10-10", cycleLength: "15", regularity: "Often irregular" }, health: { familyHistory: "Thyroid", allergies: "Penicillin" } },
  } });
  assert.equal(summary.metrics[0].value, "2026-10-10");
  assert.equal(summary.metrics[1].value, "28");
  assert.equal(summary.metrics[3].value, "Penicillin");
  assert.equal(summary.metrics[4].value, "Diabetes");
  assert.equal(summary.sections[1].fields["Clinician-recorded LMP"], "2026-10-12");
});

test("missing records do not fabricate history or lose explicit zero/false answers", () => {
  assert.ok(receptionPatientHistory({}).metrics.every((metric) => metric.value === ""));
  assert.equal(historyText(false), "false");
  assert.equal(historyText(0), "0");
  assert.equal(historyText({ source: "server" }), "");
  const summary = receptionPatientHistory({ history: { onboarding: { pregnancies: { total: 0 } } } });
  assert.equal(summary.sections[4].fields["Total pregnancies"], 0);
});

test("structured histories remain recorded while empty containers are marked missing", () => {
  assert.equal(hasHistoryValue([{ condition: "Diabetes", relative: "Mother" }]), true);
  assert.equal(hasHistoryValue({ pregnancies: 0 }), true);
  assert.equal(hasHistoryValue({ smoking: false }), true);
  assert.equal(hasHistoryValue({ notes: "", conditions: [] }), false);
  assert.equal(hasHistoryValue(null), false);
  assert.equal(receptionPatientHistory({ history: { family: [{ condition: "Diabetes", relative: "Mother" }] } }).metrics[4].value, "Recorded - see details");
});
