import { z } from "zod/v4";

export const icdCodeSchema = z.string().regex(/^[A-Z]\d{2}(?:\.[A-Z0-9]{1,4})?$/, "Invalid WHO ICD-10 code");
export const diagnosisSelectionSchema = z.array(z.object({
  code: icdCodeSchema,
  primary: z.boolean(),
}).strict()).max(20).superRefine((items, ctx) => {
  if (new Set(items.map((item) => item.code)).size !== items.length) ctx.addIssue({ code: "custom", message: "Duplicate diagnosis codes" });
  if (items.length && items.filter((item) => item.primary).length !== 1) ctx.addIssue({ code: "custom", message: "Choose exactly one primary diagnosis" });
});
export interface IcdDiagnosis {
  code: string;
  title: string;
  primary: boolean;
  release: string;
  system: "WHO ICD-10";
}
export interface DiagnosisEncounter {
  id: number;
  patientId: number;
  appointmentId: number | null;
  visitId: number | null;
  diagnoses: IcdDiagnosis[];
  confirmedBy: string;
  confirmedAt: string;
}
export interface IcdCatalogEntry {
  code: string;
  title: string;
  release: string;
  leaf: boolean;
}
