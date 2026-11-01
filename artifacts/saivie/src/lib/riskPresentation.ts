import { historyRecord } from "./receptionPatientHistory";

export function presentPatientRisk(value: unknown) {
  const risk = historyRecord(value);
  const factors = Array.isArray(risk.factors) ? risk.factors : [];
  const missingDataOnly =
    factors.length > 0 &&
    factors.every((item) => {
      const factor = historyRecord(item).factor;
      return (
        typeof factor === "string" &&
        /^(?:(?:invalid|missing|unknown|unrecorded)[\s/,-]+)+(?:patient\s+)?age$|^(?:patient\s+)?age\s+(?:is\s+)?(?:missing|invalid|unknown|not recorded)$|^absence of vital signs(?: and baseline data)?$|^undetermined gestational age$|^(?:complete )?lack of clinical history$/i.test(
          factor.trim(),
        )
      );
    });
  if (!missingDataOnly) return value;
  return {
    ...risk,
    originalLevel: risk.originalLevel || risk.level,
    originalScore: risk.originalScore ?? risk.score,
    level: "Review required",
    score: null,
    reviewRequired: true,
    summary:
      "Previously scored using missing information rather than recorded clinical findings. Data gaps alone do not establish Critical clinical risk. Review the recorded assessment; this is not a normal-risk clearance.",
  };
}
