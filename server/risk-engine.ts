import { ai } from "./replit_integrations/image/client";
import { storage } from "./storage";

export interface RiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface RiskScore {
  level: "Low" | "Medium" | "High" | "Critical";
  score: number;
  factors: RiskFactor[];
  recommendations: string[];
  patientSummary: string;
  updatedAt: string;
}

export interface TrimesterChecklistItem {
  category: "Scan" | "Vaccine" | "Lab Test" | "Vitals" | "Lifestyle" | "Consultation";
  task: string;
  dueWeek: number | null;
  done: boolean;
  urgent: boolean;
}

export interface TrimesterChecklist {
  trimester: 1 | 2 | 3;
  weekRange: string;
  currentWeek: number;
  items: TrimesterChecklistItem[];
  generatedAt: string;
}

export async function scorePatient(patientId: number): Promise<RiskScore | null> {
  try {
    const patient = await storage.getPatient(patientId);
    if (!patient) return null;

    const [labResults, visitHistory, medications, pregnancyMetrics] = await Promise.all([
      storage.getLabResults(patientId),
      storage.getVisitHistory(patientId),
      storage.getMedications(patientId),
      storage.getPregnancyMetrics(patientId),
    ]);

    const context = {
      name: patient.name,
      age: patient.age,
      type: patient.type,
      bp: patient.bp,
      hb: patient.hb,
      weight: patient.weight,
      lmp: patient.lmp,
      pregnancyStatus: patient.pregnancyStatus,
      condition: patient.condition,
      recentLabResults: labResults.slice(-12).map((lr) => ({
        testName: lr.testName,
        value: lr.value,
        unit: lr.unit,
        status: lr.status,
        date: lr.date,
        referenceMin: lr.referenceMin,
        referenceMax: lr.referenceMax,
      })),
      recentVisits: visitHistory.slice(-3).map((v) => ({
        date: v.date,
        diagnosis: v.diagnosis,
        assessment: v.assessment,
        outcome: v.outcome,
        vitals: v.vitals,
      })),
      activeMedications: medications
        .filter((m) => m.status === "active" || !m.status)
        .map((m) => m.name),
      pregnancyMetrics: pregnancyMetrics.slice(-2),
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a clinical risk assessment AI for a women's reproductive health clinic in India. Analyse this patient's data and return a structured risk score.

Patient Data:
${JSON.stringify(context, null, 2)}

Return a JSON object with exactly these fields:
{
  "level": "Low" | "Medium" | "High" | "Critical",
  "score": number between 0 and 100 (100 = highest risk),
  "factors": [
    { "factor": "brief factor name", "severity": "low" | "medium" | "high", "detail": "1-2 sentence clinical explanation" }
  ],
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "patientSummary": "2-3 sentences in warm, supportive, plain language (not clinical jargon) explaining what this patient should pay attention to this week"
}

Risk level rules:
- Low (0-30): Stable patient, routine monitoring
- Medium (31-60): Requires attention, schedule review
- High (61-80): Needs prompt clinical action within 1-2 days
- Critical (81-100): Urgent clinical attention needed today

Focus on: abnormal lab values (anaemia, high glucose, abnormal thyroid), high BP, missed follow-up scans, overdue vaccines, unusual pregnancy metrics, or concerning clinical notes. If no significant data exists, return Low risk with a note that more data is needed.`,
            },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const text = response.text || "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const riskScore: RiskScore = {
      level: parsed.level || "Low",
      score: typeof parsed.score === "number" ? parsed.score : 0,
      factors: Array.isArray(parsed.factors) ? parsed.factors : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      patientSummary: parsed.patientSummary || "",
      updatedAt: new Date().toISOString(),
    };

    await storage.updatePatient(patientId, { riskScore } as any);
    console.log(`[risk-engine] Scored patient ${patient.name} (#${patientId}): ${riskScore.level} (${riskScore.score})`);
    return riskScore;
  } catch (err: any) {
    console.error(`[risk-engine] Failed to score patient ${patientId}:`, err.message);
    return null;
  }
}

export async function generateTrimesterChecklist(patientId: number): Promise<TrimesterChecklist | null> {
  try {
    const patient = await storage.getPatient(patientId);
    if (!patient || !patient.lmp) return null;

    const lmpDate = new Date(patient.lmp);
    const diffDays = Math.floor((Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.max(1, Math.floor(diffDays / 7));
    const trimester: 1 | 2 | 3 = currentWeek < 13 ? 1 : currentWeek < 27 ? 2 : 3;

    const [labResults, medications] = await Promise.all([
      storage.getLabResults(patientId),
      storage.getMedications(patientId),
    ]);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate a pregnancy trimester checklist for a patient currently at week ${currentWeek} of pregnancy (Trimester ${trimester}).

Patient context:
- Age: ${patient.age}
- LMP: ${patient.lmp}
- Current week: ${currentWeek}
- Recent lab results: ${labResults.slice(-6).map((lr) => `${lr.testName}: ${lr.value ?? "?"} ${lr.unit || ""} (${lr.status || "unknown"})`).join(", ") || "None recorded"}
- Active medications: ${medications.filter((m) => m.status === "active" || !m.status).map((m) => m.name).join(", ") || "None recorded"}

Return a JSON object:
{
  "trimester": ${trimester},
  "weekRange": "${trimester === 1 ? "1-12" : trimester === 2 ? "13-26" : "27-40"}",
  "currentWeek": ${currentWeek},
  "items": [
    {
      "category": "Scan" | "Vaccine" | "Lab Test" | "Vitals" | "Lifestyle" | "Consultation",
      "task": "specific, actionable task description",
      "dueWeek": number or null (week number when this should be done),
      "done": false,
      "urgent": boolean (true if overdue based on current week ${currentWeek} or medically urgent)
    }
  ]
}

Include 8-12 specific, clinically accurate items relevant to week ${currentWeek} pregnancy in India. Consider standard ANC (Antenatal Care) protocols. Mark items as urgent if they are overdue or critical.`,
            },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const text = response.text || "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const checklist: TrimesterChecklist = {
      trimester: parsed.trimester || trimester,
      weekRange: parsed.weekRange || "",
      currentWeek,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      generatedAt: new Date().toISOString(),
    };

    await storage.updatePatient(patientId, { trimesterChecklist: checklist } as any);
    console.log(`[risk-engine] Generated trimester checklist for patient ${patient.name} (#${patientId}): week ${currentWeek}`);
    return checklist;
  } catch (err: any) {
    console.error(`[risk-engine] Failed to generate checklist for patient ${patientId}:`, err.message);
    return null;
  }
}

export async function batchScorePatients(patientIds?: number[]): Promise<{ scored: number; failed: number }> {
  const patients = await storage.getPatients();
  const targets = patientIds
    ? patients.filter((p) => patientIds.includes(p.id))
    : patients;

  let scored = 0;
  let failed = 0;

  for (const patient of targets) {
    const result = await scorePatient(patient.id);
    if (result) scored++;
    else failed++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return { scored, failed };
}
