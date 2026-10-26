import assert from "node:assert/strict";
import test from "node:test";
import { SP_DIAGNOSTIC_USG_RATES, knownRateCard, parseRateCardText } from "./referral-rate-cards";

test("SP Diagnostic rate card matches the handwritten list", () => {
  assert.equal(SP_DIAGNOSTIC_USG_RATES.length, 11);
  const byName = Object.fromEntries(SP_DIAGNOSTIC_USG_RATES.map((r) => [r.name, r.price]));
  assert.equal(byName["Anomaly Scan"], 2600);
  assert.equal(byName["Both Breast"], 2000);
  assert.equal(byName["Fetal Echo"], 3500);
  assert.equal(byName["Folliculometry"], 600);
});

test("knownRateCard recognises SP Diagnostic name variants only", () => {
  for (const name of ["SP Diagnostic", "SP Diagnostics", "S.P. Diagnostic Centre", " sp diagnostics"]) assert.ok(knownRateCard(name), name);
  for (const name of ["Spectrum Diagnostics", "Apollo Diagnostics", "Diagnostic SP"]) assert.equal(knownRateCard(name), null, name);
});

test("parseRateCardText reads common pasted formats", () => {
  const rows = parseRateCardText([
    "1. USG of whole abdomen 1600",
    "FPP with NT Scan\t2000",
    "Anomaly Scan - ₹2,600",
    "Fetal echo: Rs. 3500/-",
    "Growth Scan 1500.",
    "",
    "Header without price",
    "anomaly scan 2650",
  ].join("\n"));
  assert.deepEqual(rows, [
    { name: "USG of whole abdomen", price: 1600 },
    { name: "FPP with NT Scan", price: 2000 },
    { name: "anomaly scan", price: 2650 },
    { name: "Fetal echo", price: 3500 },
    { name: "Growth Scan", price: 1500 },
  ]);
});
