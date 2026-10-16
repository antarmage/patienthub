import { computeVisible, isAnswered, selectedModules, valueOf } from "./engine.ts";
import { getContent, optionLabel, type IntakeContent } from "./content.ts";
import type { Answer, Answers, FiredAlert, Question, SummaryGroup } from "./types.ts";

export type ItemStatus = "answered" | "skipped" | "private" | "unanswered";

export interface SummaryItem {
  id: string;
  label: string;
  display: string;
  status: ItemStatus;
  required: boolean;
  /** Question IDs whose original answers back this line. */
  sources: string[];
  note?: string;
}

export interface IntakeSummary {
  reasons: string[];
  modules: string[];
  groups: { group: SummaryGroup; title: string; items: SummaryItem[] }[];
  missing: SummaryItem[];
  privateItems: SummaryItem[];
  flags: FiredAlert[];
  reviewNotes: string[];
}

const GROUP_ORDER: SummaryGroup[] = ["reason", "symptoms", "menstrual", "reproductive", "conditions", "medicines", "family", "preventive"];

function statusOf(answer: Answer | undefined): ItemStatus {
  if (!isAnswered(answer)) return "unanswered";
  if (answer!.s === "skip") return "skipped";
  if (answer!.s === "private") return "private";
  return "answered";
}

export function displayAnswer(q: Question, answer: Answer | undefined, content: IntakeContent): string {
  const status = statusOf(answer);
  if (status === "skipped") return content.ui.skippedLabel;
  if (status === "private") return content.ui.privateLabel;
  if (status === "unanswered") return content.ui.notAnswered;
  const v = answer!.v;
  switch (q.type) {
    case "yesno":
      return content.ui[String(v)] ?? String(v);
    case "single":
      return optionLabel(content, q.id, String(v));
    case "multi":
      return (v as string[]).map((x) => optionLabel(content, q.id, x)).join(", ");
    case "date":
      return String(v).split("-").reverse().join("/");
    case "number":
      if (q.id === "cycle_length" || q.id === "period_days") return `${v} ${content.ui.unit_days}`;
      if (q.id === "menarche_age") return `${v} ${content.ui.unit_years}`;
      return String(v);
    case "text":
      return String(v);
    case "meds":
    case "surgeries":
    case "allergies":
      return (v as Record<string, string>[])
        .map((row) => {
          const fields = q.entryFields ?? [];
          const parts = fields
            .map((f) => row[f.key])
            .filter(Boolean)
            .map((val, i) => (fields[i]?.kind === "select" ? optionLabel(content, q.id, val as string) : val));
          return parts.join(" · ");
        })
        .join("; ");
  }
}

export function buildSummary(answers: Answers, rules: FiredAlert[], locale = "en"): IntakeSummary {
  const content = getContent(locale);
  const visible = computeVisible(answers);
  const groups = new Map<SummaryGroup, SummaryItem[]>();
  const missing: SummaryItem[] = [];
  const privateItems: SummaryItem[] = [];
  const reviewNotes: string[] = [];

  const push = (group: SummaryGroup, item: SummaryItem) => {
    if (item.status === "private") privateItems.push(item);
    if (item.required && (item.status === "unanswered" || item.status === "skipped")) missing.push(item);
    if (item.status === "unanswered" && !item.required) return;
    groups.set(group, [...(groups.get(group) ?? []), item]);
  };

  const obsIds = ["obs_gravida", "obs_para", "obs_abortions", "obs_living"];
  const obsDone = obsIds.every((id) => typeof valueOf(answers[id]) === "number");

  for (const q of visible) {
    if (q.id === "reasons" || q.id === "urgent_now") continue;
    if (obsIds.includes(q.id)) continue;
    const answer = answers[q.id];
    const status = statusOf(answer);
    push(q.group, {
      id: q.id,
      label: content.questions[q.id]?.label ?? q.id,
      display: status === "private" ? content.ui.privateLabel : displayAnswer(q, answer, content),
      status,
      required: !!q.required,
      sources: [q.id],
    });
  }

  if (visible.some((q) => q.id === "obs_gravida")) {
    const statuses = obsIds.map((id) => statusOf(answers[id]));
    const g = valueOf(answers.obs_gravida), p = valueOf(answers.obs_para), a = valueOf(answers.obs_abortions), l = valueOf(answers.obs_living);
    reviewNotes.push("Obstetric notation (G/P/A/L) is patient-entered; clinician to validate terminology.");
    push("reproductive", {
      id: "obs_notation",
      label: "Obstetric history (patient-entered)",
      display: obsDone ? `G${g} P${p} A${a} L${l}` : content.ui.notAnswered,
      status: obsDone ? "answered" : statuses.every((s) => s === "unanswered") ? "unanswered" : "answered",
      required: true,
      sources: obsIds,
      note: "Notation pending clinician validation",
    });
  }

  const reasonValue = valueOf(answers.reasons);
  const reasons = Array.isArray(reasonValue) ? (reasonValue as string[]) : [];
  return {
    reasons: reasons.map((r) => optionLabel(content, "reasons", r)),
    modules: selectedModules(answers).map((m) => content.modules[m].title),
    groups: GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ({ group: g, title: content.groups[g], items: groups.get(g)! })),
    missing,
    privateItems,
    flags: rules,
    reviewNotes,
  };
}

export function urgentSymptomLabels(answers: Answers, locale = "en"): string[] {
  const content = getContent(locale);
  const v = valueOf(answers.urgent_now);
  return Array.isArray(v) ? (v as string[]).filter((x) => x !== "none").map((x) => optionLabel(content, "urgent_now", x)) : [];
}
