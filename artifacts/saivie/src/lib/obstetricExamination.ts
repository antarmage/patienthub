export const obstetricChoices = [
  { key: "pallor", label: "Pallor present?", options: ["Yes", "No"], binary: true },
  { key: "edema", label: "Pedal edema present?", options: ["Yes", "No"], binary: true },
  { key: "lie", label: "Lie", options: ["Longitudinal", "Transverse", "Oblique", "Uncertain"] },
  { key: "presentation", label: "Presentation", options: ["Cephalic", "Breech", "Shoulder", "Uncertain"] },
  { key: "fetalMovements", label: "Fetal movements (patient reported)", options: ["Perceived", "Reduced", "Not perceived", "Not assessed"] },
  { key: "uterineActivity", label: "Uterine activity present?", options: ["Yes", "No"], binary: true },
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
] as const;

export const obstetricInputs = [
  { key: "inspection", label: "Abdominal inspection" },
  { key: "fundalHeight", label: "Fundal height (cm)", max: 60 },
  { key: "contractions", label: "Contractions per 10 minutes", max: 30, integer: true },
  { key: "fetalHeartRate", label: "Fetal heart rate (bpm)", max: 300, integer: true },
  { key: "speculumDetails", label: "Speculum findings / details" },
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

const speculumKeys = ["vulva", "vagina", "cervix", "discharge", "bleeding", "pooling", "speculumDetails"] as const;

export function relevantObstetricExamination(exam: ObstetricExamination): ObstetricExamination {
  const result = { ...exam };
  if (result.speculumPerformed !== "Yes") for (const key of speculumKeys) result[key] = "";
  if (result.uterineActivity !== "Yes") {
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
    if (!Number.isFinite(value) || value < 0 || value > field.max || ("integer" in field && !Number.isInteger(value))) {
      return `${field.label}: enter ${"integer" in field ? "a whole number" : "a number"} from 0 to ${field.max}.`;
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
