import type { AlertRule, ModuleId, Question } from "./types.ts";

export const MODULE_ORDER: ModuleId[] = [
  "adolescent",
  "menstrual",
  "pcos",
  "contraception",
  "pregnancy",
  "fertility",
  "menopause",
  "postpartum",
  "preventive",
];

/** Deterministic routing: each reason selects one or more modules. No age-only routing. */
export const REASON_MODULES: Record<string, ModuleId[]> = {
  first_visit: ["adolescent"],
  periods: ["menstrual"],
  pcos: ["pcos"],
  contraception: ["contraception"],
  pregnancy: ["pregnancy"],
  fertility: ["fertility"],
  menopause: ["menopause"],
  postpartum: ["postpartum"],
  checkup: ["preventive"],
  other: ["preventive"],
};

export const REASON_OPTIONS = Object.keys(REASON_MODULES);

const YES_NO = ["yes", "no"];
const CYCLE_MODULES: ModuleId[] = ["adolescent", "menstrual", "pcos", "fertility", "contraception"];
const LMP_MODULES: ModuleId[] = [
  "adolescent", "menstrual", "pcos", "contraception", "pregnancy", "fertility", "menopause", "preventive",
];
const OBS_MODULES: ModuleId[] = ["pregnancy", "fertility", "postpartum"];
const PERIODS_STARTED: Question["showIf"] = { q: "periods_started", op: "in", value: ["yes", "notsure"] };
const SYMPTOM_MODULES: ModuleId[] = ["pcos", "menopause", "postpartum"];

const SYMPTOM_FOLLOW_UP: Question["showIf"] = {
  any: [
    { q: "pcos_symptoms", op: "hasAny" },
    { q: "menopause_symptoms", op: "hasAny" },
    { q: "pp_symptoms", op: "hasAny" },
  ],
};

export const QUESTIONS: Question[] = [
  // ── Reasons for the visit ─────────────────────────────────────────────────
  { id: "reasons", type: "multi", section: "reason", required: true, options: REASON_OPTIONS, group: "reason" },
  { id: "reason_note", type: "text", section: "reason", group: "reason" },
  {
    id: "urgent_now", type: "multi", section: "reason", required: true, group: "reason",
    options: ["heavy_bleeding", "severe_pain", "faint", "pregnant_bleeding_pain", "fever_pelvic_pain", "reduced_movement", "none"],
    exclusive: ["none"],
  },

  // ── Shared cycle questions ────────────────────────────────────────────────
  { id: "lmp_date", type: "date", section: "module", modules: LMP_MODULES, required: true, skippable: ["skip", "private"], group: "menstrual" },
  { id: "periods_started", type: "yesno", section: "module", modules: CYCLE_MODULES, required: true, group: "menstrual" },
  { id: "menarche_age", type: "number", section: "module", modules: CYCLE_MODULES, showIf: { q: "periods_started", op: "eq", value: "yes" }, min: 7, max: 20, skippable: ["skip"], group: "menstrual" },
  {
    id: "cycle_regularity", type: "single", section: "module", modules: CYCLE_MODULES, showIf: PERIODS_STARTED, required: true,
    options: ["regular", "irregular", "absent", "unsure"], group: "menstrual",
  },
  { id: "cycle_length", type: "number", section: "module", modules: CYCLE_MODULES, showIf: { q: "cycle_regularity", op: "in", value: ["regular", "irregular"] }, min: 15, max: 90, skippable: ["skip"], group: "menstrual" },
  { id: "period_days", type: "number", section: "module", modules: CYCLE_MODULES, showIf: { q: "cycle_regularity", op: "in", value: ["regular", "irregular"] }, min: 1, max: 20, skippable: ["skip"], group: "menstrual" },
  {
    id: "irregular_since", type: "single", section: "module", modules: CYCLE_MODULES, showIf: { q: "cycle_regularity", op: "in", value: ["irregular", "absent"] },
    options: ["since_menarche", "under_3m", "3_12m", "over_1y"], group: "menstrual",
  },
  {
    id: "missed_periods", type: "single", section: "module", modules: CYCLE_MODULES, showIf: { q: "cycle_regularity", op: "eq", value: "absent" },
    options: ["1", "2_3", "over_3"], group: "menstrual",
  },
  {
    id: "flow", type: "single", section: "module", modules: ["adolescent", "menstrual", "pcos"], showIf: PERIODS_STARTED,
    options: ["light", "normal", "heavy", "very_heavy"], group: "menstrual",
  },
  {
    id: "bleeding_pattern", type: "multi", section: "module", modules: ["menstrual"], showIf: PERIODS_STARTED,
    options: ["between_periods", "after_sex", "over_7_days", "clots", "none"], exclusive: ["none"], group: "menstrual",
  },
  { id: "pelvic_pain", type: "yesno", section: "module", modules: ["adolescent", "menstrual"], required: true, noNotSure: true, group: "symptoms" },
  {
    id: "pain_when", type: "multi", section: "module", modules: ["adolescent", "menstrual"], showIf: { q: "pelvic_pain", op: "eq", value: "yes" },
    options: ["before_period", "during_period", "mid_cycle", "during_sex", "always"], group: "symptoms",
  },
  {
    id: "pain_duration", type: "single", section: "module", modules: ["adolescent", "menstrual"], showIf: { q: "pelvic_pain", op: "eq", value: "yes" },
    options: ["under_1m", "1_6m", "6_12m", "over_1y"], group: "symptoms",
  },
  {
    id: "pain_severity", type: "single", section: "module", modules: ["adolescent", "menstrual"], showIf: { q: "pelvic_pain", op: "eq", value: "yes" },
    options: ["mild", "moderate", "severe"], group: "symptoms",
  },
  {
    id: "pain_impact", type: "single", section: "module", modules: ["adolescent", "menstrual"], showIf: { q: "pelvic_pain", op: "eq", value: "yes" },
    options: ["none", "some", "misses_activities"], group: "symptoms",
  },

  // ── PCOS / hormonal ───────────────────────────────────────────────────────
  {
    id: "pcos_symptoms", type: "multi", section: "module", modules: ["pcos"],
    options: ["acne", "hair_growth", "hair_loss", "weight_gain", "dark_patches", "mood", "none"], exclusive: ["none"], group: "symptoms",
  },

  // ── Contraception & sexual health ─────────────────────────────────────────
  {
    id: "sexually_active", type: "single", section: "module", modules: ["contraception", "fertility", "preventive"], skippable: ["skip", "private"],
    options: ["yes", "no"], group: "reproductive",
  },
  {
    id: "contraception_current", type: "single", section: "module", modules: ["contraception"], skippable: ["skip", "private"],
    options: ["none", "pill", "condom", "iud", "implant", "injection", "sterilisation", "other"], group: "reproductive",
  },
  {
    id: "contraception_goal", type: "single", section: "module", modules: ["contraception"], skippable: ["skip", "private"],
    options: ["start", "change", "stop", "emergency", "information"], group: "reproductive",
  },
  {
    id: "sexual_concerns", type: "multi", section: "module", modules: ["contraception"], skippable: ["skip", "private"],
    showIf: { q: "sexually_active", op: "eq", value: "yes" },
    options: ["pain", "low_desire", "dryness", "bleeding", "discharge", "none"], exclusive: ["none"], group: "symptoms",
  },

  // ── Pregnancy & antenatal ─────────────────────────────────────────────────
  { id: "currently_pregnant", type: "single", section: "module", modules: ["pregnancy"], required: true, options: ["yes", "no", "notsure"], group: "reproductive" },
  { id: "edd_date", type: "date", section: "module", modules: ["pregnancy"], showIf: { q: "currently_pregnant", op: "eq", value: "yes" }, allowFuture: true, skippable: ["skip"], group: "reproductive" },
  {
    id: "antenatal_care", type: "single", section: "module", modules: ["pregnancy"], showIf: { q: "currently_pregnant", op: "eq", value: "yes" },
    options: ["first_visit", "ongoing_here", "ongoing_elsewhere", "transfer"], group: "reproductive",
  },
  { id: "scan_done", type: "yesno", section: "module", modules: ["pregnancy"], showIf: { q: "currently_pregnant", op: "eq", value: "yes" }, group: "reproductive" },
  {
    id: "pregnancy_concerns", type: "multi", section: "module", modules: ["pregnancy"], showIf: { q: "currently_pregnant", op: "in", value: ["yes", "notsure"] },
    options: ["bleeding", "pain", "vomiting", "headache_swelling", "reduced_movement", "none"], exclusive: ["none"], group: "symptoms",
  },

  // ── Obstetric history (shared) ────────────────────────────────────────────
  { id: "obs_ever_pregnant", type: "yesno", section: "module", modules: OBS_MODULES, required: true, noNotSure: true, skippable: ["skip", "private"], group: "reproductive" },
  { id: "obs_gravida", type: "number", section: "module", modules: OBS_MODULES, showIf: { q: "obs_ever_pregnant", op: "eq", value: "yes" }, min: 1, max: 20, required: true, clinicianReview: true, group: "reproductive" },
  { id: "obs_para", type: "number", section: "module", modules: OBS_MODULES, showIf: { q: "obs_ever_pregnant", op: "eq", value: "yes" }, min: 0, max: 20, required: true, clinicianReview: true, group: "reproductive" },
  { id: "obs_abortions", type: "number", section: "module", modules: OBS_MODULES, showIf: { q: "obs_ever_pregnant", op: "eq", value: "yes" }, min: 0, max: 20, required: true, clinicianReview: true, group: "reproductive" },
  { id: "obs_living", type: "number", section: "module", modules: OBS_MODULES, showIf: { q: "obs_ever_pregnant", op: "eq", value: "yes" }, min: 0, max: 20, required: true, clinicianReview: true, group: "reproductive" },
  {
    id: "delivery_modes", type: "multi", section: "module", modules: OBS_MODULES, showIf: { q: "obs_para", op: "gt", value: 0 },
    options: ["vaginal", "c_section", "assisted"], group: "reproductive",
  },

  // ── Fertility & preconception ─────────────────────────────────────────────
  {
    id: "trying_duration", type: "single", section: "module", modules: ["fertility"], required: true,
    options: ["not_yet", "under_6m", "6_12m", "1_2y", "over_2y"], group: "reproductive",
  },
  { id: "fertility_tests_done", type: "yesno", section: "module", modules: ["fertility"], showIf: { q: "trying_duration", op: "in", value: ["6_12m", "1_2y", "over_2y"] }, group: "reproductive" },
  { id: "partner_evaluated", type: "single", section: "module", modules: ["fertility"], skippable: ["skip", "private"], options: ["yes", "no", "no_partner", "notsure"], group: "reproductive" },
  { id: "folic_acid", type: "yesno", section: "module", modules: ["fertility"], group: "reproductive" },

  // ── Menopause & perimenopause ─────────────────────────────────────────────
  {
    id: "menopause_symptoms", type: "multi", section: "module", modules: ["menopause"], required: true,
    options: ["hot_flushes", "night_sweats", "sleep", "mood", "dryness", "joint_pain", "none"], exclusive: ["none"], group: "symptoms",
  },
  { id: "menopause_bleeding", type: "yesno", section: "module", modules: ["menopause"], required: true, noNotSure: true, group: "menstrual" },
  { id: "hrt_use", type: "yesno", section: "module", modules: ["menopause"], required: true, group: "medicines" },
  {
    id: "menopause_surgery", type: "multi", section: "module", modules: ["menopause"], skippable: ["skip", "private"],
    options: ["hysterectomy", "ovary_removal", "none"], exclusive: ["none"], group: "conditions",
  },

  // ── Postpartum & pelvic floor ─────────────────────────────────────────────
  { id: "delivery_date", type: "date", section: "module", modules: ["postpartum"], required: true, group: "reproductive" },
  { id: "pp_delivery_type", type: "single", section: "module", modules: ["postpartum"], options: ["vaginal", "c_section", "assisted"], group: "reproductive" },
  { id: "breastfeeding", type: "single", section: "module", modules: ["postpartum"], options: ["exclusive", "partial", "no"], group: "reproductive" },
  {
    id: "pp_symptoms", type: "multi", section: "module", modules: ["postpartum"], required: true,
    options: ["heavy_bleeding", "urine_leak", "pelvic_heaviness", "pain_sex", "low_mood", "breast_problems", "none"], exclusive: ["none"], group: "symptoms",
  },

  // ── Symptom follow-ups shared across modules ──────────────────────────────
  { id: "sx_duration", type: "single", section: "module", modules: SYMPTOM_MODULES, showIf: SYMPTOM_FOLLOW_UP, options: ["under_1m", "1_6m", "6_12m", "over_1y"], group: "symptoms" },
  { id: "sx_severity", type: "single", section: "module", modules: SYMPTOM_MODULES, showIf: SYMPTOM_FOLLOW_UP, options: ["mild", "moderate", "severe"], group: "symptoms" },
  { id: "sx_impact", type: "single", section: "module", modules: SYMPTOM_MODULES, showIf: SYMPTOM_FOLLOW_UP, options: ["none", "some", "misses_activities"], group: "symptoms" },

  // ── Preventive & other ────────────────────────────────────────────────────
  {
    id: "pap_last", type: "single", section: "module", modules: ["preventive"], skippable: ["skip"],
    options: ["never", "under_1y", "1_3y", "3_5y", "over_5y", "notsure"], group: "preventive",
  },
  { id: "hpv_vaccine", type: "single", section: "module", modules: ["preventive", "adolescent"], skippable: ["skip"], options: ["yes", "no", "notsure"], group: "preventive" },
  {
    id: "preventive_interest", type: "multi", section: "module", modules: ["preventive"],
    options: ["pap", "breast_exam", "sti_screen", "vaccines", "bone_health", "general"], group: "preventive",
  },
  { id: "other_concern", type: "text", section: "module", modules: ["preventive"], group: "reason" },

  // ── Medical history (always asked once) ───────────────────────────────────
  {
    id: "conditions", type: "multi", section: "history", required: true,
    options: ["diabetes", "thyroid", "hypertension", "asthma", "anaemia", "heart", "kidney", "clotting", "other", "none"], exclusive: ["none"], group: "conditions",
  },
  { id: "conditions_other", type: "text", section: "history", showIf: { q: "conditions", op: "includes", value: "other" }, group: "conditions" },
  { id: "surgeries_has", type: "yesno", section: "history", required: true, noNotSure: true, group: "conditions" },
  {
    id: "surgeries", type: "surgeries", section: "history", required: true, showIf: { q: "surgeries_has", op: "eq", value: "yes" }, group: "conditions",
    entryFields: [
      { key: "procedure", kind: "select", required: true, options: ["c_section", "hysterectomy", "ovarian_surgery", "fibroid_surgery", "d_and_c", "laparoscopy", "other"] },
      { key: "year", kind: "year" },
    ],
  },
  { id: "meds_has", type: "yesno", section: "history", required: true, group: "medicines" },
  {
    id: "meds", type: "meds", section: "history", required: true, showIf: { q: "meds_has", op: "eq", value: "yes" }, group: "medicines",
    entryFields: [
      { key: "name", kind: "text", required: true, suggestions: ["Iron", "Folic acid", "Calcium", "Thyroxine", "Metformin", "Contraceptive pill", "Vitamin D"] },
      { key: "frequency", kind: "select", options: ["daily", "twice_daily", "weekly", "as_needed", "other"] },
    ],
  },
  { id: "allergies_has", type: "yesno", section: "history", required: true, group: "medicines" },
  {
    id: "allergies", type: "allergies", section: "history", required: true, showIf: { q: "allergies_has", op: "eq", value: "yes" }, group: "medicines",
    entryFields: [
      { key: "substance", kind: "select", required: true, options: ["penicillin", "sulfa", "nsaids", "latex", "food", "other"] },
      { key: "reaction", kind: "select", required: true, options: ["rash", "swelling", "breathing", "anaphylaxis", "stomach", "unknown"] },
    ],
  },
  {
    id: "family_history", type: "multi", section: "history", required: true, skippable: ["skip", "private"],
    options: ["diabetes", "hypertension", "breast_cancer", "ovarian_cancer", "uterine_cancer", "thyroid", "clotting", "pcos", "early_menopause", "none", "notsure"],
    exclusive: ["none", "notsure"], group: "family",
  },
];

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

export const YES_NO_VALUES = YES_NO;
export const YES_NO_NOT_SURE = ["yes", "no", "notsure"];

/**
 * Starter alert rules. They ship DISABLED and UNAPPROVED: the treating clinician decides which
 * apply, edits the patient wording, and enables them in Settings. Nothing here is a clinical protocol.
 */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  { id: "pregnancy_bleeding", label: "Bleeding reported during pregnancy", when: { q: "pregnancy_concerns", op: "includes", value: "bleeding" }, severity: "urgent", patientMessage: "", enabled: false, approved: false },
  { id: "pregnancy_movement", label: "Reduced baby movement reported", when: { q: "pregnancy_concerns", op: "includes", value: "reduced_movement" }, severity: "urgent", patientMessage: "", enabled: false, approved: false },
  { id: "postmenopausal_bleeding", label: "Bleeding after menopause reported", when: { q: "menopause_bleeding", op: "eq", value: "yes" }, severity: "review", patientMessage: "", enabled: false, approved: false },
  { id: "postpartum_bleeding", label: "Heavy bleeding after delivery reported", when: { q: "pp_symptoms", op: "includes", value: "heavy_bleeding" }, severity: "urgent", patientMessage: "", enabled: false, approved: false },
  { id: "postpartum_mood", label: "Low mood after delivery reported", when: { q: "pp_symptoms", op: "includes", value: "low_mood" }, severity: "review", patientMessage: "", enabled: false, approved: false },
  { id: "severe_pelvic_pain", label: "Severe pelvic pain reported", when: { q: "pain_severity", op: "eq", value: "severe" }, severity: "review", patientMessage: "", enabled: false, approved: false },
];
