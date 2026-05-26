export interface PrescriptionData {
  providerName: string;
  providerSpecialty: string;
  patient: {
    name: string;
    age: string | number;
    phone: string;
    address: string;
    lmp?: string;
  };
  vitals: {
    weight?: string;
    height?: string;
    bp?: string;
    pulse?: string;
    temperature?: string;
    fetalHeartRate?: string;
    fundalHeight?: string;
    pvExam?: string;
    psExam?: string;
  };
  pregnancyInfo: string;
  chiefComplaint: string;
  clinicalFindings: string;
  observation: string;
  assessment: string;
  diagnosis: string;
  medications: {
    name: string;
    dose: string;
    frequency: string;
    notes: string;
  }[];
  investigations: string[];
  advice: string;
  nextFollowUp: string;
  nextVaccinationDate: string;
}

function computeBMI(weight?: string, height?: string): string {
  if (!weight || !height) return "";
  const w = Number(weight);
  const h = Number(height) / 100;
  if (!w || !h) return "";
  return (w / (h * h)).toFixed(1);
}

function formatVitals(
  vitals: PrescriptionData["vitals"],
  bmi: string,
  pregnancyInfo: string,
): string {
  const items = [
    vitals.weight ? `<span class="vital-item"><span class="vital-label">Weight:</span> <span class="vital-value">${vitals.weight} Kg</span></span>` : "",
    vitals.height ? `<span class="vital-item"><span class="vital-label">Height:</span> <span class="vital-value">${vitals.height} Cm</span></span>` : "",
    bmi ? `<span class="vital-item"><span class="vital-label">B.M.I:</span> <span class="vital-value">${bmi}</span></span>` : "",
    vitals.bp ? `<span class="vital-item"><span class="vital-label">BP:</span> <span class="vital-value">${vitals.bp} mmHg</span></span>` : "",
    vitals.pulse ? `<span class="vital-item"><span class="vital-label">Pulse:</span> <span class="vital-value">${vitals.pulse}</span></span>` : "",
    vitals.temperature ? `<span class="vital-item"><span class="vital-label">Temp:</span> <span class="vital-value">${vitals.temperature}\u00B0F</span></span>` : "",
  ].filter(Boolean);
  if (items.length === 0) return "";
  return `<div class="vitals-grid">${items.join("")}</div>`;
}

function formatChiefComplaints(cc: string): string {
  if (!cc || cc === "—") return "\u2014";
  return cc
    .split(/[,;]/)
    .map((c) => `* ${c.trim()}`)
    .join("\n");
}

function formatAdvice(advice: string): string {
  if (!advice) return "";
  return advice
    .split(/[.;]/)
    .filter((s) => s.trim())
    .map((s) => `* ${s.trim()}`)
    .join("\n");
}

function buildMedicationsTable(
  medications: PrescriptionData["medications"],
): string {
  if (medications.length === 0) {
    return '<p style="font-size: 12px; color: #999; font-style: italic; margin: 8px 0;">No medications prescribed</p>';
  }
  const rows = medications
    .map(
      (med, i) => `
      <tr>
        <td class="med-num">${i + 1})</td>
        <td class="med-name-col">
          <div class="med-drug-name">${med.name}</div>
          ${med.notes ? `<div class="med-generic">${med.notes}</div>` : ""}
        </td>
        <td class="med-dosage">${med.frequency || "\u2014"}</td>
        <td class="med-duration">${med.dose || "\u2014"}</td>
      </tr>`,
    )
    .join("");

  return `
  <table class="med-table">
    <thead>
      <tr>
        <th class="med-num"></th>
        <th>Medicine Name</th>
        <th class="med-dosage">Dosage</th>
        <th class="med-duration" style="text-align:right">Duration</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildInvestigations(investigations: string[]): string {
  if (investigations.length === 0) return "";
  return `
  <div class="inv-section">
    <div class="inv-label">Investigations Advised</div>
    <ul class="inv-list">
      ${investigations.map((t) => `<li>${t}</li>`).join("")}
    </ul>
  </div>`;
}

const PRESCRIPTION_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.4; }
  @page { size: A4 portrait; margin: 10mm 15mm 15mm 15mm; }
  @media print { body { padding: 0; } .no-print { display: none !important; } .letterhead-spacer { display: block !important; height: 29mm; } }
  .page { max-width: 210mm; margin: 0 auto; padding: 0 20px 20px 20px; }

  /* Pre-printed letterhead spacer: 2.9cm header with logo area (3x2.5cm centered) */
  .letterhead-spacer { height: 29mm; position: relative; margin-bottom: 6px; }
  .letterhead-preview { height: 29mm; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; position: relative; background: #fafafa; margin-bottom: 6px; }
  .letterhead-preview .logo-placeholder { width: 30mm; height: 25mm; border: 1px dashed #aaa; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; text-align: center; }
  .letterhead-preview .left-text, .letterhead-preview .right-text { position: absolute; top: 4px; font-size: 9px; color: #bbb; }
  .letterhead-preview .left-text { left: 8px; }
  .letterhead-preview .right-text { right: 8px; text-align: right; }
  @media print { .letterhead-preview { display: none; } }

  .header-line { border-bottom: 1.5px solid #1a3a5c; margin-bottom: 8px; }

  .patient-section { border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 8px; }
  .patient-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
  .patient-id { font-size: 13px; font-weight: 600; }
  .date-display { font-size: 13px; font-weight: 700; text-align: right; }
  .patient-vitals { font-size: 11px; color: #444; margin-top: 4px; }
  .vitals-grid { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 3px; }
  .vital-item { font-size: 11px; color: #333; }
  .vital-label { font-weight: 700; color: #555; }
  .vital-value { font-weight: 600; }

  .cc-section { display: flex; border: 1px solid #bbb; margin-bottom: 8px; }
  .cc-left, .cc-right { width: 50%; padding: 6px 10px; }
  .cc-left { border-right: 1px solid #bbb; }
  .cc-title { font-size: 11px; font-weight: 700; text-decoration: underline; margin-bottom: 3px; }
  .cc-content { font-size: 11px; color: #333; white-space: pre-wrap; }

  .diagnosis-section { margin-bottom: 8px; }
  .obs-assess-section { display: flex; gap: 12px; margin-bottom: 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
  .obs-assess-section > div { flex: 1; }
  .obs-assess-label { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .obs-assess-content { font-size: 12px; color: #333; white-space: pre-wrap; line-height: 1.4; }

  .diagnosis-label { font-size: 13px; font-weight: 700; }
  .diagnosis-text { font-size: 13px; color: #333; margin-left: 4px; }

  .rx-symbol { font-size: 22px; font-weight: 700; font-family: serif; margin: 6px 0; color: #1a1a1a; }

  .med-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .med-table th { text-align: left; font-size: 11px; font-weight: 700; border-bottom: 2px solid #333; padding: 4px 6px; }
  .med-table td { padding: 5px 6px; vertical-align: top; border-bottom: 1px solid #e0e0e0; }
  .med-num { width: 28px; font-weight: 600; }
  .med-name-col { }
  .med-drug-name { font-size: 12px; font-weight: 600; }
  .med-generic { font-size: 9px; color: #777; text-transform: uppercase; margin-top: 1px; }
  .med-dosage { width: 150px; font-size: 11px; }
  .med-duration { width: 90px; font-size: 11px; text-align: right; }

  .inv-section { margin-bottom: 10px; }
  .inv-label { font-size: 12px; font-weight: 700; text-decoration: underline; margin-bottom: 3px; }
  .inv-list { list-style: none; margin-left: 4px; }
  .inv-list li { font-size: 11px; padding: 2px 0; }
  .inv-list li::before { content: '\\2610  '; }

  .advice-section { margin-bottom: 10px; }
  .advice-label { font-size: 13px; font-weight: 700; }
  .advice-content { font-size: 11px; color: #333; margin-left: 4px; white-space: pre-wrap; line-height: 1.5; }

  .followup { font-size: 13px; font-weight: 700; margin: 10px 0; }
  .vaccination-date { font-size: 12px; font-weight: 600; color: #2563eb; margin: 4px 0; }

  .footer-line { text-align: center; font-size: 9px; color: #999; margin-top: 16px; padding-top: 6px; border-top: 1px solid #ddd; font-style: italic; }

  .signature-area { display: flex; justify-content: flex-end; margin-top: 24px; }
  .signature-box { text-align: center; }
  .sig-line { border-top: 1px solid #555; width: 180px; padding-top: 4px; font-size: 11px; color: #555; }

  .print-btn { position: fixed; bottom: 20px; right: 20px; background: #1a3a5c; color: white; border: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100; }
  .print-btn:hover { background: #0f2840; }
`;

export function generatePrescriptionHTML(data: PrescriptionData): string {
  const bmi = computeBMI(data.vitals.weight, data.vitals.height);
  const vitalsLine = formatVitals(data.vitals, bmi, data.pregnancyInfo);
  const ccFormatted = formatChiefComplaints(data.chiefComplaint);
  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const clinicalItems = [
    data.clinicalFindings || "",
    data.vitals.fundalHeight ? `Fundal Height: ${data.vitals.fundalHeight}` : "",
    data.vitals.fetalHeartRate ? `Fetal Heart Rate: ${data.vitals.fetalHeartRate}` : "",
    data.pregnancyInfo ? `GA: ${data.pregnancyInfo}` : "",
    data.vitals.pvExam ? `P/V: ${data.vitals.pvExam}` : "",
    data.vitals.psExam ? `P/S: ${data.vitals.psExam}` : "",
  ].filter(Boolean);
  const clinicalFindingsContent = clinicalItems.length > 0 ? clinicalItems.join("\n") : "\u2014";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Prescription - ${data.patient.name}</title>
<style>${PRESCRIPTION_STYLES}</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Print Prescription</button>
<div class="page">

  <!-- Letterhead area: 2.9cm height reserved for pre-printed header -->
  <!-- On screen: shows a preview outline; on print: blank space for letterhead -->
  <div class="letterhead-preview no-print">
    <div class="left-text">${data.providerName}<br>${data.providerSpecialty}</div>
    <div class="logo-placeholder">Logo<br>3 x 2.5 cm</div>
    <div class="right-text">Saivie<br>Women's Health</div>
  </div>
  <div class="letterhead-spacer" style="display:none;"></div>
  <div class="header-line"></div>

  <div class="patient-section">
    <div class="patient-row">
      <div class="patient-id">${data.patient.name}${data.patient.age ? " / " + data.patient.age + " Y" : ""}${data.patient.phone ? "&nbsp;&nbsp;&nbsp;Mob: " + data.patient.phone : ""}</div>
      <div class="date-display">Date: ${todayFormatted}</div>
    </div>
    ${data.patient.address ? `<div style="font-size: 12px; color: #555;">Address: ${data.patient.address}</div>` : ""}
    ${vitalsLine ? `<div class="patient-vitals">${vitalsLine}</div>` : ""}
  </div>

  <div class="cc-section">
    <div class="cc-left">
      <div class="cc-title">Chief Complaints</div>
      <div class="cc-content">${ccFormatted}</div>
    </div>
    <div class="cc-right">
      <div class="cc-title">Clinical Findings</div>
      <div class="cc-content">${clinicalFindingsContent}</div>
    </div>
  </div>

  ${
    (data.observation || data.assessment)
      ? `
  <div class="obs-assess-section">
    ${data.observation ? `<div><div class="obs-assess-label">Observation</div><div class="obs-assess-content">${data.observation}</div></div>` : ""}
    ${data.assessment ? `<div><div class="obs-assess-label">Assessment</div><div class="obs-assess-content">${data.assessment}</div></div>` : ""}
  </div>`
      : ""
  }

  ${
    data.diagnosis
      ? `
  <div class="diagnosis-section">
    <span class="diagnosis-label">Diagnosis:</span>
    <span class="diagnosis-text">* ${data.diagnosis}</span>
  </div>`
      : ""
  }

  <div class="rx-symbol">Rx</div>

  ${buildMedicationsTable(data.medications)}

  ${buildInvestigations(data.investigations)}

  ${
    data.advice
      ? `
  <div class="advice-section">
    <span class="advice-label">Advice:</span>
    <div class="advice-content">${formatAdvice(data.advice)}</div>
  </div>`
      : ""
  }

  ${
    data.nextFollowUp
      ? `
  <div class="followup">Follow Up: ${new Date(data.nextFollowUp).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>`
      : ""
  }

  ${
    data.nextVaccinationDate
      ? `
  <div class="vaccination-date">Next Vaccination: ${new Date(data.nextVaccinationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>`
      : ""
  }

  <div class="signature-area">
    <div class="signature-box">
      <div class="sig-line">${data.providerName}</div>
    </div>
  </div>

  <div class="footer-line">Substitute with equivalent Generics as required.</div>
</div>
</body></html>`;
}

export function openPrescription(data: PrescriptionData): void {
  const html = generatePrescriptionHTML(data);
  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, "_blank");
  if (!win) return;
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
