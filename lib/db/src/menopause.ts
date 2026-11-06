import { z } from "zod/v4";

export const menopauseSymptoms = {
  hotFlushes: "Hot flushes / night sweats",
  sleep: "Sleep difficulties",
  mood: "Mood / emotional wellbeing",
  vaginal: "Vaginal dryness / discomfort",
  urinary: "Urinary symptoms",
  physical: "Joint / muscle discomfort",
  sexual: "Sexual concerns",
} as const;
export const menopauseStages = ["Uncertain / needs assessment", "Premenopause", "Perimenopause", "Postmenopause"] as const;
export const menopauseContexts = ["Not established", "Natural transition", "Surgical", "Treatment-related", "Other"] as const;
export const answerOptions = ["Not answered", "No", "Yes", "Not sure"] as const;
const text = z.string().trim().max(4000);
const answer = z.enum(answerOptions);
const symptoms = z.object({
  hotFlushes: z.number().int().min(0).max(3).nullable(),
  sleep: z.number().int().min(0).max(3).nullable(),
  mood: z.number().int().min(0).max(3).nullable(),
  vaginal: z.number().int().min(0).max(3).nullable(),
  urinary: z.number().int().min(0).max(3).nullable(),
  physical: z.number().int().min(0).max(3).nullable(),
  sexual: z.number().int().min(0).max(3).nullable(),
}).strict();
export const menopauseSafetyLabels = {
  bleeding: "Bleeding after periods stopped / unexplained bleeding",
  breast: "New breast lump or concerning breast change",
  pelvic: "Severe pelvic pain",
  mental: "Thoughts of self-harm / feeling unsafe",
} as const;
const safety = z.object({ bleeding: answer, breast: answer, pelvic: answer, mental: answer }).strict();
export const menopauseIntakeSchema = z.object({
  lmp: z.iso.date().nullable(),
  cycle: z.enum(["Not answered", "Regular", "Irregular", "Increasingly infrequent", "No periods", "Heavy / prolonged", "Not sure"]),
  uterus: z.enum(["Not answered", "Present", "Removed", "Not sure"]),
  ovaries: z.enum(["Not answered", "Both present", "One removed", "Both removed", "Not sure"]),
  surgeryDetails: text,
  hormonalContraception: text,
  hormoneTherapy: text,
  medicalHistory: text,
  medications: text,
  priorities: text.min(1, "Please record the patient's main concern or goal."),
  impact: text,
  symptoms,
  safety,
}).strict();
export const menopauseTrackingSchema = z.object({
  symptoms,
  impact: text,
  adherence: z.enum(["Not answered", "Not on treatment", "As agreed", "Some missed", "Stopped / changed", "Not sure"]),
  sideEffects: text,
  safety,
}).strict().refine((value) => Object.values(value.symptoms).some((entry) => entry !== null)
  || Object.values(value.safety).some((entry) => entry === "Yes") || !!value.impact || !!value.sideEffects || value.adherence !== "Not answered",
{ message: "Record a symptom, concern or treatment effect before saving." });
export const menopauseAssessmentSchema = z.object({
  stage: z.enum(menopauseStages),
  context: z.enum(menopauseContexts),
  earlyMenopause: answer,
  suspectedPoi: answer,
  findings: text.min(1, "Record your assessment."),
  examination: text,
  safetyReview: text.min(1, "Document the safety assessment and any action needed."),
  treatmentDiscussion: text,
}).strict();
export const menopausePlanSchema = z.object({
  assessmentId: z.number().int().positive(),
  status: z.enum(["Draft", "Approved"]),
  summary: text.min(1, "Record a patient-facing health summary."),
  treatment: text,
  lifestyle: text,
  investigations: text,
  goals: text,
  safetyAdvice: text.min(1, "Record patient safety / contact advice."),
  reviewDate: z.iso.date().nullable(),
  safetyReviewed: z.boolean(),
}).strict().refine((value) => value.status !== "Approved" || (value.safetyReviewed && value.reviewDate !== null),
  { message: "Approval requires clinician safety review and a review date." });

export const menopauseRecordSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("intake"), data: menopauseIntakeSchema }).strict(),
  z.object({ kind: z.literal("tracking"), data: menopauseTrackingSchema }).strict(),
  z.object({ kind: z.literal("assessment"), data: menopauseAssessmentSchema }).strict(),
  z.object({ kind: z.literal("plan"), data: menopausePlanSchema }).strict(),
]);
export const menopauseSubmissionSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  date: z.iso.date(),
  appointmentId: z.number().int().positive().max(2147483647).nullable(),
  record: menopauseRecordSchema,
}).strict();
export const menopauseEnrollmentSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  enabled: z.boolean(),
  reason: text.min(1, "Record the reason for this change."),
}).strict();
export type MenopauseIntake = z.infer<typeof menopauseIntakeSchema>;
export type MenopauseTracking = z.infer<typeof menopauseTrackingSchema>;
export type MenopauseAssessment = z.infer<typeof menopauseAssessmentSchema>;
export type MenopausePlan = z.infer<typeof menopausePlanSchema>;
export type MenopauseRecord = z.infer<typeof menopauseRecordSchema>;
export type MenopauseSubmission = z.infer<typeof menopauseSubmissionSchema>;
export type MenopauseEnrollment = z.infer<typeof menopauseEnrollmentSchema>;
export type MenopauseSymptoms = MenopauseIntake["symptoms"];
export type MenopauseSafety = MenopauseIntake["safety"];
export const menopauseEntrySchema = z.object({
  id: z.number().int().positive(),
  date: z.iso.date(),
  appointmentId: z.number().int().positive().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  recordedBy: z.string(),
  source: z.enum(["Patient", "Clinician"]),
  record: menopauseRecordSchema,
  approvedStage: z.string().nullable().optional(),
});
export const menopauseStateSchema = z.object({
  enabled: z.boolean(),
  version: z.number().int().nonnegative(),
  entries: z.array(menopauseEntrySchema),
});
export type MenopauseEntry = z.infer<typeof menopauseEntrySchema>;
export type MenopauseState = z.infer<typeof menopauseStateSchema>;
export const emptyMenopauseSymptoms = (): MenopauseSymptoms => ({
  hotFlushes: null, sleep: null, mood: null, vaginal: null, urinary: null, physical: null, sexual: null,
});
export const emptyMenopauseSafety = (): MenopauseSafety => ({
  bleeding: "Not answered", breast: "Not answered", pelvic: "Not answered", mental: "Not answered",
});
export const emptyMenopauseIntake = (): MenopauseIntake => ({
  lmp: null, cycle: "Not answered", uterus: "Not answered", ovaries: "Not answered",
  surgeryDetails: "", hormonalContraception: "", hormoneTherapy: "", medicalHistory: "", medications: "",
  priorities: "", impact: "", symptoms: emptyMenopauseSymptoms(), safety: emptyMenopauseSafety(),
});
export function menopausePatientView(state: MenopauseState): MenopauseState {
  return { ...state, entries: state.entries.filter((entry) => entry.record.kind === "intake" || entry.record.kind === "tracking"
    || entry.record.kind === "plan" && entry.record.data.status === "Approved") };
}
export function menopauseConcerns(safety: MenopauseSafety): string[] {
  return (Object.keys(menopauseSafetyLabels) as (keyof MenopauseSafety)[])
    .filter((key) => safety[key] === "Yes").map((key) => menopauseSafetyLabels[key]);
}
export function menopauseComparison(entries: MenopauseEntry[]) {
  const observations = entries.filter((entry) => entry.record.kind === "intake" || entry.record.kind === "tracking")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  return (Object.keys(menopauseSymptoms) as (keyof MenopauseSymptoms)[]).map((key) => {
    const readings = observations.flatMap((entry) => {
      if (entry.record.kind !== "intake" && entry.record.kind !== "tracking") return [];
      const value = entry.record.data.symptoms[key];
      return value === null ? [] : [{ value, date: entry.date, source: entry.source }];
    });
    return { key, label: menopauseSymptoms[key], baseline: readings[0], latest: readings.length > 1 ? readings.at(-1) : undefined, readings };
  });
}
