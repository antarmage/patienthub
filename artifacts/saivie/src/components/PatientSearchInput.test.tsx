import React from "react";
import assert from "node:assert/strict";
import { it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientSearchInput, searchPatients } from "./PatientSearchInput.tsx";

const patients = [
  { id: 1, name: "Priya Sharma", phone: "+91 98765 43210" },
  { id: 2, name: "Anita Rao", phone: "9123456789" },
  { id: 3, name: "Sharmila Das", phone: "9000011111" },
  { id: 4, name: "", phone: "9999999999" },
];

it("matches name prefix, word prefix, substring and phone digits", () => {
  assert.deepEqual(searchPatients(patients, "shar").map((p) => p.id), [3, 1]);
  assert.deepEqual(searchPatients(patients, "rao").map((p) => p.id), [2]);
  assert.deepEqual(searchPatients(patients, "98765 432").map((p) => p.id), [1]);
  assert.deepEqual(searchPatients(patients, "zzz"), []);
});

it("lists every named patient alphabetically when empty, skipping blank names", () => {
  assert.deepEqual(searchPatients(patients, "").map((p) => p.id), [2, 1, 3]);
  const many = Array.from({ length: 120 }, (_, i) => ({ id: i, name: `P${i}` }));
  assert.equal(searchPatients(many, "").length, 120);
});

it("shows the chosen patient with a change button", () => {
  const html = renderToStaticMarkup(<PatientSearchInput patients={patients} value="2" onChange={() => {}} testId="x" />);
  assert.match(html, /Anita Rao/);
  assert.match(html, /Change patient/);
  assert.match(renderToStaticMarkup(<PatientSearchInput patients={patients} value="" onChange={() => {}} />), /Search name or phone/);
});
