import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
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
  Info,
  Wind,
  Heart,
  Pill,
  FlaskConical,
  CalendarDays,
  FileText,
  CheckCircle2,
  Clock,
  Stethoscope
} from "lucide-react";
import { CycleWheel } from "@/components/CycleWheel";
import calmGradient from "../assets/images/calm-gradient.png";
import softCardBg from "../assets/images/soft-card-bg.png";

import BiologyTab from "@/components/BiologyTab";
import InsightsTab from "@/components/InsightsTab";

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState("home");
  const [mode, setMode] = useState("general"); // general, ttc, ivf

  const storedPatient = (() => {
    try {
      const raw = localStorage.getItem("patientUser");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const patientId = storedPatient?.id?.toString() || new URLSearchParams(window.location.search).get('patientId') || '1';

  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => { const r = await fetch('/api/patients'); return r.json(); },
  });
  const patient = patients?.find((p: any) => p.id === parseInt(patientId)) || patients?.[0];

  const { data: visitHistory } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/visit-history`],
    queryFn: async () => { const r = await fetch(`/api/patients/${patient?.id}/visit-history`); return r.json(); },
    enabled: !!patient?.id,
  });

  const { data: medications } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/medications`],
    queryFn: async () => { const r = await fetch(`/api/patients/${patient?.id}/medications`); return r.json(); },
    enabled: !!patient?.id,
  });

  useEffect(() => {
     document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  return (
    <div className="min-h-screen bg-background pb-32 relative selection:bg-primary/20 overflow-hidden">
      {/* Background Layer - Dynamic based on scroll/mode */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${calmGradient})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Subtle Noise Texture Overlay */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      
      {/* Content Layer */}
      <div className="relative z-10 max-w-md mx-auto md:max-w-2xl px-5 py-6 flex flex-col min-h-screen">
        
        {/* Header with Mode Switcher - More Spacious */}
        <header className="flex justify-between items-start mb-6 pt-2">
          <motion.div 
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-serif text-foreground font-medium tracking-tight">
              {(() => {
                const h = new Date().getHours();
                return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
              })()}{patient?.name ? `, ${patient.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium tracking-wide opacity-80 uppercase">Day 14 • Ovulation Phase</p>
          </motion.div>
          
          <div className="relative group z-50">
             <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 bg-white/40 hover:bg-white/60 transition-colors backdrop-blur-xl px-4 py-2 rounded-full border border-white/40 text-xs font-medium text-foreground shadow-sm"
             >
                {mode === "general" && <><Leaf className="w-3.5 h-3.5 text-emerald-600" /> Cycle Health</>}
                {mode === "ttc" && <><Baby className="w-3.5 h-3.5 text-rose-500" /> Trying to Conceive</>}
                {mode === "ivf" && <><TestTube className="w-3.5 h-3.5 text-purple-500" /> IVF Support</>}
             </motion.button>
             
             {/* Dropdown */}
             <div className="absolute right-0 top-full mt-2 w-52 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-white/60 p-1.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all transform origin-top-right scale-95 group-hover:scale-100">
                <button onClick={() => setMode("general")} className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 flex items-center gap-3 text-sm transition-colors ${mode === 'general' ? 'bg-black/5 font-medium' : ''}`}>
                   <div className="p-1.5 bg-emerald-100 rounded-full"><Leaf className="w-3.5 h-3.5 text-emerald-600" /></div> Cycle Health
                </button>
                <button onClick={() => setMode("ttc")} className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 flex items-center gap-3 text-sm transition-colors ${mode === 'ttc' ? 'bg-black/5 font-medium' : ''}`}>
                   <div className="p-1.5 bg-rose-100 rounded-full"><Baby className="w-3.5 h-3.5 text-rose-600" /></div> TTC
                </button>
                <button onClick={() => setMode("ivf")} className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 flex items-center gap-3 text-sm transition-colors ${mode === 'ivf' ? 'bg-black/5 font-medium' : ''}`}>
                   <div className="p-1.5 bg-purple-100 rounded-full"><TestTube className="w-3.5 h-3.5 text-purple-600" /></div> IVF Support
                </button>
             </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 flex-1">
          
          <TabsContent value="home" className="space-y-10 animate-in fade-in duration-700">
            
            {/* HERO: Cycle Wheel - The Emotional Anchor */}
            <div className="relative">
               <CycleWheel mode={mode} />
            </div>

            {/* Insight Cards Section - "What this means for you today" */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
               >
                  <Card className="glass-panel border-white/60 hover:border-primary/20 transition-colors h-full overflow-hidden group">
                     <div 
                        className="absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-700"
                        style={{ backgroundImage: `url(${softCardBg})`, backgroundSize: 'cover' }}
                     />
                     <CardContent className="relative p-6 flex flex-col h-full justify-between z-10">
                        <div>
                           <div className="flex items-center gap-2 mb-3">
                              <span className="p-1.5 bg-amber-100/50 rounded-full text-amber-700"><Sun className="w-3.5 h-3.5" /></span>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Best use of energy</h4>
                           </div>
                           <p className="text-lg font-serif text-foreground leading-relaxed">
                              Your verbal skills and confidence are peaking. Schedule presentations or difficult conversations today.
                           </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center">
                           <span className="text-xs font-medium text-primary">Read Biology</span>
                           <ChevronRight className="w-4 h-4 text-primary/50 group-hover:translate-x-1 transition-transform" />
                        </div>
                     </CardContent>
                  </Card>
               </motion.div>

               <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
               >
                  <Card className="glass-panel border-white/60 hover:border-primary/20 transition-colors h-full overflow-hidden group">
                     <div 
                        className="absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-700"
                        style={{ backgroundImage: `url(${softCardBg})`, backgroundSize: 'cover' }}
                     />
                     <CardContent className="relative p-6 flex flex-col h-full justify-between z-10">
                        <div>
                           <div className="flex items-center gap-2 mb-3">
                              <span className="p-1.5 bg-blue-100/50 rounded-full text-blue-700"><Wind className="w-3.5 h-3.5" /></span>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Body Tip</h4>
                           </div>
                           <p className="text-lg font-serif text-foreground leading-relaxed">
                              Estrogen is high, helping you recover faster. You can push harder in your workout today.
                           </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center">
                           <span className="text-xs font-medium text-primary">See Workout Plan</span>
                           <ChevronRight className="w-4 h-4 text-primary/50 group-hover:translate-x-1 transition-transform" />
                        </div>
                     </CardContent>
                  </Card>
               </motion.div>
            </div>

            {/* Daily Guidance Feed - Styled more cleanly */}
            <div className="space-y-5 pb-8">
               <div className="flex items-center justify-between px-1">
                  <h3 className="text-lg font-serif text-foreground">Aligned With You</h3>
                  <button className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">View All</button>
               </div>
               
               <div className="space-y-3">
                  <GuidanceItem 
                     icon={<Utensils className="w-4 h-4" />} 
                     color="bg-orange-100 text-orange-700"
                     title="Nutrition Optimization"
                     desc="Your body is using protein efficiently. Try adding lentils, eggs, or paneer to your lunch."
                  />
                  <GuidanceItem 
                     icon={<Moon className="w-4 h-4" />} 
                     color="bg-indigo-100 text-indigo-700"
                     title="Sleep Temperature"
                     desc="Basal temperature is rising slightly. Keep your bedroom cool and dark tonight."
                  />
               </div>
            </div>
          </TabsContent>

          <TabsContent value="biology" className="animate-in slide-in-from-bottom-4 duration-500">
             <BiologyTab />
          </TabsContent>

          <TabsContent value="insights" className="animate-in slide-in-from-bottom-4 duration-500">
             <InsightsTab />
          </TabsContent>

          <TabsContent value="care" className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 pb-8">
            
            {/* Active Medications */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Pill className="w-4 h-4 text-blue-600" />
                <h3 className="text-lg font-serif text-foreground">My Medicines</h3>
              </div>
              {medications && medications.length > 0 ? (
                <div className="space-y-2">
                  {medications.filter((m: any) => m.status === 'active').map((med: any) => (
                    <Card key={med.id} className="glass-panel border-white/60" data-testid={`patient-med-${med.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm text-foreground">{med.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {[med.dose, med.frequency].filter(Boolean).join(' — ')}
                            </p>
                            {med.notes && <p className="text-xs text-muted-foreground/70 mt-1 italic">{med.notes}</p>}
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
                        </div>
                        {med.startDate && (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Started: {new Date(med.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {med.endDate && ` — Until: ${new Date(med.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {medications.filter((m: any) => m.status !== 'active').length > 0 && (
                    <Accordion type="single" collapsible>
                      <AccordionItem value="past-meds" className="border-0">
                        <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-2 px-1">
                          Past Medications ({medications.filter((m: any) => m.status !== 'active').length})
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                          {medications.filter((m: any) => m.status !== 'active').map((med: any) => (
                            <Card key={med.id} className="glass-panel border-white/40 opacity-70" data-testid={`patient-past-med-${med.id}`}>
                              <CardContent className="p-3">
                                <p className="font-medium text-xs text-foreground">{med.name}</p>
                                <p className="text-[11px] text-muted-foreground">{[med.dose, med.frequency].filter(Boolean).join(' — ')}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              ) : (
                <Card className="glass-panel border-white/60">
                  <CardContent className="p-6 text-center">
                    <Pill className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No medications prescribed yet</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Investigations / Tests */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <FlaskConical className="w-4 h-4 text-purple-600" />
                <h3 className="text-lg font-serif text-foreground">Investigations & Tests</h3>
              </div>
              {(() => {
                const latestVisit = visitHistory?.[0];
                const vitals = (latestVisit?.vitals as any) || {};
                const nextTests: string[] = vitals.nextInvestigationTests || [];
                const customInv = vitals.nextInvestigationCustom || '';
                const allTests = [...nextTests, ...(customInv ? [customInv] : [])];
                
                if (allTests.length === 0) {
                  return (
                    <Card className="glass-panel border-white/60">
                      <CardContent className="p-6 text-center">
                        <FlaskConical className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No investigations ordered currently</p>
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <div className="space-y-2">
                    {allTests.map((test, i) => (
                      <Card key={i} className="glass-panel border-white/60" data-testid={`patient-investigation-${i}`}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="p-2 bg-purple-100/50 rounded-xl shrink-0">
                            <FileText className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground">{test}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Ordered by your doctor</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </motion.div>

            {/* Treatment Trail / Visit History */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Stethoscope className="w-4 h-4 text-rose-500" />
                <h3 className="text-lg font-serif text-foreground">Treatment Trail</h3>
              </div>
              {visitHistory && visitHistory.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-rose-200 via-pink-100 to-transparent rounded-full" />
                  <div className="space-y-3">
                    {[...visitHistory].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 10).map((visit: any, idx: number) => {
                      const visitVitals = (visit.vitals as any) || {};
                      const visitDate = visit.date ? new Date(visit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown date';
                      return (
                        <div key={visit.id || idx} className="flex gap-3" data-testid={`patient-visit-${idx}`}>
                          <div className="relative z-10 mt-4">
                            <div className={`w-[10px] h-[10px] rounded-full border-2 ${idx === 0 ? 'bg-rose-500 border-rose-500' : 'bg-white border-rose-300'}`} />
                          </div>
                          <Card className="glass-panel border-white/60 flex-1">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs font-medium text-muted-foreground">{visitDate}</span>
                                </div>
                                {idx === 0 && <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">Latest</Badge>}
                              </div>
                              {visit.diagnosis && (
                                <p className="text-sm font-medium text-foreground mb-1">{visit.diagnosis}</p>
                              )}
                              {(visit.chiefComplaint || visit.subjective) && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-semibold">Concern:</span> {visit.chiefComplaint || visit.subjective}
                                </p>
                              )}
                              {visit.planNotes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  <span className="font-semibold">Plan:</span> {visit.planNotes}
                                </p>
                              )}
                              {(visitVitals.weight || visitVitals.bp) && (
                                <div className="flex gap-3 mt-2 pt-2 border-t border-black/5">
                                  {visitVitals.weight && <span className="text-[10px] text-muted-foreground">Wt: {visitVitals.weight} kg</span>}
                                  {visitVitals.bp && <span className="text-[10px] text-muted-foreground">BP: {visitVitals.bp}</span>}
                                  {visitVitals.pulse && <span className="text-[10px] text-muted-foreground">Pulse: {visitVitals.pulse}</span>}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card className="glass-panel border-white/60">
                  <CardContent className="p-6 text-center">
                    <Stethoscope className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No visits recorded yet</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>

          </TabsContent>

        </Tabs>

        {/* Premium Floating Navigation */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
           <div className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] rounded-full px-8 py-4 flex items-center gap-10 transition-all hover:bg-white/90">
             <NavButton 
               active={activeTab === 'home'} 
               onClick={() => setActiveTab('home')} 
               icon={<Sun className="w-5 h-5" />} 
               label="Today" 
             />
             <NavButton 
               active={activeTab === 'biology'} 
               onClick={() => setActiveTab('biology')} 
               icon={<Activity className="w-5 h-5" />} 
               label="Biology" 
             />
             <NavButton 
               active={activeTab === 'insights'} 
               onClick={() => setActiveTab('insights')} 
               icon={<Sparkles className="w-5 h-5" />} 
               label="Insights" 
             />
             <NavButton 
               active={activeTab === 'care'} 
               onClick={() => setActiveTab('care')} 
               icon={<Heart className="w-5 h-5" />} 
               label="My Care" 
             />
           </div>
        </div>

      </div>
    </div>
  );
}

function GuidanceItem({ icon, color, title, desc }: any) {
   return (
      <div className="glass-panel rounded-2xl p-5 flex gap-5 items-start card-hover group cursor-pointer">
         <div className={`${color} p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110 duration-300`}>
           {icon}
         </div>
         <div>
           <h4 className="font-medium text-foreground text-sm mb-1.5">{title}</h4>
           <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
         </div>
      </div>
   )
}

function NavButton({ active, onClick, icon, label }: any) {
   return (
      <button 
         onClick={onClick}
         className={`relative flex flex-col items-center gap-1.5 transition-all duration-300 group ${active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}
      >
         <div className={`transition-transform duration-300 ${active ? '-translate-y-1' : 'group-hover:-translate-y-0.5'}`}>
            {React.cloneElement(icon, { strokeWidth: active ? 2.5 : 2 })}
         </div>
         <span className={`text-[10px] font-medium tracking-wide ${active ? 'font-semibold' : ''}`}>{label}</span>
         
         {active && (
            <motion.div 
               layoutId="nav-dot"
               className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary"
            />
         )}
      </button>
   )
}
