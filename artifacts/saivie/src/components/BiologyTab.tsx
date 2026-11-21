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
}

function getPregnancyWeek(lmp: string | undefined) {
  if (!lmp) return 0;
  const diffDays = Math.floor((new Date().getTime() - new Date(lmp).getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

function PregnancyBiology({ patient, labResults }: { patient: any; labResults: any[] }) {
  const weeks = getPregnancyWeek(patient?.lmp);
  const trimester = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;

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
  const [temperature, setTemperature] = useState("");
  const [temperatureSaved, setTemperatureSaved] = useState(false);
  const lmp = patient?.lmp;
  const cycleDay = lmp && /^\d{4}-\d{2}-\d{2}/.test(lmp)
    ? Math.floor((Date.now() - new Date(`${lmp.slice(0, 10)}T00:00:00`).getTime()) / 86400000) + 1
    : 14;
  const day = cycleDay > 0 && cycleDay <= 28 ? cycleDay : 14;

  return (
    <div className="space-y-6 pb-24">
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
            <p className="mt-4 text-[17px] md:text-[20px]">Your recorded cycle pattern over time.</p>
          </section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[["Cycle length", "28 days"], ["Cycle trend", "Regular"], ["Confidence", "Sample"]].map(([label, value]) => (
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
                <span className="rounded-full bg-[#22122B] px-4 py-2 text-[12px] font-extrabold tracking-[0.1em] text-[#FF9B7B]">DAY {day}</span>
              </div>
              <h1 className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[76px]">
                Here&apos;s what's happening <em className="font-medium">inside.</em>
              </h1>
              <p className="mt-4 text-[17px] md:text-[20px]">Four signals, explained in plain words.</p>
            </div>
            <div className="basis-[340px] rounded-[28px] bg-[#FFF4E6] p-6">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#6A5560]">TODAY&apos;S READ</p>
              <p className="mt-3 font-serif text-[24px] font-bold leading-[1.2]">Estrogen is near its peak. LH surges to trigger ovulation.</p>
            </div>
          </motion.section>

          <section className="flex flex-wrap items-stretch gap-6">
            <div className="min-w-0 flex-[1_1_640px] rounded-[32px] border border-[#F0DCC4] bg-white p-6 md:p-8">
              <h2 className="font-serif text-[30px] font-bold">Hormones across your cycle</h2>
              <p className="mt-2 text-[16px] text-[#5A4552]">Day {day} of 28. Sample data until your logs add up.</p>
              <svg viewBox="0 0 350 150" role="img" aria-label={`Hormone chart. Current cycle day ${day}.`} className="mt-4 block h-auto w-full">
                <line x1="4" y1="130" x2="346" y2="130" stroke="#E6D3BD" strokeWidth="1.5" />
                <line x1={167} y1="10" x2={167} y2="130" stroke="#22122B" strokeWidth="1.5" strokeDasharray="3 4" />
                <path d="M4.5 112 C30 112 55 108 79.5 100 S105 84 117 70 S140 24 154.5 22 S160 18 167 20 S180 48 192 60 S215 84 229.5 80 S245 52 254.5 55 S280 78 292 80 S330 112 342 112" fill="none" stroke="#FF6A4D" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M4.5 122 L140 122 C150 120 156 40 164 32 C172 40 176 118 188 122 L342 122" fill="none" stroke="#5B3DF5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.5 124 L170 124 C195 122 215 70 250 42 C270 36 280 50 292 80 C305 108 320 122 342 124" fill="none" stroke="#0B7D70" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="7 6" />
                <circle cx="167" cy="20" r="7" fill="#FFF4E6" stroke="#22122B" strokeWidth="3" />
                <text x="167" y="8" textAnchor="middle" fontSize="10" fontWeight="800" fill="#22122B">TODAY</text>
                <text x="4" y="146" fontSize="11" fontWeight="600" fill="#5A4552">Day 1</text>
                <text x="167" y="146" textAnchor="middle" fontSize="11" fontWeight="600" fill="#5A4552">Day 14</text>
                <text x="346" y="146" textAnchor="end" fontSize="11" fontWeight="600" fill="#5A4552">Day 28</text>
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
                  <h2 className="mt-3 font-serif text-[30px] font-bold leading-[1.1]">Log this morning&apos;s temperature</h2>
                  <p className="mt-3 text-[16px] leading-[1.5] text-[#E9D8DF]">It confirms ovulation and makes your predictions more accurate.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(event) => setTemperature(event.target.value)}
                    placeholder="Temperature"
                    aria-label="Morning temperature"
                    className="h-[50px] min-w-[150px] flex-1 rounded-full border border-[#E9D8DF]/60 bg-transparent px-5 text-[15px] text-[#FFF4E6]"
                  />
                  <button type="button" onClick={() => setTemperatureSaved(Boolean(temperature))} className="h-[50px] rounded-full bg-[#FF9B7B] px-6 text-[15px] font-extrabold text-[#22122B]">
                    {temperatureSaved ? "Saved" : "Log"}
                  </button>
                </div>
              </section>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">Your four signals</h2>
            <div className="flex flex-wrap gap-4">
              {[
                ["FOCUS", "Peaking", "Verbal skills and confidence are at their best.", "#E4DCFF", "#3A24B8", "#2E1E48"],
                ["TEMP", "Rising slightly", "Keep your bedroom cool and dark tonight.", "#FFD9C9", "#A8341A", "#3F211A"],
                ["METABOLISM", "Efficient", "Your body is using protein well. Add lentils, eggs, or paneer.", "#CFF1EA", "#0B6B5F", "#14332E"],
                ["HORMONES", "Near peak", "Estrogen is elevated and LH is ready to surge.", "#FFE7A8", "#7A4B00", "#4A3320"],
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

function PregnancyBodyReference({ patient, labResults }: { patient: any; labResults: any[] }) {
  const lmp = patient?.lmp;
  const weeks = lmp
    ? Math.max(1, Math.min(40, Math.floor((Date.now() - new Date(lmp).getTime()) / (7 * 24 * 60 * 60 * 1000))))
    : 24;
  const dueDate = lmp ? new Date(new Date(lmp).getTime() + 280 * 24 * 60 * 60 * 1000) : null;
  const currentSize = getPregnancyBabySize(weeks);
  const growthX = 8 + (weeks - 8) * (334 / 32);
  const growthY = 126 - ((weeks - 8) / 32) * 114;

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
                ? `Your baby is about the size of ${currentSize.label}. Your body is making more blood.`
                : "Your baby is preparing for birth. Rest and routine antenatal checks matter."}
          </p>
        </div>
      </motion.section>

      <div className="flex flex-wrap items-stretch gap-5">
        <section className="min-w-0 flex-[1_1_640px] rounded-[32px] border border-[#F0DCC4] bg-white p-6 md:p-8">
          <h2 className="font-serif text-[30px] font-bold leading-[1.1]">Baby&apos;s growth</h2>
          <p className="mt-2 text-[16px] leading-[1.45] text-[#5A4552]">
            Average length by week. Sample data. Your scans may differ.
          </p>
          <svg viewBox="0 0 350 150" role="img" aria-label={`Baby growth at week ${weeks}.`} className="mt-4 block h-auto w-full">
            <line x1="4" y1="130" x2="346" y2="130" stroke="#E6D3BD" strokeWidth="1.5" />
            <path d="M8 126 C60 124 110 112 150 92 S220 46 260 30 S320 14 342 12" fill="none" stroke="#2A1220" strokeWidth="3.5" strokeLinecap="round" />
            <line x1={growthX} y1="10" x2={growthX} y2="130" stroke="#2A1220" strokeWidth="1.5" strokeDasharray="3 4" />
            <circle cx={growthX} cy={growthY} r="7" fill="#FFF4EE" stroke="#2A1220" strokeWidth="3" />
            <text x={growthX} y="8" textAnchor="middle" fontSize="10" fontWeight="800" fill="#2A1220">WEEK {weeks}</text>
            <text x="4" y="146" fontSize="11" fontWeight="600" fill="#5A4552">Wk 8</text>
            <text x="346" y="146" textAnchor="end" fontSize="11" fontWeight="600" fill="#5A4552">Wk 40</text>
          </svg>
        </section>

        <section className="flex min-w-0 flex-[1_1_340px] flex-col justify-between gap-5 rounded-[32px] bg-[#2A1220] p-6 text-[#FFF4EE] md:max-w-[420px] md:p-8">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#FFA7B6]">SHARPEN THE PICTURE</p>
            <h2 className="mt-3 font-serif text-[30px] font-bold leading-[1.1]">Log your weight and blood pressure</h2>
            <p className="mt-3 text-[16px] leading-[1.5] text-[#E9D8DF]">Your doctor can see the trend between visits.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="min-h-[44px] rounded-full border border-[#FFA7B6] bg-[#FFA7B6] px-[18px] text-[15px] font-bold text-[#2A1220]">Add weight</button>
            <button type="button" className="min-h-[44px] rounded-full border border-[#E9D8DF] bg-transparent px-[18px] text-[15px] font-bold text-[#FFF4EE]">Add blood pressure</button>
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">Your four signals</h2>
        <div className="flex flex-wrap gap-4">
          {[
            ["BABY", "Kicks starting", "You may feel flutters. A pattern matters more from week 28.", "#FFD9C9", "#7A1F38", "#3A2A44"],
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
    </div>
  );
}

function getPregnancyBabySize(weeks: number) {
  if (weeks < 8) return { label: "a poppy seed", length: "1 mm" };
  if (weeks < 12) return { label: "a lime", length: "5 cm" };
  if (weeks < 16) return { label: "an avocado", length: "12 cm" };
  if (weeks < 20) return { label: "a banana", length: "25 cm" };
  if (weeks < 28) return { label: "an ear of corn", length: "30 cm" };
  if (weeks < 36) return { label: "an eggplant", length: "37 cm" };
  return { label: "a watermelon", length: "50 cm" };
}

function trimesterText(weeks: number) {
  if (weeks < 13) return "First trimester";
  if (weeks < 28) return "Steadier";
  return "Final stretch";
}

export default function BiologyTab({ mode, patient, labResults }: BiologyTabProps) {
  if (mode === 'pregnancy') {
    return <PregnancyBodyReference patient={patient} labResults={labResults || []} />;
  }
  return <CycleNowPatterns patient={patient} />;
}

