import assert from "node:assert/strict";
import { it } from "node:test";
import { readLabPrescription, sanitizeLabSurvey, surveyKindFor } from "./survey-kind";

it("detects lab-only bookings and honours staff overrides", () => {
  assert.equal(surveyKindFor({ type: "Lab Test" }), "lab");
  assert.equal(surveyKindFor({ type: "Blood Test / Lab Work" }), "lab");
  assert.equal(surveyKindFor({ visitType: "Pathology sample collection" }), "lab");
  assert.equal(surveyKindFor({ type: "Consultation", reason: "lab report review" }), "consultation");
  assert.equal(surveyKindFor({ type: "USG" }), "consultation");
  assert.equal(surveyKindFor({ type: "Lab Test", surveyType: "consultation" }), "consultation");
  assert.equal(surveyKindFor({ type: "Follow-up", surveyType: "lab" }), "lab");
  assert.equal(surveyKindFor({ type: "Lab Test", surveyType: "bogus" }), "lab");
});

it("keeps only known lab survey fields and trims them", () => {
  const out = sanitizeLabSurvey({ tests: " TSH, CBC ", lastPeriod: "not a date", medicines: ["Thyroid", 5, " Biotin "], extra: "x" });
  assert.deepEqual(out, { tests: "TSH, CBC", medicines: ["Thyroid", "Biotin"] });
  assert.deepEqual(sanitizeLabSurvey(null), {});
  assert.deepEqual(sanitizeLabSurvey({ lastPeriod: "Don't remember" }), { lastPeriod: "Don't remember" });
  assert.deepEqual(sanitizeLabSurvey({ lastPeriod: "2026-10-12" }), { lastPeriod: "2026-10-12" });
});

it("accepts small images/PDFs and rejects other uploads", () => {
  assert.equal(readLabPrescription(undefined), null);
  assert.deepEqual(readLabPrescription({ fileData: "data:image/png;base64,aGVsbG8=", mimeType: "image/png", fileName: "rx<1>.png" }), { base64: "aGVsbG8=", mimeType: "image/png", fileName: "rx_1_.png" });
  assert.ok("error" in (readLabPrescription({ fileData: "aGVsbG8=", mimeType: "text/html" }) as object));
  assert.ok("error" in (readLabPrescription({ fileData: "A".repeat(12 * 1024 * 1024), mimeType: "image/jpeg" }) as object));
});
