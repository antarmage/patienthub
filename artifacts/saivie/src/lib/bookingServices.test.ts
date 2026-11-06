import assert from "node:assert/strict";
import test from "node:test";
import { bookingServiceCategory, groupBookingServices, suggestedBookingCategory, type BookingService } from "./bookingServices";
import type { BookingCategory } from "../../../../lib/db/src/booking-catalog";

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

test("configured booking categories use IDs and assignments, never service-name inference, and keep All complete", () => {
    const categories: BookingCategory[] = [
        { id: 10, name: "Renamed menopause", sortOrder: 20, isActive: true, careArea: "Menopause", description: "", version: 1 },
        { id: 20, name: "New custom tab", sortOrder: 0, isActive: true, careArea: "", description: "", version: 1 },
        { id: 30, name: "Archived", sortOrder: 1, isActive: false, careArea: "", description: "", version: 1 },
    ];
    const catalog = [
        { ...services[0], bookingCategoryIds: [10, 20] },
        { ...services[1], bookingCategoryIds: [30] },
        { ...services[2], bookingCategoryIds: [] },
    ];
    assert.deepEqual(groupBookingServices(catalog, "10", null, categories)[0].services, [catalog[0]]);
    assert.equal(groupBookingServices(catalog, "Suggested", "10", categories)[0].label, "Suggested for renamed menopause");
    const all = groupBookingServices(catalog, "All", null, categories);
    assert.equal(all[0].category, "20");
    assert.equal(all.flatMap((group) => group.services).length, catalog.length);
    assert.equal(new Set(all.flatMap((group) => group.services.map((service) => service.id))).size, catalog.length);
    assert.equal(all.at(-1)?.label, "Unassigned");
    assert.deepEqual(groupBookingServices(catalog, "30", null, categories), []);
    assert.equal(groupBookingServices(catalog, "All", null, []).flatMap((group) => group.services).length, catalog.length);
});

test("category filters include labs/scans, retain custom services and handle empty categories", () => {
    assert.deepEqual(groupBookingServices(services, "Tests & scans", null)[0].services.map((service) => service.id), ["3", "4"]);
    assert.equal(groupBookingServices(services, "Other", null)[0].services[0].id, "5");
    assert.deepEqual(groupBookingServices(services, "Pregnancy", null)[0].services.map((service) => service.id), ["1"]);
    assert.deepEqual(groupBookingServices(services, "Menopause", null)[0].services.map((service) => service.id), ["1"]);
    assert.deepEqual(groupBookingServices([], "Suggested", null), []);
    assert.equal(bookingServiceCategory({ name: "Antenatal scan", category: "Pregnancy" }), "Tests & scans");
    assert.equal(bookingServiceCategory({ name: "Menopause consultation", category: "Consultation" }), "Menopause");
    assert.equal(bookingServiceCategory({ name: "Contraception counselling", category: "Gynae" }), "Family planning");
});

test("menopause reuses routine consultations and follow-ups without changing identities, fees or other categories", () => {
    const catalog: BookingService[] = [
        { id: "1", name: "Consultation", category: "Consultation", price: 750 },
        { id: "2", name: "Gynaecology consultation", category: "Consultation", price: 800 },
        { id: "3", name: "Follow-up consultation", category: "Consultation", price: 500 },
        { id: "4", name: "Menopause consultation", category: "Consultation", price: 900 },
        { id: "5", name: "Fertility follow-up", category: "Consultation", price: 900 },
        { id: "6", name: "Postpartum review", category: "Consultation", price: 750 },
        { id: "7", name: "Pelvic ultrasound", category: "Scan", price: 1000 },
        { id: "8", name: "Clinic service", category: "Custom", price: 100 },
    ];
    const menopause = groupBookingServices(catalog, "Menopause", null);
    assert.equal(menopause.length, 1);
    assert.equal(menopause[0].category, "Menopause");
    assert.deepEqual(menopause[0].services, catalog.slice(0, 4));
    menopause[0].services.forEach((service) => assert.equal(service, catalog.find((item) => item.id === service.id)));
    const suggested = groupBookingServices(catalog, "Suggested", "Menopause").flatMap((group) => group.services);
    assert.equal(suggested.length, catalog.length);
    assert.equal(new Set(suggested.map((service) => service.id)).size, catalog.length);
    assert.equal(groupBookingServices(catalog, "All", null).flatMap((group) => group.services).length, catalog.length);
    assert.equal(bookingServiceCategory(catalog[0]), "Other");
    assert.equal(bookingServiceCategory(catalog[1]), "Gynae");
    assert.deepEqual(groupBookingServices(catalog, "Pregnancy", null)[0].services.map((service) => service.id), ["1", "2", "3", "6"]);
    assert.deepEqual(groupBookingServices(catalog.slice(4), "Menopause", null), []);
    const named = { id: "9", name: "Gynaecologist consultation Dr. Example", category: "Consultation", price: 800 };
    assert.deepEqual(groupBookingServices([named], "Menopause", null)[0].services, [named]);
    assert.deepEqual(groupBookingServices([named], "Pregnancy", null), []);
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
