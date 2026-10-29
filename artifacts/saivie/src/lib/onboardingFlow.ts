import { readConsultationSurvey, surveyDirectionsForConcerns, surveyQuestions, type ConsultationSurvey } from "./consultationSurvey.ts";

export type IntakeForm = {
    name: string;
    dob: string;
    referredBy: string;
    occupation: string;
    chiefComplaint: string;
    concerns: string[];
    consultation: ConsultationSurvey;
    pain: { location: string[]; duration: string; severity: string; relatedSymptoms: string[] };
    cycle: { lastPeriod: string; regularity: string; lateBy: string; pregnancyTest: string; menarcheAge: string; cycleLength: string; flow: string; symptoms: string[]; details: string };
    gyn: { firstEncounterAge: string; partnerCount: string; lastPap: string; sexuallyActive: string; hpvVaccine: string; birthControl: string[]; concerns: string[]; details: string };
    pregnancies: { currentStatus: string; weeksPregnant: string; dueDate: string; conceptionMethod: string; conceptionDetails: string; total: string; vaginal: string; cesarean: string; miscarriages: string; terminations: string; premature: string; details: string };
    lifestyle: { smoking: string; relationship: string; alcohol: string; exercise: string; mammogram: string; colonoscopy: string; other: string };
    health: { conditions: string[]; medicalDetails: string; surgeries: string; medications: string; allergies: string; familyHistory: string };
};

export const initialForm: IntakeForm = {
    name: "", dob: "", referredBy: "", occupation: "", chiefComplaint: "", concerns: [],
    consultation: { directions: [], answers: {} },
    pain: { location: [], duration: "", severity: "", relatedSymptoms: [] },
    cycle: { lastPeriod: "", regularity: "", lateBy: "", pregnancyTest: "", menarcheAge: "", cycleLength: "", flow: "", symptoms: [], details: "" },
    gyn: { firstEncounterAge: "", partnerCount: "", lastPap: "", sexuallyActive: "", hpvVaccine: "", birthControl: [], concerns: [], details: "" },
    pregnancies: { currentStatus: "", weeksPregnant: "", dueDate: "", conceptionMethod: "", conceptionDetails: "", total: "", vaginal: "", cesarean: "", miscarriages: "", terminations: "", premature: "", details: "" },
    lifestyle: { smoking: "", relationship: "", alcohol: "", exercise: "", mammogram: "", colonoscopy: "", other: "" },
    health: { conditions: [], medicalDetails: "", surgeries: "", medications: "", allergies: "", familyHistory: "" },
};

export type OptionalHistory = { cycle: boolean; gyn: boolean; pregnancy: boolean; background: boolean };

export function getOnboardingQuestions(form: IntakeForm, extra: OptionalHistory) {
    const has = (...concerns: string[]) => form.concerns.some((concern) => concerns.includes(concern));
    const cycle = has("Missed or late period", "Irregular or heavy bleeding", "Fertility", "Abdominal or pelvic pain");
    const pregnancy = has("Possible pregnancy", "I am pregnant", "Pregnancy care");
    const gyn = cycle || has("Birth control", "Routine checkup");
    const questions: { id: string; section: string }[] = [];
    const add = (section: string, ...ids: string[]) => questions.push(...ids.map((id) => ({ id, section })));

    add("about", "name", "dob");
    add("concern", "concerns", "chiefComplaint");
    if (has("Abdominal or pelvic pain")) add("concern", "painLocation", "painDuration", "painSeverity", "painSymptoms");
    if (cycle || pregnancy) add("cycle", "lastPeriod");
    if (has("Missed or late period")) add("cycle", "lateBy");
    if (cycle) add("cycle", "regularity", "cycleLength", "flow", "cycleSymptoms", "extraCycle");
    if (cycle && extra.cycle) add("cycle", "menarcheAge", "cycleDetails");
    if (pregnancy || has("Missed or late period")) add("cycle", "pregnancyTest");
    if (pregnancy) add("pregnancy", "currentStatus");
    if (pregnancy && form.pregnancies.currentStatus === "Yes") {
        add("pregnancy", "weeksPregnant", "dueDate", "conceptionMethod");
        if (form.pregnancies.conceptionMethod && form.pregnancies.conceptionMethod !== "Not known / not recorded") add("pregnancy", "conceptionDetails");
    }
    if (pregnancy || has("Fertility")) {
        add("pregnancy", "totalPregnancies");
        if (Number(form.pregnancies.total) > 0) {
            add("pregnancy", "extraPregnancy");
            if (extra.pregnancy) add("pregnancy", "vaginal", "cesarean", "miscarriages", "terminations", "premature", "pregnancyDetails");
        }
    }
    if (gyn) {
        add("gyn", "gynConcerns", "extraGyn");
        if (has("Birth control", "Fertility")) add("gyn", "sexuallyActive", "birthControl");
        if (extra.gyn) {
            if (!has("Birth control", "Fertility")) add("gyn", "sexuallyActive", "birthControl");
            add("gyn", "lastPap", "hpvVaccine");
            if (form.gyn.sexuallyActive === "Yes") add("gyn", "firstEncounterAge", "partnerCount");
            add("gyn", "gynDetails");
        }
    }
    add("health", "conditions");
    if (has("Breast problem") || form.health.conditions.includes("Breast problem")) add("health", "mammogram");
    if (has("Gut / bowel problems") || form.health.conditions.some((condition) => ["Gut / bowel problems", "Irritable bowel syndrome"].includes(condition))) add("health", "colonoscopy");
    if (form.health.conditions.some((condition) => condition !== "None of these")) add("health", "medicalDetails");
    add("health", "medications", "allergies", "surgeries", "familyHistory");
    add("lifestyle", "extraBackground");
    if (extra.background) add("lifestyle", "referredBy", "occupation", "smoking", "relationship", "alcohol", "exercise", "lifestyleOther");
    if (form.concerns.length) add("survey", "surveyDirections");
    const consultation = relevantConsultation(form);
    add("survey", ...surveyQuestions(consultation.directions).map((question) => `survey:${question}`));
    add("review", "review");
    return questions;
}

// Survey step ids embed question text (which can contain commas), so compare whole ids.
export function isOnboardingStep(questions: { id: string }[], step: string) {
    return questions.some((question) => question.id === step);
}

function relevantConsultation(form: IntakeForm): ConsultationSurvey {
    const consultation = readConsultationSurvey(form.consultation);
    const options = new Set(surveyDirectionsForConcerns(form.concerns));
    return readConsultationSurvey({ ...consultation, directions: consultation.directions.filter((direction) => options.has(direction)) });
}

// Keep back-navigation drafts in the UI, but do not submit answers to hidden follow-ups.
export function getRelevantIntake(form: IntakeForm, extra: OptionalHistory): IntakeForm {
    const ids = new Set(getOnboardingQuestions(form, extra).map((question) => question.id));
    const keep = (id: string, value: string) => ids.has(id) ? value : "";
    const keepList = (id: string, value: string[]) => ids.has(id) ? value : [];
    return {
        ...form,
        consultation: relevantConsultation(form),
        referredBy: keep("referredBy", form.referredBy), occupation: keep("occupation", form.occupation),
        pain: {
            location: keepList("painLocation", form.pain.location), duration: keep("painDuration", form.pain.duration),
            severity: keep("painSeverity", form.pain.severity), relatedSymptoms: keepList("painSymptoms", form.pain.relatedSymptoms),
        },
        cycle: {
            lastPeriod: keep("lastPeriod", form.cycle.lastPeriod), regularity: keep("regularity", form.cycle.regularity),
            lateBy: keep("lateBy", form.cycle.lateBy), pregnancyTest: keep("pregnancyTest", form.cycle.pregnancyTest),
            menarcheAge: keep("menarcheAge", form.cycle.menarcheAge), cycleLength: keep("cycleLength", form.cycle.cycleLength),
            flow: keep("flow", form.cycle.flow), symptoms: keepList("cycleSymptoms", form.cycle.symptoms), details: keep("cycleDetails", form.cycle.details),
        },
        gyn: {
            firstEncounterAge: keep("firstEncounterAge", form.gyn.firstEncounterAge), partnerCount: keep("partnerCount", form.gyn.partnerCount),
            lastPap: keep("lastPap", form.gyn.lastPap), sexuallyActive: keep("sexuallyActive", form.gyn.sexuallyActive),
            hpvVaccine: keep("hpvVaccine", form.gyn.hpvVaccine), birthControl: keepList("birthControl", form.gyn.birthControl),
            concerns: keepList("gynConcerns", form.gyn.concerns), details: keep("gynDetails", form.gyn.details),
        },
        pregnancies: {
            conceptionMethod: keep("conceptionMethod", form.pregnancies.conceptionMethod),
            conceptionDetails: keep("conceptionDetails", form.pregnancies.conceptionDetails),
            currentStatus: keep("currentStatus", form.pregnancies.currentStatus), weeksPregnant: keep("weeksPregnant", form.pregnancies.weeksPregnant),
            dueDate: keep("dueDate", form.pregnancies.dueDate), total: keep("totalPregnancies", form.pregnancies.total),
            vaginal: keep("vaginal", form.pregnancies.vaginal), cesarean: keep("cesarean", form.pregnancies.cesarean),
            miscarriages: keep("miscarriages", form.pregnancies.miscarriages), terminations: keep("terminations", form.pregnancies.terminations),
            premature: keep("premature", form.pregnancies.premature), details: keep("pregnancyDetails", form.pregnancies.details),
        },
        lifestyle: {
            smoking: keep("smoking", form.lifestyle.smoking), relationship: keep("relationship", form.lifestyle.relationship),
            alcohol: keep("alcohol", form.lifestyle.alcohol), exercise: keep("exercise", form.lifestyle.exercise),
            mammogram: keep("mammogram", form.lifestyle.mammogram), colonoscopy: keep("colonoscopy", form.lifestyle.colonoscopy), other: keep("lifestyleOther", form.lifestyle.other),
        },
        health: { ...form.health, medicalDetails: keep("medicalDetails", form.health.medicalDetails) },
    };
}
