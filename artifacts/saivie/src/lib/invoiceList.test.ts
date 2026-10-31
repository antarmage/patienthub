import assert from "node:assert/strict";
import test from "node:test";
import { invoiceRows, type InvoiceListRecord } from "./invoiceList.ts";

const patients = [{ id: 1, name: "Test Patient" }, { id: 2, name: "Second Patient" }];
const invoices: InvoiceListRecord[] = [
    { id: 53, patientId: 1, date: "2026-10-30", total: 750, paymentStatus: "paid" },
    { id: 54, patientId: 2, date: "2026-10-31", total: 900, paymentStatus: "pending" },
    { id: 55, patientId: 99, date: "2026-10-31", total: 500, paymentStatus: "paid" },
];

test("lists every patient's invoices newest first without mutating the source", () => {
    assert.deepEqual(invoiceRows(invoices, patients, "").map((row) => row.invoice.id), [55, 54, 53]);
    assert.equal(invoices[0].id, 53);
    assert.equal(invoiceRows(invoices, patients, "")[0].patientName, "Patient #99");
});

test("searches patient names and exact invoice numbers in all supported formats", () => {
    for (const search of ["test patient", "53", "#53", " SAI-53 "]) {
        assert.deepEqual(invoiceRows(invoices, patients, search).map((row) => row.invoice.id), [53]);
    }
    assert.deepEqual(invoiceRows(invoices, patients, "Second").map((row) => row.invoice.id), [54]);
    assert.equal(invoiceRows(invoices, patients, "missing").length, 0);
    assert.equal(invoiceRows([], patients, "").length, 0);
});
