import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { localDateKey } from "@/lib/patientHealthRecord";
import { pregnancyDatingFromLmp } from "@/lib/pregnancyDating";

type PeriodValue = { date: string | null; estimated: boolean; description: string };
type PeriodState = { value: PeriodValue | null; shownCount: number; nextPromptAt: string | null; blocked: boolean };
type EstimateChoice = "two-weeks" | "one-month" | "two-months" | "over-three-months-or-irregular";
type Entry = { kind: "date"; date: string } | { kind: "estimate"; choice: EstimateChoice };

export function shouldShowPeriodPrompt(state: PeriodState, seen: boolean, now = Date.now()): boolean {
  return !seen && !state.blocked && !state.value && state.shownCount < 3 &&
    (!state.nextPromptAt || (Number.isFinite(Date.parse(state.nextPromptAt)) && Date.parse(state.nextPromptAt) <= now));
}

export function patientPeriodPregnancyDating(value: PeriodValue | null, today: string) {
  if (!value?.date) return null;
  const days = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${value.date}T00:00:00Z`)) / 86400000;
  if (!Number.isFinite(days) || days < 0 || days > 42 * 7) return null;
  return pregnancyDatingFromLmp(value.date, today);
}

const choices: Array<{ value: EstimateChoice; title: string; detail: string }> = [
  { value: "two-weeks", title: "About 2 weeks ago", detail: "Roughly two weeks ago" },
  { value: "one-month", title: "About a month ago", detail: "Four to five weeks" },
  { value: "two-months", title: "About 2 months ago", detail: "Eight to nine weeks" },
  { value: "over-three-months-or-irregular", title: "More than 3 months ago", detail: "Or periods are not regular" },
];

export default function PatientPeriodPrompt({
  patientId, enabled, pregnancy, bookingOpen, onBook,
}: {
  patientId: number;
  enabled: boolean;
  pregnancy: boolean;
  bookingOpen: boolean;
  onBook: () => void;
}) {
  const queryClient = useQueryClient();
  const key = ["/api/patients", patientId, "period-prompt"];
  const base = `/api/patients/${patientId}/period-prompt`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"date" | "estimate" | "dating">("date");
  const [date, setDate] = useState("");
  const [choice, setChoice] = useState<EstimateChoice>("two-weeks");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const touchStart = useRef<number | null>(null);

  const query = useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<PeriodState> => {
      const response = await authenticatedFetch(base);
      if (!response.ok) throw new Error("Unable to load your period information.");
      return response.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (!enabled || bookingOpen || !query.data) return;
    const seenKey = `saiviePeriodPromptSeen:${patientId}`;
    let active = true;
    try {
      if (!shouldShowPeriodPrompt(query.data, Boolean(sessionStorage.getItem(seenKey)))) return;
      sessionStorage.setItem(seenKey, "true");
    } catch (failure) {
      console.warn("Could not check the period prompt session", failure);
      return;
    }
    void (async () => {
      try {
        const response = await authenticatedFetch(`${base}/show`, { method: "POST" });
        if (response.status === 409) {
          if (active) void query.refetch();
          return;
        }
        if (!response.ok) throw new Error("Unable to open the period reminder. You can use the card below.");
        const state: PeriodState = await response.json();
        if (active) {
          setStep("date");
          setOpen(true);
          queryClient.setQueryData(key, state);
        }
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "Unable to open the period reminder.");
      }
    })();
    return () => { active = false; };
  }, [enabled, bookingOpen, patientId, query.data, base, queryClient]);

  useEffect(() => {
    if (!enabled || bookingOpen) setOpen(false);
  }, [enabled, bookingOpen]);

  async function request(method: "POST" | "PUT", entry?: Entry) {
    const response = await authenticatedFetch(method === "POST" ? `${base}/dismiss` : base, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry ?? {}),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to save. Please try again.");
    queryClient.setQueryData(key, body);
  }

  async function dismiss(openBooking = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      if (!query.data?.value) await request("POST");
      setOpen(false);
      if (openBooking) onBook();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save your choice. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function save(entry: Entry) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await request("PUT", entry);
      setOpen(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save your date. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (!enabled) return null;
  if (query.isError) return <p role="alert" className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
    Unable to load your period information. <button type="button" className="font-bold underline" onClick={() => void query.refetch()}>Retry</button>
  </p>;
  if (!query.data || query.data.blocked) return null;

  const value = query.data.value;
  const dating = pregnancy ? patientPeriodPregnancyDating(value, localDateKey(new Date())) : null;
  return (
    <>
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-[#FFB534] bg-white p-5 text-[#2A1220]" aria-label="Last period">
        <div>
          <h2 className="font-serif text-xl font-bold">{value ? "Your last period" : "Add your last period"}</h2>
          <p className="mt-1 text-sm text-[#705364]">
            {value ? <>{value.date || value.description}{value.estimated && <strong> · Estimated</strong>}</> : "Add a date or an estimate whenever you are ready."}
          </p>
          {dating && <div className="mt-2 text-sm text-[#594856]">
            <p><strong>Estimated pregnancy age:</strong> {dating.pog}</p>
            <p><strong>Estimated due date:</strong> {dating.dueDate}</p>
            <p className="mt-1 text-xs">For reference only. Confirm pregnancy dates with your care team.</p>
          </div>}
          {pregnancy && value && !dating && <p className="mt-2 text-xs text-[#594856]">Pregnancy age and due date are unavailable. Your care team can help confirm dates.</p>}
          {!open && error && <p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>}
        </div>
        <button type="button" onClick={() => { setError(""); setDate(""); setStep("date"); setOpen(true); }} className="min-h-11 rounded-full border border-[#FFB534] px-5 text-sm font-bold hover:bg-[#FFB534]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB534]">
          {value ? "Update" : "Add date"}
        </button>
      </section>
      <Dialog open={open && enabled && !bookingOpen} onOpenChange={(next) => { if (!next) void dismiss(); }}>
        <DialogContent
          className="max-h-[90dvh] max-w-[520px] overflow-y-auto rounded-[32px] border-0 bg-white p-7 text-[#2A1220] focus-visible:ring-[#FFB534] sm:p-8"
          onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientY ?? null; }}
          onTouchEnd={(event) => {
            const end = event.changedTouches[0]?.clientY;
            if (touchStart.current !== null && end !== undefined && end - touchStart.current > 80 && event.currentTarget.scrollTop === 0) void dismiss();
            touchStart.current = null;
          }}
        >
          {step !== "date" && <button type="button" onClick={() => { setStep("date"); setError(""); }} className="flex min-h-11 w-fit items-center gap-1 text-sm font-bold"><ChevronLeft className="h-4 w-4" /> BACK</button>}
          {step === "date" && <>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#705364]">One quick question</p>
            <DialogTitle className="max-w-[360px] font-serif text-[36px] font-bold leading-[1.05]">When did your last period <em>start?</em></DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-[#594856]">
              {pregnancy ? "Record your last period for your own reference. It is not added to your clinical pregnancy record." : "This can help you keep track of your cycle."} It takes about 10 seconds.
            </DialogDescription>
            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (date) void save({ kind: "date", date }); }}>
              <label htmlFor="last-period-date" className="block text-xs font-bold uppercase tracking-[0.1em] text-[#705364]">First day of last period</label>
              <DateInput id="last-period-date" aria-label="First day of last period" value={date} max={localDateKey(new Date())} onValueChange={setDate} required disabled={busy} calendarSelectedColor="#FFB534" className="h-12 rounded-xl border-[#FFB534]" />
              <button type="submit" disabled={busy || !date} className="min-h-12 w-full rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white disabled:opacity-50">Save date</button>
            </form>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => setStep("estimate")} className="min-h-11 rounded-full border border-[#FFB534] px-4 text-sm font-bold hover:bg-[#FFB534]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB534]">I am not sure</button>
              {pregnancy && <button type="button" disabled={busy} onClick={() => setStep("dating")} className="min-h-11 rounded-full border border-[#FFB534] px-4 text-sm font-bold hover:bg-[#FFB534]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB534]">I know my due date or had a scan</button>}
            </div>
            <div className="flex items-end justify-between gap-4">
              <p className="text-xs leading-relaxed text-[#705364]">Your response is private. You can update it later.</p>
              <button type="button" disabled={busy} onClick={() => void dismiss()} className="min-h-11 shrink-0 text-sm font-bold underline underline-offset-4">Not now</button>
            </div>
          </>}
          {step === "estimate" && <>
            <DialogTitle className="font-serif text-[36px] font-bold leading-[1.05]">Pick the closest.</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-[#594856]">No problem. We will mark it as an estimate and you can fix it any time. {pregnancy ? "Any pregnancy dates shown are estimates for your reference, not clinical dating." : "This estimate is not used to predict your cycle."}</DialogDescription>
            <fieldset className="space-y-2">
              <legend className="sr-only">Estimated last period</legend>
              {choices.map((item) =>               <label key={item.value} className={`flex cursor-pointer items-center gap-3 rounded-[22px] border p-4 ${choice === item.value ? "border-2 border-[#FFB534]" : "border-[#E8D8C8]"}`}>
                <input type="radio" name="last-period-estimate" value={item.value} checked={choice === item.value} onChange={() => setChoice(item.value)} className="h-5 w-5 accent-[#FFB534]" />
                <span className="min-w-0 flex-1"><strong className="block text-sm">{item.title}</strong><span className="text-xs text-[#594856]">{item.detail}</span></span>
                <span className="rounded-full bg-[#FFB534] px-2 py-1 text-[10px] font-extrabold text-[#22122B]">ESTIMATE</span>
              </label>)}
            </fieldset>
            <button type="button" disabled={busy} onClick={() => void save({ kind: "estimate", choice })} className="min-h-12 w-full rounded-full bg-[#2A1220] text-sm font-bold text-white disabled:opacity-50">Save estimate</button>
          </>}
          {step === "dating" && <>
            <DialogTitle className="font-serif text-[36px] font-bold leading-[1.05]">Your care team can help.</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-[#594856]">A due date or scan can be reviewed by your care team. We won&apos;t guess your last period from it here.</DialogDescription>
            <button type="button" disabled={busy} onClick={() => void dismiss(true)} className="min-h-12 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">Talk with your care team</button>
          </>}
          {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
