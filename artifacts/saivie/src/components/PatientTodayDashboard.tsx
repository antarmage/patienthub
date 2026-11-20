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
  const [selectedTimelineValue, setSelectedTimelineValue] = useState<number | null>(null);

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

  return (
    <div className="space-y-6 pb-8">
      {isPregnancy && (
        <div className="flex items-center justify-between rounded-xl border border-saivie-border/60 bg-white/90 px-4 py-3 text-xs shadow-sm">
          <span className="text-saivie-plum">
            Cycle predictions are paused while you&apos;re pregnant.
          </span>
          <button type="button" onClick={onOpenCare} className="font-semibold text-saivie-plum underline decoration-saivie-border underline-offset-4">
            Update pregnancy status
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative min-h-[360px] overflow-hidden rounded-[28px] p-5 md:p-8 lg:min-h-[430px] ${isPregnancy ? "bg-[#f4aeb8]" : "bg-[#efb43c]"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className="border-0 bg-black/80 text-white text-[10px]">
                {isPregnancy ? `WEEK ${week ?? "—"} • ${trimester ? `${trimester.toUpperCase()} TRIMESTER` : "PREGNANCY"}` : "DAY 14 • OVULATION"}
              </Badge>
              <p className="mt-5 text-sm font-semibold text-black/75">
                {isPregnancy
                  ? firstName ? `Good morning, ${firstName}` : "Good morning"
                  : firstName ? `Good morning, ${firstName}` : "Good morning"}
                <span className="mt-1 block text-[10px] font-medium text-black/55">
                  {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" })}
                </span>
              </p>
            </div>
            <button onClick={shareEra} className="rounded-full border border-black/15 bg-white/25 p-2 text-black/70" aria-label="Share today">
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          <h2 className="mt-4 max-w-[680px] font-serif text-[42px] leading-[0.96] tracking-tight text-black md:text-[68px] lg:text-[84px]">
            {isPregnancy ? <>Your baby can <em>hear</em> you now.</> : <>Your words land <em>harder</em> today.</>}
          </h2>

          {isPregnancy ? (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: weekDotCount }, (_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 w-2.5 rounded-full ${
                      index + 1 === week ? "ring-2 ring-black ring-offset-2 ring-offset-[#f4aeb8]" :
                      index + 1 < (week ?? 0) ? "bg-black/75" :
                      "bg-white/55"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-between text-[10px] font-semibold text-black/65">
                <span>Week 1</span>
                <span>{week != null ? `Today: week ${week}` : "Today"}</span>
                <span>Week 40</span>
              </div>
            </div>
          ) : (
            <div className="mt-7 flex h-28 items-end gap-1.5">
              {cycleBars.map((height, index) => (
                <span
                  key={index}
                  className={`flex-1 rounded-t-sm ${index === 14 ? "bg-black" : "bg-black/40"}`}
                  style={{ height: `${height}%`, opacity: index < 7 || index > 21 ? 0.35 : 1 }}
                />
              ))}
              <div className="sr-only">Today is centered in the 28-day cycle energy curve.</div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <Button onClick={onBook} className="rounded-full bg-black px-5 text-white hover:bg-black/85">
              <CalendarPlus className="mr-2 h-4 w-4" />
              {isPregnancy ? "Book a prenatal visit" : "Plan a check-in"}
            </Button>
            {dueDate && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-black/55">Estimated due date</p>
                <p className="font-semibold">{dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            )}
          </div>
        </motion.section>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="border-saivie-border/60 bg-white/85 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {isPregnancy ? "How are you feeling?" : "Daily check-in"}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {checkInSaved ? "Saved for today" : "A quick self-check"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {checkInStreak > 0 && (
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      🔥 {checkInStreak} day{checkInStreak === 1 ? "" : "s"}
                    </Badge>
                  )}
                  {checkInSaved ? <Check className="h-5 w-5 text-emerald-600" /> : <Sparkles className="h-5 w-5 text-saivie-rose" />}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(isPregnancy
                  ? ["Energy good", "Kicks felt", "Nausea", "Swelling", "Backache"]
                  : ["Glowing", "Good", "Okay", "Low", "Rough"]
                ).map((symptom) => (
                  <button
                    key={symptom}
                    onClick={() => toggleSymptom(symptom)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      checkIn.includes(symptom)
                        ? "border-saivie-rose bg-saivie-blush text-saivie-plum"
                        : "border-saivie-border bg-white text-saivie-plum"
                    }`}
                  >
                    {symptom}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={saveCheckIn}>
                Save check-in
              </Button>
            </CardContent>
          </Card>

          {isPregnancy ? (
            <Card className="relative min-h-[180px] overflow-hidden border-0 bg-[#f7d98a] shadow-sm">
              <div
                className="absolute inset-0 opacity-20"
                style={{ backgroundImage: `url(${pregnancyGrowthBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
              <CardContent className="relative flex h-full items-center gap-4 p-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/75 text-5xl shadow-sm" aria-label={baby?.title}>
                  {baby?.emoji || "🌱"}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-black/55">Baby this week</p>
                  <p className="mt-1 font-serif text-2xl text-black">{baby?.title || "Baby growth"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-black/65">{baby?.detail}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-0 bg-[#35212f] text-white shadow-sm">
                <CardContent className="p-5">
                  <p className="text-[10px] uppercase tracking-widest text-white/60">Coming up</p>
                  <p className="mt-2 font-serif text-2xl">Luteal phase starts Monday</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/70">Energy eases and cravings can rise. Adjust your plan as needed.</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-[#f7d98a] shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-16 w-16 shrink-0 flex-col justify-between rounded-sm bg-[#efb43c] p-2 text-[#35212f] shadow">
                    <span className="font-serif text-2xl font-bold">14</span>
                    <span className="text-[7px] font-bold uppercase">Ovulation era</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Post your era</p>
                    <p className="mt-1 text-xs text-black/60">Share today&apos;s cycle card.</p>
                    <Button size="sm" className="mt-3 rounded-full bg-[#35212f] text-white" onClick={shareEra}>
                      Share today
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {isPregnancy && week != null && week >= 24 && (
        <Card className="border-0 bg-[#35212f] text-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-[10px] uppercase tracking-widest text-white/60">Coming up</p>
            <p className="mt-2 font-serif text-2xl">
              {week >= 28 ? "Your final trimester is underway." : `${nextPhaseWeek - week} weeks until the third trimester.`}
            </p>
            {week < 28 && <p className="mt-2 text-xs text-white/70">Ask your care team about upcoming growth, glucose, and routine antenatal checks.</p>}
          </CardContent>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{isPregnancy ? "Pregnancy timeline" : "Cycle timeline"}</h2>
          <Badge variant="outline" className="text-[10px]">
            {isPregnancy ? `Week ${week ?? "—"} now` : "28-day view"}
          </Badge>
        </div>
        <Card className="border-saivie-border/60 bg-white/90 shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-2 overflow-x-auto pb-2" aria-label={isPregnancy ? "Pregnancy week timeline" : "Cycle day timeline"}>
              {Array.from({ length: isPregnancy ? 40 : 28 }, (_, index) => index + 1).map((value) => {
                const isNow = isPregnancy ? value === week : value === 14;
                const isSelected = value === selectedTimelineValue;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedTimelineValue(value)}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition ${
                      isSelected
                        ? "border-saivie-rose bg-saivie-rose text-white"
                        : isNow
                          ? "border-saivie-blush bg-saivie-blush text-saivie-plum"
                          : "border-saivie-border/60 bg-white text-saivie-plum hover:border-saivie-rose"
                    }`}
                    aria-label={isPregnancy ? `Week ${value}` : `Cycle day ${value}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
            {selectedTimelineValue != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                {isPregnancy ? `Selected pregnancy week ${selectedTimelineValue}` : `Selected cycle day ${selectedTimelineValue}`}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="rounded-[18px] border border-[#4ea7ff] bg-white/95 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-3xl text-black">Today&apos;s plan</h2>
            <p className="hidden text-xs text-black/70 sm:block">
              {isPregnancy ? `Gentle, built around week ${week ?? "—"}.` : "Built around today's cycle phase."}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const phase =
              plan.time === "Morning" || plan.time === "10 AM"
                ? { text: "text-[#f04b8a]", dot: "bg-[#f04b8a]" }
                : plan.time === "Afternoon" || plan.time === "1 PM"
                  ? { text: "text-[#0ba7a1]", dot: "bg-[#0ba7a1]" }
                  : plan.time === "Evening" || plan.time === "6 PM"
                    ? { text: "text-[#8b53ef]", dot: "bg-[#8b53ef]" }
                    : { text: "text-[#2d4cc4]", dot: "bg-[#2d4cc4]" };
            return (
              <Card key={plan.time} className="min-h-[190px] rounded-[18px] border border-[#e4dfdd] bg-white/95 shadow-sm">
                <CardContent className="p-4">
                  <div className={`mb-3 flex items-center gap-2 text-xs font-semibold ${phase.text}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${phase.dot}`} />
                    {plan.time}
                  </div>
                  <p className="font-serif text-lg font-semibold leading-tight text-black">{plan.label}</p>
                  <p className="mt-2 text-xs leading-relaxed text-black/65">{plan.text}</p>
                  {plan.link && (
                    <button type="button" onClick={onOpenCare} className="mt-3 text-xs font-semibold text-black underline">
                      {plan.link}
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </div>
        </div>
      </section>

      {activeMedicines.length > 0 && (
        <Card className="border-saivie-border/60 bg-white/90 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Active medicines</p>
              <button className="text-xs text-saivie-rose" onClick={onOpenCare}>View my care</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeMedicines.slice(0, 4).map((medicine) => (
                <Badge key={medicine.id} variant="outline" className="text-[11px]">
                  {medicine.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="border-saivie-border/60 bg-white/90 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-saivie-sage p-3"><Stethoscope className="h-5 w-5 text-saivie-teal" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Book an appointment</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {upcoming?.date
                  ? `Next: ${new Date(upcoming.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}${upcoming.time ? ` at ${upcoming.time}` : ""}`
                  : "Gynecologist, nutritionist, or lab test"}
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full" onClick={onBook}>Book</Button>
          </CardContent>
        </Card>
        <Card className="border-saivie-border/60 bg-[#f7f1f4] shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-saivie-blush p-3"><Heart className="h-5 w-5 text-saivie-rose" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Ask about your body</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Prepared for general questions only</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
