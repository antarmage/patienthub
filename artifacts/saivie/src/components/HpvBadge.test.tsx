import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HpvBadge } from "./HpvBadge";

test("HPV badge renders distinct readable text and vector seals for complete and partial vaccination", () => {
  for (const variant of ["compact", "full"] as const) {
    assert.equal(renderToStaticMarkup(<HpvBadge status={null} variant={variant} />), "");
    const complete = renderToStaticMarkup(<HpvBadge status="protected" variant={variant} />);
    const partial = renderToStaticMarkup(<HpvBadge status="in-progress" variant={variant} />);
    assert.ok(complete.includes("HPV vaccinated"));
    assert.ok(partial.includes("HPV doses started"));
    assert.ok(complete.includes("<svg"));
    assert.ok(complete.includes('aria-hidden="true"'));
    assert.ok(!complete.includes("protected myself from cervical cancer"));
    assert.ok(!partial.includes("HPV vaccinated"));
    if (variant === "full") {
      assert.ok(complete.includes("Continue cervical screening as advised"));
      assert.ok(partial.includes("completing vaccination"));
    }
  }
});
