import React, { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Apple, ArrowLeft, Brain } from "lucide-react";
import { getWeekData } from "@/components/WeekByWeekTimeline";

interface Props {
  pregnancy: boolean;
  week: number | null;
  mode?: string;
}

export default function PatientPrograms({ pregnancy, week, mode }: Props) {
  const currentWeek = week ?? 24;
  const [activeCategory, setActiveCategory] = useState<"Mind" | "Move" | "Nourish" | null>(null);
  const weekGuide = getWeekData(currentWeek);

  if (mode === "postpartum" || mode === "menopause") {
    const postpartum = mode === "postpartum";
    const stagePrograms = postpartum
      ? [
          ["MIND", "Rest and emotional wellbeing", "Small check-ins and support at your pace. No streaks or pressure.", Brain],
          ["MOVE", "Recovery, at your pace", "Ask your care team when it is right to return to movement.", Activity],
          ["NOURISH", "Everyday nourishment", "Simple meal ideas to adapt to your preferences and needs.", Apple],
        ] as const
      : [
          ["MIND", "Sleep and mood support", "Gentle practices to explore what helps you feel more settled.", Brain],
          ["MOVE", "Comfortable movement", "Choose activity that feels right for you; ask your clinician about concerns.", Activity],
          ["NOURISH", "Balanced everyday meals", "Flexible food ideas without a prescribed target or plan.", Apple],
        ] as const;
    return (
      <div className="space-y-6 px-5 pb-28 pt-8 md:px-0 md:pb-10 md:pt-4" data-stage-programs={mode}>
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#775B63]">{postpartum ? "Postpartum programs" : "Perimenopause programs"}</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-[#35212f] md:text-5xl">Support that meets you here.</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#6A5963]">
            These are gentle starting points, not medical advice. Your history stays available in My care.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {stagePrograms.map(([eyebrow, title, description, Icon], index) => (
            <article key={eyebrow} className="min-h-[230px] rounded-[26px] border border-[#E8D8C8] bg-white/85 p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold tracking-[0.12em] text-[#775B63]">{eyebrow}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: index === 0 ? "#F6DCE5" : index === 1 ? "#DFF1C4" : "#D9EFF0" }}>
                  <Icon className="h-5 w-5 text-[#35212f]" />
                </span>
              </div>
              <h2 className="mt-6 font-serif text-2xl font-semibold text-[#35212f]">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6A5963]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  const categoryPages = {
    Mind: {
      eyebrow: "CLINICIAN-LED · MIND",
      headline: "Calmer days start with a",
      emphasis: "quieter mind.",
      intro: pregnancy
        ? "Birth preparation, sleep and mood support led by perinatal psychologists."
        : "Stress, sleep and mood programs led by clinical psychologists, timed to your cycle.",
      whyLabel: pregnancy ? `WHY NOW · WEEK ${currentWeek}` : "WHY NOW · DAY 14",
      whyText: pregnancy
        ? "Gentle mind practices can help with birth preparation, sleep and anxious thoughts. Choose support that feels manageable."
        : "Estrogen is high, and focus and confidence often peak. A good week for communication and goal-setting work.",
      ledBy: "Led by clinical psychologists.",
      programs: pregnancy
        ? [
            ["Birth preparation", "6 weeks · weekly sessions", "Practices for confidence and birth planning."] as const,
            ["Pregnancy sleep reset", "4 weeks · 15 min a day", "Habits for deeper, more supported rest."] as const,
            ["Calm and mood", "8 weeks · weekly sessions", "Understand and plan around mood shifts."] as const,
          ]
        : [
            ["Stress and focus", "4 weeks · 10 min a day", "Breathing, grounding and focus skills."] as const,
            ["Sleep reset", "6 weeks · 15 min a day", "Habits and techniques for deeper sleep."] as const,
            ["Cycle and mood", "8 weeks · weekly sessions", "Understand and plan around mood shifts."] as const,
          ],
      sessionTitle: "Breathing reset",
      sessionDuration: "8 min",
      sessionSteps: [
        "Settle: 2 minutes of slow breathing",
        "Notice: name what you feel",
        "Choose: one small action for today",
      ],
      disclaimer: "Mind programs are educational support, not therapy or a diagnosis. If you are in crisis, call your local emergency number or a mental-health helpline.",
    },
    Move: {
      eyebrow: "CLINICIAN-LED · MOVE",
      headline: "Strong, steady, and",
      emphasis: "in tune.",
      intro: pregnancy
        ? "Prenatal strength and mobility plans led by women's health physiotherapists."
        : "Strength and mobility plans built with physiotherapists, adjusted to how you feel each week.",
      whyLabel: pregnancy ? `WHY NOW · WEEK ${currentWeek}` : "WHY NOW · DAY 14",
      whyText: pregnancy
        ? "Choose low-impact movement that is comfortable for your body and consistent with your clinician's advice."
        : "Estrogen is high, so many women recover faster and can push harder. A good week to progress a lift.",
      ledBy: pregnancy ? "Led by women's health physiotherapists." : "Led by physiotherapists and coaches.",
      programs: pregnancy
        ? [
            ["Prenatal strength", "12 weeks · 3 sessions a week", "Low-impact strength matched to your trimester."] as const,
            ["Pregnancy mobility", "4 weeks · 15 min a day", "Gentle stretches for hips, ribs and lower back."] as const,
            ["Pelvic floor basics", "6 weeks · 10 min a day", "Foundations for core and pelvic-floor control."] as const,
          ]
        : [
            ["Cycle-synced strength", "8 weeks · 3 sessions a week", "Progressive strength that adapts by phase."] as const,
            ["Gentle mobility", "4 weeks · 15 min a day", "Stretch and release for tight hips and back."] as const,
            ["Pelvic floor basics", "6 weeks · 10 min a day", "Foundations for core and pelvic-floor control."] as const,
          ],
      sessionTitle: pregnancy ? "Prenatal lower-body strength" : "Lower-body strength",
      sessionDuration: pregnancy ? "25 min" : "35 min",
      sessionSteps: pregnancy
        ? [
            "Warm-up: 5 minutes of gentle mobility",
            "Main set: supported squats and controlled hinges",
            "Cool-down: breathing and a comfortable stretch",
          ]
        : [
            "Warm-up: 5 minutes of mobility",
            "Main set: 3 rounds of squats and hinges",
            "Cool-down: breathing and stretch",
          ],
      disclaimer: "Check with your doctor before starting a new exercise program, especially if you are pregnant, postpartum or have a health condition.",
    },
    Nourish: {
      eyebrow: "CLINICIAN-LED · NOURISH",
      headline: "Food that works",
      emphasis: "with your body.",
      intro: pregnancy
        ? "Pregnancy meal plans and nutrition guidance with registered dietitians."
        : "Meal plans and guidance from registered dietitians, tuned to your phase and your life.",
      whyLabel: pregnancy ? `WHY NOW · WEEK ${currentWeek}` : "WHY NOW · DAY 14",
      whyText: pregnancy
        ? weekGuide.nutrition
        : "Your body is using protein well this week. Lentils, eggs or paneer at lunch keep energy steady.",
      ledBy: "Led by registered dietitians.",
      programs: pregnancy
        ? [
            ["Pregnancy balanced plates", "6 weeks · weekly plan", "Simple meals for iron, protein and calcium."] as const,
            ["Iron and energy", "4 weeks · weekly plan", "Foods and habits to support steady energy."] as const,
            ["Everyday pregnancy meals", "6 weeks · weekly plan", "Quick recipes you can repeat."] as const,
          ]
        : [
            ["Eat for your phase", "4 weeks · weekly plan", "Simple meals matched to each phase."] as const,
            ["Iron and energy", "4 weeks · weekly plan", "Foods and habits to support steady energy."] as const,
            ["Everyday balanced plates", "6 weeks · weekly plan", "Quick recipes you can repeat."] as const,
          ],
      sessionTitle: "Protein-forward lunch plan",
      sessionDuration: "Weekly",
      sessionSteps: [
        "Choose: two protein options you enjoy",
        "Build: add colour and healthy fats",
        "Prep: batch one component on Sunday",
      ],
      disclaimer: "Nutrition guidance is general and educational. Ask your doctor or dietitian about allergies, conditions or medicines.",
    },
  } as const;

  return (
    <div className="pb-24">
      {!activeCategory ? (
        <CategoryOverview pregnancy={pregnancy} week={currentWeek} onSelect={setActiveCategory} />
      ) : (
        <CategoryDetail
          pregnancy={pregnancy}
          category={activeCategory}
          page={categoryPages[activeCategory]}
          onBack={() => setActiveCategory(null)}
        />
      )}
    </div>
  );
}

function CategoryOverview({
  pregnancy,
  week,
  onSelect,
}: {
  pregnancy: boolean;
  week: number;
  onSelect: (category: "Mind" | "Move" | "Nourish") => void;
}) {
  const categories = [
    {
      category: "Mind" as const,
      tint: "#E4DCFF",
      icon: Brain,
      title: "Mind",
      copy: pregnancy
        ? "Birth preparation and anxiety support with perinatal psychologists."
        : "Stress support and body literacy with licensed clinicians.",
    },
    {
      category: "Move" as const,
      tint: "#CFF1EA",
      icon: Activity,
      title: "Move",
      copy: pregnancy
        ? "Prenatal strength, mobility and pelvic-floor prep with women's health physios."
        : "Cycle-aware strength and recovery with fitness specialists.",
    },
    {
      category: "Nourish" as const,
      tint: "#FFD9C9",
      icon: Apple,
      title: "Nourish",
      copy: pregnancy
        ? "Pregnancy meal plans from registered dietitians."
        : "Everyday meal patterns for energy, recovery and hormonal balance.",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[40px] bg-[#FFA7B6] p-6 md:p-12"
      >
        <span className="inline-flex h-8 items-center rounded-full bg-[#2A1220] px-4 text-[12px] font-extrabold tracking-[0.1em] text-[#FFA7B6]">
          {pregnancy ? `WEEK ${week} PROGRAMS` : "CYCLE HEALTH PROGRAMS"}
        </span>
        <h1 className="mt-4 max-w-[800px] font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[72px]">
          Support your body, mind, and <em className="font-medium">life.</em>
        </h1>
      </motion.section>

      <section className="flex flex-wrap gap-5">
        {categories.map(({ category, tint, icon: Icon, title, copy }) => (
          <motion.button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            whileHover={{ y: -4 }}
            className="flex min-w-0 flex-[1_1_300px] flex-col items-start gap-4 rounded-[32px] p-7 text-left"
            style={{ background: tint }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2A1220] text-white">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="font-serif text-[34px] font-bold">{title}</h2>
            <p className="max-w-[32ch] text-[17px] leading-[1.5]">{copy}</p>
            <span className="mt-auto min-h-[44px] rounded-full bg-[#2A1220] px-[18px] py-[12px] text-[15px] font-bold text-white">
              Explore {title}
            </span>
          </motion.button>
        ))}
      </section>
    </div>
  );
}

function CategoryDetail({
  pregnancy,
  category,
  page,
  onBack,
}: {
  pregnancy: boolean;
  category: "Mind" | "Move" | "Nourish";
  page: {
    eyebrow: string;
    headline: string;
    emphasis: string;
    intro: string;
    whyLabel: string;
    whyText: string;
    ledBy: string;
    programs: readonly (readonly [string, string, string])[];
    sessionTitle: string;
    sessionDuration: string;
    sessionSteps: readonly string[];
    disclaimer: string;
  };
  onBack: () => void;
}) {
  const heroTints = {
    Mind: "#E4DCFF",
    Move: "#CFF1EA",
    Nourish: "#FFD9C9",
  };

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-2 rounded-full border border-[#E8D7C1] bg-white px-4 text-[14px] font-bold"
      >
        <ArrowLeft className="h-4 w-4" /> All programs
      </button>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-stretch justify-between gap-8 rounded-[40px] p-6 md:p-12"
        style={{ background: heroTints[category] }}
      >
        <div className="min-w-0 basis-[480px] flex-1">
          <span className="inline-flex h-8 items-center rounded-full bg-[#2A1220] px-4 text-[12px] font-extrabold tracking-[0.1em] text-white">
            {page.eyebrow}
          </span>
          <h1 className="mt-4 max-w-[760px] font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[72px]">
            {page.headline} <em className="font-medium">{page.emphasis}</em>
          </h1>
          <p className="mt-4 max-w-[48ch] text-[17px] font-medium leading-[1.45] md:text-[20px]">
            {page.intro}
          </p>
        </div>
        <div className="min-w-0 basis-[420px] flex-[0_1_420px] rounded-[32px] bg-white p-7">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#6A5560]">{page.whyLabel}</p>
          <p className="mt-3 text-[17px] leading-[1.5] text-[#3A2A44]">{page.whyText}</p>
        </div>
      </motion.section>

      <section className="space-y-4">
        <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">Programs</h2>
        <p className="text-[16px] text-[#6A5560]">{page.ledBy}</p>
        <div className="flex flex-wrap gap-5">
          {page.programs.map(([title, meta, copy]) => (
            <article key={title} className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[32px] border border-[#F0DCC4] bg-white p-7">
              <h3 className="font-serif text-[26px] font-bold leading-[1.15]">{title}</h3>
              <p className="text-[14px] font-bold text-[#6A5560]">{meta}</p>
              <p className="text-[16px] leading-[1.5] text-[#5A4552]">{copy}</p>
              <div className="mt-auto flex items-center justify-between gap-3">
                <span className="text-[14px] font-bold text-[#6A5560]">[PRICE]</span>
                <button type="button" className="min-h-[44px] rounded-full bg-[#2A1220] px-5 text-[15px] font-bold text-white">Start</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-5">
        <article className="flex min-w-0 flex-[1_1_500px] flex-col gap-4 rounded-[32px] border border-[#F0DCC4] bg-white p-7">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#6A5560]">A TASTE OF A SESSION</p>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-[28px] font-bold">{page.sessionTitle}</h2>
            <span className="text-[14px] font-bold text-[#6A5560]">{page.sessionDuration}</span>
          </div>
          {page.sessionSteps.map((step, index) => (
            <div key={step} className="flex items-start gap-3 rounded-[20px] bg-[#FFF8EF] p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2A1220] text-[13px] font-bold text-white">{index + 1}</span>
              <p className="text-[16px] leading-[1.45]">{step}</p>
            </div>
          ))}
          <button type="button" className="min-h-[44px] w-fit rounded-full bg-[#2A1220] px-5 text-[15px] font-bold text-white">Preview session</button>
        </article>

        <article className="flex min-w-0 flex-[1_1_500px] flex-col gap-4 rounded-[32px] bg-[#FFF8EF] p-7">
          <h2 className="font-serif text-[30px] font-bold">Meet the clinicians</h2>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((clinician) => (
              <div key={clinician} className="text-center">
                <div className="flex aspect-[4/5] items-center justify-center rounded-[20px] bg-[#E8D7C1] text-[12px] font-bold text-[#6A5560]">[PHOTO]</div>
                <p className="mt-2 text-[14px] font-bold">[Dr. Name]</p>
                <p className="text-[12px] text-[#6A5560]">[Credentials]</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">How it works</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["1", "Pick a program", "Choose from programs matched to your stage."],
            ["2", "Follow your plan", "Short sessions adapt as your cycle and energy change."],
            ["3", "Check in with a clinician", "Message or book a visit whenever you need to."],
          ].map(([number, title, copy]) => (
            <article key={number} className="rounded-[28px] bg-white p-6">
              <span className="text-[15px] font-extrabold">{number}</span>
              <h3 className="mt-3 font-serif text-[24px] font-bold">{title}</h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-[#5A4552]">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-5 rounded-[32px] bg-[#2A1220] p-7 text-[#FFF4E6] md:p-8">
        <div>
          <h2 className="font-serif text-[30px] font-bold">Not sure which program fits?</h2>
          <p className="mt-2 max-w-[48ch] text-[16px] leading-[1.5]">Talk to a clinician and get a plan matched to your stage.</p>
        </div>
        <button type="button" className="min-h-[52px] rounded-full bg-[#FFA7B6] px-6 text-[16px] font-bold text-[#2A1220]">Book a consult</button>
      </section>

      <p className="text-[12px] leading-[1.5] text-[#6A5560]">{page.disclaimer} Content shown is sample and needs clinical review before launch.</p>
    </div>
  );
}
