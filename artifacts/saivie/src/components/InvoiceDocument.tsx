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
  catalogItemId?: number;
  name: string;
  category?: string;
  price: number;
  quantity: number;
  taxableSubtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  catalogPriceIncludesTax?: boolean;
  discountAmount?: number;
  discountLabel?: string | null;
  lineTotal?: number;
}

interface InvoiceDocumentProps {
  template: InvoiceTemplateData;
  patient: { name?: string; phone?: string | null; email?: string | null; address?: string | null; type?: string | null; isPrimeMember?: boolean };
  items: InvoiceDocumentItem[];
  subtotal: number;
  tax: number;
  discountTotal?: number;
  discountDetails?: Array<{ catalogItemId: number; name: string; amount: number; label: string }>;
  total: number;
  date?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  invoiceId?: number;
  draft?: boolean;
}

function formatAmount(amount: number, showPaise = true): string {
  const value = amount || 0;
  const formatted = showPaise
    ? value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(value).toLocaleString("en-IN");
  return `₹${formatted}`;
}

function formatInvoiceDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function InvoiceDocument({
  template,
  patient,
  items,
  subtotal,
  tax,
  discountTotal = 0,
  discountDetails = [],
  total,
  date = new Date().toISOString().slice(0, 10),
  paymentMethod,
  paymentStatus,
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
  const lineTaxWeights = items.map((item) => {
    if (typeof item.taxableSubtotal === "number") return item.taxableSubtotal * ((item.taxRate || 0) / 100);
    const amount = item.price * item.quantity;
    if (item.catalogPriceIncludesTax && item.taxRate) return amount - amount / (1 + item.taxRate / 100);
    return amount * ((item.taxRate || 0) / 100);
  });
  const missingTaxTotal = Math.max(0, tax - items.reduce((sum, item) => sum + (typeof item.taxAmount === "number" ? item.taxAmount : 0), 0));
  const missingTaxWeight = items.reduce((sum, item, index) => sum + (typeof item.taxAmount === "number" ? 0 : lineTaxWeights[index]), 0);
  const getLineTax = (item: InvoiceDocumentItem, index: number) => {
    if (typeof item.taxAmount === "number") return item.taxAmount;
    if (missingTaxWeight > 0) return missingTaxTotal * lineTaxWeights[index] / missingTaxWeight;
    return lineTaxWeights[index];
  };
  const invoiceStatus = draft ? "Draft" : paymentStatus || "Paid";

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
        className="relative mx-auto flex min-h-[297mm] w-[210mm] max-w-none flex-col border-l-[5px] border-l-emerald-700 bg-white p-[14mm] text-slate-900 shadow-xl print:shadow-none"
        style={{ boxSizing: "border-box" }}
      >
        {draft && (
          <div className="mb-4 border border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-amber-800">
            Draft preview · Not an issued invoice
          </div>
        )}

        <header className="flex items-start justify-between gap-6 border-b-2 border-emerald-800 pb-5">
          <div className="flex min-w-0 items-center gap-4">
            {template.logoUrl ? (
              <img src={template.logoUrl} alt="Clinic logo" className="h-20 w-24 shrink-0 object-contain" />
            ) : (
              <div className="flex h-20 w-24 shrink-0 items-center justify-center border border-dashed border-slate-300 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Clinic logo</div>
            )}
            <div className="min-w-0">
              <h1 className="break-words text-xl font-extrabold uppercase">{template.clinicName || "Clinic Name"}</h1>
              {template.clinicAddress && <p className="mt-1 whitespace-pre-line text-[11px] leading-4 text-slate-600">{template.clinicAddress}</p>}
              <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-600">
                {template.clinicPhone && <span>Tel: {template.clinicPhone}</span>}
                {template.clinicEmail && <span>{template.clinicEmail}</span>}
              </div>
              {template.taxRegistration && <p className="mt-1 text-[10px] font-medium text-slate-700">Tax registration: {template.taxRegistration}</p>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">Medical Invoice</p>
            <p className="mt-1 text-3xl font-extrabold tracking-normal">{invoiceStatus}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{draft ? "Review copy" : "Patient billing"}</p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-4">
          <div className="border border-slate-300 p-3">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">Patient Information</h2>
            <p className="mt-2 text-sm font-bold">{patient.name || "Patient name"}</p>
            {sections.patientContact && (
              <div className="mt-1 space-y-0.5 text-[10px] leading-4 text-slate-600">
                {patient.phone && <p>{patient.phone}</p>}
                {patient.email && <p>{patient.email}</p>}
                {patient.address && <p className="whitespace-pre-line">{patient.address}</p>}
              </div>
            )}
          </div>
          <div className="border border-slate-300 p-3">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">Billing Information</h2>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              {patient.type && <><span className="text-slate-500">Care type</span><span className="text-right font-medium">{patient.type}</span></>}
              {patient.isPrimeMember && <><span className="text-slate-500">Membership</span><span className="text-right font-semibold text-emerald-800">Prime</span></>}
              {sections.paymentMethod && paymentMethod && <><span className="text-slate-500">Payment method</span><span className="text-right font-medium capitalize">{paymentMethod}</span></>}
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-4 border border-slate-400">
          {[
            { label: "Invoice number", value: invoiceId ? `${invoiceId}` : "Pending" },
            { label: "Date", value: formatInvoiceDate(date) },
            { label: "Status", value: invoiceStatus },
            { label: "Invoice total", value: formatAmount(total) },
          ].map((field, index) => (
            <div key={field.label} className={`min-w-0 px-3 py-2.5 ${index > 0 ? "border-l border-slate-300" : ""}`}>
              <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-800">{field.label}</p>
              <p className="mt-1 truncate text-[11px] font-bold">{field.value}</p>
            </div>
          ))}
        </section>

        <table className="mt-5 w-full border-collapse text-left text-[10px]">
          <thead>
            <tr className="bg-emerald-800 text-white">
              <th className="px-2.5 py-2.5 font-bold uppercase tracking-wider">Item / description</th>
              <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">Qty</th>
              <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">MRP</th>
              {sections.taxBreakdown && <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">GST</th>}
              <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">Discount</th>
              <th className="px-2.5 py-2.5 text-right font-bold uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? items.map((item, index) => (
              <tr key={`${item.name}-${index}`} className={`border-b border-x border-slate-300 ${index % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
                <td className="px-2.5 py-2.5">
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-0.5 text-[9px] text-slate-500">{item.category || "Clinical service"}{item.catalogPriceIncludesTax ? " · GST included in MRP" : ""}</p>
                </td>
                <td className="px-2 py-2.5 text-right">{item.quantity}</td>
                <td className="px-2 py-2.5 text-right">{formatAmount(item.price * item.quantity)}</td>
                {sections.taxBreakdown && <td className="px-2 py-2.5 text-right">{item.taxRate || 0}%<br />{formatAmount(getLineTax(item, index), true)}</td>}
                <td className="px-2 py-2.5 text-right text-emerald-800">
                  {item.discountAmount ? <><span>−{formatAmount(item.discountAmount)}</span>{item.discountLabel && <span className="mt-0.5 block text-[8px] text-slate-500">{item.discountLabel}</span>}</> : "—"}
                </td>
                <td className="px-2.5 py-2.5 text-right font-bold">{formatAmount(item.lineTotal ?? (item.price * item.quantity + (item.taxAmount || 0) - (item.discountAmount || 0)))}</td>
              </tr>
            )) : (
              <tr className="border border-slate-300">
                <td colSpan={sections.taxBreakdown ? 6 : 5} className="px-2 py-8 text-center text-slate-400">No services added</td>
              </tr>
            )}
          </tbody>
        </table>

        <section className="mt-6 grid grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)] gap-6">
          <div className="min-h-24 border border-slate-300 p-3">
            {sections.notes && notes ? (
              <>
                <h2 className="text-[9px] font-bold uppercase tracking-widest text-emerald-800">Notes</h2>
                <p className="mt-2 whitespace-pre-line text-[10px] leading-4 text-slate-700">{notes}</p>
              </>
            ) : (
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Thank you for choosing {template.clinicName || "our clinic"}.</p>
            )}
          </div>
          <div className="border border-slate-300 p-3">
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between gap-3"><span className="text-slate-600">Taxable subtotal</span><span className="font-medium">{formatAmount(subtotal)}</span></div>
              {sections.taxBreakdown && <div className="flex justify-between gap-3"><span className="text-slate-600">GST after discount</span><span className="font-medium">{formatAmount(tax)}</span></div>}
              <div className="flex justify-between gap-3 text-emerald-800"><span>Prime discounts</span><span className="font-semibold">−{formatAmount(discountTotal)}</span></div>
              {discountDetails.length > 0 && discountDetails.map((discount, index) => (
                <div key={`${discount.catalogItemId}-${index}`} className="flex justify-between gap-3 text-[8px] text-slate-500">
                  <span className="truncate">{discount.name} · {discount.label}</span>
                  <span className="shrink-0">−{formatAmount(discount.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t-2 border-emerald-800 pt-2 text-sm font-extrabold"><span>Total</span><span>{formatAmount(total)}</span></div>
            </div>
            {items.some((item) => item.catalogPriceIncludesTax) && <p className="mt-2 text-[8px] leading-3 text-slate-500">Lab Test MRP includes GST. Prime discount is applied to its pre-tax value, then GST is recalculated on the discounted value.</p>}
          </div>
        </section>

        <footer className="mt-auto flex items-end justify-between gap-4 border-t border-slate-300 pt-4 text-[9px] text-slate-500">
          <div className="max-w-[65%]">
            {template.footerText && <p className="mb-1 font-medium text-slate-700">{template.footerText}</p>}
            <p>{template.clinicEmail || template.clinicPhone ? "For billing enquiries:" : ""} {[template.clinicPhone, template.clinicEmail].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-right font-semibold uppercase tracking-wider text-emerald-900">{template.clinicName || "Saivie"}</div>
        </footer>
      </article>
    </div>
  );
}