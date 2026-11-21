import React from "react";
import { motion } from "framer-motion";
import { Activity, Apple, Brain, ChevronRight, Heart, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  pregnancy: boolean;
  week: number | null;
}

export default function PatientPrograms({ pregnancy, week }: Props) {
  const currentWeek = week ?? 24;
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

  const picked = pregnancy
    ? [
        ["Birth class, online", "6 weeks · Midwife-led · [PRICE]", "Labour, pain relief options and what to pack."],
        ["Prenatal strength", "12 weeks · Women's health physio · [PRICE]", "Low-impact strength and mobility for pregnancy."],
        ["Pregnancy nutrition", "4 weeks · Registered dietitian · [PRICE]", "Iron-rich lunches and calcium coverage."],
      ]
    : [
        ["Cycle foundations", "4 weeks · Clinician-led · [PRICE]", "Understand your cycle and daily signals."],
        ["Strength and recovery", "8 weeks · Coach-led · [PRICE]", "Adapt movement to your cycle phase."],
        ["Nourish for energy", "4 weeks · Dietitian-led · [PRICE]", "Food patterns for your current phase."],
      ];

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
            Prepare your body and mind for <em className="font-medium">birth.</em>
          </h1>
          <p className="mt-4 max-w-[36ch] text-[17px] font-medium leading-[1.4] md:text-[20px]">
            Programs from clinicians, timed to your week.
          </p>
        </div>
        <div className="min-w-0 basis-[420px] flex-[0_1_420px] rounded-[32px] bg-white p-7">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#2A1220]">YOUR PROGRAM</p>
            <p className="text-[13px] font-bold text-[#6A5560]">Week 3 of 12</p>
          </div>
          <p className="mt-3 font-serif text-[30px] font-bold leading-[1.1]">Prenatal strength and mobility</p>
          <div className="mt-4 h-[10px] rounded-full bg-[#F3E6D4]">
            <div className="h-full w-1/4 rounded-full bg-[#2A1220]" />
          </div>
          <p className="mt-4 text-[16px] leading-[1.5] text-[#3A2A44]">
            Today's session: 25 minutes, low impact. Your joints are looser now, so we keep it controlled.
          </p>
          <button type="button" className="mt-5 h-[50px] rounded-full bg-[#2A1220] px-6 text-[16px] font-extrabold text-[#FFF4E6]">
            Start session
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
                <button type="button" className="min-h-[44px] self-start rounded-full bg-[#2A1220] px-[18px] text-[15px] font-bold text-[#FFF4E6]">
                  Explore {category.label}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">Picked for you</h2>
        <div className="flex flex-wrap items-stretch gap-5">
          {picked.map(([title, meta, copy]) => (
            <article key={title} className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[32px] border border-[#F0DCC4] bg-white p-7">
              <h3 className="font-serif text-[26px] font-bold leading-[1.15]">{title}</h3>
              <p className="text-[14px] font-bold text-[#6A5560]">{meta}</p>
              <p className="text-[16px] leading-[1.5] text-[#5A4552]">{copy}</p>
              <button type="button" className="mt-auto min-h-[44px] self-start border-0 bg-transparent p-0 text-[16px] font-bold underline underline-offset-4">
                See details
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
