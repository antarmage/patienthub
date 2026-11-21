import { DateInput } from "@/components/ui/date-input";
import { authenticatedFetch as fetch } from "@/lib/authenticatedFetch";
import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  User,
  Apple,
  Microscope,
  Video,
  ExternalLink
} from "lucide-react";
import { CycleWheel } from "@/components/CycleWheel";
import calmGradient from "../assets/images/calm-gradient.png";
import softCardBg from "../assets/images/soft-card-bg.png";

import BiologyTab from "@/components/BiologyTab";
import InsightsTab from "@/components/InsightsTab";
import PregnancyTrackersTab from "@/components/PregnancyTrackersTab";
import { PatientMenopauseCare } from "@/components/MenopauseCare";
import { patientGreetingName, cycleSubtitle } from "@/lib/patientGreeting";
import { patientMedicationCategory, patientMedicationNeedsReview, patientMedicationNote } from "@/lib/patientMedicationDisplay";
import { nextAppointment } from "@/lib/patientAppointments";
import { bookingVisitModeLabel } from "@/lib/bookingVisit";
import { validMeetUrl } from "@/lib/onlineConsultation";
import PatientPrograms from "@/components/PatientPrograms";
import PatientTodayDashboard from "@/components/PatientTodayDashboard";
import PregnancyCareDashboard from "@/components/PregnancyCareDashboard";
import { BrandLogo } from "@/components/BrandLogo";

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
  const patientId = storedPatient?.id?.toString() || new URLSearchParams(window.location.search).get('patientId');

  const patientQuery = useQuery({
    queryKey: ['/api/patients', patientId],
    enabled: Boolean(patientId),
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load your patient record. Please sign in again.");
      return body;
    },
  });
  const patient = patientQuery.data;

  const pregnancyEpisodesQuery = useQuery({
    queryKey: [`/api/patients/${patient?.id}/pregnancy-episodes`],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patient?.id}/pregnancy-episodes`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!patient?.id,
  });
  const pregnancyEpisodes = Array.isArray(pregnancyEpisodesQuery.data) ? pregnancyEpisodesQuery.data : [];
  const currentPregnancyEpisode = pregnancyEpisodes.find((episode: any) => episode?.details?.status === "current") || null;
  const pregnancyLmp = currentPregnancyEpisode?.details?.lmp || patient?.lmp || null;
  const pregnancyWeek = pregnancyLmp
    ? Math.max(1, Math.min(40, Math.floor((Date.now() - new Date(pregnancyLmp).getTime()) / (7 * 24 * 60 * 60 * 1000))))
    : null;

  function inferPatientMode(p: any): string {
    if (!p) return "general";
    const dbMode = (p.mode || '').toLowerCase();
    const type = (p.type || '').toLowerCase();
    const cond = (p.condition || '').toLowerCase();
    const focus = (p.focus || '').toLowerCase();
    const ps = (p.pregnancyStatus || '').toLowerCase();

    // Explicit DB mode takes highest priority
    if (dbMode === 'pregnancy') return 'pregnancy';
    if (dbMode === 'ivf') return 'ivf';
    if (dbMode === 'iui' || dbMode === 'natural_conception') return 'ttc';

    // Patient type
    if (type === 'pregnant') return 'pregnancy';
    if (type === 'fertility') {
      if (focus.includes('ivf')) return 'ivf';
      return 'ttc';
    }

    // Condition keywords
    if (cond.includes('pregnan') || cond.includes('antenatal') || cond.includes('trimester') || cond.includes('gestational')) return 'pregnancy';
    if (cond.includes('ivf')) return 'ivf';
    if (cond.includes('iui') || cond.includes('natural conception') || cond.includes('ttc') || cond.includes('trying')) return 'ttc';

    // Focus keywords
    if (focus.includes('pregnancy') || focus.includes('antenatal') || focus.includes('anc') || focus.includes('prenatal')) return 'pregnancy';
    if (focus.includes('ivf')) return 'ivf';
    if (focus.includes('iui') || focus.includes('natural conception') || focus.includes('ttc')) return 'ttc';

    // Pregnancy status
    if (ps.includes('pregnant') || ps.includes('active') || ps.includes('antenatal')) return 'pregnancy';

    return 'general';
  }

  const [modeInitialized, setModeInitialized] = useState(false);
  useEffect(() => {
    if (patient && !modeInitialized) {
      setMode(inferPatientMode(patient));
      setModeInitialized(true);
    }
  }, [patient, modeInitialized]);

  useEffect(() => {
    if (currentPregnancyEpisode) setMode("pregnancy");
  }, [currentPregnancyEpisode?.id]);

  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!modeDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node)) {
        setModeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [modeDropdownOpen]);

  const { data: visitHistory } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/visit-history`],
    queryFn: async () => { const r = await fetch(`/api/patients/${patient?.id}/visit-history`); return r.json(); },
    enabled: !!patient?.id,
  });

  const { data: weightLogs } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/weight-logs`],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patient?.id}/weight-logs`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!patient?.id,
  });

  const { data: bpLogs } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/bp-logs`],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patient?.id}/bp-logs`);
      if (!r.ok) return [];
      return r.json();
    },
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
    queryKey: [`/api/appointments/patient/${patient?.id}`],
    queryFn: async () => {
      const r = await fetch(`/api/appointments`, {
        headers: { "X-Patient-Id": String(patient?.id ?? "") },
      });
      return r.json();
    },
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
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/patient/${patient?.id}`] });
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
    <div
      className="min-h-screen pb-32 relative selection:bg-primary/20 overflow-hidden"
      style={{ background: mode === "pregnancy" ? "#FFF4EE" : "#FFF4E6" }}
    >
      {(!patientId || patientQuery.isError) && <div role="alert" className="relative z-10 m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {patientQuery.error?.message || "Please sign in to access your patient record."} <a href="/" className="underline">Sign in</a>
      </div>}
      {/* Background Layer - Dynamic based on scroll/mode */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: mode === "pregnancy" ? "#FFF4EE" : "#FFF4E6" }}
      />
      
      {/* Content Layer */}
      <div className="relative z-10 mx-auto max-w-md flex flex-col min-h-screen px-0 py-0 md:max-w-[1160px] md:px-10 md:py-5">
        
        {/* Header with Mode Switcher - More Spacious */}
        <header className="hidden">
          <motion.div 
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-serif text-foreground font-medium tracking-tight">
              {(() => {
                const h = new Date().getHours();
                return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
              })()}{patient?.name ? `, ${patientGreetingName(patient.name)}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium tracking-wide opacity-80 uppercase">
              {mode === 'pregnancy' ? (() => {
                const lmp = pregnancyLmp;
                if (!lmp) return 'Pregnancy Mode';
                const weeks = Math.floor((new Date().getTime() - new Date(lmp).getTime()) / (1000 * 60 * 60 * 24 * 7));
                const trimester = weeks < 13 ? '1st Trimester' : weeks < 27 ? '2nd Trimester' : '3rd Trimester';
                return `Week ${weeks} • ${trimester}`;
              })() : cycleSubtitle(patient?.lmp, mode)}
            </p>
          </motion.div>
          
          <div className="flex items-center gap-3">
          <div className="relative z-50" ref={modeDropdownRef}>
             <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setModeDropdownOpen(o => !o)}
                className="flex items-center gap-2 bg-saivie-ivory/40 hover:bg-saivie-ivory/60 active:bg-saivie-ivory/70 transition-colors backdrop-blur-xl px-4 py-2 rounded-full border border-white/40 text-xs font-medium text-foreground shadow-sm"
             >
                {mode === "general" && <Leaf className="w-3.5 h-3.5 text-emerald-600" />}
                {mode === "ttc" && <Baby className="w-3.5 h-3.5 text-rose-500" />}
                {mode === "ivf" && <TestTube className="w-3.5 h-3.5 text-saivie-teal" />}
                {mode === "pregnancy" && <Heart className="w-3.5 h-3.5 text-saivie-rose" />}
                <span>
                  {mode === "general" && "Cycle Health"}
                  {mode === "ttc" && "Trying to Conceive"}
                  {mode === "ivf" && "IVF Support"}
                  {mode === "pregnancy" && "Pregnancy"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-foreground/50 transition-transform duration-200 ${modeDropdownOpen ? "rotate-180" : ""}`} />
             </motion.button>

             <AnimatePresence>
               {modeDropdownOpen && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.95, y: -4 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: -4 }}
                   transition={{ duration: 0.15 }}
                   className="absolute right-0 top-full mt-2 w-52 bg-saivie-ivory/95 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-white/60 p-1.5 origin-top-right"
                 >
                   {([
                     { key: "general", icon: <Leaf className="w-3.5 h-3.5 text-emerald-600" />, bg: "bg-emerald-100", label: "Cycle Health" },
                     { key: "pregnancy", icon: <Heart className="w-3.5 h-3.5 text-saivie-rose" />, bg: "bg-saivie-blush", label: "Pregnancy" },
                     { key: "ttc", icon: <Baby className="w-3.5 h-3.5 text-rose-600" />, bg: "bg-rose-100", label: "Trying to Conceive" },
                     { key: "ivf", icon: <TestTube className="w-3.5 h-3.5 text-saivie-teal" />, bg: "bg-saivie-sage", label: "IVF Support" },
                   ] as const).map(({ key, icon, bg, label }) => (
                     <button
                       key={key}
                       onClick={() => { setMode(key); setModeDropdownOpen(false); }}
                       className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-colors ${mode === key ? "bg-black/5 font-semibold" : "hover:bg-black/5"}`}
                     >
                       <div className={`p-1.5 ${bg} rounded-full shrink-0`}>{icon}</div>
                       {label}
                       {mode === key && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                     </button>
                   ))}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
          </div>
        </header>

        <header className="hidden md:flex items-center justify-between border-b border-[var(--line)] pb-4 mb-6">
          <button type="button" onClick={() => setActiveTab("home")} className="flex items-center gap-2" aria-label="Saivie home">
            <BrandLogo fallback="S" className="h-16" />
          </button>
          <nav className="flex items-center gap-1 rounded-full border border-black/10 bg-white/75 p-1 shadow-sm" aria-label="Patient portal navigation">
            {([
              ["home", "Today"],
              ["biology", "Biology"],
              ["insights", "Insights"],
              ["programs", "Programs"],
              ["care", "My care"],
            ] as const).map(([value, label]) => (
              <motion.button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition ${
                  activeTab === value ? "bg-[#35212f] text-white" : "text-saivie-plum hover:bg-saivie-ivory"
                }`}
              >
                {label}
              </motion.button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="relative z-50" ref={modeDropdownRef}>
              <button
                type="button"
                onClick={() => setModeDropdownOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-xs font-semibold shadow-sm"
              >
                {mode === "pregnancy" ? "Pregnancy" : mode === "ttc" ? "Trying to conceive" : mode === "ivf" ? "IVF" : "Cycle Health"}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {modeDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/60 bg-white p-1.5 shadow-xl">
                  {(["general", "pregnancy", "ttc", "ivf"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setMode(key); setModeDropdownOpen(false); }}
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs ${mode === key ? "bg-black/5 font-semibold" : "hover:bg-black/5"}`}
                    >
                      {key === "general" ? "Cycle Health" : key === "pregnancy" ? "Pregnancy" : key === "ttc" ? "Trying to Conceive" : "IVF Support"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-saivie-border bg-saivie-blush text-xs font-semibold text-saivie-plum" aria-label={patient?.name || "Patient"}>
              {patientGreetingName(
                patient?.name ||
                [patient?.firstName, patient?.lastName].filter((part: unknown) => typeof part === "string" && part.trim()).join(" ")
              ).charAt(0).toUpperCase() || "S"}
            </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 flex-1">
          
          <TabsContent value="home" className="space-y-10 animate-in fade-in duration-700">
            {patient?.id && <PatientMenopauseCare key={patient.id} patientId={patient.id} patientName={patient.name} />}
            {patient?.id && (
              <PatientTodayDashboard
                mode={mode}
                patient={patient}
                pregnancyEpisode={currentPregnancyEpisode}
                appointments={(patientAppointments as any[]) || []}
                medications={(medications as any[]) || []}
                onBook={openBooking}
                onOpenCare={() => setActiveTab("care")}
              />
            )}
          </TabsContent>

          <TabsContent value="biology" className="animate-in slide-in-from-bottom-4 duration-500">
             <BiologyTab mode={mode} patient={{ ...patient, lmp: pregnancyLmp || patient?.lmp }} labResults={labResults} onOpenTracker={() => setActiveTab('track')} />
          </TabsContent>

          <TabsContent value="insights" className="animate-in slide-in-from-bottom-4 duration-500">
             <InsightsTab mode={mode} patient={{ ...patient, lmp: pregnancyLmp || patient?.lmp }} />
          </TabsContent>

          <TabsContent value="programs" className="animate-in slide-in-from-bottom-4 duration-500">
            <PatientPrograms pregnancy={mode === "pregnancy"} week={pregnancyWeek} />
          </TabsContent>

          <TabsContent value="care" className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 pb-8">
            {mode === 'pregnancy' && patient?.id && (
              <PregnancyCareDashboard
                patient={patient}
                week={pregnancyWeek}
                appointments={(patientAppointments as any[]) || []}
                medications={(medications as any[]) || []}
                labResults={(labResults as any[]) || []}
                visitHistory={(visitHistory as any[]) || []}
                weightLogs={(weightLogs as any[]) || []}
                bpLogs={(bpLogs as any[]) || []}
                onBook={openBooking}
                onOpenTrack={() => setActiveTab('track')}
                onOpenRecords={() => setActiveTab('track')}
              />
            )}
          </TabsContent>

          {/* ── Pregnancy Hub Track Tab ─────────────────────────────────────── */}
          <TabsContent value="track" className="animate-in fade-in duration-700">
            {patient?.id && (mode === 'pregnancy' || mode === 'ttc') ? (
              <PregnancyTrackersTab
                patient={patient}
                medications={(medications as any[]) || []}
                patientId={patient.id}
                pregnancyEpisode={currentPregnancyEpisode}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <p className="text-sm text-saivie-plum">Switch to Pregnancy or TTC mode to access trackers.</p>
              </div>
            )}
          </TabsContent>

        </Tabs>

        {/* Book Appointment Dialog */}
        <Dialog open={bookingOpen} onOpenChange={(o) => { if (!o) setBookingOpen(false); }}>
          <DialogContent className="max-w-sm mx-auto rounded-3xl border-white/60 bg-saivie-ivory/95 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white/80 to-saivie-surface-muted/30 pointer-events-none" />
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
                        { type: 'blood_test', icon: <Microscope className="w-5 h-5" />, label: 'Blood Test / Lab Work', sub: 'Lab tests, reports & investigations', color: 'bg-saivie-sage text-saivie-teal' },
                      ].map(({ type, icon, label, sub, color }) => (
                        <button
                          key={type}
                          onClick={() => { setBookingType(type as any); setBookingStep('date'); }}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-saivie-ivory/60 border border-white/60 hover:border-primary/20 hover:bg-saivie-ivory/80 transition-all text-left group"
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
                        {bookingType === 'blood_test' && <><Microscope className="w-4 h-4 text-saivie-teal" /><p className="text-sm font-medium">Blood Test / Lab Work</p></>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Preferred Date</label>
                        <DateInput
                          value={bookingDate}
                          min={new Date().toISOString().split('T')[0]}
                          onValueChange={(value) => setBookingDate(value)}
                          className="w-full rounded-xl border border-black/10 bg-saivie-ivory/70 px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
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
                          className="w-full rounded-xl border border-black/10 bg-saivie-ivory/70 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none"
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
                      <div className="bg-saivie-ivory/70 rounded-2xl p-4 space-y-3 border border-black/5">
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
        <div className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-24px)] max-w-[390px] -translate-x-1/2 md:hidden">
           <div className="flex h-[72px] items-center justify-between rounded-full bg-[var(--ink)] px-2 py-2 shadow-[0_12px_32px_rgba(34,18,43,0.3)]">
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
               active={activeTab === 'programs'}
               onClick={() => setActiveTab('programs')}
               icon={<Activity className="w-5 h-5" />}
               label="Programs"
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
         aria-current={active ? "page" : undefined}
         className={`relative flex min-h-[54px] min-w-[60px] flex-col items-center justify-center gap-1 rounded-[999px] px-2 transition-all duration-300 group ${
           active ? "bg-[var(--accent-today)] text-[var(--ink)]" : "text-[var(--nav-label)] hover:text-[var(--paper)]"
         }`}
      >
         <div className={`transition-transform duration-300 ${active ? '-translate-y-1' : 'group-hover:-translate-y-0.5'}`}>
            {React.cloneElement(icon, { strokeWidth: active ? 2.5 : 2 })}
         </div>
         <span className={`text-[10px] font-medium tracking-wide ${active ? 'font-semibold' : ''}`}>{label}</span>
         
      </button>
   )
}
