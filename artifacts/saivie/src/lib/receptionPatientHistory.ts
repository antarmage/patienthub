export type HistoryRecord = Record<string, unknown>;

export function historyRecord(value: unknown): HistoryRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as HistoryRecord : {};
}

export function historyText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(historyText).filter(Boolean).join(", ");
  return "";
}

export function hasHistoryValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasHistoryValue);
  if (value && typeof value === "object") return Object.values(value).some(hasHistoryValue);
  return historyText(value) !== "";
}

function metricText(value: unknown): string {
  return historyText(value) || (hasHistoryValue(value) ? "Recorded - see details" : "");
}

export function receptionPatientHistory(patient: HistoryRecord) {
  const history = historyRecord(patient.history);
  const intake = historyRecord(history.onboarding);
  const cycle = historyRecord(intake.cycle);
  const health = historyRecord(intake.health);
  const gyn = historyRecord(intake.gyn);
  const pregnancy = historyRecord(intake.pregnancies);
  const pain = historyRecord(intake.pain);
  const lifestyle = historyRecord(intake.lifestyle);
  const sections = [
    { id: "reason", title: "Reason for visit", fields: {
      "Concerns reported at onboarding": intake.concerns,
      "Chief complaint": intake.chiefComplaint,
      "Pain location": pain.location,
      "Duration": pain.duration,
      "Related symptoms": pain.related,
    } },
    { id: "cycle", title: "Menstrual cycle", fields: {
      "Last period reported at onboarding": cycle.lastPeriod,
      "Clinician-recorded LMP": patient.lmp,
      "Regularity": cycle.regularity,
      "Recorded cycle length (days)": patient.cycleLength ?? cycle.cycleLength,
      "Flow": cycle.flow,
      "Symptoms": cycle.symptoms,
      "Age at first period": cycle.menarcheAge,
      "Days late": cycle.lateBy,
      "Pregnancy test": cycle.pregnancyTest,
      "Notes": cycle.details,
    } },
    { id: "medical", title: "Medical & family history", fields: {
      "Conditions": history.medical ?? health.conditions,
      "Allergies": history.allergies ?? health.allergies,
      "Family history": history.family ?? health.familyHistory,
      "Past surgery": history.surgical ?? health.surgeries,
      "Recorded medications": history.drug ?? health.medications,
      "Medical details": health.medicalDetails,
    } },
    { id: "gyn", title: "Gynecological history", fields: {
      "Sexually active": gyn.sexuallyActive,
      "Age at first encounter": gyn.firstEncounterAge,
      "Partners": gyn.partnerCount,
      "Last Pap smear": gyn.lastPap,
      "HPV vaccine": gyn.hpvVaccine,
      "Contraception": patient.contraception ?? gyn.birthControl,
      "Concerns": gyn.concerns,
      "Notes": gyn.details,
    } },
    { id: "pregnancy", title: "Pregnancies", fields: {
      "Pregnancy status": patient.pregnancyStatus ?? pregnancy.currentStatus,
      "Total pregnancies": pregnancy.total,
      "Vaginal births": pregnancy.vaginal,
      "C-sections": pregnancy.cesarean,
      "Miscarriages": pregnancy.miscarriages,
      "Terminations": pregnancy.terminations,
      "Premature births": pregnancy.premature,
      "Recorded due date": pregnancy.dueDate,
      "Notes": pregnancy.details,
      "Obstetric record": history.obstetric,
    } },
    { id: "lifestyle", title: "Lifestyle & screening", fields: {
      "Smoking": lifestyle.smoking,
      "Alcohol": lifestyle.alcohol,
      "Exercise": lifestyle.exercise,
      "Relationship": lifestyle.relationship,
      "Last mammogram": lifestyle.mammogram,
      "Last colonoscopy": lifestyle.colonoscopy,
      "Other": lifestyle.other,
    } },
  ];
  return {
    sections,
    metrics: [
      { label: "Last period · patient-reported", value: historyText(cycle.lastPeriod) },
      { label: "Recorded cycle length", value: historyText(patient.cycleLength ?? cycle.cycleLength), unit: "days" },
      { label: "Regularity", value: historyText(cycle.regularity) },
      { label: "Allergies", value: metricText(history.allergies ?? health.allergies) },
      { label: "Family history", value: metricText(history.family ?? health.familyHistory) },
    ],
  };
}
