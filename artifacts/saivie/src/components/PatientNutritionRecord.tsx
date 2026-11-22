import React, { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { receptionPatientHistory } from "@/lib/receptionPatientHistory";

interface Props {
  patient: Record<string, unknown>;
  week: number | null;
  onBack: () => void;
  onOpenLabReports: () => void;
  onOpenPrograms: () => void;
  onBookAppointment?: () => void;
  onOpenTrack?: () => void;
}

const outlineButton = "min-h-11 rounded-full border border-[#D9C3AE] bg-white px-5 text-sm font-bold";

export default function PatientNutritionRecord({ patient, week, onBack, onOpenLabReports, onOpenPrograms, onBookAppointment, onOpenTrack }: Props) {
  const allergies = receptionPatientHistory(patient).metrics.find((item) => item.label === "Allergies")?.value;
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
    <section className="space-y-7 text-[#2A1220]" aria-label="Nutrition record">
      <button type="button" onClick={() => navigate(onBack)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
        <ArrowLeft className="h-4 w-4" /> Health record
      </button>
      <div className="rounded-[40px] bg-[#FFD9C9] p-6 md:p-12">
        {week !== null && week >= 0 && <span className="inline-flex rounded-full bg-[#2A1220] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFA7B6]">Week {week}</span>}
        <h1 ref={heading} tabIndex={-1} className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] outline-none md:text-[72px]">
          Your nutrition <em className="font-medium">record.</em>
        </h1>
        <p className="mt-4 max-w-[42ch] text-[17px] font-medium leading-[1.45] md:text-xl">Your food choices, nutrition support and health record.</p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-[#CFF1EA] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B6B5F]">From your care team</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your nutrition advice</h2>
            <p className="text-[15px] leading-relaxed">Nutrition advice from your care team is not available on this screen yet. Ask your care team if you have questions about your plan.</p>
          </section>

          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your food choices</h2>
            <div className="divide-y divide-[#F0DCC4]">
              <div className="py-3"><p className="text-sm font-bold">Eating style</p><p className="mt-1 text-sm text-[#5A4552]">Not available here yet</p></div>
              <div className="py-3"><p className="text-sm font-bold">Recorded allergies</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#5A4552]">{allergies || "Not recorded"}</p><p className="mt-1 text-xs text-[#6A5560]">Includes allergies recorded in your health history, not only food allergies.</p></div>
              <div className="py-3"><p className="text-sm font-bold">Dietary restrictions</p><p className="mt-1 text-sm text-[#5A4552]">Not available here yet</p></div>
            </div>
            <p className="text-sm text-[#5A4552]">To update your allergies or discuss dietary restrictions, contact your care team.</p>
          </section>

          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">This week</h2>
            <p className="text-[15px] leading-relaxed">Meal and supplement logging are not available in this record yet. Logging is optional.</p>
            {onOpenTrack && <button type="button" onClick={() => navigate(onOpenTrack)} className={outlineButton}>Track water</button>}
          </section>

          <section className="space-y-3 rounded-[28px] bg-[#E4DCFF] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#3A24B8]">Linked to your record</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your lab reports</h2>
            <p className="text-[15px] leading-relaxed">Review your recorded results and discuss nutrition questions with your care team.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(onOpenLabReports)} className={outlineButton}>See lab reports</button>
              {onBookAppointment && <button type="button" onClick={onBookAppointment} className={outlineButton}>Talk to a nutritionist</button>}
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">History</h2>
            <p className="text-[15px] leading-relaxed text-[#5A4552]">Nutrition history and notes are not available on this screen yet.</p>
          </section>

          <section className="space-y-3 rounded-[28px] bg-[#FFE7A8] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Your plan</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Explore nutrition support.</h2>
            <p className="text-[15px] leading-relaxed">See general food guidance and a preview of the personalised plan design.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(onOpenPrograms)} className="min-h-11 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">Explore nutrition</button>
              {onBookAppointment && <button type="button" onClick={onBookAppointment} className={outlineButton}>Book a nutritionist</button>}
            </div>
          </section>

          <section className="space-y-3 rounded-[28px] border border-dashed border-[#D9C3AE] bg-[#FFF4EE] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7A4B00]">Good to know</p>
            <p className="text-sm leading-relaxed">Nutrition needs differ from person to person. Discuss dietary changes, allergies and supplements with your doctor or dietitian.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
