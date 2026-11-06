import React from "react";
import { historyRecord, historyText } from "@/lib/receptionPatientHistory";

export function reportedMedicationHistory(value: unknown, visitAppointmentId?: unknown) {
  const history = historyRecord(value);
  const intake = historyRecord(history.onboarding);
  const survey = historyText(historyRecord(intake.health).medications);
  const recorded = historyText(history.drug);
  const appointmentId = Number(history.onboardingAppointmentId);
  const visitScoped = visitAppointmentId !== undefined;
  if (visitScoped && (!Number.isSafeInteger(appointmentId) || appointmentId <= 0 ||
    !["string", "number"].includes(typeof visitAppointmentId) || Number(visitAppointmentId) !== appointmentId)) return [];
  const rows: { source: string; text: string }[] = [];
  if (survey) rows.push({
    source: Number.isSafeInteger(appointmentId) && appointmentId > 0
      ? `Saved intake survey · Appointment ${appointmentId}` : "Saved intake survey",
    text: survey,
  });
  const normalized = (text: string) => text.toLowerCase().replace(/[\s,;]+/g, " ").trim();
  if (!visitScoped && recorded && normalized(recorded) !== normalized(survey)) rows.push({ source: "Recorded medication history", text: recorded });
  return rows;
}

export function ReportedMedicationHistory({ history, appointmentId }: { history: unknown; appointmentId?: unknown }) {
  const rows = reportedMedicationHistory(history, appointmentId);
  if (!rows.length) return null;
  return <section className="rounded-xl border border-saivie-border bg-saivie-ivory p-4" aria-label="Reported medication history">
    <h3 className="text-sm font-semibold text-saivie-teal">Medicines reported in survey / history</h3>
    <p className="mt-1 text-xs text-saivie-plum">These are saved history answers, not prescriptions or confirmed active medication records. Verify current use, dose and frequency with the patient.</p>
    <div className="mt-3 space-y-3">{rows.map((row) => <div key={row.source}>
      <p className="text-[11px] font-medium text-saivie-plum">{row.source}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-saivie-teal [overflow-wrap:anywhere]">{row.text}</p>
    </div>)}</div>
  </section>;
}
