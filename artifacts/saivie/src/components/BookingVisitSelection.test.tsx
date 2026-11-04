import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingVisitSelection } from "./BookingVisitSelection";
import { bookingVisitContext, bookingVisitModeLabel } from "@/lib/bookingVisit";

function render(mode = "in-clinic", notes = "") {
    return renderToStaticMarkup(<BookingVisitSelection mode={mode} onModeChange={() => {}} reason="Follow-up" onReasonChange={() => {}} notes={notes} onNotesChange={() => {}} />);
}
test("visit picker retains supported modes and explicitly disables unsupported workflows", () => {
    const html = render();
    assert.ok(html.includes("How will the visit happen?"));
    assert.ok(html.includes('aria-pressed="true" data-testid="btn-visit-mode-in-clinic"'));
    assert.ok(html.includes('data-testid="btn-visit-mode-home-visit"'));
    assert.match(html, /disabled="" aria-pressed="false" data-testid="btn-visit-mode-phone-call"/);
    assert.ok(html.includes("Automatic survey sending is not available"));
    assert.ok(html.includes("Follow-up"));
    assert.ok(!html.includes('id="appointment-notes"'));
});
test("video and home visit explain actual workflows and notes remain visible when populated", () => {
    assert.ok(render("telemedicine").includes("Google Meet"));
    assert.ok(!render("telemedicine").includes("Jitsi"));
    assert.ok(render("home-visit").includes("Confirm the patient"));
    assert.ok(render("in-clinic", "Needs interpreter").includes("Needs interpreter"));
});
test("optional reason and notes preserve booking context without requiring a diagnosis", () => {
    assert.equal(bookingVisitContext("", " "), null);
    assert.equal(bookingVisitContext("Follow-up", "  Needs interpreter "), "Follow-up\nNeeds interpreter");
    assert.equal(bookingVisitContext("", "Prefilled concern"), "Prefilled concern");
    assert.equal(bookingVisitModeLabel("telemedicine"), "Video call");
});
