import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { generateDietChartHTML, type SavedDietProtocol } from "./dietChart";

const patient = { id: 7, name: "Synthetic <Patient>", age: 30, height: "160", weight: "64", condition: "Recorded condition" };
const protocol: SavedDietProtocol = {
  id: 3, patientId: 7, primaryGoal: "insulin", dietaryStrategy: "mediterranean",
  weeklyPlan: {
    Monday: [{ time: "08:00", name: "Breakfast", item: "Recorded meal <script>alert(1)</script>", qty: "1 bowl", macros: "300 kcal" }],
    Tuesday: [{ time: "13:00", name: "Lunch", item: "Recorded lunch", qty: "100 g" }],
    Sunday: [{ name: "Dinner", item: "" }],
  },
  notes: "Saved notes & instructions", savedBy: "Synthetic nutritionist", savedAt: "2026-11-14T10:00:00Z",
};

test("diet chart follows reference sections with recorded weekday meals and saved attribution", () => {
  const html = generateDietChartHTML(patient, protocol);
  for (const text of ["Saivie complete women care · Lifestyle", "Diagnosis:", "Advice:", "Medical history:", "Nutrient",
    "Monday · Meal plan", "Tuesday · Meal plan", "Foods to be taken", "Foods to be restricted", "Foods to be avoided",
    "1 bowl", "100 g", "300 kcal", "Synthetic nutritionist", "Saved protocol:</strong> #3", "25.0"])
    assert.ok(html.includes(text), text);
  assert.ok(!html.includes("Sunday · Meal plan"));
  assert.ok(html.includes("Improve Insulin Sensitivity"));
  assert.ok(html.includes("Mediterranean Diet"));
  assert.equal((html.match(/<section class="page(?: [^"]+)?">/g) || []).length, 4);
  assert.ok(html.includes("@page { size: A4"));
  assert.ok(html.includes("break-after: page"));
});

test("patient and saved meal content are escaped and absent clinical guidance is not invented", () => {
  const html = generateDietChartHTML(patient, protocol);
  assert.ok(html.includes("Synthetic &lt;Patient&gt;"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("Saved notes &amp; instructions"));
  assert.ok(html.includes("<li>Protein: <strong>Not recorded</strong></li>"));
  assert.ok(!html.includes("1650"));
  assert.ok(!html.includes("Mild calorie deficit"));
  const missing = generateDietChartHTML({ id: 7, name: "Synthetic", height: "not measured" }, protocol);
  assert.ok(missing.includes("BMI (kg/m²):</strong> Not recorded"));
});

test("empty, invalid and cross-patient saved protocols cannot produce a diet chart", () => {
  assert.throws(() => generateDietChartHTML({ ...patient, id: 8 }, protocol), /another patient/);
  assert.throws(() => generateDietChartHTML(patient, { ...protocol, weeklyPlan: { Monday: [{ item: " " }] } }), /no recorded meals/);
  assert.throws(() => generateDietChartHTML(patient, null));
  assert.throws(() => generateDietChartHTML(patient, { ...protocol, weeklyPlan: { Monday: "invalid" } }));
});

test("reference branding, Montserrat fonts and pink/mauve print colors use local assets", () => {
  const html = generateDietChartHTML(patient, protocol, "https://saivie.example");
  for (const asset of ["diet-chart-brand.png", "diet-chart-montserrat-regular.ttf", "diet-chart-montserrat-bold.ttf"])
    assert.ok(html.includes(`https://saivie.example/${asset}`));
  for (const css of ["background: #faebf6", "background: #e6c3db", "border-radius: 5mm",
    "print-color-adjust: exact", "font: 12pt Montserrat", "border-spacing: 2mm 3mm"])
    assert.ok(html.includes(css), css);
  assert.ok(html.includes("<th>Time</th><th>Recipe</th>"));
  assert.ok(!html.includes("fonts.googleapis.com"));
});

test("print is connected to the saved query rather than the unsaved editor and saves refresh it", () => {
  const source = readFileSync(new URL("../pages/StaffPatientProtocol.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("openDietChart(patient, protocolQuery.data)"));
  assert.ok(source.includes("await protocolQuery.refetch()"));
  assert.ok(source.includes('data-testid="button-print-diet-chart"'));
  const storage = readFileSync(new URL("../../../api-server/src/storage.ts", import.meta.url), "utf8");
  assert.ok(storage.includes(".orderBy(desc(patientProtocols.id)).limit(1)"));
});
