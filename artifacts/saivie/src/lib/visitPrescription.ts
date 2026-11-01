import { examinationRecord } from "./obstetricExamination";
import { pregnancyWeeks } from "./prescriptionTests";
import { consultationHistoryText } from "./consultationSurvey";
import type { PrescriptionData } from "./prescriptionTemplate";

const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "";

export function visitPrescription(patient: Record<string, unknown>, visit: Record<string, unknown>, provider: Record<string, unknown>): PrescriptionData {
  const vitals = examinationRecord(visit.vitals);
  const examination = examinationRecord(visit.examination);
  const prescriptions = examinationRecord(visit.prescriptions);
  const rawMedicines = Array.isArray(visit.prescriptions) ? visit.prescriptions : Array.isArray(prescriptions.medicines) ? prescriptions.medicines : [];
  const lmp = text(vitals.lmp || patient.lmp);
  const date = text(visit.date);
  const weeks = pregnancyWeeks(text(vitals.pog), lmp, date);
  const rawTests = Array.isArray(visit.labsOrdered) ? visit.labsOrdered : [];
  const age = text(patient.age);
  return {
    providerName: text(provider.name), providerSpecialty: text(provider.specialty),
    providerQualification: [text(provider.qualification), text(provider.additionalQualifications)].filter(Boolean).join(" | "),
    providerRegistration: [text(provider.regNumber), text(provider.regCouncil)].filter(Boolean).join(" / "),
    clinicName: text(provider.clinicName), clinicAddress: text(provider.clinicAddress), clinicPhone: text(provider.clinicPhone),
    date,
    patient: { name: text(patient.name), age, phone: text(patient.phone), address: text(patient.address), sex: text(patient.sex || patient.gender), lmp },
    vitals: { weight: text(vitals.weight), height: text(vitals.height), bp: text(vitals.bp), pulse: text(vitals.pulse), temperature: text(vitals.temp || vitals.temperature) },
    pregnancyInfo: text(vitals.pog) ? `POG: ${text(vitals.pog)}` : weeks !== null && /pregnan|antenatal|obs/i.test(text(patient.type))
      ? `Gestation at visit (LMP estimate): ${Math.floor(weeks)}w ${Math.round((weeks % 1) * 7)}d` : "",
    chiefComplaint: text(visit.subjective || visit.chiefComplaint),
    history: consultationHistoryText(examination.consultationHistory),
    clinicalFindings: text(visit.objective || examination.findings || (typeof visit.examination === "string" ? visit.examination : "")),
    observation: "", assessment: text(visit.assessment), diagnosis: text(visit.diagnosis),
    medications: rawMedicines.map((raw: unknown) => {
      const medicine = typeof raw === "string" ? { name: raw } : examinationRecord(raw);
      return { name: text(medicine.name), dose: text(medicine.dose), frequency: text(medicine.frequency), duration: text(medicine.duration), instructions: text(medicine.instructions), route: text(medicine.route), notes: text(medicine.notes) };
    }).filter((medicine) => medicine.name),
    investigations: rawTests.map((raw: unknown) => text(typeof raw === "string" ? raw : examinationRecord(raw).name)).filter(Boolean),
    advice: [text(visit.planNotes), text(visit.followUpPlan)].filter(Boolean).join("\n"),
    nextFollowUp: text(vitals.followUpDate), nextVaccinationDate: text(vitals.nextImmunisationDate),
  };
}
