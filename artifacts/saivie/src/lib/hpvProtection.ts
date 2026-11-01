export type HpvProtection = "protected" | "in-progress";

export const HPV_BADGE_COPY: Record<HpvProtection, { label: string; message: string }> = {
    protected: { label: "HPV vaccinated", message: "All doses reported or recorded. Continue cervical screening as advised." },
    "in-progress": { label: "HPV doses started", message: "Some doses reported or recorded. Ask your doctor about completing vaccination." },
};

export const hpvSurveyAnswer = (patient: any): string => {
    const value = patient?.history?.onboarding?.gyn?.hpvVaccine;
    return typeof value === "string" ? value.trim() : "";
};

// Combines reported vaccination with clinic doses; this status does not imply immunity.
export function hpvProtection(surveyAnswer?: string | null, clinicStatus?: HpvProtection | null): HpvProtection | null {
    if (surveyAnswer === "Yes, all doses" || clinicStatus === "protected") return "protected";
    if (surveyAnswer === "Yes, some doses" || clinicStatus === "in-progress") return "in-progress";
    return null;
}
