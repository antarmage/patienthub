import { MODULE_ORDER, QUESTIONS, QUESTION_BY_ID, REASON_MODULES } from "./bank.ts";
import type {
  AlertRule, Answer, Answers, Cond, FiredAlert, ModuleId, Question, StepPlanItem,
} from "./types.ts";

export const URGENT_RULE_ID = "patient_declared_urgent";
export const DEFAULT_URGENT_MESSAGE =
  "Please tell our front-desk team right away. If you feel unwell or unsafe, contact your local emergency number or go to the nearest emergency department.";

/** The plain value of an answer, or undefined when unanswered or skipped. */
export function valueOf(answer: Answer | undefined) {
  return answer && !answer.s ? answer.v : undefined;
}

export function isAnswered(answer: Answer | undefined): boolean {
  if (!answer) return false;
  if (answer.s) return true;
  const v = answer.v;
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function evalCond(cond: Cond, answers: Answers): boolean {
  if ("all" in cond) return cond.all.every((c) => evalCond(c, answers));
  if ("any" in cond) return cond.any.some((c) => evalCond(c, answers));
  const v = valueOf(answers[cond.q]);
  switch (cond.op) {
    case "eq": return v !== undefined && String(v) === cond.value;
    case "neq": return v !== undefined && String(v) !== cond.value;
    case "in": return v !== undefined && !Array.isArray(v) && cond.value.includes(String(v));
    case "includes": return Array.isArray(v) && (v as unknown[]).includes(cond.value);
    case "hasAny": return Array.isArray(v) && (v as unknown[]).some((x) => x !== "none" && x !== "notsure");
    case "gt": return typeof v === "number" && v > cond.value;
  }
}

export function selectedModules(answers: Answers): ModuleId[] {
  const reasons = valueOf(answers.reasons);
  if (!Array.isArray(reasons)) return [];
  const picked = new Set<ModuleId>();
  for (const reason of reasons as string[]) for (const m of REASON_MODULES[reason] ?? []) picked.add(m);
  return MODULE_ORDER.filter((m) => picked.has(m));
}

/**
 * Questions that apply to these answers, in bank order. Because parents precede children, a
 * question whose parent is itself hidden can never be shown: only visible answers feed conditions.
 */
export function computeVisible(answers: Answers): Question[] {
  const modules = new Set(selectedModules(answers));
  const effective: Answers = {};
  const visible: Question[] = [];
  for (const q of QUESTIONS) {
    let applies = true;
    if (q.section === "module") applies = !!q.modules?.some((m) => modules.has(m));
    if (applies && q.showIf) applies = evalCond(q.showIf, effective);
    if (!applies) continue;
    visible.push(q);
    if (answers[q.id]) effective[q.id] = answers[q.id];
  }
  return visible;
}

/** Remove only answers that are no longer applicable. "No" and skipped answers on applicable questions stay. */
export function clearStale(answers: Answers): { answers: Answers; cleared: string[] } {
  const visible = new Set(computeVisible(answers).map((q) => q.id));
  const kept: Answers = {};
  const cleared: string[] = [];
  for (const [id, answer] of Object.entries(answers)) {
    if (visible.has(id)) kept[id] = answer;
    else cleared.push(id);
  }
  return { answers: kept, cleared };
}

export function setAnswer(answers: Answers, id: string, answer: Answer | null) {
  const next = { ...answers };
  if (answer === null) delete next[id];
  else next[id] = answer;
  return clearStale(next);
}

/** Toggle a multi-select option, honouring exclusive options such as "none". */
export function toggleMulti(current: string[], option: string, exclusive: string[] = []): string[] {
  if (current.includes(option)) return current.filter((v) => v !== option);
  if (exclusive.includes(option)) return [option];
  return [...current.filter((v) => !exclusive.includes(v)), option];
}

/** Ordered steps. A question shared by several modules is shown once, in the first selected module. */
export function buildStepPlan(answers: Answers): StepPlanItem[] {
  const visible = computeVisible(answers);
  const plan: StepPlanItem[] = [
    { id: "welcome", kind: "welcome", questionIds: [] },
    { id: "identity", kind: "identity", questionIds: [] },
    { id: "reasons", kind: "reasons", questionIds: visible.filter((q) => q.section === "reason").map((q) => q.id) },
  ];
  const modules = selectedModules(answers);
  const assigned = new Set<string>();
  for (const module of modules) {
    const ids = visible
      .filter((q) => q.section === "module" && !assigned.has(q.id) && q.modules?.includes(module))
      .map((q) => q.id);
    ids.forEach((id) => assigned.add(id));
    if (ids.length) plan.push({ id: `module:${module}`, kind: "module", module, questionIds: ids });
  }
  plan.push({ id: "history", kind: "history", questionIds: visible.filter((q) => q.section === "history").map((q) => q.id) });
  plan.push({ id: "review", kind: "review", questionIds: [] });
  return plan;
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  errors: Record<string, string>;
  /** Visible required questions with no answer at all. */
  missing: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function validateValue(q: Question, v: unknown, today: string): string | null {
  switch (q.type) {
    case "single":
      return typeof v === "string" && q.options?.includes(v) ? null : "invalid_option";
    case "yesno": {
      const allowed = q.noNotSure ? ["yes", "no"] : ["yes", "no", "notsure"];
      return typeof v === "string" && allowed.includes(v) ? null : "invalid_option";
    }
    case "multi": {
      if (!Array.isArray(v) || v.length === 0) return "invalid_option";
      if (!v.every((x) => typeof x === "string" && q.options?.includes(x))) return "invalid_option";
      if (new Set(v).size !== v.length) return "invalid_option";
      if (v.length > 1 && v.some((x) => q.exclusive?.includes(x as string))) return "exclusive_conflict";
      return null;
    }
    case "date": {
      if (typeof v !== "string" || !isRealDate(v)) return "invalid_date";
      if (v < "1900-01-01") return "invalid_date";
      if (!q.allowFuture && v > today) return "future_date";
      return null;
    }
    case "number": {
      if (typeof v !== "number" || !Number.isFinite(v)) return "invalid_number";
      if (!q.decimal && !Number.isInteger(v)) return "invalid_number";
      if (q.min !== undefined && v < q.min) return "out_of_range";
      if (q.max !== undefined && v > q.max) return "out_of_range";
      return null;
    }
    case "text":
      return typeof v === "string" && v.length <= 1000 ? null : "too_long";
    case "meds":
    case "surgeries":
    case "allergies": {
      if (!Array.isArray(v) || v.length === 0 || v.length > 20) return "invalid_entries";
      const fields = q.entryFields ?? [];
      const year = Number(today.slice(0, 4));
      for (const entry of v as unknown[]) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "invalid_entries";
        const row = entry as Record<string, unknown>;
        if (Object.keys(row).some((k) => !fields.some((f) => f.key === k))) return "invalid_entries";
        for (const f of fields) {
          const val = row[f.key];
          const empty = val === undefined || val === "";
          if (empty) {
            if (f.required) return "entry_field_required";
            continue;
          }
          if (typeof val !== "string") return "invalid_entries";
          if (f.kind === "select" && !f.options?.includes(val)) return "invalid_entries";
          if (f.kind === "text" && val.length > 200) return "too_long";
          if (f.kind === "year" && !(/^\d{4}$/.test(val) && Number(val) >= 1950 && Number(val) <= year)) return "invalid_entries";
        }
      }
      return null;
    }
  }
}

export function validateAnswers(answers: Answers, opts: { requireComplete: boolean; today?: string }): ValidationResult {
  const today = opts.today ?? todayIso();
  const errors: Record<string, string> = {};
  const missing: string[] = [];
  const visible = computeVisible(answers);
  const visibleIds = new Set(visible.map((q) => q.id));

  for (const id of Object.keys(answers)) {
    if (!QUESTION_BY_ID[id]) errors[id] = "unknown_question";
    else if (!visibleIds.has(id)) errors[id] = "not_applicable";
  }

  for (const q of visible) {
    const answer = answers[q.id];
    if (!isAnswered(answer)) {
      if (opts.requireComplete && q.required) missing.push(q.id);
      continue;
    }
    if (answer!.s) {
      if (!q.skippable?.includes(answer!.s)) errors[q.id] = "skip_not_allowed";
      continue;
    }
    const err = validateValue(q, answer!.v, today);
    if (err) errors[q.id] = err;
  }

  const num = (id: string) => {
    const v = valueOf(answers[id]);
    return typeof v === "number" ? v : null;
  };
  const g = num("obs_gravida");
  const p = num("obs_para");
  const a = num("obs_abortions");
  const l = num("obs_living");
  if (g !== null && p !== null && a !== null && p + a > g && !errors.obs_para) errors.obs_para = "inconsistent_obstetric_counts";
  if (p !== null && l !== null && l > 20 && !errors.obs_living) errors.obs_living = "out_of_range";

  return { errors, missing };
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export function evaluateAlerts(answers: Answers, rules: AlertRule[], urgentMessage = DEFAULT_URGENT_MESSAGE): FiredAlert[] {
  const fired: FiredAlert[] = [];
  const urgent = valueOf(answers.urgent_now);
  if (Array.isArray(urgent) && (urgent as string[]).some((v) => v !== "none")) {
    fired.push({ ruleId: URGENT_RULE_ID, label: "Patient reported an urgent symptom", severity: "urgent", patientMessage: urgentMessage });
  }
  const visible = new Set(computeVisible(answers).map((q) => q.id));
  const effective: Answers = {};
  for (const [id, a] of Object.entries(answers)) if (visible.has(id)) effective[id] = a;
  for (const rule of rules) {
    if (!rule.enabled || !rule.approved) continue;
    if (evalCond(rule.when, effective)) {
      fired.push({ ruleId: rule.id, label: rule.label, severity: rule.severity, patientMessage: rule.patientMessage || urgentMessage });
    }
  }
  return fired;
}

/** Structural check for clinician-edited rules coming from the settings screen. */
export function parseAlertRules(input: unknown, knownIds = QUESTION_BY_ID): AlertRule[] | null {
  if (!Array.isArray(input) || input.length > 50) return null;
  const rules: AlertRule[] = [];
  const checkCond = (c: any): boolean => {
    if (!c || typeof c !== "object") return false;
    if (Array.isArray(c.all)) return c.all.length > 0 && c.all.every(checkCond);
    if (Array.isArray(c.any)) return c.any.length > 0 && c.any.every(checkCond);
    if (typeof c.q !== "string" || !knownIds[c.q]) return false;
    if (c.op === "hasAny") return true;
    if (c.op === "gt") return typeof c.value === "number";
    if (c.op === "in") return Array.isArray(c.value) && c.value.every((x: unknown) => typeof x === "string");
    if (c.op === "eq" || c.op === "neq" || c.op === "includes") return typeof c.value === "string";
    return false;
  };
  for (const r of input as any[]) {
    if (!r || typeof r.id !== "string" || typeof r.label !== "string" || !checkCond(r.when)) return null;
    if (r.severity !== "urgent" && r.severity !== "review") return null;
    if (typeof r.patientMessage !== "string" || r.patientMessage.length > 500) return null;
    rules.push({
      id: r.id.slice(0, 60), label: r.label.slice(0, 160), when: r.when, severity: r.severity,
      patientMessage: r.patientMessage, enabled: r.enabled === true, approved: r.approved === true,
    });
  }
  return rules;
}
