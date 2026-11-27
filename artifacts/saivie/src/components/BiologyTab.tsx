import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { 
  Sparkles, 
  Zap, 
  Brain, 
  Moon, 
  Flame, 
  TrendingUp,
  Dna,
  ChevronRight,
  ChevronDown,
  Heart,
  Baby,
  Droplets,
  ShieldCheck,
  Apple,
  Ruler,
  Activity,
  Scale,
  Thermometer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import hormoneWaveBg from "../assets/images/hormone-wave-bg.png";
import dnaAbstract from "../assets/images/dna-abstract.png";
import { getWeekData, getWeekSizeLabel } from "@/components/WeekByWeekTimeline";
import type { PregnancyTrackerTarget } from "@/components/PregnancyTrackersTab";
import PregnancyGrowthChart from "@/components/PregnancyGrowthChart";
import { usePatientCycle } from "@/lib/usePatientCycle";

const hormoneData = [
  { day: 1, est: 20, prog: 5, lh: 5, fsh: 10 },
  { day: 5, est: 30, prog: 5, lh: 6, fsh: 8 },
  { day: 10, est: 60, prog: 6, lh: 8, fsh: 6 },
  { day: 12, est: 80, prog: 7, lh: 12, fsh: 8 },
  { day: 14, est: 95, prog: 8, lh: 40, fsh: 15 },
  { day: 16, est: 50, prog: 20, lh: 10, fsh: 6 },
  { day: 20, est: 40, prog: 60, lh: 5, fsh: 4 },
  { day: 24, est: 30, prog: 50, lh: 4, fsh: 4 },
  { day: 28, est: 25, prog: 10, lh: 4, fsh: 8 },
];

interface BiologyTabProps {
  mode?: string;
  patient?: any;
  labResults?: any[];
  onOpenTracker?: (tracker: PregnancyTrackerTarget) => void;
}

function getPregnancyWeek(lmp: string | undefined) {
  if (!lmp) return 0;
  const diffDays = Math.floor((new Date().getTime() - new Date(lmp).getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

function PregnancyBiology({ patient, labResults }: { patient: any; labResults: any[] }) {
  const weeks = getPregnancyWeek(patient?.lmp);
  const trimester = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
  const weekGuide = getWeekData(weeks);

  const pregnancyHormoneData = [
    { week: 4, hcg: 50, prog: 15, est: 200 },
    { week: 6, hcg: 1000, prog: 20, est: 300 },
    { week: 8, hcg: 30000, prog: 25, est: 500 },
    { week: 10, hcg: 80000, prog: 30, est: 800 },
    { week: 12, hcg: 100000, prog: 40, est: 1200 },
    { week: 14, hcg: 50000, prog: 50, est: 2000 },
    { week: 18, hcg: 20000, prog: 60, est: 4000 },
    { week: 22, hcg: 15000, prog: 80, est: 8000 },
    { week: 26, hcg: 15000, prog: 100, est: 12000 },
    { week: 30, hcg: 15000, prog: 130, est: 16000 },
    { week: 34, hcg: 12000, prog: 160, est: 20000 },
    { week: 38, hcg: 10000, prog: 200, est: 25000 },
    { week: 40, hcg: 8000, prog: 250, est: 30000 },
  ];

  const babySize: Record<number, { size: string; fruit: string; length: string; weight: string }> = {
    4: { size: "Poppy seed", fruit: "🫘", length: "~1 mm", weight: "<1 g" },
    6: { size: "Lentil", fruit: "🫘", length: "~4 mm", weight: "<1 g" },
    8: { size: "Raspberry", fruit: "🫐", length: "~1.6 cm", weight: "~1 g" },
    10: { size: "Strawberry", fruit: "🍓", length: "~3 cm", weight: "~4 g" },
    12: { size: "Lime", fruit: "🍋", length: "~5.5 cm", weight: "~14 g" },
    14: { size: "Lemon", fruit: "🍋", length: "~8.5 cm", weight: "~43 g" },
    16: { size: "Avocado", fruit: "🥑", length: "~12 cm", weight: "~100 g" },
    18: { size: "Bell Pepper", fruit: "🫑", length: "~14 cm", weight: "~190 g" },
    20: { size: "Banana", fruit: "🍌", length: "~25 cm", weight: "~300 g" },
    24: { size: "Corn", fruit: "🌽", length: "~30 cm", weight: "~600 g" },
    28: { size: "Eggplant", fruit: "🍆", length: "~37 cm", weight: "~1 kg" },
    32: { size: "Coconut", fruit: "🥥", length: "~42 cm", weight: "~1.7 kg" },
    36: { size: "Honeydew", fruit: "🍈", length: "~47 cm", weight: "~2.6 kg" },
    40: { size: "Watermelon", fruit: "🍉", length: "~50 cm", weight: "~3.4 kg" },
  };

  const closestWeek = Object.keys(babySize).map(Number).reduce((prev, curr) =>
    Math.abs(curr - weeks) < Math.abs(prev - weeks) ? curr : prev
  );
  const currentSize = babySize[closestWeek] || babySize[12];

  const keyLabTests = labResults?.filter((r: any) => {
    const name = (r.testName || '').toLowerCase();
    return name.includes('hb') || name.includes('hemoglobin') || name.includes('tsh') ||
           name.includes('glucose') || name.includes('sugar') || name.includes('hba1c') ||
           name.includes('iron') || name.includes('ferritin') || name.includes('vitamin d') ||
           name.includes('b12') || name.includes('calcium') || name.includes('hcg') ||
           name.includes('ogtt') || name.includes('platelet');
  }) || [];

  const bodyChanges = trimester === 1
    ? [
        { label: "Blood Volume", value: "Increasing", icon: <Droplets className="w-4 h-4 text-rose-500" />, detail: "Your body is making 50% more blood to support the baby" },
        { label: "hCG Levels", value: "Rising Fast", icon: <TrendingUp className="w-4 h-4 text-saivie-rose" />, detail: "This hormone causes morning sickness but keeps the pregnancy healthy" },
        { label: "Metabolism", value: "Adapting", icon: <Flame className="w-4 h-4 text-orange-500" />, detail: "Calorie needs increase slightly. Focus on quality nutrition" },
      ]
    : trimester === 2
    ? [
        { label: "Energy", value: "Improving", icon: <Zap className="w-4 h-4 text-amber-500" />, detail: "The placenta has taken over hormone production — you should feel better" },
        { label: "Baby Movement", value: "Starting", icon: <Baby className="w-4 h-4 text-saivie-rose" />, detail: "You may feel gentle flutters or kicks as baby grows" },
        { label: "Ligaments", value: "Relaxing", icon: <Activity className="w-4 h-4 text-blue-500" />, detail: "Relaxin hormone loosens joints. Be gentle with stretches" },
      ]
    : [
        { label: "Baby Position", value: "Settling", icon: <Baby className="w-4 h-4 text-saivie-rose" />, detail: "Baby is getting into position for birth" },
        { label: "Braxton Hicks", value: "Possible", icon: <Activity className="w-4 h-4 text-amber-500" />, detail: "Practice contractions are normal — they prepare your body" },
        { label: "Sleep", value: "Challenging", icon: <Moon className="w-4 h-4 text-saivie-teal" />, detail: "Use pillows for support. Left-side sleeping improves blood flow" },
      ];

  const nutritionFocus = trimester === 1
    ? ["Folic acid (leafy greens, lentils)", "Vitamin B6 (bananas, potatoes — helps nausea)", "Small, frequent meals", "Ginger tea for morning sickness"]
    : trimester === 2
    ? ["Iron-rich foods (spinach, dates, jaggery)", "Calcium (milk, ragi, paneer)", "Protein (eggs, dal, nuts)", "Omega-3 (fish oil, walnuts, flaxseed)"]
    : ["Continue iron and calcium", "Dates (6/day from week 36 may ease labor)", "Stay hydrated (8-10 glasses)", "Fiber-rich foods to prevent constipation"];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/80 mb-1">Your Body Right Now</h2>
        <div className="flex flex-col gap-2">
          {bodyChanges.map((change, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-saivie-rose shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              <span className="text-foreground font-medium text-lg">{change.label}: {change.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xl font-serif text-foreground">Baby Size This Week</h3>
          <span className="text-xs font-medium text-muted-foreground bg-saivie-ivory/50 px-2 py-1 rounded-full">Week {weeks}</span>
        </div>
        <Card className="border-none bg-gradient-to-br from-saivie-surface-blush to-rose-50 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="text-6xl">{currentSize.fruit}</div>
              <div className="flex-1">
                <p className="text-xl font-serif text-saivie-plum font-medium">{currentSize.size}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-saivie-ivory/60 rounded-lg p-2.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Length</div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1">
                      <Ruler className="w-3 h-3 text-saivie-rose" /> {currentSize.length}
                    </div>
                  </div>
                  <div className="bg-saivie-ivory/60 rounded-lg p-2.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Weight</div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1">
                      <Scale className="w-3 h-3 text-saivie-rose" /> {currentSize.weight}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xl font-serif text-foreground">Pregnancy Hormones</h3>
          <Badge variant="outline" className="text-[10px] h-5 bg-saivie-surface-blush text-saivie-rose border-saivie-blush">
            {trimester === 1 ? '1st Trimester' : trimester === 2 ? '2nd Trimester' : '3rd Trimester'}
          </Badge>
        </div>
        <Card className="overflow-hidden border-none shadow-sm relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url(${hormoneWaveBg})`, backgroundSize: 'cover' }} />
          <CardContent className="p-0 h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pregnancyHormoneData} margin={{ top: 20, right: 15, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHcg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPregProg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Week', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                <Area type="monotone" dataKey="hcg" name="hCG" stroke="#ec4899" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHcg)" />
                <Area type="monotone" dataKey="prog" name="Progesterone" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPregProg)" />
              </AreaChart>
            </ResponsiveContainer>
            {weeks > 0 && weeks <= 40 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute top-3 right-4"
              >
                <div className="bg-saivie-ivory/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-saivie-blush text-xs font-medium text-center">
                  <span className="text-saivie-rose">You are here</span>
                  <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">Week {weeks}</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-4 justify-center mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-1.5 rounded-full bg-saivie-rose" /> hCG
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-1.5 rounded-full bg-saivie-teal" /> Progesterone
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-serif text-foreground mb-4 px-1">What's Changing In Your Body</h3>
        <div className="space-y-3">
          {bodyChanges.map((change, i) => (
            <Card key={i} className="glass-panel border-white/60">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="p-2.5 bg-saivie-surface-blush rounded-xl shrink-0">
                  {change.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-foreground">{change.label}</p>
                    <Badge variant="outline" className="text-[10px] bg-saivie-surface-blush text-saivie-rose border-saivie-blush">{change.value}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{change.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {keyLabTests.length > 0 && (
        <div>
          <h3 className="text-xl font-serif text-foreground mb-4 px-1">Key Lab Values</h3>
          <div className="grid grid-cols-2 gap-3">
            {keyLabTests.slice(0, 6).map((lr: any, i: number) => {
              const s = (lr.status || '').toLowerCase();
              const statusColor = s === 'normal' ? 'text-emerald-600 bg-emerald-50' : s === 'high' || s === 'critical' ? 'text-rose-600 bg-rose-50' : s === 'low' ? 'text-amber-600 bg-amber-50' : 'text-saivie-plum bg-saivie-surface-muted';
              return (
                <Card key={i} className="glass-panel border-white/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground truncate">{lr.testName}</p>
                    <p className="text-lg font-semibold text-foreground mt-0.5">{lr.value != null ? `${lr.value}` : '-'} <span className="text-xs font-normal text-muted-foreground">{lr.unit || ''}</span></p>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${statusColor}`}>{lr.status || 'N/A'}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xl font-serif text-foreground mb-4 px-1">Nutrition Focus</h3>
        <Card className="border-none bg-gradient-to-br from-emerald-50 to-green-50 shadow-sm overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-3xl -mr-10 -mt-10" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Apple className="w-5 h-5 text-emerald-600" />
              <h4 className="text-base font-medium text-emerald-900">
                {trimester === 1 ? 'First Trimester Essentials' : trimester === 2 ? 'Second Trimester Power Foods' : 'Third Trimester Nourishment'}
              </h4>
            </div>
            <div className="space-y-2.5">
              {nutritionFocus.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <p className="text-sm text-emerald-800 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-serif text-foreground mb-4 px-1">Mind & Body</h3>
        <div className="grid grid-cols-3 gap-3">
          {trimester === 1 ? (
            <>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Thermometer className="w-5 h-5 text-rose-500" />
                <div className="text-xs font-medium text-muted-foreground">Nausea</div>
                <div className="text-sm font-bold text-foreground">Common</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Moon className="w-5 h-5 text-saivie-teal" />
                <div className="text-xs font-medium text-muted-foreground">Fatigue</div>
                <div className="text-sm font-bold text-foreground">High</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Brain className="w-5 h-5 text-saivie-teal" />
                <div className="text-xs font-medium text-muted-foreground">Mood</div>
                <div className="text-sm font-bold text-foreground">Variable</div>
              </div>
            </>
          ) : trimester === 2 ? (
            <>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <div className="text-xs font-medium text-muted-foreground">Energy</div>
                <div className="text-sm font-bold text-foreground">Better</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Heart className="w-5 h-5 text-saivie-rose" />
                <div className="text-xs font-medium text-muted-foreground">Baby Kicks</div>
                <div className="text-sm font-bold text-foreground">Starting</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Brain className="w-5 h-5 text-saivie-teal" />
                <div className="text-xs font-medium text-muted-foreground">Mood</div>
                <div className="text-sm font-bold text-foreground">Stable</div>
              </div>
            </>
          ) : (
            <>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                <div className="text-xs font-medium text-muted-foreground">Contractions</div>
                <div className="text-sm font-bold text-foreground">Practice</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Moon className="w-5 h-5 text-saivie-teal" />
                <div className="text-xs font-medium text-muted-foreground">Sleep</div>
                <div className="text-sm font-bold text-foreground">Lighter</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <div className="text-xs font-medium text-muted-foreground">Nesting</div>
                <div className="text-sm font-bold text-foreground">Active</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-saivie-blush text-saivie-plum p-4 rounded-xl flex items-center gap-4 shadow-lg">
        <Heart className="w-5 h-5 text-saivie-rose shrink-0" />
        <p className="text-xs font-medium leading-relaxed">
          {trimester === 1
            ? "Your baby's heart starts beating around week 6. Take folic acid daily — it's the most important supplement right now."
            : trimester === 2
            ? "This is often called the 'golden trimester.' Your baby can hear your voice now — talk and sing to them!"
            : "Your body is preparing for delivery. Practice breathing exercises and keep your hospital bag ready."}
        </p>
      </div>
    </div>
  );
}

function CycleNowPatterns({ patient }: { patient: any }) {
  const [view, setView] = useState<"now" | "patterns">("now");
  const { lmp, cycleLength, regularity, phase, usingDemoSample, periodQuery } = usePatientCycle(patient, true);
  const day = phase?.cycleDay;
  const length = phase ? Number(cycleLength) : null;
  const markerX = day && length ? 4 + ((day - 1) / (length - 1)) * 342 : null;
  const todayRead = !phase
    ? "A current period date and typical cycle length are needed for a cycle estimate."
    : phase.cycleDay <= 5
      ? "Early in a cycle, estrogen and progesterone are typically low. Experiences vary."
      : phase.cycleDay < phase.estimatedOvulationDay
        ? "Estrogen typically rises before ovulation. Your timing may differ."
        : phase.cycleDay === phase.estimatedOvulationDay
          ? "Ovulation may occur around this time. The date is an estimate, not a confirmation."
          : "If ovulation has occurred, progesterone typically rises. Timing and symptoms vary.";

  return (
    <div className="space-y-6 pb-24">
      {periodQuery.isError && <p role="alert" className="text-sm text-red-800">
        Unable to load your period information. <button type="button" className="font-bold underline" onClick={() => void periodQuery.refetch()}>Retry</button>
      </p>}
      <div role="tablist" aria-label="Body views" className="flex w-[320px] max-w-full rounded-full bg-[#F3E6D4] p-1">
        {(["now", "patterns"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={view === item}
            onClick={() => setView(item)}
            className={`h-11 flex-1 rounded-full text-[15px] transition ${view === item
              ? "bg-[#22122B] font-bold text-[#FFF4E6]"
              : "bg-transparent font-semibold text-[#22122B]"}`}
          >
            {item === "now" ? "Now" : "Patterns"}
          </button>
        ))}
      </div>

      {view === "patterns" ? (
        <div className="space-y-6">
          <section className="rounded-[40px] bg-[#BBAAFF] p-6 md:p-12">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em]">MY BODY</p>
            <h1 className="mt-3 max-w-[680px] font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[76px]">
              Right on <em className="font-medium">rhythm.</em>
            </h1>
            <p className="mt-4 text-[17px] md:text-[20px]">Your reported cycle information.</p>
            {usingDemoSample && <p className="mt-2 text-sm">Local demo preview only; sample values are not patient data.</p>}
          </section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["Cycle length", cycleLength != null && String(cycleLength).trim() ? `${cycleLength} days` : "Not recorded"],
              ["Cycle regularity", regularity || "Not recorded"],
              ["Last period", lmp || "Not recorded"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[28px] border border-[#F0DCC4] bg-white p-6">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">{label}</p>
                <p className="mt-2 font-serif text-[24px] font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-8 rounded-[40px] bg-[#FF9B7B] p-6 md:p-12"
          >
            <div className="min-w-0 basis-[480px] flex-1">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-extrabold uppercase tracking-[0.14em]">MY BODY</span>
                <span className="rounded-full bg-[#22122B] px-4 py-2 text-[12px] font-extrabold tracking-[0.1em] text-[#FF9B7B]">{day ? `DAY ${day} · ESTIMATED` : "CYCLE DAY UNAVAILABLE"}</span>
              </div>
              <h1 className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[76px]">
                Explore what may happen <em className="font-medium">inside.</em>
              </h1>
              <p className="mt-4 text-[17px] md:text-[20px]">Cycle information, explained in plain words.</p>
            </div>
            <div className="basis-[340px] rounded-[28px] bg-[#FFF4E6] p-6">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#6A5560]">TODAY&apos;S READ</p>
              <p className="mt-3 font-serif text-[24px] font-bold leading-[1.2]">{todayRead}</p>
              {phase && <p className="mt-2 text-sm">{usingDemoSample ? "Local demo preview only; not patient data." : "Estimated from your period date and typical cycle length, not hormone measurements."}</p>}
            </div>
          </motion.section>

          <section className="flex flex-wrap items-stretch gap-6">
            <div className="min-w-0 flex-[1_1_640px] rounded-[32px] border border-[#F0DCC4] bg-white p-6 md:p-8">
              <h2 className="font-serif text-[30px] font-bold">Hormones across your cycle</h2>
              <p className="mt-2 text-[16px] text-[#5A4552]">{day && length ? `Estimated day ${day} of ${length}. ` : "Cycle day unavailable. "}Illustrative hormone patterns, not your measurements or a prediction of their timing; actual timing and levels vary.</p>
              <svg viewBox="0 0 350 150" role="img" aria-label={day ? `Illustrative hormone chart. Estimated cycle day ${day}.` : "Illustrative hormone chart. Current cycle day unavailable."} className="mt-4 block h-auto w-full">
                <line x1="4" y1="130" x2="346" y2="130" stroke="#E6D3BD" strokeWidth="1.5" />
                {markerX !== null && <line x1={markerX} y1="10" x2={markerX} y2="130" stroke="#22122B" strokeWidth="1.5" strokeDasharray="3 4" data-testid="cycle-today-marker" />}
                <path d="M4.5 112 C30 112 55 108 79.5 100 S105 84 117 70 S140 24 154.5 22 S160 18 167 20 S180 48 192 60 S215 84 229.5 80 S245 52 254.5 55 S280 78 292 80 S330 112 342 112" fill="none" stroke="#FF6A4D" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M4.5 122 L140 122 C150 120 156 40 164 32 C172 40 176 118 188 122 L342 122" fill="none" stroke="#5B3DF5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.5 124 L170 124 C195 122 215 70 250 42 C270 36 280 50 292 80 C305 108 320 122 342 124" fill="none" stroke="#0B7D70" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="7 6" />
                {markerX !== null && <text x={Math.max(20, Math.min(330, markerX))} y="8" textAnchor="middle" fontSize="10" fontWeight="800" fill="#22122B">TODAY</text>}
                <text x="4" y="146" fontSize="11" fontWeight="600" fill="#5A4552">Day 1</text>
                <text x="167" y="146" textAnchor="middle" fontSize="11" fontWeight="600" fill="#5A4552">Example pattern</text>
                <text x="346" y="146" textAnchor="end" fontSize="11" fontWeight="600" fill="#5A4552">{length ? `Day ${length}` : "Cycle end"}</text>
              </svg>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-semibold">
                <li className="flex items-center gap-2"><span className="h-1 w-6 rounded-full bg-[#FF6A4D]" />Estrogen</li>
                <li className="flex items-center gap-2"><span className="h-1 w-6 rounded-full bg-[#5B3DF5]" />LH</li>
                <li className="flex items-center gap-2"><span className="w-6 border-t-4 border-dashed border-[#0B7D70]" />Progesterone</li>
              </ul>
            </div>

            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-6 md:max-w-[420px]">
              <section className="flex flex-1 flex-col justify-between gap-5 rounded-[32px] bg-[#22122B] p-8 text-[#FFF4E6]">
                <div>
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#FF9B7B]">SHARPEN THE PICTURE</p>
                  <h2 className="mt-3 font-serif text-[30px] font-bold leading-[1.1]">Understanding temperature</h2>
                  <p className="mt-3 text-[16px] leading-[1.5] text-[#E9D8DF]">Temperature patterns can offer clues about your cycle, but do not confirm ovulation on their own. Temperature logging is not available here yet.</p>
                </div>
              </section>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">Understanding your signals</h2>
            <div className="flex flex-wrap gap-4">
              {[
                ["FOCUS", "Individual", "Focus and energy can vary from day to day.", "#E4DCFF", "#3A24B8", "#2E1E48"],
                ["TEMP", "Not measured", "Temperature can vary for many reasons.", "#FFD9C9", "#A8341A", "#3F211A"],
                ["METABOLISM", "Individual", "A balanced diet can support your everyday wellbeing.", "#CFF1EA", "#0B6B5F", "#14332E"],
                ["HORMONES", "Not measured", "Hormone levels and timing vary between cycles.", "#FFE7A8", "#7A4B00", "#4A3320"],
              ].map(([label, value, copy, bg, labelColor, bodyColor]) => (
                <article key={label} className="min-w-0 flex-[1_1_240px] rounded-[28px] p-[26px]" style={{ background: bg }}>
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em]" style={{ color: labelColor }}>{label}</p>
                  <h3 className="mt-3 font-serif text-[30px] font-bold leading-[1.1]">{value}</h3>
                  <p className="mt-3 text-[15px] leading-[1.5]" style={{ color: bodyColor }}>{copy}</p>
                </article>
              ))}
            </div>
          </section>

    


        </>
      )}
    </div>
  );
}

function PregnancyBodyReference({ patient, labResults, onOpenTracker }: { patient: any; labResults: any[]; onOpenTracker?: (tracker: PregnancyTrackerTarget) => void }) {
  const lmp = patient?.lmp;
  const weeks = lmp
    ? Math.max(1, Math.min(40, Math.floor((Date.now() - new Date(lmp).getTime()) / (7 * 24 * 60 * 60 * 1000))))
    : 24;
  const dueDate = lmp ? new Date(new Date(lmp).getTime() + 280 * 24 * 60 * 60 * 1000) : null;
  const weekGuide = getWeekData(weeks);
  const currentSize = getWeekSizeLabel(weeks);
  const trimester = weeks < 13 ? 1 : weeks < 28 ? 2 : 3;
  const lmpTime = lmp ? new Date(lmp).getTime() : NaN;
  const growthWeek = Number.isFinite(lmpTime) ? Math.floor((Date.now() - lmpTime) / (7 * 24 * 60 * 60 * 1000)) : null;

  return (
    <div className="space-y-6 pb-24">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-stretch justify-between gap-8 rounded-[40px] bg-[#FFA7B6] p-6 md:p-12"
      >
        <div className="min-w-0 basis-[480px] flex-1">
          <span className="inline-flex h-8 items-center rounded-full bg-[#2A1220] px-4 text-[12px] font-extrabold tracking-[0.1em] text-[#FFA7B6]">
            WEEK {weeks}
          </span>
          <h1 className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[72px]">
            Your body is making a <em className="font-medium">person.</em>
          </h1>
          <p className="mt-4 max-w-[36ch] text-[17px] font-medium leading-[1.4] md:text-[20px]">
            Here is what is changing, and what is normal.
          </p>
        </div>
        <div className="min-w-0 basis-[420px] flex-[0_1_420px] rounded-[32px] bg-white p-7">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#6A5560]">TODAY&apos;S READ</p>
          <p className="mt-3 font-serif text-[24px] font-bold leading-[1.2]">
            {weeks <= 12
              ? "Your baby's major organs are beginning to form."
              : weeks <= 27
                ? `Your baby is about the size of ${currentSize}. Your body is making more blood.`
                : "Your baby is preparing for birth. Rest and routine antenatal checks matter."}
          </p>
        </div>
      </motion.section>

      <div className="flex flex-wrap items-stretch gap-5">
        <PregnancyGrowthChart currentWeek={growthWeek} />

        <section className="flex min-w-0 flex-[1_1_340px] flex-col justify-between gap-5 rounded-[32px] bg-[#2A1220] p-6 text-[#FFF4EE] md:max-w-[420px] md:p-8">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#FFA7B6]">SHARPEN THE PICTURE</p>
            <h2 className="mt-3 font-serif text-[30px] font-bold leading-[1.1]">Log your weight and blood pressure</h2>
            <p className="mt-3 text-[16px] leading-[1.5] text-[#E9D8DF]">Your doctor can see the trend between visits.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => onOpenTracker?.("weight")} className="min-h-[44px] rounded-full border border-[#FFA7B6] bg-[#FFA7B6] px-[18px] text-[15px] font-bold text-[#2A1220]">Add weight</button>
            <button type="button" onClick={() => onOpenTracker?.("blood-pressure")} className="min-h-[44px] rounded-full border border-[#E9D8DF] bg-transparent px-[18px] text-[15px] font-bold text-[#FFF4EE]">Add blood pressure</button>
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">Your four signals</h2>
        <div className="flex flex-wrap gap-4">
          {[
            ["BABY", "Movements", "If movements change or reduce, contact your maternity team immediately.", "#FFD9C9", "#7A1F38", "#3A2A44"],
            ["BLOOD", "Volume up", "Your body makes more blood. You may feel warmer.", "#CFF1EA", "#0B6B5F", "#3A2A44"],
            ["JOINTS", "Looser", "Relaxin softens ligaments. Back and hip aches are common.", "#E4DCFF", "#3A24B8", "#3A2A44"],
            ["ENERGY", trimesterText(weeks), "Often more steady in the second trimester.", "#FFE7A8", "#7A4B00", "#3A2A44"],
          ].map(([label, value, copy, bg, labelColor, bodyColor]) => (
            <article key={label} className="flex min-w-0 flex-[1_1_240px] flex-col gap-[14px] rounded-[32px] p-[26px]" style={{ background: bg }}>
              <p className="text-[12px] font-extrabold uppercase tracking-[0.14em]" style={{ color: labelColor }}>{label}</p>
              <h3 className="font-serif text-[30px] font-bold leading-[1.1]">{value}</h3>
              <p className="text-[15px] leading-[1.5]" style={{ color: bodyColor }}>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-5">
        <article className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-[32px] border border-[#F0DCC4] bg-white p-7">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#6A5560]">BABY&apos;S DEVELOPMENT</p>
          <h2 className="font-serif text-[30px] font-bold leading-[1.1]">{trimester === 1 ? "Foundations are being built" : trimester === 2 ? "Growing and exploring" : "Getting ready"}</h2>
          <div className="space-y-3">
            {weekGuide.development.slice(0, 4).map((item: string) => (
              <div key={item} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FFA7B6]" />
                <p className="text-[16px] leading-[1.45] text-[#4A3846]">{item}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-[32px] bg-[#FFD9C9] p-7">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#A8341A]">COMMON SYMPTOMS</p>
          <h2 className="font-serif text-[30px] font-bold leading-[1.1]">What you may notice</h2>
          <div className="flex flex-wrap gap-2">
            {weekGuide.symptoms.slice(0, 4).map((item: string) => (
              <span key={item} className="rounded-full bg-white px-[14px] py-2 text-[14px] font-bold text-[#4A3846]">{item}</span>
            ))}
          </div>
        </article>
        <article className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-[32px] bg-[#CFF1EA] p-7">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#0B6B5F]">DO THIS WEEK</p>
          {weekGuide.dos.slice(0, 3).map((item: string) => (
            <p key={item} className="flex gap-3 text-[15px] leading-[1.45]">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0B6B5F] text-[11px] font-bold text-white">✓</span>
              {item}
            </p>
          ))}
        </article>
        <article className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-[32px] bg-[#E4DCFF] p-7">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#3A24B8]">AVOID THIS WEEK</p>
          {weekGuide.donts.slice(0, 3).map((item: string) => (
            <p key={item} className="flex gap-3 text-[15px] leading-[1.45]">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3A24B8] text-[11px] font-bold text-white">×</span>
              {item}
            </p>
          ))}
        </article>
      </section>

      <section className="space-y-5" aria-labelledby="pregnancy-symptoms-heading">
        <h2 id="pregnancy-symptoms-heading" className="font-serif text-[38px] font-bold tracking-[-0.02em]">Normal, or ask?</h2>
        <div className="grid gap-5 lg:grid-cols-[1.28fr_1fr]">
          <div className="rounded-[32px] border border-[#F0DCC4] bg-white p-6 md:p-7">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#0B6B5F]">Common symptoms</p>
            <p className="mt-4 text-[16px] leading-[1.55]">
              Backache, heartburn and some swelling can happen in pregnancy. If anything worries you or changes, ask your care team.
            </p>
            <div className="mt-4 border-t border-[#F0DCC4] pt-4">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#A8341A]">Contact your maternity team immediately</p>
              <p className="mt-4 text-[16px] leading-[1.55]">
                Call about bleeding, severe or regular pain, fluid leaking, a severe headache or vision changes, sudden swelling of your face or hands, or a change in your baby&apos;s usual movements. Do not wait until the next day.
              </p>
              <p className="mt-3 text-sm text-[#5A4552]">If you cannot reach your maternity team or need emergency help, seek urgent medical care.</p>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#F0DCC4] bg-white p-6 md:p-7">
            <h3 className="font-serif text-[30px] font-bold leading-[1.1]">Log in one tap</h3>
            <div className="mt-4">
              {([
                ["Weight", "weight"],
                ["Blood pressure", "blood-pressure"],
                ["Baby movements", "baby-movements"],
              ] as const).map(([label, tracker]) => (
                <div key={tracker} className="flex min-h-[68px] items-center justify-between gap-4 border-t border-[#F0DCC4]">
                  <span className="text-[16px] font-bold">{label}</span>
                  <button type="button" onClick={() => onOpenTracker?.(tracker)} aria-label={`Add ${label.toLowerCase()}`} className="min-h-11 rounded-full border border-[#D9C3AE] px-5 text-sm font-bold text-[#2A1220] hover:bg-[#FFF4EE]">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="pregnancy-reading-heading">
        <h2 id="pregnancy-reading-heading" className="font-serif text-[38px] font-bold tracking-[-0.02em]">Read biology</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Back pain in pregnancy", "https://www.nhs.uk/pregnancy/common-symptoms/back-pain/"],
            ["Tiredness and sleep in pregnancy", "https://www.nhs.uk/pregnancy/common-symptoms/tiredness/"],
            ["Your baby’s movements", "https://www.nhs.uk/pregnancy/keeping-well/your-babys-movements/"],
          ].map(([title, href]) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-[130px] flex-col justify-between rounded-[28px] border border-[#F0DCC4] bg-white p-6 text-[#2A1220] transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A1220]">
              <span className="text-xs font-semibold text-[#6A5560]">NHS · Opens in a new tab</span>
              <span className="mt-3 flex items-end justify-between gap-3 font-serif text-[23px] font-bold leading-[1.15]">
                {title}<ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0" />
              </span>
            </a>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-[#5A4552]">Educational information, not medical advice. Contact your care team about your individual symptoms.</p>
      </section>
    </div>
  );
}

function trimesterText(weeks: number) {
  if (weeks < 13) return "First trimester";
  if (weeks < 28) return "Steadier";
  return "Final stretch";
}

export default function BiologyTab({ mode, patient, labResults, onOpenTracker }: BiologyTabProps) {
  if (mode === 'pregnancy') {
    return <PregnancyBodyReference patient={patient} labResults={labResults || []} onOpenTracker={onOpenTracker} />;
  }
  return <CycleNowPatterns patient={patient} />;
}

