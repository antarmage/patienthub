import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import { patientGreetingName } from "@/lib/patientGreeting";
import { localDateKey, patientHealthRecordProgress } from "@/lib/patientHealthRecord";
import { shouldShowPregnancyCheckin } from "@/lib/patientPregnancyUpdate";
import { getWeekData } from "@/components/WeekByWeekTimeline";

interface Props {
  mode: string;
  patient: any;
  pregnancyEpisode: any;
  appointments: any[];
  medications: any[];
  labResults: any[];
  medicationReminderDue: boolean;
  onBook: () => void;
  onOpenCare: () => void;
  onOpenRecord: () => void;
  onOpenMedicationReminder: () => void;
  onOpenStageSwitcher: () => void;
  onUpdatePregnancy: () => void;
  showPregnancyLossSupport: boolean;
  onDismissPregnancyLossSupport: () => void;
  postpartumWeek: number | null;
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
  labResults,
  medicationReminderDue,
  onBook,
  onOpenCare,
  onOpenRecord,
  onOpenMedicationReminder,
  onOpenStageSwitcher,
  onUpdatePregnancy,
  showPregnancyLossSupport,
  onDismissPregnancyLossSupport,
  postpartumWeek,
}: Props) {
  const isPregnancy = mode === "pregnancy";
  const isPostpartum = mode === "postpartum";
  const isMenopause = mode === "menopause";
  const isCycleMode = !isPregnancy && !isPostpartum && !isMenopause;
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

  const patientFullName = patient?.name
    || [patient?.firstName, patient?.lastName].filter((part: unknown) => typeof part === "string" && part.trim()).join(" ");
  const firstName = patientGreetingName(patientFullName) || "there";
  const [checkIn, setCheckIn] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("patientDailyCheckIn") || "{}");
      return Array.isArray(stored?.symptoms) ? stored.symptoms : [];
    } catch {
      return [];
    }
  });
  const [checkInSaved, setCheckInSaved] = useState(false);
  const [showPregnancyCheckin, setShowPregnancyCheckin] = useState(false);
  const [checkInStreak, setCheckInStreak] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("patientDailyCheckIn") || "{}");
      return typeof stored?.streak === "number" ? stored.streak : 0;
    } catch {
      return 0;
    }
  });
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!isPregnancy || !patient?.id || !pregnancyEpisode?.id) {
      setShowPregnancyCheckin(false);
      return;
    }
    const dismissalKey = `saiviePregnancyCheckinDismissed:${patient.id}:${pregnancyEpisode.id}`;
    try {
      if (sessionStorage.getItem(dismissalKey)) {
        setShowPregnancyCheckin(false);
        return;
      }
    } catch (error) {
      console.warn("Could not read pregnancy check-in dismissal", error);
    }
    let lastLoggedDate: string | null = null;
    try {
      const log = JSON.parse(localStorage.getItem("patientDailyCheckIn") || "null");
      if (typeof log?.date === "string") lastLoggedDate = log.date;
    } catch (error) {
      console.warn("Could not read the last patient check-in date", error);
    }
    const episodeDueDate = typeof pregnancyEpisode.details?.dueDate === "string"
      ? pregnancyEpisode.details.dueDate
      : dueDate ? localDateKey(dueDate) : null;
    setShowPregnancyCheckin(shouldShowPregnancyCheckin(episodeDueDate, lastLoggedDate));
  }, [isPregnancy, patient?.id, pregnancyEpisode?.id, pregnancyEpisode?.details?.dueDate, dueDate, checkInSaved]);

  const dismissPregnancyCheckin = () => {
    if (patient?.id && pregnancyEpisode?.id) {
      try {
        sessionStorage.setItem(`saiviePregnancyCheckinDismissed:${patient.id}:${pregnancyEpisode.id}`, "true");
      } catch (error) {
        console.warn("Could not save pregnancy check-in dismissal", error);
      }
    }
    setShowPregnancyCheckin(false);
  };

  const toggleSymptom = (symptom: string) => {
    setCheckIn((current) => {
      const next = current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom];
      const nextStreak = checkInSaved ? checkInStreak : checkInStreak + 1;
      localStorage.setItem("patientDailyCheckIn", JSON.stringify({
        date: localDateKey(new Date()),
        symptoms: next,
        streak: nextStreak,
      }));
      setCheckInStreak(nextStreak);
      setCheckInSaved(true);
      return next;
    });
  };

  const saveCheckIn = () => {
    const nextStreak = checkInSaved ? checkInStreak : checkInStreak + 1;
    localStorage.setItem("patientDailyCheckIn", JSON.stringify({
      date: localDateKey(new Date()),
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
  const weeksUntilThirdTrimester = week != null ? Math.max(0, 28 - week) : null;
  const shouldShowThirdTrimesterCard = isPregnancy && week != null;
  const activeMedicines = medications.filter((medicine) =>
    String(medicine.status || "").toLowerCase() === "active");
  const recordProgress = patientHealthRecordProgress(patient, medications, labResults);
  const [contentFeed, setContentFeed] = useState<Array<{
    id: string;
    title: string;
    body: string;
    category: string;
    priority: string;
    sourceLabel: string;
    assetVersion: string;
  }>>([]);

  useEffect(() => {
    if (!isPregnancy || !patient?.id) return;
    let cancelled = false;
    fetch(`/api/patients/${patient.id}/content-feed`)
      .then((response) => response.ok ? response.json() : null)
      .then((feed) => {
        if (!cancelled && Array.isArray(feed?.blocks)) setContentFeed(feed.blocks.slice(0, 3));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isPregnancy, patient?.id]);

  const plans = isPregnancy
    ? [
        { time: "Morning", label: "Nutrition for two", text: "Your body needs extra iron and folate. Try spinach, lentils, or dates.", icon: Utensils },
        { time: "Afternoon", label: "A gentle walk or prenatal yoga", text: "Energy is usually steadier in the second trimester.", link: "See prenatal plan", icon: Wind },
        { time: "Evening", label: "Sip throughout the day", text: "Keep a water bottle within reach and wind down early.", icon: Moon },
        { time: "Night", label: "Sleep on your side", text: "A pillow between your knees takes pressure off your hips.", icon: Moon },
      ]
    : isPostpartum
    ? [
        { time: "Morning", label: "Start with what feels manageable", text: "There is no single right pace for recovery.", icon: Heart },
        { time: "Afternoon", label: "Accept a helping hand", text: "Make room for rest and the support that works for you.", icon: Wind },
        { time: "Evening", label: "Check in with yourself", text: "Note anything you would like to discuss with your care team.", icon: Activity },
        { time: "Night", label: "Keep care within reach", text: "Your own follow-up and wellbeing matter, too.", icon: Moon },
      ]
    : isMenopause
    ? [
        { time: "Morning", label: "Notice how you feel", text: "A simple note can help you spot patterns over time.", icon: Sparkles },
        { time: "Afternoon", label: "Make space for a pause", text: "Choose a small reset that feels comfortable today.", icon: Wind },
        { time: "Evening", label: "Support your routine", text: "Keep track of changes you may want to mention at a visit.", icon: Activity },
        { time: "Night", label: "Settle in your own way", text: "Comfort and sleep needs can vary from day to day.", icon: Moon },
      ]
    : [
        { time: "10 AM", label: "Presentations and hard conversations", text: "Your verbal skills and confidence are peaking.", icon: Sparkles },
        { time: "1 PM", label: "Add protein to lunch", text: "Support your body with protein, fiber, tryptophan, or eggs.", icon: Utensils },
        { time: "6 PM", label: "Push harder in your workout", text: "Estrogen may help recovery; use how you feel as the guide.", icon: Activity },
        { time: "10 PM", label: "Keep it cool and dark", text: "Basal temperature is rising slightly.", icon: Moon },
      ];

  const accent = isPregnancy ? "#FFA7B6" : isPostpartum ? "#C9E889" : isMenopause ? "#7ED3E1" : "#FFB534";
  const todayLabel = isPregnancy
    ? `WEEK ${week ?? "—"} · ${trimester ? `${trimester.toUpperCase()} TRIMESTER` : "PREGNANCY"}`
    : isPostpartum
    ? postpartumWeek ? `POSTPARTUM · WEEK ${postpartumWeek}` : "POSTPARTUM · YOUR RECOVERY"
    : isMenopause
    ? "PERIMENOPAUSE · YOUR PATTERNS"
    : "DAY 14 · OVULATION";

  const firstRowDots = Array.from({ length: 20 }, (_, i) => i + 1);
  const secondRowDots = Array.from({ length: 20 }, (_, i) => i + 21);

  const heights = [18,16,16,20,24,28,32,36,40,44,50,56,62,70,64,54,46,44,42,40,38,34,30,26,22,20,18,16];
  const todayIndex = 13;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeOut" }}
      className="pb-32 md:pb-10"
      style={{ "--accent": accent, background: "var(--paper)", color: "var(--ink)" } as React.CSSProperties}
      data-mode={mode}
    >
      {pregnancyEpisode?.details?.status === "current" && (
        <div className="mb-6 hidden min-h-[52px] items-center justify-between gap-4 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] px-5 py-2 text-[13px] md:flex">
          <span>Cycle predictions are paused while you're pregnant.</span>
          {isPregnancy && (
            <button type="button" onClick={onUpdatePregnancy} className="min-h-11 shrink-0 text-xs font-semibold text-[var(--body-soft)] underline underline-offset-4 hover:text-[var(--ink)]">
              Update my pregnancy
            </button>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 md:hidden">
        <button
          type="button"
          onClick={onOpenStageSwitcher}
          className="min-h-11 rounded-full border border-[var(--line)] bg-white/80 px-4 text-xs font-bold text-[var(--ink)]"
        >Switch stage</button>
        {isPregnancy && (
          <button type="button" onClick={onUpdatePregnancy} className="min-h-11 text-xs font-semibold text-[var(--body-soft)] underline underline-offset-4 hover:text-[var(--ink)]">
            Update my pregnancy
          </button>
        )}
      </div>

      {showPregnancyCheckin && (
        <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#E8D8C8] bg-white/90 p-5 text-[#35212f]" role="status" aria-label="Pregnancy check-in">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#775B63]">A gentle check-in</p>
            <h2 className="mt-1 font-serif text-xl font-semibold">Checking in on your pregnancy. Has anything changed?</h2>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={dismissPregnancyCheckin} className="min-h-11 px-3 text-sm text-[#6A5963] underline underline-offset-4">Not now</button>
            <button type="button" onClick={onUpdatePregnancy} className="min-h-11 rounded-full bg-[#35212f] px-5 text-sm font-bold text-white">Update</button>
          </div>
        </section>
      )}

      {showPregnancyLossSupport && (
        <section className="mb-5 rounded-[24px] border border-[#E8D8C8] bg-white/90 p-5 text-[#35212f]" aria-label="Support options">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#775B63]">Your care, at your pace</p>
          <h2 className="mt-1 font-serif text-xl font-semibold">Pregnancy reminders are paused.</h2>
          <p className="mt-1 text-sm text-[#6A5963]">Your history stays in your health record. Speak with your care team or review your records whenever you want.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={onBook} className="min-h-11 text-sm font-bold underline underline-offset-4">Talk with my care team</button>
            <button type="button" onClick={onOpenRecord} className="min-h-11 text-sm font-bold underline underline-offset-4">View health record</button>
            <button type="button" onClick={onDismissPregnancyLossSupport} className="min-h-11 text-sm text-[#6A5963]">Dismiss</button>
          </div>
        </section>
      )}
      {medicationReminderDue && (
        <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#F2C2AE] bg-[#FFF0E8] p-5 text-[#2A1220]" aria-label="Medicine reminder">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#A8341A]">A gentle reminder</p>
            <h2 className="mt-1 font-serif text-xl font-bold">Review your medicines</h2>
            <p className="mt-1 text-sm">Check that your current medicine list is up to date.</p>
          </div>
          <button type="button" onClick={onOpenMedicationReminder} className="min-h-11 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">
            Go to Medications
          </button>
        </section>
      )}

      <button type="button" onClick={onOpenRecord} className="mb-6 flex w-full items-center gap-4 rounded-[24px] border border-[var(--line)] bg-white/85 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl font-bold">Complete your profile</h2>
            <span className="text-sm font-extrabold">{recordProgress.progress}%</span>
          </div>
          <p className="mt-1 text-sm text-[var(--body-soft)]">
            {recordProgress.missingItems.length
              ? `${recordProgress.missingItems.length} ${recordProgress.missingItems.length === 1 ? "item" : "items"} still to add to your health record.`
              : "Your health record is up to date."}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F0CFC4]" role="progressbar" aria-label="Health record progress" aria-valuenow={recordProgress.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#2A1220]" style={{ width: `${recordProgress.progress}%` }} />
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-[#2A1220] px-4 py-2 text-xs font-bold text-white">
          {recordProgress.missingItems.length ? "Continue" : "View record"}
        </span>
      </button>

      <div className="flex flex-wrap gap-6">
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.22 } }}
          className="relative flex min-w-0 flex-1 basis-[640px] flex-col gap-[22px] overflow-hidden rounded-b-[40px] px-5 pb-7 pt-6 md:rounded-[40px] md:gap-4 md:px-12 md:pb-12 md:pt-12"
          style={{ background: accent }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="m-0 text-[17px] font-extrabold">Good morning, {firstName}</p>
              <p className="mt-1 text-[13px] font-medium">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" })}</p>
            </div>
            {isPregnancy && dueDate ? (
              <span className="inline-flex h-[36px] items-center rounded-full px-4 text-[13px] font-bold md:h-[38px] md:text-[14px]" style={{ background: "var(--ink)", color: "var(--paper)" }}>
                Due {dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            ) : (
              <span className="inline-flex h-[36px] items-center rounded-full px-4 text-[13px] font-bold md:h-[38px] md:text-[14px]" style={{ background: "var(--ink)", color: accent }}>
                {isPostpartum || isMenopause ? "Your pace" : "7-day streak"}
              </span>
            )}
          </div>

          <span
            className="inline-flex h-8 items-center self-start rounded-full px-[14px] text-[12px] font-extrabold tracking-[0.1em]"
            style={{ background: "var(--ink)", color: accent }}
          >
            {todayLabel}
          </span>

          <h1 className="m-0 max-w-[680px] text-[56px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[84px]">
            {isPregnancy
              ? <>Your baby can <em className="font-medium">hear</em> you now.</>
              : isPostpartum
              ? <>Your recovery, at <em className="font-medium">your pace</em>.</>
              : isMenopause
              ? <>Make space for how <em className="font-medium">you feel</em>.</>
              : <>Your words land <em className="font-medium">harder</em> today.</>}
          </h1>

          <p className="m-0 text-[17px] font-medium leading-[1.4] md:text-[20px]">
            {isPregnancy
              ? `About the size of ${baby?.title?.toLowerCase() || "your baby"}. ${week != null ? `${40 - week} weeks to go.` : "Pregnancy guidance."}`
              : isPostpartum
              ? "Your wellbeing matters as you adjust to life with a new baby."
              : isMenopause
              ? "Notice changes over time and bring questions to your care team."
              : "Peak fertility window. Energy levels are high."}
          </p>

          {isPregnancy ? (
            <div className="mt-auto">
              <svg viewBox="0 0 358 64" role="img" aria-label={week != null ? `Pregnancy week ${week} of 40` : "Pregnancy week not available"} className="block h-auto w-full">
                {Array.from({ length: 40 }, (_, index) => {
                  const dotWeek = index + 1;
                  const cx = 12.5 + (index % 20) * 17.5;
                  const cy = index < 20 ? 14 : 46;
                  return dotWeek === week ? (
                    <g key={dotWeek}>
                      <circle cx={cx} cy={cy} r="11" fill="#FFF4EE" stroke="var(--ink)" strokeWidth="3" />
                      <circle cx={cx} cy={cy} r="4.5" fill="var(--ink)" />
                    </g>
                  ) : (
                    <circle key={dotWeek} cx={cx} cy={cy} r="6" fill={week != null && dotWeek < week ? "var(--ink)" : "rgba(42,18,32,0.2)"} />
                  );
                })}
              </svg>
              <div className="mt-2 flex justify-between text-[13px] font-semibold">
                <span>Week 1</span>
                <span>{week != null ? `Today is week ${week}` : "Week not available"}</span>
                <span>Week 40</span>
              </div>
            </div>
          ) : isCycleMode ? (
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
          ) : (
            <div className="mt-auto rounded-[24px] bg-white/45 p-5">
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.12em]">
                {isPostpartum ? "A gentle check-in" : "Patterns take time"}
              </p>
              <p className="mb-0 mt-2 text-sm leading-relaxed">
                {isPostpartum
                  ? "There is no timeline you need to follow here. Use your check-in to note what support would help today."
                  : "Your experience is personal. A few notes over time can help you prepare for a conversation with your clinician."}
              </p>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-[10px]">
            <motion.button type="button" onClick={onBook} whileHover={reducedMotion ? undefined : { y: -2, scale: 1.015 }} whileTap={reducedMotion ? undefined : { scale: 0.97 }} transition={{ duration: 0.16 }} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-6 text-[16px] font-bold text-[var(--paper)] md:flex-none">
              {isPregnancy ? "This week" : "View insights"}
              {isPregnancy && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
            </motion.button>
            <motion.button type="button" onClick={shareEra} whileTap={reducedMotion ? undefined : { scale: 0.97 }} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full border-2 border-[var(--ink)] bg-transparent px-5 text-[16px] font-bold md:flex-none">
              {isPregnancy && <Share2 className="h-4 w-4" aria-hidden="true" />}
              {isPregnancy ? "Share bump" : "Share today"}
            </motion.button>
          </div>
        </motion.section>

        <aside className="flex min-w-0 basis-[340px] flex-col gap-9 px-5 pb-5 pt-8 md:max-w-[420px] md:gap-5 md:px-0 md:pb-0 md:pt-0">
          <motion.section
            initial={reducedMotion ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.16 }}
            whileHover={reducedMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
            className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 md:p-4"
          >
            <p className="m-0 font-serif text-[26px] font-bold tracking-[0em]">
              {isPregnancy || isPostpartum || isMenopause ? "What are you noticing?" : "How are you feeling?"}
            </p>
            <p className="mt-1 text-[15px] text-[var(--body-soft)]">
              {isPregnancy || isPostpartum || isMenopause
                ? "A simple note can help you remember what to discuss with your care team."
                : "One tap keeps your predictions sharp."}
            </p>
            <div className="mt-3 flex flex-wrap gap-[8px] md:gap-[6px]">
              {(isPregnancy
                ? ["Energy good", "Kicks felt", "Nausea", "Swelling", "Backache"]
                : isPostpartum
                ? ["Recovery", "Rest", "Mood", "Feeding", "Support"]
                : isMenopause
                ? ["Hot flashes", "Sleep", "Mood", "Energy", "Other"]
                : ["Glowing", "Good", "Okay", "Low", "Rough"]
              ).map((symptom) => (
                <motion.button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                  whileHover={reducedMotion ? undefined : { y: -1 }}
                  transition={{ duration: 0.14 }}
                  className="h-[46px] rounded-full border-[1.5px] border-[var(--ink)] px-[18px] text-[15px] font-semibold md:h-[40px] md:px-[12px] md:text-[13px]"
                  style={{ background: checkIn.includes(symptom) ? accent : "var(--surface)" }}
                  aria-pressed={checkIn.includes(symptom)}
                >
                  {symptom}
                </motion.button>
              ))}
            </div>
          </motion.section>

          {isPregnancy ? (
            <>
              <motion.section
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.24 }}
                whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
                className="rounded-[28px] bg-[var(--sun,#FFE7A8)] p-7"
              >
                <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#7A4B00" }}>Baby this week</p>
                <p className="mt-3 font-serif text-[30px] font-bold leading-[1.1]">
                  {week != null ? `Size of ${getWeekData(week).fruit.toLowerCase()}` : "Baby growth"}
                </p>
                <p className="mt-2 text-[15px] leading-[1.5]" style={{ color: "#4A3320" }}>
                  {week != null
                    ? getWeekData(week).development[0] + "."
                    : "Baby is growing and developing this week."}
                </p>
              </motion.section>
              {shouldShowThirdTrimesterCard && (
                <motion.section
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.28 }}
                  whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
                  className="hidden rounded-[28px] bg-[var(--ink)] p-5 text-[var(--paper)] md:block"
                >
                  <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: accent }}>
                    {                    week != null && week > 28
                      ? "Now"
                      : week === 28
                        ? "Coming up · This week"
                        : `Coming up · In ${weeksUntilThirdTrimester} weeks`}
                  </p>
                  <p className="mt-3 font-serif text-[28px] font-bold leading-[1.05]">
                    {week >= 28 ? "Third trimester begins now" : "Third trimester begins at week 28"}
                  </p>
                  <p className="mt-2 text-[15px] leading-[1.5] text-[var(--on-dark-soft)]">
                    We&apos;ll update your plan and checklist when you get there.
                  </p>
                </motion.section>
              )}
            </>
          ) : isCycleMode ? (
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
          ) : (
            <section className="rounded-[28px] bg-[var(--ink)] p-6 text-[var(--paper)]">
              <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: accent }}>
                {isPostpartum ? "Your wellbeing matters" : "Your experience is individual"}
              </p>
              <p className="mt-3 font-serif text-[28px] font-bold">
                {isPostpartum ? "Care for you, too." : "Keep track, if it helps."}
              </p>
              <p className="mt-2 text-[15px] leading-[1.5] text-[var(--on-dark-soft)]">
                {isPostpartum
                  ? "Use your health record to keep visits, medicines and notes together."
                  : "Your notes can help you see changes and prepare questions for your next visit."}
              </p>
              <button type="button" onClick={onOpenRecord} className="mt-4 min-h-11 rounded-full bg-[var(--paper)] px-5 text-sm font-bold text-[var(--ink)]">
                Open health record
              </button>
            </section>
          )}
        </aside>
      </div>

      <section className="mt-8 px-5 md:px-0">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 font-serif text-[26px] font-bold tracking-[0em] md:text-[38px] md:tracking-[-0.02em]">Today&apos;s plan</h2>
          <p className="m-0 text-[15px] text-[var(--muted)] md:text-[16px]">
            {isPregnancy
              ? `Gentle, built around week ${week ?? "—"}.`
              : isPostpartum || isMenopause
              ? "Ideas to adapt to what feels right for you."
              : "Built around today's cycle phase."}
          </p>
        </div>
        <div className="flex flex-col md:flex-row md:flex-wrap md:gap-5">
          {plans.map((plan, index) => {
            const category =
              plan.time === "Morning" ? { dot: "#FF6A4D", label: "FOOD" }
                : plan.time === "10 AM" ? { dot: "#5B3DF5", label: "FOCUS" }
                : plan.time === "Afternoon" ? { dot: "#12B5A2", label: "MOVE" }
                : plan.time === "1 PM" ? { dot: "#FF6A4D", label: "FOOD" }
                  : plan.time === "Evening" ? { dot: "#5B3DF5", label: "WATER" }
                  : plan.time === "6 PM" ? { dot: "#12B5A2", label: "MOVE" }
                    : { dot: "#2E3A8C", label: "SLEEP" };
            return (
              <motion.div
                key={plan.time}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.38, delay: reducedMotion ? 0 : 0.12 + index * 0.07 }}
                whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.18 } }}
                className="relative min-w-0 md:flex md:min-w-0 md:flex-1 md:basis-[240px] md:flex-col md:gap-[14px]"
              >
                <div className="hidden md:flex md:h-full md:flex-col md:gap-[14px]">
                  <div className="flex items-center gap-[10px]">
                    <span className="h-[14px] w-[14px] shrink-0 rounded-full" style={{ background: category.dot }} />
                    <span className="text-[16px] font-extrabold">{plan.time}</span>
                    {plan.time !== plans[plans.length - 1]?.time && (
                      <span aria-hidden="true" className="h-[2px] flex-1 bg-[#F0CFC4]" />
                    )}
                  </div>
                  <article className="flex flex-1 flex-col gap-[8px] rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-[22px]">
                    <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: category.dot }}>{category.label}</p>
                    <h3 className="m-0 font-serif text-[22px] font-bold leading-[1.2]">{plan.label}</h3>
                    <p className="m-0 text-[15px] leading-[1.5] text-[var(--body-soft)]">{plan.text}</p>
                    {plan.link && <button type="button" onClick={onOpenCare} className="mt-auto min-h-[44px] self-start border-0 bg-transparent p-0 text-[15px] font-bold underline underline-offset-[4px]">{plan.link}</button>}
                  </article>
                </div>
                <div className="flex gap-3 md:hidden">
                  <p className="mt-[14px] w-[68px] shrink-0 text-right text-[14px] font-extrabold">{plan.time}</p>
                  <div className="flex w-[14px] shrink-0 flex-col items-center pt-[17px]">
                    <span className="h-[14px] w-[14px] shrink-0 rounded-full" style={{ background: category.dot }} />
                    {plan.time !== plans[plans.length - 1]?.time && (
                      <span aria-hidden="true" className="h-full min-h-[120px] w-[2px] flex-1 bg-[#F0CFC4]" />
                    )}
                  </div>
                  <article className="mb-4 min-w-0 flex-1 flex-col gap-[6px] rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4">
                    <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: category.dot }}>{category.label}</p>
                    <h3 className="mt-[6px] font-serif text-[20px] font-bold leading-[1.2]">{plan.label}</h3>
                    <p className="mt-[6px] text-[15px] leading-[1.5] text-[var(--body-soft)]">{plan.text}</p>
                    {plan.link && <button type="button" onClick={onOpenCare} className="mt-0 min-h-[44px] self-start border-0 bg-transparent p-0 text-[15px] font-bold underline underline-offset-[4px]">{plan.link}</button>}
                  </article>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {isPregnancy && contentFeed.length > 0 && (
        <section className="mt-8 px-5 md:px-0" aria-label="For you today">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 font-serif text-[26px] font-bold tracking-[0em] md:text-[38px] md:tracking-[-0.02em]">
              For you today
            </h2>
            <p className="m-0 text-[15px] text-[var(--muted)]">Personalized from this pregnancy&apos;s context</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {contentFeed.map((block) => (
              <motion.article
                key={block.id}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#A8341A" }}>
                    {block.category}
                  </p>
                  {block.priority === "essential" && (
                    <span className="rounded-full bg-[#2A1220] px-3 py-1 text-[11px] font-bold text-[#FFF4E6]">For you</span>
                  )}
                </div>
                <h3 className="mt-3 font-serif text-[22px] font-bold leading-[1.15]">{block.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-[var(--body-soft)]">{block.body}</p>
                <p className="mt-4 text-[11px] font-medium text-[var(--muted)]">{block.sourceLabel}</p>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {shouldShowThirdTrimesterCard && week != null && week < 28 && (
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.45 }}
          className="mx-5 mt-8 rounded-[28px] bg-[var(--ink)] p-6 text-[var(--paper)] md:hidden"
        >
          <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
            {week === 28
              ? "Coming up · This week"
              : week > 28
                ? "Now"
                : `Coming up · In ${weeksUntilThirdTrimester} weeks`}
          </p>
          <h2 className="mt-3 font-serif text-[28px] font-bold leading-[1.1]">Third trimester begins at week 28</h2>
          <p className="mt-2 text-[15px] leading-[1.5] text-[var(--on-dark-soft)]">
            We&apos;ll update your plan and checklist when you get there.
          </p>
        </motion.section>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.18 }}
          whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
          className="flex min-h-[112px] items-center gap-4 rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6"
        >
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
        </motion.section>
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.24 }}
          whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
          className="flex min-h-[112px] items-center gap-4 rounded-[28px] border border-[var(--ink)] bg-[var(--surface)] p-6"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E4DCFF]"><Sparkles className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="m-0 font-serif text-[22px] font-bold">Ask about your body</p>
            <p className="mt-1 text-[14px] text-[var(--body-soft)]">Get plain-language, phase-aware guidance.</p>
          </div>
          <ChevronRight className="h-5 w-5" />
        </motion.section>
      </div>
    </motion.div>
  );
}
