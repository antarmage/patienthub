import React, { useState } from "react";
import { motion } from "framer-motion";
import { CloudSun, Moon, Brain, Activity, Droplets, ThermometerSun } from "lucide-react";

export function CycleWheel() {
  const [activeDay, setActiveDay] = useState(14); // Ovulation

  // Simple mock data for the cycle
  const cycleDays = Array.from({ length: 28 }, (_, i) => i + 1);
  
  const getPhase = (day: number) => {
    if (day <= 5) return "Menstrual";
    if (day <= 13) return "Follicular";
    if (day === 14) return "Ovulation";
    if (day <= 28) return "Luteal";
    return "";
  };

  const getPhaseColor = (day: number) => {
    const phase = getPhase(day);
    switch (phase) {
      case "Menstrual": return "stroke-rose-300";
      case "Follicular": return "stroke-purple-300";
      case "Ovulation": return "stroke-emerald-300";
      case "Luteal": return "stroke-amber-300";
      default: return "stroke-gray-200";
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[320px] mx-auto my-8">
      {/* Central Info Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 p-8">
        <motion.div 
          key={activeDay}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-sm rounded-full p-6 shadow-sm border border-white/50 w-48 h-48 flex flex-col items-center justify-center"
        >
          <span className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Day {activeDay}</span>
          <h3 className="text-xl font-serif font-medium text-primary mb-1">{getPhase(activeDay)}</h3>
          <div className="flex gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3 leading-tight">
            {activeDay === 14 ? "Peak fertility window. Energy high." : 
             activeDay < 6 ? "Rest & recover. Low energy." : 
             activeDay > 20 ? "Winding down. Prepare for reset." : "Rising energy & focus."}
          </p>
        </motion.div>
      </div>

      {/* Interactive Wheel SVG */}
      <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
        {/* Background Track */}
        <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
        
        {/* Segments */}
        {cycleDays.map((day, index) => {
          const circumference = 2 * Math.PI * 40;
          const segmentLength = circumference / 28;
          const gap = 1; 
          const dashArray = `${segmentLength - gap} ${circumference - (segmentLength - gap)}`;
          const rotation = (index * 360) / 28;
          
          return (
            <circle
              key={day}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              className={`cursor-pointer transition-all duration-300 ${getPhaseColor(day)} ${activeDay === day ? 'stroke-[10px] opacity-100' : 'stroke-[6px] opacity-60 hover:opacity-80'}`}
              strokeDasharray={dashArray}
              strokeDashoffset={0}
              transform={`rotate(${rotation} 50 50)`}
              onClick={() => setActiveDay(day)}
            />
          );
        })}
      </svg>
      
      {/* Legend / Metrics around the wheel */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 bg-white/80 px-3 py-1 rounded-full text-[10px] shadow-sm font-medium text-purple-600 border border-purple-100 flex items-center gap-1">
        <Brain className="w-3 h-3" /> Focus
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -mb-4 bg-white/80 px-3 py-1 rounded-full text-[10px] shadow-sm font-medium text-rose-600 border border-rose-100 flex items-center gap-1">
        <Droplets className="w-3 h-3" /> Hormones
      </div>
      <div className="absolute left-0 top-1/2 -translate-x-1/2 -ml-2 bg-white/80 px-3 py-1 rounded-full text-[10px] shadow-sm font-medium text-amber-600 border border-amber-100 flex items-center gap-1">
        <ThermometerSun className="w-3 h-3" /> Temp
      </div>
       <div className="absolute right-0 top-1/2 translate-x-1/2 -mr-2 bg-white/80 px-3 py-1 rounded-full text-[10px] shadow-sm font-medium text-emerald-600 border border-emerald-100 flex items-center gap-1">
        <Activity className="w-3 h-3" /> Metabolism
      </div>
    </div>
  );
}
