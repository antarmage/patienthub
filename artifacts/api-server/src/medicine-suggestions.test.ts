import assert from "node:assert/strict";
import { it } from "node:test";
import { buildMedicineSuggestions } from "./medicine-suggestions";

it("combines catalog, manual prescriptions and doctor entries without patient data or notes", () => {
  const result = buildMedicineSuggestions(
    [{ name: "Example", defaultDose: "5 mg", defaultFrequency: "Daily", genericName: "Generic" }, { name: "Hidden", isActive: false }],
    [{ medicines: [{ name: "Other", dose: "10 mg", frequency: "Daily", duration: "7 days", instructions: "After food", patientId: 1 }] }],
    [{ name: "Doctor entry", dose: "2 mg", duration: "5 days", instructions: "At night", notes: "Private patient note", patientId: 2 }],
  );
  assert.equal(result.length, 3);
  assert.equal(result[0].dose, "5 mg");
  assert.equal(result[1].duration, "7 days");
  assert.equal(result[2].instructions, "At night");
  assert.ok(!JSON.stringify(result).includes("patientId"));
  assert.ok(!JSON.stringify(result).includes("Private patient note"));
});

it("deduplicates identical regimens but preserves different doses and instructions", () => {
  const result = buildMedicineSuggestions([], [
    [{ name: "Example", dose: "5 mg" }, { name: "example", dose: "5 mg" }],
    { medicines: [{ name: "Example", dose: "10 mg" }, { name: "Example", dose: "5 mg", instructions: "After food" }] },
    null,
  ], []);
  assert.equal(result.length, 3);
});

it("supports legacy dosage and generic-name matching for saved variants", () => {
  const result = buildMedicineSuggestions(
    [{ name: "Example", genericName: "Generic", defaultDose: "5 mg" }],
    [{ medicines: [{ name: "Example", dosage: "10 mg", duration: "5 days" }] }],
    [],
  );
  assert.equal(result[1].dose, "10 mg");
  assert.equal(result[1].genericName, "Generic");
});

it("ignores malformed rows and only includes reusable fields", () => {
  const result = buildMedicineSuggestions([null, { name: " " }], [false, { medicines: "invalid" }], [
    { name: " Example ", dose: " 5 mg ", frequency: 123, instructions: null, startDate: "2026-01-01", status: "Active" },
  ]);
  assert.deepEqual(result, [{ name: "Example", dose: "5 mg", frequency: "", duration: "", instructions: "", route: "", genericName: "" }]);
});
