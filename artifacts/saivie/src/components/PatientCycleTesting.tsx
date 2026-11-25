import React, { useEffect, useState } from "react";
import { z } from "zod";
import { localDateKey } from "@/lib/patientHealthRecord";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

const dimensions = [
  ["energy", "Energy"],
  ["focus", "Focus"],
  ["mood", "Mood"],
  ["confidence", "Confidence"],
  ["social_battery", "Social energy"],
  ["physical_capacity", "Physical capacity"],
] as const;
const symptomOptions = [
  ["cramps", "Cramps"],
  ["fatigue", "Fatigue"],
  ["headache", "Headache"],
  ["mood_changes", "Mood changes"],
  ["severe_pain", "Severe pain"],
] as const;
const flagOptions = [
  ["heavy_bleeding", "Heavy bleeding"],
  ["severe_pain", "Severe pain"],
  ["red_flag", "Another concerning symptom"],
] as const;

const checkInSchema = z.object({
  readiness: z.object({
    energy: z.number(), focus: z.number(), mood: z.number(), confidence: z.number(),
    social_battery: z.number(), physical_capacity: z.number(),
  }),
  stage: z.enum(["cycle", "pregnancy", "postpartum", "perimenopause", "hormonal_contraception", "unknown"]),
  regularity: z.enum(["regular", "irregular", "unknown"]),
  flags: z.array(z.enum(["heavy_bleeding", "severe_pain", "red_flag"])),
  periodContext: z.object({
    phase: z.enum(["menstrual", "follicular", "ovulation", "luteal", "unsure"]),
    flow: z.enum(["none", "light", "moderate", "heavy", "unsure"]).optional(),
    symptoms: z.array(z.enum(["cramps", "fatigue", "headache", "mood_changes", "severe_pain"])),
  }).optional(),
  freeSlots: z.array(z.object({ start: z.number(), end: z.number() })),
  nowHour: z.number(),
  goals: z.record(z.string(), z.number()),
});
const insightsSchema = z.object({
  notForClinicalUse: z.literal(true),
  checkIn: checkInSchema.nullable(),
  forecast: z.discriminatedUnion("status", [
    z.object({ status: z.literal("estimated"), nextPeriodDate: z.string(), daysUntil: z.number() }),
    z.object({ status: z.enum(["withheld", "insufficient_data", "stale"]), reason: z.string() }),
  ]),
  recommendations: z.object({
    status: z.enum(["experimental", "withheld", "insufficient_data", "no_matches"]),
    cards: z.array(z.object({
      activityId: z.string(), name: z.string(), category: z.string(),
      durationMinutes: z.number(), reasons: z.array(z.string()),
    })),
    reason: z.string().optional(),
  }),
  periodCare: z.object({ status: z.string(), blocks: z.array(z.unknown()) }),
});
const periodsSchema = z.object({ periodStarts: z.array(z.string()) });
type CheckIn = z.infer<typeof checkInSchema>;
type Insights = z.infer<typeof insightsSchema>;
type Dimension = typeof dimensions[number][0];
type Form = {
  readiness: Record<Dimension, string>;
  stage: CheckIn["stage"] | "";
  regularity: CheckIn["regularity"] | "";
  phase: NonNullable<CheckIn["periodContext"]>["phase"] | "";
  flow: NonNullable<CheckIn["periodContext"]>["flow"] | "";
  symptoms: NonNullable<CheckIn["periodContext"]>["symptoms"];
  flags: CheckIn["flags"];
  slots: Array<{ start: string; end: string }>;
  goals: Record<string, number>;
};

const blankForm = (): Form => ({
  readiness: { energy: "", focus: "", mood: "", confidence: "", social_battery: "", physical_capacity: "" },
  stage: "", regularity: "", phase: "", flow: "", symptoms: [], flags: [], slots: [], goals: {},
});

function hourToTime(hour: number) {
  const minutes = Math.round(hour * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeToHour(value: string) {
  if (value === "24:00") return 24;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) + Number(match[2]) / 60 : null;
}

function fromCheckIn(checkIn: CheckIn): Form {
  return {
    readiness: {
      energy: String(checkIn.readiness.energy), focus: String(checkIn.readiness.focus),
      mood: String(checkIn.readiness.mood), confidence: String(checkIn.readiness.confidence),
      social_battery: String(checkIn.readiness.social_battery),
      physical_capacity: String(checkIn.readiness.physical_capacity),
    },
    stage: checkIn.stage, regularity: checkIn.regularity,
    phase: checkIn.periodContext?.phase ?? "", flow: checkIn.periodContext?.flow ?? "",
    symptoms: checkIn.periodContext?.symptoms ?? [], flags: checkIn.flags,
    slots: checkIn.freeSlots.map((slot) => ({ start: hourToTime(slot.start), end: hourToTime(slot.end) })),
    goals: checkIn.goals,
  };
}

async function request(path: string, method = "GET", body?: object): Promise<unknown> {
  const response = await authenticatedFetch(path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}). Please try again or sign in again.`);
  return response.status === 204 ? null : response.json();
}

const fieldClass = "w-full rounded-xl border border-[#D9C3AE] bg-white px-3 py-2 text-sm text-[#2A1220]";
const buttonClass = "min-h-11 rounded-full bg-[#2A1220] px-5 py-2 text-sm font-bold text-white disabled:opacity-50";

export default function PatientCycleTesting({ patientId }: { patientId: number }) {
  const [date, setDate] = useState(() => localDateKey(new Date()));
  useEffect(() => {
    const updateDate = () => setDate(localDateKey(new Date()));
    const timer = window.setInterval(updateDate, 60_000);
    document.addEventListener("visibilitychange", updateDate);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateDate);
    };
  }, []);
  return <CycleTestingDay key={`${patientId}-${date}`} patientId={patientId} date={date} />;
}

function CycleTestingDay({ patientId, date }: { patientId: number; date: string }) {
  const [form, setForm] = useState<Form>(blankForm);
  const [periodStart, setPeriodStart] = useState("");
  const [periods, setPeriods] = useState<string[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const base = `/api/recommendations/patients/${patientId}`;

  async function load() {
    const [insightsData, periodsData] = await Promise.all([
      request(`${base}/insights?date=${encodeURIComponent(date)}`),
      request(`${base}/period-starts?asOf=${encodeURIComponent(date)}`),
    ]);
    const next = insightsSchema.parse(insightsData);
    const starts = periodsSchema.parse(periodsData).periodStarts;
    setInsights(next);
    setPeriods(starts);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      request(`${base}/insights?date=${encodeURIComponent(date)}`),
      request(`${base}/period-starts?asOf=${encodeURIComponent(date)}`),
    ]).then(([insightsData, periodsData]) => {
      const next = insightsSchema.parse(insightsData);
      const starts = periodsSchema.parse(periodsData).periodStarts;
      if (!active) return;
      setInsights(next);
      setPeriods(starts);
      setForm(next.checkIn ? fromCheckIn(next.checkIn) : blankForm());
    }).catch(() => {
      if (active) setError("Unable to load testing data. Check that the test API is enabled and you are signed in.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [base, date, reload]);

  async function saveCheckIn(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setMessage("");
    if (date !== localDateKey(new Date())) {
      setError("The date has changed. Reopen this page to enter a new check-in.");
      return;
    }
    if (!form.stage || !form.regularity || !form.phase || dimensions.some(([key]) => !form.readiness[key])) {
      setError("Select your stage, cycle regularity, phase and all six readiness ratings.");
      return;
    }
    const slots = form.slots.map((slot) => ({ start: timeToHour(slot.start), end: timeToHour(slot.end) }));
    if (slots.some((slot) => slot.start === null || slot.end === null || slot.start >= slot.end)) {
      setError("Enter a valid start and end time for each free slot.");
      return;
    }
    const readiness = Object.fromEntries(dimensions.map(([key]) => [key, Number(form.readiness[key])]));
    const now = new Date();
    const payload = {
      readiness, stage: form.stage, regularity: form.regularity, flags: form.flags,
      periodContext: { phase: form.phase, ...(form.flow ? { flow: form.flow } : {}), symptoms: form.symptoms },
      nowHour: now.getHours() + now.getMinutes() / 60,
      freeSlots: slots, goals: form.goals,
    };
    const parsed = checkInSchema.safeParse(payload);
    if (!parsed.success) { setError("Please check your entries and try again."); return; }
    setBusy(true);
    try {
      await request(`${base}/check-ins/${date}`, "PUT", parsed.data);
      setMessage("Check-in saved.");
      try { await load(); } catch { setInsights(null); setError("Check-in saved, but insights could not be refreshed."); }
    } catch { setError("Could not save your check-in. Please try again."); }
    finally { setBusy(false); }
  }

  async function changePeriod(periodDate: string, method: "PUT" | "DELETE") {
    setError(""); setMessage(""); setBusy(true);
    try {
      await request(`${base}/period-starts/${encodeURIComponent(periodDate)}`, method, method === "PUT" ? {} : undefined);
      setPeriodStart("");
      setMessage(method === "PUT" ? "Period start saved." : "Period start removed.");
      try { await load(); }
      catch { setInsights(null); setPeriods([]); setError("Change saved, but testing data could not be refreshed. Reload the page to try again."); }
    } catch { setError("Could not update the period start. Please try again."); }
    finally { setBusy(false); }
  }

  const formChanged = insights?.checkIn != null &&
    JSON.stringify(form) !== JSON.stringify(fromCheckIn(insights.checkIn));

  return (
    <div className="space-y-5" id="cycle-insights">
      <p className="text-sm font-bold">Experimental testing only — use synthetic records. Not for clinical use.</p>
      {loading && <p role="status">Loading testing data…</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      {!loading && !insights && <button type="button" className={buttonClass} onClick={() => setReload((value) => value + 1)}>Retry loading</button>}
      {!loading && insights && (
        <>
          <div className="rounded-[26px] border border-[var(--line)] bg-white p-5">
            <h3 className="font-serif text-xl font-bold">Period starts</h3>
            <p className="text-sm">Record the first day of a period. Four starts are required for an experimental estimate.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-sm">Period start
                <input className={fieldClass} type="date" value={periodStart} max={date}
                  onChange={(event) => setPeriodStart(event.target.value)} />
              </label>
              <button type="button" className={buttonClass} disabled={busy || !periodStart || periodStart > date}
                onClick={() => void changePeriod(periodStart, "PUT")}>Save start</button>
            </div>
            <ul className="mt-3 space-y-1">
              {periods.map((date) => <li key={date} className="flex items-center gap-3 text-sm">
                <span>{date}</span><button type="button" disabled={busy} className="underline" onClick={() => void changePeriod(date, "DELETE")}>Remove</button>
              </li>)}
            </ul>
          </div>

          <form onSubmit={saveCheckIn} className="space-y-4 rounded-[26px] border border-[var(--line)] bg-white p-5">
            <h3 className="font-serif text-xl font-bold">Today's test check-in</h3>
            <p className="text-sm">Enter your own ratings; phase is self-reported and is not a prediction.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">Stage
                <select className={fieldClass} value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as Form["stage"] })}>
                  <option value="">Select</option><option value="cycle">Cycle</option><option value="pregnancy">Pregnancy</option>
                  <option value="postpartum">Postpartum</option><option value="perimenopause">Perimenopause</option>
                  <option value="hormonal_contraception">Hormonal contraception</option><option value="unknown">Not sure</option>
                </select>
              </label>
              <label className="text-sm">Cycle regularity
                <select className={fieldClass} value={form.regularity} onChange={(event) => setForm({ ...form, regularity: event.target.value as Form["regularity"] })}>
                  <option value="">Select</option><option value="regular">Regular</option>
                  <option value="irregular">Irregular</option><option value="unknown">Not sure</option>
                </select>
              </label>
              <label className="text-sm">Your reported phase
                <select className={fieldClass} value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value as Form["phase"] })}>
                  <option value="">Select</option><option value="menstrual">Menstrual</option><option value="follicular">Follicular</option>
                  <option value="ovulation">Ovulation</option><option value="luteal">Luteal</option><option value="unsure">Not sure</option>
                </select>
              </label>
            </div>
            <label className="block text-sm">Flow (optional)
              <select className={fieldClass} value={form.flow} onChange={(event) => setForm({ ...form, flow: event.target.value as Form["flow"] })}>
                <option value="">Not reported</option><option value="none">None</option><option value="light">Light</option>
                <option value="moderate">Moderate</option><option value="heavy">Heavy</option><option value="unsure">Not sure</option>
              </select>
            </label>
            <fieldset><legend className="text-sm font-bold">Symptoms (optional)</legend>
              <div className="mt-2 flex flex-wrap gap-3">{symptomOptions.map(([value, label]) => (
                <label key={value} className="text-sm"><input type="checkbox" checked={form.symptoms.includes(value)}
                  onChange={(event) => setForm({ ...form, symptoms: event.target.checked
                    ? [...form.symptoms, value] : form.symptoms.filter((item) => item !== value) })} /> {label}</label>
              ))}</div>
            </fieldset>
            <fieldset><legend className="text-sm font-bold">Safety flags (optional)</legend>
              <div className="mt-2 flex flex-wrap gap-3">{flagOptions.map(([value, label]) => (
                <label key={value} className="text-sm"><input type="checkbox" checked={form.flags.includes(value)}
                  onChange={(event) => setForm({ ...form, flags: event.target.checked
                    ? [...form.flags, value] : form.flags.filter((item) => item !== value) })} /> {label}</label>
              ))}</div>
              {(form.flags.length > 0 || form.flow === "heavy" || form.symptoms.includes("severe_pain")) &&
                <p role="alert" className="mt-2 text-sm text-red-800">Suggestions will be withheld. Contact your care team; seek urgent medical help for severe symptoms.</p>}
            </fieldset>
            <fieldset><legend className="text-sm font-bold">Readiness (1 = low, 5 = high)</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">{dimensions.map(([key, label]) => (
                <label key={key} className="text-sm">{label}
                  <select className={fieldClass} value={form.readiness[key]}
                    onChange={(event) => setForm({ ...form, readiness: { ...form.readiness, [key]: event.target.value } })}>
                    <option value="">Select</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              ))}</div>
            </fieldset>
            <fieldset><legend className="text-sm font-bold">Free time today (optional)</legend>
              <p className="text-sm">Enter times as HH:MM; use 24:00 for midnight at the end of the day. No slots means no activity matches.</p>
              {form.slots.map((slot, index) => (
                <div key={index} className="mt-2 flex flex-wrap items-end gap-3">
                  <label className="text-sm">Start {index + 1}<input type="text" inputMode="numeric" placeholder="HH:MM" className={fieldClass} value={slot.start}
                    onChange={(event) => setForm({ ...form, slots: form.slots.map((item, i) => i === index ? { ...item, start: event.target.value } : item) })} /></label>
                  <label className="text-sm">End {index + 1}<input type="text" inputMode="numeric" placeholder="HH:MM" className={fieldClass} value={slot.end}
                    onChange={(event) => setForm({ ...form, slots: form.slots.map((item, i) => i === index ? { ...item, end: event.target.value } : item) })} /></label>
                  <button type="button" className="min-h-11 underline" onClick={() => setForm({ ...form, slots: form.slots.filter((_, i) => i !== index) })}>Remove slot</button>
                </div>
              ))}
              <button type="button" className="mt-2 min-h-11 underline" disabled={form.slots.length >= 24}
                onClick={() => setForm({ ...form, slots: [...form.slots, { start: "", end: "" }] })}>Add free slot</button>
            </fieldset>
            <button type="submit" className={buttonClass} disabled={busy}>Save test check-in</button>
          </form>

          {formChanged ? <p className="text-sm">Save your changes to refresh the experimental results.</p> : <div className="rounded-[26px] border border-[var(--line)] bg-white p-5">
            <h3 className="font-serif text-xl font-bold">Experimental results</h3>
            <p className="mt-2 text-sm">Not medically validated; not for diagnosis or contraception. Results reflect the check-in time, not live availability.</p>
            <p className="mt-2 text-sm">{insights.forecast.status === "estimated"
              ? `Estimated next period: ${insights.forecast.nextPeriodDate} (${insights.forecast.daysUntil} days).`
              : insights.forecast.reason}</p>
            {insights.recommendations.cards.map((card) => <article key={card.activityId} className="mt-3 rounded-xl bg-[#FFF4E6] p-3">
              <h4 className="font-bold">{card.name}</h4>
              <p className="text-sm">{card.category} · {card.durationMinutes} minutes</p>
              {card.reasons.map((reason) => <p className="text-sm" key={reason}>{reason}</p>)}
            </article>)}
            {insights.recommendations.cards.length === 0 && <p className="mt-2 text-sm">{insights.recommendations.reason}</p>}
            <p className="mt-3 text-sm">Period-care content is awaiting clinical review.</p>
          </div>}
        </>
      )}
    </div>
  );
}
