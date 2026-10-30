export type SurveyKind = "consultation" | "lab";

const LAB_PATTERN = /\b(lab|labs|laboratory|blood\s*(test|work|draw|sample)|pathology|sample\s*collection|phlebotomy)\b/i;

// Keep in sync with api-server/src/survey-kind.ts: staff override wins, otherwise lab bookings get the lab survey.
export function surveyKindFor(appointment: { surveyType?: string | null; type?: string | null; visitType?: string | null } | null | undefined): SurveyKind {
    if (appointment?.surveyType === "lab" || appointment?.surveyType === "consultation") return appointment.surveyType;
    return [appointment?.type, appointment?.visitType].some((value) => LAB_PATTERN.test(String(value || ""))) ? "lab" : "consultation";
}

export const LAB_MEAL_OPTIONS = ["Less than 2 hours ago", "2–8 hours ago", "8–12 hours ago", "More than 12 hours ago"];
export const LAB_PERIOD_SKIP = ["Not applicable (menopause / pregnant)", "Don't remember"];
export const LAB_MEDICINE_OPTIONS = ["Thyroid medicine", "Biotin / hair-skin-nail supplement", "Steroids", "Hormones / birth control pills", "Blood thinner (aspirin, warfarin…)", "None"];
export const LAB_DRAW_OPTIONS = ["Bleeding disorder / I bleed easily", "I have fainted during a blood draw", "Fear of needles", "None"];
export const LAB_ILLNESS_OPTIONS = ["No", "Fever", "Cold / cough", "Diarrhoea / vomiting", "Other infection"];
export const LAB_ALLERGY_OPTIONS = ["Latex", "Antiseptic / iodine / alcohol swab", "Adhesive tape / plaster", "None"];

export type LabSurveyForm = {
    name: string;
    dob: string;
    tests: string;
    lastMeal: string;
    lastPeriod: string;
    medicines: string[];
    otherMedicine: string;
    bloodDrawConcerns: string[];
    recentIllness: string;
    allergies: string[];
    notes: string;
};

export const initialLabSurvey: LabSurveyForm = {
    name: "", dob: "", tests: "", lastMeal: "", lastPeriod: "", medicines: [], otherMedicine: "",
    bloodDrawConcerns: [], recentIllness: "", allergies: [], notes: "",
};

export function labSurveyErrors(form: LabSurveyForm, hasPrescription: boolean): string[] {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push("Please enter your name.");
    if (!form.tests.trim() && !hasPrescription) errors.push("Tell us which tests you need, or upload your doctor's prescription.");
    if (!form.lastMeal) errors.push("Please tell us when you last ate or drank (other than water).");
    return errors;
}

export function labSurveyPayload(form: LabSurveyForm) {
    const medicines = [...form.medicines.filter((m) => m !== "None"), form.otherMedicine.trim()].filter(Boolean);
    const none = (list: string[]) => list.filter((item) => item !== "None");
    return {
        patientDetails: { name: form.name.trim(), dob: form.dob },
        labSurvey: {
            tests: form.tests.trim(),
            lastMeal: form.lastMeal,
            lastPeriod: form.lastPeriod,
            medicines: medicines.length ? medicines : form.medicines.includes("None") ? ["None"] : [],
            bloodDrawConcerns: none(form.bloodDrawConcerns).length ? none(form.bloodDrawConcerns) : form.bloodDrawConcerns,
            recentIllness: form.recentIllness,
            allergies: none(form.allergies).length ? none(form.allergies) : form.allergies,
            notes: form.notes.trim(),
        },
    };
}

export type LabSurveyRecord = {
    tests?: string; lastMeal?: string; lastPeriod?: string; medicines?: string[]; bloodDrawConcerns?: string[];
    recentIllness?: string; allergies?: string[]; notes?: string; appointmentId?: number; prescriptionDocumentId?: number | null; submittedAt?: string;
};

export function readLabSurvey(history: any): LabSurveyRecord | null {
    const value = history?.labSurvey;
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

const real = (list?: string[]) => (Array.isArray(list) ? list.filter((item) => item && item !== "None") : []);

// Practical pre-collection flags for the phlebotomist; shown to staff and (in friendlier words) to the patient.
export function labSurveyFlags(survey: LabSurveyRecord | null): { level: "alert" | "watch" | "info"; text: string }[] {
    if (!survey) return [];
    const flags: { level: "alert" | "watch" | "info"; text: string }[] = [];
    if (survey.lastMeal === "Less than 2 hours ago" || survey.lastMeal === "2–8 hours ago") flags.push({ level: "watch", text: `Not fasting (last meal ${survey.lastMeal.toLowerCase()}) — confirm before fasting sugar / lipid profile.` });
    const meds = real(survey.medicines);
    if (meds.some((m) => /biotin/i.test(m))) flags.push({ level: "watch", text: "Takes biotin — can falsely alter thyroid and hormone results." });
    if (meds.some((m) => /thyroid/i.test(m))) flags.push({ level: "info", text: "On thyroid medicine — note timing of last dose for TSH/T4." });
    if (meds.some((m) => /blood thinner/i.test(m))) flags.push({ level: "watch", text: "On blood thinner — apply longer pressure after the draw." });
    const draw = real(survey.bloodDrawConcerns);
    if (draw.some((d) => /bleed/i.test(d))) flags.push({ level: "alert", text: "Reports a bleeding tendency — take care with venepuncture." });
    if (draw.some((d) => /fainted/i.test(d))) flags.push({ level: "alert", text: "History of fainting during blood draws — draw lying down." });
    if (draw.some((d) => /needles/i.test(d))) flags.push({ level: "info", text: "Anxious about needles — reassure and distract." });
    const allergies = real(survey.allergies);
    if (allergies.length) flags.push({ level: "alert", text: `Allergy: ${allergies.join(", ")}.` });
    if (survey.recentIllness && survey.recentIllness !== "No") flags.push({ level: "info", text: `Recent illness (${survey.recentIllness.toLowerCase()}) — may affect CBC/CRP/ESR.` });
    return flags;
}

export function labSurveyRows(survey: LabSurveyRecord | null): [string, string][] {
    if (!survey) return [];
    const join = (list?: string[]) => (Array.isArray(list) ? list.join(", ") : "");
    const rows: [string, string | undefined][] = [
        ["Tests requested", survey.tests],
        ["Prescription", survey.prescriptionDocumentId ? "Uploaded by patient (see Documents)" : undefined],
        ["Last ate / drank", survey.lastMeal],
        ["Last period started", survey.lastPeriod],
        ["Medicines", join(survey.medicines)],
        ["Blood-draw concerns", join(survey.bloodDrawConcerns)],
        ["Illness in last 2 weeks", survey.recentIllness],
        ["Allergies", join(survey.allergies)],
        ["Notes", survey.notes],
    ];
    return rows.filter((row): row is [string, string] => Boolean(row[1]));
}
