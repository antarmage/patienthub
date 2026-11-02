import { relevantObstetricExamination, type ObstetricExamination as Exam } from "./obstetricExamination";

export const obstetricAreas = [
  { id: "general", label: "General", title: "General examination", x: 150, y: 40, keys: ["pallor", "edema"], normal: { pallor: "No", edema: "No" } },
  { id: "abdominal", label: "Abdomen", title: "Abdominal examination", x: 150, y: 232, keys: ["inspection", "fundalHeight", "scarTenderness", "uterineActivity", "contractions", "contractionIntensity"], normal: { inspection: "No abnormality detected", scarTenderness: "No", uterineActivity: "Relaxed" } },
  { id: "fetal", label: "Fetal", title: "Fetal assessment", x: 150, y: 298, keys: ["lie", "presentation", "engagement", "fetalMovements", "fetalHeartSound", "fetalHeartRate"], normal: null },
  { id: "leakage", label: "Leakage", title: "Leakage / suspected membrane rupture", x: 96, y: 352, keys: ["leakageReported", "leakagePattern", "leakageOngoing", "leakageAmount", "leakageColour", "leakageOdour", "leakageFever", "leakagePain", "leakageBleeding", "ruptureAssessment", "leakageOnset", "leakageDetails"], normal: { leakageReported: "No" } },
  { id: "speculum", label: "Speculum", title: "Per speculum examination", x: 150, y: 392, keys: ["speculumPerformed", "vulva", "vagina", "cervix", "discharge", "bleeding", "pooling", "observedFluid", "speculumDetails"], normal: null },
  { id: "pv", label: "PV", title: "Per vaginal (PV) examination", x: 204, y: 352, keys: ["pvPerformed", "pvReason", "cervicalDilatation", "cervicalEffacement", "cervicalPosition", "cervicalConsistency", "station", "pelvisAdequacy", "pvPresentingPart", "pvMembranes", "caput", "moulding", "pvDetails"], normal: null },
] as const;

export type ObstetricArea = typeof obstetricAreas[number];
export type AreaId = ObstetricArea["id"];
export type AreaState = "Not recorded" | "Recorded" | "Normal" | "Abnormal" | "Not examined" | "Deferred";
export const areaStatusKey = (id: AreaId) => `${id}Status` as const;

export function obstetricAreaState(exam: Exam, area: ObstetricArea): AreaState {
  const saved = exam[areaStatusKey(area.id)];
  if (saved === "Not examined" || saved === "Deferred") return saved;
  const relevant = relevantObstetricExamination(exam);
  if (area.id === "pv" && exam.pvPerformed === "Deferred") return "Deferred";
  if ((area.id === "pv" && exam.pvPerformed === "No") || (area.id === "speculum" && exam.speculumPerformed === "No")) return "Not examined";
  if ((area.id === "general" && [exam.pallor, exam.edema].includes("Yes")) ||
    (area.id === "abdominal" && (exam.scarTenderness === "Yes" || ["Irritable", "Contractions present", "Yes"].includes(exam.uterineActivity))) ||
    (area.id === "fetal" && (exam.fetalHeartSound === "Absent" || exam.fetalMovements === "Reduced")) ||
    (area.id === "leakage" && ["Yes", "Uncertain"].includes(exam.leakageReported)) ||
    (area.id === "speculum" && [exam.vulva, exam.vagina, exam.cervix].includes("Abnormal findings"))) return "Abnormal";
  if (saved === "Abnormal") return "Abnormal";
  if (area.normal && Object.entries(area.normal).every(([key, value]) => exam[key as keyof Exam] === value)) return "Normal";
  return area.keys.some((key) => relevant[key].trim()) ? "Recorded" : "Not recorded";
}

export function setObstetricAreaState(exam: Exam, area: ObstetricArea, state: "Normal" | "Abnormal" | "Not examined"): Exam {
  if (state === "Normal" && !area.normal) throw new Error(`Normal shortcuts are not supported for ${area.label}.`);
  const result = { ...exam };
  if (state !== "Abnormal") for (const key of area.keys) result[key] = "";
  result[areaStatusKey(area.id)] = state;
  if (state === "Normal") Object.assign(result, area.normal);
  if (state === "Not examined" && area.id === "speculum") result.speculumPerformed = "No";
  if (state === "Not examined" && area.id === "pv") result.pvPerformed = "No";
  return result;
}
