import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Apple, Brain } from "lucide-react";

interface Props {
  pregnancy: boolean;
  week: number | null;
}

export default function PatientPrograms({ pregnancy, week }: Props) {
  const currentWeek = week ?? 24;
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const mindText = pregnancy
    ? "Birth preparation and anxiety support with perinatal psychologists."
    : "Stress support and body literacy with licensed clinicians.";
  const moveText = pregnancy
    ? "Prenatal strength, mobility and pelvic-floor prep with women's health physios."
    : "Cycle-aware strength and recovery with fitness specialists.";
  const nourishText = pregnancy
    ? "Pregnancy meal plans from registered dietitians. Iron, folate and calcium covered."
    : "Everyday meal patterns for energy, recovery and hormonal balance.";

  const categories = [
    { label: "Mind", copy: mindText, tint: "#E4DCFF", labelColor: "#3A24B8", icon: Brain },
    { label: "Move", copy: moveText, tint: "#CFF1EA", labelColor: "#0B6B5F", icon: Activity },
    { label: "Nourish", copy: nourishText, tint: "#FFD9C9", labelColor: "#A8341A", icon: Apple },
  ];

  const catalog = pregnancy
    ? [
        { title: "Birth class, online", category: "Mind", meta: "6 weeks · Midwife-led", copy: "Labour, pain relief options and what to pack.", detail: "A guided preparation course for birth and the first days after delivery." },
        { title: "Prenatal strength", category: "Move", meta: "12 weeks · Women's health physio", copy: "Low-impact strength and mobility for pregnancy.", detail: "Follow a trimester-aware plan with clear modifications and clinician guidance." },
        { title: "Pregnancy nutrition", category: "Nourish", meta: "4 weeks · Registered dietitian", copy: "Iron-rich lunches and calcium coverage.", detail: "Build a practical meal pattern around your preferences and pregnancy requirements." },
        { title: "Calm and sleep", category: "Mind", meta: "4 weeks · Perinatal clinician", copy: "Breathing, relaxation and sleep routines.", detail: "Short practices designed for pregnancy-related stress and sleep disruption." },
      ]
    : [
        { title: "Cycle foundations", category: "Mind", meta: "4 weeks · Clinician-led", copy: "Understand your cycle and daily signals.", detail: "Learn how cycle phases connect to energy, mood and common symptoms." },
        { title: "Strength and recovery", category: "Move", meta: "8 weeks · Coach-led", copy: "Adapt movement to your cycle phase.", detail: "A structured movement plan that adjusts intensity throughout the month." },
        { title: "Nourish for energy", category: "Nourish", meta: "4 weeks · Dietitian-led", copy: "Food patterns for your current phase.", detail: "Build practical meals for steadier energy and recovery." },
      ];

  const visibleCatalog = useMemo(
    () => activeCategory === "All"
      ? catalog
      : catalog.filter((program) => program.category === activeCategory),
    [activeCategory, catalog],
  );

  return (
    <div className="space-y-6 pb-24">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-stretch justify-between gap-8 rounded-[40px] bg-[#FFA7B6] p-6 md:p-12"
      >
        <div className="min-w-0 basis-[480px] flex-1">
          <span className="inline-flex h-8 items-center rounded-full bg-[#2A1220] px-4 text-[12px] font-extrabold tracking-[0.1em] text-[#FFA7B6]">
            WEEK {currentWeek} PROGRAMS
          </span>
          <h1 className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[72px]">
            {pregnancy
              ? <>Prepare your body and mind for <em className="font-medium">birth.</em></>
              : <>Support your body through <em className="font-medium">your cycle.</em></>}
          </h1>
          <p className="mt-4 max-w-[36ch] text-[17px] font-medium leading-[1.4] md:text-[20px]">
            Explore clinician-led programs timed to your pregnancy.
          </p>
        </div>
        <div className="min-w-0 basis-[420px] flex-[0_1_420px] rounded-[32px] bg-white p-7">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#2A1220]">WEEK {currentWeek} RECOMMENDATION</p>
          <p className="mt-3 font-serif text-[30px] font-bold leading-[1.1]">Prenatal strength and mobility</p>
          <p className="mt-4 text-[16px] leading-[1.5] text-[#3A2A44]">
            A low-impact women's health physiotherapy program with trimester-aware modifications.
          </p>
          <button
            type="button"
            onClick={() => setSelectedProgram("Prenatal strength")}
            className="mt-5 min-h-[50px] rounded-full bg-[#2A1220] px-6 text-[16px] font-extrabold text-[#FFF4E6]"
          >
            View recommendation
          </button>
        </div>
      </motion.section>

      <section className="space-y-4">
        <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">Mind, move, nourish</h2>
        <div className="flex flex-wrap gap-5">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <article
                key={category.label}
                className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-[32px] p-7"
                style={{ background: category.tint }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2A1220]" style={{ color: category.tint }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-serif text-[30px] font-bold">{category.label}</h3>
                </div>
                <p className="text-[17px] leading-[1.5]">{category.copy}</p>
                <span className="w-fit rounded-full bg-white px-[14px] py-2 text-[14px] font-bold">
                  {category.label === "Mind"
                    ? `Week ${currentWeek}: start a birth plan`
                    : category.label === "Move"
                      ? "Low-impact, adjusted each trimester"
                      : `Week ${currentWeek}: iron-rich lunches`}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveCategory(category.label)}
                  className="min-h-[44px] self-start rounded-full bg-[#2A1220] px-[18px] text-[15px] font-bold text-[#FFF4E6]"
                >
                  Explore {category.label}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">
            {activeCategory === "All" ? "Picked for you" : `${activeCategory} programs`}
          </h2>
          <div className="flex flex-wrap gap-2" aria-label="Filter programs">
            {["All", "Mind", "Move", "Nourish"].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`min-h-[44px] rounded-full px-4 text-[14px] font-bold ${
                  activeCategory === category
                    ? "bg-[#2A1220] text-[#FFF4E6]"
                    : "border border-[#E8D7C1] bg-white text-[#2A1220]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-stretch gap-5">
          {visibleCatalog.map((program) => (
            <article key={program.title} className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[32px] border border-[#F0DCC4] bg-white p-7">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-[26px] font-bold leading-[1.15]">{program.title}</h3>
                <span className="rounded-full bg-[#FFF4E6] px-3 py-1 text-[12px] font-extrabold">{program.category}</span>
              </div>
              <p className="text-[14px] font-bold text-[#6A5560]">{program.meta}</p>
              <p className="text-[16px] leading-[1.5] text-[#5A4552]">{program.copy}</p>
              {selectedProgram === program.title && (
                <p className="rounded-[18px] bg-[#FFF8EF] p-4 text-[15px] leading-[1.5] text-[#4A3846]">{program.detail}</p>
              )}
              <button
                type="button"
                onClick={() => setSelectedProgram((current) => current === program.title ? null : program.title)}
                className="mt-auto min-h-[44px] self-start border-0 bg-transparent p-0 text-[16px] font-bold underline underline-offset-4"
              >
                {selectedProgram === program.title ? "Hide details" : "See details"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
