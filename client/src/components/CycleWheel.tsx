import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudSun, Moon, Brain, Activity, Droplets, ThermometerSun, ChevronRight } from "lucide-react";
import cycleGlowTexture from "../assets/images/cycle-glow-texture.png";

export function CycleWheel({ mode = "general" }: { mode?: string }) {
  const [activeDay, setActiveDay] = useState(14); // Ovulation
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);

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
    // Colors adapt based on mode slightly
    if (mode === "ttc") {
       switch (phase) {
        case "Menstrual": return "stroke-rose-300";
        case "Follicular": return "stroke-orange-300"; // Warmer
        case "Ovulation": return "stroke-red-400"; // High alert
        case "Luteal": return "stroke-amber-300";
        default: return "stroke-gray-200";
      }
    }
    
    switch (phase) {
      case "Menstrual": return "stroke-rose-300";
      case "Follicular": return "stroke-purple-300";
      case "Ovulation": return "stroke-emerald-300";
      case "Luteal": return "stroke-amber-300";
      default: return "stroke-gray-200";
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[340px] mx-auto my-12">
      
      {/* Background Glow Texture - Subtle ambience */}
      <div 
        className="absolute inset-[-20%] z-0 opacity-40 animate-pulse-slow pointer-events-none transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${cycleGlowTexture})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Central Info Display - The Emotional Anchor */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 p-8">
        <AnimatePresence mode="wait">
        <motion.div 
          key={activeDay}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className="relative z-20 flex flex-col items-center justify-center"
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-2 font-medium">Day {activeDay}</span>
          
          <h3 className="text-3xl font-serif font-medium text-foreground mb-1 tracking-tight">
             {getPhase(activeDay)}
          </h3>
          
          {/* Status Dots */}
          <div className="flex gap-1.5 mt-2 mb-4">
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-primary/80"></motion.span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/30"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/30"></span>
          </div>

          <p className="text-sm text-center text-muted-foreground leading-relaxed max-w-[180px] font-medium">
            {activeDay === 14 ? "Peak fertility window. Energy levels are high." : 
             activeDay < 6 ? "Rest & recover. Low energy." : 
             activeDay > 20 ? "Winding down. Prepare for reset." : "Rising energy & focus."}
          </p>
          
          {/* Action Button */}
          <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="mt-4 px-4 py-1.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-full text-xs font-medium text-primary shadow-sm hover:bg-white/80 transition-colors flex items-center gap-1"
          >
             View Insights <ChevronRight className="w-3 h-3" />
          </motion.button>

        </motion.div>
        </AnimatePresence>
      </div>

      {/* Interactive Wheel SVG */}
      <svg className="w-full h-full rotate-[-90deg] relative z-10 filter drop-shadow-sm" viewBox="0 0 100 100">
        {/* Background Track - Subtle & Glassy */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="12" />
        
        {/* Active Day Indicator (Needle or Highlight) */}
        
        {/* Segments */}
        {cycleDays.map((day, index) => {
          const circumference = 2 * Math.PI * 42;
          const segmentLength = circumference / 28;
          const gap = 0.8; 
          const dashArray = `${segmentLength - gap} ${circumference - (segmentLength - gap)}`;
          const rotation = (index * 360) / 28;
          const isFuture = day > activeDay;
          
          return (
            <motion.circle
              key={day}
              cx="50"
              cy="50"
              r="42"
              fill="none"
              initial={false}
              animate={{ 
                 strokeWidth: activeDay === day ? 14 : 10,
                 opacity: isFuture ? 0.3 : 1
              }}
              className={`cursor-pointer transition-colors duration-500 ease-out ${getPhaseColor(day)} ${activeDay === day ? '' : 'hover:opacity-80'}`}
              strokeDasharray={dashArray}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform={`rotate(${rotation} 50 50)`}
              onClick={() => setActiveDay(day)}
              whileHover={{ strokeWidth: 12 }}
            />
          );
        })}
      </svg>
      
      {/* Interactive Satellite Buttons */}
      <SatelliteButton 
         position="top" 
         icon={<Brain className="w-3.5 h-3.5" />} 
         label="Focus" 
         isActive={hoveredSystem === 'focus'}
         onHover={() => setHoveredSystem('focus')}
         onLeave={() => setHoveredSystem(null)}
      />
      <SatelliteButton 
         position="bottom" 
         icon={<Droplets className="w-3.5 h-3.5" />} 
         label="Hormones"
         isActive={hoveredSystem === 'hormones'}
         onHover={() => setHoveredSystem('hormones')}
         onLeave={() => setHoveredSystem(null)}
      />
      <SatelliteButton 
         position="left" 
         icon={<ThermometerSun className="w-3.5 h-3.5" />} 
         label="Temp"
         isActive={hoveredSystem === 'temp'}
         onHover={() => setHoveredSystem('temp')}
         onLeave={() => setHoveredSystem(null)}
      />
      <SatelliteButton 
         position="right" 
         icon={<Activity className="w-3.5 h-3.5" />} 
         label="Metabolism"
         isActive={hoveredSystem === 'metabolism'}
         onHover={() => setHoveredSystem('metabolism')}
         onLeave={() => setHoveredSystem(null)}
      />

    </div>
  );
}

function SatelliteButton({ position, icon, label, isActive, onHover, onLeave }: any) {
   const positionClasses: Record<string, string> = {
      top: "top-0 left-1/2 -translate-x-1/2 -mt-2",
      bottom: "bottom-0 left-1/2 -translate-x-1/2 -mb-2",
      left: "left-0 top-1/2 -translate-y-1/2 -ml-2",
      right: "right-0 top-1/2 -translate-y-1/2 -mr-2"
   };

   return (
      <motion.button
         onMouseEnter={onHover}
         onMouseLeave={onLeave}
         animate={{ 
            scale: isActive ? 1.1 : 1,
            boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.08)" : "0 2px 4px rgba(0,0,0,0.02)"
         }}
         className={`absolute ${positionClasses[position]} bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/60 transition-colors z-30 group`}
      >
         <div className={`text-muted-foreground group-hover:text-primary transition-colors duration-300`}>
            {icon}
         </div>
         <span className={`text-[10px] font-medium uppercase tracking-wide text-muted-foreground group-hover:text-foreground transition-colors duration-300`}>
            {label}
         </span>
      </motion.button>
   )
}
