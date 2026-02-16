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
        { label: "hCG Levels", value: "Rising Fast", icon: <TrendingUp className="w-4 h-4 text-pink-500" />, detail: "This hormone causes morning sickness but keeps the pregnancy healthy" },
        { label: "Metabolism", value: "Adapting", icon: <Flame className="w-4 h-4 text-orange-500" />, detail: "Calorie needs increase slightly. Focus on quality nutrition" },
      ]
    : trimester === 2
    ? [
        { label: "Energy", value: "Improving", icon: <Zap className="w-4 h-4 text-amber-500" />, detail: "The placenta has taken over hormone production — you should feel better" },
        { label: "Baby Movement", value: "Starting", icon: <Baby className="w-4 h-4 text-pink-500" />, detail: "You may feel gentle flutters or kicks as baby grows" },
        { label: "Ligaments", value: "Relaxing", icon: <Activity className="w-4 h-4 text-blue-500" />, detail: "Relaxin hormone loosens joints. Be gentle with stretches" },
      ]
    : [
        { label: "Baby Position", value: "Settling", icon: <Baby className="w-4 h-4 text-pink-500" />, detail: "Baby is getting into position for birth" },
        { label: "Braxton Hicks", value: "Possible", icon: <Activity className="w-4 h-4 text-amber-500" />, detail: "Practice contractions are normal — they prepare your body" },
        { label: "Sleep", value: "Challenging", icon: <Moon className="w-4 h-4 text-indigo-500" />, detail: "Use pillows for support. Left-side sleeping improves blood flow" },
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
              <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              <span className="text-foreground font-medium text-lg">{change.label}: {change.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xl font-serif text-foreground">Baby Size This Week</h3>
          <span className="text-xs font-medium text-muted-foreground bg-white/50 px-2 py-1 rounded-full">Week {weeks}</span>
        </div>
        <Card className="border-none bg-gradient-to-br from-pink-50 to-rose-50 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="text-6xl">{currentSize.fruit}</div>
              <div className="flex-1">
                <p className="text-xl font-serif text-pink-800 font-medium">{currentSize.size}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Length</div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1">
                      <Ruler className="w-3 h-3 text-pink-400" /> {currentSize.length}
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Weight</div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1">
                      <Scale className="w-3 h-3 text-pink-400" /> {currentSize.weight}
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
          <Badge variant="outline" className="text-[10px] h-5 bg-pink-50 text-pink-700 border-pink-100">
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
                <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-pink-100 text-xs font-medium text-center">
                  <span className="text-pink-600">You are here</span>
                  <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">Week {weeks}</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-4 justify-center mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-1.5 rounded-full bg-pink-400" /> hCG
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-1.5 rounded-full bg-purple-400" /> Progesterone
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-serif text-foreground mb-4 px-1">What's Changing In Your Body</h3>
        <div className="space-y-3">
          {bodyChanges.map((change, i) => (
            <Card key={i} className="glass-panel border-white/60">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="p-2.5 bg-pink-50 rounded-xl shrink-0">
                  {change.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-foreground">{change.label}</p>
                    <Badge variant="outline" className="text-[10px] bg-pink-50 text-pink-600 border-pink-200">{change.value}</Badge>
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
              const statusColor = s === 'normal' ? 'text-emerald-600 bg-emerald-50' : s === 'high' || s === 'critical' ? 'text-rose-600 bg-rose-50' : s === 'low' ? 'text-amber-600 bg-amber-50' : 'text-slate-600 bg-slate-50';
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
                <Moon className="w-5 h-5 text-indigo-500" />
                <div className="text-xs font-medium text-muted-foreground">Fatigue</div>
                <div className="text-sm font-bold text-foreground">High</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
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
                <Heart className="w-5 h-5 text-pink-500" />
                <div className="text-xs font-medium text-muted-foreground">Baby Kicks</div>
                <div className="text-sm font-bold text-foreground">Starting</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
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
                <Moon className="w-5 h-5 text-indigo-500" />
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

      <div className="bg-pink-900 text-pink-100 p-4 rounded-xl flex items-center gap-4 shadow-lg">
        <Heart className="w-5 h-5 text-pink-300 shrink-0" />
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

export default function BiologyTab({ mode, patient, labResults }: BiologyTabProps) {
  if (mode === 'pregnancy') {
    return <PregnancyBiology patient={patient} labResults={labResults || []} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5 rounded-2xl flex flex-col gap-3"
      >
         <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/80 mb-1">Today Your Biology Is In</h2>
         <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
               <span className="text-foreground font-medium text-lg">Ovulatory Hormone Rise</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
               <span className="text-foreground font-medium text-lg">High Metabolic Flexibility</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
               <span className="text-foreground font-medium text-lg">Social & Cognitive Peak</span>
            </div>
         </div>
      </motion.div>

      <div className="relative">
         <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-xl font-serif text-foreground">Hormone Landscape</h3>
            <span className="text-xs font-medium text-muted-foreground bg-white/50 px-2 py-1 rounded-full">Day 14</span>
         </div>
         
         <Card className="overflow-hidden border-none shadow-sm relative group cursor-pointer transition-all hover:shadow-md">
            <div 
               className="absolute inset-0 opacity-10 pointer-events-none"
               style={{ backgroundImage: `url(${hormoneWaveBg})`, backgroundSize: 'cover' }}
            />
            
            <CardContent className="p-0 h-[220px] relative">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hormoneData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                     <defs>
                        <linearGradient id="colorEst" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#d8b4fe" stopOpacity={0.4}/>
                           <stop offset="95%" stopColor="#d8b4fe" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProg" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.4}/>
                           <stop offset="95%" stopColor="#fca5a5" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
                        cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                     />
                     <Area type="monotone" dataKey="est" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorEst)" />
                     <Area type="monotone" dataKey="prog" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorProg)" />
                  </AreaChart>
               </ResponsiveContainer>
               
               <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute left-[50%] top-[20%] -translate-x-1/2 flex flex-col items-center gap-2"
               >
                  <div className="w-4 h-4 rounded-full bg-white border-4 border-primary shadow-[0_0_15px_rgba(236,72,153,0.6)] animate-pulse"></div>
                  <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-white/50 text-xs font-medium max-w-[140px] text-center">
                     Estrogen Surge
                     <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">Supports confidence & verbal fluency</span>
                  </div>
               </motion.div>
            </CardContent>
         </Card>
      </div>

      <div>
         <h3 className="text-xl font-serif text-foreground mb-4 px-1">Metabolic State</h3>
         <Card className="border-none bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-orange-200/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <CardContent className="p-6 relative z-10">
               <div className="flex items-start justify-between mb-4">
                  <div>
                     <h4 className="text-lg font-medium text-orange-900 mb-1">Carb Tolerant Phase</h4>
                     <p className="text-sm text-orange-700/80">Your insulin sensitivity is peaking.</p>
                  </div>
                  <div className="bg-white/50 p-2.5 rounded-full text-orange-600">
                     <Flame className="w-5 h-5" />
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white/60 rounded-lg p-3">
                     <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Insulin</div>
                     <div className="font-semibold text-foreground flex items-center gap-1">
                        High <TrendingUp className="w-3 h-3 text-emerald-500" />
                     </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                     <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recovery</div>
                     <div className="font-semibold text-foreground flex items-center gap-1">
                        Fast <Zap className="w-3 h-3 text-amber-500" />
                     </div>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="relative">
         <div className="flex items-center gap-2 mb-4 px-1">
            <h3 className="text-xl font-serif text-foreground">Your Biological Blueprint</h3>
            <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-100">Genomics</Badge>
         </div>

         <div className="space-y-3">
            <Accordion type="single" collapsible className="space-y-3">
               <AccordionItem value="item-1" className="border-none glass-panel rounded-xl px-4 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline py-4">
                     <div className="flex items-center gap-4 text-left w-full">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                           <Dna className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                           <p className="font-medium text-foreground text-sm">Estrogen Metabolism</p>
                           <p className="text-xs text-muted-foreground">Genetically slightly slower</p>
                        </div>
                     </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pl-[3.5rem] pr-2">
                     <div className="text-sm text-muted-foreground leading-relaxed">
                        This means estrogen may linger in your system longer. You might experience stronger pre-period symptoms but better skin and bone protection.
                        <div className="mt-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50 text-xs text-indigo-900 font-medium">
                           Tip: Cruciferous vegetables help clear excess estrogen effectively.
                        </div>
                     </div>
                  </AccordionContent>
               </AccordionItem>
               
               <AccordionItem value="item-2" className="border-none glass-panel rounded-xl px-4 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline py-4">
                     <div className="flex items-center gap-4 text-left w-full">
                        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                           <Zap className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                           <p className="font-medium text-foreground text-sm">Inflammation Response</p>
                           <p className="text-xs text-muted-foreground">Elevated late cycle</p>
                        </div>
                     </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pl-[3.5rem] pr-2">
                     <div className="text-sm text-muted-foreground leading-relaxed">
                        Your genes suggest a stronger inflammatory reaction during the luteal phase, which may cause joint sensitivity or puffiness.
                     </div>
                  </AccordionContent>
               </AccordionItem>
            </Accordion>
         </div>
      </div>

      <div>
         <h3 className="text-xl font-serif text-foreground mb-4 px-1">Mind & Nervous System</h3>
         <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
               <Brain className="w-5 h-5 text-purple-500" />
               <div className="text-xs font-medium text-muted-foreground">Social Confidence</div>
               <div className="text-sm font-bold text-foreground">High</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
               <Sparkles className="w-5 h-5 text-amber-500" />
               <div className="text-xs font-medium text-muted-foreground">Verbal Fluency</div>
               <div className="text-sm font-bold text-foreground">Peak</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col items-center text-center gap-2">
               <Moon className="w-5 h-5 text-blue-500" />
               <div className="text-xs font-medium text-muted-foreground">Sleep Depth</div>
               <div className="text-sm font-bold text-foreground">Lighter</div>
            </div>
         </div>
      </div>

      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-lg">
         <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
         <p className="text-xs font-medium leading-relaxed">
            Science Nudge: High estrogen can improve pain tolerance. Good day for waxing or deep tissue massage.
         </p>
      </div>

    </div>
  );
}
