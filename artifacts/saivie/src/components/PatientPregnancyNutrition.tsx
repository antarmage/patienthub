import React, { useState } from "react";
import { ArrowLeft, Check, Lock } from "lucide-react";
import PatientNutritionPlusPreview from "@/components/PatientNutritionPlusPreview";

interface Props {
  week: number | null;
  onBack: () => void;
  onOpenLabReports?: () => void;
  onBookSession?: () => void;
}

export default function PatientPregnancyNutrition({ week, onBack, onOpenLabReports, onBookSession }: Props) {
  const [showPlusPreview, setShowPlusPreview] = useState(false);

  if (showPlusPreview) {
    return <PatientNutritionPlusPreview onBack={() => { setShowPlusPreview(false); window.scrollTo(0, 0); }} />;
  }

  return (
    <div className="space-y-7 text-[#2A1220]">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase">
        <ArrowLeft className="h-4 w-4" /> Programs
      </button>

      <section className="rounded-[40px] bg-[#FFD9C9] p-6 md:p-12">
        <div className="flex flex-wrap items-center gap-2">
          {week !== null && week >= 0 && <span className="rounded-full bg-[#2A1220] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFA7B6]">Week {week}</span>}
          <span className="rounded-full bg-[#CFF1EA] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#0B6B5F]">Free</span>
        </div>
        <h1 className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[72px]">
          Eat well <em className="font-medium">for two.</em>
        </h1>
        <p className="mt-4 text-[17px] font-medium leading-[1.45] md:text-xl">Simple food guidance for pregnancy, free.</p>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-[#FFE7A8] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7A4B00]">Food focus</p>
            <h2 className="font-serif text-[28px] font-bold leading-tight">Iron-rich foods</h2>
            <div className="flex flex-wrap gap-2">
              {["Cooked red meat", "Spinach", "Lentils", "Beans"].map((food) => (
                <span key={food} className="rounded-full border border-[#F0DCC4] bg-white px-4 py-2 text-sm font-bold">{food}</span>
              ))}
            </div>
            <p className="text-[15px] leading-relaxed">Try pairing plant sources of iron with foods containing vitamin C, such as lemon or amla.</p>
          </section>

          <section className="space-y-4 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Today&apos;s basics</h2>
            {([
              ["H2O", "Water.", "Sip regularly through the day.", "#CFF1EA", "#0B6B5F"],
              ["Ca", "Calcium.", "Consider foods such as pasteurised milk, curd, ragi or leafy greens.", "#E4DCFF", "#3A24B8"],
              ["Fe", "Iron.", "Choose iron-containing foods that suit your diet.", "#FFD9C9", "#A8341A"],
            ] as const).map(([symbol, title, copy, background, color]) => (
              <div key={symbol} className="flex items-start gap-3 text-[15px] leading-relaxed">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold" style={{ background, color }}>{symbol}</span>
                <p className="pt-1.5"><strong>{title}</strong> {copy}</p>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-[28px] border border-[#F0DCC4] p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Go gently with</h2>
            <p className="text-[15px] leading-relaxed">Avoid raw or undercooked meat, fish and eggs, unpasteurised milk and cheese, and high-mercury fish. Ask your care team about caffeine and any other food concerns.</p>
          </section>

          <section className="space-y-3 rounded-[28px] border border-[#E4DCFF] bg-[#F7F3FF] p-[22px]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#3A24B8]">Your meal plan</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4DCFF] px-3 py-1.5 text-xs font-extrabold text-[#3A24B8]"><Lock className="h-3.5 w-3.5" /> PLUS</span>
            </div>
            <div className="space-y-2 py-1" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((row) => <div key={row} className="flex gap-2.5"><span className="h-3 w-[70px] rounded-full bg-[#E4DCFF]" /><span className="h-3 flex-1 rounded-full bg-[#ECE6FF]" /></div>)}
            </div>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Meals made for you.</h2>
            <p className="text-[15px] leading-relaxed">Personalised meal plans are not available here yet.</p>
            <button type="button" onClick={() => { setShowPlusPreview(true); window.scrollTo(0, 0); }} className="min-h-11 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">Preview Plus design</button>
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-[#E4DCFF] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#3A24B8]">From your record</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your results, together.</h2>
            <p className="text-[15px] leading-relaxed">Review your lab reports and discuss any nutrition questions with your care team.</p>
            <div className="flex flex-wrap gap-2">
              {onOpenLabReports && <button type="button" onClick={onOpenLabReports} className="min-h-11 rounded-full border border-[#D9C3AE] bg-white px-4 text-sm font-bold">See my results</button>}
              {onBookSession && <button type="button" onClick={onBookSession} className="min-h-11 rounded-full border border-[#D9C3AE] bg-white px-4 text-sm font-bold">Talk to a nutritionist</button>}
            </div>
          </section>

          <section className="space-y-3 rounded-[28px] bg-[#FFF4EE] p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Pick what you need</h2>
            <article className="space-y-2.5 rounded-[24px] border border-[#F0DCC4] bg-white p-[18px]">
              <h3 className="font-serif text-[22px] font-bold">Free</h3>
              <p className="text-[13px] text-[#5A4552]">Food ideas and your health record</p>
              {["Food focus and tips", "Health record and reminders"].map((item) => <p key={item} className="flex gap-2 text-sm"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0B6B5F]" />{item}</p>)}
            </article>
            <article className="space-y-2.5 rounded-[24px] border-2 border-[#2A1220] bg-white p-[18px]">
              <h3 className="font-serif text-[22px] font-bold">Plus</h3>
              <p className="text-sm leading-relaxed text-[#5A4552]">Personalised plans are not available here yet.</p>
            </article>
            <article className="space-y-2.5 rounded-[24px] border border-[#F0DCC4] bg-white p-[18px]">
              <h3 className="font-serif text-[22px] font-bold">Sessions</h3>
              <p className="text-[13px] text-[#5A4552]">A person on your side</p>
              <p className="flex gap-2 text-sm"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0B6B5F]" />Explore a nutrition consultation with your care team.</p>
              {onBookSession && <button type="button" onClick={onBookSession} className="min-h-11 rounded-full border border-[#D9C3AE] px-4 text-sm font-bold">Book a session</button>}
            </article>
          </section>

          <section className="space-y-3 rounded-[28px] border border-dashed border-[#D9C3AE] bg-[#FFF4EE] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7A4B00]">Good to know</p>
            <p className="text-sm leading-relaxed">Nutrition needs differ from person to person. Discuss dietary changes, allergies and supplements with your doctor or dietitian.</p>
          </section>
          <p className="text-xs leading-relaxed text-[#6A5560]">This general guidance is sample content and needs review by a registered dietitian before launch.</p>
        </div>
      </div>
    </div>
  );
}
