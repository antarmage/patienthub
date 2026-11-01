export type ClinicalCareMode = "natural_conception" | "induction" | "iui" | "ivf" | "pregnancy" | "postpartum" | "hormone_care" | "general";

export function clinicalCareMode(patient: { type?: unknown; mode?: unknown; pregnancyStatus?: unknown }): ClinicalCareMode {
    const type = typeof patient.type === "string" ? patient.type.toLowerCase() : "";
    const mode = typeof patient.mode === "string" ? patient.mode.toLowerCase() : "";
    const status = typeof patient.pregnancyStatus === "string" ? patient.pregnancyStatus.toLowerCase() : "";
    if (/\b(mtp|postpartum|postnatal)\b/.test(type)) return /mtp/.test(type) ? "general" : "postpartum";
    if (/\b(pregnant|pregnancy|antenatal|obstetric|obs)\b/.test(type) || status === "pregnant") return "pregnancy";
    if (/\bivf\b/.test(type)) return "ivf";
    if (/\biui\b/.test(type)) return "iui";
    if (/ovulation.induction/.test(type)) return "induction";
    if (/\b(fertility|infertility|ttc)\b|trying.to.conceive/.test(type)) return "natural_conception";
    if (/pcos|irregular|cycle|hormon/.test(type)) return "hormone_care";
    if (type.trim() && !/general|consultation|follow.?up/.test(type)) return "general";
    if (/pregnancy|pregnant|antenatal/.test(mode)) return "pregnancy";
    if (mode === "ivf" || mode === "iui" || mode === "induction") return mode;
    if (mode === "postpartum") return "postpartum";
    if (/ttc|trying.to.conceive|natural_conception|fertility/.test(mode)) return "natural_conception";
    if (/hormone|cycle/.test(mode)) return "hormone_care";
    return "general";
}
