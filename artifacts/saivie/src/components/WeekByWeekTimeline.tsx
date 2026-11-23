import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Baby, Utensils, ShieldCheck, Activity, ChevronLeft, ChevronRight, X
} from "lucide-react";
import pregnancyWeekByWeek from "@/data/pregnancyWeekByWeek.json";

export interface WeekData {
  fruit: string; emoji: string; length: string; weight: string;
  development: string[]; symptoms: string[]; dos: string[]; donts: string[]; nutrition: string;
}

export const WEEK_DATA: Record<string, WeekData> = pregnancyWeekByWeek;

export function getWeekData(week: number) {
  const clamped = Math.max(1, Math.min(40, week));
  const keys = Object.keys(WEEK_DATA).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
  return WEEK_DATA[String(closest)];
}

export function getWeekSizeLabel(week: number) {
  const fruit = getWeekData(week).fruit.toLowerCase();
  return `${/^[aeiou]/i.test(fruit) ? "an" : "a"} ${fruit}`;
}

interface Props { patient: any; compact?: boolean; }

export default function WeekByWeekTimeline({ patient, compact = false }: Props) {
  const currentWeek = patient?.lmp
    ? Math.min(40, Math.max(1, Math.floor((new Date().getTime() - new Date(patient.lmp).getTime()) / (7 * 24 * 60 * 60 * 1000))))
    : 20;
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const scrollRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      const btn = scrollRef.current.querySelector(`[data-week="${currentWeek}"]`);
      btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentWeek]);

  const data = getWeekData(selectedWeek);

  return (
    <div className={compact ? "space-y-3" : "space-y-4 animate-in fade-in duration-500"}>
      {!compact && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-serif font-semibold text-saivie-plum">Week by Week Guide</h3>
          <Badge className="text-[10px] bg-saivie-blush text-saivie-plum border-saivie-blush">Week {currentWeek} now</Badge>
        </div>
      )}

      {/* Week Selector */}
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {Array.from({ length: 40 }, (_, i) => i + 1).map(week => (
          <button key={week} data-week={week} onClick={() => setSelectedWeek(week)}
            className={`shrink-0 w-10 h-10 rounded-full text-xs font-bold transition-all border ${week === selectedWeek ? "bg-saivie-rose text-white border-saivie-blush shadow" : week === currentWeek ? "bg-saivie-blush text-saivie-plum border-saivie-blush" : "bg-saivie-ivory/60 text-saivie-plum border-white/60 hover:border-saivie-blush"}`}>
            {week}
          </button>
        ))}
      </div>

      {/* Week Detail Card */}
      <AnimatePresence mode="wait">
        <motion.div key={selectedWeek} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          <Card className="border-saivie-blush/40 overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-saivie-surface-blush/70 via-rose-50/30 to-saivie-ivory/60" />
            <CardContent className="relative p-5 z-10 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="text-5xl">{data.emoji}</div>
                <div>
                  <p className="text-[10px] text-saivie-rose uppercase tracking-wider font-semibold">Week {selectedWeek}</p>
                  <p className="text-lg font-serif text-saivie-plum font-semibold">{data.fruit}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-saivie-plum">📏 {data.length}</span>
                    <span className="text-xs text-saivie-plum">⚖️ {data.weight}</span>
                  </div>
                </div>
                <div className="ml-auto">
                  <Badge className={`text-[10px] ${selectedWeek < 13 ? "bg-saivie-sage text-saivie-teal border-saivie-border" : selectedWeek < 28 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-rose-100 text-rose-700 border-rose-200"}`}>
                    {selectedWeek < 13 ? "T1" : selectedWeek < 28 ? "T2" : "T3"}
                  </Badge>
                </div>
              </div>

              {/* Development */}
              <div>
                <p className="text-xs font-semibold text-saivie-plum uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Baby className="w-3.5 h-3.5 text-saivie-rose" />Baby's Development
                </p>
                <div className="space-y-1">
                  {data.development.map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-saivie-rose mt-1.5 shrink-0" />
                      <p className="text-sm text-saivie-plum">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <p className="text-xs font-semibold text-saivie-plum uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />Common Symptoms
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.symptoms.map((s, i) => (
                    <span key={i} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-0.5">{s}</span>
                  ))}
                </div>
              </div>

              {/* Dos and Don'ts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Do</p>
                  <div className="space-y-1">
                    {data.dos.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <p className="text-xs text-saivie-plum leading-relaxed">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-600 mb-1.5 flex items-center gap-1"><X className="w-3.5 h-3.5" />Avoid</p>
                  <div className="space-y-1">
                    {data.donts.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <p className="text-xs text-saivie-plum leading-relaxed">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nutrition tip */}
              <div className="bg-emerald-50 rounded-xl px-4 py-3 flex items-start gap-3">
                <Utensils className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <span className="font-semibold">Nutrition: </span>{data.nutrition}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Week nav buttons */}
      <div className="flex justify-between items-center">
        <button onClick={() => setSelectedWeek(w => Math.max(4, w - 1))} disabled={selectedWeek <= 4}
          className="flex items-center gap-1 text-xs text-saivie-plum hover:text-saivie-rose disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Prev week
        </button>
        <button onClick={() => setSelectedWeek(currentWeek)} className="text-xs text-saivie-rose hover:text-saivie-rose font-medium transition-colors">
          Jump to Week {currentWeek}
        </button>
        <button onClick={() => setSelectedWeek(w => Math.min(40, w + 1))} disabled={selectedWeek >= 40}
          className="flex items-center gap-1 text-xs text-saivie-plum hover:text-saivie-rose disabled:opacity-30 transition-colors">
          Next week <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
