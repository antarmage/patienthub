export interface PrescriptionData {
  providerName: string;
  providerSpecialty: string;
  providerQualification?: string;
  providerRegistration?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string;
  date?: string;
  draft?: boolean;
  patient: { name: string; age: string | number; phone: string; address: string; lmp?: string; sex?: string };
  vitals: {
    weight?: string; height?: string; bp?: string; pulse?: string; temperature?: string;
    fetalHeartRate?: string; fundalHeight?: string; pvExam?: string; psExam?: string;
  };
  pregnancyInfo: string;
  chiefComplaint: string;
  history?: string;
  clinicalFindings: string;
  observation: string;
  assessment: string;
  diagnosis: string;
  medications: {
    name: string; dose: string; frequency: string; duration?: string;
    instructions?: string; route?: string; notes: string;
  }[];
  investigations: string[];
  advice: string;
  nextFollowUp: string;
  nextVaccinationDate: string;
}

const escapeText = (value: string | number) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]!);

function displayDate(value?: string): string {
  if (!value) return "Not recorded";
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    : value;
}

export function prescriptionLogoSource(value?: string): string {
  if (!value) return "";
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(value)) return value;
  try {
    const url = new URL(value, window.location.href);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("Unsupported clinic logo URL.");
    return url.href;
  } catch {
    throw new Error("The clinic logo URL is invalid. Update the uploaded logo in clinic settings.");
  }
}

function medicinesTable(medications: PrescriptionData["medications"]): string {
  if (!medications.length) return '<p class="unrecorded">No medications recorded for this visit.</p>';
  return `<table class="med-table"><thead><tr><th></th><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead><tbody>${medications.map((med, index) => `<tr>
    <td>${index + 1})</td><td><strong>${escapeText(med.name)}</strong>${[med.notes, med.instructions, med.route].filter(Boolean).map((line) => `<div class="med-detail">${escapeText(line!)}</div>`).join("")}</td>
    <td class="med-dosage">${escapeText([med.dose, med.frequency].filter(Boolean).join(" / ")) || "&mdash;"}</td>
    <td class="med-duration">${escapeText(med.duration || "") || "&mdash;"}</td></tr>`).join("")}</tbody></table>`;
}

export function generatePrescriptionHTML(data: PrescriptionData, options: { printButton?: boolean } = {}): string {
  const section = (label: string, content: string, always = false) => content || always
    ? `<section class="clinical-section"><h2>${label}</h2><div class="content">${escapeText(content) || '<span class="unrecorded">Not recorded</span>'}</div></section>` : "";
  const vitals = [
    data.vitals.weight && `Wt: ${data.vitals.weight} kg`, data.vitals.height && `Ht: ${data.vitals.height} cm`,
    data.vitals.bp && `BP: ${data.vitals.bp} mmHg`, data.vitals.pulse && `Pulse: ${data.vitals.pulse} bpm`,
    data.vitals.temperature && `Temp: ${data.vitals.temperature} °F`,
  ].filter(Boolean).map((value) => `<span>${escapeText(value!)}</span>`).join("");
  const findings = [...new Set([
    data.clinicalFindings, data.observation,
    data.vitals.fundalHeight && `Fundal height: ${data.vitals.fundalHeight} cm`,
    data.vitals.fetalHeartRate && `Fetal heart rate: ${data.vitals.fetalHeartRate} bpm`,
    data.vitals.pvExam && `P/V: ${data.vitals.pvExam}`, data.vitals.psExam && `P/S: ${data.vitals.psExam}`,
  ].filter(Boolean))].join("\n");
  const logo = prescriptionLogoSource(data.logoUrl);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Prescription - ${escapeText(data.patient.name)}</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f1f3f0;color:#252525;font:12px/1.5 Arial,sans-serif}
    @page{size:A4 portrait;margin:12mm}
    .page{width:186mm;min-height:273mm;margin:20px auto;padding:0;background:#fff;display:flex;flex-direction:column}
    .letterhead{display:grid;grid-template-columns:1fr 110px 1fr;align-items:center;gap:12px;padding:16px 0;border-bottom:1px solid #9aafa8}
    .doctor-name{font-size:14px;font-weight:700}.doctor-details{font-size:10px;white-space:pre-line}.logo{text-align:center}.logo img{width:90px;height:78px;object-fit:contain}.logo-name{font-size:20px;letter-spacing:2px;color:#305b50}
    .date{text-align:right}.patient{padding:12px 0;border-bottom:1px solid #9aafa8}.patient-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px}.patient-meta{margin-top:4px;font-size:11px}.vitals{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:11px}
    .columns{display:table;width:100%;table-layout:fixed;flex:1}.left,.right{display:table-cell;vertical-align:top;padding:16px 14px}.left{width:38%;padding-left:0;border-right:1px solid #9aafa8}.right{width:62%;padding-right:0}
    h2{font-size:12px;margin:0 0 6px;font-weight:700}.clinical-section{margin-bottom:22px}.content{white-space:pre-wrap;overflow-wrap:anywhere}.unrecorded{color:#777;font-size:11px}.rx{font:28px Georgia,serif;margin-bottom:10px}
    .med-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:22px}.med-table th{text-align:left;font-size:10px;border-bottom:1px solid #9aafa8}.med-table td{padding:8px 3px;vertical-align:top;border-bottom:1px solid #ddd;overflow-wrap:anywhere;font-size:11px}.med-table th:first-child{width:7%}.med-table th:nth-child(2){width:43%}.med-table th:nth-child(3){width:30%}.med-table th:last-child{width:20%}.med-detail{font-size:10px;margin-top:3px}
    .investigations{margin:0;padding-left:16px}.investigations li{margin-bottom:6px;overflow-wrap:anywhere}
    .signature{margin:36px 0 12px;text-align:right;break-inside:avoid}.signature-line{display:inline-block;border-top:1px solid #777;padding-top:5px;min-width:160px;font-size:11px}
    footer{border-top:1px solid #9aafa8;text-align:center;padding:10px 0;font-size:10px;white-space:pre-line}
    .draft{padding:8px;background:#fff4dc;border:1px solid #b99853;margin-top:12px;font-weight:bold}
    .no-print{display:block}.print-button{display:block;margin:12px auto;padding:10px 20px;background:#305b50;color:white;border:0;border-radius:6px;cursor:pointer}
    tr{break-inside:avoid}h2{break-after:avoid}
    @media print{body{background:white}.page{margin:0;min-height:273mm;width:100%}.no-print{display:none!important}}
  </style></head><body>${options.printButton !== false && !data.draft ? '<button class="print-button no-print" onclick="window.print()">Print prescription</button>' : ""}<main class="page">
  <header class="letterhead"><div><div class="doctor-name">${escapeText(data.providerName)}</div><div class="doctor-details">${escapeText([data.providerQualification, data.providerSpecialty, data.providerRegistration && `Reg. No.: ${data.providerRegistration}`].filter(Boolean).join("\n"))}</div></div>
  <div class="logo">${logo ? `<img src="${escapeText(logo)}" alt="Saivie">` : '<div class="logo-name">SAIVIE</div><div class="doctor-details">Complete women care</div>'}</div><div class="date"><strong>Date:</strong> ${escapeText(displayDate(data.date))}</div></header>
  ${data.draft ? '<div class="draft">DRAFT — unsaved consultation content. Review and save before issuing.</div>' : ""}
  <div class="patient"><div class="patient-row"><strong>Name: ${escapeText(data.patient.name)}</strong><span>Age: ${escapeText(data.patient.age || "Not recorded")}${data.patient.sex ? ` &nbsp; Sex: ${escapeText(data.patient.sex)}` : ""}</span></div>
  ${data.patient.phone || data.patient.address ? `<div class="patient-meta">${escapeText([data.patient.phone && `Phone: ${data.patient.phone}`, data.patient.address].filter(Boolean).join(" · "))}</div>` : ""}
  ${vitals ? `<div class="vitals">${vitals}</div>` : ""}</div>
  <div class="columns"><div class="left">${section("Chief complaint", data.chiefComplaint, true)}
  ${section("History", data.history || "")}
  ${section("Pregnancy details", [data.patient.lmp && `LMP: ${displayDate(data.patient.lmp)}`, data.pregnancyInfo].filter(Boolean).join("\n"))}
  <section class="clinical-section"><h2>Investigation</h2>${data.investigations.length ? `<ul class="investigations">${data.investigations.map((test) => `<li>${escapeText(test)}</li>`).join("")}</ul>` : '<p class="unrecorded">Not recorded</p>'}</section>
  ${section("O/E", findings, true)}${section("Assessment", data.assessment)}${section("Diagnosis", data.diagnosis)}</div>
  <div class="right"><div class="rx">Rx</div>${medicinesTable(data.medications)}${section("Advice", data.advice)}
  ${data.nextFollowUp ? section("Follow-up", displayDate(data.nextFollowUp)) : ""}${data.nextVaccinationDate ? section("Next vaccination", displayDate(data.nextVaccinationDate)) : ""}
  <div class="signature"><div class="signature-line">${escapeText(data.providerName)}<br>Signature</div></div></div></div>
  <footer>${escapeText([data.clinicName, data.clinicAddress, data.clinicPhone && `For appointments: ${data.clinicPhone}`].filter(Boolean).join("\n"))}</footer></main></body></html>`;
}

export function openPrescription(data: PrescriptionData): boolean {
  const blobUrl = URL.createObjectURL(new Blob([generatePrescriptionHTML(data)], { type: "text/html" }));
  const win = window.open(blobUrl, "_blank");
  if (!win) { URL.revokeObjectURL(blobUrl); return false; }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  return true;
}
