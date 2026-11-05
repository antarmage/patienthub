import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PrescriptionAttachments } from "./PrescriptionAttachments";
import { MAX_PRESCRIPTION_TOTAL_BYTES, prescriptionAttachmentBytes, validatePrescriptionAttachmentLimits } from "../../../../lib/db/src/prescription-attachments";

test("each prescription page provides view, download and delete actions with save and audit guidance", () => {
  const html = renderToStaticMarkup(<PrescriptionAttachments disabled={false} onDelete={() => {}} files={[
    { name: "page 1.png", mimeType: "image/png", fileData: "YQ==" },
    { name: "page 2.pdf", mimeType: "application/pdf", fileData: "YWI=" },
  ]} />);
  for (const name of ["page 1.png", "page 2.pdf"]) {
    for (const action of ["View", "Download", "Delete"]) assert.ok(html.includes(`aria-label="${action} ${name}"`));
  }
  assert.ok(html.includes("At least one original must remain"));
  assert.ok(html.includes("deletions take effect on Save"));
  assert.ok(html.includes("data:application/pdf;base64,YWI="));
});

test("missing originals are explicitly unavailable and saving cannot disguise them as an available file", () => {
  const html = renderToStaticMarkup(<PrescriptionAttachments disabled={false} onDelete={() => {}} files={[
    { name: "missing.pdf", mimeType: "application/pdf", fileData: null },
  ]} />);
  assert.ok(html.includes("Original file unavailable"));
  assert.ok(html.includes('aria-label="View missing.pdf"'));
  assert.ok(!html.includes('aria-label="Download missing.pdf"'));
});

test("shared upload limits enforce 10 files and 8 MB total, including retained files, without guessing base64 sizes", () => {
  const file = { type: "image/png", size: 100 };
  assert.equal(validatePrescriptionAttachmentLimits(Array(10).fill(file)), null);
  assert.match(validatePrescriptionAttachmentLimits(Array(11).fill(file)) || "", /10/);
  assert.match(validatePrescriptionAttachmentLimits([]) || "", /1/);
  assert.match(validatePrescriptionAttachmentLimits([{ ...file, type: "text/html" }]) || "", /JPEG/);
  assert.match(validatePrescriptionAttachmentLimits([{ ...file, size: 0 }]) || "", /empty/);
  assert.equal(validatePrescriptionAttachmentLimits([{ ...file, size: MAX_PRESCRIPTION_TOTAL_BYTES }]), null);
  assert.match(validatePrescriptionAttachmentLimits([{ ...file, size: MAX_PRESCRIPTION_TOTAL_BYTES }, file]) || "", /8 MB/);
  for (const text of ["a", "ab", "abc", "abcd"]) {
    assert.equal(prescriptionAttachmentBytes({ fileData: Buffer.from(text).toString("base64") }), text.length);
  }
});
