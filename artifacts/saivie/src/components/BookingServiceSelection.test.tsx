import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingServiceSelection } from "./BookingServiceSelection";

function render(state: { loading?: boolean; error?: boolean } = {}) {
    return renderToStaticMarkup(<BookingServiceSelection
        services={[
            { id: "1", name: "Fertility consultation", category: "Consultation", description: "First or follow-up", price: 800 },
            { id: "2", name: "Lab test", category: "Lab", price: 200 },
        ]}
        selectedId="2" careArea="Fertility" onSelect={() => {}} onRetry={() => {}}
        loading={false} error={false} {...state}
    />);
}

test("reason picker renders clinic options, suggestions and exactly one selected card", () => {
    const html = render();
    assert.ok(html.includes("What does she need?"));
    assert.ok(html.includes("Pick one reason"));
    assert.ok(html.includes("Suggested for fertility"));
    assert.ok(html.indexOf("Fertility consultation") < html.indexOf(">Lab test<"));
    assert.ok(html.includes('aria-pressed="true" data-testid="booking-service-2"'));
    assert.ok(html.includes('aria-pressed="false" data-testid="booking-service-1"'));
    assert.ok(html.includes("First or follow-up"));
});

test("loading and errors do not display selectable stale options", () => {
    assert.ok(render({ loading: true }).includes("Loading appointment options"));
    const failed = render({ error: true });
    assert.ok(failed.includes('role="alert"'));
    assert.ok(failed.includes("Retry services"));
    assert.ok(!failed.includes('data-testid="booking-service-'));
});
