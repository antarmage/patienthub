import React from "react";
import { Activity, ArrowLeft } from "lucide-react";
import PregnancyExerciseSafety from "@/components/PregnancyExerciseSafety";

const disabledButton = "min-h-11 rounded-full border border-[#D9C3AE] bg-white px-5 text-sm font-bold text-[#6A5560] disabled:cursor-not-allowed";

export default function PatientExercisePlusPreview({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-7 text-[#2A1220]">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase">
        <ArrowLeft className="h-4 w-4" /> Exercise
      </button>

      <section className="rounded-[40px] bg-[#CFF1EA] p-6 md:p-12">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#2A1220] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFA7B6]">Example · Week 14</span>
          <span className="rounded-full bg-[#2A1220] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFA7B6]">Plus preview</span>
        </div>
        <h1 className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[72px]">
          Your plan, <em className="font-medium">week 14.</em>
        </h1>
        <p className="mt-4 text-[17px] font-medium leading-[1.45] md:text-xl">A preview of how an exercise plan could look.</p>
        <p className="mt-4 max-w-3xl rounded-2xl bg-white/80 p-4 text-sm leading-relaxed">Example only: sessions, progress and coaching are not yours or medical advice. Purchases and the actions shown here are not available yet.</p>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-[#2A1220] p-[22px] text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">Example · Prenatal strength · Week 2 of 6</p>
            <h2 className="font-serif text-[28px] font-bold leading-tight">Lower body and balance</h2>
            <p className="text-sm text-[#E8DCE2]">25 min · Example session</p>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Example program progress" aria-valuenow={2} aria-valuemin={0} aria-valuemax={6}>
              <div className="h-full w-1/3 bg-[#FFA7B6]" />
            </div>
            <p className="text-sm font-bold text-[#E8DCE2]">Week 2 of 6 · Example</p>
            <button type="button" disabled className={disabledButton}>Start session</button>
          </section>

          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">This week</h2>
            <p className="text-sm text-[#6A5560]">Example schedule, not your activity.</p>
            <div className="grid grid-cols-3 gap-2">
              {([["Mon", "Done"], ["Wed", "Today"], ["Fri", "Planned"]] as const).map(([day, status]) => (
                <div key={day} className="rounded-[20px] bg-[#F7F1ED] p-3 text-center">
                  <p className="text-xs font-extrabold uppercase tracking-[0.1em]">{day}</p>
                  <p className="mt-1 text-sm font-bold">{status}</p>
                </div>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-[#5A4552]">Example: 1 of 3 sessions completed. Rest days matter too.</p>
          </section>

          <section className="space-y-3 rounded-[28px] bg-[#CFF1EA] p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">How did the last one feel?</h2>
            <div className="flex flex-wrap gap-2">
              {["Too easy", "Just right", "Too hard"].map((label) => <button key={label} type="button" disabled className={disabledButton}>{label}</button>)}
            </div>
            <p className="text-sm leading-relaxed">Feedback and plan adjustments are not available in this preview.</p>
          </section>

          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your programs</h2>
            <p className="text-sm text-[#6A5560]">Example programs</p>
            {["Prenatal strength", "Hips and back relief", "Pelvic floor for birth", "Gentle walk"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[20px] border border-[#F0DCC4] p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#CFF1EA] text-[#0B6B5F]"><Activity className="h-5 w-5" aria-hidden="true" /></span>
                <span className="font-serif text-xl font-bold">{item}</span>
              </div>
            ))}
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-[#2A1220] p-[22px] text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">Your coach and physio · Example</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your movement support.</h2>
            <p className="text-sm leading-relaxed text-[#E8DCE2]">Coach and physiotherapy session details would appear here.</p>
            <div className="flex flex-wrap gap-2"><button type="button" disabled className={disabledButton}>Message</button><button type="button" disabled className={disabledButton}>Book a session</button></div>
          </section>
          <PregnancyExerciseSafety />
          <p className="text-xs leading-relaxed text-[#6A5560]">This is a design preview, not an exercise plan. Discuss movement with your care team.</p>
        </div>
      </div>
    </div>
  );
}
