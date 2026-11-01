export const obstetricChoices = [
  { key: "pallor", label: "Pallor present?", options: ["Yes", "No"], binary: true },
  { key: "edema", label: "Pedal edema present?", options: ["Yes", "No"], binary: true },
  { key: "lie", label: "Lie", options: ["Longitudinal", "Transverse", "Oblique", "Uncertain"] },
  { key: "presentation", label: "Presentation", options: ["Cephalic", "Breech", "Shoulder", "Uncertain"] },
  { key: "fetalMovements", label: "Fetal movements (patient reported)", options: ["Perceived", "Reduced", "Not perceived", "Not assessed"] },
  { key: "uterineActivity", label: "Uterine activity", options: ["Relaxed", "Irritable", "Contractions present"] },
  { key: "contractionIntensity", label: "Contraction intensity", options: ["Mild", "Moderate", "Strong"] },
  { key: "engagement", label: "Engagement", options: ["Engaged", "Not engaged", "Uncertain"] },
  { key: "fetalHeartSound", label: "Fetal heart sound", options: ["Present", "Absent", "Not assessed"] },
  { key: "scarTenderness", label: "Scar tenderness present?", options: ["Yes", "No", "Not applicable"], binary: true },
  { key: "speculumPerformed", label: "Speculum examination performed?", options: ["Yes", "No"], binary: true },
  { key: "vulva", label: "Vulva", options: ["No abnormality detected", "Abnormal findings"] },
  { key: "vagina", label: "Vagina", options: ["No abnormality detected", "Abnormal findings"] },
  { key: "cervix", label: "Cervix", options: ["No abnormality detected", "Abnormal findings", "Not visualized"] },
  { key: "discharge", label: "Discharge seen?", options: ["Yes", "No"], binary: true },
  { key: "bleeding", label: "Bleeding seen?", options: ["Yes", "No"], binary: true },
  { key: "pooling", label: "Fluid pooling seen?", options: ["Yes", "No"], binary: true },
  { key: "observedFluid", label: "Fluid seen on speculum examination", options: ["Clear", "Blood-stained", "Green / meconium-stained", "Yellow / cloudy", "Other", "Uncertain"] },
  { key: "pvPerformed", label: "Per vaginal (digital) examination performed?", options: ["Yes", "No", "Deferred"], binary: true },
  { key: "cervicalPosition", label: "PV cervical position", options: ["Posterior", "Mid-position", "Anterior"] },
  { key: "cervicalConsistency", label: "PV cervical consistency", options: ["Firm", "Medium", "Soft"] },
  { key: "pelvisAdequacy", label: "PV pelvis adequacy", options: ["Clinically adequate", "Suspected inadequate", "Uncertain", "Not assessed"] },
  { key: "pvMembranes", label: "PV membrane findings", options: ["Intact", "Bulging", "Ruptured", "Uncertain"] },
  { key: "pvPresentingPart", label: "PV presenting part", options: ["Cephalic", "Breech", "Other", "Uncertain"] },
  { key: "caput", label: "Caput", options: ["Absent", "Mild", "Moderate", "Marked", "Not assessed"] },
  { key: "moulding", label: "Moulding", options: ["Absent", "+", "++", "+++", "Not assessed"] },
  { key: "leakageReported", label: "Leakage reported by patient?", options: ["Yes", "No", "Uncertain"], binary: true },
  { key: "leakagePattern", label: "Reported leakage pattern", options: ["Sudden gush", "Continuous trickle", "Intermittent", "Other", "Uncertain"] },
  { key: "leakageOngoing", label: "Leakage still occurring (patient reported)?", options: ["Yes", "No", "Uncertain"], binary: true },
  { key: "leakageAmount", label: "Reported fluid amount", options: ["Dampness / scant", "Soaks pad / clothing", "Large gush", "Uncertain"] },
  { key: "leakageColour", label: "Reported fluid colour", options: ["Clear", "Blood-stained", "Green / brown", "Yellow / cloudy", "Other", "Uncertain"] },
  { key: "leakageOdour", label: "Reported fluid odour", options: ["No noticeable odour", "Urine-like", "Foul-smelling", "Other", "Uncertain"] },
  { key: "leakageFever", label: "Fever reported with leakage?", options: ["Yes", "No", "Uncertain"], binary: true },
  { key: "leakagePain", label: "Pain / contractions reported with leakage?", options: ["Yes", "No", "Uncertain"], binary: true },
  { key: "leakageBleeding", label: "Bleeding reported with leakage?", options: ["Yes", "No", "Uncertain"], binary: true },
  { key: "ruptureAssessment", label: "Clinician assessment of membrane rupture", options: ["Suspected", "Confirmed", "Not confirmed", "Uncertain"] },
] as const;

export const obstetricInputs = [
  { key: "inspection", label: "Abdominal inspection" },
  { key: "fundalHeight", label: "Fundal height (cm)", max: 60 },
  { key: "contractions", label: "Contractions per 10 minutes", max: 30, integer: true },
  { key: "fetalHeartRate", label: "Fetal heart rate (bpm)", max: 300, integer: true },
  { key: "speculumDetails", label: "Speculum findings / details" },
  { key: "pvReason", label: "PV indication / reason not performed or deferred" },
  { key: "cervicalDilatation", label: "PV cervical dilatation (cm)", max: 10 },
  { key: "cervicalEffacement", label: "PV cervical effacement (%)", max: 100 },
  { key: "station", label: "PV head / presenting-part station", min: -5, max: 5, integer: true },
  { key: "pvDetails", label: "PV remarks / additional findings" },
  { key: "leakageOnset", label: "Reported leakage onset (date / time or duration)" },
  { key: "leakageDetails", label: "Leakage assessment / tests performed and results" },
  { key: "details", label: "Additional antenatal findings" },
] as const;

type ExamKey = typeof obstetricChoices[number]["key"] | typeof obstetricInputs[number]["key"];
export type ObstetricExamination = Record<ExamKey, string>;

export function examinationRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function readObstetricExamination(value: unknown): ObstetricExamination {
  const source = examinationRecord(value);
  return Object.fromEntries([...obstetricChoices, ...obstetricInputs].map(({ key }) => [
    key, typeof source[key] === "string" ? source[key] : "",
  ])) as ObstetricExamination;
}

const speculumKeys = ["vulva", "vagina", "cervix", "discharge", "bleeding", "pooling", "observedFluid", "speculumDetails"] as const;
const pvKeys = ["cervicalPosition", "cervicalConsistency", "pelvisAdequacy", "pvMembranes", "pvPresentingPart", "caput", "moulding", "cervicalDilatation", "cervicalEffacement", "station", "pvDetails"] as const;
const leakageKeys = ["leakagePattern", "leakageOngoing", "leakageAmount", "leakageColour", "leakageOdour", "leakageFever", "leakagePain", "leakageBleeding", "ruptureAssessment", "leakageOnset", "leakageDetails"] as const;

export function relevantObstetricExamination(exam: ObstetricExamination): ObstetricExamination {
  const result = { ...exam };
  if (result.speculumPerformed !== "Yes") for (const key of speculumKeys) result[key] = "";
  if (result.pooling !== "Yes") result.observedFluid = "";
  if (result.pvPerformed !== "Yes") for (const key of pvKeys) result[key] = "";
  if (!result.pvPerformed) result.pvReason = "";
  if (!["Yes", "Uncertain"].includes(result.leakageReported)) for (const key of leakageKeys) result[key] = "";
  if (!["Contractions present", "Yes"].includes(result.uterineActivity)) {
    result.contractions = "";
    result.contractionIntensity = "";
  }
  if (result.fetalHeartSound !== "Present") result.fetalHeartRate = "";
  return result;
}

export function obstetricExaminationError(exam: ObstetricExamination): string | null {
  for (const field of obstetricInputs) {
    if (!("max" in field) || !exam[field.key].trim()) continue;
    const value = Number(exam[field.key]);
    const min = "min" in field ? field.min : 0;
    if (!Number.isFinite(value) || value < min || value > field.max || ("integer" in field && !Number.isInteger(value))) {
      return `${field.label}: enter ${"integer" in field ? "a whole number" : "a number"} from ${min} to ${field.max}.`;
    }
  }
  return null;
}

export function obstetricExaminationSummary(value: ObstetricExamination): string {
  const exam = relevantObstetricExamination(value);
  const lines = [...obstetricChoices, ...obstetricInputs].flatMap(({ key, label }) =>
    exam[key].trim() ? [`${label.replace(/\?$/, "")}: ${exam[key].trim()}`] : []);
  return lines.length ? `Antenatal assessment:\n${lines.join("\n")}` : "";
}

export function obstetricObjective(notes: string, exam: ObstetricExamination): string {
  return [notes.trim(), obstetricExaminationSummary(exam)].filter(Boolean).join("\n\n");
}

export function obstetricNotes(examination: unknown, objective: unknown): string {
  const record = examinationRecord(examination);
  if (typeof record.obstetricNotes === "string") return record.obstetricNotes;
  if (typeof objective === "string") return objective;
  if (typeof examination === "string") return examination;
  return typeof record.findings === "string" ? record.findings : "";
}

export function obstetricVisitExamination(examination: unknown, notes: string, exam: ObstetricExamination): Record<string, unknown> & {
  obstetric: ObstetricExamination; obstetricNotes: string; findings: string;
} {
  return {
    ...examinationRecord(examination),
    obstetric: relevantObstetricExamination(exam),
    obstetricNotes: notes,
    findings: obstetricObjective(notes, exam),
  };
}
