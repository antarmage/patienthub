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
    description: "Track your phase, energy and daily plan.",
    detail: "Cycle insights · phase by phase",
    background: "#FFB32C",
  },
  {
    id: "pregnancy",
    mode: "pregnancy",
    title: "I'm pregnant",
    description: "Follow your weeks, your baby and your prenatal plan.",
    detail: "Your pregnancy · week by week",
    background: "#F9A1B2",
  },
  {
    id: "postpartum",
    mode: "postpartum",
    title: "I recently had a baby",
    description: "Recovery, rest, feeding and your wellbeing, week by week.",
    detail: "Your recovery · at your pace",
    background: "#C9E98F",
  },
  {
    id: "menopause",
    mode: "menopause",
    title: "Perimenopause or menopause",
    description: "Track symptoms, spot patterns and prepare for doctor visits.",
    detail: "Your symptoms · your story",
    background: "#7FD1DF",
  },
];

export default function PatientStageSwitcher({ currentStage, onSelectStage, onSelectFertilityMode }: Props) {
  return (
    <main className="w-full px-5 pb-28 pt-8 text-[#23122d] md:px-0 md:pb-12 md:pt-4" data-testid="patient-stage-switcher">
      <header>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em]">Switch stage</p>
        <h1 className="mt-3 font-serif text-[40px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[52px] md:text-[58px]">
          Where are you <span className="italic">right now?</span>
        </h1>
        <p className="mt-3 max-w-[440px] text-[15px] leading-[1.5] text-[#5A4552]">
          Pick the stage that fits today. Your whole app, from the plan to the programs, changes to match.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 min-[900px]:grid-cols-4">
        {stages.map((stage) => {
          const selected = stage.id === currentStage;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage.mode)}
              aria-pressed={selected}
              className="flex min-h-[220px] flex-col rounded-[25px] p-[22px] text-left transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#23122d]/30 min-[900px]:min-h-[234px]"
              style={{ backgroundColor: stage.background }}
              data-testid={`patient-stage-${stage.id}`}
            >
              {selected && (
                <span className="mb-3 flex w-full items-center justify-between gap-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.14em]">Current</span>
                  <span className="rounded-full bg-[#23122d] px-3 py-1.5 text-[9px] font-bold text-[#FFB32C]">
                    Selected
                  </span>
                </span>
              )}
              <span className="font-serif text-[25px] font-bold leading-[1.05] tracking-[-0.025em]">{stage.title}</span>
              <span className="mt-3 text-[13px] leading-[1.45]">{stage.description}</span>
              <span className="mt-auto block w-full rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-bold leading-[1.3]">
                {stage.detail}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <p className="pt-3 text-xs text-[#5A4552]">You can switch any time. Your history stays with you.</p>
        <div className="flex flex-wrap gap-x-4 sm:justify-end">
          <button
            type="button"
            onClick={() => onSelectFertilityMode("ttc")}
            className="min-h-11 text-left text-xs font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23122d]"
          >
            Trying to conceive? Set a goal
          </button>
          <button
            type="button"
            onClick={() => onSelectFertilityMode("ivf")}
            className="min-h-11 text-left text-xs font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23122d]"
          >
            IVF support
          </button>
        </div>
      </div>
    </main>
  );
}
