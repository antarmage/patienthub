import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarPlus,
  Check,
  ChevronRight,
  Heart,
  Moon,
  Share2,
  Sparkles,
  Stethoscope,
  Utensils,
  Wind,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import pregnancyGrowthBg from "@/assets/images/pregnancy-growth-bg.png";

interface Props {
  mode: string;
  patient: any;
  pregnancyEpisode: any;
  appointments: any[];
  medications: any[];
  onBook: () => void;
  onOpenCare: () => void;
}

function gestationalWeek(lmp?: string | null) {
  if (!lmp) return null;
  const start = new Date(lmp);
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(0, Math.min(42, Math.floor((Date.now() - start.getTime()) / (7 * 86400000))));
}

function babySize(weeks: number) {
  if (weeks < 8) return { title: "Poppy seed", emoji: "🌱", detail: "Major organs are beginning to form." };
  if (weeks < 12) return { title: "Lime", emoji: "🍋", detail: "Fingers and toes are developing." };
  if (weeks < 16) return { title: "Avocado", emoji: "🥑", detail: "Baby is becoming more active." };
  if (weeks < 18) return { title: "Bell pepper", emoji: "🫑", detail: "Baby can yawn and hiccup." };
  if (weeks < 20) return { title: "Mango", emoji: "🥭", detail: "Baby's hearing and senses are developing." };
  if (weeks < 28) return { title: "Eggplant", emoji: "🍆", detail: "Baby is growing rapidly and gaining fat." };
  if (weeks < 36) return { title: "Honeydew melon", emoji: "🍈", detail: "Baby is gaining weight and preparing for birth." };
  return { title: "Full term", emoji: "🍉", detail: "Baby is nearly ready to meet you." };
}

export default function PatientTodayDashboard({
  mode,
  patient,
  pregnancyEpisode,
  appointments,
  medications,
  onBook,
  onOpenCare,
}: Props) {
  const isPregnancy = mode === "pregnancy";
  const lmp = pregnancyEpisode?.details?.lmp || patient?.lmp || null;
  const week = gestationalWeek(lmp);
  const dueDate = useMemo(() => {
    if (!lmp) return null;
    const date = new Date(lmp);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() + 280);
    return date;
  }, [lmp]);

  const upcoming = [...appointments]
    .filter((appointment) => {
      const status = String(appointment.status || "").toLowerCase();
      return !["cancelled", "canceled", "no-show", "completed"].includes(status) && appointment.date;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const firstName = String(patient?.name || "there").trim().split(/\s+/)[0];
  const [checkIn, setCheckIn] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("patientDailyCheckIn") || "{}");
      return Array.isArray(stored?.symptoms) ? stored.symptoms : [];
    } catch {
      return [];
    }
  });
  const [checkInSaved, setCheckInSaved] = useState(false);
  const [checkInStreak, setCheckInStreak] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("patientDailyCheckIn") || "{}");
      return typeof stored?.streak === "number" ? stored.streak : 0;
    } catch {
      return 0;
    }
  });
  const toggleSymptom = (symptom: string) => {
    setCheckIn((current) => current.includes(symptom)
      ? current.filter((item) => item !== symptom)
      : [...current, symptom]);
    setCheckInSaved(false);
  };

  const saveCheckIn = () => {
    const nextStreak = checkInSaved ? checkInStreak : checkInStreak + 1;
    localStorage.setItem("patientDailyCheckIn", JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      symptoms: checkIn,
      streak: nextStreak,
    }));
    setCheckInStreak(nextStreak);
    setCheckInSaved(true);
  };

  const shareEra = async () => {
    const text = isPregnancy
      ? `${firstName} is at week ${week ?? "—"} of pregnancy · Saivie`
      : `${firstName}'s health era · Saivie`;
    if (navigator.share) {
      await navigator.share({ title: "Saivie", text }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(text);
    }
  };

  const weekDotCount = 40;
  const cycleBars = Array.from({ length: 28 }, (_, index) => {
    const center = 14;
    const distance = Math.abs(index - center);
    return Math.max(18, 92 - distance * 7 - (index % 3) * 4);
  });

  const baby = week != null ? babySize(week) : null;
  const trimester = week != null ? (week < 13 ? "First" : week < 28 ? "Second" : "Third") : null;
  const nextPhaseWeek = week != null && week < 28 ? 28 : 40;
  const activeMedicines = medications.filter((medicine) =>
    String(medicine.status || "").toLowerCase() === "active");

  const plans = isPregnancy
    ? [
        { time: "Morning", label: "Nutrition for two", text: "Your body needs extra iron and folate. Try spinach, lentils, or dates.", icon: Utensils },
        { time: "Afternoon", label: "A gentle walk or prenatal yoga", text: "Energy is usually steadier in the second trimester.", link: "See prenatal plan", icon: Wind },
        { time: "Evening", label: "Sip throughout the day", text: "Keep a water bottle within reach and wind down early.", icon: Moon },
        { time: "Night", label: "Sleep on your side", text: "A pillow between your knees takes pressure off your hips.", icon: Moon },
      ]
    : [
        { time: "10 AM", label: "Presentations and hard conversations", text: "Your verbal skills and confidence are peaking.", icon: Sparkles },
        { time: "1 PM", label: "Add protein to lunch", text: "Support your body with protein, fiber, tryptophan, or eggs.", icon: Utensils },
        { time: "6 PM", label: "Push harder in your workout", text: "Estrogen may help recovery; use how you feel as the guide.", icon: Activity },
        { time: "10 PM", label: "Keep it cool and dark", text: "Basal temperature is rising slightly.", icon: Moon },
      ];

  const accent = isPregnancy ? "#FFA7B6" : "#FFB534";
  const todayLabel = isPregnancy
    ? `WEEK ${week ?? "—"} · ${trimester ? `${trimester.toUpperCase()} TRIMESTER` : "PREGNANCY"}`
    : "DAY 14 · OVULATION";

  const firstRowDots = Array.from({ length: 20 }, (_, i) => i + 1);
  const secondRowDots = Array.from({ length: 20 }, (_, i) => i + 21);

  const heights = [18,16,16,20,24,28,32,36,40,44,50,56,62,70,64,54,46,44,42,40,38,34,30,26,22,20,18,16];
  const todayIndex = 13;

  return (
    <div
      className="pb-32 md:pb-10"
      style={{ "--accent": accent, background: "var(--paper)", color: "var(--ink)" } as React.CSSProperties}
      data-mode={isPregnancy ? "pregnancy" : "cycle"}
    >
      {isPregnancy && (
        <div className="mb-6 flex min-h-[52px] items-center justify-between rounded-[20px] border border-[var(--line)] bg-[var(--surface)] px-5 text-[13px]">
          <span>Cycle predictions are paused while you're pregnant.</span>
          <button type="button" onClick={onOpenCare} className="min-h-[44px] font-bold underline underline-offset-[4px]">
            Update pregnancy status
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex min-w-0 flex-1 basis-[640px] flex-col gap-4 overflow-hidden rounded-[40px] px-5 pb-8 pt-6 md:px-12 md:pb-12 md:pt-12"
          style={{ background: accent }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]">Good morning</p>
              <p className="mt-1 text-[12px] font-semibold">{firstName} · {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "long" })}</p>
            </div>
            <span
              className="inline-flex h-8 items-center rounded-full px-[14px] text-[12px] font-extrabold tracking-[0.1em]"
              style={{ background: "var(--ink)", color: accent }}
            >
              {todayLabel}
            </span>
          </div>

          <h1 className="m-0 max-w-[680px] text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[84px]">
            {isPregnancy ? <>Your baby can <em className="font-medium">hear</em> you now.</> : <>Your words land <em className="font-medium">harder</em> today.</>}
          </h1>

          {isPregnancy ? (
            <div className="mt-auto">
              <div className="flex flex-col gap-2">
                {[firstRowDots, secondRowDots].map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center justify-between gap-[2px]">
                    {row.map((dotWeek) => {
                      const done = week != null && dotWeek < week;
                      const current = week != null && dotWeek === week;
                      return (
                        <span
                          key={dotWeek}
                          className="relative h-[11px] w-[11px] shrink-0 rounded-full"
                          style={{
                            background: current ? "transparent" : done ? "var(--ink)" : "rgba(42,18,32,0.2)",
                            border: current ? "3px solid var(--ink)" : "0",
                            boxSizing: "border-box",
                          }}
                          aria-label={current ? `Current week ${dotWeek}` : `Week ${dotWeek}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between text-[12px] font-bold">
                <span>Week 1</span>
                <span>{week != null ? `Today: week ${week}` : "Today"}</span>
                <span>Week 40</span>
              </div>
            </div>
          ) : (
            <svg
              viewBox="0 0 350 100"
              role="img"
              aria-label="Energy across your 28-day cycle. Today, day 14, is the peak."
              className="mt-auto h-[100px] w-full"
            >
              {heights.map((height, index) => {
                const width = 9;
                const x = index * 12.5 + 2;
                const y = 92 - height;
                const isToday = index === todayIndex;
                const past = index < todayIndex;
                const future = index > todayIndex;
                return (
                  <g key={index}>
                    {isToday && <text x={x + width / 2} y={y - 10} textAnchor="middle" fill="var(--ink)" fontSize="11" fontWeight="800">TODAY</text>}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx="4.5"
                      fill={isToday ? "var(--ink)" : past ? "rgba(34,18,43,0.38)" : "rgba(34,18,43,0.16)"}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          <div className="mt-2 flex items-end justify-between gap-4">
            <button type="button" onClick={onBook} className="h-[52px] rounded-full bg-[var(--ink)] px-6 text-[16px] font-bold text-[var(--paper)]">
              {isPregnancy ? "View this week" : "View insights"}
            </button>
            {isPregnancy && dueDate ? (
              <div className="text-right">
                <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.12em]">Due date</p>
                <p className="m-0 mt-1 text-[15px] font-bold">{dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            ) : (
              <div className="text-right">
                <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.12em]">Peak window</p>
                <p className="m-0 mt-1 text-[15px] font-bold">Today</p>
              </div>
            )}
          </div>
        </motion.section>

        <aside className="flex min-w-0 basis-[340px] flex-col gap-5 md:max-w-[420px]">
          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6">
            <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]">{isPregnancy ? "How are you feeling?" : "How are you feeling?"}</p>
            <p className="mt-2 text-[15px] text-[var(--body-soft)]">One tap keeps your guidance current.</p>
            <div className="mt-4 flex flex-wrap gap-[10px]">
              {(isPregnancy
                ? ["Energy good", "Kicks felt", "Nausea", "Swelling", "Backache"]
                : ["Glowing", "Good", "Okay", "Low", "Rough"]
              ).map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  className="h-[46px] rounded-full border-[1.5px] border-[var(--ink)] px-[18px] text-[15px] font-semibold"
                  style={{ background: checkIn.includes(symptom) ? accent : "var(--surface)" }}
                  aria-pressed={checkIn.includes(symptom)}
                >
                  {symptom}
                </button>
              ))}
            </div>
            <button type="button" onClick={saveCheckIn} className="mt-4 h-[52px] rounded-full border-2 border-[var(--ink)] bg-transparent px-6 text-[15px] font-bold">
              {checkInSaved ? "Saved today" : "Save check-in"}
            </button>
          </section>

          {isPregnancy ? (
            <>
              <section className="rounded-[28px] bg-[var(--sun,#FFE7A8)] p-6">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#7A4B00" }}>Baby this week</p>
                <p className="mt-3 font-serif text-[28px] font-bold">{baby?.title || "Baby growth"}</p>
                <p className="mt-2 text-[15px] leading-[1.5]" style={{ color: "#4A3320" }}>{baby?.detail}</p>
              </section>
              {week != null && week >= 24 && (
                <section className="rounded-[28px] bg-[var(--ink)] p-6 text-[var(--paper)]">
                  <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: accent }}>Coming up</p>
                  <p className="mt-3 font-serif text-[28px] font-bold">
                    {week >= 28 ? "Third trimester is underway." : `${nextPhaseWeek - week} weeks until third trimester.`}
                  </p>
                  <p className="mt-2 text-[15px] leading-[1.5] text-[var(--on-dark-soft)]">
                    Ask your care team about growth, glucose and routine antenatal checks.
                  </p>
                </section>
              )}
            </>
          ) : (
            <>
              <section className="rounded-[28px] bg-[var(--ink)] p-6 text-[var(--paper)]">
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: accent }}>Coming up</p>
                <p className="mt-3 font-serif text-[28px] font-bold">Luteal phase starts Monday.</p>
                <p className="mt-2 text-[15px] leading-[1.5] text-[var(--on-dark-soft)]">Energy eases and cravings can rise. Adjust your plan as needed.</p>
              </section>
              <section className="rounded-[28px] bg-[#FFE7A8] p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-[80px] w-[80px] shrink-0 flex-col justify-center rounded-[12px] bg-[var(--accent-today)] p-3 text-[var(--ink)]">
                    <span className="font-serif text-[42px] font-bold leading-none">14</span>
                    <span className="mt-1 text-[11px] font-extrabold uppercase">Era</span>
                  </div>
                  <div>
                    <p className="m-0 font-serif text-[22px] font-bold">Post your era</p>
                    <p className="mt-2 text-[15px]">Share today's cycle card.</p>
                    <button type="button" onClick={shareEra} className="mt-3 h-[44px] rounded-full bg-[var(--ink)] px-5 text-[15px] font-bold text-[var(--paper)]">Share today</button>
                  </div>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 font-serif text-[38px] font-bold">Today&apos;s plan</h2>
          <p className="m-0 hidden text-[14px] text-[var(--muted)] sm:block">
            {isPregnancy ? `Gentle, built around week ${week ?? "—"}.` : "Built around today's cycle phase."}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const category =
              plan.time === "Morning" ? { dot: "#FF6A4D", label: "FOOD" }
                : plan.time === "10 AM" ? { dot: "#5B3DF5", label: "FOCUS" }
                : plan.time === "Afternoon" ? { dot: "#12B5A2", label: "MOVE" }
                : plan.time === "1 PM" ? { dot: "#FF6A4D", label: "FOOD" }
                  : plan.time === "Evening" ? { dot: "#5B3DF5", label: "WATER" }
                  : plan.time === "6 PM" ? { dot: "#12B5A2", label: "MOVE" }
                    : { dot: "#2E3A8C", label: "SLEEP" };
            return (
              <div key={plan.time} className="min-w-0">
                <div className="mb-2 flex items-center gap-3">
                  <span className="w-[68px] text-right text-[14px] font-extrabold">{plan.time}</span>
                  <span className="h-[14px] w-[14px] rounded-full" style={{ background: category.dot }} />
                </div>
                <article className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-5">
                  <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: category.dot }}>{category.label}</p>
                  <h3 className="mt-2 font-serif text-[22px] font-bold leading-[1.2]">{plan.label}</h3>
                  <p className="mt-2 text-[15px] leading-[1.5] text-[var(--body-soft)]">{plan.text}</p>
                  {plan.link && (
                    <button type="button" onClick={onOpenCare} className="mt-3 min-h-[44px] text-[15px] font-bold underline underline-offset-[4px]">
                      {plan.link}
                    </button>
                  )}
                </article>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex min-h-[112px] items-center gap-4 rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CFF1EA]"><CalendarPlus className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="m-0 font-serif text-[22px] font-bold">Book an appointment</p>
            <p className="mt-1 text-[14px] text-[var(--body-soft)]">
              {upcoming?.date
                ? `Next: ${new Date(upcoming.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}${upcoming.time ? ` at ${upcoming.time}` : ""}`
                : "Gynecologist, nutritionist or lab test"}
            </p>
          </div>
          <button type="button" onClick={onBook} className="h-[52px] rounded-full border-2 border-[var(--ink)] bg-transparent px-6 text-[15px] font-bold">Book</button>
        </section>
        <section className="flex min-h-[112px] items-center gap-4 rounded-[28px] border border-[var(--ink)] bg-[var(--surface)] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E4DCFF]"><Sparkles className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="m-0 font-serif text-[22px] font-bold">Ask about your body</p>
            <p className="mt-1 text-[14px] text-[var(--body-soft)]">Get plain-language, phase-aware guidance.</p>
          </div>
          <ChevronRight className="h-5 w-5" />
        </section>
      </div>
    </div>
  );
}
