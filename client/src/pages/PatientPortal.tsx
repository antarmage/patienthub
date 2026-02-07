import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { 
  Leaf, 
  Baby, 
  TestTube, 
  Sparkles, 
  ChevronRight, 
  Moon, 
  Sun, 
  Utensils, 
  Activity, 
  Brain,
  Info
} from "lucide-react";
import { CycleWheel } from "@/components/CycleWheel";
import calmGradient from "../assets/images/calm-gradient.png";

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState("home");
  const [mode, setMode] = useState("general"); // general, ttc, ivf

  return (
    <div className="min-h-screen bg-background pb-24 relative selection:bg-primary/20">
      {/* Background Layer */}
      <div 
        className="fixed inset-0 z-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url(${calmGradient})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Content Layer */}
      <div className="relative z-10 max-w-md mx-auto md:max-w-2xl px-4 py-6">
        
        {/* Header with Mode Switcher */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Good Morning, Ananya</h1>
            <p className="text-muted-foreground text-sm">Day 14 • Ovulation Phase</p>
          </div>
          
          <div className="relative group">
             <button className="flex items-center gap-2 bg-white/50 hover:bg-white/80 transition-colors backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/60 text-sm font-medium text-foreground shadow-sm">
                {mode === "general" && <><Leaf className="w-4 h-4 text-emerald-500" /> Cycle Health</>}
                {mode === "ttc" && <><Baby className="w-4 h-4 text-rose-500" /> Trying to Conceive</>}
                {mode === "ivf" && <><TestTube className="w-4 h-4 text-purple-500" /> IVF Support</>}
             </button>
             {/* Simple Dropdown for Mode Mockup */}
             <div className="absolute right-0 top-full mt-2 w-48 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 p-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all transform origin-top-right z-50">
                <button onClick={() => setMode("general")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary flex items-center gap-2 text-sm"><Leaf className="w-4 h-4 text-emerald-500" /> Cycle Health</button>
                <button onClick={() => setMode("ttc")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary flex items-center gap-2 text-sm"><Baby className="w-4 h-4 text-rose-500" /> TTC</button>
                <button onClick={() => setMode("ivf")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary flex items-center gap-2 text-sm"><TestTube className="w-4 h-4 text-purple-500" /> IVF Support</button>
             </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          
          <TabsContent value="home" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Top Insight Card */}
            <Card className="border-none shadow-lg overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-100 to-white opacity-80" />
              <CardContent className="relative p-6 pt-8">
                <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-primary/20 text-primary mb-3">
                  Key Insight
                </Badge>
                <h2 className="text-3xl font-serif text-slate-800 mb-2">Estrogen Rising</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm bg-white/60 px-2 py-1 rounded-md text-slate-600">Energy building</span>
                  <span className="text-sm bg-white/60 px-2 py-1 rounded-md text-slate-600">Social peak</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Your body is preparing for ovulation. You might feel more outgoing and mentally sharp today. Great time for complex tasks.
                </p>
                <button className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  See the science <ChevronRight className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>

            {/* Quick Insights Grid */}
            <div className="grid grid-cols-1 gap-4">
               <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white/60 backdrop-blur-sm border-white/50 hover:bg-white/80 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-serif text-sm text-foreground">Body Mode</h3>
                      <p className="text-xs text-muted-foreground mt-1">Carb metabolism efficient today.</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/60 backdrop-blur-sm border-white/50 hover:bg-white/80 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-serif text-sm text-foreground">Brain & Mood</h3>
                      <p className="text-xs text-muted-foreground mt-1">Social & mentally sharp.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="bg-white/60 backdrop-blur-sm border-white/50 hover:bg-white/80 transition-colors cursor-pointer">
                 <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="font-serif text-sm text-foreground">Reproductive Focus</h3>
                      <p className="text-xs text-muted-foreground">Fertility window approaching in ~3 days.</p>
                    </div>
                 </CardContent>
              </Card>
            </div>

            {/* Daily Guidance Feed */}
            <div className="space-y-4 pt-4">
               <h3 className="text-lg font-serif text-foreground px-1">Aligned With You</h3>
               
               <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm flex gap-4 items-start">
                  <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600 shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Nutrition Optimization</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">Your body is using protein efficiently. Try adding lentils, eggs, or paneer to your lunch.</p>
                  </div>
               </div>

               <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm flex gap-4 items-start">
                  <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shrink-0">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Sleep Temperature</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">Basal temperature is rising slightly. Keep your bedroom cool and dark tonight.</p>
                  </div>
               </div>
            </div>
          </TabsContent>

          <TabsContent value="biology" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif">Cycle Rhythm Map</h2>
              <p className="text-muted-foreground text-sm">Slide to see your body's weather forecast</p>
            </div>
            
            <CycleWheel />

            <div className="space-y-4">
              <h3 className="text-lg font-serif px-1">My Reproductive Blueprint</h3>
              <Accordion type="single" collapsible className="w-full bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 px-4">
                <AccordionItem value="item-1" className="border-b-black/5">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <div>
                        <span className="block font-medium text-sm text-foreground">Insulin Sensitivity Tendency</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm pb-4 pl-5">
                    <p className="mb-2">You may have a higher tendency for insulin resistance, especially during your luteal phase.</p>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-900 text-xs">
                      <strong>Tip:</strong> Focus on complex carbs and fiber-rich foods next week.
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <div>
                        <span className="block font-medium text-sm text-foreground">Antioxidant Usage</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm pb-4 pl-5">
                    <p className="mb-2">Your genetic markers suggest your body uses antioxidants faster than average.</p>
                     <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-purple-900 text-xs">
                      <strong>Tip:</strong> Increase berries and leafy greens during high-stress periods.
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/50 text-center py-12">
               <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
               <h3 className="text-xl font-serif mb-2">Pattern Discovery</h3>
               <p className="text-muted-foreground">We need about 2 more cycles of data to start showing you personalized correlations.</p>
             </div>
          </TabsContent>

        </Tabs>

        {/* Bottom Navigation */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-white/50 shadow-lg rounded-full px-6 py-3 flex items-center gap-8 z-50">
          <button 
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Sun className="w-5 h-5" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Today</span>
          </button>
          <button 
            onClick={() => setActiveTab("biology")}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'biology' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Activity className="w-5 h-5" strokeWidth={activeTab === 'biology' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Biology</span>
          </button>
          <button 
             onClick={() => setActiveTab("insights")}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'insights' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Sparkles className="w-5 h-5" strokeWidth={activeTab === 'insights' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Insights</span>
          </button>
        </div>

      </div>
    </div>
  );
}
