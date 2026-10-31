import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Mail, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatInvoiceNumber } from "@/components/InvoiceDocument";
import { invoicePage, invoiceRows, type InvoiceListRecord } from "@/lib/invoiceList";

interface AllInvoicesProps<T extends InvoiceListRecord> {
    invoices: T[];
    patients: { id: number; name: string }[];
    search: string;
    onSearch: (value: string) => void;
    isLoading: boolean;
    error: Error | null;
    isDeleting: boolean;
    onRefresh: () => void;
    onView: (invoice: T) => void;
    onEmail: (invoice: T) => void;
    onEdit: (invoice: T) => void;
    onDelete: (invoice: T) => void;
}

export function AllInvoices<T extends InvoiceListRecord>({
    invoices, patients, search, onSearch, isLoading, error, isDeleting,
    onRefresh, onView, onEmail, onEdit, onDelete,
}: AllInvoicesProps<T>) {
    const rows = invoiceRows(invoices, patients, search);
    const [pagination, setPagination] = useState({ search, page: 1 });
    const paginated = invoicePage(rows, pagination.search === search ? pagination.page : 1);
    const changePage = (page: number) => setPagination({ search, page });
    return (
        <Card className="border-saivie-border bg-saivie-surface-muted shadow-sm" data-testid="card-all-invoices">
            <CardHeader className="gap-3">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base text-saivie-plum">All invoices</CardTitle>
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                        <RefreshCw className="mr-2 h-4 w-4" />Refresh
                    </Button>
                </div>
                <Input value={search} onChange={(event) => { changePage(1); onSearch(event.target.value); }}
                    placeholder="Search by patient name or invoice #" aria-label="Search invoices"
                    data-testid="input-search-invoices" />
            </CardHeader>
            <CardContent>
                {isLoading ? <p className="py-6 text-center text-sm">Loading invoices...</p>
                    : error ? <p role="alert" className="py-6 text-sm text-rose-600">Could not load invoices: {error.message}</p>
                        : rows.length === 0 ? <p className="py-6 text-center text-sm">{search.trim() ? "No matching invoices" : "No invoices yet"}</p>
                            : <div className="space-y-4">
                              <div className="overflow-x-auto rounded-xl bg-white">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-saivie-border text-xs text-saivie-plum">
                                        <tr><th className="px-3 py-3">Invoice</th><th className="px-3 py-3">Patient</th><th className="px-3 py-3">Date</th><th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-saivie-border">
                                        {paginated.rows.map(({ invoice, patientName }) => (
                                            <tr key={invoice.id} data-testid={`all-invoices-row-${invoice.id}`}>
                                                <td className="whitespace-nowrap px-3 py-3 font-medium">{formatInvoiceNumber(invoice.id)}</td>
                                                <td className="px-3 py-3">{patientName}</td>
                                                <td className="whitespace-nowrap px-3 py-3">{invoice.date}</td>
                                                <td className="whitespace-nowrap px-3 py-3 text-right">₹{(invoice.total ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                                                <td className="px-3 py-3"><Badge variant="outline" className={`capitalize ${(invoice.paymentStatus || "paid") === "paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{invoice.paymentStatus || "paid"}</Badge></td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="outline" size="sm" onClick={() => onView(invoice)} data-testid={`btn-all-view-invoice-${invoice.id}`}><Eye className="mr-1 h-3.5 w-3.5" />View / Print</Button>
                                                        <Button variant="ghost" size="icon" aria-label={`Email invoice ${formatInvoiceNumber(invoice.id)}`} onClick={() => onEmail(invoice)} data-testid={`btn-all-email-invoice-${invoice.id}`}><Mail className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" aria-label={`Edit invoice ${formatInvoiceNumber(invoice.id)}`} onClick={() => onEdit(invoice)} data-testid={`btn-all-edit-invoice-${invoice.id}`}><Pencil className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" aria-label={`Delete invoice ${formatInvoiceNumber(invoice.id)}`} disabled={isDeleting} onClick={() => onDelete(invoice)} data-testid={`btn-all-delete-invoice-${invoice.id}`}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                              </div>
                              <nav aria-label="Invoice pagination" className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs text-saivie-plum" aria-live="polite">Showing {paginated.first}–{paginated.last} of {rows.length} invoices</p>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" disabled={paginated.page === 1} onClick={() => changePage(paginated.page - 1)} data-testid="btn-invoices-previous"><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
                                  <span className="text-xs text-saivie-plum">Page {paginated.page} of {paginated.pageCount}</span>
                                  <Button variant="outline" size="sm" disabled={paginated.page === paginated.pageCount} onClick={() => changePage(paginated.page + 1)} data-testid="btn-invoices-next">Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
                                </div>
                              </nav>
                            </div>}
            </CardContent>
        </Card>
    );
}
