export type SurveyKind = "consultation" | "lab";

const LAB_PATTERN = /\b(lab|labs|laboratory|blood\s*(test|work|draw|sample)|pathology|sample\s*collection|phlebotomy)\b/i;

type AppointmentLike = { surveyType?: string | null; type?: string | null; visitType?: string | null; reason?: string | null };

// Staff override wins; otherwise lab-only bookings get the short lab survey.
export function surveyKindFor(appointment: AppointmentLike): SurveyKind {
  if (appointment.surveyType === "lab" || appointment.surveyType === "consultation") return appointment.surveyType;
  return [appointment.type, appointment.visitType].some((value) => LAB_PATTERN.test(String(value || ""))) ? "lab" : "consultation";
}

const FIELDS = ["tests", "lastMeal", "lastPeriod", "medicines", "bloodDrawConcerns", "recentIllness", "allergies", "notes"] as const;
const LAB_PERIOD_SKIP = ["Not applicable (menopause / pregnant)", "Don't remember"];
export type LabSurveyAnswers = Partial<Record<(typeof FIELDS)[number], string | string[]>>;

const clean = (value: unknown, max = 500): string | string[] | null => {
  if (typeof value === "string") return value.trim().slice(0, max) || null;
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 120)).filter(Boolean).slice(0, 20);
    return items.length ? items : null;
  }
  return null;
};

export function sanitizeLabSurvey(input: unknown): LabSurveyAnswers {
  const source = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const result: LabSurveyAnswers = {};
  for (const field of FIELDS) {
    const value = clean(source[field], field === "notes" || field === "tests" ? 2000 : 500);
    if (value) result[field] = value;
  }
  if (typeof result.lastPeriod === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(result.lastPeriod) && !LAB_PERIOD_SKIP.includes(result.lastPeriod)) delete result.lastPeriod;
  return result;
}

export const LAB_PRESCRIPTION_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const LAB_PRESCRIPTION_MAX_BYTES = 8 * 1024 * 1024;

// Returns raw base64 for an accepted prescription upload, or an error message.
export function readLabPrescription(input: unknown): { base64: string; mimeType: string; fileName: string } | { error: string } | null {
  if (!input || typeof input !== "object") return null;
  const { fileData, mimeType, fileName } = input as Record<string, unknown>;
  if (typeof fileData !== "string" || !fileData) return null;
  const type = String(mimeType || "");
  if (!LAB_PRESCRIPTION_TYPES.includes(type)) return { error: "Prescription must be a photo (JPG, PNG, WebP) or PDF" };
  const base64 = fileData.replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { error: "Prescription file is not valid" };
  if (Math.floor((base64.length * 3) / 4) > LAB_PRESCRIPTION_MAX_BYTES) return { error: "Prescription file must be under 8 MB" };
  const name = String(fileName || "lab-prescription").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "lab-prescription";
  return { base64, mimeType: type, fileName: name };
}
