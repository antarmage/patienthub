import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadReceptionPrintRecord, ReceptionSurveyBadge } from "./ReceptionSurveyActions";
import { printPatientSummary } from "./IntakeSummary";

test("reception survey flags distinguish filled, pending and unavailable, including lab surveys", () => {
  for (const surveyType of ["consultation", "lab"]) {
    for (const surveyCompleted of [true, false, undefined]) {
      const html = renderToStaticMarkup(<ReceptionSurveyBadge appointment={{ id: 12, patientId: 3, surveyType, surveyCompleted }} />);
      assert.ok(html.includes('data-testid="flow-survey-12"'));
      assert.ok(html.includes(surveyType === "lab" ? "Lab survey" : "Survey"));
      assert.ok(html.includes(surveyCompleted === undefined ? "status unavailable" : surveyCompleted ? "filled" : "pending"));
    }
  }
});

test("reception Today's patient flow loads saved appointment vitals and prints them on the first summary page", async (t) => {
  const appointment = { id: 20, patientId: 7 };
  let pulse = 82;
  let missing = false;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    switch (String(input)) {
      case "/api/patients/7":
        return Response.json({ id: 7, name: "Synthetic", history: { onboarding: { concerns: ["Fertility"] } } });
      case "/api/appointments/20/reception-vitals":
        return Response.json({ appointmentId: 20, patientId: 7, vitals: missing ? null : {
          bp: "118/76", pulse, temp: 98.6, spo2: 98, weight: 61, height: 160, recordedAt: "2026-11-09T09:30:00Z",
        } });
      case "/api/patients/7/pregnancy-follow-up/20":
        return Response.json({ pregnancy: false, repeat: false, episodeId: null, label: "", asOf: "2026-11-09",
          previousAppointmentCount: 0, trends: { bp: [], weight: [], hb: [], sugar: [] }, answers: null });
      default:
        throw new Error(`Unexpected summary request: ${input}`);
    }
  });
  let html = "";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalStyle = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: {} } });
  Object.defineProperty(globalThis, "getComputedStyle", { configurable: true, value: () => ({ getPropertyValue: () => "#FFFFFC" }) });
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    open: () => ({ document: { open() {}, write(value: string) { html = value; }, close() {} } }),
  } });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
    if (originalStyle) Object.defineProperty(globalThis, "getComputedStyle", originalStyle);
    else Reflect.deleteProperty(globalThis, "getComputedStyle");
  });
  const print = async () => {
    const record = await loadReceptionPrintRecord(appointment);
    printPatientSummary(record.patient, record.vitals, null, record.pregnancy);
    return html.slice(0, html.indexOf("Detailed survey, history and recorded measurements"));
  };
  const first = await print();
  for (const value of ['data-testid="summary-check-in-vitals"', "Check-in vitals (clinic-recorded)", "118/76",
    "82", "98.6", "98%", "61 kg", "160 cm", "23.8", "Fertility"]) assert.ok(first.includes(value), value);
  pulse = 88;
  assert.ok((await print()).includes("<td>Pulse (bpm)</td><td>88</td>"));
  missing = true;
  const empty = await print();
  assert.ok(empty.includes("No check-in vitals recorded for this appointment."));
  assert.ok(!empty.includes("118/76"));
});

test("reception print rejects readings for another appointment rather than borrowing that patient's vitals", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/reception-vitals")) return Response.json({ appointmentId: 21, patientId: 7, vitals: { bp: "118/76" } });
    return Response.json({ id: 7 });
  });
  await assert.rejects(loadReceptionPrintRecord({ id: 20, patientId: 7 }), /invalid or mismatched/);
});
