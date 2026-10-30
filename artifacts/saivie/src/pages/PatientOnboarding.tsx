import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Baby, Check, CheckCircle2, Flower2, Heart, Hospital, Leaf, LockKeyhole, Minus, Plus, Printer, ShieldCheck, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getOnboardingQuestions, getRelevantIntake, initialForm, isOnboardingStep, type IntakeForm, type OptionalHistory } from "@/lib/onboardingFlow";
import { getPrintBrandStyles } from "@/lib/brand";
import { estimatePregnancyDating } from "@/lib/pregnancyDating";
import { patientSurveyPrompt, surveyDirectionLabels, surveyDirectionsForConcerns, surveyQuestions } from "@/lib/consultationSurvey";
import { conceptionMethods } from "@/lib/conceptionHistory";
import { hpvProtection } from "@/lib/hpvProtection";
import { HpvBadge } from "@/components/HpvBadge";

const sections = [
    { key: "about", title: "About you", eyebrow: "First things first" },
    { key: "concern", title: "Your concern", eyebrow: "What brings you in?" },
    { key: "survey", title: "Before your visit", eyebrow: "For your doctor" },
    { key: "cycle", title: "Cycle", eyebrow: "Your cycle story" },
    { key: "gyn", title: "GYN history", eyebrow: "A little more context" },
    { key: "pregnancy", title: "Pregnancies", eyebrow: "Your pregnancy history" },
    { key: "lifestyle", title: "Lifestyle", eyebrow: "Everyday wellbeing" },
    { key: "health", title: "Health history", eyebrow: "The bigger picture" },
    { key: "review", title: "Review", eyebrow: "Almost there" },
];

// "Cervical cancer: a preventable disease" — PAHO/WHO. Override with VITE_CERVICAL_CANCER_VIDEO_ID.
const cervicalCancerVideoId = import.meta.env.VITE_CERVICAL_CANCER_VIDEO_ID || "pkUmJlvHwQA";

function printOnboardingSummary(form: IntakeForm) {
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return false;

    const escapeHtml = (value: string) =>
        value.replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        })[character] ?? character);
    const rows = (entries: Array<[string, string | string[]]>) =>
        entries
            .map(([label, value]) => [label, Array.isArray(value) ? value.join(", ") : value.trim()] as const)
            .filter(([, value]) => value.length > 0)
            .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
            .join("");
    const sections = [
        ["Patient details", rows([
            ["Full name", form.name],
            ["Date of birth", form.dob],
            ["Referred by", form.referredBy],
            ["Occupation", form.occupation],
        ])],
        ["Visit concerns", rows([
            ["Concerns selected", form.concerns],
            ["Main concern / additional details", form.chiefComplaint],
            ["Pain location", form.pain.location],
            ["Pain duration", form.pain.duration],
            ["Pain severity", form.pain.severity],
            ["Other symptoms with pain", form.pain.relatedSymptoms],
        ])],
        ["Pre-visit survey", rows([
            ["Topics to discuss", form.consultation.directions.map((direction) => surveyDirectionLabels[direction])],
            ...surveyQuestions(form.consultation.directions).map((question): [string, string] => [
                patientSurveyPrompt(question), form.consultation.answers[question] || "",
            ]),
        ])],
        ["Menstrual history", rows([
            ["Last period began", form.cycle.lastPeriod],
            ["Period delay", form.cycle.lateBy],
            ["Usual regularity", form.cycle.regularity],
            ["Pregnancy test", form.cycle.pregnancyTest],
            ["Age periods started", form.cycle.menarcheAge],
            ["Typical cycle length (days)", form.cycle.cycleLength],
            ["Flow", form.cycle.flow],
            ["Cycle symptoms", form.cycle.symptoms],
            ["Additional details", form.cycle.details],
        ])],
        ["Gynecological history", rows([
            ["Age at first sexual encounter", form.gyn.firstEncounterAge],
            ["Number of partners", form.gyn.partnerCount],
            ["Last Pap smear", form.gyn.lastPap],
            ["Currently sexually active", form.gyn.sexuallyActive],
            ["HPV vaccination", form.gyn.hpvVaccine],
            ["Birth control methods", form.gyn.birthControl],
            ["GYN history / concerns", form.gyn.concerns],
            ["Additional details", form.gyn.details],
        ])],
        ["Pregnancy history", rows([
            ["Currently pregnant", form.pregnancies.currentStatus],
            ["Weeks pregnant", form.pregnancies.weeksPregnant],
            ["Estimated due date", form.pregnancies.dueDate],
            ["How conceived", form.pregnancies.conceptionMethod],
            ["Conception details", form.pregnancies.conceptionDetails],
            ["Total pregnancies", form.pregnancies.total],
            ["Vaginal deliveries", form.pregnancies.vaginal],
            ["C-sections", form.pregnancies.cesarean],
            ["Miscarriages", form.pregnancies.miscarriages],
            ["Terminations", form.pregnancies.terminations],
            ["Premature births", form.pregnancies.premature],
            ["Additional details", form.pregnancies.details],
        ])],
        ["Social & lifestyle", rows([
            ["Smoking history", form.lifestyle.smoking],
            ["Relationship status", form.lifestyle.relationship],
            ["Alcohol use", form.lifestyle.alcohol],
            ["Exercise", form.lifestyle.exercise],
            ["Last mammogram", form.lifestyle.mammogram],
            ["Last colonoscopy", form.lifestyle.colonoscopy],
            ["Additional context", form.lifestyle.other],
        ])],
        ["Medical history", rows([
            ["Conditions", form.health.conditions],
            ["Condition details", form.health.medicalDetails],
            ["Past surgeries", splitLines(form.health.surgeries)],
            ["Regular medicines", splitLines(form.health.medications)],
            ["Medicine allergies", splitLines(form.health.allergies)],
            ["Family history", splitLines(form.health.familyHistory)],
        ])],
    ].filter(([, content]) => content);

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Patient onboarding and history</title>
    <style>
        ${getPrintBrandStyles()}
        * { box-sizing: border-box; }
        body { max-width: 850px; margin: 0 auto; padding: 36px 28px; color: var(--saivie-plum); font: 13px/1.5 Arial, sans-serif; }
        .meta { margin: 0 0 20px; font-weight: 600; color: var(--saivie-plum); }
        h2 { margin: 22px 0 7px; color: var(--saivie-teal); font-size: 16px; break-after: avoid; }
        table { width: 100%; border-collapse: collapse; }
        tr { break-inside: avoid; }
        th, td { padding: 7px 9px; border-bottom: 1px solid var(--saivie-border); text-align: left; vertical-align: top; }
        th { width: 34%; color: var(--saivie-plum); font-weight: 600; }
        .note { margin-top: 24px; padding-top: 10px; border-top: 1px solid var(--saivie-border); color: var(--saivie-plum); font-size: 11px; }
        @page { margin: 42mm 18mm 18mm; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <p class="meta">${escapeHtml(form.name || "Patient")} · Printed ${escapeHtml(new Date().toLocaleString())}</p>
    ${sections.map(([title, content]) => `<section><h2>${escapeHtml(title)}</h2><table><tbody>${content}</tbody></table></section>`).join("")}
    <p class="note">Patient-reported information from the onboarding form. Please review and verify with the care team.</p>
    <script>window.onload = function () { window.focus(); window.print(); };</script>
</body>
</html>`);
    printWindow.document.close();
    return true;
}

const concernOptions = [
    "Missed or late period",
    "Possible pregnancy",
    "I am pregnant",
    "Pregnancy care",
    "Abdominal or pelvic pain",
    "Vaginal discharge or infection",
    "Menopause",
    "Breast problem",
    "Gut / bowel problems",
    "Irregular or heavy bleeding",
    "Fertility",
    "Birth control",
    "Routine checkup",
    "Other",
];

const conditions = [
    "Allergies", "Anemia", "Anxiety", "Asthma / lung disease", "ADHD", "Cancer",
    "Breast problem", "Blood coagulation disorder", "Depression", "Postpartum depression",
    "Diabetes", "Eating disorder", "Epilepsy", "GERD / reflux", "Gestational diabetes",
    "Heart disease", "Headaches / migraine", "High cholesterol", "Hypertension",
    "Irritable bowel syndrome", "Gut / bowel problems", "Thyroid condition", "Kidney disease / stones",
    "Liver disease / hepatitis", "Osteoporosis", "Stroke", "Urinary incontinence",
];

const inputClass = "w-full rounded-lg border border-saivie-border bg-saivie-ivory px-3 py-2.5 text-sm text-saivie-plum placeholder:text-saivie-teal outline-none transition focus:border-saivie-teal focus:ring-2 focus:ring-saivie-border/40";
const labelClass = "mb-1.5 block text-xs font-semibold text-saivie-plum";
const cardClass = "rounded-2xl border border-saivie-border bg-saivie-ivory p-6 shadow-[0_8px_30px_color-mix(in_srgb,var(--saivie-teal)_5%,transparent)] sm:p-8";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="block min-w-0"><span className={labelClass}>{label}</span>{children}</label>;
}

function TextInput({ label, value, onChange, placeholder, type = "text" }: {
    label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string;
}) {
    return <Field label={label}><input className={inputClass} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></Field>;
}

function RulerSlider({ label, value, onChange, min, max, step = 1, unit, optional = false }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    optional?: boolean;
}) {
    const marks = Array.from({ length: 31 }, (_, index) => index);
    const displayValue = value ? `${value}${unit ? ` ${unit}` : ""}` : "Slide to choose";
    return (
        <fieldset className="min-w-0">
            <div className="mb-5 flex items-end justify-between gap-3">
                <legend className={`${labelClass} mb-0`}>{label}</legend>
                <output className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${value ? "bg-saivie-surface-muted text-saivie-teal" : "bg-saivie-surface-muted text-saivie-teal"}`}>
                    {displayValue}
                </output>
            </div>
            <div className="relative px-1 pb-5 pt-2">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-[18px] flex h-6 justify-between">
                    {marks.map((mark) => (
                        <span key={mark} className={`w-px ${mark % 5 === 0 ? "h-5 bg-saivie-sage" : "mt-1 h-3 bg-saivie-sage"}`} />
                    ))}
                </div>
                <input
                    aria-label={label}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value || min}
                    onChange={(event) => onChange(event.target.value)}
                    className="onboarding-ruler-slider relative z-10 w-full cursor-pointer appearance-none bg-transparent"
                />
                <div aria-hidden="true" className="mt-2 flex justify-between px-0.5 text-[10px] tabular-nums text-saivie-teal">
                    <span>{min}{unit ? ` ${unit}` : ""}</span>
                    <span>{max}{unit ? ` ${unit}` : ""}</span>
                </div>
            </div>
            {optional && <button type="button" onClick={() => onChange("")} className="mt-1 text-[11px] font-medium text-saivie-teal underline decoration-saivie-border underline-offset-2 hover:text-saivie-teal">Prefer not to answer</button>}
        </fieldset>
    );
}

function Glass({ filled, index }: { filled: boolean; index: number }) {
    const clipId = `glass-clip-${useId().replace(/:/g, "")}`;
    return (
        <svg viewBox="0 0 40 56" className="h-12 w-9 sm:h-14 sm:w-10" aria-hidden="true">
            <defs>
                <clipPath id={clipId}><path d="M6 4 L34 4 L30 50 Q30 52 28 52 L12 52 Q10 52 10 50 Z" /></clipPath>
                <linearGradient id={`${clipId}-fill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--saivie-sage)" />
                    <stop offset="100%" stopColor="var(--saivie-teal)" />
                </linearGradient>
            </defs>
            <g clipPath={`url(#${clipId})`}>
                <rect x="0" width="40" height="56" fill={`url(#${clipId}-fill)`}
                    style={{ transform: `translateY(${filled ? 16 : 56}px)`, transition: `transform 450ms cubic-bezier(.3,1.4,.5,1) ${index * 40}ms` }} />
                <ellipse cx="20" cy="16" rx="16" ry="2" fill="var(--saivie-surface-muted)" opacity={filled ? 0.9 : 0} style={{ transition: "opacity 300ms" }} />
            </g>
            <path d="M6 4 L34 4 L30 50 Q30 52 28 52 L12 52 Q10 52 10 50 Z" fill="none" stroke={filled ? "var(--saivie-teal)" : "var(--saivie-border)"} strokeWidth="2" strokeLinejoin="round" />
            <path d="M10 10 L12 44" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </svg>
    );
}

function GlassPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    const max = 8;
    const count = value === "None" ? 0 : Number.parseInt(value, 10) || 0;
    const set = (n: number) => onChange(n === 0 ? "None" : `${n === max ? `${max}+` : n} drink${n === 1 ? "" : "s"} per week`);
    const caption = !value ? "Tap a glass" : count === 0 ? "I don't drink" : value;
    return (
        <fieldset className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3">
                <legend className={`${labelClass} mb-0`}>{label}</legend>
                <output className={`rounded-full px-3 py-1 text-sm font-bold ${value ? "bg-saivie-surface-muted text-saivie-teal" : "bg-saivie-surface-muted text-saivie-teal"}`}>{caption}</output>
            </div>
            <div className="flex flex-wrap items-end gap-1 rounded-xl border border-saivie-border bg-saivie-ivory px-3 py-3">
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" onClick={() => set(count === n ? n - 1 : n)} aria-label={`${n}${n === max ? "+" : ""} drinks per week`} aria-pressed={n <= count}
                        className="group flex flex-col items-center rounded-lg px-0.5 transition hover:-translate-y-0.5">
                        <Glass filled={n <= count} index={n} />
                        <span className={`mt-0.5 text-[10px] tabular-nums ${n <= count ? "font-bold text-saivie-teal" : "text-saivie-teal"}`}>{n === max ? `${max}+` : n}</span>
                    </button>
                ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-saivie-teal">
                <span>Drinks per week</span>
                <button type="button" onClick={() => onChange(value === "None" ? "" : "None")} className={`rounded-full border px-2.5 py-1 font-medium transition ${value === "None" ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border text-saivie-teal hover:border-saivie-border"}`}>I don't drink</button>
            </div>
        </fieldset>
    );
}

const exerciseMoods = ["Resting phase", "Easing in", "Getting going", "Finding rhythm", "Nicely active", "Very active", "Super active", "Every single day!"];

function ExerciseMeter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    const days = value ? Number.parseInt(value, 10) || 0 : -1;
    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
    return (
        <fieldset className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3">
                <legend className={`${labelClass} mb-0`}>{label}</legend>
                <output className={`rounded-full px-3 py-1 text-sm font-bold ${value ? "bg-saivie-surface-muted text-saivie-teal" : "bg-saivie-surface-muted text-saivie-teal"}`}>
                    {days < 0 ? "Tap the bars" : `${days} day${days === 1 ? "" : "s"} / week`}
                </output>
            </div>
            <div className="rounded-xl border border-saivie-border bg-saivie-ivory px-3 pb-2 pt-3">
                <div className="flex h-20 items-end gap-1.5">
                    {dayLabels.map((d, i) => {
                        const active = i < days;
                        return (
                            <button key={i} type="button" onClick={() => onChange(`${days === i + 1 ? i : i + 1} days per week`)} aria-label={`${i + 1} days per week`} aria-pressed={active}
                                className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                                <span className={`w-full rounded-md transition-all duration-300 ${active ? "bg-gradient-to-t from-saivie-teal to-saivie-sage shadow-[0_4px_12px_color-mix(in_srgb,var(--saivie-teal)_25%,transparent)]" : "bg-saivie-surface-muted hover:bg-saivie-surface-muted"}`}
                                    style={{ height: `${28 + i * 10}%`, transitionDelay: `${i * 35}ms` }} />
                                <span className={`text-[10px] ${active ? "font-bold text-saivie-teal" : "text-saivie-teal"}`}>{d}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-saivie-teal">
                <span className="font-medium text-saivie-teal">{days >= 0 ? exerciseMoods[days] : "Days you move 30+ min"}</span>
                <button type="button" onClick={() => onChange(value === "0 days per week" ? "" : "0 days per week")} className={`rounded-full border px-2.5 py-1 font-medium transition ${days === 0 ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border text-saivie-teal hover:border-saivie-border"}`}>Not currently</button>
            </div>
        </fieldset>
    );
}

const screeningStops = ["Within 1 year", "1–2 years ago", "2–5 years ago", "5+ years ago"];

function ScreeningTimeline({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    const selected = screeningStops.indexOf(value);
    return (
        <fieldset className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3">
                <legend className={`${labelClass} mb-0`}>{label}</legend>
                <output className={`rounded-full px-3 py-1 text-xs font-bold ${value ? "bg-saivie-surface-muted text-saivie-teal" : "bg-saivie-surface-muted text-saivie-teal"}`}>{value || "When was it?"}</output>
            </div>
            <div className="rounded-xl border border-saivie-border bg-saivie-ivory px-4 pb-3 pt-4">
                <div className="relative">
                    <div className="absolute left-[11px] right-[11px] top-[9px] h-1 rounded-full bg-saivie-surface-muted" />
                    <div className="absolute left-[11px] top-[9px] h-1 rounded-full bg-gradient-to-r from-saivie-teal to-saivie-sage transition-all duration-500"
                        style={{ width: selected < 0 ? 0 : `calc((100% - 22px) * ${selected / (screeningStops.length - 1)})` }} />
                    <div className="relative flex justify-between">
                        {screeningStops.map((stop, i) => (
                            <button key={stop} type="button" onClick={() => onChange(value === stop ? "" : stop)} aria-pressed={value === stop} className="flex w-14 flex-col items-center text-center first:items-start last:items-end">
                                <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition ${i === selected ? "scale-110 border-saivie-teal bg-saivie-teal shadow-[0_0_0_4px_color-mix(in_srgb,var(--saivie-teal)_30%,transparent)]" : i < selected ? "border-saivie-teal bg-saivie-sage" : "border-saivie-border bg-saivie-ivory hover:border-saivie-teal"}`}>
                                    {i === selected && <Check size={12} className="text-white" />}
                                </span>
                                <span className={`mt-1.5 text-[10px] leading-tight ${i === selected ? "font-bold text-saivie-teal" : "text-saivie-teal"}`}>{stop.replace(" ago", "")}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-saivie-border pt-3">
                    {["Never had one", "Not applicable", "Not sure"].map((option) => (
                        <button key={option} type="button" onClick={() => onChange(value === option ? "" : option)} aria-pressed={value === option}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${value === option ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border text-saivie-teal hover:border-saivie-border"}`}>{option}</button>
                    ))}
                </div>
            </div>
        </fieldset>
    );
}

type CountTileProps = {
    label: string;
    hint: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    value: string;
    onChange: (value: string) => void;
    tint: string;
};

function CountTile({ label, hint, icon: Icon, value, onChange, tint }: CountTileProps) {
    const count = Number.parseInt(value, 10) || 0;
    const pips = 6;
    const set = (n: number) => onChange(String(Math.max(0, Math.min(15, n))));
    return (
        <div className={`group relative overflow-hidden rounded-2xl border p-4 transition ${count > 0 ? "border-saivie-border bg-saivie-ivory shadow-[0_6px_20px_color-mix(in_srgb,var(--saivie-teal)_10%,transparent)]" : "border-saivie-border bg-saivie-ivory"}`}>
            <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${count > 0 ? tint : "bg-saivie-surface-muted text-saivie-teal"}`}><Icon size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-saivie-teal">{label}</p>
                    <p className="text-[11px] leading-4 text-saivie-teal">{hint}</p>
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
                <button type="button" onClick={() => set(count - 1)} disabled={count === 0} aria-label={`Decrease ${label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-saivie-border bg-saivie-ivory text-saivie-teal transition hover:bg-saivie-surface-muted active:scale-90 disabled:opacity-30"><Minus size={16} /></button>
                <output key={value} aria-live="polite" className={`onboarding-pop font-serif font-semibold tabular-nums text-saivie-plum ${value === "" ? "text-lg" : "text-4xl"}`}>{value === "" ? "Not answered" : count}</output>
                {value === "" && <button type="button" onClick={() => set(0)} className="text-xs font-semibold text-saivie-teal">None / 0</button>}
                <button type="button" onClick={() => set(count + 1)} aria-label={`Increase ${label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-saivie-teal text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--saivie-teal)_35%,transparent)] transition hover:bg-saivie-teal active:scale-90"><Plus size={16} /></button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5">
                {Array.from({ length: pips }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" onClick={() => set(count === n ? n - 1 : n)} aria-label={`Set ${label} to ${n}`}
                        className={`h-2.5 rounded-full transition-all duration-300 ${n <= count ? "w-5 bg-gradient-to-r from-saivie-teal to-saivie-sage" : "w-2.5 bg-saivie-surface-muted hover:bg-saivie-sage"}`} />
                ))}
                {count > pips && <span className="ml-1 text-[10px] font-bold text-saivie-teal">+{count - pips}</span>}
            </div>
        </div>
    );
}

const splitLines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

function QuickPick({ label, options, value, onChange, noneLabel = "None", otherPlaceholder = "Something else? Add it here" }: {
    label: string; options: string[]; value: string; onChange: (value: string) => void; noneLabel?: string; otherPlaceholder?: string;
}) {
    const items = splitLines(value);
    const [draft, setDraft] = useState("");
    const [adding, setAdding] = useState(false);
    const custom = items.filter((item) => item !== noneLabel && !options.includes(item));
    const commit = (next: string[]) => onChange(next.join("\n"));
    const toggle = (option: string) => {
        if (option === noneLabel) return commit(items.includes(noneLabel) ? [] : [noneLabel]);
        const rest = items.filter((item) => item !== noneLabel);
        commit(rest.includes(option) ? rest.filter((item) => item !== option) : [...rest, option]);
    };
    const addDraft = () => {
        const entry = draft.trim();
        if (entry && !items.includes(entry)) commit([...items.filter((item) => item !== noneLabel), entry]);
        setDraft("");
        setAdding(false);
    };
    const chip = (active: boolean) => `inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${active ? "border-saivie-teal bg-saivie-teal text-white shadow-[0_3px_10px_color-mix(in_srgb,var(--saivie-teal)_25%,transparent)]" : "border-saivie-border bg-saivie-ivory text-saivie-teal hover:border-saivie-border"}`;
    return (
        <fieldset>
            <legend className={labelClass}>{label}</legend>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => toggle(noneLabel)} aria-pressed={items.includes(noneLabel)} className={chip(items.includes(noneLabel))}>{items.includes(noneLabel) && <Check size={12} />}{noneLabel}</button>
                {options.map((option) => (
                    <button key={option} type="button" onClick={() => toggle(option)} aria-pressed={items.includes(option)} className={chip(items.includes(option))}>{items.includes(option) && <Check size={12} />}{option}</button>
                ))}
                {custom.map((item) => (
                    <button key={item} type="button" onClick={() => commit(items.filter((i) => i !== item))} aria-label={`Remove ${item}`} className={chip(true)}>{item}<X size={12} /></button>
                ))}
                {adding ? (
                    <span className="inline-flex items-center gap-1">
                        <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={addDraft}
                            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDraft(); } if (event.key === "Escape") { setDraft(""); setAdding(false); } }}
                            placeholder={otherPlaceholder} className="w-56 rounded-full border border-saivie-border bg-saivie-ivory px-3 py-1.5 text-xs text-saivie-plum outline-none focus:ring-2 focus:ring-saivie-border/50" />
                    </span>
                ) : (
                    <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-saivie-border px-3 py-1.5 text-xs font-medium text-saivie-teal hover:bg-saivie-surface-muted"><Plus size={12} />Other</button>
                )}
            </div>
        </fieldset>
    );
}

function TextArea({ label, value, onChange, placeholder }: {
    label: string; value: string; onChange: (value: string) => void; placeholder?: string;
}) {
    return <Field label={label}><textarea className={`${inputClass} min-h-24 resize-y`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></Field>;
}

function ChoiceGroup({ label, options, value, onChange }: {
    label: string; options: string[]; value: string; onChange: (value: string) => void;
}) {
    return (
        <fieldset>
            <legend className={labelClass}>{label}</legend>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <button key={option} type="button" onClick={() => onChange(value === option ? "" : option)}
                        aria-pressed={value === option}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${value === option ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border bg-saivie-ivory text-saivie-teal hover:border-saivie-border"}`}>
                        {option}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}

function CheckGrid({ label, options, value, onChange, exclusiveOption }: {
    label: string; options: string[]; value: string[]; onChange: (value: string[]) => void; exclusiveOption?: string;
}) {
    const toggle = (option: string) => {
        if (value.includes(option)) {
            onChange(value.filter((item) => item !== option));
        } else if (option === exclusiveOption) {
            onChange([option]);
        } else {
            onChange([...value.filter((item) => item !== exclusiveOption), option]);
        }
    };
    return (
        <fieldset>
            <legend className={labelClass}>{label}</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {options.map((option) => (
                    <label key={option} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${value.includes(option) ? "border-saivie-border bg-saivie-surface-muted text-saivie-teal" : "border-saivie-border bg-saivie-ivory text-saivie-teal"}`}>
                        <input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} className="accent-saivie-teal" />
                        {option}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

export default function PatientOnboarding() {
    const { id } = useParams();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [step, setStep] = useState("name");
    const [form, setForm] = useState<IntakeForm>(initialForm);
    const [extra, setExtra] = useState<OptionalHistory>({ cycle: false, gyn: false, pregnancy: false, background: false });
    const questionHeading = useRef<HTMLHeadingElement>(null);
    const [submitted, setSubmitted] = useState(false);
    const [datingAsOf] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    });

    const { data: onboardingData, isLoading } = useQuery({
        queryKey: ["/api/onboarding", id],
        queryFn: async () => {
            const response = await fetch("/api/onboarding", { headers: { "X-Appointment-Id": String(id) } });
            if (!response.ok) throw new Error("Failed to load onboarding session");
            return response.json();
        },
    });

    const questions = getOnboardingQuestions(form, extra);
    const answers = getRelevantIntake(form, extra);
    const datingEstimate = answers.pregnancies.currentStatus === "Yes" && !answers.cycle.lastPeriod
        ? estimatePregnancyDating({
            asOf: datingAsOf,
            pog: answers.pregnancies.dueDate ? "" : answers.pregnancies.weeksPregnant,
            dueDate: answers.pregnancies.dueDate,
        })
        : null;
    const datingNote = datingEstimate ? (
        <div className="mt-3 rounded-xl border border-saivie-border p-3 text-sm text-saivie-teal" data-testid="onboarding-dating-estimate">
            <p className="font-medium">Estimated LMP equivalent: {datingEstimate.estimatedLmp}</p>
            <p className="mt-1 text-xs">Calculated from {datingEstimate.source === "due-date" ? "your due date" : `your weeks pregnant as of ${datingAsOf}`}. This is an estimate, not a remembered period date. Your care team will confirm pregnancy dating.</p>
        </div>
    ) : null;
    const questionKeys = questions.map((question) => question.id).join("\n");
    const visibleSections = sections.filter((section) => questions.some((question) => question.section === section.key))
        .sort((a, b) => questions.findIndex((question) => question.section === a.key) - questions.findIndex((question) => question.section === b.key));

    useEffect(() => {
        if (!isOnboardingStep(questions, step)) setStep("concerns");
    }, [step, questionKeys]);

    useEffect(() => {
        questionHeading.current?.focus();
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [step]);

    useEffect(() => {
        const patient = onboardingData?.patient;
        if (!patient) return;
        setForm((current) => ({
            ...current,
            name: current.name || patient.name || "",
            dob: current.dob || patient.dob || "",
            referredBy: current.referredBy || patient.referredBy || "",
            chiefComplaint: current.chiefComplaint || onboardingData?.appointment?.chiefComplaint || "",
        }));
    }, [onboardingData]);

    const mutation = useMutation({
        mutationFn: async () => {
            const form = answers;
            const noneValues = ["None", "None known", "No known allergies", "Not taking any", "Nothing known"];
            const historyEntries = (value: string) => value.split("\n").map((entry) => entry.trim()).filter((entry) => entry && !noneValues.includes(entry));
            const medical = [...form.health.conditions.filter((condition) => condition !== "None of these"), ...historyEntries(form.health.medicalDetails)];
            const surgical = historyEntries(form.health.surgeries);
            const drug = historyEntries(form.health.medications);
            const allergies = historyEntries(form.health.allergies);
            const history = {
                ...(medical.length ? { medical } : {}),
                ...(surgical.length ? { surgical } : {}),
                ...(drug.length ? { drug } : {}),
                ...(allergies.length ? { allergies } : {}),
                ...(historyEntries(form.health.familyHistory).length ? { family: historyEntries(form.health.familyHistory) } : {}),
                onboarding: form,
                pregnancyDatingEstimate: datingEstimate,
            };
            const complaint = [
                form.concerns.length ? `Visit concerns: ${form.concerns.join(", ")}` : "",
                form.chiefComplaint.trim(),
            ].filter(Boolean).join("\n");
            const response = await fetch(`/api/onboarding/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chiefComplaint: complaint,
                    history,
                    patientDetails: {
                        name: form.name,
                        dob: form.dob,
                        referredBy: form.referredBy,
                    },
                }),
            });
            if (!response.ok) throw new Error("Failed to save onboarding information");
            return response.json();
        },
        onSuccess: () => {
            setSubmitted(true);
            toast({ title: "Intake submitted", description: "Your information has been securely shared with the care team." });
        },
        onError: (error: Error) => toast({ title: "Submission failed", description: error.message, variant: "destructive" }),
    });

    const update = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => setForm((current) => ({ ...current, [key]: value }));
    const updateGroup = <K extends "cycle" | "gyn" | "pregnancies" | "lifestyle" | "health" | "pain">(
        group: K, key: keyof IntakeForm[K], value: string | string[],
    ) => setForm((current) => ({
        ...current,
        [group]: { ...current[group], [key]: value },
    }));

    const setPregnancyCount = (key: "total" | "vaginal" | "cesarean" | "miscarriages" | "terminations" | "premature", value: string) =>
        setForm((current) => {
            const next = { ...current.pregnancies, [key]: value };
            const outcomes = ["vaginal", "cesarean", "miscarriages", "terminations"] as const;
            const accounted = outcomes.reduce((sum, outcome) => sum + (Number.parseInt(next[outcome], 10) || 0), 0);
            if (key !== "total" && accounted > (Number.parseInt(next.total, 10) || 0)) next.total = String(accounted);
            return { ...current, pregnancies: next };
        });

    const optionalHistory = (key: keyof OptionalHistory, label: string) => (
        <ChoiceGroup label={label} options={["Yes, add details", "No, keep it short"]} value={extra[key] ? "Yes, add details" : "No, keep it short"}
            onChange={(value) => setExtra((current) => ({ ...current, [key]: value === "Yes, add details" }))} />
    );
    const questionContent: Record<string, React.ReactNode> = {
        name: <TextInput label="What is your full name?" value={form.name} onChange={(value) => update("name", value)} placeholder="Your full name" />,
        dob: <TextInput label="What is your date of birth?" value={form.dob} onChange={(value) => update("dob", value)} type="date" />,
        concerns: <CheckGrid label="What brings you in today?" options={concernOptions} value={form.concerns} onChange={(value) => update("concerns", value)} />,
        chiefComplaint: <TextArea label="Anything you would like your doctor to know about your concern?" value={form.chiefComplaint} onChange={(value) => update("chiefComplaint", value)} placeholder="A few words are enough. You may skip this." />,
        surveyDirections: (
            <fieldset>
                <legend className={labelClass}>What would you like to discuss? Choose up to 3.</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                    {surveyDirectionsForConcerns(form.concerns).map((direction) => {
                        const selected = answers.consultation.directions.includes(direction);
                        return <label key={direction} className="flex items-center gap-2 rounded-lg border border-saivie-border px-3 py-2 text-xs text-saivie-teal">
                            <input type="checkbox" className="accent-saivie-teal" checked={selected} disabled={!selected && answers.consultation.directions.length >= 3} onChange={() => update("consultation", {
                                ...form.consultation,
                                directions: selected ? answers.consultation.directions.filter((item) => item !== direction) : [...answers.consultation.directions, direction],
                            })} />
                            {surveyDirectionLabels[direction]}
                        </label>;
                    })}
                </div>
                <p className="mt-2 text-xs text-saivie-teal">Optional. You can also discuss anything privately with your doctor.</p>
            </fieldset>
        ),
        ...Object.fromEntries(surveyQuestions(answers.consultation.directions).map((question) => [
            `survey:${question}`,
            <div key={question}>
                <TextArea label={patientSurveyPrompt(question)} value={form.consultation.answers[question] || ""} onChange={(value) => update("consultation", {
                    ...form.consultation, answers: { ...form.consultation.answers, [question]: value },
                })} placeholder="Answer in a few words, or leave blank to discuss privately." />
                <div className="mt-3 flex gap-2">
                    {["Not sure", "Prefer to discuss privately"].map((answer) => <button key={answer} type="button" className="rounded-lg border border-saivie-border px-3 py-2 text-xs text-saivie-teal" onClick={() => update("consultation", {
                        ...form.consultation, answers: { ...form.consultation.answers, [question]: answer },
                    })}>{answer}</button>)}
                </div>
            </div>,
        ])),
        painLocation: <CheckGrid label="Where do you feel the pain?" options={["Lower abdomen", "One side", "Pelvis", "Back", "Not sure"]} value={form.pain.location} onChange={(value) => updateGroup("pain", "location", value)} />,
        painDuration: <ChoiceGroup label="How long have you had the pain?" options={["Today", "2–3 days", "About a week", "A few weeks", "Months or longer"]} value={form.pain.duration} onChange={(value) => updateGroup("pain", "duration", value)} />,
        painSeverity: <ChoiceGroup label="How would you describe the pain?" options={["Mild", "Moderate", "Severe", "Comes and goes"]} value={form.pain.severity} onChange={(value) => updateGroup("pain", "severity", value)} />,
        painSymptoms: <CheckGrid label="Anything else happening with the pain?" options={["Fever", "Nausea or vomiting", "Bleeding", "Dizziness", "None of these"]} exclusiveOption="None of these" value={form.pain.relatedSymptoms} onChange={(value) => updateGroup("pain", "relatedSymptoms", value)} />,
        lastPeriod: <div><TextInput label="When did your last period start?" value={form.cycle.lastPeriod} onChange={(value) => updateGroup("cycle", "lastPeriod", value)} type="date" /><p className="mt-2 text-xs text-saivie-teal">Don't remember? Leave this blank and continue. If pregnant, your known due date or weeks pregnant can help estimate dating.</p></div>,
        lateBy: <ChoiceGroup label="How late is your period?" options={["Less than a week", "1–2 weeks", "More than 2 weeks", "Not sure"]} value={form.cycle.lateBy} onChange={(value) => updateGroup("cycle", "lateBy", value)} />,
        regularity: <ChoiceGroup label="Are your periods usually regular?" options={["Usually regular", "Often irregular", "Not sure", "No longer having periods"]} value={form.cycle.regularity} onChange={(value) => updateGroup("cycle", "regularity", value)} />,
        cycleLength: <RulerSlider label="Typical cycle length" value={form.cycle.cycleLength} onChange={(value) => updateGroup("cycle", "cycleLength", value)} min={15} max={90} unit="days" />,
        flow: <ChoiceGroup label="How would you describe your period flow?" options={["Light", "Average", "Heavy", "Not sure"]} value={form.cycle.flow} onChange={(value) => updateGroup("cycle", "flow", value)} />,
        cycleSymptoms: <CheckGrid label="Do you experience any of these?" options={["PMS", "Menstrual cramps", "Bleeding between periods", "Pain with intercourse", "I am totally OK (no issues)"]} exclusiveOption="I am totally OK (no issues)" value={form.cycle.symptoms} onChange={(value) => updateGroup("cycle", "symptoms", value)} />,
        extraCycle: optionalHistory("cycle", "Would you like to add more about your period history?"),
        menarcheAge: <RulerSlider label="Age when periods started" value={form.cycle.menarcheAge} onChange={(value) => updateGroup("cycle", "menarcheAge", value)} min={5} max={20} unit="years" />,
        cycleDetails: <TextArea label="Anything else about your periods?" value={form.cycle.details} onChange={(value) => updateGroup("cycle", "details", value)} />,
        pregnancyTest: <ChoiceGroup label="Have you taken a pregnancy test?" options={["Positive", "Negative", "Not yet", "Not sure"]} value={form.cycle.pregnancyTest} onChange={(value) => updateGroup("cycle", "pregnancyTest", value)} />,
        currentStatus: <ChoiceGroup label="Are you currently pregnant?" options={["Yes", "No", "Not sure"]} value={form.pregnancies.currentStatus} onChange={(value) => updateGroup("pregnancies", "currentStatus", value)} />,
        conceptionMethod: <ChoiceGroup label="How was this pregnancy conceived?" options={[...conceptionMethods]} value={form.pregnancies.conceptionMethod} onChange={(value) => updateGroup("pregnancies", "conceptionMethod", value)} />,
        conceptionDetails: <TextInput label="Any conception or treatment details to share? (optional)" value={form.pregnancies.conceptionDetails} onChange={(value) => updateGroup("pregnancies", "conceptionDetails", value)} />,
        weeksPregnant: <div><RulerSlider label="About how many weeks pregnant today?" value={form.pregnancies.weeksPregnant} onChange={(value) => updateGroup("pregnancies", "weeksPregnant", value)} min={1} max={42} unit="weeks" />{datingNote}</div>,
        dueDate: <div><TextInput label="What is your estimated due date, if known?" value={form.pregnancies.dueDate} onChange={(value) => updateGroup("pregnancies", "dueDate", value)} type="date" />{datingNote}</div>,
        totalPregnancies: <CountTile label="Total pregnancies" hint="Include your current pregnancy, if any" icon={Heart} tint="bg-saivie-surface-muted text-saivie-teal" value={form.pregnancies.total} onChange={(value) => setPregnancyCount("total", value)} />,
        extraPregnancy: optionalHistory("pregnancy", "Would you like to share details of your pregnancies?"),
        vaginal: <CountTile label="Vaginal deliveries" hint="How many, if any?" icon={Baby} tint="bg-saivie-blush text-saivie-plum" value={form.pregnancies.vaginal} onChange={(value) => setPregnancyCount("vaginal", value)} />,
        cesarean: <CountTile label="C-sections" hint="How many, if any?" icon={Hospital} tint="bg-saivie-sage text-saivie-teal" value={form.pregnancies.cesarean} onChange={(value) => setPregnancyCount("cesarean", value)} />,
        miscarriages: <CountTile label="Miscarriages" hint="Share only if you feel comfortable" icon={Flower2} tint="bg-saivie-surface-muted text-saivie-teal" value={form.pregnancies.miscarriages} onChange={(value) => setPregnancyCount("miscarriages", value)} />,
        terminations: <CountTile label="Terminations" hint="Share only if you feel comfortable" icon={Leaf} tint="bg-saivie-sage text-saivie-teal" value={form.pregnancies.terminations} onChange={(value) => setPregnancyCount("terminations", value)} />,
        premature: <CountTile label="Premature births" hint="Births before 37 weeks" icon={Timer} tint="bg-saivie-blush text-saivie-plum" value={form.pregnancies.premature} onChange={(value) => setPregnancyCount("premature", value)} />,
        pregnancyDetails: <TextArea label="Anything else about your pregnancies?" value={form.pregnancies.details} onChange={(value) => updateGroup("pregnancies", "details", value)} />,
        gynConcerns: <CheckGrid label="Have you experienced any of these gynecological conditions?" options={["Abnormal pap", "Ectopic pregnancy", "Endometriosis", "Genital warts", "Infertility", "Irregular periods", "Ovarian cysts", "Recurrent miscarriage", "Fibroids", "Vaginal infections", "Vaginal discharge", "Vulvar pain", "None of these"]} exclusiveOption="None of these" value={form.gyn.concerns} onChange={(value) => updateGroup("gyn", "concerns", value)} />,
        extraGyn: optionalHistory("gyn", "Would you like to add optional screening or sexual-health history?"),
        sexuallyActive: <ChoiceGroup label="Are you currently sexually active?" options={["Yes", "No", "Prefer not to answer"]} value={form.gyn.sexuallyActive} onChange={(value) => updateGroup("gyn", "sexuallyActive", value)} />,
        birthControl: <CheckGrid label="Current birth control methods" options={["None", "Pill", "Condoms", "IUD", "Implant", "Other"]} exclusiveOption="None" value={form.gyn.birthControl} onChange={(value) => updateGroup("gyn", "birthControl", value)} />,
        lastPap: <ScreeningTimeline label="Last Pap smear" value={form.gyn.lastPap} onChange={(value) => updateGroup("gyn", "lastPap", value)} />,
        hpvVaccine: <ChoiceGroup label="Are you vaccinated against HPV (cervical cancer vaccine)?" options={["Yes, all doses", "Yes, some doses", "No", "Not sure"]} value={form.gyn.hpvVaccine} onChange={(value) => updateGroup("gyn", "hpvVaccine", value)} />,
        firstEncounterAge: <RulerSlider label="Age at first sexual encounter" value={form.gyn.firstEncounterAge} onChange={(value) => updateGroup("gyn", "firstEncounterAge", value)} min={10} max={80} unit="years" />,
        partnerCount: <RulerSlider label="Total number of partners" value={form.gyn.partnerCount} onChange={(value) => updateGroup("gyn", "partnerCount", value)} min={0} max={100} />,
        gynDetails: <TextArea label="Anything else about your gynecological history?" value={form.gyn.details} onChange={(value) => updateGroup("gyn", "details", value)} />,
        conditions: <CheckGrid label="Have you experienced or been diagnosed with any of these?" options={[...conditions, "None of these"]} exclusiveOption="None of these" value={form.health.conditions} onChange={(value) => updateGroup("health", "conditions", value)} />,
        mammogram: <ScreeningTimeline label="Last mammogram (optional)" value={form.lifestyle.mammogram} onChange={(value) => updateGroup("lifestyle", "mammogram", value)} />,
        colonoscopy: <ScreeningTimeline label="Last colonoscopy (optional)" value={form.lifestyle.colonoscopy} onChange={(value) => updateGroup("lifestyle", "colonoscopy", value)} />,
        medicalDetails: <TextArea label="Would you like to add details about those conditions?" value={form.health.medicalDetails} onChange={(value) => updateGroup("health", "medicalDetails", value)} />,
        medications: <QuickPick label="Which medicines do you take regularly?" noneLabel="Not taking any" options={["Folic acid", "Iron", "Calcium", "Vitamin D", "Thyroid tablet", "Metformin", "BP medicine", "Birth control pill", "Progesterone", "Painkillers"]} value={form.health.medications} onChange={(value) => updateGroup("health", "medications", value)} otherPlaceholder="Medicine name and dose" />,
        allergies: <QuickPick label="Do you have any medicine allergies?" noneLabel="No known allergies" options={["Penicillin", "Sulfa drugs", "Aspirin / NSAIDs", "Latex", "Iodine / contrast dye", "Local anaesthetic"]} value={form.health.allergies} onChange={(value) => updateGroup("health", "allergies", value)} otherPlaceholder="Medicine and reaction" />,
        surgeries: <QuickPick label="Have you had any surgeries?" options={["C-section", "Laparoscopy", "D&C", "Fibroid removal", "Ovarian cyst removal", "Tubal ligation", "Hysterectomy", "Appendix removal", "Gallbladder removal"]} value={form.health.surgeries} onChange={(value) => updateGroup("health", "surgeries", value)} />,
        familyHistory: <QuickPick label="Any conditions in your close family?" noneLabel="Nothing known" options={["Breast cancer", "Ovarian cancer", "Uterine cancer", "Diabetes", "High BP", "Heart disease", "Thyroid", "PCOS", "Twins", "Blood clots"]} value={form.health.familyHistory} onChange={(value) => updateGroup("health", "familyHistory", value)} otherPlaceholder="Condition and relative" />,
        extraBackground: optionalHistory("background", "Would you like to add lifestyle and background information?"),
        referredBy: <TextInput label="Were you referred by someone?" value={form.referredBy} onChange={(value) => update("referredBy", value)} placeholder="Provider name, if any" />,
        occupation: <ChoiceGroup label="What is your occupation?" options={["Homemaker", "Student", "Working professional", "Healthcare worker", "Self-employed", "Retired"]} value={form.occupation} onChange={(value) => update("occupation", value)} />,
        smoking: <ChoiceGroup label="Do you smoke?" options={["Never", "Former", "Current"]} value={form.lifestyle.smoking} onChange={(value) => updateGroup("lifestyle", "smoking", value)} />,
        relationship: <ChoiceGroup label="What is your relationship status?" options={["Single", "Married", "Partnered", "Divorced", "Widowed", "Prefer not to answer"]} value={form.lifestyle.relationship} onChange={(value) => updateGroup("lifestyle", "relationship", value)} />,
        alcohol: <GlassPicker label="Alcohol use" value={form.lifestyle.alcohol} onChange={(value) => updateGroup("lifestyle", "alcohol", value)} />,
        exercise: <ExerciseMeter label="Exercise" value={form.lifestyle.exercise} onChange={(value) => updateGroup("lifestyle", "exercise", value)} />,
        lifestyleOther: <TextArea label="Anything else you would like your care team to know?" value={form.lifestyle.other} onChange={(value) => updateGroup("lifestyle", "other", value)} />,
    };

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center bg-saivie-ivory text-sm text-saivie-teal">Preparing your care journey…</div>;
    }

    if (submitted) {
        const hpvStatus = hpvProtection(form.gyn.hpvVaccine, onboardingData?.patient?.hpvProtection);
        return (
            <main className="flex min-h-screen items-center justify-center bg-saivie-ivory p-6">
                <section className={`${cardClass} w-full max-w-2xl text-center`}>
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-saivie-surface-muted text-saivie-teal"><CheckCircle2 size={32} /></div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-saivie-teal">Thank you</p>
                    <h1 className="font-serif text-3xl font-semibold text-saivie-plum">Your care team is ready</h1>
                    <p className="mt-3 text-sm leading-6 text-saivie-teal">Thanks, {form.name || onboardingData?.patient?.name}. Your answers have been securely shared with the team.</p>
                    <HpvBadge status={hpvStatus} variant="full" className="mt-6" />
                    <div className="mt-7 rounded-2xl border border-saivie-border bg-saivie-ivory p-4 text-left sm:p-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-saivie-teal">While you wait</p>
                        <h2 className="mt-1 font-serif text-xl font-semibold text-saivie-plum">Cervical cancer is preventable</h2>
                        <p className="mt-1 text-xs leading-5 text-saivie-teal">
                            {hpvStatus === "protected"
                                ? "Well done — your HPV vaccine is one of the strongest protections there is. Keep up regular cervical screening to stay fully protected."
                                : ["No", "Not sure", "Yes, some doses"].includes(form.gyn.hpvVaccine) || hpvStatus === "in-progress"
                                ? "Learn how the HPV vaccine and regular screening protect you. Ask your doctor about HPV vaccination at your visit."
                                : "Learn how HPV vaccination and regular screening help prevent cervical cancer."}
                        </p>
                        <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-saivie-plum">
                            <iframe
                                className="h-full w-full"
                                src={`https://www.youtube-nocookie.com/embed/${cervicalCancerVideoId}?rel=0`}
                                title="Cervical cancer: a preventable disease"
                                loading="lazy"
                                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                        <Button
                            variant="outline"
                            className="mt-3 border-saivie-border text-saivie-teal hover:bg-saivie-surface-muted"
                            onClick={() => {
                                if (!printOnboardingSummary(answers)) {
                                    toast({ title: "Unable to print history", description: "Please allow pop-ups to print your onboarding history.", variant: "destructive" });
                                }
                            }}
                            data-testid="button-print-onboarding-summary"
                        >
                            <Printer className="mr-2 h-4 w-4" /> Print onboarding history
                        </Button>
                    </div>
                    <Button className="mt-7 bg-saivie-teal hover:bg-saivie-teal" onClick={() => setLocation("/")}>Done</Button>
                </section>
            </main>
        );
    }

    const currentIndex = Math.max(0, questions.findIndex((question) => question.id === step));
    const currentQuestion = questions[currentIndex];
    const currentSection = sections.find((section) => section.key === currentQuestion.section) ?? sections[0];
    const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

    const goToSection = (offset: number) => {
        const next = questions[currentIndex + offset];
        if (next) setStep(next.id);
    };
    const editSection = (sectionKey: string) => {
        const first = questions.find((question) => question.section === sectionKey);
        if (first) setStep(first.id);
    };
    const reviewSections: { key: string; title: string; items: string[] }[] = [
        { key: "about", title: "About you", items: [answers.name, answers.dob] },
        { key: "concern", title: "Your concern", items: [...answers.concerns, answers.chiefComplaint, ...answers.pain.location, answers.pain.duration, answers.pain.severity, ...answers.pain.relatedSymptoms] },
        { key: "survey", title: "Pre-visit survey", items: [
            ...answers.consultation.directions.map((direction) => surveyDirectionLabels[direction]),
            ...surveyQuestions(answers.consultation.directions).filter((question) => answers.consultation.answers[question]?.trim())
                .map((question) => `${patientSurveyPrompt(question)} ${answers.consultation.answers[question]}`),
        ] },
        { key: "cycle", title: "Cycle", items: [answers.cycle.lastPeriod && `Last period began ${answers.cycle.lastPeriod}`, answers.cycle.lateBy && `Period late: ${answers.cycle.lateBy}`, answers.cycle.regularity, answers.cycle.pregnancyTest && `Pregnancy test: ${answers.cycle.pregnancyTest}`, answers.cycle.menarcheAge && `Periods started at ${answers.cycle.menarcheAge}`, answers.cycle.cycleLength && `${answers.cycle.cycleLength}-day cycle`, answers.cycle.flow, ...answers.cycle.symptoms, answers.cycle.details] },
        { key: "gyn", title: "GYN history", items: [answers.gyn.sexuallyActive && `Sexually active: ${answers.gyn.sexuallyActive}`, answers.gyn.firstEncounterAge && `First sexual encounter at ${answers.gyn.firstEncounterAge}`, answers.gyn.partnerCount && `Partners: ${answers.gyn.partnerCount}`, answers.gyn.lastPap && `Last Pap: ${answers.gyn.lastPap}`, answers.gyn.hpvVaccine && `HPV vaccine: ${answers.gyn.hpvVaccine}`, ...answers.gyn.birthControl, ...answers.gyn.concerns, answers.gyn.details] },
        { key: "pregnancy", title: "Pregnancies", items: [
            answers.pregnancies.currentStatus && `Currently pregnant: ${answers.pregnancies.currentStatus}`,
            answers.pregnancies.conceptionMethod && `How conceived: ${answers.pregnancies.conceptionMethod}`,
            answers.pregnancies.conceptionDetails,
            answers.pregnancies.weeksPregnant && `${answers.pregnancies.weeksPregnant} weeks pregnant`,
            answers.pregnancies.dueDate && `Due date: ${answers.pregnancies.dueDate}`,
            datingEstimate ? `Estimated LMP equivalent: ${datingEstimate.estimatedLmp} (not patient-reported; care team to confirm)` : "",
            ...(["total", "vaginal", "cesarean", "miscarriages", "terminations", "premature"] as const).map((key) =>
                answers.pregnancies[key] && `${key}: ${answers.pregnancies[key]}`),
            answers.pregnancies.details,
        ] },
        { key: "lifestyle", title: "Lifestyle & background", items: [answers.referredBy && `Referred by ${answers.referredBy}`, answers.occupation, answers.lifestyle.smoking && `Smoking: ${answers.lifestyle.smoking}`, answers.lifestyle.relationship, answers.lifestyle.alcohol && `Alcohol: ${answers.lifestyle.alcohol}`, answers.lifestyle.exercise && `Exercise: ${answers.lifestyle.exercise}`, answers.lifestyle.other] },
        { key: "health", title: "Health history", items: [...answers.health.conditions, answers.health.medicalDetails, answers.health.surgeries && `Surgeries: ${splitLines(answers.health.surgeries).join(", ")}`, answers.health.medications && `Medicines: ${splitLines(answers.health.medications).join(", ")}`, answers.health.allergies && `Allergies: ${splitLines(answers.health.allergies).join(", ")}`, answers.health.familyHistory && `Family history: ${splitLines(answers.health.familyHistory).join(", ")}`, answers.lifestyle.mammogram && `Last mammogram: ${answers.lifestyle.mammogram}`, answers.lifestyle.colonoscopy && `Last colonoscopy: ${answers.lifestyle.colonoscopy}`] },
    ];

    return (
        <main className="min-h-screen bg-saivie-ivory text-saivie-plum">
            <style>{`
                @keyframes onboarding-pop { 0% { transform: scale(.6); opacity: .3; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
                .onboarding-pop { display: inline-block; animation: onboarding-pop 260ms cubic-bezier(.3,1.4,.5,1); }
                .onboarding-ruler-slider { height: 24px; }
                .onboarding-ruler-slider::-webkit-slider-runnable-track { height: 3px; border-radius: 999px; background: var(--saivie-sage); }
                .onboarding-ruler-slider::-moz-range-track { height: 3px; border-radius: 999px; background: var(--saivie-sage); }
                .onboarding-ruler-slider::-webkit-slider-thumb { width: 18px; height: 18px; margin-top: -7.5px; border: 3px solid white; border-radius: 50%; background: var(--saivie-teal); box-shadow: 0 1px 5px color-mix(in srgb, var(--saivie-teal) 33%, transparent); appearance: none; }
                .onboarding-ruler-slider::-moz-range-thumb { width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; background: var(--saivie-teal); box-shadow: 0 1px 5px color-mix(in srgb, var(--saivie-teal) 33%, transparent); }
                .onboarding-ruler-slider:focus-visible { outline: 2px solid var(--saivie-teal); outline-offset: 5px; border-radius: 999px; }
            `}</style>
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-[230px] flex-col bg-saivie-sage px-5 py-6 text-saivie-plum lg:flex">
                <div className="flex items-center gap-2.5 font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saivie-sage text-saivie-plum"><Heart size={18} /></span>Saivie</div>
                <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.18em] text-saivie-plum">Your care journey</p>
                <nav className="mt-4 space-y-1" aria-label="Onboarding sections">
                    {visibleSections.map((section, index) => (
                        <button key={section.key} type="button" onClick={() => editSection(section.key)}
                            aria-current={currentQuestion.section === section.key ? "step" : undefined}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition ${currentQuestion.section === section.key ? "bg-saivie-blush text-saivie-plum" : "text-saivie-plum hover:bg-saivie-ivory/50"}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${currentQuestion.section === section.key ? "border-saivie-plum text-saivie-plum" : "border-saivie-plum/30"}`}>
                                {index + 1}
                            </span>
                            {section.title}
                        </button>
                    ))}
                </nav>
                <div className="mt-auto rounded-xl border border-saivie-border bg-saivie-ivory/50 p-3.5">
                    <div className="flex items-center gap-2 text-[11px] font-semibold"><LockKeyhole size={13} className="text-saivie-teal" /> Your privacy matters</div>
                    <p className="mt-1.5 pl-5 text-[10px] leading-4 text-saivie-plum">Your answers are shared only with your care team.</p>
                </div>
            </aside>

            <div className="lg:pl-[230px]">
                <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-saivie-border bg-saivie-ivory/90 px-5 backdrop-blur sm:px-8">
                    <span className="text-sm font-semibold text-saivie-teal lg:hidden">Saivie care journey</span>
                    <span className="hidden items-center gap-2 text-xs text-saivie-teal sm:flex"><ShieldCheck size={15} className="text-saivie-teal" /> Secure patient onboarding</span>
                    <span className="ml-auto rounded-full border border-saivie-border bg-saivie-surface-muted px-3 py-1.5 text-[11px] font-medium text-saivie-teal">{step === "review" ? "Review" : `Question ${currentIndex + 1} of ${questions.length - 1}`}</span>
                </header>

                <div className="mx-auto max-w-[900px] px-4 pb-12 pt-8 sm:px-8 sm:pt-12">
                    <div className="mb-6 flex items-end justify-between gap-4">
                        <div>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-saivie-teal">{currentSection.eyebrow}</p>
                            <h1 ref={questionHeading} tabIndex={-1} className="font-serif text-3xl font-semibold tracking-tight text-saivie-plum outline-none sm:text-4xl">{currentSection.title}</h1>
                        </div>
                        <p className="shrink-0 pb-1 text-xs font-semibold text-saivie-teal"><span className="text-base">{progress}%</span> through</p>
                    </div>
                    <div className="mb-7 h-1.5 overflow-hidden rounded-full bg-saivie-surface-muted">
                        <div className="h-full rounded-full bg-saivie-sage transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>

                    {step !== "review" && (
                        <section key={step} className={`${cardClass} min-h-[260px]`} data-testid={`onboarding-question-${step}`}>
                            <p className="mb-5 text-xs leading-5 text-saivie-teal">
                                {step === "concerns" ? "Choose all that apply. Your next questions will match these concerns." : "Optional. Answer if you can, or skip this question."}
                            </p>
                            {questionContent[currentQuestion.id]}
                            {step === "name" && <p className="mt-6 text-xs leading-5 text-saivie-teal">One question at a time. Your answers stay here as you move back and forth, and are shared only when you submit. Closing or refreshing the page discards unsubmitted answers.</p>}
                        </section>
                    )}

                    {step === "review" && (
                        <section className={cardClass}>
                            <h2 className="font-serif text-lg font-semibold text-saivie-teal">Review your answers</h2>
                            <p className="mt-1 text-xs text-saivie-teal">Check your answers before sharing. Anything skipped remains unanswered.</p>
                            <div className="mt-6 space-y-3 border-t border-saivie-border pt-6">
                                {reviewSections.filter((section) => visibleSections.some((visible) => visible.key === section.key)).map(({ key, title, items: rawItems }) => {
                                    const items = rawItems.filter(Boolean);
                                    return <div key={key} className="rounded-xl border border-saivie-border bg-saivie-ivory p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="font-serif text-base font-semibold text-saivie-teal">{title}</h3>
                                            <button type="button" onClick={() => editSection(key)} aria-label={`Edit ${title}`} className="text-xs font-semibold text-saivie-teal hover:underline">Edit</button>
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-saivie-teal">{items.length ? items.join(" · ") : "Skipped / not answered"}</p>
                                    </div>;
                                })}
                            </div>
                            <div className="mt-5 flex gap-2 rounded-xl bg-saivie-surface-muted p-4 text-xs leading-5 text-saivie-teal">
                                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-saivie-teal" />
                                Your information is securely shared with your care team to help prepare for your visit.
                            </div>
                        </section>
                    )}

                    <div className="mt-5 flex items-center justify-between">
                        {currentIndex > 0 ? (
                            <Button variant="ghost" className="text-xs text-saivie-teal hover:text-saivie-teal" onClick={() => goToSection(-1)}><ArrowLeft className="mr-2 h-3.5 w-3.5" />Back</Button>
                        ) : <span />}
                        {currentIndex < questions.length - 1 ? (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" className="text-xs text-saivie-teal" onClick={() => goToSection(1)}>Skip question</Button>
                                <Button className="h-11 rounded-lg bg-saivie-teal px-5 text-xs font-semibold text-white shadow-lg shadow-saivie-teal/15 hover:bg-saivie-teal" onClick={() => goToSection(1)}>Continue<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button>
                            </div>
                        ) : (
                            <Button className="h-11 rounded-lg bg-saivie-teal px-5 text-xs font-semibold text-white shadow-lg shadow-saivie-teal/15 hover:bg-saivie-teal" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Submitting…" : "Submit to care team"}<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button>
                        )}
                    </div>
                    {step !== "review" && <button type="button" onClick={() => setStep("review")} className="mx-auto mt-5 block text-xs font-semibold text-saivie-teal underline underline-offset-4">Finish early and review my answers</button>}
                    <p className="mt-8 text-center text-[10px] text-saivie-teal">All questions are optional. Skipped answers are not treated as “No”. Your care team can ask for more detail during your visit.</p>
                </div>
            </div>
        </main>
    );
}
