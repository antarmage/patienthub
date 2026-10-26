import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NoRecordsIllustration } from "./NoRecordsIllustration";
import { PatientVisitTimeline } from "./PatientVisitTimeline";

test("informative artwork has unique, connected accessible labels", () => {
  const html = renderToStaticMarkup(<><NoRecordsIllustration /><NoRecordsIllustration /></>);
  const labels = [...html.matchAll(/aria-labelledby="([^"]+)"/g)];
  assert.equal(labels.length, 2);
  assert.notEqual(labels[0][1], labels[1][1]);
  for (const label of labels) {
    for (const id of label[1].split(" ")) assert.ok(html.includes(`id="${id}"`));
  }
  assert.equal((html.match(/role="img"/g) || []).length, 2);
  assert.match(html, /viewBox="0 0 320 180"/);
  assert.match(html, /width="100%"/);
  assert.match(html, /data-illustration-part="woman"/);
  assert.match(html, /A woman beside a folder/);
  for (const color of ["#E5C4DB", "#CFE2DC", "#FFFFFC", "#FFD50A", "#252525"]) assert.ok(html.includes(color));
  assert.doesNotMatch(html, /<image|<filter|<linearGradient/);
});

test("empty visit history uses decorative art without changing the message", () => {
  const html = renderToStaticMarkup(<PatientVisitTimeline visits={[]} />);
  assert.match(html, /No visits recorded/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /<title|role="img"/);
});

test("loading and error states do not show the empty-state artwork", () => {
  for (const props of [{ isLoading: true }, { isError: true }]) {
    const html = renderToStaticMarkup(<PatientVisitTimeline visits={[]} {...props} />);
    assert.doesNotMatch(html, /viewBox="0 0 320 180"|No visits recorded/);
  }
});
