import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip 
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
  ChevronDown
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
  { day: 14, est: 95, prog: 8, lh: 40, fsh: 15 }, // Ovulation
  { day: 16, est: 50, prog: 20, lh: 10, fsh: 6 },
  { day: 20, est: 40, prog: 60, lh: 5, fsh: 4 },
  { day: 24, est: 30, prog: 50, lh: 4, fsh: 4 },
  { day: 28, est: 25, prog: 10, lh: 4, fsh: 8 },
];

export default function BiologyTab() {
  const [activeTrait, setActiveTrait] = useState<string | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      
      {/* 1. TOP HERO: "Your Body Today" */}
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

      {/* 2. HORMONE RHYTHM SECTION */}
      <div className="relative">
         <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-xl font-serif text-foreground">Hormone Landscape</h3>
            <span className="text-xs font-medium text-muted-foreground bg-white/50 px-2 py-1 rounded-full">Day 14</span>
         </div>
         
         <Card className="overflow-hidden border-none shadow-sm relative group cursor-pointer transition-all hover:shadow-md">
            {/* Background Image Layer */}
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
               
               {/* Glowing "Today" Dot */}
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

      {/* 3. METABOLIC MODE */}
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

      {/* 5. GENETIC TENDENCIES (Future-Ready) */}
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

      {/* 6. NERVOUS SYSTEM & MOOD */}
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

      {/* 7. SMART INSIGHT STRIP (Sticky Bottom or just bottom) */}
      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-lg">
         <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
         <p className="text-xs font-medium leading-relaxed">
            Science Nudge: High estrogen can improve pain tolerance. Good day for waxing or deep tissue massage.
         </p>
      </div>

    </div>
  );
}
