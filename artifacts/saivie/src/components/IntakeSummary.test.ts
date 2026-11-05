import assert from "node:assert/strict";
import { it } from "node:test";
import { printPatientSummary } from "./IntakeSummary.tsx";
import { initialForm } from "../lib/onboardingFlow.ts";

it("prints skipped history as unknown, not negative or zero, and preserves explicit answers", () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    const originalGetComputedStyle = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
    Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: {} } });
    Object.defineProperty(globalThis, "getComputedStyle", {
        configurable: true,
        value: () => ({ getPropertyValue: () => "#FFFFFC" }),
    });
    let html = "";
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            open: () => ({
                document: {
                    open() {},
                    write(value: string) { html = value; },
                    close() {},
                },
            }),
        },
    });
    try {
        const form = structuredClone(initialForm);
        form.pregnancies.total = "2";
        const patient = { name: "Demo Patient", history: { onboarding: form } };
        printPatientSummary(patient);
        assert.ok(html.includes('data-testid="summary-clinician-overview"'));
        assert.ok(html.includes('data-testid="summary-logo-space"'));
        assert.ok(html.includes("Detailed survey, history and recorded measurements"));
        assert.ok(html.includes("break-after:page"));
        assert.ok(html.includes(">G2</div>"));
        assert.ok(!html.includes("G2 P0 A0"));
        assert.ok(html.includes("Birth/loss history not fully reported"));
        assert.ok(html.includes("Not reported"));
        assert.ok(!html.includes("None reported"));

        form.pregnancies.vaginal = "1";
        form.pregnancies.cesarean = "0";
        form.pregnancies.miscarriages = "0";
        form.pregnancies.terminations = "0";
        form.health.allergies = "No known allergies";
        form.health.medications = "Not taking any";
        printPatientSummary(patient);
        assert.ok(html.includes("G2 P1 A0"));
        assert.ok(html.includes("<td>C-sections</td><td>0</td>"));
        assert.ok(html.includes("No known allergies"));
        assert.ok(html.includes("Not taking any"));

        form.consultation = {
            directions: ["Ovulatory timing"],
            answers: { "Are cycles regular?": "Usually regular <patient-reported>" },
        };
        printPatientSummary(patient);
        assert.ok(html.includes("Pre-visit survey (patient-reported)"));
        assert.ok(html.includes("Ovulatory timing"));
        assert.ok(html.includes("Usually regular &lt;patient-reported&gt;"));
        assert.ok(!html.includes("<patient-reported>"));

        printPatientSummary(patient, { bp: "118/76", pulse: "82", weight: "61", recordedAt: "2025-01-01T09:30:00.000Z" });
        assert.ok(html.includes("118/76"));
        assert.ok(html.includes("Pulse"));
        assert.ok(html.includes("61 kg"));

        assert.ok(!html.includes("All doses reported or recorded"));
        assert.ok(html.includes('data-testid="hpv-print-badge-not-recorded"'));
        form.gyn.hpvVaccine = "Yes, all doses";
        printPatientSummary(patient);
        assert.ok(html.includes("All doses reported or recorded"));
        assert.ok(html.includes('data-testid="hpv-print-badge-protected"'));
        assert.ok(html.includes("<svg"));
        form.gyn.hpvVaccine = "Yes, some doses";
        printPatientSummary(patient);
        assert.ok(html.includes('data-testid="hpv-print-badge-in-progress"'));
        assert.ok(html.includes("HPV doses started"));
        form.gyn.hpvVaccine = "Not sure";
        printPatientSummary(patient);
        assert.ok(html.includes('data-testid="hpv-print-badge-unknown"'));
        assert.ok(!html.includes('data-testid="hpv-print-badge-not-vaccinated"'));
        form.gyn.hpvVaccine = "No";
        printPatientSummary(patient);
        assert.ok(html.includes('data-testid="hpv-print-badge-not-vaccinated"'));
        assert.ok(html.includes("Patient reports no HPV vaccination"));
        assert.ok(html.includes('data-testid="cervical-cancer-prevention-not-vaccinated"'));
        assert.ok(html.includes("Cervical cancer prevention: risk and options"));
        assert.ok(html.indexOf("Cervical cancer prevention: risk and options") > html.indexOf('<div class="cards">'));
        printPatientSummary(patient, null, "in-progress");
        assert.ok(html.includes('data-testid="hpv-print-badge-in-progress"'));
        assert.ok(!html.includes('data-testid="hpv-print-badge-not-vaccinated"'));
        printPatientSummary(patient, null, "protected");
        assert.ok(html.includes("All doses reported or recorded"));
        assert.ok(!html.includes("discuss vaccination"));
        assert.ok(!html.includes('data-testid="hpv-print-badge-not-vaccinated"'));
        assert.ok(!html.includes("Cervical cancer prevention: risk and options"));

        printPatientSummary({ name: "Lab Patient", history: { labSurvey: { tests: "Thyroid profile", lastMeal: "Less than 2 hours ago", allergies: ["Latex"], appointmentId: 7 } } });
        assert.ok(html.includes("Lab visit survey"));
        assert.ok(html.includes("Thyroid profile"));
        assert.ok(html.includes("Not fasting"));
        assert.ok(html.includes("Allergy: Latex"));

        printPatientSummary(patient, null, null, {
            pregnancy: true, repeat: true, episodeId: 2, label: "Pregnancy 2", asOf: "2026-05-01",
            previousAppointmentCount: 1,
            trends: { bp: [{ date: "2026-04-01", value: 120, secondary: 80, source: "Appointment" }], weight: [], hb: [], sugar: [] },
            answers: { visitReason: "Current concern", concern: "New nausea", foodHabits: "Small meals",
                vomitingChange: "Increased", eatingDrinking: "Able to eat and drink", investigations: "Some completed",
                reports: "Done, awaiting reports", investigationDetails: "Blood tests completed", changes: "" },
        });
        for (const text of ["Pregnancy measurements", "Pregnancy 2", "2026-04-01", "120 / 80", "New nausea", "Small meals",
            "Vomiting since the last visit", "Original intake: Pre-visit survey"]) assert.ok(html.includes(text), text);
    } finally {
        if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
        else Reflect.deleteProperty(globalThis, "window");
        if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
        else Reflect.deleteProperty(globalThis, "document");
        if (originalGetComputedStyle) Object.defineProperty(globalThis, "getComputedStyle", originalGetComputedStyle);
        else Reflect.deleteProperty(globalThis, "getComputedStyle");
    }
});
