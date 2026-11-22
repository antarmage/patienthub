import { useState } from "react";
import { authenticatedFetch as fetch } from "@/lib/authenticatedFetch";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { localDateKey } from "@/lib/patientHealthRecord";
import type { PatientPregnancyUpdateAction } from "@/lib/patientPregnancyUpdate";

type UpdateAction = PatientPregnancyUpdateAction;

interface Episode {
  id: number;
  version: number;
  details: Record<string, unknown>;
}

interface Props {
  patientId: number;
  episode: Episode;
  onClose: () => void;
  onOpenRecord: () => void;
  onBook: () => void;
  onStatusUpdated: (action: UpdateAction, birthDate?: string) => void;
}

const choices: Array<{
  id: UpdateAction;
  title: string;
  description: string;
}> = [
  {
    id: "baby-arrived",
    title: "My baby has arrived",
    description: "Share only what you want to. The birth date is optional.",
  },
  {
    id: "pregnancy-loss",
    title: "I've had a pregnancy loss",
    description: "Pregnancy reminders and content will pause. Gentle support options will be available.",
  },
  {
    id: "no-longer-pregnant",
    title: "I'm no longer pregnant",
    description: "No details needed. You can choose what to switch to next.",
  },
];

export default function PatientPregnancyUpdate({
  patientId,
  episode,
  onClose,
  onOpenRecord,
  onBook,
  onStatusUpdated,
}: Props) {
  const [selectedAction, setSelectedAction] = useState<UpdateAction | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lossComplete, setLossComplete] = useState(false);

  const continueUpdate = async () => {
    if (!selectedAction) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/patients/${patientId}/pregnancy-episodes/${episode.id}/patient-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: episode.version,
          action: selectedAction,
          ...(selectedAction === "baby-arrived" && birthDate ? { birthDate } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Your pregnancy status could not be updated. Please try again.");
      onStatusUpdated(selectedAction, selectedAction === "baby-arrived" ? birthDate || undefined : undefined);
      if (selectedAction === "pregnancy-loss") setLossComplete(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your pregnancy status could not be updated. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (lossComplete) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-5 pb-28 pt-8 md:px-8 md:pb-12 md:pt-12" data-testid="pregnancy-loss-support">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#775B63]">Your care, at your pace</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-[#35212f] md:text-5xl">Pregnancy reminders are paused.</h1>
        <p className="mt-4 max-w-[600px] text-base leading-relaxed text-[#6A5963]">
          Your pregnancy history stays in your health record. If it would help, you can speak with your care team or review your records.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button type="button" onClick={onBook} className="min-h-11 rounded-full bg-[#35212f] px-5 text-white">
            Talk with my care team
          </Button>
          <Button type="button" variant="outline" onClick={onOpenRecord} className="min-h-11 rounded-full border-[#D9C3AE] px-5">
            View health record
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} className="min-h-11 rounded-full px-5">
            Back to Today
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[980px] px-5 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10" data-testid="pregnancy-update">
      <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#503B4D]">
        <ArrowLeft className="h-4 w-4" /> Back to Today
      </button>
      <header className="mt-5 max-w-[660px]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#775B63]">Pregnancy update</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-[#35212f] md:text-6xl">
          What has <em>changed?</em>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[#6A5963]">
          Whatever happened, you can tell us in your own time. Everything here is optional.
        </p>
      </header>

      <div className="mt-7 grid gap-4 md:grid-cols-2 md:gap-5">
        {choices.map((choice) => {
          const selected = selectedAction === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => { setSelectedAction(choice.id); setError(""); }}
              aria-pressed={selected}
              className={`min-h-[150px] rounded-[26px] border p-5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#35212f]/20 md:p-6 ${
                selected ? "border-[#35212f] ring-2 ring-[#35212f]/15" : "border-[#E8D8C8]"
              } ${choice.id === "baby-arrived" ? "bg-[#C9E889]" : "bg-white/90"}`}
            >
              <span className="font-serif text-2xl font-semibold leading-tight text-[#35212f]">{choice.title}</span>
              <span className="mt-2 block text-sm leading-relaxed text-[#594856]">{choice.description}</span>
            </button>
          );
        })}
      </div>

      {selectedAction && (
        <section className="mt-5 rounded-[26px] border border-[#E8D8C8] bg-white/90 p-5 md:p-6" aria-live="polite">
          {selectedAction === "baby-arrived" && (
            <div className="max-w-md">
              <label htmlFor="pregnancy-update-birth-date" className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#594856]">
                Birth date (optional)
              </label>
              <DateInput
                id="pregnancy-update-birth-date"
                aria-label="Birth date (optional)"
                value={birthDate}
                max={localDateKey(new Date())}
                disabled={saving}
                onValueChange={setBirthDate}
              />
            </div>
          )}
          {selectedAction === "pregnancy-loss" && (
            <p className="max-w-[620px] text-sm leading-relaxed text-[#594856]">
              Pregnancy content and follow-up reminders will pause. You can review your health record or speak with your care team.
            </p>
          )}
          {selectedAction === "no-longer-pregnant" && (
            <p className="max-w-[620px] text-sm leading-relaxed text-[#594856]">
              We’ll pause pregnancy content and reminders first, then you can choose a different stage.
            </p>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
          <Button
            type="button"
            onClick={() => void continueUpdate()}
            disabled={saving}
            className="mt-5 min-h-11 w-full rounded-full bg-[#24112A] text-white hover:bg-[#35212f] sm:w-auto sm:px-7"
          >
            {saving ? "Updating…" : selectedAction === "baby-arrived"
              ? "Continue to my recovery plan"
              : selectedAction === "pregnancy-loss"
                ? "Pause pregnancy content"
                : "Choose a new stage"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </section>
      )}

      {selectedAction === "pregnancy-loss" && (
        <p className="mt-5 text-xs leading-relaxed text-[#6A5963]">
          This loss wording is a draft and needs review with clinicians and bereavement specialists before launch.
        </p>
      )}
      {!selectedAction && (
        <button type="button" onClick={onClose} className="mt-6 min-h-11 text-sm font-semibold text-[#503B4D] underline underline-offset-4">
          Keep my current pregnancy details
        </button>
      )}
    </main>
  );
}
