import assert from "node:assert/strict";
import test from "node:test";
import { bookingServiceCategory, groupBookingServices, suggestedBookingCategory, type BookingService } from "./bookingServices";

const services: BookingService[] = [
    { id: "1", name: "Gynae consultation", category: "Consultation", price: 600 },
    { id: "2", name: "Fertility consultation", category: "Consultation", price: 800 },
    { id: "3", name: "Pelvic ultrasound", category: "Scan", price: 1000 },
    { id: "4", name: "Blood test", category: "Lab", price: 200 },
    { id: "5", name: "Clinic service", category: "Custom", price: 100 },
];

test("suggestions prioritize the recorded care area without hiding any clinic services", () => {
    const groups = groupBookingServices(services, "Suggested", suggestedBookingCategory("Fertility"));
    assert.equal(groups[0].category, "Fertility");
    assert.equal(groups[0].label, "Suggested for fertility");
    assert.deepEqual(groups.flatMap((group) => group.services).map((service) => service.id).sort(), ["1", "2", "3", "4", "5"]);
    assert.equal(suggestedBookingCategory("General"), null);
    assert.equal(suggestedBookingCategory("Pregnant"), "Pregnancy");
    assert.equal(suggestedBookingCategory("PCOS"), "PCOS & hormonal");
    assert.equal(groupBookingServices(services, "All", null).flatMap((group) => group.services).length, 5);
});

test("category filters include labs/scans, retain custom services and handle empty categories", () => {
    assert.deepEqual(groupBookingServices(services, "Tests & scans", null)[0].services.map((service) => service.id), ["3", "4"]);
    assert.equal(groupBookingServices(services, "Other", null)[0].services[0].id, "5");
    assert.deepEqual(groupBookingServices(services, "Pregnancy", null)[0].services.map((service) => service.id), ["1"]);
    assert.deepEqual(groupBookingServices(services, "Menopause", null), []);
    assert.deepEqual(groupBookingServices([], "Suggested", null), []);
    assert.equal(bookingServiceCategory({ name: "Antenatal scan", category: "Pregnancy" }), "Tests & scans");
    assert.equal(bookingServiceCategory({ name: "Menopause consultation", category: "Consultation" }), "Menopause");
    assert.equal(bookingServiceCategory({ name: "Contraception counselling", category: "Gynae" }), "Family planning");
});

test("pregnancy filter includes existing routine and follow-up consultations without changing fees or duplicating suggested services", () => {
    const catalog: BookingService[] = [
        { id: "1", name: "Follow-up consultation", category: "Consultation", price: 750 },
        { id: "2", name: "Routine check-up", category: "Consultation", price: 750 },
        { id: "3", name: "Postpartum review", category: "Consultation", price: 750 },
        { id: "4", name: "Fertility follow-up", category: "Consultation", price: 900 },
        { id: "5", name: "Consultation", category: "Consultation", price: 750 },
    ];
    const pregnancy = groupBookingServices(catalog, "Pregnancy", null)[0].services;
    assert.deepEqual(pregnancy.map((service) => service.id), ["1", "2", "3", "5"]);
    assert.ok(pregnancy.every((service) => service.price === 750));
    const suggested = groupBookingServices(catalog, "Suggested", "Pregnancy");
    assert.equal(suggested.flatMap((group) => group.services).length, catalog.length);
    assert.equal(new Set(suggested.flatMap((group) => group.services.map((service) => service.id))).size, catalog.length);
    assert.equal(groupBookingServices(catalog, "All", null).flatMap((group) => group.services).length, catalog.length);
});
