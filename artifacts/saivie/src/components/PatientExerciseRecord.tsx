import React, { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import PregnancyExerciseSafety from "@/components/PregnancyExerciseSafety";

interface Props {
  week: number | null;
  onBack: () => void;
  onOpenPrograms: () => void;
  onBookAppointment?: () => void;
}

export default function PatientExerciseRecord({ week, onBack, onOpenPrograms, onBookAppointment }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  const navigate = (action: () => void) => {
    action();
    window.scrollTo(0, 0);
  };

  return (
    <section className="space-y-7 text-[#2A1220]" aria-label="Exercise record">
      <button type="button" onClick={() => navigate(onBack)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
        <ArrowLeft className="h-4 w-4" /> Health record
      </button>
      <div className="rounded-[40px] bg-[#CFF1EA] p-6 md:p-12">
        {week !== null && week >= 0 && <span className="inline-flex rounded-full bg-[#2A1220] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFA7B6]">Week {week}</span>}
        <h1 ref={heading} tabIndex={-1} className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] outline-none md:text-[72px]">
          Your exercise <em className="font-medium">record.</em>
        </h1>
        <p className="mt-4 max-w-[42ch] text-[17px] font-medium leading-[1.45] md:text-xl">Your movement and support from your care team.</p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-[#CFF1EA] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B6B5F]">Doctor clearance</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Check with your care team.</h2>
            <p className="text-[15px] leading-relaxed">Exercise clearance is not available on this screen. Ask your doctor or midwife what activity is appropriate for you.</p>
          </section>
          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">Current</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your movement</h2>
            <p className="text-[15px] leading-relaxed">Exercise sessions and weekly progress are not available in this record yet. Rest days matter too.</p>
            <button type="button" onClick={() => navigate(onOpenPrograms)} className="min-h-11 rounded-full border border-[#D9C3AE] px-5 text-sm font-bold">Explore movement ideas</button>
          </section>
          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Activity log</h2>
            <p className="text-[15px] leading-relaxed text-[#5A4552]">Exercise logging is not available here yet.</p>
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-[#FFE7A8] p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Anything unusual?</h2>
            <p className="text-[15px] leading-relaxed">Symptom check-ins are not available on this screen yet. If exercise causes symptoms, stop and contact your care team.</p>
          </section>
          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Notes and limits</h2>
            <p className="text-[15px] leading-relaxed text-[#5A4552]">Exercise notes and restrictions are not available on this screen yet. Discuss any limits with your care team.</p>
          </section>
          <section className="space-y-3 rounded-[28px] bg-[#FFE7A8] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Your plan</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Explore movement support.</h2>
            <p className="text-[15px] leading-relaxed">See general movement ideas and a preview of the Plus design.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(onOpenPrograms)} className="min-h-11 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">Explore exercise</button>
              {onBookAppointment && <button type="button" onClick={onBookAppointment} className="min-h-11 rounded-full border border-[#D9C3AE] bg-white px-5 text-sm font-bold">Book an appointment</button>}
            </div>
          </section>
          <PregnancyExerciseSafety />
        </div>
      </div>
    </section>
  );
}
