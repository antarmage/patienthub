export type ModuleId =
  | "adolescent"
  | "menstrual"
  | "pcos"
  | "contraception"
  | "pregnancy"
  | "fertility"
  | "menopause"
  | "postpartum"
  | "preventive";

export type InputType =
  | "single"
  | "multi"
  | "yesno"
  | "date"
  | "number"
  | "text"
  | "meds"
  | "surgeries"
  | "allergies";

export type Section = "reason" | "module" | "history";

export type SummaryGroup =
  | "reason"
  | "symptoms"
  | "menstrual"
  | "reproductive"
  | "conditions"
  | "medicines"
  | "family"
  | "preventive";

export type SkipKind = "skip" | "private";

/** A condition on earlier answers. Unanswered or skipped parents never satisfy a condition. */
export type Cond =
  | { q: string; op: "eq" | "neq"; value: string }
  | { q: string; op: "in"; value: string[] }
  | { q: string; op: "includes"; value: string }
  | { q: string; op: "hasAny" }
  | { q: string; op: "gt"; value: number }
  | { all: Cond[] }
  | { any: Cond[] };

export interface EntryField {
  key: string;
  kind: "text" | "select" | "year";
  options?: string[];
  suggestions?: string[];
  required?: boolean;
}

export interface Question {
  id: string;
  type: InputType;
  section: Section;
  /** Modules that ask this question. Shared questions list several modules and are asked once. */
  modules?: ModuleId[];
  showIf?: Cond;
  required?: boolean;
  /** Which "skip" answers the patient may give instead of a value. */
  skippable?: SkipKind[];
  options?: string[];
  /** Option values that cannot be combined with any other option (multi-select). */
  exclusive?: string[];
  min?: number;
  max?: number;
  decimal?: boolean;
  allowFuture?: boolean;
  noNotSure?: boolean;
  entryFields?: EntryField[];
  group: SummaryGroup;
  /** Notation or wording that the treating clinician must validate before release. */
  clinicianReview?: boolean;
}

/** An answer. "No" is a real value; a missing entry means the question is unanswered. */
export type AnswerValue = string | number | string[] | Record<string, string>[];
export interface Answer {
  v?: AnswerValue;
  s?: SkipKind;
}
export type Answers = Record<string, Answer>;

export interface AlertRule {
  id: string;
  label: string;
  when: Cond;
  severity: "urgent" | "review";
  /** Shown to the patient immediately when the rule fires. */
  patientMessage: string;
  enabled: boolean;
  /** True only after the treating clinician has signed the rule off. */
  approved: boolean;
}

export interface FiredAlert {
  ruleId: string;
  label: string;
  severity: "urgent" | "review";
  patientMessage: string;
}

export interface StepPlanItem {
  id: string;
  kind: "welcome" | "identity" | "reasons" | "module" | "history" | "review";
  module?: ModuleId;
  questionIds: string[];
}
