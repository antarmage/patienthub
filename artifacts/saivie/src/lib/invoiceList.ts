export interface InvoiceListRecord {
    id: number;
    patientId: number | null;
    date: string;
    total: number | null;
    paymentStatus: string | null;
}

export function invoiceRows<T extends InvoiceListRecord>(
    invoices: T[],
    patients: { id: number; name: string }[],
    search: string,
) {
    const query = search.trim().toLowerCase();
    const invoiceId = query.replace(/^#/, "").replace(/^sai-/, "");
    const names = new Map(patients.map((patient) => [patient.id, patient.name]));
    return invoices
        .map((invoice) => ({ invoice, patientName: names.get(invoice.patientId ?? -1) || `Patient #${invoice.patientId ?? "unknown"}` }))
        .filter(({ invoice, patientName }) => !query || patientName.toLowerCase().includes(query) || String(invoice.id) === invoiceId)
        .sort((a, b) => b.invoice.date.localeCompare(a.invoice.date) || b.invoice.id - a.invoice.id);
}
