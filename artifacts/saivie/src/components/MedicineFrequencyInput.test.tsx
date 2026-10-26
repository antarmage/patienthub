import React from "react";
import assert from "node:assert/strict";
import { it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MedicineFrequencyInput } from "./MedicineFrequencyInput.tsx";

it("offers all seven requested choices without selecting or prescribing a default", () => {
  const html = renderToStaticMarkup(<MedicineFrequencyInput value="" onChange={() => {}} />);
  for (const value of ["OD", "BD", "TDS", "HS", "SOS", "AC/PC", "Weekly"]) {
    assert.ok(html.includes(`aria-label="${value}:`));
  }
  assert.equal((html.match(/aria-pressed="false"/g) || []).length, 7);
  assert.ok(!html.includes('aria-pressed="true"'));
  assert.equal((html.match(/type="button"/g) || []).length, 7);
  assert.ok(html.includes("specify timing in instructions"));
});

it("shows exactly one selected preset for saved frequencies, ignoring case and surrounding spaces", () => {
  for (const value of ["OD", " bd ", "TDS", "HS", "SOS", "AC/PC", "weekly"]) {
    const html = renderToStaticMarkup(<MedicineFrequencyInput value={value} onChange={() => {}} />);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
    assert.ok(html.includes(`value="${value}"`));
  }
});

it("preserves custom and legacy regimens verbatim without coercing them into a preset", () => {
  const html = renderToStaticMarkup(<MedicineFrequencyInput value="1-0-1 after food" onChange={() => {}} label="Medicine 2 frequency" testId="frequency-2" />);
  assert.ok(html.includes('value="1-0-1 after food"'));
  assert.ok(html.includes('aria-label="Medicine 2 frequency"'));
  assert.ok(html.includes('data-testid="frequency-2"'));
  assert.ok(!html.includes('aria-pressed="true"'));
});
