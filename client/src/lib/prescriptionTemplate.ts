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
  };
  pregnancyInfo: string;
  chiefComplaint: string;
  clinicalFindings: string;
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
}

function computeBMI(weight?: string, height?: string): string {
  if (!weight || !height) return '';
  const w = Number(weight);
  const h = Number(height) / 100;
  if (!w || !h) return '';
  return (w / (h * h)).toFixed(1);
}

function formatVitals(vitals: PrescriptionData['vitals'], bmi: string, pregnancyInfo: string): string {
  return [
    vitals.weight ? `Weight (Kg): ${vitals.weight}` : '',
    vitals.height ? `Height (Cm): ${vitals.height}` : '',
    bmi ? `B.M.I: ${bmi}` : '',
    vitals.bp ? `BP: ${vitals.bp} mmHg` : '',
    vitals.pulse ? `Pulse: ${vitals.pulse}` : '',
    vitals.temperature ? `Temp: ${vitals.temperature}\u00B0F` : '',
    vitals.fetalHeartRate ? `FHR: ${vitals.fetalHeartRate} bpm` : '',
    vitals.fundalHeight ? `Fundal Ht: ${vitals.fundalHeight} cm` : '',
    pregnancyInfo ? `GA: ${pregnancyInfo}` : '',
  ].filter(Boolean).join(', ');
}

function formatChiefComplaints(cc: string): string {
  if (!cc || cc === '—') return '\u2014';
  return cc.split(/[,;]/).map(c => `* ${c.trim()}`).join('\n');
}

function formatAdvice(advice: string): string {
  if (!advice) return '';
  return advice.split(/[.;]/).filter(s => s.trim()).map(s => `* ${s.trim()}`).join('\n');
}

function buildMedicationsTable(medications: PrescriptionData['medications']): string {
  if (medications.length === 0) {
    return '<p style="font-size: 12px; color: #999; font-style: italic; margin: 8px 0;">No medications prescribed</p>';
  }
  const rows = medications.map((med, i) => `
      <tr>
        <td class="med-num">${i + 1})</td>
        <td class="med-name-col">
          <div class="med-drug-name">${med.name}</div>
          ${med.notes ? `<div class="med-generic">${med.notes}</div>` : ''}
        </td>
        <td class="med-dosage">${med.frequency || '\u2014'}</td>
        <td class="med-duration">${med.dose || '\u2014'}</td>
      </tr>`).join('');

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
  if (investigations.length === 0) return '';
  return `
  <div class="inv-section">
    <div class="inv-label">Investigations Advised</div>
    <ul class="inv-list">
      ${investigations.map(t => `<li>${t}</li>`).join('')}
    </ul>
  </div>`;
}

const PRESCRIPTION_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.4; }
  @page { size: A4 portrait; margin: 15mm; }
  @media print { body { padding: 0; } .no-print { display: none !important; } }
  .page { max-width: 210mm; margin: 0 auto; padding: 24px 28px; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 2px solid #1a3a5c; margin-bottom: 10px; }
  .header-left { }
  .doctor-name { font-size: 18px; font-weight: 700; color: #1a3a5c; }
  .doctor-qual { font-size: 12px; color: #555; }
  .header-right { text-align: right; }
  .clinic-name { font-size: 17px; font-weight: 700; color: #1a3a5c; }
  .clinic-address { font-size: 11px; color: #555; max-width: 260px; line-height: 1.4; }

  .patient-section { border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 10px; }
  .patient-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
  .patient-id { font-size: 13px; font-weight: 600; }
  .date-display { font-size: 13px; font-weight: 700; text-align: right; }
  .patient-vitals { font-size: 12px; color: #444; }

  .cc-section { display: flex; border: 1px solid #bbb; margin-bottom: 10px; }
  .cc-left, .cc-right { width: 50%; padding: 8px 12px; }
  .cc-left { border-right: 1px solid #bbb; }
  .cc-title { font-size: 12px; font-weight: 700; text-decoration: underline; margin-bottom: 4px; }
  .cc-content { font-size: 12px; color: #333; white-space: pre-wrap; }

  .diagnosis-section { margin-bottom: 10px; }
  .diagnosis-label { font-size: 13px; font-weight: 700; }
  .diagnosis-text { font-size: 13px; color: #333; margin-left: 4px; }

  .rx-symbol { font-size: 22px; font-weight: 700; font-family: serif; margin: 8px 0; color: #1a1a1a; }

  .med-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .med-table th { text-align: left; font-size: 12px; font-weight: 700; border-bottom: 2px solid #333; padding: 5px 8px; }
  .med-table td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid #e0e0e0; }
  .med-num { width: 30px; font-weight: 600; }
  .med-name-col { }
  .med-drug-name { font-size: 13px; font-weight: 600; }
  .med-generic { font-size: 10px; color: #777; text-transform: uppercase; margin-top: 2px; }
  .med-dosage { width: 160px; font-size: 12px; }
  .med-duration { width: 100px; font-size: 12px; text-align: right; }

  .inv-section { margin-bottom: 12px; }
  .inv-label { font-size: 13px; font-weight: 700; text-decoration: underline; margin-bottom: 4px; }
  .inv-list { list-style: none; margin-left: 4px; }
  .inv-list li { font-size: 12px; padding: 2px 0; }
  .inv-list li::before { content: '\\2610  '; }

  .advice-section { margin-bottom: 12px; }
  .advice-label { font-size: 13px; font-weight: 700; }
  .advice-content { font-size: 12px; color: #333; margin-left: 4px; white-space: pre-wrap; line-height: 1.6; }

  .followup { font-size: 14px; font-weight: 700; margin: 14px 0; }

  .footer-line { text-align: center; font-size: 10px; color: #999; margin-top: 20px; padding-top: 8px; border-top: 1px solid #ddd; font-style: italic; }

  .signature-area { display: flex; justify-content: flex-end; margin-top: 30px; }
  .signature-box { text-align: center; }
  .sig-line { border-top: 1px solid #555; width: 180px; padding-top: 4px; font-size: 11px; color: #555; }

  .print-btn { position: fixed; bottom: 20px; right: 20px; background: #1a3a5c; color: white; border: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  .print-btn:hover { background: #0f2840; }
`;

export function generatePrescriptionHTML(data: PrescriptionData): string {
  const bmi = computeBMI(data.vitals.weight, data.vitals.height);
  const vitalsLine = formatVitals(data.vitals, bmi, data.pregnancyInfo);
  const ccFormatted = formatChiefComplaints(data.chiefComplaint);
  const todayFormatted = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Prescription - ${data.patient.name}</title>
<style>${PRESCRIPTION_STYLES}</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Print Prescription</button>
<div class="page">

  <div class="header">
    <div class="header-left">
      <div class="doctor-name">${data.providerName}</div>
      <div class="doctor-qual">${data.providerSpecialty}</div>
    </div>
    <div class="header-right">
      <div class="clinic-name">Saivie</div>
      <div class="clinic-address">Women's Health & Reproductive Care</div>
    </div>
  </div>

  <div class="patient-section">
    <div class="patient-row">
      <div class="patient-id">${data.patient.name}${data.patient.age ? ' / ' + data.patient.age + ' Y' : ''}${data.patient.phone ? '&nbsp;&nbsp;&nbsp;Mob: ' + data.patient.phone : ''}</div>
      <div class="date-display">Date: ${todayFormatted}</div>
    </div>
    ${data.patient.address ? `<div style="font-size: 12px; color: #555;">Address: ${data.patient.address}</div>` : ''}
    ${vitalsLine ? `<div class="patient-vitals">${vitalsLine}</div>` : ''}
  </div>

  <div class="cc-section">
    <div class="cc-left">
      <div class="cc-title">Chief Complaints</div>
      <div class="cc-content">${ccFormatted}</div>
    </div>
    <div class="cc-right">
      <div class="cc-title">Clinical Findings</div>
      <div class="cc-content">${data.clinicalFindings || '\u2014'}</div>
    </div>
  </div>

  ${data.diagnosis ? `
  <div class="diagnosis-section">
    <span class="diagnosis-label">Diagnosis:</span>
    <span class="diagnosis-text">* ${data.diagnosis}</span>
  </div>` : ''}

  <div class="rx-symbol">R</div>

  ${buildMedicationsTable(data.medications)}

  ${buildInvestigations(data.investigations)}

  ${data.advice ? `
  <div class="advice-section">
    <span class="advice-label">Advice:</span>
    <div class="advice-content">${formatAdvice(data.advice)}</div>
  </div>` : ''}

  ${data.nextFollowUp ? `
  <div class="followup">Follow Up: ${new Date(data.nextFollowUp).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>` : ''}

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
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
