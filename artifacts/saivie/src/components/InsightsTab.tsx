import React, { useState } from "react";
import WeekByWeekTimeline from "@/components/WeekByWeekTimeline";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Brain, 
  Moon, 
  Users, 
  Dumbbell, 
  Briefcase, 
  Heart,
  AlertCircle,
  ArrowRight,
  Flame,
  Coffee,
  Baby,
  ShieldCheck,
  Apple,
  Stethoscope,
  Clock,
  CheckCircle2,
  Star,
  BookOpen,
  Activity,
  Droplets
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";

const upcomingShifts = [
  { days: 4, event: "Progesterone Rise", icon: <Moon className="w-4 h-4 text-indigo-500"/>, impact: ["Lower social drive", "Deeper sleep", "Increased hunger"] },
  { days: 12, event: "Period Expected", icon: <AlertCircle className="w-4 h-4 text-rose-500"/>, impact: ["Reduce high-stress", "Iron-rich meals"] }
];

const planningWindows = [
  { activity: "Presentations", window: "Day 12–16", reason: "Verbal fluency peak", icon: <Briefcase className="w-4 h-4 text-purple-600"/>, best: true },
  { activity: "HIIT Workouts", window: "Day 13–18", reason: "Estrogen recovery boost", icon: <Flame className="w-4 h-4 text-orange-600"/>, best: true },
  { activity: "Deep Solo Work", window: "Late Luteal", reason: "Focused inward energy", icon: <Coffee className="w-4 h-4 text-amber-700"/>, best: false },
];

interface InsightsTabProps {
  mode?: string;
  patient?: any;
}

function getPregnancyWeek(lmp: string | undefined) {
  if (!lmp) return 0;
  const diffDays = Math.floor((new Date().getTime() - new Date(lmp).getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

function PregnancyInsights({ patient }: { patient: any }) {
  const weeks = getPregnancyWeek(patient?.lmp);
  const trimester = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
  const dueDate = patient?.lmp ? new Date(new Date(patient.lmp).getTime() + 280 * 24 * 60 * 60 * 1000) : null;
  const weeksLeft = dueDate ? Math.max(0, Math.ceil((dueDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0;

  const milestones = trimester === 1
    ? [
        { week: weeks + 1, event: "Heartbeat Visible", icon: <Heart className="w-4 h-4 text-rose-500" />, tips: ["Avoid heavy lifting", "Continue folic acid", "Stay hydrated"] },
        { week: weeks + 3, event: "First Ultrasound", icon: <Stethoscope className="w-4 h-4 text-blue-500" />, tips: ["Prepare questions for doctor", "Drink water before scan"] },
      ]
    : trimester === 2
    ? [
        { week: weeks + 2, event: "Anatomy Scan", icon: <Baby className="w-4 h-4 text-pink-500" />, tips: ["Full bladder may be needed", "You might learn the gender"] },
        { week: weeks + 4, event: "Glucose Test", icon: <Droplets className="w-4 h-4 text-amber-500" />, tips: ["Fasting may be required", "Results check for gestational diabetes"] },
      ]
    : [
        { week: weeks + 2, event: "Growth Scan", icon: <Baby className="w-4 h-4 text-pink-500" />, tips: ["Check baby's position", "Monitor amniotic fluid"] },
        { week: Math.min(weeks + 4, 40), event: "Prepare Hospital Bag", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, tips: ["Pack essentials for you and baby", "Keep documents ready"] },
      ];

  const weeklyTimeline = Array.from({ length: Math.min(8, weeksLeft + 1) }, (_, i) => {
    const w = weeks + i;
    const isNow = i === 0;
    const hasMilestone = w === 12 || w === 20 || w === 28 || w === 36 || w === 40;
    const milestoneLabel = w === 12 ? 'NT Scan' : w === 20 ? 'Anomaly Scan' : w === 28 ? 'Anti-D' : w === 36 ? 'GBS Test' : w === 40 ? 'Due Date' : null;
    return { week: w, isNow, hasMilestone, milestoneLabel };
  });

  const todayTips = trimester === 1
    ? [
        { tip: "Take your prenatal vitamins with food to reduce nausea", icon: <Apple className="w-4 h-4 text-emerald-500" />, category: "Nutrition" },
        { tip: "Gentle walking for 20 minutes helps with fatigue", icon: <Activity className="w-4 h-4 text-blue-500" />, category: "Exercise" },
        { tip: "Avoid raw or undercooked foods — your immunity is lower now", icon: <ShieldCheck className="w-4 h-4 text-amber-500" />, category: "Safety" },
      ]
    : trimester === 2
    ? [
        { tip: "Start sleeping on your left side for better blood flow to baby", icon: <Moon className="w-4 h-4 text-indigo-500" />, category: "Sleep" },
        { tip: "Include iron-rich foods — your blood volume is increasing rapidly", icon: <Droplets className="w-4 h-4 text-rose-500" />, category: "Nutrition" },
        { tip: "Kegel exercises now will help with delivery later", icon: <Activity className="w-4 h-4 text-purple-500" />, category: "Exercise" },
      ]
    : [
        { tip: "Practice breathing exercises daily — they help during labour", icon: <Brain className="w-4 h-4 text-purple-500" />, category: "Preparation" },
        { tip: "Eat 6 dates per day from week 36 — studies show it may ease labour", icon: <Apple className="w-4 h-4 text-amber-500" />, category: "Nutrition" },
        { tip: "Keep your hospital bag packed and ready by the door", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, category: "Preparation" },
      ];

  const babyDevelopment = trimester === 1
    ? ["Brain and spinal cord forming", "Heart starts beating", "Tiny limb buds appear", "Facial features developing"]
    : trimester === 2
    ? ["Baby can hear your voice", "Fingerprints are forming", "Eyes can sense light", "Baby practices swallowing"]
    : ["Lungs maturing for breathing", "Baby gains weight rapidly", "Sleep-wake cycles established", "Baby moves into head-down position"];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">

      {/* AI Watch Card — shown only when risk score is available */}
      {patient?.riskScore?.patientSummary && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="relative border-none bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 shadow-md overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 to-pink-400/10 pointer-events-none" />
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1">What to watch this week</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{patient.riskScore.patientSummary}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      patient.riskScore.level === 'Critical' ? 'bg-red-100 border-red-200 text-red-700' :
                      patient.riskScore.level === 'High' ? 'bg-orange-100 border-orange-200 text-orange-700' :
                      patient.riskScore.level === 'Medium' ? 'bg-amber-100 border-amber-200 text-amber-700' :
                      'bg-emerald-100 border-emerald-200 text-emerald-700'
                    }`}>{patient.riskScore.level} Risk</span>
                    <span className="text-[10px] text-slate-400">Updated by AI</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-serif text-foreground">Pregnancy Timeline</h2>
          <Badge variant="outline" className="bg-pink-50/60 border-pink-200 text-pink-700">
            {weeksLeft} weeks to go
          </Badge>
        </div>

        <ScrollArea className="w-full whitespace-nowrap rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md p-4">
          <div className="flex w-max space-x-3">
            {weeklyTimeline.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl min-w-[70px] cursor-pointer transition-all border ${item.isNow ? 'bg-white border-pink-300 shadow-md' : item.hasMilestone ? 'bg-pink-50/60 border-pink-100 hover:bg-pink-50' : 'bg-white/40 border-white/40 hover:bg-white/60'}`}
              >
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  {item.isNow ? 'Now' : `+${i}w`}
                </span>
                <div className={`text-lg font-serif font-medium ${item.isNow ? 'text-pink-600' : 'text-foreground'}`}>
                  W{item.week}
                </div>
                {item.hasMilestone && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                    <span className="text-[9px] text-pink-600 font-medium whitespace-nowrap">{item.milestoneLabel}</span>
                  </div>
                )}
                {item.isNow && !item.hasMilestone && (
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1" />
                )}
              </motion.div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <h3 className="text-lg font-serif text-foreground px-1">Upcoming Milestones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {milestones.map((milestone, i) => (
            <Card key={i} className="glass-panel border-none relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-pink-100 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
              <CardContent className="p-5 relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-white p-2 rounded-full shadow-sm">
                    {milestone.icon}
                  </div>
                  <Badge variant="secondary" className="bg-pink-50 text-pink-600 font-normal">
                    ~Week {milestone.week}
                  </Badge>
                </div>
                <h4 className="font-medium text-foreground text-base mb-2">{milestone.event}</h4>
                <ul className="space-y-1.5">
                  {milestone.tips.map((tip, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-pink-400" /> {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-50 to-rose-50 rounded-3xl -z-10 opacity-60" />
        <div className="p-6 rounded-3xl border border-white/40">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <h3 className="text-lg font-serif text-foreground">Today's Tips For You</h3>
          </div>
          <div className="space-y-3">
            {todayTips.map((item, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/60 p-4 rounded-xl border border-white/60">
                <div className="p-2.5 bg-white rounded-lg shadow-sm shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{item.tip}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-serif text-foreground px-1 mb-4">Baby's Development</h3>
        <Card className="glass-panel border-none p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-pink-50 rounded-full">
              <Baby className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">
                {trimester === 1 ? 'Foundations Being Built' : trimester === 2 ? 'Growing & Exploring' : 'Getting Ready'}
              </p>
              <p className="text-xs text-muted-foreground">What's happening inside right now</p>
            </div>
          </div>
          <div className="space-y-3">
            {babyDevelopment.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center shrink-0">
                  <Star className="w-3.5 h-3.5 text-pink-500" />
                </div>
                <p className="text-sm text-foreground">{item}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-serif text-foreground px-1 mb-4">Weekly Checklist</h3>
        <div className="space-y-2.5">
          {(trimester === 1
            ? ["Take folic acid supplement", "Drink 8+ glasses of water", "Avoid caffeine over 200mg", "Rest when you feel tired"]
            : trimester === 2
            ? ["Monitor baby movements daily", "Do pelvic floor exercises", "Eat calcium-rich foods", "Stay active with gentle exercise"]
            : ["Practice breathing techniques", "Monitor kick counts", "Prepare hospital bag", "Rest and conserve energy"]
          ).map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/50 p-3.5 rounded-xl border border-white/40">
              <div className="w-5 h-5 rounded-full border-2 border-pink-300 shrink-0" />
              <p className="text-sm text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-pink-900 text-pink-100 p-4 rounded-xl flex items-start gap-4 shadow-lg">
        <Brain className="w-5 h-5 text-pink-300 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium leading-relaxed mb-1">
            {trimester === 1 ? 'First Trimester Reminder' : trimester === 2 ? 'Second Trimester Note' : 'Final Stretch'}
          </p>
          <p className="text-xs text-pink-300">
            {trimester === 1
              ? "Nausea usually peaks around week 8-10 and improves by week 12-14. Hang in there — it's a sign of strong pregnancy hormones."
              : trimester === 2
              ? "You might feel baby's first movements (quickening) between weeks 18-22. It often feels like gentle flutters or bubbles."
              : `Only ${weeksLeft} weeks to go! Your baby is gaining about 200g per week now. Make sure to attend all check-ups and rest well.`}
          </p>
        </div>
      </div>

      {/* Week-by-Week Browsable Timeline */}
      <div>
        <h3 className="text-lg font-serif text-foreground px-1 mb-4">Week by Week Guide</h3>
        <WeekByWeekTimeline patient={patient} compact />
      </div>

    </div>
  );
}

export default function InsightsTab({ mode, patient }: InsightsTabProps) {
  if (mode === 'pregnancy') {
    return <PregnancyInsights patient={patient} />;
  }

  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">

      {/* AI Watch Card — shown only when risk score is available */}
      {patient?.riskScore?.patientSummary && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="relative border-none bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 shadow-md overflow-hidden" data-testid="card-ai-watch">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 to-pink-400/10 pointer-events-none" />
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1">What to watch this week</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{patient.riskScore.patientSummary}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      patient.riskScore.level === 'Critical' ? 'bg-red-100 border-red-200 text-red-700' :
                      patient.riskScore.level === 'High' ? 'bg-orange-100 border-orange-200 text-orange-700' :
                      patient.riskScore.level === 'Medium' ? 'bg-amber-100 border-amber-200 text-amber-700' :
                      'bg-emerald-100 border-emerald-200 text-emerald-700'
                    }`}>{patient.riskScore.level} Risk</span>
                    <span className="text-[10px] text-slate-400">Updated by AI</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      <div className="relative">
         <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-serif text-foreground">Cycle Forecast</h2>
            <Badge variant="outline" className="bg-white/40 border-primary/20 text-primary">Next 14 Days</Badge>
         </div>

         <ScrollArea className="w-full whitespace-nowrap rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md p-4">
            <div className="flex w-max space-x-3">
               {Array.from({ length: 14 }).map((_, i) => {
                  const dayNum = 14 + i;
                  const isToday = i === 0;
                  const isHighEnergy = dayNum >= 14 && dayNum <= 16;
                  const isLuteal = dayNum > 16;
                  
                  return (
                     <motion.div 
                        key={i}
                        whileHover={{ y: -4 }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl min-w-[70px] cursor-pointer transition-all border ${isToday ? 'bg-white border-primary/30 shadow-md' : 'bg-white/40 border-white/40 hover:bg-white/60'}`}
                     >
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">{i === 0 ? 'Today' : `Run +${i}d`}</span>
                        <div className={`text-lg font-serif font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                           {dayNum > 28 ? dayNum - 28 : dayNum}
                        </div>
                        <div className="flex flex-col items-center gap-1 mt-1">
                           {isHighEnergy && <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>}
                           {isLuteal && <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>}
                           
                           {isHighEnergy && <span className="text-[9px] text-orange-600 font-medium">Energy</span>}
                           {isLuteal && <span className="text-[9px] text-indigo-500 font-medium">Focus</span>}
                        </div>
                     </motion.div>
                  )
               })}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
         </ScrollArea>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <h3 className="text-lg font-serif text-foreground px-1">Next Biological Changes</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingShifts.map((shift, i) => (
               <Card key={i} className="glass-panel border-none relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <CardContent className="p-5 relative z-10">
                     <div className="flex justify-between items-start mb-3">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                           {shift.icon}
                        </div>
                        <Badge variant="secondary" className="bg-white/50 text-muted-foreground font-normal">In {shift.days} days</Badge>
                     </div>
                     <h4 className="font-medium text-foreground text-base mb-2">{shift.event}</h4>
                     <ul className="space-y-1.5">
                        {shift.impact.map((item, idx) => (
                           <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-primary/40"></div> {item}
                           </li>
                        ))}
                     </ul>
                  </CardContent>
               </Card>
            ))}
         </div>
      </div>

      <div className="relative">
         <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl -z-10 opacity-60"></div>
         <div className="p-6 rounded-3xl border border-white/40">
            <div className="flex items-center gap-2 mb-6">
               <Sparkles className="w-5 h-5 text-purple-500" />
               <h3 className="text-lg font-serif text-foreground">Best Timing For...</h3>
            </div>
            
            <div className="space-y-3">
               {planningWindows.map((plan, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/60 p-4 rounded-xl border border-white/60 hover:bg-white/80 transition-colors cursor-pointer group">
                     <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white rounded-lg shadow-sm text-foreground group-hover:text-primary transition-colors">
                           {plan.icon}
                        </div>
                        <div>
                           <p className="font-medium text-sm text-foreground">{plan.activity}</p>
                           <p className="text-xs text-muted-foreground">{plan.reason}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <Badge variant={plan.best ? "default" : "secondary"} className={plan.best ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none" : "bg-slate-100 text-slate-600"}>
                           {plan.window}
                        </Badge>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      <div>
         <h3 className="text-lg font-serif text-foreground px-1 mb-4">Emotional Rhythm Ahead</h3>
         <Card className="glass-panel border-none p-6">
            <div className="flex items-end gap-2 h-32 mb-4 px-2">
               {[40, 50, 70, 85, 90, 80, 60].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-2 group cursor-pointer">
                     <div 
                        className="w-full rounded-t-lg bg-gradient-to-t from-indigo-300 to-purple-300 opacity-60 group-hover:opacity-100 transition-all relative"
                        style={{ height: `${height}%` }}
                     >
                        {i === 4 && (
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded shadow-sm text-[10px] whitespace-nowrap font-medium text-indigo-600">
                              Confidence Peak
                           </div>
                        )}
                     </div>
                  </div>
               ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider px-2">
               <span>Mon</span>
               <span>Wed</span>
               <span>Fri</span>
               <span>Sun</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
               "Your nervous system resilience is peaking mid-week. Great time for social events."
            </p>
         </Card>
      </div>
      
      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl flex items-start gap-4 shadow-lg">
         <Brain className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
         <div>
            <p className="text-sm font-medium leading-relaxed mb-1">
               Planning Insight
            </p>
            <p className="text-xs text-slate-400">
               Your lower-energy phase starts in 3 days. Consider rescheduling heavy tasks for early next week.
            </p>
         </div>
      </div>

    </div>
  );
}
