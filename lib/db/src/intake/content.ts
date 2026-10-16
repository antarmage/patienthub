export interface QuestionText {
  label: string;
  help?: string;
  /** Per-question option labels; fall back to the shared `options` dictionary. */
  options?: Record<string, string>;
}

export interface IntakeContent {
  locale: string;
  ui: Record<string, string>;
  modules: Record<string, { title: string; blurb: string }>;
  options: Record<string, string>;
  questions: Record<string, QuestionText>;
  entryFields: Record<string, string>;
  groups: Record<string, string>;
}

export const LOCALES: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "bn", name: "বাংলা" },
  { code: "hi", name: "हिन्दी" },
  { code: "or", name: "ଓଡ଼ିଆ" },
];

const en: IntakeContent = {
  locale: "en",
  ui: {
    brand: "Saivie OPD Companion",
    welcomeTitle: "Let's get you ready for your visit",
    welcomeBody: "A few gentle, tap-friendly questions help Dr. Sai Dibyadarshini Bhuyan understand how best to help you. It takes about 5 minutes and you can skip anything you prefer not to answer.",
    language: "Choose your language",
    comingSoon: "Coming soon",
    privacyTitle: "How we use your answers",
    privacyCollected: "What we collect: your answers about your health, periods, pregnancies, medicines and allergies.",
    privacyWhy: "Why: so your doctor can prepare for your consultation. It is not used to diagnose you.",
    privacyWho: "Who can see it: your treating clinician. Front-desk staff only see whether you have completed it.",
    privacyRetention: "Retention: kept with your clinic record under Saivie's records policy and deleted as that policy allows.",
    privacyRights: "Your rights: you can ask the clinic to correct, export or delete your answers, or withdraw consent, by contacting the front desk.",
    consentClinical: "I agree to share these answers with my care team for this consultation.",
    consentMarketing: "Optional: send me health tips and clinic updates. (Separate from your care.)",
    start: "Let's get started",
    next: "Continue",
    back: "Back",
    saveDraft: "Save & finish later",
    saved: "Draft saved",
    submit: "Submit to my doctor",
    submitting: "Submitting…",
    review: "Review your answers",
    reviewBody: "Tap Edit on anything you want to change.",
    edit: "Edit",
    notAnswered: "Not answered yet",
    skip: "Prefer not to answer",
    private: "I'd rather discuss this privately",
    skippedLabel: "Prefer not to answer",
    privateLabel: "Will discuss privately",
    yes: "Yes",
    no: "No",
    notsure: "Not sure",
    required: "Required",
    pleaseAnswer: "Please answer the highlighted questions to continue.",
    identityTitle: "Is this you?",
    identityBody: "We already have these details from your appointment. You don't need to type them again.",
    identityConfirm: "These details are correct",
    identityWrong: "Something needs updating",
    identityNote: "What should we update?",
    addEntry: "Add another",
    removeEntry: "Remove",
    otherPlaceholder: "Type here (optional)",
    typeHere: "Type here",
    reasonsTitle: "What brings you in today?",
    reasonsBody: "Choose everything that applies.",
    historyTitle: "A little about your health",
    historyBody: "This helps us stay safe and avoid repeating questions.",
    urgentBanner: "You've told us about a symptom that may need attention now.",
    doneTitle: "Thank you — you're all set",
    doneBody: "Your answers have been shared with your care team. Please arrive on time for your appointment.",
    doneUrgent: "We've alerted our front-desk team. Please speak to them as soon as you arrive.",
    alreadySubmitted: "This questionnaire has already been submitted.",
    invalidLink: "This link is not valid or has expired. Please ask the front desk for a new one.",
    stepOf: "Step {n} of {total}",
    prefilled: "Pre-filled from your record",
    patientReported: "Patient-reported",
    notDiagnosis: "These are the patient's own answers, not a diagnosis.",
    unit_days: "days",
    unit_years: "years",
    year: "Year",
    name: "Name",
    frequency: "How often",
    substance: "Allergic to",
    reaction: "Reaction",
    procedure: "Procedure",
    medName: "Medicine",
    other: "Other",
  },
  modules: {
    adolescent: { title: "Your first visit", blurb: "Starting out with periods and body changes" },
    menstrual: { title: "Periods & pelvic pain", blurb: "Cycle, bleeding and pain" },
    pcos: { title: "PCOS & hormones", blurb: "Hormone-related symptoms" },
    contraception: { title: "Contraception & sexual health", blurb: "Private and confidential" },
    pregnancy: { title: "Pregnancy care", blurb: "Antenatal care" },
    fertility: { title: "Trying to conceive", blurb: "Fertility and preconception" },
    menopause: { title: "Menopause", blurb: "Perimenopause and beyond" },
    postpartum: { title: "After delivery", blurb: "Postpartum recovery and pelvic floor" },
    preventive: { title: "Check-ups & other", blurb: "Screening and anything else" },
  },
  options: {
    yes: "Yes", no: "No", notsure: "Not sure", none: "None of these", other: "Other", unsure: "Not sure",
    first_visit: "My first gynaecology visit", periods: "Periods, bleeding or pelvic pain", pcos: "PCOS or hormonal concerns",
    contraception: "Contraception or sexual health", pregnancy: "Pregnancy care", fertility: "Trying to conceive",
    menopause: "Menopause symptoms", postpartum: "After delivery / pelvic floor", checkup: "Routine check-up or screening",
    regular: "Regular", irregular: "Irregular", absent: "No periods", since_menarche: "Since my first period", under_3m: "Under 3 months",
    "3_12m": "3–12 months", over_1y: "Over a year", under_1m: "Under a month", "1_6m": "1–6 months", "6_12m": "6–12 months",
    mild: "Mild", moderate: "Moderate", severe: "Severe", some: "Somewhat", misses_activities: "I miss work, school or activities",
    vaginal: "Vaginal birth", c_section: "C-section", assisted: "Assisted (forceps / vacuum)",
    daily: "Daily", twice_daily: "Twice a day", weekly: "Weekly", as_needed: "When needed",
    diabetes: "Diabetes", thyroid: "Thyroid", hypertension: "High blood pressure", asthma: "Asthma", anaemia: "Anaemia",
    heart: "Heart condition", kidney: "Kidney condition", clotting: "Blood clots",
    pcos_f: "PCOS", under_1y: "Within the last year", "1_3y": "1–3 years ago", "3_5y": "3–5 years ago", over_5y: "More than 5 years ago", never: "Never",
    rash: "Rash", swelling: "Swelling", breathing: "Trouble breathing", anaphylaxis: "Severe reaction (anaphylaxis)", stomach: "Stomach upset", unknown: "Don't know",
    penicillin: "Penicillin", sulfa: "Sulfa drugs", nsaids: "Pain-killers (NSAIDs)", latex: "Latex", food: "Food",
  },
  entryFields: {
    procedure: "Procedure", year: "Year (optional)", name: "Medicine", frequency: "How often", substance: "Allergic to", reaction: "Reaction",
  },
  groups: {
    reason: "Reason for visit",
    symptoms: "Symptoms, duration and impact",
    menstrual: "Menstrual history",
    reproductive: "Reproductive & obstetric history",
    conditions: "Conditions & procedures",
    medicines: "Medicines & allergies",
    family: "Family history",
    preventive: "Preventive care",
  },
  questions: {
    reasons: {
      label: "What brings you in today?", help: "Choose everything that applies.",
      options: {
        first_visit: "My first gynaecology visit", periods: "Periods, bleeding or pelvic pain", pcos: "PCOS or hormonal concerns",
        contraception: "Contraception or sexual health", pregnancy: "Pregnancy care", fertility: "Trying to conceive",
        menopause: "Menopause symptoms", postpartum: "After delivery / pelvic floor", checkup: "Routine check-up or screening", other: "Something else",
      },
    },
    reason_note: { label: "Anything you'd like the doctor to know?", help: "Optional — in your own words." },
    urgent_now: {
      label: "Are you having any of these right now?", help: "If yes, tap it so we can help you straight away.",
      options: {
        heavy_bleeding: "Very heavy bleeding", severe_pain: "Severe pain", faint: "Feeling faint or collapsing",
        pregnant_bleeding_pain: "Pregnant with bleeding or pain", fever_pelvic_pain: "Fever with pelvic pain",
        reduced_movement: "Baby moving much less", none: "None of these",
      },
    },
    lmp_date: { label: "When did your last period start?", help: "The first day. An approximate date is fine." },
    periods_started: { label: "Have your periods started?" },
    menarche_age: { label: "How old were you at your first period?", help: "Age in years." },
    cycle_regularity: {
      label: "How are your periods?", options: { regular: "Regular", irregular: "Irregular", absent: "I'm not getting periods", unsure: "Not sure" },
    },
    cycle_length: { label: "How many days from one period to the next?", help: "Count from the first day of one period to the first day of the next." },
    period_days: { label: "How many days do your periods last?" },
    irregular_since: {
      label: "Since when?", options: { since_menarche: "Since my first period", under_3m: "Under 3 months", "3_12m": "3–12 months", over_1y: "Over a year" },
    },
    missed_periods: { label: "How many periods have you missed?", options: { "1": "One", "2_3": "Two or three", over_3: "More than three" } },
    flow: { label: "How heavy is your flow?", options: { light: "Light", normal: "Normal", heavy: "Heavy", very_heavy: "Very heavy" } },
    bleeding_pattern: {
      label: "Do you notice any of these?",
      options: { between_periods: "Bleeding between periods", after_sex: "Bleeding after sex", over_7_days: "Periods lasting over 7 days", clots: "Large clots", none: "None of these" },
    },
    pelvic_pain: { label: "Do you have pelvic or period pain?" },
    pain_when: {
      label: "When does it happen?",
      options: { before_period: "Before my period", during_period: "During my period", mid_cycle: "Mid-cycle", during_sex: "During sex", always: "Most of the time" },
    },
    pain_duration: { label: "How long has this been going on?" },
    pain_severity: { label: "How strong is the pain?" },
    pain_impact: { label: "Does it affect your daily life?" },
    pcos_symptoms: {
      label: "Which of these have you noticed?",
      options: { acne: "Acne", hair_growth: "Extra facial or body hair", hair_loss: "Hair thinning", weight_gain: "Weight gain", dark_patches: "Dark skin patches", mood: "Mood changes", none: "None of these" },
    },
    sexually_active: { label: "Are you sexually active?", help: "Private. You can skip this.", options: { yes: "Yes", no: "No" } },
    contraception_current: {
      label: "Are you using any contraception now?",
      options: { none: "None", pill: "Pills", condom: "Condoms", iud: "Copper-T / IUD", implant: "Implant", injection: "Injection", sterilisation: "Sterilisation", other: "Other" },
    },
    contraception_goal: {
      label: "What would you like help with?",
      options: { start: "Starting contraception", change: "Changing my method", stop: "Stopping my method", emergency: "Emergency contraception", information: "Just information" },
    },
    sexual_concerns: {
      label: "Do you have any concerns?",
      options: { pain: "Pain with sex", low_desire: "Low desire", dryness: "Dryness", bleeding: "Bleeding after sex", discharge: "Unusual discharge", none: "None of these" },
    },
    currently_pregnant: { label: "Are you pregnant now?", options: { yes: "Yes", no: "No", notsure: "I'm not sure" } },
    edd_date: { label: "Expected delivery date", help: "If you know it." },
    antenatal_care: {
      label: "Where are you in your antenatal care?",
      options: { first_visit: "This is my first antenatal visit", ongoing_here: "I'm already seen here", ongoing_elsewhere: "Seen elsewhere, want a second opinion", transfer: "Moving my care to Saivie" },
    },
    scan_done: { label: "Have you had a pregnancy scan?" },
    pregnancy_concerns: {
      label: "Are you having any of these?",
      options: { bleeding: "Bleeding", pain: "Tummy pain", vomiting: "Persistent vomiting", headache_swelling: "Severe headache or swelling", reduced_movement: "Baby moving less", none: "None of these" },
    },
    obs_ever_pregnant: { label: "Have you ever been pregnant?", help: "Including miscarriages or terminations." },
    obs_gravida: { label: "Total pregnancies (including now)", help: "Please confirm the terminology with your doctor." },
    obs_para: { label: "Births (pregnancies carried to delivery)" },
    obs_abortions: { label: "Miscarriages or terminations" },
    obs_living: { label: "Living children" },
    delivery_modes: { label: "How were your babies born?", options: { vaginal: "Vaginal birth", c_section: "C-section", assisted: "Assisted (forceps / vacuum)" } },
    trying_duration: {
      label: "How long have you been trying to conceive?",
      options: { not_yet: "Planning ahead — not trying yet", under_6m: "Under 6 months", "6_12m": "6–12 months", "1_2y": "1–2 years", over_2y: "More than 2 years" },
    },
    fertility_tests_done: { label: "Have you already had fertility tests or treatment?" },
    partner_evaluated: { label: "Has your partner had a fertility check?", options: { yes: "Yes", no: "No", no_partner: "Not applicable", notsure: "Not sure" } },
    folic_acid: { label: "Are you taking folic acid?" },
    menopause_symptoms: {
      label: "Which symptoms bother you?",
      options: { hot_flushes: "Hot flushes", night_sweats: "Night sweats", sleep: "Poor sleep", mood: "Mood changes", dryness: "Vaginal dryness", joint_pain: "Joint pain", none: "None of these" },
    },
    menopause_bleeding: { label: "Any bleeding after your periods stopped?", help: "At least 12 months since your last period." },
    hrt_use: { label: "Have you used hormone therapy?" },
    menopause_surgery: {
      label: "Have you had any of these surgeries?",
      options: { hysterectomy: "Womb removed", ovary_removal: "Ovaries removed", none: "None of these" },
    },
    delivery_date: { label: "When did you deliver?" },
    pp_delivery_type: { label: "How was your baby born?", options: { vaginal: "Vaginal birth", c_section: "C-section", assisted: "Assisted (forceps / vacuum)" } },
    breastfeeding: { label: "Are you breastfeeding?", options: { exclusive: "Only breastfeeding", partial: "Partly", no: "No" } },
    pp_symptoms: {
      label: "Are you experiencing any of these?",
      options: { heavy_bleeding: "Heavy bleeding", urine_leak: "Leaking urine", pelvic_heaviness: "Heaviness in the pelvis", pain_sex: "Pain with sex", low_mood: "Low mood or worry", breast_problems: "Breast problems", none: "None of these" },
    },
    sx_duration: { label: "How long have these symptoms been going on?" },
    sx_severity: { label: "How severe are they?" },
    sx_impact: { label: "Do they affect your daily life?" },
    pap_last: { label: "When was your last Pap smear?", options: { never: "Never had one", under_1y: "Within the last year", "1_3y": "1–3 years ago", "3_5y": "3–5 years ago", over_5y: "More than 5 years ago", notsure: "Not sure" } },
    hpv_vaccine: { label: "Have you had the HPV vaccine?" },
    preventive_interest: {
      label: "What would you like to check?",
      options: { pap: "Pap smear", breast_exam: "Breast check", sti_screen: "Sexual-health screening", vaccines: "Vaccines", bone_health: "Bone health", general: "General health check" },
    },
    other_concern: { label: "Tell us what else is on your mind", help: "Optional." },
    conditions: {
      label: "Do you have any of these conditions?",
      options: { diabetes: "Diabetes", thyroid: "Thyroid", hypertension: "High blood pressure", asthma: "Asthma", anaemia: "Anaemia", heart: "Heart condition", kidney: "Kidney condition", clotting: "Blood clots", other: "Something else", none: "None of these" },
    },
    conditions_other: { label: "Which other condition?" },
    surgeries_has: { label: "Have you had any surgeries or procedures?" },
    surgeries: {
      label: "Tell us about them",
      options: { c_section: "C-section", hysterectomy: "Hysterectomy", ovarian_surgery: "Ovarian surgery", fibroid_surgery: "Fibroid surgery", d_and_c: "D&C", laparoscopy: "Laparoscopy", other: "Other" },
    },
    meds_has: { label: "Are you taking any medicines or supplements?" },
    meds: { label: "Which medicines?", help: "Tap a common one or type your own." },
    allergies_has: { label: "Do you have any allergies?" },
    allergies: { label: "What are you allergic to?" },
    family_history: {
      label: "Has anyone in your family had these?", help: "Parents, siblings or grandparents.",
      options: { diabetes: "Diabetes", hypertension: "High blood pressure", breast_cancer: "Breast cancer", ovarian_cancer: "Ovarian cancer", uterine_cancer: "Womb / cervical cancer", thyroid: "Thyroid disease", clotting: "Blood clots", pcos: "PCOS", early_menopause: "Early menopause", none: "None of these", notsure: "I don't know" },
    },
  },
};

const translations: Record<string, Partial<IntakeContent>> = { en };

export function availableLocales(): string[] {
  return Object.keys(translations);
}

/** Missing translations fall back to English so a partial translation never breaks the form. */
export function getContent(locale: string): IntakeContent {
  const t = translations[locale];
  if (!t || locale === "en") return en;
  return {
    ...en,
    ...t,
    locale,
    ui: { ...en.ui, ...t.ui },
    modules: { ...en.modules, ...t.modules },
    options: { ...en.options, ...t.options },
    questions: { ...en.questions, ...t.questions },
    entryFields: { ...en.entryFields, ...t.entryFields },
    groups: { ...en.groups, ...t.groups },
  };
}

export function optionLabel(content: IntakeContent, questionId: string, value: string): string {
  return content.questions[questionId]?.options?.[value] ?? content.options[value] ?? value;
}
