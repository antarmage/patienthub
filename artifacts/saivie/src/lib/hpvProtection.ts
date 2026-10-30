export type HpvProtection = "protected" | "in-progress";

export const HPV_BADGE_COPY: Record<HpvProtection, { label: string; message: string }> = {
    protected: { label: "HPV vaccinated", message: "I have protected myself from cervical cancer" },
    "in-progress": { label: "HPV in progress", message: "I'm on my way to protecting myself from cervical cancer" },
};

export const hpvSurveyAnswer = (patient: any): string => {
    const value = patient?.history?.onboarding?.gyn?.hpvVaccine;
    return typeof value === "string" ? value.trim() : "";
};

// Combines the patient's survey answer with clinic-recorded doses; either source can confirm protection.
export function hpvProtection(surveyAnswer?: string | null, clinicStatus?: HpvProtection | null): HpvProtection | null {
    if (surveyAnswer === "Yes, all doses" || clinicStatus === "protected") return "protected";
    if (surveyAnswer === "Yes, some doses" || clinicStatus === "in-progress") return "in-progress";
    return null;
}
