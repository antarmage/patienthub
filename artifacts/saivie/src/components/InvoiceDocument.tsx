export interface InvoiceTemplateData {
  clinicName?: string | null;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
  clinicEmail?: string | null;
  taxRegistration?: string | null;
  logoUrl?: string | null;
  footerText?: string | null;
  sections?: {
    patientContact?: boolean;
    taxBreakdown?: boolean;
    paymentMethod?: boolean;
    notes?: boolean;
  };
}

export interface InvoiceDocumentItem {
  name: string;
  price: number;
  quantity: number;
  taxRate?: number;
}

interface InvoiceDocumentProps {
  template: InvoiceTemplateData;
  patient: { name?: string; phone?: string | null; email?: string | null; address?: string | null };
  items: InvoiceDocumentItem[];
  subtotal: number;
  tax: number;
  total: number;
  date?: string;
  paymentMethod?: string;
  notes?: string;
  invoiceId?: number;
  draft?: boolean;
}

function formatAmount(amount: number): string {
  return `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;
}

export function InvoiceDocument({
  template,
  patient,
  items,
  subtotal,
  tax,
  total,
  date = new Date().toISOString().slice(0, 10),
  paymentMethod,
  notes,
  invoiceId,
  draft = false,
}: InvoiceDocumentProps) {
  const sections = {
    patientContact: true,
    taxBreakdown: true,
    paymentMethod: true,
    notes: true,
    ...template.sections,
  };

  return (
    <div className="invoice-document-preview overflow-auto bg-slate-100 p-3 sm:p-6">
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #invoice-print-root, #invoice-print-root * { visibility: visible !important; }
          #invoice-print-root { position: fixed !important; inset: 0 auto auto 0 !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; box-shadow: none !important; }
          .invoice-document-preview { overflow: visible !important; padding: 0 !important; background: #fff !important; }
        }
      `}</style>
      <article
        id="invoice-print-root"
        className="relative mx-auto flex min-h-[297mm] w-[210mm] max-w-none flex-col bg-white p-[15mm] text-slate-900 shadow-xl print:shadow-none"
        style={{ boxSizing: "border-box" }}
      >
        {draft && (
          <div className="mb-6 border border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-amber-800">
            Draft preview · Not an issued invoice
          </div>
        )}

        <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-6">
          <div className="flex min-w-0 items-start gap-4">
            {template.logoUrl ? (
              <img src={template.logoUrl} alt="Clinic logo" className="h-16 w-20 shrink-0 object-contain" />
            ) : (
              <div className="flex h-16 w-20 shrink-0 items-center justify-center border border-slate-200 text-[10px] font-semibold uppercase text-slate-400">Logo</div>
            )}
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold">{template.clinicName || "Clinic Name"}</h1>
              {template.clinicAddress && <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-600">{template.clinicAddress}</p>}
              {template.clinicPhone && <p className="text-xs text-slate-600">Phone: {template.clinicPhone}</p>}
              {template.clinicEmail && <p className="text-xs text-slate-600">Email: {template.clinicEmail}</p>}
              {template.taxRegistration && <p className="mt-1 text-xs font-medium text-slate-700">Tax registration: {template.taxRegistration}</p>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{draft ? "Estimate" : "Invoice"}</p>
            <p className="mt-1 text-2xl font-bold">{draft ? "DRAFT" : invoiceId ? `#${invoiceId}` : "Invoice"}</p>
            <p className="mt-2 text-xs text-slate-500">Date: {date}</p>
          </div>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-8">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bill to</h2>
            <p className="mt-2 text-base font-semibold">{patient.name || "Patient name"}</p>
            {sections.patientContact && (
              <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                {patient.phone && <p>{patient.phone}</p>}
                {patient.email && <p>{patient.email}</p>}
                {patient.address && <p className="whitespace-pre-line">{patient.address}</p>}
              </div>
            )}
          </div>
          {sections.paymentMethod && paymentMethod && (
            <div className="text-right">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payment method</h2>
              <p className="mt-2 text-sm font-semibold capitalize">{paymentMethod}</p>
            </div>
          )}
        </section>

        <table className="mt-8 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-50">
              <th className="px-2 py-3 font-bold uppercase tracking-wide">Service</th>
              <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Rate</th>
              <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Qty</th>
              {sections.taxBreakdown && <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Tax</th>}
              <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? items.map((item, index) => (
              <tr key={`${item.name}-${index}`} className="border-b border-slate-200">
                <td className="px-2 py-3 font-medium">{item.name}</td>
                <td className="px-2 py-3 text-right">{formatAmount(item.price)}</td>
                <td className="px-2 py-3 text-right">{item.quantity}</td>
                {sections.taxBreakdown && <td className="px-2 py-3 text-right">{item.taxRate || 0}%</td>}
                <td className="px-2 py-3 text-right font-semibold">{formatAmount(item.price * item.quantity)}</td>
              </tr>
            )) : (
              <tr className="border-b border-slate-200">
                <td colSpan={sections.taxBreakdown ? 5 : 4} className="px-2 py-8 text-center text-slate-400">No services added</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-6 ml-auto w-64 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatAmount(subtotal)}</span></div>
          {sections.taxBreakdown && <div className="flex justify-between text-slate-600"><span>Tax</span><span>{formatAmount(tax)}</span></div>}
          <div className="flex justify-between border-t border-slate-900 pt-3 text-base font-bold"><span>Total</span><span>{formatAmount(total)}</span></div>
        </div>

        {sections.notes && notes && (
          <section className="mt-8 border-t border-slate-200 pt-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Notes</h2>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-700">{notes}</p>
          </section>
        )}

        <footer className="mt-auto border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
          {template.footerText || "Thank you for choosing us."}
        </footer>
      </article>
    </div>
  );
}