import { z } from "zod/v4";
import { dietChartDetailsSchema } from "../../../../lib/db/src/diet-chart";

const mealSchema = z.object({
  time: z.string().optional(), name: z.string().optional(), item: z.string().optional(),
  qty: z.string().optional(), macros: z.string().optional(),
});
export const savedDietProtocolSchema = z.object({
  id: z.number().int().positive(), patientId: z.number().int().positive(),
  primaryGoal: z.string().nullable(), dietaryStrategy: z.string().nullable(),
  weeklyPlan: z.record(z.string(), z.array(mealSchema)),
  notes: z.string().nullable(), savedBy: z.string().nullable(), savedAt: z.string().nullable(),
  chartDetails: dietChartDetailsSchema.nullable().optional(),
});
export type SavedDietProtocol = z.infer<typeof savedDietProtocolSchema>;
export type DietChartPatient = {
  id: number; name: string; age?: string | number | null; height?: string | number | null;
  weight?: string | number | null; condition?: string | null;
};

const escape = (value: string | number) => String(value).replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const recorded = (value: string | number | null | undefined) =>
  value == null || String(value).trim() === "" ? "Not recorded" : escape(value);
const goals: Record<string, string> = {
  inflammation: "Reduce Inflammation (hs-CRP)", insulin: "Improve Insulin Sensitivity", hormone: "Hormone Balance",
};
const strategies: Record<string, string> = {
  "anti-inflammatory": "Anti-Inflammatory & Low GI", "low-histamine": "Low Histamine Protocol", mediterranean: "Mediterranean Diet",
};
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function generateDietChartHTML(patient: DietChartPatient, input: unknown, assetOrigin = ""): string {
  const protocol = savedDietProtocolSchema.parse(input);
  if (protocol.patientId !== patient.id) throw new Error("Saved diet protocol belongs to another patient.");
  const details = protocol.chartDetails;
  if (details) patient = { ...patient, name: details.patientSnapshot.name, age: details.patientSnapshot.age,
    height: details.patientSnapshot.heightCm, weight: details.patientSnapshot.weightKg };
  const height = Number(patient.height), weight = Number(patient.weight);
  const bmi = Number.isFinite(height) && height >= 30 && height <= 250 &&
    Number.isFinite(weight) && weight > 0 && weight <= 500 ? (weight / (height / 100) ** 2).toFixed(1) : null;
  const plannedDays = days.filter((day) => protocol.weeklyPlan[day]?.some((meal) => meal.item?.trim()));
  if (!plannedDays.length) throw new Error("The saved protocol has no recorded meals. Save a meal plan before printing.");
  const advice = [protocol.primaryGoal ? goals[protocol.primaryGoal] || protocol.primaryGoal : null,
    protocol.dietaryStrategy ? strategies[protocol.dietaryStrategy] || protocol.dietaryStrategy : null].filter(Boolean).join(" · ");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Diet chart - ${escape(patient.name)}</title>
    <style>
      @font-face { font-family: Montserrat; font-weight: 400; src: url("${escape(assetOrigin)}/diet-chart-montserrat-regular.ttf") format("truetype"); }
      @font-face { font-family: Montserrat; font-weight: 700; src: url("${escape(assetOrigin)}/diet-chart-montserrat-bold.ttf") format("truetype"); }
      @page { size: A4; margin: 12mm 9mm; }
      * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      body { margin: 0; color: #000; background: #fff; font: 12pt Montserrat, Arial, sans-serif; line-height: 1.4; }
      .page { width: 100%; max-width: 192mm; min-height: 273mm; margin: 24px auto; padding: 0; }
      .cover { display: flex; flex-direction: column; gap: 8mm; }
      .brand { display: block; width: 112mm; max-width: 90%; height: auto; margin: 0 auto 2mm; }
      h2 { margin: 0 0 4mm; font-size: 12pt; font-weight: 700; color: #000; }
      p, td { white-space: pre-wrap; overflow-wrap: anywhere; }
      .panel { background: #faebf6; border: 0.25mm solid #e8b8da; padding: 7mm; }
      .rounded { border-radius: 5mm; } .patient-details p { margin: 0 0 6mm; }
      .patient-details p:last-child { margin-bottom: 0; }
      .meta { display: flex; flex-wrap: wrap; gap: 3mm 8mm; margin-bottom: 6mm; }
      .nutrients { padding-top: 12mm; padding-bottom: 12mm; } .nutrients ul { margin: 0; padding-left: 7mm; }
      .nutrients li { margin: 0 0 2mm; } .nutrients li:last-child { margin: 0; }
      .note { color: #444; font-size: 8pt; margin: 2mm 0; }
      .signoff { margin-top: auto; padding-top: 5mm; } .signoff strong { display: block; border-bottom: 0.25mm solid #000; padding-bottom: 3mm; }
      .signoff p { margin: 4mm 0 0; } .saved { font-size: 8pt; }
      .meal-heading { font-size: 9pt; font-weight: 400; margin: 0 2mm 3mm; }
      table { width: calc(100% + 4mm); margin: 0 -2mm; border-collapse: separate; border-spacing: 2mm 3mm; table-layout: fixed; }
      th, td { padding: 4mm 3mm; text-align: left; vertical-align: middle; }
      th:first-child, td:first-child { width: 22%; background: #e6c3db; border: 0; text-align: center; }
      th:last-child, td:last-child { background: #faebf6; border: 0.25mm solid #e8b8da; }
      td { height: 25mm; } tr { break-inside: avoid; } thead { display: table-header-group; }
      .meal-name, .meal-meta { display: block; font-size: 9pt; margin: 1mm 0; }
      .guidance h2 { text-transform: uppercase; margin-top: 6mm; } .guidance h2:first-child { margin-top: 0; }
      .guidance .panel { min-height: 30mm; margin-bottom: 6mm; padding: 4mm 3mm; }
      .guidance .panel p { margin: 0; }
      button { display: block; margin: 20px auto; padding: 12px 20px; cursor: pointer; }
      @media screen and (max-width: 760px) { .page { padding: 12px; min-height: auto; } }
      @media print { .page { margin: 0; padding: 0; break-after: page; } .page:last-child { break-after: auto; } .no-print { display: none; } }
    </style></head><body><button class="no-print" onclick="window.print()">Print / Save as PDF</button>
    <section class="page cover"><img class="brand" src="${escape(assetOrigin)}/diet-chart-brand.png" alt="Saivie complete women care · Lifestyle">
      <div class="panel rounded patient-details"><p><strong>Name:</strong> ${escape(patient.name)}</p><p><strong>Age:</strong> ${recorded(patient.age)}${patient.age != null ? " years" : ""}</p>
      <div class="meta"><div><strong>Height:</strong> ${recorded(patient.height)} cm</div>
      <div><strong>Weight:</strong> ${recorded(patient.weight)} kg</div><div><strong>BMI (kg/m²):</strong> ${recorded(bmi)}</div></div>
      <p><strong>Consultant:</strong> ${recorded(details?.consultant.name || protocol.savedBy)}</p>
      <p><strong>Diagnosis:</strong> ${recorded(patient.condition)}<br><strong>Advice:</strong> ${recorded(details?.advice || advice)}</p>
      <p><strong>Medical history:</strong> ${details ? recorded(details.medicalHistory) : "Not recorded in the saved nutrition protocol"}</p></div>
      <div class="panel rounded nutrients"><h2>Nutrient Requirement Remarks</h2><ul>
        ${details ? [
          ["Energy", details.nutrients.energyKcal, "kcal/day"], ["Protein", details.nutrients.proteinGrams, "g/day"],
          ["Carbohydrate", details.nutrients.carbohydrateGrams, "g/day"], ["Fat", details.nutrients.fatGrams, "g/day"],
        ].map(([name, value, unit]) => `<li>${name}: <strong>${value} ${unit}</strong></li>`).join("") :
          ["Energy", "Protein", "Carbohydrate", "Fat"].map((name) => `<li>${name}: <strong>Not recorded</strong></li>`).join("")}</ul></div>
      <div class="signoff"><strong>Lifestyle planned by:</strong><p>${recorded(details?.consultant.name || protocol.savedBy)}
        ${details ? `<br>${recorded(details.consultant.qualifications)}<br>${recorded(details.consultant.phone)}` : ""}</p>
        <p class="saved"><strong style="display:inline;border:0;padding:0">Saved protocol:</strong> #${protocol.id} · ${recorded(protocol.savedAt)}<br>Plan duration: ${recorded(details?.duration)}</p>
        <p class="note">${details ? `Measurements and nutrient targets transcribed from ${escape(details.source)}.` : "BMI is calculated from saved height/weight. Nutrient targets require clinician confirmation."}</p></div>
    </section>
    ${details?.dailyRequirements.length ? `<section class="page guidance"><h2>Measurement of uncooked weight per day</h2><div class="panel"><ol>
      ${details.dailyRequirements.map((requirement) => `<li>${escape(requirement)}</li>`).join("")}</ol></div></section>` : ""}
    ${plannedDays.map((day) => `<section class="page"><h2 class="meal-heading">${details?.dailySampleMenu ? "Daily sample menu" : `${day} · Meal plan`} · ${escape(patient.name)}</h2>
      <table><thead><tr><th>Time</th><th>Recipe</th></tr></thead><tbody>
        ${protocol.weeklyPlan[day].filter((meal) => meal.item?.trim()).map((meal) => `<tr><td>${recorded(meal.time)}</td><td><span class="meal-name">${recorded(meal.name)}</span>${recorded(meal.item)}<span class="meal-meta">Quantity: ${recorded(meal.qty)} · Nutrition: ${recorded(meal.macros)}</span></td></tr>`).join("")}
      </tbody></table></section>`).join("")}
    <section class="page guidance">
      ${[["Foods to be taken", details?.foodsToTake], ["Foods to be restricted", details?.foodsToRestrict], ["Foods to be avoided", details?.foodsToAvoid]]
        .map(([heading, value]) => `<h2>${heading}</h2><div class="panel"><p>${value ? escape(value) : "Not recorded in the saved nutrition protocol."}</p></div>`).join("")}
      <h2>Saved protocol notes</h2><div class="panel"><p>${recorded(protocol.notes)}</p></div>
      <p class="note">${escape(patient.name)} · Saved protocol #${protocol.id}. Only recorded guidance is included.</p>
    </section></body></html>`;
}

export function openDietChart(patient: DietChartPatient, protocol: unknown): boolean {
  const html = generateDietChartHTML(patient, protocol, window.location.origin);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const popup = window.open(url, "_blank");
  if (!popup) { URL.revokeObjectURL(url); return false; }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
