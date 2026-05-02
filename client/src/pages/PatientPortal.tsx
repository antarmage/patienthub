import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  Stethoscope,
  CalendarPlus,
  X,
  ChevronLeft,
  User,
  Apple,
  Microscope
} from "lucide-react";
import { CycleWheel } from "@/components/CycleWheel";
import calmGradient from "../assets/images/calm-gradient.png";
import softCardBg from "../assets/images/soft-card-bg.png";

import BiologyTab from "@/components/BiologyTab";
import InsightsTab from "@/components/InsightsTab";
import PregnancyTrackersTab from "@/components/PregnancyTrackersTab";

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState("home");
  const [mode, setMode] = useState("general"); // general, ttc, ivf, pregnancy
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'type'|'date'|'confirm'|'done'>('type');
  const [bookingType, setBookingType] = useState<'doctor'|'nutritionist'|'blood_test'|null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const queryClient = useQueryClient();

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

  const isPregnant = (() => {
    if (!patient) return false;
    const ps = (patient.pregnancyStatus || '').toLowerCase();
    const cond = (patient.condition || '').toLowerCase();
    const status = (patient.status || '').toLowerCase();
    return ps.includes('pregnant') || ps.includes('active') || ps.includes('antenatal') ||
           cond.includes('pregnan') || cond.includes('antenatal') || cond.includes('anc') || cond.includes('gestational') ||
           status.includes('pregnant');
  })();

  const [modeInitialized, setModeInitialized] = useState(false);
  useEffect(() => {
    if (patient && !modeInitialized) {
      if (isPregnant) {
        setMode("pregnancy");
      }
      setModeInitialized(true);
    }
  }, [patient, isPregnant, modeInitialized]);

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

  const { data: pregnancyData } = useQuery({
    queryKey: [`/api/pregnancy-metrics?patientId=${patient?.id}`],
    queryFn: async () => { const r = await fetch(`/api/pregnancy-metrics?patientId=${patient?.id}`); return r.json(); },
    enabled: !!patient?.id && mode === 'pregnancy',
  });

  const { data: labResults } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/lab-results`],
    queryFn: async () => { const r = await fetch(`/api/patients/${patient?.id}/lab-results`); return r.json(); },
    enabled: !!patient?.id,
  });

  const { data: providers } = useQuery({
    queryKey: ['/api/providers'],
    queryFn: async () => { const r = await fetch('/api/providers'); return r.json(); },
  });

  const { data: patientAppointments } = useQuery({
    queryKey: [`/api/appointments?patientId=${patient?.id}`],
    queryFn: async () => { const r = await fetch(`/api/appointments?patientId=${patient?.id}`); return r.json(); },
    enabled: !!patient?.id,
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments?patientId=${patient?.id}`] });
    },
  });

  const openBooking = () => {
    setBookingStep('type');
    setBookingType(null);
    setBookingDate('');
    setBookingNote('');
    setBookingOpen(true);
  };

  const handleBookingConfirm = async () => {
    if (!patient?.id || !bookingDate || !bookingType) return;
    const typeMap: Record<string, string> = {
      doctor: 'Consultation',
      nutritionist: 'Nutrition Consultation',
      blood_test: 'Blood Test / Lab Work',
    };
    const doctor = providers?.find((p: any) => {
      if (bookingType === 'nutritionist') return (p.specialization || '').toLowerCase().includes('nutri');
      return true;
    });
    await bookingMutation.mutateAsync({
      patientId: patient.id,
      providerId: doctor?.id || providers?.[0]?.id || null,
      date: bookingDate,
      time: '10:00',
      type: typeMap[bookingType],
      status: 'Pending',
      notes: bookingNote || undefined,
    });
    setBookingStep('done');
  };

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
            <p className="text-muted-foreground text-sm mt-1 font-medium tracking-wide opacity-80 uppercase">
              {mode === 'pregnancy' ? (() => {
                const lmp = patient?.lmp;
                if (!lmp) return 'Pregnancy Mode';
                const weeks = Math.floor((new Date().getTime() - new Date(lmp).getTime()) / (1000 * 60 * 60 * 24 * 7));
                const trimester = weeks < 13 ? '1st Trimester' : weeks < 27 ? '2nd Trimester' : '3rd Trimester';
                return `Week ${weeks} • ${trimester}`;
              })() : 'Day 14 • Ovulation Phase'}
            </p>
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
                {mode === "pregnancy" && <><Heart className="w-3.5 h-3.5 text-pink-500" /> Pregnancy</>}
             </motion.button>
             
             {/* Dropdown */}
             <div className="absolute right-0 top-full mt-2 w-52 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-white/60 p-1.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all transform origin-top-right scale-95 group-hover:scale-100">
                <button onClick={() => setMode("general")} className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 flex items-center gap-3 text-sm transition-colors ${mode === 'general' ? 'bg-black/5 font-medium' : ''}`}>
                   <div className="p-1.5 bg-emerald-100 rounded-full"><Leaf className="w-3.5 h-3.5 text-emerald-600" /></div> Cycle Health
                </button>
                <button onClick={() => setMode("pregnancy")} className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 flex items-center gap-3 text-sm transition-colors ${mode === 'pregnancy' ? 'bg-black/5 font-medium' : ''}`}>
                   <div className="p-1.5 bg-pink-100 rounded-full"><Heart className="w-3.5 h-3.5 text-pink-600" /></div> Pregnancy
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
            
            {mode === 'pregnancy' ? (
              <>
                {/* Pregnancy Week Tracker */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="glass-panel border-pink-200/40 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 via-rose-50/40 to-white/60" />
                    <CardContent className="relative p-6 z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <Heart className="w-5 h-5 text-pink-500" />
                        <h3 className="text-lg font-serif text-foreground">Your Pregnancy Journey</h3>
                      </div>
                      {(() => {
                        const lmp = patient?.lmp;
                        if (lmp) {
                          const lmpDate = new Date(lmp);
                          const today = new Date();
                          const diffDays = Math.floor((today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
                          const weeks = Math.floor(diffDays / 7);
                          const days = diffDays % 7;
                          const trimester = weeks < 13 ? '1st' : weeks < 27 ? '2nd' : '3rd';
                          const edd = new Date(lmpDate);
                          edd.setDate(edd.getDate() + 280);
                          const daysLeft = Math.max(0, Math.floor((edd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                          const progress = Math.min(100, Math.round((diffDays / 280) * 100));

                          return (
                            <div className="space-y-4">
                              <div className="flex items-end gap-3">
                                <div>
                                  <p className="text-4xl font-serif text-pink-700 font-medium">{weeks}<span className="text-lg text-pink-400 ml-1">w</span> {days}<span className="text-lg text-pink-400 ml-1">d</span></p>
                                  <p className="text-xs text-muted-foreground mt-1">{trimester} Trimester</p>
                                </div>
                                <div className="ml-auto text-right">
                                  <p className="text-sm text-muted-foreground">Due Date</p>
                                  <p className="text-sm font-medium text-foreground">{edd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                  <p className="text-xs text-pink-500 font-medium">{daysLeft} days to go</p>
                                </div>
                              </div>
                              <div className="w-full bg-pink-100 rounded-full h-2">
                                <div className="bg-gradient-to-r from-pink-400 to-rose-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                              </div>
                              <p className="text-xs text-center text-muted-foreground">{progress}% of your journey completed</p>
                            </div>
                          );
                        }
                        return (
                          <p className="text-sm text-muted-foreground">Your pregnancy details will appear here once your LMP is recorded.</p>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pregnancy Insight Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                    <Card className="glass-panel border-white/60 hover:border-pink-200 transition-colors h-full overflow-hidden group">
                      <div className="absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: `url(${softCardBg})`, backgroundSize: 'cover' }} />
                      <CardContent className="relative p-6 flex flex-col h-full justify-between z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="p-1.5 bg-pink-100/50 rounded-full text-pink-700"><Heart className="w-3.5 h-3.5" /></span>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Baby's Growth</h4>
                          </div>
                          <p className="text-lg font-serif text-foreground leading-relaxed">
                            {(() => {
                              const lmp = patient?.lmp;
                              if (!lmp) return "Track your baby's growth milestones as your pregnancy progresses.";
                              const weeks = Math.floor((new Date().getTime() - new Date(lmp).getTime()) / (1000 * 60 * 60 * 24 * 7));
                              if (weeks < 8) return "Your baby's heart is starting to beat. All major organs are beginning to form.";
                              if (weeks < 13) return "Your baby can now move and stretch. Fingers and toes are forming. First trimester screening time.";
                              if (weeks < 20) return "Your baby can hear sounds now. You may start feeling gentle kicks and movements.";
                              if (weeks < 28) return "Your baby is growing rapidly, developing fat layers. Eyes can open and respond to light.";
                              if (weeks < 36) return "Your baby is gaining weight and practicing breathing. Getting into position for birth.";
                              return "Your baby is fully developed and ready to meet you. Stay relaxed and prepared.";
                            })()}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center">
                          <span className="text-xs font-medium text-pink-600">View Details</span>
                          <ChevronRight className="w-4 h-4 text-pink-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                    <Card className="glass-panel border-white/60 hover:border-pink-200 transition-colors h-full overflow-hidden group">
                      <div className="absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: `url(${softCardBg})`, backgroundSize: 'cover' }} />
                      <CardContent className="relative p-6 flex flex-col h-full justify-between z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="p-1.5 bg-amber-100/50 rounded-full text-amber-700"><Info className="w-3.5 h-3.5" /></span>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What to Expect</h4>
                          </div>
                          <p className="text-lg font-serif text-foreground leading-relaxed">
                            {(() => {
                              const lmp = patient?.lmp;
                              if (!lmp) return "Personalized pregnancy tips will appear based on your trimester.";
                              const weeks = Math.floor((new Date().getTime() - new Date(lmp).getTime()) / (1000 * 60 * 60 * 24 * 7));
                              if (weeks < 13) return "Nausea and fatigue are common now. Small, frequent meals and plenty of rest will help.";
                              if (weeks < 27) return "Energy levels are usually better now. A good time for gentle exercise and prenatal classes.";
                              return "You may feel Braxton Hicks contractions. Keep your hospital bag ready and rest well.";
                            })()}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center">
                          <span className="text-xs font-medium text-amber-600">Learn More</span>
                          <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Pregnancy Guidance Feed */}
                <div className="space-y-5 pb-8">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-lg font-serif text-foreground">Pregnancy Care Tips</h3>
                  </div>
                  <div className="space-y-3">
                    <GuidanceItem 
                      icon={<Utensils className="w-4 h-4" />} 
                      color="bg-orange-100 text-orange-700"
                      title="Nutrition for Two"
                      desc="Focus on iron-rich foods like spinach, dates, and jaggery. Take your folic acid and iron supplements as prescribed."
                    />
                    <GuidanceItem 
                      icon={<Activity className="w-4 h-4" />} 
                      color="bg-emerald-100 text-emerald-700"
                      title="Gentle Movement"
                      desc="A 20-minute walk after meals helps with digestion and blood sugar. Avoid heavy lifting and high-impact exercises."
                    />
                    <GuidanceItem 
                      icon={<Moon className="w-4 h-4" />} 
                      color="bg-indigo-100 text-indigo-700"
                      title="Rest & Sleep"
                      desc="Sleep on your left side for better blood flow. Use a pillow between your knees for comfort."
                    />
                    <GuidanceItem 
                      icon={<Brain className="w-4 h-4" />} 
                      color="bg-purple-100 text-purple-700"
                      title="Mental Wellbeing"
                      desc="Hormonal changes may affect your mood. Deep breathing, journaling, or talking to a loved one can help."
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* HERO: Cycle Wheel - The Emotional Anchor */}
                <div className="relative">
                   <CycleWheel mode={mode} />
                </div>

                {/* Insight Cards Section */}
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

                {/* Last Visit Summary Card */}
                {visitHistory && visitHistory.length > 0 && (() => {
                  const lastVisit = [...visitHistory].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
                  const daysSince = lastVisit?.date ? Math.floor((new Date().getTime() - new Date(lastVisit.date).getTime()) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                      <Card className="glass-panel border-white/60 overflow-hidden" data-testid="last-visit-card">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/60 via-purple-50/30 to-white/40" />
                        <CardContent className="relative p-5 z-10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-violet-100 rounded-full"><Stethoscope className="w-3.5 h-3.5 text-violet-600" /></span>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Visit</h4>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : daysSince != null ? `${daysSince} days ago` : ''}
                            </span>
                          </div>
                          {lastVisit?.diagnosis && (
                            <p className="text-base font-serif text-foreground mb-1">{lastVisit.diagnosis}</p>
                          )}
                          {(lastVisit?.chiefComplaint || lastVisit?.subjective) && (
                            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                              {lastVisit.chiefComplaint || lastVisit.subjective}
                            </p>
                          )}
                          {lastVisit?.planNotes && (
                            <div className="bg-white/50 rounded-xl px-3 py-2 mt-2">
                              <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Doctor's plan: </span>{lastVisit.planNotes}</p>
                            </div>
                          )}
                          <button
                            onClick={() => setActiveTab('care')}
                            className="mt-3 flex items-center gap-1 text-xs text-violet-600 font-medium hover:text-violet-800 transition-colors"
                          >
                            Full visit history <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })()}

                {/* Upcoming Appointment Banner */}
                {patientAppointments && (() => {
                  const upcoming = [...(patientAppointments as any[])].filter((a: any) => {
                    const s = (a.status || '').toLowerCase();
                    return s !== 'cancelled' && s !== 'completed' && a.date && new Date(a.date) >= new Date(new Date().toDateString());
                  }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
                  if (!upcoming) return null;
                  const daysUntil = Math.ceil((new Date(upcoming.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                      <Card className="glass-panel border-emerald-200/50 overflow-hidden" data-testid="upcoming-appt-card">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white/40" />
                        <CardContent className="relative p-4 z-10 flex items-center gap-4">
                          <div className="p-2.5 bg-emerald-100 rounded-2xl shrink-0">
                            <CalendarDays className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Upcoming Appointment</p>
                            <p className="text-sm font-medium text-foreground mt-0.5">
                              {new Date(upcoming.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}
                              {upcoming.time ? ` • ${upcoming.time}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">{upcoming.type || 'Consultation'}</p>
                          </div>
                          <Badge className={`text-[10px] shrink-0 ${daysUntil <= 1 ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                          </Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })()}

                {/* Quick Book CTA */}
                <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <button
                    onClick={openBooking}
                    className="w-full glass-panel border-white/60 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-white/60 transition-all text-left group"
                    data-testid="book-appointment-cta"
                  >
                    <div className="p-3 bg-primary/10 rounded-xl shrink-0 group-hover:bg-primary/15 transition-colors">
                      <CalendarPlus className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Book an Appointment</p>
                      <p className="text-xs text-muted-foreground">Doctor · Nutritionist · Blood Test</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </button>
                </motion.div>

                {/* Daily Guidance Feed */}
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
              </>
            )}
          </TabsContent>

          <TabsContent value="biology" className="animate-in slide-in-from-bottom-4 duration-500">
             <BiologyTab mode={mode} patient={patient} labResults={labResults} />
          </TabsContent>

          <TabsContent value="insights" className="animate-in slide-in-from-bottom-4 duration-500">
             <InsightsTab mode={mode} patient={patient} />
          </TabsContent>

          <TabsContent value="care" className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 pb-8">
            
            {mode === 'pregnancy' && (
              <>
                {/* Next Appointment */}
                {patient?.nextReview && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-none bg-gradient-to-br from-pink-50 to-rose-50 shadow-sm overflow-hidden">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 bg-pink-100 rounded-2xl shrink-0">
                          <CalendarDays className="w-6 h-6 text-pink-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Next Appointment</p>
                          <p className="text-lg font-serif text-pink-800 font-medium mt-0.5">
                            {new Date(patient.nextReview).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          {(() => {
                            const daysUntil = Math.ceil((new Date(patient.nextReview).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return daysUntil > 0 
                              ? <p className="text-xs text-pink-600 font-medium mt-0.5">{daysUntil} days from now</p>
                              : daysUntil === 0 
                              ? <Badge className="bg-pink-200 text-pink-800 border-none text-[10px] mt-1">Today</Badge>
                              : null;
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Pregnancy Vitals Trend */}
                {visitHistory && visitHistory.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Activity className="w-4 h-4 text-pink-600" />
                      <h3 className="text-lg font-serif text-foreground">Pregnancy Vitals Trend</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(() => {
                        const sorted = [...visitHistory].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
                        const latest = (sorted[0]?.vitals as any) || {};
                        const prev = sorted.length > 1 ? ((sorted[1]?.vitals as any) || {}) : null;
                        return (
                          <>
                            <Card className="glass-panel border-white/60">
                              <CardContent className="p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Weight</p>
                                <p className="text-lg font-semibold text-foreground">{latest.weight || patient?.weight || '—'}</p>
                                <p className="text-[10px] text-muted-foreground">kg</p>
                                {prev?.weight && latest.weight && (
                                  <p className={`text-[10px] font-medium mt-1 ${(latest.weight - prev.weight) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {(latest.weight - prev.weight) > 0 ? '+' : ''}{(latest.weight - prev.weight).toFixed(1)} kg
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                            <Card className="glass-panel border-white/60">
                              <CardContent className="p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">BP</p>
                                <p className="text-lg font-semibold text-foreground">{latest.bp || patient?.bp || '—'}</p>
                                <p className="text-[10px] text-muted-foreground">mmHg</p>
                              </CardContent>
                            </Card>
                            <Card className="glass-panel border-white/60">
                              <CardContent className="p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pulse</p>
                                <p className="text-lg font-semibold text-foreground">{latest.pulse || '—'}</p>
                                <p className="text-[10px] text-muted-foreground">bpm</p>
                              </CardContent>
                            </Card>
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* Trimester Checklist — pregnancy mode only */}
            {mode === 'pregnancy' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <CheckCircle2 className="w-4 h-4 text-pink-500" />
                  <h3 className="text-lg font-serif text-foreground">Your ANC Checklist</h3>
                  {patient?.trimesterChecklist && (
                    <span className="text-xs text-muted-foreground">Week {(patient.trimesterChecklist as any).currentWeek}</span>
                  )}
                </div>
                {(() => {
                  const cl = patient?.trimesterChecklist as any;
                  if (!cl?.items?.length) {
                    return (
                      <Card className="glass-panel border-white/60">
                        <CardContent className="p-5 text-center">
                          <Baby className="w-8 h-8 text-pink-200 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Your personalised antenatal checklist will appear here once your care team generates it.</p>
                        </CardContent>
                      </Card>
                    );
                  }
                  const urgentItems = cl.items.filter((it: any) => it.urgent && !it.done);
                  const otherItems = cl.items.filter((it: any) => !it.urgent && !it.done);
                  const doneItems = cl.items.filter((it: any) => it.done);
                  const catIcon: Record<string, React.ReactNode> = {
                    'Scan': <Stethoscope className="w-3.5 h-3.5 text-blue-500" />,
                    'Lab Test': <FlaskConical className="w-3.5 h-3.5 text-purple-500" />,
                    'Vaccine': <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
                    'Vitals': <Activity className="w-3.5 h-3.5 text-slate-500" />,
                    'Consultation': <Brain className="w-3.5 h-3.5 text-amber-500" />,
                    'Lifestyle': <Heart className="w-3.5 h-3.5 text-rose-500" />,
                  };
                  return (
                    <div className="space-y-2">
                      {urgentItems.length > 0 && urgentItems.map((item: any, i: number) => (
                        <Card key={`u-${i}`} className="glass-panel border-red-200/60 bg-red-50/30">
                          <CardContent className="p-4 flex items-start gap-3">
                            <div className="p-1.5 bg-red-100 rounded-lg shrink-0 mt-0.5">{catIcon[item.category] || <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge className="text-[10px] bg-red-100 text-red-700 border-none">Needs Attention</Badge>
                                {item.dueWeek && <span className="text-[10px] text-red-600">by Week {item.dueWeek}</span>}
                              </div>
                              <p className="text-sm text-foreground font-medium">{item.task}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {otherItems.slice(0, 5).map((item: any, i: number) => (
                        <Card key={`o-${i}`} className="glass-panel border-white/60">
                          <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="p-1.5 bg-white/60 rounded-lg shrink-0">{catIcon[item.category] || <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />}</div>
                            <div className="flex-1">
                              <p className="text-sm text-foreground">{item.task}</p>
                              {item.dueWeek && <p className="text-[10px] text-muted-foreground mt-0.5">Week {item.dueWeek}</p>}
                            </div>
                            <Clock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          </CardContent>
                        </Card>
                      ))}
                      {doneItems.length > 0 && (
                        <p className="text-xs text-muted-foreground px-1"><CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-500" />{doneItems.length} items completed</p>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* Active Medications */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Pill className="w-4 h-4 text-blue-600" />
                <h3 className="text-lg font-serif text-foreground">
                  {mode === 'pregnancy' ? 'Prenatal Medications' : 'My Medicines'}
                </h3>
              </div>
              {medications && medications.length > 0 ? (
                <div className="space-y-2">
                  {medications.filter((m: any) => (m.status || '').toLowerCase() === 'active').map((med: any) => {
                    const isPrenatal = mode === 'pregnancy';
                    const medName = (med.name || '').toLowerCase();
                    const isVitamin = medName.includes('vitamin') || medName.includes('folic') || medName.includes('iron') || medName.includes('calcium') || medName.includes('shelcal') || medName.includes('orofer') || medName.includes('uprise');
                    const isInjection = (med.route || '').toLowerCase().includes('intramuscular') || (med.route || '').toLowerCase().includes('injection') || medName.includes('injection') || medName.includes('proluton');
                    return (
                      <Card key={med.id} className={`glass-panel ${isPrenatal && isInjection ? 'border-amber-200/60' : 'border-white/60'}`} data-testid={`patient-med-${med.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {isPrenatal && (
                                <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${isVitamin ? 'bg-emerald-100' : isInjection ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                  {isVitamin ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : isInjection ? <Activity className="w-3.5 h-3.5 text-amber-600" /> : <Pill className="w-3.5 h-3.5 text-blue-600" />}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm text-foreground">{med.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {[med.dose, med.frequency].filter(Boolean).join(' — ')}
                                </p>
                                {med.route && isPrenatal && (
                                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{med.route}</p>
                                )}
                                {med.notes && <p className="text-xs text-muted-foreground/70 mt-1 italic">{med.notes}</p>}
                              </div>
                            </div>
                            <Badge className={`text-[10px] ${isPrenatal && isVitamin ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : isPrenatal && isInjection ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                              {isPrenatal && isVitamin ? 'Supplement' : isPrenatal && isInjection ? 'Injection' : 'Active'}
                            </Badge>
                          </div>
                          {med.startDate && (
                            <p className="text-[10px] text-muted-foreground mt-2">
                              Started: {new Date(med.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {med.endDate && ` — Until: ${new Date(med.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {medications.filter((m: any) => (m.status || '').toLowerCase() !== 'active').length > 0 && (
                    <Accordion type="single" collapsible>
                      <AccordionItem value="past-meds" className="border-0">
                        <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-2 px-1">
                          Past Medications ({medications.filter((m: any) => (m.status || '').toLowerCase() !== 'active').length})
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                          {medications.filter((m: any) => (m.status || '').toLowerCase() !== 'active').map((med: any) => (
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
                    <p className="text-sm text-muted-foreground">
                      {mode === 'pregnancy' ? 'No prenatal medications prescribed yet' : 'No medications prescribed yet'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Investigations / Tests */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <FlaskConical className="w-4 h-4 text-purple-600" />
                <h3 className="text-lg font-serif text-foreground">
                  {mode === 'pregnancy' ? 'Prenatal Tests' : 'Investigations & Tests'}
                </h3>
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
                        <p className="text-sm text-muted-foreground">
                          {mode === 'pregnancy' ? 'No prenatal tests ordered currently' : 'No investigations ordered currently'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <div className="space-y-2">
                    {allTests.map((test, i) => (
                      <Card key={i} className="glass-panel border-white/60" data-testid={`patient-investigation-${i}`}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${mode === 'pregnancy' ? 'bg-pink-100/50' : 'bg-purple-100/50'}`}>
                            <FileText className={`w-4 h-4 ${mode === 'pregnancy' ? 'text-pink-600' : 'text-purple-600'}`} />
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

            {/* Lab Results Summary for pregnancy */}
            {mode === 'pregnancy' && labResults && labResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-lg font-serif text-foreground">Completed Lab Results</h3>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100 ml-auto">{labResults.length} results</Badge>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const flagged = labResults.filter((r: any) => {
                      const s = (r.status || '').toLowerCase();
                      return s === 'high' || s === 'low' || s === 'critical' || s === 'borderline';
                    });
                    const normal = labResults.filter((r: any) => {
                      const s = (r.status || '').toLowerCase();
                      return s === 'normal' || s === 'low' || (!s && r.value != null);
                    }).filter((r: any) => !flagged.includes(r));
                    
                    return (
                      <>
                        {flagged.length > 0 && (
                          <div className="space-y-2">
                            {flagged.slice(0, 4).map((r: any, i: number) => {
                              const s = (r.status || '').toLowerCase();
                              const color = s === 'high' || s === 'critical' ? 'border-rose-200/60' : s === 'borderline' ? 'border-amber-200/60' : 'border-white/60';
                              const badgeColor = s === 'high' || s === 'critical' ? 'bg-rose-100 text-rose-700 border-rose-200' : s === 'borderline' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200';
                              return (
                                <Card key={i} className={`glass-panel ${color}`}>
                                  <CardContent className="p-3 flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{r.testName}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {r.value != null ? `${r.value} ${r.unit || ''}` : '—'}
                                        {r.date && ` • ${new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                                      </p>
                                    </div>
                                    <Badge className={`text-[10px] ${badgeColor}`}>{r.status}</Badge>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                        {normal.length > 0 && (
                          <Accordion type="single" collapsible>
                            <AccordionItem value="normal-labs" className="border-0">
                              <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-2 px-1">
                                Normal Results ({normal.length})
                              </AccordionTrigger>
                              <AccordionContent className="space-y-1.5">
                                {normal.map((r: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between bg-white/40 rounded-lg px-3 py-2">
                                    <span className="text-xs text-foreground">{r.testName}</span>
                                    <span className="text-xs text-muted-foreground">{r.value != null ? `${r.value} ${r.unit || ''}` : '—'}</span>
                                  </div>
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {/* Book Appointment Section */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <CalendarPlus className="w-4 h-4 text-primary" />
                <h3 className="text-lg font-serif text-foreground">Book an Appointment</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'doctor', icon: <User className="w-5 h-5" />, label: 'Doctor', sub: 'Consultation', color: 'bg-blue-100 text-blue-700', border: 'hover:border-blue-200' },
                  { type: 'nutritionist', icon: <Apple className="w-5 h-5" />, label: 'Nutritionist', sub: 'Diet & Wellness', color: 'bg-green-100 text-green-700', border: 'hover:border-green-200' },
                  { type: 'blood_test', icon: <Microscope className="w-5 h-5" />, label: 'Lab Test', sub: 'Blood & Reports', color: 'bg-purple-100 text-purple-700', border: 'hover:border-purple-200' },
                ].map(({ type, icon, label, sub, color, border }) => (
                  <button
                    key={type}
                    onClick={() => { setBookingType(type as any); setBookingStep('date'); setBookingOpen(true); }}
                    className={`glass-panel border-white/60 ${border} rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover:shadow-sm group`}
                    data-testid={`book-${type}`}
                  >
                    <div className={`p-2.5 rounded-xl ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">{sub}</p>
                  </button>
                ))}
              </div>

              {/* Upcoming Patient Appointments */}
              {patientAppointments && (patientAppointments as any[]).filter((a: any) => {
                const s = (a.status || '').toLowerCase();
                return s !== 'cancelled' && s !== 'completed';
              }).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground px-1 font-medium uppercase tracking-wider">Your Appointments</p>
                  {[...(patientAppointments as any[])]
                    .filter((a: any) => !['cancelled','completed'].includes((a.status||'').toLowerCase()))
                    .sort((a: any, b: any) => new Date(a.date||0).getTime() - new Date(b.date||0).getTime())
                    .slice(0, 4)
                    .map((appt: any) => {
                      const s = (appt.status || 'Pending').toLowerCase();
                      const statusColor = s === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : s === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
                      return (
                        <Card key={appt.id} className="glass-panel border-white/60" data-testid={`patient-appt-${appt.id}`}>
                          <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="p-1.5 bg-primary/10 rounded-lg shrink-0"><CalendarDays className="w-3.5 h-3.5 text-primary" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{appt.type || 'Consultation'}</p>
                              <p className="text-xs text-muted-foreground">
                                {appt.date ? new Date(appt.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}
                                {appt.time ? ` • ${appt.time}` : ''}
                              </p>
                            </div>
                            <Badge className={`text-[10px] shrink-0 border-none ${statusColor}`}>{appt.status || 'Pending'}</Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </motion.div>

            {/* Treatment Trail / Visit History */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Stethoscope className="w-4 h-4 text-rose-500" />
                <h3 className="text-lg font-serif text-foreground">
                  {mode === 'pregnancy' ? 'Prenatal Visit History' : 'Treatment Trail'}
                </h3>
              </div>
              {visitHistory && visitHistory.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-rose-200 via-pink-100 to-transparent rounded-full" />
                  <div className="space-y-3">
                    {[...visitHistory].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 10).map((visit: any, idx: number) => {
                      const visitVitals = (visit.vitals as any) || {};
                      const visitDate = visit.date ? new Date(visit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown date';
                      const weeksAtVisit = patient?.lmp && visit.date && mode === 'pregnancy'
                        ? Math.floor((new Date(visit.date).getTime() - new Date(patient.lmp).getTime()) / (1000 * 60 * 60 * 24 * 7))
                        : null;
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
                                  {weeksAtVisit != null && weeksAtVisit > 0 && (
                                    <Badge variant="outline" className="text-[10px] bg-pink-50 text-pink-600 border-pink-200">Wk {weeksAtVisit}</Badge>
                                  )}
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
                    <p className="text-sm text-muted-foreground">
                      {mode === 'pregnancy' ? 'No prenatal visits recorded yet' : 'No visits recorded yet'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>

          </TabsContent>

          {/* ── Pregnancy Hub Track Tab ─────────────────────────────────────── */}
          <TabsContent value="track" className="animate-in fade-in duration-700">
            {patient?.id && (mode === 'pregnancy' || mode === 'ttc') ? (
              <PregnancyTrackersTab
                patient={patient}
                medications={(medications as any[]) || []}
                patientId={patient.id}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <p className="text-sm text-slate-500">Switch to Pregnancy or TTC mode to access trackers.</p>
              </div>
            )}
          </TabsContent>

        </Tabs>

        {/* Book Appointment Dialog */}
        <Dialog open={bookingOpen} onOpenChange={(o) => { if (!o) setBookingOpen(false); }}>
          <DialogContent className="max-w-sm mx-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white/80 to-purple-50/30 pointer-events-none" />
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-black/5">
                <div className="flex items-center gap-2">
                  {bookingStep !== 'type' && bookingStep !== 'done' && (
                    <button onClick={() => setBookingStep(bookingStep === 'confirm' ? 'date' : 'type')} className="p-1 rounded-full hover:bg-black/5 transition-colors mr-1">
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  <CalendarPlus className="w-4 h-4 text-primary" />
                  <DialogTitle className="text-base font-serif text-foreground font-medium">Book Appointment</DialogTitle>
                </div>
                <button onClick={() => setBookingOpen(false)} className="p-1.5 rounded-full hover:bg-black/5 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Step: Choose type */}
                {bookingStep === 'type' && (
                  <AnimatePresence mode="wait">
                    <motion.div key="type" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                      <p className="text-sm text-muted-foreground">What kind of appointment do you need?</p>
                      {[
                        { type: 'doctor', icon: <User className="w-5 h-5" />, label: 'Doctor Consultation', sub: 'General check-up, follow-up, or specialist', color: 'bg-blue-100 text-blue-700' },
                        { type: 'nutritionist', icon: <Apple className="w-5 h-5" />, label: 'Nutritionist', sub: 'Diet plan, wellness & supplements', color: 'bg-green-100 text-green-700' },
                        { type: 'blood_test', icon: <Microscope className="w-5 h-5" />, label: 'Blood Test / Lab Work', sub: 'Lab tests, reports & investigations', color: 'bg-purple-100 text-purple-700' },
                      ].map(({ type, icon, label, sub, color }) => (
                        <button
                          key={type}
                          onClick={() => { setBookingType(type as any); setBookingStep('date'); }}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/60 border border-white/60 hover:border-primary/20 hover:bg-white/80 transition-all text-left group"
                          data-testid={`dialog-book-${type}`}
                        >
                          <div className={`p-2.5 rounded-xl ${color} shrink-0`}>{icon}</div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-auto group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Step: Choose date */}
                {bookingStep === 'date' && (
                  <AnimatePresence mode="wait">
                    <motion.div key="date" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                      <div className="flex items-center gap-2">
                        {bookingType === 'doctor' && <><User className="w-4 h-4 text-blue-600" /><p className="text-sm font-medium">Doctor Consultation</p></>}
                        {bookingType === 'nutritionist' && <><Apple className="w-4 h-4 text-green-600" /><p className="text-sm font-medium">Nutritionist Session</p></>}
                        {bookingType === 'blood_test' && <><Microscope className="w-4 h-4 text-purple-600" /><p className="text-sm font-medium">Blood Test / Lab Work</p></>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Preferred Date</label>
                        <input
                          type="date"
                          value={bookingDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                          data-testid="booking-date-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Any notes for the doctor? (optional)</label>
                        <textarea
                          value={bookingNote}
                          onChange={(e) => setBookingNote(e.target.value)}
                          placeholder="E.g. I've been having back pain..."
                          rows={2}
                          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none"
                          data-testid="booking-note-input"
                        />
                      </div>
                      <Button
                        disabled={!bookingDate}
                        onClick={() => setBookingStep('confirm')}
                        className="w-full rounded-xl font-medium"
                        data-testid="booking-next-btn"
                      >
                        Review Booking
                      </Button>
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Step: Confirm */}
                {bookingStep === 'confirm' && (
                  <AnimatePresence mode="wait">
                    <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                      <p className="text-sm text-muted-foreground">Please confirm your appointment details:</p>
                      <div className="bg-white/70 rounded-2xl p-4 space-y-3 border border-black/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Type</span>
                          <span className="text-sm font-medium text-foreground">
                            {bookingType === 'doctor' ? 'Doctor Consultation' : bookingType === 'nutritionist' ? 'Nutritionist' : 'Blood Test / Lab Work'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Date</span>
                          <span className="text-sm font-medium text-foreground">
                            {bookingDate ? new Date(bookingDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Patient</span>
                          <span className="text-sm font-medium text-foreground">{patient?.name || 'You'}</span>
                        </div>
                        {bookingNote && (
                          <div className="pt-2 border-t border-black/5">
                            <p className="text-xs text-muted-foreground"><span className="font-medium">Note: </span>{bookingNote}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">The clinic will confirm your appointment time and send you a WhatsApp message.</p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setBookingStep('date')} className="flex-1 rounded-xl">Edit</Button>
                        <Button
                          onClick={handleBookingConfirm}
                          disabled={bookingMutation.isPending}
                          className="flex-1 rounded-xl font-medium"
                          data-testid="booking-confirm-btn"
                        >
                          {bookingMutation.isPending ? 'Booking…' : 'Confirm'}
                        </Button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Step: Done */}
                {bookingStep === 'done' && (
                  <AnimatePresence mode="wait">
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-lg font-serif text-foreground font-medium">Request Sent!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your appointment request for <strong>{bookingDate ? new Date(bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</strong> has been sent to the clinic.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">You'll receive a WhatsApp confirmation once it's approved.</p>
                      </div>
                      <Button onClick={() => { setBookingOpen(false); setActiveTab('care'); }} className="w-full rounded-xl" data-testid="booking-done-btn">
                        View My Appointments
                      </Button>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Premium Floating Navigation */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
           <div className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] rounded-full px-6 py-4 flex items-center gap-8 transition-all hover:bg-white/90">
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
             {(mode === 'pregnancy' || mode === 'ttc') && (
               <NavButton 
                 active={activeTab === 'track'} 
                 onClick={() => setActiveTab('track')} 
                 icon={<Pill className="w-5 h-5" />} 
                 label="Track" 
               />
             )}
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
