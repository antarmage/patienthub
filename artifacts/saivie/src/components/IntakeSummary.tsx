import { useState } from "react";
import { AlertTriangle, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type WeightLog = { weight: number; unit: string; date: string; week: number | null };
type BpLog = { systolic: number; diastolic: number; pulse: number | null; date: string };

type Insight = { level: "alert" | "watch" | "info"; text: string };
type Metric = { label: string; value: string; hint?: string; tone?: "alert" | "watch" | "ok" };
type Section = { title: string; rows: [string, string][] };

type Summary = {
    name: string;
    meta: string[];
    concerns: string[];
    complaint: string;
    insights: Insight[];
    metrics: Metric[];
    bpRows: [string, string, string][];
    weightRows: [string, string][];
    sections: Section[];
    hasIntake: boolean;
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);
const num = (value: unknown) => {
    const n = Number(text(value));
    return Number.isFinite(n) && text(value) !== "" ? n : null;
};
const fmtDate = (value: string) => {
    const d = new Date(value);
    return value && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : value;
};
const ageFrom = (dob: string) => {
    const d = new Date(dob);
    if (!dob || Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
    return age;
};

type CheckInVitals = { bp?: unknown; pulse?: unknown; temp?: unknown; spo2?: unknown; weight?: unknown; height?: unknown; bmi?: unknown; recordedAt?: unknown };

function buildSummary(patient: any, weightLogs: WeightLog[], bpLogs: BpLog[], checkInVitals?: CheckInVitals | null): Summary {
    const history = patient?.history || {};
    const form = history.onboarding || {};
    const cycle = form.cycle || {};
    const gyn = form.gyn || {};
    const preg = form.pregnancies || {};
    const pain = form.pain || {};
    const life = form.lifestyle || {};
    const health = form.health || {};
    const insights: Insight[] = [];
    const metrics: Metric[] = [];

    const dob = text(form.dob) || text(patient?.dob) || text(patient?.dateOfBirth);
    const age = patient?.age || ageFrom(dob);
    const meta = [
        age ? `${age} yrs` : "",
        dob ? `DOB ${fmtDate(dob)}` : "",
        text(patient?.phone),
        text(form.occupation) && `Occupation: ${text(form.occupation)}`,
        text(form.referredBy || patient?.referredBy) && `Referred by: ${text(form.referredBy || patient?.referredBy)}`,
    ].filter(Boolean);

    // Vitals recorded by reception at check-in today take precedence over older readings.
    const cv = checkInVitals || {};
    const cvTime = text(cv.recordedAt) ? `Check-in · ${new Date(text(cv.recordedAt)).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Check-in";
    const cvBp = /^(\d+)\s*\/\s*(\d+)$/.exec(text(cv.bp));
    if (cvBp) {
        const s = Number(cvBp[1]);
        const d = Number(cvBp[2]);
        const tone = s >= 140 || d >= 90 ? "alert" : s >= 130 || d >= 85 ? "watch" : "ok";
        metrics.push({ label: "Blood pressure", value: `${s}/${d}`, hint: `mmHg · ${cvTime}`, tone });
        if (s >= 160 || d >= 110) insights.push({ level: "alert", text: `Severe-range BP ${s}/${d} mmHg at check-in.` });
        else if (tone === "alert") insights.push({ level: "alert", text: `Elevated BP ${s}/${d} mmHg at check-in.` });
    }
    const cvPulse = num(cv.pulse);
    if (cvPulse !== null) {
        metrics.push({ label: "Pulse", value: String(cvPulse), hint: `bpm · ${cvTime}`, tone: cvPulse > 100 || cvPulse < 50 ? "watch" : "ok" });
        if (cvPulse > 100) insights.push({ level: "watch", text: `Pulse ${cvPulse} bpm at check-in (tachycardia).` });
    }
    const cvTemp = num(cv.temp);
    if (cvTemp !== null) {
        metrics.push({ label: "Temperature", value: `${cvTemp} °F`, hint: cvTime, tone: cvTemp >= 100.4 ? "alert" : "ok" });
        if (cvTemp >= 100.4) insights.push({ level: "alert", text: `Fever ${cvTemp} °F at check-in.` });
    }
    const cvSpo2 = num(cv.spo2);
    if (cvSpo2 !== null) {
        metrics.push({ label: "SpO₂", value: `${cvSpo2}%`, hint: cvTime, tone: cvSpo2 < 92 ? "alert" : cvSpo2 < 95 ? "watch" : "ok" });
        if (cvSpo2 < 92) insights.push({ level: "alert", text: `Low SpO₂ ${cvSpo2}% at check-in.` });
    }
    const cvWeight = num(cv.weight);
    if (cvWeight !== null) metrics.push({ label: "Weight", value: `${cvWeight} kg`, hint: cvTime });
    const cvBmi = num(cv.bmi);
    if (cvBmi !== null) metrics.push({ label: "BMI", value: cvBmi.toFixed(1), hint: cvBmi >= 30 ? "Obese range" : cvBmi >= 25 ? "Overweight" : cvBmi < 18.5 ? "Underweight" : "Normal", tone: cvBmi >= 30 || cvBmi < 18.5 ? "watch" : "ok" });

    // Patient self-recorded vitals (mobile app logs, newest first)
    const latestBp = cvBp ? undefined : bpLogs[0];
    if (latestBp) {
        const { systolic: s, diastolic: d } = latestBp;
        const tone = s >= 140 || d >= 90 ? "alert" : s >= 130 || d >= 85 ? "watch" : "ok";
        metrics.push({ label: "Blood pressure", value: `${s}/${d}`, hint: `mmHg · ${fmtDate(latestBp.date)}`, tone });
        if (s >= 160 || d >= 110) insights.push({ level: "alert", text: `Severe-range BP reading ${s}/${d} mmHg recorded by patient.` });
        else if (tone === "alert") insights.push({ level: "alert", text: `Elevated BP ${s}/${d} mmHg on latest self-reading.` });
        const highCount = bpLogs.slice(0, 10).filter((b) => b.systolic >= 140 || b.diastolic >= 90).length;
        if (highCount >= 2) insights.push({ level: "watch", text: `${highCount} of the last ${Math.min(bpLogs.length, 10)} BP readings were ≥140/90.` });
        if (latestBp.pulse && cvPulse === null) {
            const p = latestBp.pulse;
            metrics.push({ label: "Pulse", value: `${p}`, hint: "bpm", tone: p > 100 || p < 50 ? "watch" : "ok" });
            if (p > 100) insights.push({ level: "watch", text: `Resting pulse ${p} bpm (tachycardia).` });
        }
    }
    const latestWeight = cvWeight !== null ? undefined : weightLogs[0];
    if (latestWeight) {
        const oldest = weightLogs[weightLogs.length - 1];
        const delta = weightLogs.length > 1 ? latestWeight.weight - oldest.weight : null;
        metrics.push({
            label: "Weight",
            value: `${latestWeight.weight} ${latestWeight.unit}`,
            hint: delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} since ${fmtDate(oldest.date)}` : fmtDate(latestWeight.date),
        });
        const heightCm = num(patient?.height);
        if (heightCm && latestWeight.unit === "kg") {
            const bmi = latestWeight.weight / (heightCm / 100) ** 2;
            const tone = bmi >= 30 || bmi < 18.5 ? "watch" : "ok";
            metrics.push({ label: "BMI", value: bmi.toFixed(1), hint: bmi >= 30 ? "Obese range" : bmi >= 25 ? "Overweight" : bmi < 18.5 ? "Underweight" : "Normal", tone });
        }
    } else if (cvWeight === null && text(patient?.weight)) {
        metrics.push({ label: "Weight", value: text(patient.weight), hint: "Clinic record" });
    }
    if (!latestBp && !cvBp && text(patient?.bp)) metrics.push({ label: "Blood pressure", value: text(patient.bp), hint: "Clinic record" });

    // Intake-derived metrics
    const lmp = text(cycle.lastPeriod) || text(patient?.lmp);
    if (lmp) {
        const days = Math.floor((Date.now() - new Date(lmp).getTime()) / 86400000);
        metrics.push({ label: "LMP", value: fmtDate(lmp), hint: Number.isFinite(days) && days >= 0 ? `${days} days ago` : undefined, tone: days > 35 ? "watch" : undefined });
    }
    if (num(cycle.cycleLength)) metrics.push({ label: "Cycle length", value: `${cycle.cycleLength} d`, tone: num(cycle.cycleLength)! < 21 || num(cycle.cycleLength)! > 35 ? "watch" : "ok" });
    if (text(preg.weeksPregnant)) metrics.push({ label: "Gestation", value: `${preg.weeksPregnant} wks`, hint: text(preg.dueDate) ? `EDD ${fmtDate(preg.dueDate)}` : undefined });
    const g = num(preg.total);
    if (g !== null && (g > 0 || text(preg.currentStatus))) {
        const p = (num(preg.vaginal) || 0) + (num(preg.cesarean) || 0);
        const a = (num(preg.miscarriages) || 0) + (num(preg.terminations) || 0);
        metrics.push({ label: "Obstetric", value: `G${g} P${p} A${a}`, hint: num(preg.cesarean) ? `${preg.cesarean} C-section` : undefined });
    }
    if (text(pain.severity)) metrics.push({ label: "Pain", value: text(pain.severity), tone: pain.severity === "Severe" ? "alert" : pain.severity === "Moderate" ? "watch" : undefined });

    // Clinical insights from intake answers
    const related = list(pain.relatedSymptoms);
    if (pain.severity === "Severe") insights.push({ level: "alert", text: `Severe ${list(pain.location).join(", ").toLowerCase() || "abdominal/pelvic"} pain${text(pain.duration) ? ` for ${text(pain.duration).toLowerCase()}` : ""}.` });
    const redFlags = related.filter((s) => ["Fever", "Bleeding", "Dizziness"].includes(s));
    if (redFlags.length && list(pain.location).length) insights.push({ level: "alert", text: `Pain with ${redFlags.join(", ").toLowerCase()}.` });
    if (cycle.pregnancyTest === "Positive" && (list(pain.location).length || related.includes("Bleeding"))) insights.push({ level: "alert", text: "Positive pregnancy test with pain/bleeding — rule out ectopic pregnancy." });
    else if (cycle.pregnancyTest === "Positive") insights.push({ level: "info", text: "Patient reports a positive home pregnancy test." });
    if (cycle.lateBy === "More than 2 weeks" && cycle.pregnancyTest !== "Positive") insights.push({ level: "watch", text: `Period late by more than 2 weeks; pregnancy test: ${text(cycle.pregnancyTest) || "not reported"}.` });
    if (cycle.flow === "Heavy") insights.push({ level: "watch", text: "Reports heavy menstrual flow — consider Hb/anemia check." });
    if (cycle.regularity === "Often irregular") insights.push({ level: "watch", text: "Irregular cycles reported." });
    if ((num(preg.miscarriages) || 0) >= 2) insights.push({ level: "watch", text: `History of ${preg.miscarriages} miscarriages.` });
    if (num(preg.cesarean)) insights.push({ level: "info", text: `Previous C-section × ${preg.cesarean}.` });
    if (life.smoking === "Current") insights.push({ level: "watch", text: "Current smoker." });
    const drinks = Number.parseInt(text(life.alcohol), 10);
    if (drinks >= 7) insights.push({ level: "watch", text: `Alcohol intake ${text(life.alcohol)} (above low-risk limit for women).` });
    if (["5+ years ago", "Never had one"].includes(text(life.mammogram)) && Number(age) >= 40) insights.push({ level: "watch", text: `Mammogram ${text(life.mammogram).toLowerCase()} — screening may be due.` });
    if (["5+ years ago", "Never had one"].includes(text(gyn.lastPap)) && Number(age) >= 25) insights.push({ level: "watch", text: `Pap smear ${text(gyn.lastPap).toLowerCase()} — cervical screening may be due.` });
    if (text(life.exercise) === "0 days per week") insights.push({ level: "info", text: "Not currently exercising." });
    if (["No", "Not sure", "Yes, some doses"].includes(text(gyn.hpvVaccine))) insights.push({ level: "info", text: `HPV vaccination: ${text(gyn.hpvVaccine).toLowerCase()} — discuss vaccination and cervical screening.` });
    const allergies = list(history.allergies);
    if (allergies.length) insights.push({ level: "watch", text: `Allergies: ${allergies.join(", ")}.` });
    const conds = list(health.conditions);
    const highRisk = conds.filter((c) => ["Hypertension", "Diabetes", "Gestational diabetes", "Heart disease", "Blood coagulation disorder", "Epilepsy", "Postpartum depression"].includes(c));
    if (highRisk.length) insights.push({ level: "watch", text: `Relevant conditions: ${highRisk.join(", ")}.` });

    const row = (label: string, value: unknown): [string, string] | null => {
        const v = Array.isArray(value) ? list(value).join(", ") : text(value);
        return v && v !== "0" ? [label, v] : null;
    };
    const section = (title: string, rows: ([string, string] | null)[]): Section => ({ title, rows: rows.filter(Boolean) as [string, string][] });
    const sections = [
        section("Check-in vitals", [
            row("Blood pressure (mmHg)", cv.bp), row("Pulse (bpm)", cv.pulse), row("Temperature (°F)", cv.temp), row("SpO₂ (%)", cv.spo2),
            row("Weight (kg)", cv.weight), row("Height (cm)", cv.height), row("BMI", cv.bmi),
            row("Recorded", text(cv.recordedAt) && new Date(text(cv.recordedAt)).toLocaleString("en-IN")),
        ]),
        section("Presenting complaint", [
            row("Pain location", pain.location), row("Duration", pain.duration), row("Associated", related.filter((s) => !["None of these", "Prefer not to say"].includes(s))),
            row("How late", cycle.lateBy), row("Pregnancy test", cycle.pregnancyTest), row("Regularity", cycle.regularity),
        ]),
        section("Menstrual history", [
            row("LMP", lmp && fmtDate(lmp)), row("Menarche age", cycle.menarcheAge), row("Cycle length (days)", cycle.cycleLength),
            row("Flow", cycle.flow), row("Symptoms", cycle.symptoms), row("Notes", cycle.details),
        ]),
        section("Obstetric history", [
            row("Currently pregnant", preg.currentStatus), row("Weeks pregnant", preg.weeksPregnant), row("Due date", preg.dueDate && fmtDate(preg.dueDate)),
            row("Pregnancies", preg.total), row("Vaginal births", preg.vaginal), row("C-sections", preg.cesarean), row("Miscarriages", preg.miscarriages),
            row("Terminations", preg.terminations), row("Premature births", preg.premature), row("Notes", preg.details),
        ]),
        section("Gynecological history", [
            row("Sexually active", gyn.sexuallyActive), row("Age at first encounter", gyn.firstEncounterAge), row("Partners", gyn.partnerCount),
            row("Last Pap smear", gyn.lastPap && (Number.isNaN(new Date(gyn.lastPap).getTime()) ? gyn.lastPap : fmtDate(gyn.lastPap))), row("HPV vaccine", gyn.hpvVaccine), row("Contraception", gyn.birthControl), row("Concerns", gyn.concerns), row("Notes", gyn.details),
        ]),
        section("Medical history", [
            row("Conditions", history.medical), row("Surgeries", history.surgical), row("Medications", history.drug),
            row("Allergies", allergies.length ? allergies : "None reported"), row("Family history", history.family ?? health.familyHistory),
        ]),
        section("Lifestyle & screening", [
            row("Smoking", life.smoking), row("Alcohol", life.alcohol), row("Exercise", life.exercise), row("Relationship", life.relationship),
            row("Last mammogram", life.mammogram), row("Last colonoscopy", life.colonoscopy), row("Other", life.other),
        ]),
    ].filter((s) => s.rows.length);

    return {
        name: text(patient?.name) || "Patient",
        meta,
        concerns: list(form.concerns),
        complaint: text(form.chiefComplaint),
        insights,
        metrics,
        bpRows: bpLogs.slice(0, 6).map((b) => [fmtDate(b.date), `${b.systolic}/${b.diastolic}`, b.pulse ? String(b.pulse) : "—"]),
        weightRows: weightLogs.slice(0, 6).map((w) => [fmtDate(w.date), `${w.weight} ${w.unit}${w.week ? ` (wk ${w.week})` : ""}`]),
        sections,
        hasIntake: Boolean(history.onboarding),
    };
}

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function printSummary(s: Summary) {
    const toneColor = (t?: string) => (t === "alert" ? "#c2410c" : t === "watch" ? "#a16207" : "#342c52");
    const levelStyle: Record<Insight["level"], string> = {
        alert: "background:#fff1f2;border-color:#fecdd3;color:#9f1239",
        watch: "background:#fffbeb;border-color:#fde68a;color:#92400e",
        info: "background:#f5f0ff;border-color:#e2d6f7;color:#4a3d6e",
    };
    const table = (head: string[], rows: string[][]) =>
        `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Intake summary – ${esc(s.name)}</title><style>
*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#342c52;margin:0;padding:28px;font-size:12px}
.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #66519c;padding-bottom:10px;margin-bottom:14px}
h1{margin:0;font-size:20px}.brand{color:#66519c;font-weight:700;font-size:13px;text-align:right}.muted{color:#7b7290}
h2{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#66519c;margin:16px 0 6px}
.chips span{display:inline-block;background:#f1ebfb;color:#4a3d6e;border-radius:999px;padding:3px 10px;margin:0 4px 4px 0;font-weight:600}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.metric{border:1px solid #e9e3f1;border-radius:10px;padding:8px 10px}
.metric .l{font-size:10px;text-transform:uppercase;color:#7b7290}.metric .v{font-size:17px;font-weight:700}.metric .h{font-size:10px;color:#7b7290}
.insight{border:1px solid;border-radius:8px;padding:6px 10px;margin-bottom:5px;font-weight:600}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}.sec{break-inside:avoid}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #eee8f4;vertical-align:top}th{color:#7b7290;font-weight:600;font-size:10px;text-transform:uppercase}
.kv td:first-child{width:42%;color:#7b7290}.foot{margin-top:22px;border-top:1px solid #e9e3f1;padding-top:6px;color:#9a91ad;font-size:10px}
@page{margin:12mm}@media print{body{padding:0}}
</style></head><body>
<div class="head"><div><h1>${esc(s.name)}</h1><div class="muted">${esc(s.meta.join(" · "))}</div></div><div class="brand">Saivie · Pre-visit intake summary<div class="muted" style="font-weight:400">Printed ${esc(new Date().toLocaleString("en-IN"))}</div></div></div>
${s.concerns.length || s.complaint ? `<h2>Reason for visit</h2><div class="chips">${s.concerns.map((c) => `<span>${esc(c)}</span>`).join("")}</div>${s.complaint ? `<p>${esc(s.complaint)}</p>` : ""}` : ""}
${s.insights.length ? `<h2>Clinical insights</h2>${s.insights.map((i) => `<div class="insight" style="${levelStyle[i.level]}">${i.level === "alert" ? "⚠ " : ""}${esc(i.text)}</div>`).join("")}` : ""}
${s.metrics.length ? `<h2>Vitals &amp; key metrics</h2><div class="metrics">${s.metrics.map((m) => `<div class="metric"><div class="l">${esc(m.label)}</div><div class="v" style="color:${toneColor(m.tone)}">${esc(m.value)}</div>${m.hint ? `<div class="h">${esc(m.hint)}</div>` : ""}</div>`).join("")}</div>` : ""}
${s.bpRows.length || s.weightRows.length ? `<h2>Patient-recorded readings</h2><div class="grid">${s.bpRows.length ? `<div>${table(["Date", "BP (mmHg)", "Pulse"], s.bpRows)}</div>` : "<div></div>"}${s.weightRows.length ? `<div>${table(["Date", "Weight"], s.weightRows)}</div>` : ""}</div>` : ""}
<div class="grid">${s.sections.map((sec) => `<div class="sec"><h2>${esc(sec.title)}</h2><table class="kv"><tbody>${sec.rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>`).join("")}</div>
<div class="foot">Patient-reported information collected before the visit. Verify clinically before acting.</div>
<script>window.onload=function(){window.focus();window.print();}</script>
</body></html>`;

    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return false;
    win.document.open();
    win.document.write(html);
    win.document.close();
    return true;
}

const toneClass = (t?: Metric["tone"]) => (t === "alert" ? "text-rose-600" : t === "watch" ? "text-amber-600" : "text-[#342c52]");
const insightClass: Record<Insight["level"], string> = {
    alert: "border-rose-200 bg-rose-50 text-rose-800",
    watch: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-[#e2d6f7] bg-[#f5f0ff] text-[#4a3d6e]",
};

export function printPatientSummary(patient: any, checkInVitals?: CheckInVitals | null) {
    if (!printSummary(buildSummary(patient, [], [], checkInVitals))) alert("Please allow pop-ups to print the patient summary.");
}

export function IntakeSummaryActions({ patient, weightLogs, bpLogs }: { patient: any; weightLogs: WeightLog[]; bpLogs: BpLog[] }) {
    const [open, setOpen] = useState(false);
    const summary = buildSummary(patient, weightLogs, bpLogs);
    const print = () => {
        if (!printSummary(summary)) alert("Please allow pop-ups to print the intake summary.");
    };

    return (
        <>
            <Button variant="outline" size="sm" className="h-7 gap-1 border-[#e2d6f7] text-xs text-[#66519c] hover:bg-[#f5f0ff]" onClick={() => setOpen(true)} data-testid="button-preview-intake">
                <Eye className="h-3 w-3" /> Preview
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1 border-[#e2d6f7] text-xs text-[#66519c] hover:bg-[#f5f0ff]" onClick={print} data-testid="button-print-intake">
                <Printer className="h-3 w-3" /> Print
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-4 pr-6">
                            <span>Intake summary · {summary.name}</span>
                            <Button size="sm" className="h-8 gap-1 bg-[#66519c] hover:bg-[#544181]" onClick={print}><Printer className="h-3.5 w-3.5" /> Print</Button>
                        </DialogTitle>
                        {summary.meta.length > 0 && <p className="text-xs text-slate-500">{summary.meta.join(" · ")}</p>}
                    </DialogHeader>

                    {!summary.hasIntake && (
                        <p className="rounded-lg border border-dashed border-[#e2d6f7] bg-[#faf8ff] p-3 text-xs text-[#625976]">This patient hasn't completed the online intake form yet. Showing clinic records and self-recorded vitals only.</p>
                    )}

                    {(summary.concerns.length > 0 || summary.complaint) && (
                        <div>
                            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#66519c]">Reason for visit</h4>
                            <div className="flex flex-wrap gap-1.5">{summary.concerns.map((c) => <span key={c} className="rounded-full bg-[#f1ebfb] px-2.5 py-1 text-xs font-semibold text-[#4a3d6e]">{c}</span>)}</div>
                            {summary.complaint && <p className="mt-2 text-sm text-slate-700">{summary.complaint}</p>}
                        </div>
                    )}

                    {summary.insights.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#66519c]">Clinical insights</h4>
                            <div className="space-y-1.5">
                                {summary.insights.map((i, idx) => (
                                    <div key={idx} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${insightClass[i.level]}`}>
                                        {i.level === "alert" && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}{i.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {summary.metrics.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#66519c]">Vitals & key metrics</h4>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {summary.metrics.map((m) => (
                                    <div key={m.label} className="rounded-xl border border-[#e9e3f1] bg-white p-3">
                                        <p className="text-[10px] font-semibold uppercase text-slate-500">{m.label}</p>
                                        <p className={`text-lg font-bold ${toneClass(m.tone)}`}>{m.value}</p>
                                        {m.hint && <p className="text-[10px] text-slate-500">{m.hint}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(summary.bpRows.length > 0 || summary.weightRows.length > 0) && (
                        <div>
                            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#66519c]">Patient-recorded readings</h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {summary.bpRows.length > 0 && <MiniTable head={["Date", "BP (mmHg)", "Pulse"]} rows={summary.bpRows} />}
                                {summary.weightRows.length > 0 && <MiniTable head={["Date", "Weight"]} rows={summary.weightRows} />}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        {summary.sections.map((sec) => (
                            <div key={sec.title}>
                                <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#66519c]">{sec.title}</h4>
                                <dl className="divide-y divide-[#eee8f4] text-xs">
                                    {sec.rows.map(([k, v]) => (
                                        <div key={k} className="grid grid-cols-[40%_1fr] gap-2 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="text-slate-800">{v}</dd></div>
                                    ))}
                                </dl>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function MiniTable({ head, rows }: { head: string[]; rows: string[][] }) {
    return (
        <table className="w-full text-xs">
            <thead><tr>{head.map((h) => <th key={h} className="border-b border-[#eee8f4] py-1 text-left text-[10px] font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-[#f4f0f9] py-1 text-slate-700">{c}</td>)}</tr>)}</tbody>
        </table>
    );
}
