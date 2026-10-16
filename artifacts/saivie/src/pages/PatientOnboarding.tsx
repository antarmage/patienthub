import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Heart, LockKeyhole, ShieldCheck } from "lucide-react";
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
            const historyEntries = (value: string) => value.split("\n").map((entry) => entry.trim()).filter(Boolean);
            const medical = [...form.health.conditions, ...historyEntries(form.health.medicalDetails)];
            const surgical = historyEntries(form.health.surgeries);
            const drug = historyEntries(form.health.medications);
            const allergies = historyEntries(form.health.allergies);
            const history = {
                ...(medical.length ? { medical } : {}),
                ...(surgical.length ? { surgical } : {}),
                ...(drug.length ? { drug } : {}),
                ...(allergies.length ? { allergies } : {}),
                ...(form.health.familyHistory.trim() ? { family: historyEntries(form.health.familyHistory) } : {}),
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

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center bg-[#faf8ff] text-sm text-[#625976]">Preparing your care journey…</div>;
    }

    if (submitted) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#faf8ff] p-6">
                <section className={`${cardClass} w-full max-w-lg text-center`}>
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eee7fa] text-[#66519c]"><CheckCircle2 size={32} /></div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8b70c9]">Thank you</p>
                    <h1 className="font-serif text-3xl font-semibold text-[#382e56]">Your care team is ready</h1>
                    <p className="mt-3 text-sm leading-6 text-[#797187]">Thanks, {form.name || onboardingData?.patient?.name}. Your answers have been securely shared with the team.</p>
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
                                    <TextInput label="Occupation" value={form.occupation} onChange={(value) => update("occupation", value)} placeholder="What you do (optional)" />
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
                                            <TextInput label="How long have you had it?" value={form.pain.duration} onChange={(value) => updateGroup("pain", "duration", value)} placeholder="e.g. since yesterday" />
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
                                <TextArea label="Tell us anything else about your concern" value={form.chiefComplaint} onChange={(value) => update("chiefComplaint", value)} placeholder="Add any details you think would help your care team (optional)" />
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
                                <div className="sm:col-span-2"><TextArea label="Anything else you’d like us to know?" value={form.cycle.details} onChange={(value) => updateGroup("cycle", "details", value)} placeholder="Optional details" /></div>
                            </div>
                        </section>
                    )}

                    {step === "gyn" && (
                        <section className={cardClass}>
                            <SectionHeading number="04" title="Gynecological history" subtitle="Sensitive questions help us provide better care. You may skip any question." />
                            <div className="mt-6 grid gap-5 border-t border-[#eee8f4] pt-6 sm:grid-cols-2">
                                <RulerSlider label="Age at first sexual encounter" value={form.gyn.firstEncounterAge} onChange={(value) => updateGroup("gyn", "firstEncounterAge", value)} min={10} max={80} unit="years" optional />
                                <RulerSlider label="Total number of partners" value={form.gyn.partnerCount} onChange={(value) => updateGroup("gyn", "partnerCount", value)} min={0} max={100} optional />
                                <TextInput label="Date of last Pap smear" value={form.gyn.lastPap} onChange={(value) => updateGroup("gyn", "lastPap", value)} type="date" />
                                <div className="sm:col-span-2"><ChoiceGroup label="Are you currently sexually active?" options={["Yes", "No", "Prefer not to answer"]} value={form.gyn.sexuallyActive} onChange={(value) => updateGroup("gyn", "sexuallyActive", value)} /></div>
                                <div className="sm:col-span-2"><ChoiceGroup label="Have you received the HPV vaccine?" options={["Yes", "No", "Not sure", "Prefer not to answer"]} value={form.gyn.hpvVaccine} onChange={(value) => updateGroup("gyn", "hpvVaccine", value)} /></div>
                                <div className="sm:col-span-2"><CheckGrid label="Current birth control methods" options={["None", "Pill", "Condoms", "IUD", "Implant", "Other"]} value={form.gyn.birthControl} onChange={(value) => updateGroup("gyn", "birthControl", value)} /></div>
                                <div className="sm:col-span-2"><CheckGrid label="Have you experienced any of the following?" options={["Abnormal pap", "Ectopic pregnancy", "Endometriosis", "Genital warts", "Infertility", "Irregular periods", "Ovarian cysts", "Recurrent miscarriage", "Fibroids", "Vaginal infections", "Vaginal discharge", "Vulvar pain"]} value={form.gyn.concerns} onChange={(value) => updateGroup("gyn", "concerns", value)} /></div>
                                <div className="sm:col-span-2"><TextArea label="Details or past birth control methods" value={form.gyn.details} onChange={(value) => updateGroup("gyn", "details", value)} placeholder="Add dates or details your care team should know" /></div>
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
                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                <RulerSlider label="Pregnancies" value={form.pregnancies.total} onChange={(value) => updateGroup("pregnancies", "total", value)} min={0} max={20} />
                                <RulerSlider label="Vaginal deliveries" value={form.pregnancies.vaginal} onChange={(value) => updateGroup("pregnancies", "vaginal", value)} min={0} max={20} />
                                <RulerSlider label="Cesarean sections" value={form.pregnancies.cesarean} onChange={(value) => updateGroup("pregnancies", "cesarean", value)} min={0} max={20} />
                                <RulerSlider label="Miscarriages" value={form.pregnancies.miscarriages} onChange={(value) => updateGroup("pregnancies", "miscarriages", value)} min={0} max={20} />
                                <RulerSlider label="Elective terminations" value={form.pregnancies.terminations} onChange={(value) => updateGroup("pregnancies", "terminations", value)} min={0} max={20} />
                                <RulerSlider label="Premature births" value={form.pregnancies.premature} onChange={(value) => updateGroup("pregnancies", "premature", value)} min={0} max={20} />
                                </div>
                                <TextArea label="Pregnancy details" value={form.pregnancies.details} onChange={(value) => updateGroup("pregnancies", "details", value)} placeholder="Dates, weeks at delivery, delivery type, baby weight, and any complications" />
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
                                    <TextInput label="Alcohol use" value={form.lifestyle.alcohol} onChange={(value) => updateGroup("lifestyle", "alcohol", value)} placeholder="e.g. 2 drinks per week" />
                                    <TextInput label="Exercise" value={form.lifestyle.exercise} onChange={(value) => updateGroup("lifestyle", "exercise", value)} placeholder="e.g. 3 times per week" />
                                    <TextInput label="Last mammogram" value={form.lifestyle.mammogram} onChange={(value) => updateGroup("lifestyle", "mammogram", value)} placeholder="Date or not applicable" />
                                    <TextInput label="Last colonoscopy" value={form.lifestyle.colonoscopy} onChange={(value) => updateGroup("lifestyle", "colonoscopy", value)} placeholder="Date or not applicable" />
                                </div>
                                <TextArea label="Recreational drug use or other context" value={form.lifestyle.other} onChange={(value) => updateGroup("lifestyle", "other", value)} placeholder="Optional" />
                            </div>
                        </section>
                    )}

                    {step === "health" && (
                        <section className={cardClass}>
                            <SectionHeading number="07" title="Medical history" subtitle="Select all that apply. Details can be added below." />
                            <div className="mt-6 space-y-6 border-t border-[#eee8f4] pt-6">
                                <CheckGrid label="Have you ever experienced or been diagnosed with:" options={conditions} value={form.health.conditions} onChange={(value) => updateGroup("health", "conditions", value)} />
                                <TextArea label="Condition details" value={form.health.medicalDetails} onChange={(value) => updateGroup("health", "medicalDetails", value)} placeholder="Include approximate dates or treatment, if known" />
                                <TextArea label="Surgeries and approximate dates" value={form.health.surgeries} onChange={(value) => updateGroup("health", "surgeries", value)} placeholder="Type none if not applicable" />
                                <TextArea label="Current medications and doses" value={form.health.medications} onChange={(value) => updateGroup("health", "medications", value)} placeholder="Include prescriptions, over-the-counter medications, and supplements" />
                                <TextArea label="Medication allergies and reactions" value={form.health.allergies} onChange={(value) => updateGroup("health", "allergies", value)} placeholder="Type none if not applicable" />
                                <TextArea label="Relevant family history" value={form.health.familyHistory} onChange={(value) => updateGroup("health", "familyHistory", value)} placeholder="Condition, relative, maternal or paternal side, and age at diagnosis" />
                            </div>
                        </section>
                    )}

                    {step === "review" && (
                        <section className={cardClass}>
                            <SectionHeading number="08" title="Review your answers" subtitle="Please check your information before sharing it with your care team." />
                            <div className="mt-6 space-y-3 border-t border-[#eee8f4] pt-6">
                                {[
                                    ["About you", [form.name, form.dob, form.referredBy && `Referred by ${form.referredBy}`, form.occupation]],
                                    ["Your concern", [...form.concerns, form.chiefComplaint, ...form.pain.location, form.pain.duration, form.pain.severity, ...form.pain.relatedSymptoms]],
                                    ["Cycle", [form.cycle.lastPeriod && `Last period began ${form.cycle.lastPeriod}`, form.cycle.lateBy && `Period late: ${form.cycle.lateBy}`, form.cycle.regularity, form.cycle.pregnancyTest && `Pregnancy test: ${form.cycle.pregnancyTest}`, form.cycle.menarcheAge && `Periods started at ${form.cycle.menarcheAge}`, form.cycle.cycleLength && `${form.cycle.cycleLength}-day cycle`, form.cycle.flow, ...form.cycle.symptoms, form.cycle.details]],
                                    ["GYN history", [form.gyn.sexuallyActive, form.gyn.hpvVaccine && `HPV vaccine: ${form.gyn.hpvVaccine}`, ...form.gyn.birthControl, ...form.gyn.concerns, form.gyn.details]],
                                    ["Pregnancies", [form.pregnancies.currentStatus && `Currently pregnant: ${form.pregnancies.currentStatus}`, form.pregnancies.weeksPregnant && `${form.pregnancies.weeksPregnant} weeks pregnant`, form.pregnancies.dueDate && `Due date: ${form.pregnancies.dueDate}`, `${form.pregnancies.total} pregnancies`, `${form.pregnancies.vaginal} vaginal deliveries`, `${form.pregnancies.cesarean} cesarean sections`, form.pregnancies.details]],
                                    ["Lifestyle", [form.lifestyle.smoking, form.lifestyle.relationship, form.lifestyle.alcohol, form.lifestyle.exercise, form.lifestyle.other]],
                                    ["Health history", [...form.health.conditions, form.health.medicalDetails, form.health.surgeries && `Surgeries: ${form.health.surgeries}`, form.health.medications && `Medications: ${form.health.medications}`, form.health.allergies && `Allergies: ${form.health.allergies}`, form.health.familyHistory && `Family history: ${form.health.familyHistory}`]],
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
