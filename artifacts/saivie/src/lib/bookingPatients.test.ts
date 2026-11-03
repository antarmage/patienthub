import assert from "node:assert/strict";
import test from "node:test";
import { bookingPatientCategory, filterBookingPatients } from "./bookingPatients";

const patients = [
    { id: 313, name: "Synthetic A", phone: "+91 98765 43210", type: "Pregnant", lastVisit: "2026-10-30" },
    { id: 466, name: "Synthetic B", type: "Fertility", lastVisit: "2026-11-02" },
    { id: 5, name: "Synthetic C", type: "PCOS", lastVisit: "invalid" },
];
test("booking patient search supports name, formatted phone and exact ID", () => {
    assert.deepEqual(filterBookingPatients(patients, "synthetic b", "All").map((p) => p.id), [466]);
    assert.deepEqual(filterBookingPatients(patients, "98765 43210", "All").map((p) => p.id), [313]);
    assert.deepEqual(filterBookingPatients(patients, "#5", "All").map((p) => p.id), [5]);
    assert.deepEqual(filterBookingPatients(patients, "unknown", "All"), []);
});
test("recent uses valid visit dates and category filters combine with search", () => {
    assert.deepEqual(filterBookingPatients(patients, "", "Recent").map((p) => p.id), [466, 313]);
    assert.deepEqual(filterBookingPatients(patients, "synthetic", "Pregnant").map((p) => p.id), [313]);
    assert.deepEqual(filterBookingPatients(patients, "", "PCOS").map((p) => p.id), [5]);
    assert.deepEqual(patients.map((p) => p.id), [313, 466, 5]);
    assert.equal(bookingPatientCategory({ id: 1, name: "Test", pregnancyStatus: "not pregnant" }), "General");
    assert.equal(bookingPatientCategory({ id: 1, name: "Test", pregnancyStatus: "Pregnant" }), "Pregnant");
    assert.equal(bookingPatientCategory({ id: 1, name: "Test", type: "Postpartum", pregnancyStatus: "Pregnant" }), "Postpartum");
    assert.equal(bookingPatientCategory({ id: 1, name: "Test", type: "MTP", pregnancyStatus: "Pregnant" }), "MTP");
    assert.equal(bookingPatientCategory({ id: 1, name: "Test", type: "TTC" }), "Fertility");
    assert.equal(bookingPatientCategory({ id: 1, name: "Test", type: "Obstetric" }), "Pregnant");
});
