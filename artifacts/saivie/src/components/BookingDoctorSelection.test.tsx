import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingDoctorSelection, type BookingDoctor } from "./BookingDoctorSelection";

const doctors: BookingDoctor[] = [
    { id: "1", providerId: 1, name: "Dr Synthetic", role: "Gynaecologist", initials: "DS" },
    { id: "2", providerId: 2, name: "Dr Synthetic", role: "Sonologist", initials: "DS", photo: "/doctor.png" },
];
function render(state: { loading?: boolean; error?: boolean; doctors?: BookingDoctor[] } = {}) {
    return renderToStaticMarkup(<BookingDoctorSelection doctors={doctors} selectedId="2" onSelect={() => {}} onRetry={() => {}} loading={false} error={false} {...state} />);
}
test("doctor rows distinguish identical names by ID and show real profile details", () => {
    const html = render();
    assert.ok(html.includes("Who will see her?"));
    assert.ok(html.includes('aria-pressed="false" data-testid="booking-doctor-1"'));
    assert.ok(html.includes('aria-pressed="true" data-testid="booking-doctor-2"'));
    assert.ok(html.includes("Gynaecologist"));
    assert.ok(html.includes("Sonologist"));
    assert.ok(html.includes('src="/doctor.png"'));
    assert.ok(html.includes("Next slot unavailable"));
    assert.ok(html.includes("Automatic assignment is not available"));
    assert.match(html, /<button type="button" disabled=""/);
    assert.ok(!html.includes("Next:"));
});
test("doctor query states do not present stale choices as available", () => {
    for (const state of [{ loading: true }, { error: true }, { doctors: [] }]) {
        assert.ok(!render(state).includes('data-testid="booking-doctor-'));
    }
    assert.ok(render({ loading: true }).includes("Loading doctors"));
    assert.ok(render({ error: true }).includes("Retry doctors"));
    assert.ok(render({ doctors: [] }).includes("No doctors are listed"));
});
