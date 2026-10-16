import { useEffect, useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Baby, Check, CheckCircle2, Flower2, Heart, Hospital, Leaf, LockKeyhole, Minus, PenLine, Plus, ShieldCheck, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const sections = [
    { key: "about", title: "About you", eyebrow: "First things first" },
    { key: "concern", title: "Your concern", eyebrow: "What brings you in?" },
    { key: "cycle", title: "Cycle", eyebrow: "Your cycle story" },
    { key: "gyn", title: "GYN history", eyebrow: "A little more context" },
    { key: "pregnancy", title: "Pregnancies", eyebrow: "Your pregnancy history" },
    { key: "lifestyle", title: "Lifestyle", eyebrow: "Everyday wellbeing" },
    { key: "health", title: "Health history", eyebrow: "The bigger picture" },
    { key: "review", title: "Review", eyebrow: "Almost there" },
];

// "Cervical cancer: a preventable disease" — PAHO/WHO. Override with VITE_CERVICAL_CANCER_VIDEO_ID.
const cervicalCancerVideoId = import.meta.env.VITE_CERVICAL_CANCER_VIDEO_ID || "pkUmJlvHwQA";

const concernOptions = [
    "Missed or late period",
    "Possible pregnancy",
    "I am pregnant",
    "Pregnancy care",
    "Abdominal or pelvic pain",
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
    "Irritable bowel syndrome", "Thyroid condition", "Kidney disease / stones",
    "Liver disease / hepatitis", "Osteoporosis", "Stroke", "Urinary incontinence",
];

type IntakeForm = {
    name: string;
    dob: string;
    referredBy: string;
    occupation: string;
    chiefComplaint: string;
    concerns: string[];
    pain: { location: string[]; duration: string; severity: string; relatedSymptoms: string[] };
    cycle: { lastPeriod: string; regularity: string; lateBy: string; pregnancyTest: string; menarcheAge: string; cycleLength: string; flow: string; symptoms: string[]; details: string };
    gyn: { firstEncounterAge: string; partnerCount: string; lastPap: string; sexuallyActive: string; hpvVaccine: string; birthControl: string[]; concerns: string[]; details: string };
    pregnancies: { currentStatus: string; weeksPregnant: string; dueDate: string; total: string; vaginal: string; cesarean: string; miscarriages: string; terminations: string; premature: string; details: string };
    lifestyle: { smoking: string; relationship: string; alcohol: string; exercise: string; mammogram: string; colonoscopy: string; other: string };
    health: { conditions: string[]; medicalDetails: string; surgeries: string; medications: string; allergies: string; familyHistory: string };
};

const initialForm: IntakeForm = {
    name: "",
    dob: "",
    referredBy: "",
    occupation: "",
    chiefComplaint: "",
    concerns: [],
    pain: { location: [], duration: "", severity: "", relatedSymptoms: [] },
    cycle: { lastPeriod: "", regularity: "", lateBy: "", pregnancyTest: "", menarcheAge: "", cycleLength: "", flow: "", symptoms: [], details: "" },
    gyn: { firstEncounterAge: "", partnerCount: "", lastPap: "", sexuallyActive: "", hpvVaccine: "", birthControl: [], concerns: [], details: "" },
    pregnancies: { currentStatus: "", weeksPregnant: "", dueDate: "", total: "0", vaginal: "0", cesarean: "0", miscarriages: "0", terminations: "0", premature: "0", details: "" },
    lifestyle: { smoking: "", relationship: "", alcohol: "", exercise: "", mammogram: "", colonoscopy: "", other: "" },
    health: { conditions: [], medicalDetails: "", surgeries: "", medications: "", allergies: "", familyHistory: "" },
};

const inputClass = "w-full rounded-lg border border-[#e8e0f3] bg-[#fdfbff] px-3 py-2.5 text-sm text-[#342c52] placeholder:text-[#aaa2b5] outline-none transition focus:border-[#8b70c9] focus:ring-2 focus:ring-[#d9c8f2]/40";
const labelClass = "mb-1.5 block text-xs font-semibold text-[#625976]";
const cardClass = "rounded-2xl border border-[#e9e3f1] bg-white p-6 shadow-[0_8px_30px_rgba(72,53,106,0.05)] sm:p-8";

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
                <output className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${value ? "bg-[#efe9fb] text-[#5e4b89]" : "bg-[#f4f1f8] text-[#91889d]"}`}>
                    {displayValue}
                </output>
            </div>
            <div className="relative px-1 pb-5 pt-2">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-[18px] flex h-6 justify-between">
                    {marks.map((mark) => (
                        <span key={mark} className={`w-px ${mark % 5 === 0 ? "h-5 bg-[#b7a9d3]" : "mt-1 h-3 bg-[#e5ddec]"}`} />
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
                <div aria-hidden="true" className="mt-2 flex justify-between px-0.5 text-[10px] tabular-nums text-[#91889d]">
                    <span>{min}{unit ? ` ${unit}` : ""}</span>
                    <span>{max}{unit ? ` ${unit}` : ""}</span>
                </div>
            </div>
            {optional && <button type="button" onClick={() => onChange("")} className="mt-1 text-[11px] font-medium text-[#797187] underline decoration-[#d8d0e2] underline-offset-2 hover:text-[#4a3d6e]">Prefer not to answer</button>}
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
                    <stop offset="0%" stopColor="#cbb5f2" />
                    <stop offset="100%" stopColor="#8b70c9" />
                </linearGradient>
            </defs>
            <g clipPath={`url(#${clipId})`}>
                <rect x="0" width="40" height="56" fill={`url(#${clipId}-fill)`}
                    style={{ transform: `translateY(${filled ? 16 : 56}px)`, transition: `transform 450ms cubic-bezier(.3,1.4,.5,1) ${index * 40}ms` }} />
                <ellipse cx="20" cy="16" rx="16" ry="2" fill="#efe6ff" opacity={filled ? 0.9 : 0} style={{ transition: "opacity 300ms" }} />
            </g>
            <path d="M6 4 L34 4 L30 50 Q30 52 28 52 L12 52 Q10 52 10 50 Z" fill="none" stroke={filled ? "#66519c" : "#cfc4df"} strokeWidth="2" strokeLinejoin="round" />
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
                <output className={`rounded-full px-3 py-1 text-sm font-bold ${value ? "bg-[#efe9fb] text-[#5e4b89]" : "bg-[#f4f1f8] text-[#91889d]"}`}>{caption}</output>
            </div>
            <div className="flex flex-wrap items-end gap-1 rounded-xl border border-[#eee8f4] bg-[#fdfbff] px-3 py-3">
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" onClick={() => set(count === n ? n - 1 : n)} aria-label={`${n}${n === max ? "+" : ""} drinks per week`} aria-pressed={n <= count}
                        className="group flex flex-col items-center rounded-lg px-0.5 transition hover:-translate-y-0.5">
                        <Glass filled={n <= count} index={n} />
                        <span className={`mt-0.5 text-[10px] tabular-nums ${n <= count ? "font-bold text-[#66519c]" : "text-[#aaa2b5]"}`}>{n === max ? `${max}+` : n}</span>
                    </button>
                ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#91889d]">
                <span>Drinks per week</span>
                <button type="button" onClick={() => onChange(value === "None" ? "" : "None")} className={`rounded-full border px-2.5 py-1 font-medium transition ${value === "None" ? "border-[#66519c] bg-[#66519c] text-white" : "border-[#e6dfef] text-[#625976] hover:border-[#a18bd0]"}`}>I don't drink</button>
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
                <output className={`rounded-full px-3 py-1 text-sm font-bold ${value ? "bg-[#efe9fb] text-[#5e4b89]" : "bg-[#f4f1f8] text-[#91889d]"}`}>
                    {days < 0 ? "Tap the bars" : `${days} day${days === 1 ? "" : "s"} / week`}
                </output>
            </div>
            <div className="rounded-xl border border-[#eee8f4] bg-[#fdfbff] px-3 pb-2 pt-3">
                <div className="flex h-20 items-end gap-1.5">
                    {dayLabels.map((d, i) => {
                        const active = i < days;
                        return (
                            <button key={i} type="button" onClick={() => onChange(`${days === i + 1 ? i : i + 1} days per week`)} aria-label={`${i + 1} days per week`} aria-pressed={active}
                                className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                                <span className={`w-full rounded-md transition-all duration-300 ${active ? "bg-gradient-to-t from-[#66519c] to-[#aa91dc] shadow-[0_4px_12px_rgba(102,81,156,0.25)]" : "bg-[#eee8f4] hover:bg-[#e2d6f7]"}`}
                                    style={{ height: `${28 + i * 10}%`, transitionDelay: `${i * 35}ms` }} />
                                <span className={`text-[10px] ${active ? "font-bold text-[#66519c]" : "text-[#aaa2b5]"}`}>{d}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#91889d]">
                <span className="font-medium text-[#8b70c9]">{days >= 0 ? exerciseMoods[days] : "Days you move 30+ min"}</span>
                <button type="button" onClick={() => onChange(value === "0 days per week" ? "" : "0 days per week")} className={`rounded-full border px-2.5 py-1 font-medium transition ${days === 0 ? "border-[#66519c] bg-[#66519c] text-white" : "border-[#e6dfef] text-[#625976] hover:border-[#a18bd0]"}`}>Not currently</button>
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
                <output className={`rounded-full px-3 py-1 text-xs font-bold ${value ? "bg-[#efe9fb] text-[#5e4b89]" : "bg-[#f4f1f8] text-[#91889d]"}`}>{value || "When was it?"}</output>
            </div>
            <div className="rounded-xl border border-[#eee8f4] bg-[#fdfbff] px-4 pb-3 pt-4">
                <div className="relative">
                    <div className="absolute left-[11px] right-[11px] top-[9px] h-1 rounded-full bg-[#eee8f4]" />
                    <div className="absolute left-[11px] top-[9px] h-1 rounded-full bg-gradient-to-r from-[#66519c] to-[#aa91dc] transition-all duration-500"
                        style={{ width: selected < 0 ? 0 : `calc((100% - 22px) * ${selected / (screeningStops.length - 1)})` }} />
                    <div className="relative flex justify-between">
                        {screeningStops.map((stop, i) => (
                            <button key={stop} type="button" onClick={() => onChange(value === stop ? "" : stop)} aria-pressed={value === stop} className="flex w-14 flex-col items-center text-center first:items-start last:items-end">
                                <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition ${i === selected ? "scale-110 border-[#66519c] bg-[#66519c] shadow-[0_0_0_4px_rgba(170,145,220,0.3)]" : i < selected ? "border-[#8b70c9] bg-[#cbb5f2]" : "border-[#d8cde8] bg-white hover:border-[#8b70c9]"}`}>
                                    {i === selected && <Check size={12} className="text-white" />}
                                </span>
                                <span className={`mt-1.5 text-[10px] leading-tight ${i === selected ? "font-bold text-[#66519c]" : "text-[#91889d]"}`}>{stop.replace(" ago", "")}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#f1ecf7] pt-3">
                    {["Never had one", "Not applicable", "Not sure"].map((option) => (
                        <button key={option} type="button" onClick={() => onChange(value === option ? "" : option)} aria-pressed={value === option}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${value === option ? "border-[#66519c] bg-[#66519c] text-white" : "border-[#e6dfef] text-[#625976] hover:border-[#a18bd0]"}`}>{option}</button>
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
        <div className={`group relative overflow-hidden rounded-2xl border p-4 transition ${count > 0 ? "border-[#cbb5f2] bg-white shadow-[0_6px_20px_rgba(102,81,156,0.10)]" : "border-[#eee8f4] bg-[#fdfbff]"}`}>
            <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${count > 0 ? tint : "bg-[#f1ecf7] text-[#aaa2b5]"}`}><Icon size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#4a3d6e]">{label}</p>
                    <p className="text-[11px] leading-4 text-[#91889d]">{hint}</p>
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
                <button type="button" onClick={() => set(count - 1)} disabled={count === 0} aria-label={`Decrease ${label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2d6f7] bg-white text-[#66519c] transition hover:bg-[#f5f0ff] active:scale-90 disabled:opacity-30"><Minus size={16} /></button>
                <output key={count} aria-live="polite" className="onboarding-pop font-serif text-4xl font-semibold tabular-nums text-[#382e56]">{count}</output>
                <button type="button" onClick={() => set(count + 1)} aria-label={`Increase ${label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#66519c] text-white shadow-[0_4px_12px_rgba(102,81,156,0.35)] transition hover:bg-[#544181] active:scale-90"><Plus size={16} /></button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5">
                {Array.from({ length: pips }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" onClick={() => set(count === n ? n - 1 : n)} aria-label={`Set ${label} to ${n}`}
                        className={`h-2.5 rounded-full transition-all duration-300 ${n <= count ? "w-5 bg-gradient-to-r from-[#8b70c9] to-[#aa91dc]" : "w-2.5 bg-[#e9e3f1] hover:bg-[#cbb5f2]"}`} />
                ))}
                {count > pips && <span className="ml-1 text-[10px] font-bold text-[#8b70c9]">+{count - pips}</span>}
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
    const chip = (active: boolean) => `inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${active ? "border-[#66519c] bg-[#66519c] text-white shadow-[0_3px_10px_rgba(102,81,156,0.25)]" : "border-[#e6dfef] bg-[#fdfbff] text-[#625976] hover:border-[#a18bd0]"}`;
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
                            placeholder={otherPlaceholder} className="w-56 rounded-full border border-[#cbb5f2] bg-white px-3 py-1.5 text-xs text-[#342c52] outline-none focus:ring-2 focus:ring-[#d9c8f2]/50" />
                    </span>
                ) : (
                    <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#cbb5f2] px-3 py-1.5 text-xs font-medium text-[#8b70c9] hover:bg-[#f5f0ff]"><Plus size={12} />Other</button>
                )}
            </div>
        </fieldset>
    );
}

function NoteToggle({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
    const [open, setOpen] = useState(Boolean(value));
    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#d8cde8] px-3 py-1.5 text-xs font-medium text-[#8b70c9] transition hover:border-[#8b70c9] hover:bg-[#f5f0ff]">
                <PenLine size={13} />{label} <span className="font-normal text-[#aaa2b5]">(optional)</span>
            </button>
        );
    }
    return <TextArea label={label} value={value} onChange={onChange} placeholder={placeholder} />;
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
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${value === option ? "border-[#66519c] bg-[#66519c] text-white" : "border-[#e6dfef] bg-[#fdfbff] text-[#625976] hover:border-[#a18bd0]"}`}>
                        {option}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}

function CheckGrid({ label, options, value, onChange }: {
    label: string; options: string[]; value: string[]; onChange: (value: string[]) => void;
}) {
    const toggle = (option: string) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
    return (
        <fieldset>
            <legend className={labelClass}>{label}</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {options.map((option) => (
                    <label key={option} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${value.includes(option) ? "border-[#a88de0] bg-[#f3edfb] text-[#554476]" : "border-[#e9e3f0] bg-[#fdfbff] text-[#716782]"}`}>
                        <input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} className="accent-[#8b70c9]" />
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
    const [step, setStep] = useState("about");
    const [form, setForm] = useState<IntakeForm>(initialForm);
    const [submitted, setSubmitted] = useState(false);

    const { data: onboardingData, isLoading } = useQuery({
        queryKey: ["/api/onboarding", id],
        queryFn: async () => {
            const response = await fetch("/api/onboarding", { headers: { "X-Appointment-Id": String(id) } });
            if (!response.ok) throw new Error("Failed to load onboarding session");
            return response.json();
        },
    });

    const needsCycle = form.concerns.some((concern) =>
        ["Missed or late period", "Possible pregnancy", "I am pregnant", "Pregnancy care", "Irregular or heavy bleeding"].includes(concern));
    const needsGyn = form.concerns.some((concern) =>
        ["Abdominal or pelvic pain", "Irregular or heavy bleeding", "Fertility", "Birth control", "Routine checkup", "Other"].includes(concern));
    const needsPregnancy = form.concerns.some((concern) =>
        ["Possible pregnancy", "I am pregnant", "Pregnancy care"].includes(concern));
    const visibleSections = [
        sections[0],
        sections[1],
        ...(needsCycle ? [sections[2]] : []),
        ...(needsGyn ? [sections[3]] : []),
        ...(needsPregnancy ? [sections[4]] : []),
        sections[5],
        sections[6],
        sections[7],
    ];
    const visibleSectionKeys = visibleSections.map((section) => section.key).join(",");

    useEffect(() => {
        if (!visibleSectionKeys.split(",").includes(step)) setStep("concern");
    }, [step, visibleSectionKeys]);

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
            const noneValues = ["None", "None known", "No known allergies", "Not taking any", "Nothing known"];
            const historyEntries = (value: string) => value.split("\n").map((entry) => entry.trim()).filter((entry) => entry && !noneValues.includes(entry));
            const medical = [...form.health.conditions, ...historyEntries(form.health.medicalDetails)];
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

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center bg-[#faf8ff] text-sm text-[#625976]">Preparing your care journey…</div>;
    }

    if (submitted) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#faf8ff] p-6">
                <section className={`${cardClass} w-full max-w-2xl text-center`}>
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eee7fa] text-[#66519c]"><CheckCircle2 size={32} /></div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8b70c9]">Thank you</p>
                    <h1 className="font-serif text-3xl font-semibold text-[#382e56]">Your care team is ready</h1>
                    <p className="mt-3 text-sm leading-6 text-[#797187]">Thanks, {form.name || onboardingData?.patient?.name}. Your answers have been securely shared with the team.</p>
                    <div className="mt-7 rounded-2xl border border-[#e9e3f1] bg-[#faf8ff] p-4 text-left sm:p-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b70c9]">While you wait</p>
                        <h2 className="mt-1 font-serif text-xl font-semibold text-[#382e56]">Cervical cancer is preventable</h2>
                        <p className="mt-1 text-xs leading-5 text-[#797187]">
                            {["No", "Not sure", "Yes, some doses"].includes(form.gyn.hpvVaccine)
                                ? "Learn how the HPV vaccine and regular screening protect you. Ask your doctor about HPV vaccination at your visit."
                                : "Learn how HPV vaccination and regular screening help prevent cervical cancer."}
                        </p>
                        <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-[#332852]">
                            <iframe
                                className="h-full w-full"
                                src={`https://www.youtube-nocookie.com/embed/${cervicalCancerVideoId}?rel=0`}
                                title="Cervical cancer: a preventable disease"
                                loading="lazy"
                                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                    <Button className="mt-7 bg-[#66519c] hover:bg-[#544181]" onClick={() => setLocation("/")}>Done</Button>
                </section>
            </main>
        );
    }

    const currentIndex = visibleSections.findIndex((section) => section.key === step);
    const currentSection = visibleSections[currentIndex] ?? visibleSections[0];
    const progress = Math.round(((currentIndex + 1) / visibleSections.length) * 100);

    const goToSection = (offset: number) => {
        const next = visibleSections[currentIndex + offset];
        if (next) setStep(next.key);
    };

    return (
        <main className="min-h-screen bg-[#faf8ff] text-[#342c52]">
            <style>{`
                @keyframes onboarding-pop { 0% { transform: scale(.6); opacity: .3; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
                .onboarding-pop { display: inline-block; animation: onboarding-pop 260ms cubic-bezier(.3,1.4,.5,1); }
                .onboarding-ruler-slider { height: 24px; }
                .onboarding-ruler-slider::-webkit-slider-runnable-track { height: 3px; border-radius: 999px; background: #c5b4e8; }
                .onboarding-ruler-slider::-moz-range-track { height: 3px; border-radius: 999px; background: #c5b4e8; }
                .onboarding-ruler-slider::-webkit-slider-thumb { width: 18px; height: 18px; margin-top: -7.5px; border: 3px solid white; border-radius: 50%; background: #66519c; box-shadow: 0 1px 5px #66519c55; appearance: none; }
                .onboarding-ruler-slider::-moz-range-thumb { width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; background: #66519c; box-shadow: 0 1px 5px #66519c55; }
                .onboarding-ruler-slider:focus-visible { outline: 2px solid #aa91dc; outline-offset: 5px; border-radius: 999px; }
            `}</style>
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-[230px] flex-col bg-[#332852] px-5 py-6 text-white lg:flex">
                <div className="flex items-center gap-2.5 font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#cbb5f2] text-[#382e56]"><Heart size={18} /></span>Saivie</div>
                <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c2b4dc]">Your care journey</p>
                <nav className="mt-4 space-y-1" aria-label="Onboarding sections">
                    {visibleSections.map((section, index) => (
                        <button key={section.key} type="button" onClick={() => setStep(section.key)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition ${step === section.key ? "bg-white/15 text-white" : "text-[#d4cbe4] hover:bg-white/10"}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${index < currentIndex ? "border-[#cbb5f2] bg-[#cbb5f2] text-[#382e56]" : step === section.key ? "border-[#cbb5f2] text-[#cbb5f2]" : "border-white/30"}`}>
                                {index < currentIndex ? <Check size={12} /> : index + 1}
                            </span>
                            {section.title}
                        </button>
                    ))}
                </nav>
                <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <div className="flex items-center gap-2 text-[11px] font-semibold"><LockKeyhole size={13} className="text-[#cbb5f2]" /> Your privacy matters</div>
                    <p className="mt-1.5 pl-5 text-[10px] leading-4 text-[#d4cbe4]">Your answers are shared only with your care team.</p>
                </div>
            </aside>

            <div className="lg:pl-[230px]">
                <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#e8e1ef] bg-white/90 px-5 backdrop-blur sm:px-8">
                    <span className="text-sm font-semibold text-[#4a3d6e] lg:hidden">Saivie care journey</span>
                    <span className="hidden items-center gap-2 text-xs text-[#7a7186] sm:flex"><ShieldCheck size={15} className="text-[#8b70c9]" /> Secure patient onboarding</span>
                    <span className="ml-auto rounded-full border border-[#e5daf8] bg-[#f5effc] px-3 py-1.5 text-[11px] font-medium text-[#655282]">Step {currentIndex + 1} of {visibleSections.length}</span>
                </header>

                <div className="mx-auto max-w-[900px] px-4 pb-12 pt-8 sm:px-8 sm:pt-12">
                    <div className="mb-6 flex items-end justify-between gap-4">
                        <div>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e79bf]">{currentSection.eyebrow}</p>
                            <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#382e56] sm:text-4xl">{currentSection.title}</h1>
                        </div>
                        <p className="shrink-0 pb-1 text-xs font-semibold text-[#66519c]"><span className="text-base">{progress}%</span> complete</p>
                    </div>
                    <div className="mb-7 h-1.5 overflow-hidden rounded-full bg-[#e9e2f1]">
                        <div className="h-full rounded-full bg-[#aa91dc] transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>

                    {step === "about" && (
                        <div className="space-y-4">
                            <div className="flex gap-3 rounded-2xl border border-[#e6ddf3] bg-[#f3eef9] p-5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e5d8f6] text-[#66519c]"><Heart size={18} /></span>
                                <div><h2 className="font-serif text-base font-semibold text-[#4a3d6e]">Let’s get to know you</h2><p className="mt-1 text-xs leading-5 text-[#797187]">This helps your care team prepare for your visit. Take your time—your answers are saved when you submit.</p></div>
                            </div>
                            <section className={cardClass}>
                                <SectionHeading number="01" title="Your details" subtitle="Tell us the basics." />
                                <div className="mt-6 grid gap-5 border-t border-[#eee8f4] pt-6 sm:grid-cols-2">
                                    <TextInput label="Full name" value={form.name} onChange={(value) => update("name", value)} placeholder="Your full name" />
                                    <TextInput label="Date of birth" value={form.dob} onChange={(value) => update("dob", value)} type="date" />
                                    <TextInput label="Referred by" value={form.referredBy} onChange={(value) => update("referredBy", value)} placeholder="Provider name (optional)" />
                                    <ChoiceGroup label="Occupation" options={["Homemaker", "Student", "Working professional", "Healthcare worker", "Self-employed", "Retired"]} value={form.occupation} onChange={(value) => update("occupation", value)} />
                                </div>
                            </section>
                        </div>
                    )}

                    {step === "concern" && (
                        <section className={cardClass}>
                            <SectionHeading number="02" title="What brings you in today?" subtitle="Choose all the topics you would like help with. We’ll ask a few relevant follow-up questions." />
                            <div className="mt-6 space-y-6 border-t border-[#eee8f4] pt-6">
                                <CheckGrid label="Your visit concerns" options={concernOptions} value={form.concerns} onChange={(value) => update("concerns", value)} />
                                {form.concerns.includes("Abdominal or pelvic pain") && (
                                    <div className="space-y-5 rounded-xl border border-[#e9e3f0] bg-[#fdfbff] p-4">
                                        <h3 className="font-serif text-sm font-semibold text-[#4a3d6e]">About the pain</h3>
                                        <CheckGrid label="Where do you feel it?" options={["Lower abdomen", "One side", "Pelvis", "Back", "Not sure"]} value={form.pain.location} onChange={(value) => updateGroup("pain", "location", value)} />
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <ChoiceGroup label="How long have you had it?" options={["Today", "2–3 days", "About a week", "A few weeks", "Months or longer"]} value={form.pain.duration} onChange={(value) => updateGroup("pain", "duration", value)} />
                                            <ChoiceGroup label="How would you describe it?" options={["Mild", "Moderate", "Severe", "Comes and goes"]} value={form.pain.severity} onChange={(value) => updateGroup("pain", "severity", value)} />
                                        </div>
                                        <CheckGrid label="Anything else happening with it?" options={["Fever", "Nausea or vomiting", "Bleeding", "Dizziness", "None of these", "Prefer not to say"]} value={form.pain.relatedSymptoms} onChange={(value) => updateGroup("pain", "relatedSymptoms", value)} />
                                    </div>
                                )}
                                {needsCycle && (
                                    <div className="space-y-5 rounded-xl border border-[#e6ddf3] bg-[#f5f0fb] p-4">
                                        <h3 className="font-serif text-sm font-semibold text-[#4a3d6e]">A little about your cycle</h3>
                                        {(form.concerns.includes("Missed or late period") || form.concerns.includes("Possible pregnancy") || form.concerns.includes("Pregnancy care")) && (
                                            <>
                                                <TextInput label="When did your last period start?" value={form.cycle.lastPeriod} onChange={(value) => updateGroup("cycle", "lastPeriod", value)} type="date" />
                                                {form.concerns.includes("Missed or late period") && (
                                                    <ChoiceGroup label="How late is your period?" options={["Less than a week", "1–2 weeks", "More than 2 weeks", "Not sure"]} value={form.cycle.lateBy} onChange={(value) => updateGroup("cycle", "lateBy", value)} />
                                                )}
                                            </>
                                        )}
                                        {form.concerns.some((concern) => ["Missed or late period", "Irregular or heavy bleeding"].includes(concern)) && (
                                            <ChoiceGroup label="Are your periods usually regular?" options={["Usually regular", "Often irregular", "Not sure"]} value={form.cycle.regularity} onChange={(value) => updateGroup("cycle", "regularity", value)} />
                                        )}
                                        {needsPregnancy && (
                                            <ChoiceGroup label="Have you taken a pregnancy test?" options={["Positive", "Negative", "Not yet", "Prefer not to answer"]} value={form.cycle.pregnancyTest} onChange={(value) => updateGroup("cycle", "pregnancyTest", value)} />
                                        )}
                                    </div>
                                )}
                                <NoteToggle label="Tell us more about your concern" value={form.chiefComplaint} onChange={(value) => update("chiefComplaint", value)} placeholder="Add any details you think would help your care team" />
                                {!form.concerns.length && <p className="text-xs text-[#7b887f]">Select a topic to see relevant questions. You can also continue without selecting one.</p>}
                            </div>
                        </section>
                    )}

                    {step === "cycle" && (
                        <section className={cardClass}>
                            <SectionHeading number="03" title="Menstrual history" subtitle="Share what your typical cycle looks like." />
                            <div className="mt-6 grid gap-5 border-t border-[#eee8f4] pt-6 sm:grid-cols-2">
                                <RulerSlider label="Age when periods started" value={form.cycle.menarcheAge} onChange={(value) => updateGroup("cycle", "menarcheAge", value)} min={5} max={20} unit="years" optional />
                                <RulerSlider label="Typical cycle length" value={form.cycle.cycleLength} onChange={(value) => updateGroup("cycle", "cycleLength", value)} min={15} max={90} unit="days" optional />
                                {form.concerns.includes("Irregular or heavy bleeding") && <div className="sm:col-span-2"><ChoiceGroup label="How would you describe your flow?" options={["Light", "Average", "Heavy", "Not sure"]} value={form.cycle.flow} onChange={(value) => updateGroup("cycle", "flow", value)} /></div>}
                                <div className="sm:col-span-2"><CheckGrid label="Do you experience any of these?" options={["PMS", "Menstrual cramps", "Bleeding between periods", "Pain with intercourse"]} value={form.cycle.symptoms} onChange={(value) => updateGroup("cycle", "symptoms", value)} /></div>
                                <div className="sm:col-span-2"><NoteToggle label="Add anything else" value={form.cycle.details} onChange={(value) => updateGroup("cycle", "details", value)} placeholder="Optional details" /></div>
                            </div>
                        </section>
                    )}

                    {step === "gyn" && (
                        <section className={cardClass}>
                            <SectionHeading number="04" title="Gynecological history" subtitle="Sensitive questions help us provide better care. You may skip any question." />
                            <div className="mt-6 grid gap-5 border-t border-[#eee8f4] pt-6 sm:grid-cols-2">
                                <RulerSlider label="Age at first sexual encounter" value={form.gyn.firstEncounterAge} onChange={(value) => updateGroup("gyn", "firstEncounterAge", value)} min={10} max={80} unit="years" optional />
                                <RulerSlider label="Total number of partners" value={form.gyn.partnerCount} onChange={(value) => updateGroup("gyn", "partnerCount", value)} min={0} max={100} optional />
                                <ScreeningTimeline label="Last Pap smear" value={form.gyn.lastPap} onChange={(value) => updateGroup("gyn", "lastPap", value)} />
                                <div className="sm:col-span-2"><ChoiceGroup label="Are you currently sexually active?" options={["Yes", "No", "Prefer not to answer"]} value={form.gyn.sexuallyActive} onChange={(value) => updateGroup("gyn", "sexuallyActive", value)} /></div>
                                <div className="sm:col-span-2"><CheckGrid label="Current birth control methods" options={["None", "Pill", "Condoms", "IUD", "Implant", "Other"]} value={form.gyn.birthControl} onChange={(value) => updateGroup("gyn", "birthControl", value)} /></div>
                                <div className="sm:col-span-2"><CheckGrid label="Have you experienced any of the following?" options={["Abnormal pap", "Ectopic pregnancy", "Endometriosis", "Genital warts", "Infertility", "Irregular periods", "Ovarian cysts", "Recurrent miscarriage", "Fibroids", "Vaginal infections", "Vaginal discharge", "Vulvar pain"]} value={form.gyn.concerns} onChange={(value) => updateGroup("gyn", "concerns", value)} /></div>
                                <div className="sm:col-span-2"><NoteToggle label="Add details or past birth control" value={form.gyn.details} onChange={(value) => updateGroup("gyn", "details", value)} placeholder="Add dates or details your care team should know" /></div>
                            </div>
                        </section>
                    )}

                    {step === "pregnancy" && (
                        <section className={cardClass}>
                            <SectionHeading number="05" title="Pregnancy history" subtitle="Share what you are comfortable sharing. These answers help your care team prepare." />
                            <div className="mt-6 space-y-5 border-t border-[#eee8f4] pt-6">
                                <ChoiceGroup label="Are you currently pregnant?" options={["Yes", "No", "Not sure", "Prefer not to answer"]} value={form.pregnancies.currentStatus} onChange={(value) => updateGroup("pregnancies", "currentStatus", value)} />
                                {form.pregnancies.currentStatus === "Yes" && (
                                    <div className="grid gap-5 rounded-xl bg-[#f5f0fb] p-4 sm:grid-cols-2">
                                        <RulerSlider label="About how many weeks pregnant?" value={form.pregnancies.weeksPregnant} onChange={(value) => updateGroup("pregnancies", "weeksPregnant", value)} min={1} max={42} unit="weeks" optional />
                                        <TextInput label="Estimated due date" value={form.pregnancies.dueDate} onChange={(value) => updateGroup("pregnancies", "dueDate", value)} type="date" />
                                    </div>
                                )}
                                <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#f5f0ff] to-[#fdfbff] px-4 py-3">
                                    <p className="text-xs text-[#625976]">Tap <span className="font-semibold text-[#66519c]">+</span> or the dots to count. Leave at 0 if it doesn’t apply.</p>
                                    {Number(form.pregnancies.total) > 0 && <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#66519c] shadow-sm">{form.pregnancies.total} pregnanc{form.pregnancies.total === "1" ? "y" : "ies"}</span>}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    <CountTile label="Pregnancies" hint="Total, including current" icon={Heart} tint="bg-[#efe6ff] text-[#66519c]" value={form.pregnancies.total} onChange={(value) => setPregnancyCount("total", value)} />
                                    <CountTile label="Normal deliveries" hint="Vaginal births" icon={Baby} tint="bg-[#fde7f1] text-[#b4537f]" value={form.pregnancies.vaginal} onChange={(value) => setPregnancyCount("vaginal", value)} />
                                    <CountTile label="C-sections" hint="Cesarean births" icon={Hospital} tint="bg-[#e4effd] text-[#4c6fae]" value={form.pregnancies.cesarean} onChange={(value) => setPregnancyCount("cesarean", value)} />
                                    <CountTile label="Miscarriages" hint="Pregnancy loss" icon={Flower2} tint="bg-[#f3e8fb] text-[#8b5fb0]" value={form.pregnancies.miscarriages} onChange={(value) => setPregnancyCount("miscarriages", value)} />
                                    <CountTile label="Terminations" hint="Planned endings (MTP)" icon={Leaf} tint="bg-[#e7f5ef] text-[#4b8a6e]" value={form.pregnancies.terminations} onChange={(value) => setPregnancyCount("terminations", value)} />
                                    <CountTile label="Premature births" hint="Born before 37 weeks" icon={Timer} tint="bg-[#fff3e2] text-[#b07a2c]" value={form.pregnancies.premature} onChange={(value) => setPregnancyCount("premature", value)} />
                                </div>
                                <NoteToggle label="Add pregnancy details" value={form.pregnancies.details} onChange={(value) => updateGroup("pregnancies", "details", value)} placeholder="Dates, weeks at delivery, baby weight, and any complications" />
                            </div>
                        </section>
                    )}

                    {step === "lifestyle" && (
                        <section className={cardClass}>
                            <SectionHeading number="06" title="Social & lifestyle" subtitle="Daily habits can offer useful context for your care." />
                            <div className="mt-6 space-y-6 border-t border-[#eee8f4] pt-6">
                                <ChoiceGroup label="Smoking history" options={["Never", "Former", "Current"]} value={form.lifestyle.smoking} onChange={(value) => updateGroup("lifestyle", "smoking", value)} />
                                <ChoiceGroup label="Relationship status" options={["Single", "Married", "Partnered", "Divorced", "Widowed", "Prefer not to answer"]} value={form.lifestyle.relationship} onChange={(value) => updateGroup("lifestyle", "relationship", value)} />
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <GlassPicker label="Alcohol use" value={form.lifestyle.alcohol} onChange={(value) => updateGroup("lifestyle", "alcohol", value)} />
                                    <ExerciseMeter label="Exercise" value={form.lifestyle.exercise} onChange={(value) => updateGroup("lifestyle", "exercise", value)} />
                                    <ScreeningTimeline label="Last mammogram" value={form.lifestyle.mammogram} onChange={(value) => updateGroup("lifestyle", "mammogram", value)} />
                                    <ScreeningTimeline label="Last colonoscopy" value={form.lifestyle.colonoscopy} onChange={(value) => updateGroup("lifestyle", "colonoscopy", value)} />
                                </div>
                                <NoteToggle label="Add other context" value={form.lifestyle.other} onChange={(value) => updateGroup("lifestyle", "other", value)} placeholder="Recreational drug use or anything else" />
                            </div>
                        </section>
                    )}

                    {step === "health" && (
                        <section className={cardClass}>
                            <SectionHeading number="07" title="Medical history" subtitle="Just tap what applies — no typing needed. Use “Other” only if something is missing." />
                            <div className="mt-6 space-y-6 border-t border-[#eee8f4] pt-6">
                                <CheckGrid label="Have you ever experienced or been diagnosed with:" options={conditions} value={form.health.conditions} onChange={(value) => updateGroup("health", "conditions", value)} />
                                <NoteToggle label="Add condition details" value={form.health.medicalDetails} onChange={(value) => updateGroup("health", "medicalDetails", value)} placeholder="Include approximate dates or treatment, if known" />
                                <QuickPick label="Past surgeries" options={["C-section", "Laparoscopy", "D&C", "Fibroid removal", "Ovarian cyst removal", "Tubal ligation", "Hysterectomy", "Appendix removal", "Gallbladder removal"]} value={form.health.surgeries} onChange={(value) => updateGroup("health", "surgeries", value)} />
                                <QuickPick label="Medicines you take regularly" noneLabel="Not taking any" options={["Folic acid", "Iron", "Calcium", "Vitamin D", "Thyroid tablet", "Metformin", "BP medicine", "Birth control pill", "Progesterone", "Painkillers"]} value={form.health.medications} onChange={(value) => updateGroup("health", "medications", value)} otherPlaceholder="Medicine name and dose" />
                                <QuickPick label="Medicine allergies" noneLabel="No known allergies" options={["Penicillin", "Sulfa drugs", "Aspirin / NSAIDs", "Latex", "Iodine / contrast dye", "Local anaesthetic"]} value={form.health.allergies} onChange={(value) => updateGroup("health", "allergies", value)} otherPlaceholder="Medicine and reaction" />
                                <QuickPick label="Family history (parents, siblings, grandparents)" noneLabel="Nothing known" options={["Breast cancer", "Ovarian cancer", "Uterine cancer", "Diabetes", "High BP", "Heart disease", "Thyroid", "PCOS", "Twins", "Blood clots"]} value={form.health.familyHistory} onChange={(value) => updateGroup("health", "familyHistory", value)} otherPlaceholder="Condition and relative" />
                            </div>
                        </section>
                    )}

                    {step === "review" && (
                        <section className={cardClass}>
                            <SectionHeading number="08" title="Review your answers" subtitle="Please check your information before sharing it with your care team." />
                            <div className="mt-6 rounded-2xl border border-[#e2d6f7] bg-gradient-to-br from-[#f5f0ff] to-[#fdfbff] p-5">
                                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b70c9]">One last question</p>
                                <ChoiceGroup label="Are you vaccinated against HPV (cervical cancer vaccine)?" options={["Yes, all doses", "Yes, some doses", "No", "Not sure"]} value={form.gyn.hpvVaccine} onChange={(value) => updateGroup("gyn", "hpvVaccine", value)} />
                                <p className="mt-3 text-xs leading-5 text-[#797187]">The HPV vaccine protects against the virus that causes most cervical cancers. Your doctor can guide you if you're not sure.</p>
                            </div>
                            <div className="mt-6 space-y-3 border-t border-[#eee8f4] pt-6">
                                {[
                                    ["About you", [form.name, form.dob, form.referredBy && `Referred by ${form.referredBy}`, form.occupation]],
                                    ["Your concern", [...form.concerns, form.chiefComplaint, ...form.pain.location, form.pain.duration, form.pain.severity, ...form.pain.relatedSymptoms]],
                                    ["Cycle", [form.cycle.lastPeriod && `Last period began ${form.cycle.lastPeriod}`, form.cycle.lateBy && `Period late: ${form.cycle.lateBy}`, form.cycle.regularity, form.cycle.pregnancyTest && `Pregnancy test: ${form.cycle.pregnancyTest}`, form.cycle.menarcheAge && `Periods started at ${form.cycle.menarcheAge}`, form.cycle.cycleLength && `${form.cycle.cycleLength}-day cycle`, form.cycle.flow, ...form.cycle.symptoms, form.cycle.details]],
                                    ["GYN history", [form.gyn.sexuallyActive, form.gyn.lastPap && `Last Pap: ${form.gyn.lastPap}`, ...form.gyn.birthControl, ...form.gyn.concerns, form.gyn.details]],
                                    ["Pregnancies", [form.pregnancies.currentStatus && `Currently pregnant: ${form.pregnancies.currentStatus}`, form.pregnancies.weeksPregnant && `${form.pregnancies.weeksPregnant} weeks pregnant`, form.pregnancies.dueDate && `Due date: ${form.pregnancies.dueDate}`, `${form.pregnancies.total} pregnancies`, `${form.pregnancies.vaginal} normal deliveries`, `${form.pregnancies.cesarean} C-sections`, Number(form.pregnancies.miscarriages) > 0 && `${form.pregnancies.miscarriages} miscarriages`, Number(form.pregnancies.terminations) > 0 && `${form.pregnancies.terminations} terminations`, Number(form.pregnancies.premature) > 0 && `${form.pregnancies.premature} premature births`, form.pregnancies.details]],
                                    ["Lifestyle", [form.lifestyle.smoking, form.lifestyle.relationship, form.lifestyle.alcohol && `Alcohol: ${form.lifestyle.alcohol}`, form.lifestyle.exercise && `Exercise: ${form.lifestyle.exercise}`, form.lifestyle.mammogram && `Last mammogram: ${form.lifestyle.mammogram}`, form.lifestyle.colonoscopy && `Last colonoscopy: ${form.lifestyle.colonoscopy}`, form.lifestyle.other]],
                                    ["Health history", [...form.health.conditions, form.health.medicalDetails, form.health.surgeries && `Surgeries: ${splitLines(form.health.surgeries).join(", ")}`, form.health.medications && `Medicines: ${splitLines(form.health.medications).join(", ")}`, form.health.allergies && `Allergies: ${splitLines(form.health.allergies).join(", ")}`, form.health.familyHistory && `Family history: ${splitLines(form.health.familyHistory).join(", ")}`]],
                                ].map(([title, rawItems]) => {
                                    const items = (rawItems as (string | false)[]).filter(Boolean);
                                    return <div key={title as string} className="rounded-xl border border-[#ebe5f2] bg-[#fdfbff] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="font-serif text-base font-semibold text-[#4a3d6e]">{title}</h3>
                                            <button type="button" onClick={() => {
                                                const targetKey = sections.find((section) => section.title === title)?.key;
                                                if (targetKey && visibleSections.some((section) => section.key === targetKey)) setStep(targetKey);
                                                else setStep("concern");
                                            }} className="text-xs font-semibold text-[#8368bf] hover:underline">Edit</button>
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-[#797187]">{items.length ? items.join(" · ") : "No details added"}</p>
                                    </div>;
                                })}
                            </div>
                            <div className="mt-5 flex gap-2 rounded-xl bg-[#f2ecf9] p-4 text-xs leading-5 text-[#6e6480]">
                                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#8368bf]" />
                                Your information is securely shared with your care team to help prepare for your visit.
                            </div>
                        </section>
                    )}

                    <div className="mt-5 flex items-center justify-between">
                        {currentIndex > 0 ? (
                            <Button variant="ghost" className="text-xs text-[#797187] hover:text-[#4a3d6e]" onClick={() => goToSection(-1)}><ArrowLeft className="mr-2 h-3.5 w-3.5" />Back</Button>
                        ) : <span />}
                        {currentIndex < visibleSections.length - 1 ? (
                            <Button className="h-11 rounded-lg bg-[#66519c] px-5 text-xs font-semibold text-white shadow-lg shadow-[#66519c]/15 hover:bg-[#544181]" onClick={() => goToSection(1)}>Continue<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button>
                        ) : (
                            <Button className="h-11 rounded-lg bg-[#66519c] px-5 text-xs font-semibold text-white shadow-lg shadow-[#66519c]/15 hover:bg-[#544181]" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Submitting…" : "Submit to care team"}<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button>
                        )}
                    </div>
                    <p className="mt-8 text-center text-[10px] text-[#91889d]">You may skip sensitive questions. Your information is only shared with your care team.</p>
                </div>
            </div>
        </main>
    );
}

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
    return (
        <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eee7f7] text-[10px] font-bold text-[#8167b7]">{number}</span>
            <div><h2 className="font-serif text-lg font-semibold text-[#4a3d6e]">{title}</h2><p className="mt-0.5 text-xs text-[#8a8194]">{subtitle}</p></div>
        </div>
    );
}
