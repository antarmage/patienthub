export const assessmentStatuses = [
  "Working impression", "Confirmed diagnosis", "Symptom / problem", "Undetermined",
] as const;
export type AssessmentStatus = typeof assessmentStatuses[number];
export type EvidenceRelation = "supporting" | "challenging" | "contextual";
export interface EvidenceFact {
  id: string;
  label: string;
  value: string;
  source: string;
  date: string | null;
  relevant: boolean;
  href?: string;
  comparison?: string;
}
export interface EvidenceReview extends EvidenceFact {
  reviewed: boolean;
  relation: EvidenceRelation | "";
}
export interface AssessmentDraft {
  impression: string;
  status: AssessmentStatus | "";
  reasoning: string;
  evidence: EvidenceReview[];
}

export function readAssessment(value: unknown, legacy = ""): AssessmentDraft {
  const empty: AssessmentDraft = { impression: legacy, status: "", reasoning: "", evidence: [] };
  if (!value || typeof value !== "object") return empty;
  const data = value as Record<string, unknown>;
  return {
    impression: typeof data.impression === "string" ? data.impression : legacy,
    status: assessmentStatuses.find((status) => status === data.status) || "",
    reasoning: typeof data.reasoning === "string" ? data.reasoning : "",
    evidence: Array.isArray(data.evidence) ? data.evidence.filter((item): item is EvidenceReview =>
      !!item && typeof item === "object" && typeof item.id === "string" &&
      typeof item.label === "string" && typeof item.value === "string" && typeof item.source === "string" &&
      (item.date === null || typeof item.date === "string") && typeof item.reviewed === "boolean" &&
      ["", "supporting", "challenging", "contextual"].includes(item.relation),
    ) : [],
  };
}

// A review applies to the exact displayed value and provenance, never to a changed result.
export function evidenceKey(fact: EvidenceFact): string {
  return JSON.stringify([fact.id, fact.label, fact.value, fact.source, fact.date]);
}

export function assessmentText(draft: AssessmentDraft): string {
  return [
    draft.impression.trim(),
    draft.status ? `Status: ${draft.status}` : "",
    draft.reasoning.trim() ? `Clinical reasoning: ${draft.reasoning.trim()}` : "",
    ...draft.evidence.filter((fact) => fact.reviewed || fact.relation).map((fact) =>
      `${fact.relation ? `${fact.relation[0].toUpperCase()}${fact.relation.slice(1)}` : "Reviewed"}: ${fact.label}: ${fact.value} (${fact.source}; ${fact.date || "date not recorded"})${fact.relation && !fact.reviewed ? " [not marked reviewed]" : ""}`,
    ),
  ].filter(Boolean).join("\n");
}

interface EvidenceInput {
  answers: Record<string, string>;
  fromPatient: (question: string) => boolean;
  questions: string[];
  subjective: string;
  objective: string;
  appointmentDate?: string;
  surveyDate?: string;
  lmp?: string;
  visits: { id: number; date: string; assessment?: string | null; diagnosis?: string | null; planNotes?: string | null }[];
  labs: { id: number; testName: string; date: string; value?: number | null; unit?: string | null; status?: string | null; results?: unknown }[];
  documents: { id: number; name: string; type?: string | null; category?: string | null; date?: string | null }[];
  fertility: boolean;
}

export function assembleEvidence(input: EvidenceInput): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const add = (id: string, label: string, value: string | null | undefined, source: string, date: string | null, relevant = true) => {
    if (value?.trim()) facts.push({ id, label, value, source, date, relevant });
  };
  for (const [question, answer] of Object.entries(input.answers)) {
    add(`history:${question}`, question, answer, input.fromPatient(question) ? "Patient-reported survey" : "Clinician-entered history",
      input.fromPatient(question) ? input.surveyDate || null : input.appointmentDate || null, input.questions.includes(question));
  }
  add("subjective", "Reason / history", input.subjective, "Today's clinician note (reported history)", input.appointmentDate || null);
  add("objective", "Examination", input.objective, "Today's clinician examination note", input.appointmentDate || null);
  add("lmp", "LMP", input.lmp, "Patient record", null);
  for (const visit of [...input.visits].sort((a, b) => b.date.localeCompare(a.date))) {
    add(`visit:${visit.id}`, "Previous assessment", visit.assessment || visit.diagnosis, "Previous visit", visit.date, false);
    add(`plan:${visit.id}`, "Previous treatment / plan", visit.planNotes, "Previous visit", visit.date, false);
  }
  for (const lab of [...input.labs].sort((a, b) => b.date.localeCompare(a.date))) {
    const value = lab.value !== null && lab.value !== undefined ? `${lab.value}${lab.unit ? ` ${lab.unit}` : ""}`
      : lab.results != null ? JSON.stringify(lab.results) : "Result value not recorded";
    add(`lab:${lab.id}`, lab.testName, `${value}${lab.status ? ` · recorded status: ${lab.status}` : ""}`,
      "Stored laboratory result (not independently verified)", lab.date,
      !input.fertility || /amh|fsh|lh|tsh|prolactin|progesterone|semen|estradiol|oestradiol/i.test(lab.testName));
    const fact = facts.find((item) => item.id === `lab:${lab.id}`);
    const otherResults = input.labs.filter((other) => other.id !== lab.id &&
      other.testName.trim().toLowerCase() === lab.testName.trim().toLowerCase() &&
      other.value != null && lab.value != null && (other.value !== lab.value || other.unit !== lab.unit));
    if (fact && otherResults.length) {
      fact.comparison = `Other recorded values: ${otherResults.map((other) => `${other.value}${other.unit ? ` ${other.unit}` : ""} (${other.date})`).join("; ")}. Review differences; a change is not necessarily a clinical conflict.`;
    }
  }
  for (const document of [...input.documents].sort((a, b) => (b.date || "").localeCompare(a.date || ""))) {
    if (!/lab|blood|usg|ultrasound|scan/i.test(`${document.type} ${document.category}`)) continue;
    add(`document:${document.id}`, document.name, "Original report available; open to review contents", "Uploaded report", document.date || null, true);
  }
  const priority = [
    ...facts.filter((fact) => fact.id.startsWith("history:") && fact.relevant).slice(0, 2),
    ...facts.filter((fact) => fact.id === "objective"),
    ...facts.filter((fact) => fact.id.startsWith("lab:") && fact.relevant).slice(0, 1),
    ...facts.filter((fact) => fact.id.startsWith("document:")).slice(0, 1),
  ];
  const prioritized = new Set(priority.map((fact) => fact.id));
  return [...priority, ...facts.filter((fact) => !prioritized.has(fact.id))];
}
