import assert from "node:assert/strict";
import test from "node:test";
import { patientGreetingName } from "./patientGreeting";

test("greeting uses the given name, not a title prefix", () => {
  assert.equal(patientGreetingName("Mrs. Surbhi Sukla"), "Surbhi");
  assert.equal(patientGreetingName("Ms Anita Rao"), "Anita");
  assert.equal(patientGreetingName("Dr. Priya"), "Priya");
  assert.equal(patientGreetingName("Smt. Lata Devi"), "Lata");
});

test("names without titles and edge cases stay intact", () => {
  assert.equal(patientGreetingName("Meera Krishnan"), "Meera");
  assert.equal(patientGreetingName("  Priya  "), "Priya");
  assert.equal(patientGreetingName("Mrs."), "Mrs.");
  assert.equal(patientGreetingName(""), "");
  assert.equal(patientGreetingName(null), "");
  assert.equal(patientGreetingName(undefined), "");
});
