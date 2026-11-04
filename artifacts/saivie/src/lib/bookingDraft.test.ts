import assert from "node:assert/strict";
import test from "node:test";
import { bookingDateKey, emptyNewPatientDraft, formatAppointmentTime, missingBookingFields, newPatientPayload } from "./bookingDraft";

test("builds a new-patient record only when name and a valid age are entered", () => {
    assert.equal(newPatientPayload(emptyNewPatientDraft), null);
    assert.equal(newPatientPayload({ ...emptyNewPatientDraft, firstName: "Test" }), null);
    assert.equal(newPatientPayload({ ...emptyNewPatientDraft, firstName: "Test", age: "-1" }), null);
    assert.equal(newPatientPayload({ ...emptyNewPatientDraft, firstName: "Test", age: "2.5" }), null);
    assert.deepEqual(
        newPatientPayload({ ...emptyNewPatientDraft, firstName: " Test ", lastName: " Patient ", age: "31", phone: " ", email: "t@example.com " }),
        { name: "Test Patient", age: 31, phone: null, email: "t@example.com", type: "General", lmp: null, referredBy: null },
    );
});

test("stores selected care area and only persists LMP for pregnancy patients", () => {
    const pregnancy = newPatientPayload({
        ...emptyNewPatientDraft, firstName: "Pregnancy", age: "30", careArea: "Pregnancy",
        lmp: "2026-08-10", referredBy: "Dr Example",
    });
    assert.deepEqual(pregnancy, {
        name: "Pregnancy", age: 30, phone: null, email: null,
        type: "Pregnant", lmp: "2026-08-10", referredBy: "Dr Example",
    });
    const nonPregnancy = newPatientPayload({
        ...emptyNewPatientDraft, firstName: "PCOS", age: "28", careArea: "PCOS", lmp: "2026-08-10",
    });
    assert.equal(nonPregnancy?.type, "PCOS");
    assert.equal(nonPregnancy?.lmp, null);
});

test("names exactly which booking fields are missing", () => {
    const date = new Date(2026, 0, 9);
    assert.deepEqual(missingBookingFields({ hasPatient: true, date, time: "09:30" }), []);
    assert.deepEqual(missingBookingFields({ hasPatient: false, date, time: "09:30" }), ["patient"]);
    assert.deepEqual(missingBookingFields({ hasPatient: true, date: undefined, time: "" }), ["date", "time"]);
});

test("formats the stored date in local time and the time as 12-hour clock", () => {
    assert.equal(bookingDateKey(new Date(2026, 0, 9, 23, 59)), "2026-01-09");
    assert.equal(formatAppointmentTime("00:05"), "12:05 AM");
    assert.equal(formatAppointmentTime("14:30"), "02:30 PM");
});
