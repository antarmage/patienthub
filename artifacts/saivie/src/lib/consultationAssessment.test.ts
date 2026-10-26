import assert from "node:assert/strict";
import test from "node:test";
import { assembleEvidence, assessmentText, evidenceKey, readAssessment, type EvidenceFact } from "./consultationAssessment";

const input = {
  answers: { "Cycle length": "51 days", "Ovulation confirmed?": "Uncertain", "Other": "" },
  fromPatient: (question: string) => question === "Cycle length",
  questions: ["Cycle length", "Ovulation confirmed?"],
  subjective: "", objective: "", appointmentDate: "2026-10-26",
  visits: [], labs: [], documents: [], fertility: true,
};

test("assembles only recorded facts, preserving uncertainty and source without inventing dates", () => {
  const facts = assembleEvidence(input);
  assert.equal(facts.length, 2);
  assert.equal(facts[0].value, "51 days");
  assert.equal(facts[0].source, "Patient-reported survey");
  assert.equal(facts[0].date, null);
  assert.equal(facts[1].value, "Uncertain");
  assert.equal(facts[1].source, "Clinician-entered history");
  assert.equal(facts[1].date, "2026-10-26");
  assert.equal(assembleEvidence({ ...input, answers: {} }).length, 0);
});

test("preserves laboratory values including zero and never equates missing values with normal", () => {
  const facts = assembleEvidence({ ...input, answers: {}, labs: [
    { id: 1, testName: "FSH", date: "2026-10-01", value: 0, unit: "IU/L" },
    { id: 2, testName: "TSH", date: "2026-10-02", status: "pending" },
    { id: 3, testName: "AMH", date: "2026-10-03", results: { value: "2.5", unit: "ng/mL" } },
  ] });
  assert.equal(facts.find((fact) => fact.id === "lab:1")?.value, "0 IU/L");
  assert.match(facts.find((fact) => fact.id === "lab:2")!.value, /not recorded.*pending/);
  assert.match(facts.find((fact) => fact.id === "lab:3")!.value, /"value":"2.5"/);
});

test("keeps differing values and dates visible instead of silently reconciling results", () => {
  const facts = assembleEvidence({ ...input, answers: {}, labs: [
    { id: 1, testName: "TSH", date: "2026-10-01", value: 1 },
    { id: 2, testName: "TSH", date: "2026-10-02", value: 6 },
  ] });
  assert.deepEqual(facts.map((fact) => fact.value), ["6", "1"]);
  assert.deepEqual(facts.map((fact) => fact.date), ["2026-10-02", "2026-10-01"]);
  assert.match(facts[0].comparison!, /1 \(2026-10-01\)/);
  assert.match(facts[0].comparison!, /not necessarily a clinical conflict/);
});

test("limits priority to recorded relevant facts and keeps historical and unrelated sources available", () => {
  const facts = assembleEvidence({ ...input, objective: "Recorded examination", labs: [
    { id: 1, testName: "FSH", date: "2026-10-01", value: 5 },
    { id: 2, testName: "Unrelated test", date: "2026-10-02", value: 3 },
  ], documents: [{ id: 1, name: "Pelvic scan", category: "USG", date: "2026-09-30" }],
  visits: [{ id: 7, date: "2026-09-01", assessment: "Historical impression" }] });
  assert.deepEqual(facts.slice(0, 5).map((fact) => fact.id),
    ["history:Cycle length", "history:Ovulation confirmed?", "objective", "lab:1", "document:1"]);
  assert.equal(facts.find((fact) => fact.id === "lab:2")?.relevant, false);
  assert.equal(facts.find((fact) => fact.id === "visit:7")?.source, "Previous visit");
  assert.equal(facts.find((fact) => fact.id === "visit:7")?.relevant, false);
});

test("reads legacy assessments without assigning certainty or fabricating review", () => {
  assert.deepEqual(readAssessment(null, "Legacy impression"), {
    impression: "Legacy impression", status: "", reasoning: "", evidence: [],
  });
  assert.equal(readAssessment({ status: "invented", evidence: [null, {}, { id: 1 }] }).evidence.length, 0);
  assert.equal(readAssessment({ status: "invented" }).status, "");
});

const fact: EvidenceFact = {
  id: "lab:1", label: "FSH", value: "5 IU/L", source: "Stored laboratory result",
  date: "2026-10-01", relevant: true,
};
test("ties review to the exact source, date and value", () => {
  assert.notEqual(evidenceKey(fact), evidenceKey({ ...fact, value: "6 IU/L" }));
  assert.notEqual(evidenceKey(fact), evidenceKey({ ...fact, date: "2026-10-02" }));
  assert.notEqual(evidenceKey(fact), evidenceKey({ ...fact, source: "Other source" }));
  assert.equal(evidenceKey(fact), evidenceKey({ ...fact, relevant: false }));
});

test("persists certainty, reasoning and reviewed evidence together with readable prescription text", () => {
  const draft = {
    impression: "Fertility evaluation", status: "Working impression", reasoning: "Ovulation status uncertain",
    evidence: [{ ...fact, reviewed: true, relation: "contextual" }],
  };
  const restored = readAssessment(JSON.parse(JSON.stringify(draft)));
  assert.deepEqual(restored, draft);
  const text = assessmentText(restored);
  assert.match(text, /Status: Working impression/);
  assert.match(text, /Clinical reasoning: Ovulation status uncertain/);
  assert.match(text, /Contextual: FSH: 5 IU\/L.*2026-10-01/);
});

test("linking evidence does not silently mark it reviewed and deselecting removes it from narrative", () => {
  const draft = readAssessment({ impression: "Clinical problem", evidence: [{ ...fact, reviewed: false, relation: "supporting" }] });
  assert.match(assessmentText(draft), /not marked reviewed/);
  draft.evidence[0].relation = "";
  assert.equal(assessmentText(draft), "Clinical problem");
});
