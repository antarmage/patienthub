import React, { useState } from "react";
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
  Coffee
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import forecastGradient from "../assets/images/forecast-gradient.png";

// Mock Forecast Data
const upcomingShifts = [
  { days: 4, event: "Progesterone Rise", icon: <Moon className="w-4 h-4 text-indigo-500"/>, impact: ["Lower social drive", "Deeper sleep", "Increased hunger"] },
  { days: 12, event: "Period Expected", icon: <AlertCircle className="w-4 h-4 text-rose-500"/>, impact: ["Reduce high-stress", "Iron-rich meals"] }
];

const planningWindows = [
  { activity: "Presentations", window: "Day 12–16", reason: "Verbal fluency peak", icon: <Briefcase className="w-4 h-4 text-purple-600"/>, best: true },
  { activity: "HIIT Workouts", window: "Day 13–18", reason: "Estrogen recovery boost", icon: <Flame className="w-4 h-4 text-orange-600"/>, best: true },
  { activity: "Deep Solo Work", window: "Late Luteal", reason: "Focused inward energy", icon: <Coffee className="w-4 h-4 text-amber-700"/>, best: false },
];

export default function InsightsTab() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      
      {/* 1. HERO: Cycle Timeline Forecast */}
      <div className="relative">
         <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-serif text-foreground">Cycle Forecast</h2>
            <Badge variant="outline" className="bg-white/40 border-primary/20 text-primary">Next 14 Days</Badge>
         </div>

         {/* Horizontal Scrollable Timeline Strip */}
         <ScrollArea className="w-full whitespace-nowrap rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md p-4">
            <div className="flex w-max space-x-3">
               {Array.from({ length: 14 }).map((_, i) => {
                  const dayNum = 14 + i;
                  const isToday = i === 0;
                  // Mock phases
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
                        {/* Phase Marker */}
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

      {/* 2. UPCOMING BIOLOGY SHIFTS */}
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

      {/* 3. LIFE PLANNING OPTIMIZER */}
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

      {/* 4. MOOD & NERVOUS SYSTEM FORECAST */}
      <div>
         <h3 className="text-lg font-serif text-foreground px-1 mb-4">Emotional Rhythm Ahead</h3>
         <Card className="glass-panel border-none p-6">
            <div className="flex items-end gap-2 h-32 mb-4 px-2">
               {/* Mock Bar Chart using divs for custom aesthetic */}
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
      
      {/* 8. SMART PREPARATION ALERTS */}
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
