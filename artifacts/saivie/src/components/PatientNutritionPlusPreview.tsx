import React from "react";
import { ArrowLeft } from "lucide-react";

const meals = [
  { time: "Breakfast", title: "Ragi porridge with dates", detail: "Warm porridge with chopped dates.", nutrients: ["Iron", "Calcium"] },
  { time: "Mid-morning", title: "Fruit and curd", detail: "A bowl of seasonal fruit.", nutrients: ["Calcium"] },
  { time: "Lunch", title: "Dal, spinach and rice", detail: "With lemon and a side of curd.", nutrients: ["Iron", "Calcium"] },
  { time: "Snack", title: "Roasted chana", detail: "A small handful.", nutrients: ["Iron"] },
  { time: "Dinner", title: "Vegetable khichdi", detail: "Light and warm.", nutrients: [] },
];

const inactiveButton = "min-h-11 rounded-full border border-[#D9C3AE] bg-white px-4 text-sm font-bold text-[#6A5560] disabled:cursor-not-allowed";

export default function PatientNutritionPlusPreview({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-7 text-[#2A1220]">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase">
        <ArrowLeft className="h-4 w-4" /> Nutrition
      </button>

      <section className="rounded-[40px] bg-[#FFD9C9] p-6 md:p-12">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#2A1220] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFA7B6]">Example · Week 14</span>
          <span className="rounded-full bg-[#2A1220] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFA7B6]">Plus preview</span>
        </div>
        <h1 className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[72px]">
          Your plan, <em className="font-medium">week 14.</em>
        </h1>
        <p className="mt-4 text-[17px] font-medium leading-[1.45] md:text-xl">A preview of how a personalised meal plan could look.</p>
        <p className="mt-4 max-w-3xl rounded-2xl bg-white/80 p-4 text-sm leading-relaxed">
          Example only: meals, goals, progress and choices are not yours or medical advice. Purchases and the actions shown here are not available yet.
        </p>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-4 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Today <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#6A5560]">· Example</span></h2>
            {([
              ["Iron-rich servings", "2 of 3", 2, 3],
              ["Calcium servings", "1 of 3", 1, 3],
              ["Water", "5 of 8 glasses", 5, 8],
            ] as const).map(([label, amount, value, max]) => (
              <div key={label}>
                <div className="flex justify-between gap-3 text-sm font-bold"><span>{label}</span><span>{amount}</span></div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-[#F0DCD4]" role="progressbar" aria-label={`Example ${label}`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
                  <div className="h-full rounded-full bg-[#2A1220]" style={{ width: `${value / max * 100}%` }} />
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Today&apos;s plan</h2>
            <p className="text-sm text-[#6A5560]">Example meals, not a plan for you.</p>
            {meals.map((meal) => (
              <article key={meal.time} className="space-y-2 rounded-[20px] border border-[#F0DCC4] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">{meal.time}</p>
                  <button type="button" disabled className="min-h-9 rounded-full border border-[#D9C3AE] px-3 text-xs font-bold text-[#6A5560] disabled:cursor-not-allowed">Swap</button>
                </div>
                <h3 className="font-serif text-xl font-bold">{meal.title}</h3>
                <p className="text-sm leading-relaxed text-[#5A4552]">{meal.detail}</p>
                {meal.nutrients.length > 0 && <div className="flex flex-wrap gap-2">{meal.nutrients.map((nutrient) => <span key={nutrient} className="rounded-full bg-[#CFF1EA] px-3 py-1 text-xs font-bold text-[#0B6B5F]">{nutrient}</span>)}</div>}
              </article>
            ))}
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-[#CFF1EA] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B6B5F]">Example · Adapted to labs</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Meals tailored to results.</h2>
            <p className="text-[15px] leading-relaxed">This illustrates where a nutritionist&apos;s guidance could appear. No lab results were used in this preview.</p>
            <div className="flex flex-wrap gap-2"><button type="button" disabled className={inactiveButton}>See my result</button><button type="button" disabled className={inactiveButton}>Ask my nutritionist</button></div>
          </section>

          <section className="space-y-3 rounded-[28px] bg-[#FFE7A8] p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">This week&apos;s shopping list</h2>
            <p className="text-[15px] leading-relaxed">An example of a shopping list from a meal plan.</p>
            <div className="flex flex-wrap gap-2"><button type="button" disabled className={inactiveButton}>Open list</button><button type="button" disabled className={inactiveButton}>Share</button></div>
          </section>

          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your food choices</h2>
            <p className="text-sm text-[#6A5560]">Example choices</p>
            <div className="flex flex-wrap gap-2">{["Vegetarian", "No nuts", "Mild spice"].map((choice) => <span key={choice} className="rounded-full border border-[#F0DCC4] px-4 py-2 text-sm font-bold">{choice}</span>)}</div>
            <button type="button" disabled className={inactiveButton}>Edit choices</button>
          </section>

          <section className="space-y-3 rounded-[28px] bg-[#2A1220] p-[22px] text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">Your nutritionist · Example</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your nutrition support.</h2>
            <p className="text-[15px] leading-relaxed text-[#E8DCE2]">Session details would appear here.</p>
            <div className="flex flex-wrap gap-2"><button type="button" disabled className={inactiveButton}>Message</button><button type="button" disabled className={inactiveButton}>Book next session</button></div>
          </section>

          <section className="space-y-3 rounded-[28px] border border-dashed border-[#D9C3AE] bg-[#FFF4EE] p-[22px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7A4B00]">Good to know</p>
            <p className="text-sm leading-relaxed">This is a design preview, not dietary guidance. Pregnancy nutrition needs differ; discuss your needs with your doctor or dietitian.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
