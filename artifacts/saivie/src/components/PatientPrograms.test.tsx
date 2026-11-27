import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import PatientPrograms from "./PatientPrograms";

function renderPrograms(pregnancy: boolean) {
  return renderToStaticMarkup(<PatientPrograms pregnancy={pregnancy} week={null} mode={pregnancy ? "pregnancy" : "general"} />);
}

test("cycle programs use the period brand color for the overview hero", () => {
  const html = renderPrograms(false);
  assert.match(html, /rounded-\[40px\] p-6 md:p-12 bg-\[#FFB534\]/);
  assert.match(html, /tracking-\[0\.1em\] text-\[#FFB534\]/);
});

test("pregnancy programs retain their pregnancy hero color", () => {
  const html = renderPrograms(true);
  assert.match(html, /rounded-\[40px\] p-6 md:p-12 bg-\[#FFA7B6\]/);
  assert.match(html, /tracking-\[0\.1em\] text-\[#FFA7B6\]/);
});
