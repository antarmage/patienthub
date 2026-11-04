import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookingScheduleSelection } from "./BookingScheduleSelection";

test("schedule picker exposes exact times, duration, date shortcuts and walk-in restriction", () => {
    const client = new QueryClient();
    try {
        const html = renderToStaticMarkup(<QueryClientProvider client={client}><BookingScheduleSelection
            date={new Date()} onDateChange={() => {}} time="10:37" onTimeChange={() => {}}
            duration={30} onDurationChange={() => {}} walkIn={true}
        /></QueryClientProvider>);
        assert.ok(html.includes("When should she come?"));
        assert.ok(html.includes('value="10:37"'));
        assert.ok(html.includes("Walk-ins are booked for today"));
        assert.ok(html.includes("30 min"));
        assert.ok(html.includes("Quick times are shortcuts, not available slots"));
        assert.ok(html.includes('aria-label="Increase minute"'));
    } finally { client.clear(); }
});

test("overlap warning uses only the selected doctor's non-cancelled appointments", () => {
    const client = new QueryClient();
    const key = ["/api/appointments", "booking-conflicts", "2026-11-04", "2026-11-06"];
    const render = () => renderToStaticMarkup(<QueryClientProvider client={client}><BookingScheduleSelection
        date={new Date(2026, 10, 5)} onDateChange={() => {}} time="10:30" onTimeChange={() => {}}
        duration={30} onDurationChange={() => {}} providerId={2} walkIn={false}
    /></QueryClientProvider>);
    try {
        client.setQueryData(key, [
            { id: 1, providerId: 2, date: "2026-11-05", time: "10:15 AM", duration: 30 },
            { id: 2, providerId: 3, date: "2026-11-05", time: "10:30 AM", duration: 30 },
        ]);
        assert.ok(render().includes("Heads up:"));
        assert.ok(render().includes("10:15 AM"));
        client.setQueryData(key, [{ id: 1, providerId: 2, date: "2026-11-05", time: "10:15 AM", duration: 30, status: "cancelled" }]);
        assert.ok(!render().includes("Heads up:"));
    } finally { client.clear(); }
});
