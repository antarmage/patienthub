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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Leaf, 
  Baby, 
  TestTube, 
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
import PregnancyTrackersTab, { type PregnancyTrackerTarget } from "@/components/PregnancyTrackersTab";
import { PatientMenopauseCare } from "@/components/MenopauseCare";
import { patientGreetingName, cycleSubtitle } from "@/lib/patientGreeting";
import { patientMedicationCategory, patientMedicationNeedsReview, patientMedicationNote } from "@/lib/patientMedicationDisplay";
import { nextAppointment } from "@/lib/patientAppointments";
import { bookingVisitModeLabel } from "@/lib/bookingVisit";
import { validMeetUrl } from "@/lib/onlineConsultation";
import PatientPrograms from "@/components/PatientPrograms";
import PatientTodayDashboard from "@/components/PatientTodayDashboard";
import PregnancyCareDashboard from "@/components/PregnancyCareDashboard";
import PatientHealthRecord from "@/components/PatientHealthRecord";
import PatientStageSwitcher from "@/components/PatientStageSwitcher";
import PatientPregnancyUpdate from "@/components/PatientPregnancyUpdate";
import { BrandLogo } from "@/components/BrandLogo";
import { localDateKey, nextLocalDateKey } from "@/lib/patientHealthRecord";
import { patientAppointmentRequest, type PatientAppointmentType } from "@/lib/patientAppointmentRequest";
import { programSchema } from "../../../../lib/db/src/patient-programs";
import { z } from "zod/v4";
import {
  getPostpartumStartDate,
  postpartumStartStorageKey,
  postpartumWeek as postpartumWeekFromStart,
  savePostpartumStartDate,
  type PatientPregnancyUpdateAction,
} from "@/lib/patientPregnancyUpdate";
import {
  getSavedPatientMode,
  patientStageForMode,
  savePatientMode,
  type PatientPortalMode,
  type PatientStageMode,
} from "@/lib/patientStage";

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "stage") return "stage";
    if (params.get("tab") === "pregnancy-update") return "pregnancy-update";
    return params.get("tab") === "record" || ["medications", "lab-reports", "history"].includes(params.get("section") || "")
      ? "record" : "home";
  });
  const [healthRecordSection, setHealthRecordSection] = useState<"overview" | "medications" | "lab-reports" | "history">(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    return section === "medications" || section === "lab-reports" || section === "history" ? section : "overview";
  });
  const [mode, setMode] = useState<PatientPortalMode>("general");
  const [initialTracker, setInitialTracker] = useState<PregnancyTrackerTarget | null>(null);
  const [initialProgramCategory, setInitialProgramCategory] = useState<"Move" | "Nourish" | null>(null);
  const [careOverviewKey, setCareOverviewKey] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'type'|'date'|'confirm'|'done'>('type');
  const [bookingType, setBookingType] = useState<PatientAppointmentType | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const bookingDateInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const storedPatient = (() => {
    try {
      const raw = localStorage.getItem("patientUser");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const patientId = storedPatient?.id?.toString() || new URLSearchParams(window.location.search).get('patientId');
  const reminderStorageKey = patientId ? `saiviePatientHealthReminder:${patientId}` : null;
  const [medicationReminderDue, setMedicationReminderDue] = useState(false);
  const [pregnancyLossSupport, setPregnancyLossSupport] = useState(false);
  const [postpartumStartDate, setPostpartumStartDate] = useState<string | null>(null);
  const [completedPregnancyEpisode, setCompletedPregnancyEpisode] = useState<any>(null);

  useEffect(() => {
    if (!patientId) {
      setPregnancyLossSupport(false);
      setPostpartumStartDate(null);
      return;
    }
    try {
      setPregnancyLossSupport(localStorage.getItem(`saiviePregnancyLossSupport:${patientId}`) === "true");
      setPostpartumStartDate(getPostpartumStartDate(localStorage, patientId));
    } catch (error) {
      console.warn("Could not load saved pregnancy transition preferences", error);
    }
  }, [patientId]);

  useEffect(() => {
    if (!reminderStorageKey) {
      setMedicationReminderDue(false);
      return;
    }
    const refreshReminder = () => {
      try {
        const reminder = JSON.parse(localStorage.getItem(reminderStorageKey) || "null");
        setMedicationReminderDue(Boolean(reminder?.dueDate && reminder.dueDate <= localDateKey(new Date())));
      } catch {
        setMedicationReminderDue(false);
      }
    };
    refreshReminder();
    const timer = window.setInterval(refreshReminder, 60_000);
    return () => window.clearInterval(timer);
  }, [reminderStorageKey]);

  const scheduleMedicationReminder = () => {
    if (!reminderStorageKey) return;
    localStorage.setItem(reminderStorageKey, JSON.stringify({
      dueDate: nextLocalDateKey(new Date()),
      section: "medications",
    }));
    setMedicationReminderDue(false);
  };

  const openHealthRecord = (section: "overview" | "medications" | "lab-reports" | "history" = "overview") => {
    setHealthRecordSection(section);
    setActiveTab("record");
  };

  const openMedicationReminder = () => {
    if (reminderStorageKey) localStorage.removeItem(reminderStorageKey);
    setMedicationReminderDue(false);
    openHealthRecord("medications");
  };

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

  function inferPatientMode(p: any): PatientPortalMode {
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
    if (dbMode === 'postpartum') return 'postpartum';
    if (dbMode === 'menopause' || dbMode === 'perimenopause') return 'menopause';

    // Patient type
    if (type === 'pregnant') return 'pregnancy';
    if (type.includes('postpartum')) return 'postpartum';
    if (type.includes('menopause') || type.includes('perimenopause')) return 'menopause';
    if (type === 'fertility') {
      if (focus.includes('ivf')) return 'ivf';
      return 'ttc';
    }

    // Condition keywords
    if (cond.includes('pregnan') || cond.includes('antenatal') || cond.includes('trimester') || cond.includes('gestational')) return 'pregnancy';
    if (cond.includes('postpartum')) return 'postpartum';
    if (cond.includes('menopause') || cond.includes('perimenopause')) return 'menopause';
    if (cond.includes('ivf')) return 'ivf';
    if (cond.includes('iui') || cond.includes('natural conception') || cond.includes('ttc') || cond.includes('trying')) return 'ttc';

    // Focus keywords
    if (focus.includes('pregnancy') || focus.includes('antenatal') || focus.includes('anc') || focus.includes('prenatal')) return 'pregnancy';
    if (focus.includes('ivf')) return 'ivf';
    if (focus.includes('iui') || focus.includes('natural conception') || focus.includes('ttc')) return 'ttc';

    // Pregnancy status
    if (ps.includes('pregnant') || ps.includes('active') || ps.includes('antenatal')) return 'pregnancy';
    if (ps.includes('postpartum')) return 'postpartum';
    if (ps.includes('menopause') || ps.includes('perimenopause')) return 'menopause';

    return 'general';
  }

  const [modeInitialized, setModeInitialized] = useState(false);
  useEffect(() => {
    if (patient?.id && !modeInitialized && (pregnancyEpisodesQuery.isSuccess || pregnancyEpisodesQuery.isError)) {
      const savedMode = getSavedPatientMode(window.localStorage, patient.id);
      setMode(savedMode ?? (currentPregnancyEpisode ? "pregnancy" : inferPatientMode(patient)));
      setModeInitialized(true);
    }
  }, [patient, modeInitialized, pregnancyEpisodesQuery.isSuccess, pregnancyEpisodesQuery.isError, currentPregnancyEpisode]);

  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const selectMode = (nextMode: PatientPortalMode, nextTab = "home") => {
    setMode(nextMode);
    setModeDropdownOpen(false);
    if (patient?.id) {
      try {
        savePatientMode(window.localStorage, patient.id, nextMode);
      } catch (error) {
        console.warn("Could not save the selected patient stage", error);
      }
    }
    setActiveTab(nextTab);
  };
  const selectStage = (nextMode: PatientStageMode) => {
    if (currentPregnancyEpisode && nextMode !== "pregnancy") {
      setActiveTab("pregnancy-update");
      return;
    }
    selectMode(nextMode);
  };
  const selectFertilityMode = (nextMode: "ttc" | "ivf") => {
    if (currentPregnancyEpisode) {
      setActiveTab("pregnancy-update");
      return;
    }
    selectMode(nextMode);
  };
  const handlePregnancyStatusUpdated = (action: PatientPregnancyUpdateAction, birthDate?: string) => {
    if (!patient?.id || !currentPregnancyEpisode) return;
    void queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId] });
    void queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient.id}/pregnancy-episodes`] });

    if (action === "baby-arrived") {
      const startDate = birthDate || localDateKey(new Date());
      setPostpartumStartDate(startDate);
      try {
        savePostpartumStartDate(window.localStorage, patient.id, startDate);
        localStorage.removeItem(`saiviePregnancyLossSupport:${patient.id}`);
      } catch (error) {
        console.warn("Could not save postpartum stage preferences", error);
      }
      setPregnancyLossSupport(false);
      selectMode("postpartum", "home");
      return;
    }

    try {
      localStorage.removeItem(postpartumStartStorageKey(patient.id));
    } catch (error) {
      console.warn("Could not clear the previous postpartum date", error);
    }
    setPostpartumStartDate(null);

    if (action === "pregnancy-loss") {
      setCompletedPregnancyEpisode(currentPregnancyEpisode);
      setPregnancyLossSupport(true);
      try {
        localStorage.setItem(`saiviePregnancyLossSupport:${patient.id}`, "true");
      } catch (error) {
        console.warn("Could not save pregnancy support preference", error);
      }
      selectMode("general", "pregnancy-update");
      return;
    }

    setPregnancyLossSupport(false);
    try {
      localStorage.removeItem(`saiviePregnancyLossSupport:${patient.id}`);
    } catch (error) {
      console.warn("Could not clear pregnancy support preference", error);
    }
    selectMode("general", "stage");
  };

  const dismissPregnancyLossSupport = () => {
    if (patient?.id) {
      try {
        localStorage.removeItem(`saiviePregnancyLossSupport:${patient.id}`);
      } catch (error) {
        console.warn("Could not dismiss saved pregnancy support preference", error);
      }
    }
    setPregnancyLossSupport(false);
  };
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

  const visitHistoryQuery = useQuery({
    queryKey: [`/api/patients/${patient?.id}/visit-history`],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patient?.id}/visit-history`);
      if (!r.ok) throw new Error("Unable to load visits.");
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error("Unable to load visits.");
      return data;
    },
    enabled: !!patient?.id,
  });
  const visitHistory = visitHistoryQuery.data;

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

  const medicationsQuery = useQuery({
    queryKey: [`/api/patients/${patient?.id}/medications`],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patient?.id}/medications`);
      if (!r.ok) throw new Error("Unable to load medicines.");
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error("Unable to load medicines.");
      return data;
    },
    enabled: !!patient?.id,
  });
  const medications = medicationsQuery.data;

  const { data: pregnancyData } = useQuery({
    queryKey: [`/api/pregnancy-metrics?patientId=${patient?.id}`],
    queryFn: async () => { const r = await fetch(`/api/pregnancy-metrics?patientId=${patient?.id}`); return r.json(); },
    enabled: !!patient?.id && mode === 'pregnancy',
  });

  const labResultsQuery = useQuery({
    queryKey: [`/api/patients/${patient?.id}/lab-results`],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patient?.id}/lab-results`);
      if (!r.ok) throw new Error("Unable to load lab results.");
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error("Unable to load lab results.");
      return data;
    },
    enabled: !!patient?.id,
  });
  const labResults = labResultsQuery.data;

  const { data: providers } = useQuery({
    queryKey: ['/api/providers'],
    queryFn: async () => { const r = await fetch('/api/providers'); return r.json(); },
  });

  const appointmentsQuery = useQuery({
    queryKey: [`/api/appointments/patient/${patient?.id}`],
    queryFn: async () => {
      const r = await fetch(`/api/appointments`, {
        headers: { "X-Patient-Id": String(patient?.id ?? "") },
      });
      if (!r.ok) throw new Error("Unable to load appointments.");
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error("Unable to load appointments.");
      return data;
    },
    enabled: !!patient?.id,
  });
  const patientAppointments = appointmentsQuery.data;
  const programsQuery = useQuery({
    queryKey: ["/api/patient-programs", patient?.id],
    queryFn: async () => {
      const response = await fetch("/api/patient-programs");
      if (!response.ok) throw new Error("Unable to load programs.");
      return z.array(programSchema).parse(await response.json());
    },
    enabled: !!patient?.id && mode === "pregnancy" && activeTab === "programs",
    retry: false,
    refetchInterval: 30000,
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Unable to send your appointment request. Please try again.");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/patient/${patient?.id}`] });
    },
  });

  const openBooking = () => {
    bookingMutation.reset();
    setBookingStep('type');
    setBookingType(null);
    setBookingDate('');
    setBookingTime('');
    setBookingNote('');
    setBookingOpen(true);
  };

  const handleBookingConfirm = () => {
    if (!patient?.id || !bookingDate || !bookingTime || !bookingType) return;
    bookingMutation.mutate(patientAppointmentRequest({
      patientId: Number(patient.id),
      providers: Array.isArray(providers) ? providers : [],
      date: bookingDate,
      time: bookingTime,
      type: bookingType,
      note: bookingNote,
    }), { onSuccess: () => setBookingStep('done') });
  };

  useEffect(() => {
     document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  return (
    <div
      className="min-h-screen pb-32 relative selection:bg-primary/20 overflow-hidden"
      style={{ background: mode === "pregnancy" ? "#FFF4EE" : mode === "postpartum" ? "#F5F8E9" : mode === "menopause" ? "#EAF8F8" : "#FFF4E6" }}
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
                       onClick={() => selectMode(key)}
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

        <header className={`hidden md:flex items-center justify-between pb-4 mb-6 ${activeTab === "stage" ? "" : "border-b border-[var(--line)]"}`}>
          <button type="button" onClick={() => setActiveTab("home")} className="flex items-center gap-2" aria-label="Saivie home">
            <BrandLogo fallback="S" className="h-16" />
          </button>
          <nav className={`flex items-center gap-1 rounded-full p-1 ${activeTab === "stage" ? "bg-[#23122d]" : "border border-black/10 bg-white/75 shadow-sm"}`} aria-label="Patient portal navigation">
            {([
              ["home", "Today"],
              ["biology", "Body"],
              ["programs", "Programs"],
              ["care", "My care"],
            ] as const).map(([value, label]) => (
              <motion.button
                key={value}
                type="button"
                onClick={() => {
                  if (value === "programs") setInitialProgramCategory(null);
                  if (value === "care") setCareOverviewKey((key) => key + 1);
                  setActiveTab(value);
                }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition ${
                  activeTab === "stage"
                    ? value === "home" ? "bg-[#FFB32C] text-[#23122d]" : "text-white hover:bg-white/10"
                    : (activeTab === value || (value === "care" && (activeTab === "record" || activeTab === "care-team")) || (value === "home" && activeTab === "pregnancy-update")) ? "bg-[#35212f] text-white" : "text-saivie-plum hover:bg-saivie-ivory"
                }`}
              >
                {label}
              </motion.button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className={`relative z-50 ${activeTab === "stage" ? "hidden" : ""}`}>
              <button
                type="button"
                onClick={() => setActiveTab("stage")}
                aria-label="Switch your health stage"
                className="flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-xs font-semibold shadow-sm"
              >
                {mode === "pregnancy" ? "Pregnancy" : mode === "postpartum" ? "Postpartum" : mode === "menopause" ? "Perimenopause" : mode === "ttc" ? "Trying to conceive" : mode === "ivf" ? "IVF" : "I have periods"}
                <span className="text-[#775B63]">Switch stage</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-saivie-plum ${activeTab === "stage" ? "bg-[#FFB32C]" : "border border-saivie-border bg-saivie-blush"}`} aria-label="Open profile menu">
                  {patientGreetingName(
                    patient?.name ||
                    [patient?.firstName, patient?.lastName].filter((part: unknown) => typeof part === "string" && part.trim()).join(" ")
                  ).charAt(0).toUpperCase() || "S"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl bg-white">
                {currentPregnancyEpisode ? (
                  <>
                    <DropdownMenuLabel>My pregnancy</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setActiveTab("pregnancy-update")}>Update</DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onSelect={() => setActiveTab("stage")}>Switch stage</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {labResultsQuery.isError && (activeTab === "home" || activeTab === "biology" || activeTab === "care-team") && (
          <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">Unable to load lab results. <button type="button" onClick={() => { void labResultsQuery.refetch(); }} className="font-bold underline">Retry</button></p>
        )}
        {medicationsQuery.isError && (activeTab === "home" || activeTab === "track" || activeTab === "care-team") && (
          <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">Unable to load medicines. <button type="button" onClick={() => { void medicationsQuery.refetch(); }} className="font-bold underline">Retry</button></p>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 flex-1">
          
          <TabsContent value="home" className="space-y-10 animate-in fade-in duration-700">
            {mode === "menopause" && patient?.id && <PatientMenopauseCare key={patient.id} patientId={patient.id} patientName={patient.name} />}
            {appointmentsQuery.isError && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">Unable to load appointments. <button type="button" onClick={() => { void appointmentsQuery.refetch(); }} className="font-bold underline">Retry</button></p>}
            {patient?.id && (
              <PatientTodayDashboard
                mode={mode}
                patient={patient}
                pregnancyEpisode={currentPregnancyEpisode}
                appointments={(patientAppointments as any[]) || []}
                medications={(medications as any[]) || []}
                labResults={(labResults as any[]) || []}
                medicationReminderDue={medicationReminderDue}
                onBook={openBooking}
                onOpenCare={() => setActiveTab("care")}
                onOpenRecord={() => openHealthRecord("overview")}
                onOpenMedicationReminder={openMedicationReminder}
                onOpenStageSwitcher={() => setActiveTab("stage")}
                onUpdatePregnancy={() => setActiveTab("pregnancy-update")}
                showPregnancyLossSupport={pregnancyLossSupport}
                onDismissPregnancyLossSupport={dismissPregnancyLossSupport}
                postpartumWeek={mode === "postpartum" ? postpartumWeekFromStart(postpartumStartDate) : null}
              />
            )}
          </TabsContent>

          <TabsContent value="pregnancy-update" className="animate-in fade-in duration-500">
            {patient?.id && (currentPregnancyEpisode || completedPregnancyEpisode) ? (
              <PatientPregnancyUpdate
                patientId={Number(patient.id)}
                episode={currentPregnancyEpisode || completedPregnancyEpisode}
                onClose={() => setActiveTab("home")}
                onOpenRecord={() => openHealthRecord("overview")}
                onBook={openBooking}
                onStatusUpdated={handlePregnancyStatusUpdated}
              />
            ) : (
              <p role="status" className="px-5 py-16 text-center text-sm text-saivie-plum">There is no current pregnancy to update.</p>
            )}
          </TabsContent>

          <TabsContent value="stage" className="animate-in fade-in duration-500">
            {patient?.id && modeInitialized ? (
              <PatientStageSwitcher
                currentStage={patientStageForMode(mode)}
                onSelectStage={selectStage}
                onSelectFertilityMode={selectFertilityMode}
              />
            ) : (
              <p role="status" className="px-5 py-16 text-center text-sm text-saivie-plum">Loading your stage options…</p>
            )}
          </TabsContent>

          <TabsContent value="biology" className="animate-in slide-in-from-bottom-4 duration-500">
            {mode === "postpartum" || mode === "menopause" ? (
              <main className="mx-auto max-w-4xl space-y-5 px-5 pb-28 pt-8 md:px-0 md:pb-10" data-stage-body={mode}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#775B63]">{mode === "postpartum" ? "Postpartum · Body" : "Perimenopause · Body"}</p>
                <h1 className="font-serif text-4xl font-semibold text-[#35212f] md:text-5xl">
                  {mode === "postpartum" ? "Your recovery, at your pace." : "Notice what changes for you."}
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-[#6A5963]">
                  {mode === "postpartum"
                    ? "Cycle predictions are paused. Your pregnancy history and current health notes remain in your record."
                    : "Cycle predictions are off for this stage. You can keep symptom notes and review them with your care team."}
                </p>
                {mode === "menopause" && patient?.id && (
                  <PatientMenopauseCare patientId={patient.id} patientName={patient.name} />
                )}
                <button type="button" onClick={() => openHealthRecord("overview")} className="min-h-11 rounded-full bg-[#35212f] px-5 text-sm font-bold text-white">
                  Open health record
                </button>
              </main>
            ) : (
              <BiologyTab mode={mode} patient={{ ...patient, lmp: pregnancyLmp || patient?.lmp }} labResults={labResults} onOpenTracker={(tracker) => { setInitialTracker(tracker); setActiveTab("track"); }} />
            )}
          </TabsContent>

          <TabsContent value="programs" className="animate-in slide-in-from-bottom-4 duration-500">
            <PatientPrograms key={initialProgramCategory ?? "overview"} pregnancy={mode === "pregnancy"} week={pregnancyWeek} mode={mode} initialCategory={initialProgramCategory} onOpenLabReports={() => openHealthRecord("lab-reports")} onBookNutrition={openBooking} onBookAppointment={openBooking} programs={{ programs: programsQuery.data, loading: programsQuery.isPending, error: programsQuery.isError, retry: () => { void programsQuery.refetch(); } }} />
          </TabsContent>

          <TabsContent value="care" className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 pb-8">
            {mode === 'pregnancy' && patient?.id && (
              <PatientHealthRecord
                key={careOverviewKey}
                patient={patient}
                patientId={Number(patient.id)}
                medications={(medications as any[]) || []}
                medicationsLoading={medicationsQuery.isLoading}
                medicationsError={medicationsQuery.isError}
                onRetryMedications={() => { void medicationsQuery.refetch(); }}
                labResults={(labResults as any[]) || []}
                labResultsLoading={labResultsQuery.isLoading}
                labResultsError={labResultsQuery.isError}
                onRetryLabResults={() => { void labResultsQuery.refetch(); }}
                visitHistory={(visitHistory as any[]) || []}
                visitHistoryLoading={visitHistoryQuery.isLoading}
                visitHistoryError={visitHistoryQuery.isError}
                onRetryVisits={() => { void visitHistoryQuery.refetch(); }}
                appointments={(patientAppointments as any[]) || []}
                appointmentsLoading={appointmentsQuery.isLoading}
                appointmentsError={appointmentsQuery.isError}
                onRetryAppointments={() => { void appointmentsQuery.refetch(); }}
                providers={Array.isArray(providers) ? providers : []}
                onBookAppointment={openBooking}
                initialSection="overview"
                pregnancy
                pregnancyEpisode={currentPregnancyEpisode}
                onUpdatePregnancy={() => setActiveTab("pregnancy-update")}
                onBack={() => setActiveTab("home")}
                onScheduleMedicationReminder={scheduleMedicationReminder}
                onOpenPrograms={(category) => { setInitialProgramCategory(category); setActiveTab("programs"); }}
                onOpenCareTeam={() => setActiveTab("care-team")}
                onOpenTrack={() => { setInitialTracker(null); setActiveTab("track"); }}
              />
            )}
            {mode !== "pregnancy" && patient?.id && (
              <section className="rounded-[28px] border border-[#E8D8C8] bg-white/90 p-6 md:p-8" data-stage-care={mode}>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#775B63]">{mode === "postpartum" ? "Postpartum care" : mode === "menopause" ? "Perimenopause care" : "My care"}</p>
                <h1 className="mt-2 font-serif text-3xl font-semibold text-[#35212f]">
                  {mode === "postpartum" ? "Your recovery and health record." : mode === "menopause" ? "Care and notes, together." : "Your health record, in one place."}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6A5963]">
                  Visits, lab reports and medicines stay with you when your stage changes.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => openHealthRecord("overview")} className="min-h-11 rounded-full bg-[#35212f] px-5 text-sm font-bold text-white">Open health record</button>
                  <button type="button" onClick={openBooking} className="min-h-11 rounded-full border border-[#D9C3AE] px-5 text-sm font-bold text-[#35212f]">Book an appointment</button>
                </div>
                {mode === "menopause" && <div className="mt-6"><PatientMenopauseCare patientId={patient.id} patientName={patient.name} /></div>}
              </section>
            )}
          </TabsContent>

          <TabsContent value="care-team" className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 pb-8">
            {appointmentsQuery.isError && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">Unable to load appointments. <button type="button" onClick={() => { void appointmentsQuery.refetch(); }} className="font-bold underline">Retry</button></p>}
            {visitHistoryQuery.isError && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">Unable to load visits. <button type="button" onClick={() => { void visitHistoryQuery.refetch(); }} className="font-bold underline">Retry</button></p>}
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
                onOpenTrack={() => { setInitialTracker(null); setActiveTab("track"); }}
                onOpenRecords={() => setActiveTab("care")}
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
                initialTracker={initialTracker}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <p className="text-sm text-saivie-plum">Switch to Pregnancy or TTC mode to access trackers.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="record" className="animate-in fade-in duration-500">
            {patient?.id && <PatientHealthRecord
              patient={patient}
              patientId={Number(patient.id)}
              medications={(medications as any[]) || []}
              medicationsLoading={medicationsQuery.isLoading}
              medicationsError={medicationsQuery.isError}
              onRetryMedications={() => { void medicationsQuery.refetch(); }}
              labResults={(labResults as any[]) || []}
              labResultsLoading={labResultsQuery.isLoading}
              labResultsError={labResultsQuery.isError}
              onRetryLabResults={() => { void labResultsQuery.refetch(); }}
              visitHistory={(visitHistory as any[]) || []}
              visitHistoryLoading={visitHistoryQuery.isLoading}
              visitHistoryError={visitHistoryQuery.isError}
              onRetryVisits={() => { void visitHistoryQuery.refetch(); }}
              appointments={(patientAppointments as any[]) || []}
              appointmentsLoading={appointmentsQuery.isLoading}
              appointmentsError={appointmentsQuery.isError}
              onRetryAppointments={() => { void appointmentsQuery.refetch(); }}
              providers={Array.isArray(providers) ? providers : []}
              onBookAppointment={openBooking}
              initialSection={healthRecordSection}
              pregnancy={mode === "pregnancy"}
              pregnancyEpisode={currentPregnancyEpisode}
              onUpdatePregnancy={() => setActiveTab("pregnancy-update")}
              onBack={() => setActiveTab("home")}
              onScheduleMedicationReminder={scheduleMedicationReminder}
              onOpenPrograms={(category) => { setInitialProgramCategory(category); setActiveTab("programs"); }}
              onOpenCareTeam={mode === "pregnancy" ? () => setActiveTab("care-team") : undefined}
              onOpenTrack={mode === "pregnancy" ? () => { setInitialTracker(null); setActiveTab("track"); } : undefined}
            />}
          </TabsContent>

        </Tabs>

        {/* Book Appointment Dialog */}
        <Dialog open={bookingOpen} onOpenChange={(o) => { if (!o) setBookingOpen(false); }}>
          <DialogContent aria-describedby={undefined} className="max-w-sm mx-auto rounded-3xl border-white/60 bg-saivie-ivory/95 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden">
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
                <button type="button" aria-label="Close appointment dialog" onClick={() => setBookingOpen(false)} className="p-1.5 rounded-full hover:bg-black/5 transition-colors">
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
                        <label htmlFor="booking-date" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Preferred Date</label>
                        <DateInput
                          id="booking-date"
                          ref={bookingDateInput}
                          value={bookingDate}
                          min={new Date().toISOString().split('T')[0]}
                          onValueChange={(value) => setBookingDate(value)}
                          className="w-full rounded-xl border border-black/10 bg-saivie-ivory/70 px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                          data-testid="booking-date-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="booking-time" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Preferred time</label>
                        <input
                          id="booking-time"
                          type="time"
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full rounded-xl border border-black/10 bg-saivie-ivory/70 px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                          data-testid="booking-time-input"
                        />
                        <p className="text-xs text-muted-foreground">This is a preferred time, not an available slot. The clinic must confirm it.</p>
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
                        disabled={!bookingDate || !bookingTime}
                        onClick={() => { if (bookingDateInput.current?.reportValidity()) setBookingStep('confirm'); }}
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
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Preferred time</span>
                          <span className="text-sm font-medium text-foreground">{bookingTime}</span>
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
                      <p className="text-xs text-muted-foreground text-center">This is a request, not a confirmed appointment. Contact the clinic to confirm availability.</p>
                      {bookingMutation.isError && <p role="alert" className="text-sm text-red-700">{bookingMutation.error.message}</p>}
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
                        <p className="text-xs text-muted-foreground mt-2">Contact the clinic to confirm availability and your appointment time.</p>
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
               active={activeTab === 'home' || activeTab === 'stage' || activeTab === 'pregnancy-update'}
               onClick={() => setActiveTab('home')} 
               icon={<Sun className="w-5 h-5" />} 
               label="Today" 
             />
             <NavButton 
               active={activeTab === 'biology'} 
               onClick={() => setActiveTab('biology')} 
               icon={<Activity className="w-5 h-5" />} 
                 label="Body" 
             />
             <NavButton
               active={activeTab === 'programs'}
               onClick={() => { setInitialProgramCategory(null); setActiveTab('programs'); }}
               icon={<Activity className="w-5 h-5" />}
               label="Programs"
             />
             {(mode === 'pregnancy' || mode === 'ttc') && (
               <NavButton 
                 active={activeTab === 'track'} 
                 onClick={() => { setInitialTracker(null); setActiveTab('track'); }}
                 icon={<Pill className="w-5 h-5" />} 
                 label="Track" 
               />
             )}
             <NavButton 
               active={activeTab === 'care' || activeTab === 'record' || activeTab === 'care-team'}
               onClick={() => { setCareOverviewKey((key) => key + 1); setActiveTab('care'); }}
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
