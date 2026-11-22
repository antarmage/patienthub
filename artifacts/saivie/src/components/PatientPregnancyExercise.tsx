import React, { useState } from "react";
import { Activity, ArrowLeft, Check, Lock } from "lucide-react";
import PatientExercisePlusPreview from "@/components/PatientExercisePlusPreview";
import PregnancyExerciseSafety from "@/components/PregnancyExerciseSafety";
import PatientPublishedPrograms, { type PatientProgramsState } from "@/components/PatientPublishedPrograms";

interface Props {
  week: number | null;
  onBack: () => void;
  onBookAppointment?: () => void;
  onBookSession?: () => void;
  programs?: PatientProgramsState;
}

export default function PatientPregnancyExercise({ week, onBack, onBookAppointment, onBookSession, programs }: Props) {
  const [showPlusPreview, setShowPlusPreview] = useState(false);

  if (showPlusPreview) {
    return <PatientExercisePlusPreview onBack={() => { setShowPlusPreview(false); window.scrollTo(0, 0); }} />;
  }

  return (
    <div className="space-y-7 text-[#2A1220]">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase">
        <ArrowLeft className="h-4 w-4" /> Programs
      </button>

      <section className="rounded-[40px] bg-[#CFF1EA] p-6 md:p-12">
        <div className="flex flex-wrap items-center gap-3">
          {week !== null && week >= 0 && <span className="rounded-full bg-[#2A1220] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFA7B6]">Week {week}</span>}
          <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#0B6B5F]">Free</span>
        </div>
        <h1 className="mt-4 max-w-[800px] font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[72px]">
          Stay strong <em className="font-medium">and comfortable.</em>
        </h1>
        <p className="mt-4 text-[17px] font-medium leading-[1.45] md:text-xl">Gentle movement ideas for pregnancy.</p>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <PatientPublishedPrograms category="exercise" state={programs} />
          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Before you start</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Check with your doctor or midwife first.</h2>
            <p className="text-[15px] leading-relaxed text-[#5A4552]">Ask your care team what movement is appropriate for you, especially if you have symptoms or pregnancy complications.</p>
          </section>

          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your free starter set</h2>
            <p className="text-[15px] leading-relaxed text-[#5A4552]">Ideas to discuss with your care team. Guided sessions and videos are not available here yet.</p>
            {["Gentle walk", "Breathing and relaxation", "Pelvic floor basics", "Back and hip stretches"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[20px] border border-[#F0DCC4] p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#CFF1EA] text-[#0B6B5F]"><Activity className="h-5 w-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><h3 className="font-serif text-xl font-bold">{item}</h3><p className="text-sm text-[#6A5560]">Movement idea</p></div>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-[28px] border border-[#E4DCFF] bg-[#F7F3FF] p-[22px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-[26px] font-bold leading-tight">Go further with Plus</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4DCFF] px-3 py-1.5 text-xs font-extrabold text-[#3A24B8]"><Lock className="h-3.5 w-3.5" aria-hidden="true" /> PLUS</span>
            </div>
            <p className="text-[15px] leading-relaxed">Plus exercise programs are not available here yet.</p>
            {["Prenatal strength", "Hips and back relief", "Pelvic floor for birth"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[20px] border border-[#E4DCFF] bg-white/70 p-4">
                <Lock className="h-5 w-5 shrink-0 text-[#3A24B8]" aria-hidden="true" />
                <span className="font-serif text-lg font-bold">{item}</span>
              </div>
            ))}
            <button type="button" onClick={() => { setShowPlusPreview(true); window.scrollTo(0, 0); }} className="min-h-11 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">Preview Plus design</button>
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-[#FFF4EE] p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Need a person?</h2>
            <article className="space-y-3 rounded-[24px] border border-[#F0DCC4] bg-white p-[18px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">Your care team</p>
              <h3 className="font-serif text-[22px] font-bold leading-tight">Talk about movement that feels right for you.</h3>
              <p className="text-sm leading-relaxed text-[#5A4552]">Coach and physiotherapy booking options are not available here yet. Your care team can help with questions about exercise or discomfort.</p>
              {onBookSession && <button type="button" onClick={onBookSession} className="min-h-11 rounded-full border border-[#D9C3AE] px-5 text-sm font-bold">Explore session booking</button>}
            </article>
          </section>

          <section className="space-y-3 rounded-[28px] bg-[#FFF4EE] p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Pick what you need</h2>
            <article className="space-y-2.5 rounded-[24px] border border-[#F0DCC4] bg-white p-[18px]">
              <h3 className="font-serif text-[22px] font-bold">Free</h3>
              <p className="flex gap-2 text-sm"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0B6B5F]" aria-hidden="true" />Movement ideas and your health record</p>
            </article>
            <article className="space-y-2.5 rounded-[24px] border-2 border-[#2A1220] bg-white p-[18px]">
              <h3 className="font-serif text-[22px] font-bold">Plus</h3>
              <p className="text-sm leading-relaxed text-[#5A4552]">Plus programs and purchasing are not available here yet.</p>
            </article>
            <article className="space-y-2.5 rounded-[24px] border border-[#F0DCC4] bg-white p-[18px]">
              <h3 className="font-serif text-[22px] font-bold">Sessions</h3>
              <p className="text-sm leading-relaxed text-[#5A4552]">Discuss your needs with your care team.</p>
              {onBookAppointment && <button type="button" onClick={onBookAppointment} className="min-h-11 rounded-full border border-[#D9C3AE] px-5 text-sm font-bold">Book an appointment</button>}
            </article>
          </section>

          <PregnancyExerciseSafety />
          <p className="text-xs leading-relaxed text-[#6A5560]">These are general ideas, not a personalised exercise plan. Content needs clinical review before launch.</p>
        </div>
      </div>
    </div>
  );
}
