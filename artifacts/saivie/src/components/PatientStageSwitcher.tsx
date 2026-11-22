import { ChevronRight } from "lucide-react";
import type { FertilitySupportMode, PatientStage, PatientStageMode } from "@/lib/patientStage";

interface Props {
  currentStage: PatientStage;
  onSelectStage: (mode: PatientStageMode) => void;
  onSelectFertilityMode: (mode: FertilitySupportMode) => void;
}

const stages: Array<{
  id: PatientStage;
  mode: PatientStageMode;
  title: string;
  description: string;
  detail: string;
  background: string;
}> = [
  {
    id: "periods",
    mode: "general",
    title: "I have periods",
    description: "Cycle patterns, energy and everyday wellbeing.",
    detail: "Cycle insights · phase by phase",
    background: "#FFB534",
  },
  {
    id: "pregnancy",
    mode: "pregnancy",
    title: "I'm pregnant",
    description: "Pregnancy guidance that follows your week.",
    detail: "Your pregnancy · week by week",
    background: "#FFA7B6",
  },
  {
    id: "postpartum",
    mode: "postpartum",
    title: "I recently had a baby",
    description: "A gentle space for your recovery and wellbeing.",
    detail: "Your recovery · at your pace",
    background: "#C9E889",
  },
  {
    id: "menopause",
    mode: "menopause",
    title: "Perimenopause or menopause",
    description: "Understand symptoms and notice patterns over time.",
    detail: "Your symptoms · your story",
    background: "#7ED3E1",
  },
];

export default function PatientStageSwitcher({ currentStage, onSelectStage, onSelectFertilityMode }: Props) {
  return (
    <main className="mx-auto w-full max-w-[980px] px-5 pb-28 pt-8 md:px-8 md:pb-12 md:pt-12" data-testid="patient-stage-switcher">
      <header className="mx-auto max-w-[680px] text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#775B63]">Your care, your stage</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-[#35212f] md:text-6xl">
          Where are you right now?
        </h1>
        <p className="mx-auto mt-4 max-w-[520px] text-base leading-relaxed text-[#6A5963] md:text-lg">
          Choose what feels right for you today. Your care changes with you.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:mt-10 md:gap-5">
        {stages.map((stage, index) => {
          const selected = stage.id === currentStage;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage.mode)}
              aria-pressed={selected}
              className={`group flex min-h-[220px] flex-col rounded-[28px] border-2 p-5 text-left text-[#35212f] shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#35212f]/20 md:min-h-[248px] md:p-7 ${
                selected ? "border-[#35212f]" : "border-transparent"
              }`}
              style={{ backgroundColor: stage.background }}
              data-testid={`patient-stage-${stage.id}`}
            >
              <span className="flex w-full items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">0{index + 1}</span>
                {selected && (
                  <span className="rounded-full bg-[#35212f] px-3 py-1 text-[11px] font-bold text-white">
                    Your stage
                  </span>
                )}
              </span>
              <span className="mt-6 font-serif text-2xl font-semibold leading-tight md:text-[28px]">{stage.title}</span>
              <span className="mt-2 text-sm leading-relaxed">{stage.description}</span>
              <span className="mt-auto inline-flex items-center gap-2 self-start rounded-full bg-white/65 px-3.5 py-2 text-xs font-bold">
                {stage.detail}
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-7 text-center text-sm text-[#6A5963]">
        You can switch any time. Your health record and history stay with you.
      </p>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => onSelectFertilityMode("ttc")}
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-semibold text-[#35212f] underline decoration-[#A78A94] underline-offset-4 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35212f]"
        >
          Trying to conceive? Explore that goal
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onSelectFertilityMode("ivf")}
          className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-semibold text-[#35212f] hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35212f]"
        >
          IVF support
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}
