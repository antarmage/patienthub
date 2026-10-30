import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, Check, CheckCircle2, FileText, FlaskConical, LockKeyhole, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    LAB_ALLERGY_OPTIONS, LAB_DRAW_OPTIONS, LAB_ILLNESS_OPTIONS, LAB_MEAL_OPTIONS, LAB_MEDICINE_OPTIONS, LAB_PERIOD_SKIP,
    initialLabSurvey, labSurveyErrors, labSurveyPayload, type LabSurveyForm,
} from "@/lib/labSurvey";

const cardClass = "rounded-2xl border border-saivie-border bg-saivie-ivory p-5 shadow-[0_8px_30px_color-mix(in_srgb,var(--saivie-teal)_5%,transparent)] sm:p-7";
const inputClass = "w-full rounded-lg border border-saivie-border bg-white px-3 py-2.5 text-sm text-saivie-plum placeholder:text-saivie-teal/70 outline-none transition focus:border-saivie-teal focus:ring-2 focus:ring-saivie-sage";
const labelClass = "mb-2 block text-sm font-semibold text-saivie-plum";
const MAX_BYTES = 8 * 1024 * 1024;

function Chips({ options, value, onChange, multiple = false }: { options: string[]; value: string | string[]; onChange: (value: any) => void; multiple?: boolean }) {
    const selected = (option: string) => (Array.isArray(value) ? value.includes(option) : value === option);
    const toggle = (option: string) => {
        if (!multiple) return onChange(value === option ? "" : option);
        const list = value as string[];
        if (option === "None") return onChange(list.includes("None") ? [] : ["None"]);
        const next = list.includes(option) ? list.filter((item) => item !== option) : [...list.filter((item) => item !== "None"), option];
        onChange(next);
    };
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => toggle(option)}
                    aria-pressed={selected(option)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition ${selected(option) ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-border bg-white text-saivie-plum hover:border-saivie-teal"}`}
                >
                    {selected(option) && <Check className="h-3.5 w-3.5" />}{option}
                </button>
            ))}
        </div>
    );
}

function Question({ number, label, hint, children }: { number: number; label: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className="border-t border-saivie-border pt-5 first:border-t-0 first:pt-0">
            <span className={labelClass}><span className="mr-2 text-saivie-rose">{number}.</span>{label}</span>
            {hint && <p className="-mt-1 mb-2 text-xs text-saivie-teal">{hint}</p>}
            {children}
        </section>
    );
}

const readFile = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
});

export default function LabSurvey({ appointmentId, onboardingData }: { appointmentId: string; onboardingData: any }) {
    const [form, setForm] = useState<LabSurveyForm>(initialLabSurvey);
    const [prescription, setPrescription] = useState<File | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const set = <K extends keyof LabSurveyForm>(key: K) => (value: LabSurveyForm[K]) => setForm((current) => ({ ...current, [key]: value }));

    useEffect(() => {
        const patient = onboardingData?.patient;
        if (patient) setForm((current) => ({ ...current, name: current.name || patient.name || "", dob: current.dob || patient.dob || "" }));
    }, [onboardingData]);

    const submit = useMutation({
        mutationFn: async () => {
            const payload: Record<string, unknown> = labSurveyPayload(form);
            if (prescription) payload.labPrescription = { fileData: await readFile(prescription), mimeType: prescription.type, fileName: prescription.name };
            const response = await fetch(`/api/onboarding/${appointmentId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Could not submit your answers. Please try again.");
        },
        onSuccess: () => { setSubmitted(true); window.scrollTo({ top: 0 }); },
        onError: (error: Error) => setErrors([error.message]),
    });

    const pickFile = (file: File | undefined) => {
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) return setErrors(["Please upload a photo (JPG, PNG) or a PDF."]);
        if (file.size > MAX_BYTES) return setErrors(["That file is larger than 8 MB. Please take a smaller photo."]);
        setErrors([]);
        setPrescription(file);
    };

    const onSubmit = () => {
        const problems = labSurveyErrors(form, Boolean(prescription));
        setErrors(problems);
        if (problems.length) return window.scrollTo({ top: 0, behavior: "smooth" });
        submit.mutate();
    };

    if (submitted) {
        const notFasting = form.lastMeal === LAB_MEAL_OPTIONS[0] || form.lastMeal === LAB_MEAL_OPTIONS[1];
        const tips = [
            notFasting && "You've eaten recently. Some tests (fasting sugar, lipid profile) need 8–12 hours of fasting — please tell the lab team.",
            form.medicines.some((m) => /biotin/i.test(m)) && "Please mention your biotin supplement to the lab team — it can affect thyroid and hormone results.",
            form.bloodDrawConcerns.some((c) => /fainted|needles/i.test(c)) && "Let us know when you arrive — we can take your sample while you're lying down.",
            "Drink a glass of water before your test — it makes the blood draw easier.",
        ].filter(Boolean) as string[];
        return (
            <main className="flex min-h-screen items-center justify-center bg-saivie-ivory p-5">
                <section className={`${cardClass} w-full max-w-xl text-center`}>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-saivie-sage text-saivie-teal"><CheckCircle2 size={32} /></div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-saivie-teal">Thank you</p>
                    <h1 className="font-serif text-3xl font-semibold text-saivie-plum">Your lab team is ready</h1>
                    <p className="mt-3 text-sm leading-6 text-saivie-teal">Thanks, {form.name}. Your answers{prescription ? " and prescription" : ""} have been securely shared with the lab team.</p>
                    <ul className="mt-6 space-y-2 text-left">
                        {tips.map((tip) => (
                            <li key={tip} className="flex gap-2.5 rounded-xl border border-saivie-border bg-white p-3 text-sm text-saivie-plum"><FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-saivie-rose" />{tip}</li>
                        ))}
                    </ul>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-saivie-ivory px-4 py-8 sm:py-12">
            <div className="mx-auto w-full max-w-2xl">
                <header className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-saivie-sage text-saivie-teal"><FlaskConical size={28} /></div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-saivie-rose">Before your lab test</p>
                    <h1 className="mt-1 font-serif text-3xl font-semibold text-saivie-plum">A few quick questions</h1>
                    <p className="mt-2 text-sm text-saivie-teal">Takes about 2 minutes and helps us get accurate results.</p>
                </header>

                {errors.length > 0 && (
                    <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        {errors.map((error) => <p key={error}>{error}</p>)}
                    </div>
                )}

                <div className={`${cardClass} space-y-5`}>
                    <Question number={1} label="Your details">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <input className={inputClass} value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Full name" aria-label="Full name" data-testid="lab-name" />
                            <input className={inputClass} type="date" value={form.dob} onChange={(e) => set("dob")(e.target.value)} aria-label="Date of birth" data-testid="lab-dob" />
                        </div>
                    </Question>

                    <Question number={2} label="Which tests are you here for?" hint="Type the test names, or upload a photo of your doctor's prescription.">
                        <textarea className={`${inputClass} min-h-20`} value={form.tests} onChange={(e) => set("tests")(e.target.value)} placeholder="e.g. Thyroid profile, CBC, AMH" data-testid="lab-tests" />
                        <input ref={fileInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="lab-prescription-input" />
                        {prescription ? (
                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-saivie-border bg-white p-3 text-sm text-saivie-plum">
                                <FileText className="h-4 w-4 text-saivie-teal" /><span className="min-w-0 flex-1 truncate">{prescription.name}</span>
                                <button type="button" onClick={() => setPrescription(null)} aria-label="Remove prescription" className="text-saivie-teal hover:text-rose-600"><X className="h-4 w-4" /></button>
                            </div>
                        ) : (
                            <Button type="button" variant="outline" className="mt-3 gap-2 border-saivie-border text-saivie-teal hover:bg-saivie-sage" onClick={() => fileInput.current?.click()} data-testid="lab-prescription-upload">
                                <Camera className="h-4 w-4" /> Upload prescription photo
                            </Button>
                        )}
                    </Question>

                    <Question number={3} label="When did you last eat or drink anything other than water?">
                        <Chips options={LAB_MEAL_OPTIONS} value={form.lastMeal} onChange={set("lastMeal")} />
                    </Question>

                    <Question number={4} label="When did your last period start?" hint="Some hormone tests depend on the day of your cycle.">
                        <input className={`${inputClass} mb-2 sm:max-w-xs`} type="date" value={LAB_PERIOD_SKIP.includes(form.lastPeriod) ? "" : form.lastPeriod} onChange={(e) => set("lastPeriod")(e.target.value)} aria-label="First day of last period" data-testid="lab-last-period" />
                        <Chips options={LAB_PERIOD_SKIP} value={form.lastPeriod} onChange={set("lastPeriod")} />
                    </Question>

                    <Question number={5} label="Are you taking any of these?">
                        <Chips multiple options={LAB_MEDICINE_OPTIONS} value={form.medicines} onChange={set("medicines")} />
                        <input className={`${inputClass} mt-3`} value={form.otherMedicine} onChange={(e) => set("otherMedicine")(e.target.value)} placeholder="Any other medicine or supplement?" aria-label="Other medicines" />
                    </Question>

                    <Question number={6} label="Anything we should know about giving blood?">
                        <Chips multiple options={LAB_DRAW_OPTIONS} value={form.bloodDrawConcerns} onChange={set("bloodDrawConcerns")} />
                    </Question>

                    <Question number={7} label="Have you been unwell in the last 2 weeks?">
                        <Chips options={LAB_ILLNESS_OPTIONS} value={form.recentIllness} onChange={set("recentIllness")} />
                    </Question>

                    <Question number={8} label="Are you allergic to any of these?">
                        <Chips multiple options={LAB_ALLERGY_OPTIONS} value={form.allergies} onChange={set("allergies")} />
                    </Question>

                    <Question number={9} label="Anything else? (optional)">
                        <textarea className={`${inputClass} min-h-16`} value={form.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Anything you'd like the lab team to know" />
                    </Question>

                    <Button type="button" className="h-12 w-full bg-saivie-teal text-base text-white hover:bg-saivie-teal/90" onClick={onSubmit} disabled={submit.isPending} data-testid="lab-submit">
                        {submit.isPending ? "Sending…" : "Submit"}
                    </Button>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-saivie-teal"><LockKeyhole className="h-3.5 w-3.5" /> Your answers are shared only with your care team.</p>
                </div>
            </div>
        </main>
    );
}
