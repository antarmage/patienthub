import assert from "node:assert/strict";
import test from "node:test";
import { invoicePage, invoiceRows, type InvoiceListRecord } from "./invoiceList.ts";

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

test("a newly created backdated bill is ordered by bill date, not its later invoice number", () => {
    const backdated = { id: 100, patientId: 1, date: "2026-04-01", total: 750 };
    const rows = invoiceRows([...invoices, backdated], patients, "");
    assert.deepEqual(rows.map((row) => row.invoice.id), [55, 54, 53, 100]);
    assert.equal(rows.at(-1)?.invoice.date, "2026-04-01");
});

test("searches patient names and exact invoice numbers in all supported formats", () => {
    for (const search of ["test patient", "53", "#53", " SAI-53 "]) {
        assert.deepEqual(invoiceRows(invoices, patients, search).map((row) => row.invoice.id), [53]);
    }
    assert.deepEqual(invoiceRows(invoices, patients, "Second").map((row) => row.invoice.id), [54]);
    assert.equal(invoiceRows(invoices, patients, "missing").length, 0);
    assert.equal(invoiceRows([], patients, "").length, 0);
});

test("paginates ten invoices per page with correct counts and a partial final page", () => {
    const rows = Array.from({ length: 23 }, (_, index) => index + 1);
    assert.deepEqual(invoicePage(rows, 1), { rows: rows.slice(0, 10), page: 1, pageCount: 3, first: 1, last: 10 });
    assert.deepEqual(invoicePage(rows, 2).rows, rows.slice(10, 20));
    assert.deepEqual(invoicePage(rows, 3), { rows: [21, 22, 23], page: 3, pageCount: 3, first: 21, last: 23 });
});

test("clamps the page after deletion or filtering and handles empty and exact-boundary lists", () => {
    assert.deepEqual(invoicePage([], 3), { rows: [], page: 1, pageCount: 1, first: 0, last: 0 });
    assert.equal(invoicePage(Array.from({ length: 10 }), 2).pageCount, 1);
    assert.equal(invoicePage([1, 2], 3).page, 1);
    assert.equal(invoicePage([1], 0).page, 1);
    const filtered = invoiceRows(invoices, patients, "SAI-53");
    assert.equal(invoicePage(filtered, 3).rows[0].invoice.id, 53);
});
