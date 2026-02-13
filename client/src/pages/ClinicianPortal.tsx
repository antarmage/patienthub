import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { openPrescription } from "@/lib/prescriptionTemplate";
import { 
  LayoutDashboard, 
  Users, 
  Calendar as CalendarIcon, 
  Activity, 
  Search, 
  Bell, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Dna, 
  FileText,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Baby,
  Heart,
  Brain,
  Stethoscope,
  ClipboardList,
  Pill,
  Syringe,
  FlaskConical,
  MessageSquare,
  History,
  PlayCircle,
  Timer,
  Microscope,
  CalendarCheck,
  Scale,
  Thermometer,
  Printer,
  Download,
  Send,
  Plus,
  AlertTriangle,
  Clock,
  Briefcase,
  Settings,
  CreditCard,
  MapPin,
  X,
  ExternalLink,
  Loader2,
  Sparkle,
  Upload,
  Pencil,
  Trash2,
  Check,
  Shield,
  Milestone,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  LineChart
} from "recharts";
import medicalDashboardBg from "../assets/images/medical-dashboard-bg.png";
import pregnancyGrowthBg from "../assets/images/pregnancy-growth-bg.png";
import postpartumRecoveryBg from "../assets/images/postpartum-recovery-bg.png";
import follicleTrackingBg from "../assets/images/follicle-tracking-bg.png";
import iuiTimelineBg from "../assets/images/iui-timeline-bg.png";
import fetalBiometryBg from "../assets/images/fetal-biometry-bg.png";

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ClinicianPortal() {
  const [, navigate] = useLocation();
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [careMode, setCareMode] = useState("natural_conception"); 
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [showPastRecords, setShowPastRecords] = useState(true);
  const [selectedTrailVisitId, setSelectedTrailVisitId] = useState<number | string | null>(null);
  const [scheduleViewMode, setScheduleViewMode] = useState("appointments");
  const [calendarViewMode, setCalendarViewMode] = useState("month");
  const [activeSettingsTab, setActiveSettingsTab] = useState("profile");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingType, setBookingType] = useState("surgery");

  const clinicianProvider = useMemo(() => {
    try {
      const stored = localStorage.getItem("clinicianProvider");
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  }, []);
  const providerName = clinicianProvider?.name || "Doctor";
  const providerSpecialty = clinicianProvider?.specialty || "Clinician";
  const providerInitials = providerName.split(" ").filter((w: string) => w[0]?.match(/[A-Z]/)).map((w: string) => w[0]).join("").slice(0, 2) || "DR";
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [queueDateFrom, setQueueDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [queueDateTo, setQueueDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [patientSearch, setPatientSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  const [fundalHeightVal, setFundalHeightVal] = useState('');
  const [fetalHeartRateVal, setFetalHeartRateVal] = useState('');

  const queryClient = useQueryClient();

  const autoExtractTriggeredRef = React.useRef<Set<number>>(new Set());

  useEffect(() => {
    if (selectedPatient) {
      const mode = (selectedPatient.mode || '').toLowerCase();
      if (mode === 'pregnancy') setCareMode('pregnancy');
      else if (mode === 'ivf' || mode === 'iui') setCareMode('iui');
      else if (mode === 'postpartum') setCareMode('postpartum');
      else if (mode === 'ttc' || mode === 'trying_to_conceive') setCareMode('natural_conception');
      else if (mode === 'hormone' || mode === 'cycle') setCareMode('hormone_care');
      else setCareMode('natural_conception');
    }
  }, [selectedPatient]);

  const prescriptionInputRef = React.useRef<HTMLInputElement>(null);

  const uploadPrescriptionMutation = useMutation({
    mutationFn: async ({ patientId, file }: { patientId: number; file: File }) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`/api/patients/${patientId}/extract-prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64,
          mimeType: file.type || 'application/pdf',
          fileName: file.name,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to extract prescription');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (selectedPatient) {
        queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/medications`] });
        queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/documents`] });
      }
      setExtractionStatus(data.message || 'Prescription processed successfully');
      setTimeout(() => setExtractionStatus(null), 6000);
    },
    onError: (err: any) => {
      setExtractionStatus(`Extraction failed: ${err.message}`);
      setTimeout(() => setExtractionStatus(null), 6000);
    },
  });

  const handlePrescriptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedPatient) {
      uploadPrescriptionMutation.mutate({ patientId: selectedPatient.id, file });
    }
    if (prescriptionInputRef.current) prescriptionInputRef.current.value = '';
  };

  const generatePrescription = () => {
    if (!selectedPatient) return;
    const visitVitals = (latestVisit?.vitals as any) || {};
    const latestAppt = appointments
      .filter((a: any) => a.patientId === selectedPatient.id && a.status === 'Completed')
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const apptVitals = (latestAppt?.vitals as any) || {};
    const vitals = {
      ...apptVitals,
      ...Object.fromEntries(Object.entries(visitVitals).filter(([_, v]) => v !== undefined && v !== null && v !== '')),
    };
    const nextTests: string[] = vitals.nextInvestigationTests || [];
    const customInv = vitals.nextInvestigationCustom || '';
    const allInv = [...nextTests, ...(customInv ? [customInv] : [])];

    const age = selectedPatient.age || selectedPatient.dateOfBirth ? (() => {
      if (selectedPatient.age) return selectedPatient.age;
      if (selectedPatient.dateOfBirth) {
        const diff = new Date().getTime() - new Date(selectedPatient.dateOfBirth).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      }
      return '';
    })() : '';

    let pregnancyInfo = '';
    if (careMode === 'pregnancy' && selectedPatient.lmp) {
      const weeks = Math.floor((new Date().getTime() - new Date(selectedPatient.lmp).getTime()) / (1000*60*60*24*7));
      const days = Math.floor(((new Date().getTime() - new Date(selectedPatient.lmp).getTime()) / (1000*60*60*24)) % 7);
      pregnancyInfo = `${weeks}w ${days}d`;
    }

    openPrescription({
      providerName,
      providerSpecialty,
      patient: {
        name: selectedPatient.name,
        age: age || '',
        phone: selectedPatient.phone || '',
        address: selectedPatient.address || '',
        lmp: selectedPatient.lmp,
      },
      vitals: {
        weight: vitals.weight,
        height: vitals.height,
        bp: vitals.bp,
        pulse: vitals.pulse,
        temperature: vitals.temperature,
        fetalHeartRate: fetalHeartRateVal || vitals.fetalHeartRate,
        fundalHeight: fundalHeightVal || vitals.fundalHeight,
        pvExam: vitals.pvExam,
        psExam: vitals.psExam,
      },
      pregnancyInfo,
      chiefComplaint: latestVisit?.chiefComplaint || latestVisit?.subjective || '',
      clinicalFindings: latestVisit?.objective || '',
      observation: latestVisit?.objective || '',
      assessment: latestVisit?.assessment || '',
      diagnosis: latestVisit?.diagnosis || '',
      medications: medications.map((med: any) => ({
        name: med.name,
        dose: med.dose || '',
        frequency: med.frequency || '',
        notes: med.notes || '',
      })),
      investigations: allInv,
      advice: latestVisit?.planNotes || '',
      nextFollowUp: selectedPatient.nextReview || '',
      nextVaccinationDate: ((latestVisit?.vitals as any) || {}).nextImmunisationDate || '',
    });
  };

  const extractLabMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const res = await fetch(`/api/patients/${patientId}/extract-lab-results`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to extract lab results');
      return res.json();
    },
    onSuccess: (data) => {
      setExtractionStatus(data.message || `Extracted ${data.extracted} results`);
      if (selectedPatient) {
        queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/lab-results`] });
      }
      setTimeout(() => setExtractionStatus(null), 5000);
    },
    onError: (err: any) => {
      setExtractionStatus(`Error: ${err.message}`);
      setTimeout(() => setExtractionStatus(null), 5000);
    },
  });

  const patientsQuery = useQuery({
    queryKey: ['/api/patients', clinicianProvider?.id],
    queryFn: async () => {
      const url = clinicianProvider?.id ? `/api/patients?providerId=${clinicianProvider.id}` : '/api/patients';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch patients');
      return res.json();
    }
  });
  const patients = patientsQuery.data || [];

  const hormoneQuery = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/hormones`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${selectedPatient?.id}/hormones`);
      if (!res.ok) throw new Error('Failed to fetch hormone data');
      return res.json();
    },
    enabled: !!selectedPatient
  });
  const hormoneData = hormoneQuery.data || [];

  const pregnancyQuery = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/pregnancy-metrics`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${selectedPatient?.id}/pregnancy-metrics`);
      if (!res.ok) throw new Error('Failed to fetch pregnancy data');
      return res.json();
    },
    enabled: !!selectedPatient
  });
  const pregnancyData = pregnancyQuery.data || [];

  const follicleQuery = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/follicle-data`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${selectedPatient?.id}/follicle-data`);
      if (!res.ok) throw new Error('Failed to fetch follicle data');
      return res.json();
    },
    enabled: !!selectedPatient
  });
  const follicleData = follicleQuery.data || [];

  const usgQuery = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/usg-data`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${selectedPatient?.id}/usg-data`);
      if (!res.ok) throw new Error('Failed to fetch USG data');
      return res.json();
    },
    enabled: !!selectedPatient
  });
  const usgData = usgQuery.data || [];

  const visitHistoryQuery = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/visit-history`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${selectedPatient?.id}/visit-history`);
      if (!res.ok) throw new Error('Failed to fetch visit history');
      return res.json();
    },
    enabled: !!selectedPatient
  });
  const visitHistory = visitHistoryQuery.data || [];
  const latestVisit = visitHistory.length > 0 ? visitHistory[visitHistory.length - 1] : null;

  React.useEffect(() => {
    setFundalHeightVal((latestVisit?.vitals as any)?.fundalHeight || '');
    setFetalHeartRateVal((latestVisit?.vitals as any)?.fetalHeartRate || '');
  }, [latestVisit?.id]);

  const medicationsQuery = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/medications`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${selectedPatient?.id}/medications`);
      if (!res.ok) throw new Error('Failed to fetch medications');
      return res.json();
    },
    enabled: !!selectedPatient
  });
  const medications = medicationsQuery.data || [];

  const labResultsQuery = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/lab-results`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${selectedPatient?.id}/lab-results`);
      if (!res.ok) throw new Error('Failed to fetch lab results');
      return res.json();
    },
    enabled: !!selectedPatient
  });
  const labResults = labResultsQuery.data || [];
  const labResultsLoaded = labResultsQuery.isSuccess;

  const labDocumentsQuery = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/documents`, 'lab'],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${selectedPatient?.id}/documents`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const docs = await res.json();
      return docs.filter((d: any) => d.category === 'Lab Report');
    },
    enabled: !!selectedPatient
  });
  const labDocuments = labDocumentsQuery.data || [];
  const labDocumentsLoaded = labDocumentsQuery.isSuccess;

  useEffect(() => {
    if (selectedPatient && labDocumentsLoaded && labResultsLoaded && !extractLabMutation.isPending) {
      const pid = selectedPatient.id;
      if (labDocuments.length > 0 && labResults.length === 0 && !autoExtractTriggeredRef.current.has(pid)) {
        autoExtractTriggeredRef.current.add(pid);
        extractLabMutation.mutate(pid);
      }
    }
  }, [selectedPatient?.id, labDocumentsLoaded, labResultsLoaded, labDocuments.length, labResults.length, extractLabMutation.isPending]);

  const fertilityAnalyticsQuery = useQuery({
    queryKey: ['/api/analytics/fertility'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/fertility');
      if (!res.ok) throw new Error('Failed to fetch fertility analytics');
      return res.json();
    }
  });
  const fertilityAnalyticsData = fertilityAnalyticsQuery.data || [];

  const follicleDistributionQuery = useQuery({
    queryKey: ['/api/analytics/follicle-distribution'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/follicle-distribution');
      if (!res.ok) throw new Error('Failed to fetch follicle distribution');
      return res.json();
    }
  });
  const follicleSizeDistribution = follicleDistributionQuery.data || [];

  const pregnancyRiskQuery = useQuery({
    queryKey: ['/api/analytics/pregnancy-risk'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/pregnancy-risk');
      if (!res.ok) throw new Error('Failed to fetch pregnancy risk data');
      return res.json();
    }
  });
  const pregnancyRiskData = pregnancyRiskQuery.data || [];

  const postpartumQuery = useQuery({
    queryKey: ['/api/analytics/postpartum'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/postpartum');
      if (!res.ok) throw new Error('Failed to fetch postpartum data');
      return res.json();
    }
  });
  const postpartumScoreData = postpartumQuery.data || [];

  const medicineCatalogQuery = useQuery({
    queryKey: ['/api/medicine-catalog'],
    queryFn: async () => {
      const res = await fetch('/api/medicine-catalog');
      if (!res.ok) throw new Error('Failed to fetch medicine catalog');
      return res.json();
    }
  });
  const medicineCatalog = medicineCatalogQuery.data || [];
  const [newMedName, setNewMedName] = useState('');
  const [newMedGeneric, setNewMedGeneric] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedFrequency, setNewMedFrequency] = useState('');
  const [newMedRoute, setNewMedRoute] = useState('Oral');
  const [newMedCategory, setNewMedCategory] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('');

  const addCatalogMutation = useMutation({
    mutationFn: async (entry: any) => {
      const res = await fetch('/api/medicine-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error('Failed to add medicine');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medicine-catalog'] });
      setNewMedName(''); setNewMedGeneric(''); setNewMedDose(''); setNewMedFrequency(''); setNewMedRoute('Oral'); setNewMedCategory('');
    },
  });

  const deleteCatalogMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/medicine-catalog/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove medicine');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medicine-catalog'] });
    },
  });

  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null);
  const [editCatalogData, setEditCatalogData] = useState<any>({});

  const updateCatalogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/medicine-catalog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update medicine');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medicine-catalog'] });
      setEditingCatalogId(null);
    },
  });

  const [editingMedId, setEditingMedId] = useState<number | null>(null);
  const [editMedData, setEditMedData] = useState<any>({});

  const updateMedMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/medications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update medication');
      return res.json();
    },
    onSuccess: () => {
      if (selectedPatient) queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/medications`] });
      setEditingMedId(null);
    },
  });

  const deleteMedMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/medications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete medication');
    },
    onSuccess: () => {
      if (selectedPatient) queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/medications`] });
    },
  });

  const [editingHistory, setEditingHistory] = useState(false);
  const [editHistoryData, setEditHistoryData] = useState<{ medical: string[]; surgical: string[]; drug: string[]; allergies: string[] }>({ medical: [], surgical: [], drug: [], allergies: [] });
  const [newHistoryItem, setNewHistoryItem] = useState({ medical: '', surgical: '', drug: '', allergies: '' });

  const updateHistoryMutation = useMutation({
    mutationFn: async (history: any) => {
      const res = await fetch(`/api/patients/${selectedPatient!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      });
      if (!res.ok) throw new Error('Failed to update history');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      setEditingHistory(false);
    },
  });

  const [selectedInvestigations, setSelectedInvestigations] = useState<Set<string>>(new Set());
  const [customInvestigations, setCustomInvestigations] = useState<{ name: string; description: string }[]>([]);
  const [newInvestigationName, setNewInvestigationName] = useState('');
  const [showAddInvestigation, setShowAddInvestigation] = useState(false);

  const toggleInvestigation = (name: string) => {
    setSelectedInvestigations(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const getCompletedInvestigations = () => {
    const completed = new Map<string, { date: string; source: string }>();

    (labResults || []).forEach((lr: any) => {
      const name = (lr.testName || '').toLowerCase().trim();
      if (name) completed.set(name, { date: lr.date, source: 'Lab Result' });
    });

    (usgData || []).forEach((u: any) => {
      if (u.week) {
        const weekNum = Number(u.week);
        if (weekNum <= 10) completed.set('usg - dating scan', { date: '', source: `USG Week ${u.week}` });
        else if (weekNum <= 14) completed.set('usg - nt scan', { date: '', source: `USG Week ${u.week}` });
        else if (weekNum <= 20) completed.set('usg - anomaly scan (tiffa)', { date: '', source: `USG Week ${u.week}` });
        else if (weekNum <= 28) completed.set('usg - fetal echocardiography', { date: '', source: `USG Week ${u.week}` });
        else if (weekNum <= 32) completed.set('usg - growth scan', { date: '', source: `USG Week ${u.week}` });
        else if (weekNum <= 36) completed.set('usg - growth scan (repeat)', { date: '', source: `USG Week ${u.week}` });
        else completed.set('usg - efw & doppler', { date: '', source: `USG Week ${u.week}` });
      }
    });

    (labDocuments || []).forEach((doc: any) => {
      const docName = (doc.name || '').toLowerCase().trim();
      if (docName) completed.set(docName, { date: doc.date, source: 'Uploaded Report' });
    });

    return completed;
  };

  const investigationAliases: Record<string, string[]> = {
    'cbc (complete blood count)': ['cbc', 'complete blood count', 'hemogram', 'haemogram', 'hemoglobin', 'haemoglobin', 'wbc', 'platelet', 'rbc count', 'hematocrit', 'blood count'],
    'cbc (repeat)': ['cbc', 'complete blood count', 'hemogram', 'haemogram', 'hemoglobin', 'haemoglobin'],
    'cbc + coagulation profile': ['cbc', 'coagulation', 'pt inr', 'aptt', 'prothrombin', 'bleeding time', 'clotting time'],
    'blood group & rh typing': ['blood group', 'rh typing', 'abo', 'rh factor', 'blood type'],
    'tsh (thyroid stimulating hormone)': ['tsh', 'thyroid stimulating', 'thyroid function'],
    'tsh (repeat if abnormal)': ['tsh', 'thyroid stimulating'],
    'tsh (repeat)': ['tsh', 'thyroid stimulating'],
    'random blood sugar (rbs)': ['rbs', 'random blood sugar', 'blood sugar', 'glucose random', 'blood glucose'],
    'ogtt (75g glucose tolerance test)': ['ogtt', 'glucose tolerance', 'gtt', 'oral glucose', 'fasting glucose', 'post prandial'],
    'glucose tolerance test': ['ogtt', 'glucose tolerance', 'gtt', 'oral glucose'],
    'hiv, hbsag, vdrl': ['hiv', 'hbsag', 'vdrl', 'hepatitis', 'hbv', 'hcv', 'syphilis'],
    'urine routine & microscopy': ['urine routine', 'urine microscopy', 'urinalysis', 'urine analysis', 'urine examination', 'urine test'],
    'urine routine': ['urine routine', 'urine microscopy', 'urinalysis', 'urine analysis', 'proteinuria'],
    'urine culture': ['urine culture', 'urine c/s', 'bacteriuria'],
    'rubella igg': ['rubella', 'rubella igg', 'german measles'],
    'blood pressure': ['blood pressure', 'bp recording'],
    'hormonal panel': ['fsh', 'lh', 'estradiol', 'e2', 'progesterone'],
    'day 2/3 hormonal panel': ['fsh', 'lh', 'amh', 'estradiol', 'anti mullerian'],
    'nt scan (nuchal translucency)': ['nt scan', 'nuchal translucency', 'nuchal fold'],
    'dual marker (papp-a + free β-hcg)': ['dual marker', 'papp-a', 'papp a', 'free beta hcg', 'double marker', 'first trimester screening'],
    'quadruple marker': ['quadruple marker', 'quad marker', 'afp', 'quad screen', 'triple marker'],
    'anti-d injection': ['anti-d', 'anti d', 'rhogam', 'rh immunoglobulin'],
    'gbs screening (vaginal swab)': ['gbs', 'group b strep', 'vaginal swab', 'streptococcus'],
    'nst (non-stress test)': ['nst', 'non-stress', 'non stress', 'cardiotocograph', 'ctg'],
    'nst (weekly)': ['nst', 'non-stress', 'non stress', 'ctg'],
    'bpp (biophysical profile)': ['bpp', 'biophysical profile'],
    'bishop score assessment': ['bishop score', 'cervical readiness'],
    'lipid profile': ['lipid', 'cholesterol', 'triglycerides', 'hdl', 'ldl', 'vldl'],
    'lft, kft': ['lft', 'kft', 'liver function', 'kidney function', 'sgot', 'sgpt', 'creatinine', 'bilirubin', 'albumin', 'ast', 'alt', 'bun', 'urea'],
    'vitamin d, b12': ['vitamin d', 'vitamin b12', '25 hydroxy'],
    'vitamin d, b12, ferritin': ['vitamin d', 'vitamin b12', 'ferritin', '25 hydroxy'],
    'day 21 progesterone': ['progesterone', 'day 21'],
    'semen analysis': ['semen analysis', 'sperm count', 'sperm motility'],
    'hsg (hysterosalpingography)': ['hsg', 'hysterosalpingography', 'tubal patency'],
    'karyotype': ['karyotype', 'chromosomal analysis'],
    'fasting insulin + glucose': ['fasting insulin', 'fasting glucose', 'homa-ir', 'insulin resistance'],
    'prolactin': ['prolactin', 'prl'],
    'tsh, free t3, free t4': ['tsh', 'free t3', 'free t4', 'ft3', 'ft4', 'triiodothyronine', 'thyroxine'],
  };

  const isInvestigationCompleted = (testName: string, completedMap: Map<string, { date: string; source: string }>) => {
    const lower = testName.toLowerCase().trim();
    if (completedMap.has(lower)) return completedMap.get(lower);

    const aliases = investigationAliases[lower] || [];
    const entries = Array.from(completedMap.entries());
    for (const [key, val] of entries) {
      if (key === lower) return val;
      if (aliases.some(alias => key.includes(alias))) return val;
    }
    return null;
  };

  const [showAddMedRow, setShowAddMedRow] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dose: '', frequency: '', startDate: '', status: 'Active', notes: '' });
  const [medSuggestions, setMedSuggestions] = useState<any[]>([]);
  const [showMedSuggestions, setShowMedSuggestions] = useState(false);
  const [editMedSuggestions, setEditMedSuggestions] = useState<any[]>([]);
  const [showEditMedSuggestions, setShowEditMedSuggestions] = useState(false);

  const filterCatalogSuggestions = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return medicineCatalog.filter((m: any) =>
      (m.name || '').toLowerCase().includes(q) || (m.genericName || '').toLowerCase().includes(q)
    ).slice(0, 6);
  };

  const addMedMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/patients/${selectedPatient!.id}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add medication');
      return res.json();
    },
    onSuccess: () => {
      if (selectedPatient) queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/medications`] });
      setShowAddMedRow(false);
      setNewMed({ name: '', dose: '', frequency: '', startDate: '', status: 'Active', notes: '' });
    },
  });

  const dashboardStatsQuery = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    },
    refetchInterval: 60000,
  });
  const dashStats = dashboardStatsQuery.data;

  const pcosQuery = useQuery({
    queryKey: ['/api/analytics/pcos'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/pcos');
      if (!res.ok) throw new Error('Failed to fetch PCOS data');
      return res.json();
    }
  });
  const pcosSymptomData = pcosQuery.data || [];

  const appointmentsQuery = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      const res = await fetch('/api/appointments');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const appointments = appointmentsQuery.data || [];

  const invoicesQuery = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      const results: any[] = [];
      for (const p of patients) {
        try {
          const res = await fetch(`/api/patients/${p.id}/invoices`);
          if (res.ok) {
            const data = await res.json();
            results.push(...data.map((inv: any) => ({ ...inv, patientName: p.name })));
          }
        } catch {}
      }
      return results;
    },
    enabled: patients.length > 0
  });
  const invoices = invoicesQuery.data || [];

  const queuePatients = useMemo(() => {
    const dateAppts = appointments.filter((a: any) => a.date >= queueDateFrom && a.date <= queueDateTo);
    dateAppts.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
    return dateAppts.map((apt: any) => {
      const patient = patients.find((p: any) => p.id === apt.patientId);
      return patient ? { ...patient, appointmentDate: apt.date, appointmentTime: apt.time, appointmentType: apt.type, appointmentId: apt.id, appointmentStatus: apt.status } : null;
    }).filter(Boolean);
  }, [appointments, patients, queueDateFrom, queueDateTo]);

  const searchResults = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const q = patientSearch.toLowerCase().trim();
    return patients.filter((p: any) => p.name?.toLowerCase().includes(q)).slice(0, 20);
  }, [patients, patientSearch]);

  const appointmentsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    appointments.forEach((apt: any) => {
      if (apt.date) {
        const dayOfMonth = new Date(apt.date).getDate();
        if (!map[dayOfMonth]) map[dayOfMonth] = [];
        const patient = patients.find((p: any) => p.id === apt.patientId);
        map[dayOfMonth].push({ ...apt, patientName: patient?.name || 'Unknown' });
      }
    });
    return map;
  }, [appointments, patients]);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map((n: string) => n[0]).join('');
  };

  useEffect(() => {
    if (patients.length > 0 && !selectedPatient) {
      setSelectedPatient(patients[0]);
    }
  }, [patients, selectedPatient]);

  // Set the theme attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'clinician');
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  const navigateToPatient = (patient: typeof patients[0]) => {
    setSelectedPatient(patient);
    setSelectedTrailVisitId(null);
    setActiveView("patient_detail");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 z-20">
        <div className="p-6">
          <h1 className="text-white font-serif text-xl tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
               <Stethoscope className="w-4 h-4 text-white" />
            </div>
            Helix<span className="text-blue-400">Care</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2 font-medium">Clinician OS v2.1</p>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          <Button 
            variant={activeView === 'dashboard' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start ${activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard className="mr-3 h-4 w-4" /> Dashboard
          </Button>
          <Button 
            variant={activeView === 'patient_detail' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start ${activeView === 'patient_detail' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
            onClick={() => setActiveView('patient_detail')}
          >
            <Users className="mr-3 h-4 w-4" /> Patients
          </Button>
          <Button 
            variant={activeView === 'schedule' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start ${activeView === 'schedule' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
            onClick={() => setActiveView('schedule')}
          >
            <CalendarIcon className="mr-3 h-4 w-4" /> Schedule
          </Button>
          <Button 
            variant={activeView === 'analytics' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start ${activeView === 'analytics' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
            onClick={() => setActiveView('analytics')}
          >
            <Activity className="mr-3 h-4 w-4" /> Analytics
          </Button>
          <Button 
            variant={activeView === 'revenue' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start ${activeView === 'revenue' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
            onClick={() => setActiveView('revenue')}
          >
            <Briefcase className="mr-3 h-4 w-4" /> Revenue
          </Button>
          <Button 
            variant={activeView === 'settings' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start ${activeView === 'settings' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
            onClick={() => setActiveView('settings')}
          >
            <Settings className="mr-3 h-4 w-4" /> Profile & Settings
          </Button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
             <Avatar className="h-9 w-9 border border-slate-600">
                <AvatarFallback className="bg-slate-700 text-slate-300">{providerInitials}</AvatarFallback>
             </Avatar>
             <div className="text-sm">
                <p className="text-white font-medium">{providerName}</p>
                <p className="text-xs text-slate-500">{providerSpecialty}</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-50">
        
        {/* NEW DASHBOARD VIEW */}
        {activeView === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6">
             <div className="max-w-7xl mx-auto space-y-6">
                
                {/* TOP BAR - TODAY AT A GLANCE */}
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                   <div className="flex items-center gap-8">
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-blue-50/50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors" onClick={() => navigate('/clinician/patients/today-appointments')} data-testid="link-today-appointments">
                         <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Today's Appointments</p>
                            <p className="text-xl font-bold text-slate-900" data-testid="stat-today-appointments">{dashStats?.todayAppointments ?? '—'}</p>
                         </div>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-purple-50/50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors" onClick={() => navigate('/clinician/patients/fertility')} data-testid="link-fertility-active">
                         <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Dna className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Fertility Active</p>
                            <p className="text-xl font-bold text-slate-900" data-testid="stat-fertility-active">{dashStats?.fertilityActive ?? '—'}</p>
                         </div>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-pink-50/50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors" onClick={() => navigate('/clinician/patients/pregnancy')} data-testid="link-pregnancy-followups">
                         <div className="p-2 bg-pink-50 rounded-lg text-pink-600"><Baby className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pregnancy Follow-ups</p>
                            <p className="text-xl font-bold text-slate-900" data-testid="stat-pregnancy-followups">{dashStats?.pregnancyFollowups ?? '—'}</p>
                         </div>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-indigo-50/50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors" onClick={() => navigate('/clinician/patients/referrals')} data-testid="link-referrals">
                         <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><FileText className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Referrals</p>
                            <p className="text-xl font-bold text-slate-900" data-testid="stat-referrals">{dashStats?.totalReferrals ?? '—'}</p>
                         </div>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-rose-50/50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors" onClick={() => navigate('/clinician/patients/high-risk')} data-testid="link-high-risk">
                         <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><AlertTriangle className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">High Risk Alerts</p>
                            <p className="text-xl font-bold text-slate-900" data-testid="stat-high-risk">{dashStats?.highRiskAlerts ?? '—'}</p>
                         </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                      <p className="text-xs text-slate-500">Total Patients: {dashStats?.totalPatients ?? '—'}</p>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  
                  {/* LEFT COLUMN - URGENT & SCHEDULE */}
                  <div className="col-span-2 space-y-6">
                     
                     {/* SECTION 1 - PRIORITY ATTENTION PANEL */}
                     <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <AlertCircle className="w-4 h-4 text-rose-600" />
                           <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Needs Doctor Attention</h3>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                           {(dashStats?.priorityPatients || []).length > 0 ? (dashStats.priorityPatients as any[]).map((pp: any, idx: number) => {
                              const borderColors: Record<string, string> = { action: 'border-l-rose-500', review: 'border-l-amber-500', alert: 'border-l-amber-500' };
                              const badgeColors: Record<string, string> = { action: 'bg-rose-100 text-rose-700', review: 'bg-amber-100 text-amber-700', alert: 'bg-amber-100 text-amber-700' };
                              const avatarColors: Record<string, string> = { fertility: 'border-rose-100 bg-rose-50 text-rose-700', pregnancy: 'border-amber-100 bg-amber-50 text-amber-700', postpartum: 'border-slate-100 bg-slate-50 text-slate-600' };
                              const typeIcons: Record<string, any> = { fertility: <Microscope className="w-3 h-3 text-purple-500" />, pregnancy: <Baby className="w-3 h-3 text-pink-500" />, postpartum: <Brain className="w-3 h-3 text-slate-500" /> };
                              const typeLabels: Record<string, string> = { fertility: 'Fertility Follow-up', pregnancy: 'Pregnancy Follow-up', postpartum: 'Postpartum Check' };
                              const patient = patients.find((p: any) => p.id === pp.id) || pp;
                              return (
                                 <Card key={pp.id} data-testid={`priority-card-${idx}`} className={`border-l-4 ${borderColors[pp.priorityLevel] || 'border-l-slate-300'} shadow-sm cursor-pointer hover:shadow-md transition-shadow`} onClick={() => patient && navigateToPatient(patient)}>
                                    <CardContent className="p-4">
                                       <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                             <Avatar className={`h-8 w-8 text-xs border ${avatarColors[pp.priorityType] || 'border-slate-100 bg-slate-50 text-slate-600'}`}>
                                                <AvatarFallback>{getInitials(pp.name)}</AvatarFallback>
                                             </Avatar>
                                             <div>
                                                <p data-testid={`text-priority-name-${idx}`} className="font-bold text-sm text-slate-900">{pp.name}</p>
                                                <p className="text-[10px] text-slate-500">{pp.type || pp.priorityType}</p>
                                             </div>
                                          </div>
                                          <Badge className={`${badgeColors[pp.priorityLevel] || 'bg-slate-100 text-slate-700'} hover:opacity-80 border-none text-[10px]`}>{pp.priorityLevel === 'action' ? 'Action' : pp.priorityLevel === 'review' ? 'Review' : 'Alert'}</Badge>
                                       </div>
                                       <div className="space-y-1">
                                          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                                             {typeIcons[pp.priorityType] || <Users className="w-3 h-3" />} {typeLabels[pp.priorityType] || 'Follow-up'}
                                          </div>
                                       </div>
                                    </CardContent>
                                 </Card>
                              );
                           }) : (
                              <div className="col-span-3 py-8 text-center text-slate-400 text-sm">No priority patients at this time</div>
                           )}
                        </div>
                     </div>

                     {/* SECTION 2 - TODAY'S PATIENT FLOW */}
                     <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                           <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <CalendarCheck className="w-4 h-4 text-blue-600" /> Patient Flow
                           </CardTitle>
                           <div className="flex items-center gap-1.5">
                              <Input
                                type="date"
                                value={queueDateFrom}
                                onChange={(e) => { setQueueDateFrom(e.target.value); if (e.target.value > queueDateTo) setQueueDateTo(e.target.value); }}
                                className="h-7 text-xs w-[120px] border-slate-200"
                                data-testid="input-queue-date-from"
                              />
                              <span className="text-[10px] text-slate-400">to</span>
                              <Input
                                type="date"
                                value={queueDateTo}
                                onChange={(e) => { setQueueDateTo(e.target.value); if (e.target.value < queueDateFrom) setQueueDateFrom(e.target.value); }}
                                className="h-7 text-xs w-[120px] border-slate-200"
                                data-testid="input-queue-date-to"
                              />
                              <span className="text-xs text-slate-500 font-medium">{queuePatients.length}</span>
                           </div>
                        </CardHeader>
                        <CardContent className="p-0">
                           {queuePatients.length === 0 ? (
                              <div className="py-12 text-center text-slate-400 text-sm">
                                 No patients scheduled {queueDateFrom !== queueDateTo ? 'for this date range' : 'for this date'}
                              </div>
                           ) : (
                           <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-100">
                                 <tr>
                                    {queueDateFrom !== queueDateTo && <th className="px-3 py-3 font-medium w-20">Date</th>}
                                    <th className="px-3 py-3 font-medium w-16">Time</th>
                                    <th className="px-3 py-3 font-medium">Patient</th>
                                    <th className="px-3 py-3 font-medium">Type</th>
                                    <th className="px-3 py-3 font-medium">Status</th>
                                    <th className="px-3 py-3 font-medium w-10"></th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {queuePatients.map((p: any) => {
                                    const typeColors: Record<string, string> = {
                                       'Fertility': 'border-purple-200 text-purple-700 bg-purple-50',
                                       'Pregnant': 'border-pink-200 text-pink-700 bg-pink-50',
                                       'Pregnancy': 'border-pink-200 text-pink-700 bg-pink-50',
                                       'Postpartum': 'border-slate-200 text-slate-700 bg-slate-50',
                                       'IUI Cycle': 'border-purple-200 text-purple-700 bg-purple-50',
                                       'PCOS': 'border-emerald-200 text-emerald-700 bg-emerald-50',
                                       'Others': 'border-slate-200 text-slate-700 bg-slate-50',
                                    };
                                    return (
                                       <tr key={`${p.appointmentId}-${p.id}`} data-testid={`row-patient-${p.id}`} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigateToPatient(p)}>
                                          {queueDateFrom !== queueDateTo && <td className="px-3 py-3 text-slate-500 text-xs font-medium">{p.appointmentDate ? new Date(p.appointmentDate + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>}
                                          <td className="px-3 py-3 text-slate-500 font-medium">{p.appointmentTime || '--:--'}</td>
                                          <td className="px-3 py-3 font-semibold text-slate-900" data-testid={`text-patient-name-${p.id}`}>{p.name}</td>
                                          <td className="px-3 py-3"><Badge variant="outline" className={typeColors[p.type] || 'border-slate-200 text-slate-700 bg-slate-50'}>{p.type || 'General'}</Badge></td>
                                          <td className="px-3 py-3 text-slate-600 text-xs">{p.appointmentStatus || 'Scheduled'}</td>
                                          <td className="px-3 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                           )}
                        </CardContent>
                     </Card>

                     {/* SECTION 7 - CLINIC INSIGHTS (Bottom Panel) */}
                     <div className="grid grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-none shadow-md cursor-pointer hover:from-indigo-700 hover:to-indigo-800 transition-colors" onClick={() => navigate('/clinician/patients/pregnancy')} data-testid="link-pregnancy-insights">
                           <CardContent className="p-4">
                              <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-bold mb-1">Pregnancy Patients</p>
                              <div className="flex items-end justify-between">
                                 <p className="text-3xl font-bold" data-testid="stat-pregnancies-month">{dashStats?.pregnancyFollowups ?? '—'}</p>
                                 <TrendingUp className="w-4 h-4 text-indigo-300 mb-1" />
                              </div>
                           </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/clinician/patients/fertility')} data-testid="link-fertility-insights">
                           <CardContent className="p-4">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Fertility Patients</p>
                              <div className="flex items-end justify-between">
                                 <p className="text-2xl font-bold text-slate-800" data-testid="stat-fertility-insights">{dashStats?.fertilityActive ?? '—'}</p>
                                 <Dna className="w-4 h-4 text-purple-400 mb-1" />
                              </div>
                           </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/clinician/patients/postpartum')} data-testid="link-postpartum-insights">
                           <CardContent className="p-4">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Postpartum Active</p>
                              <div className="flex items-end justify-between">
                                 <p className="text-2xl font-bold text-slate-800" data-testid="stat-postpartum-insights">{dashStats?.postpartumActive ?? '—'}</p>
                                 <Activity className="w-4 h-4 text-slate-400 mb-1" />
                              </div>
                           </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                           <CardContent className="p-4">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Lab Reports</p>
                              <div className="flex items-end justify-between">
                                 <p className="text-2xl font-bold text-slate-800" data-testid="stat-lab-reports">{dashStats?.teamActivity?.labReportsTotal ?? '—'}</p>
                                 <FileText className="w-4 h-4 text-blue-400 mb-1" />
                              </div>
                           </CardContent>
                        </Card>
                     </div>
                  </div>

                  {/* RIGHT COLUMN - INTELLIGENCE SNAPSHOTS */}
                  <div className="space-y-6">
                     
                     {/* SECTION 3 - FERTILITY INTELLIGENCE SNAPSHOT */}
                     <Card className="shadow-sm border-slate-200 overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-purple-50/30">
                           <CardTitle className="text-sm font-bold text-purple-900 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-600" /> Fertility Intelligence
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                           <div className="divide-y divide-slate-100">
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/clinician/patients/fertility')} data-testid="link-fertility-row">
                                 <span className="text-xs font-medium text-slate-600">Active Fertility Patients</span>
                                 <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none" data-testid="stat-fertility-active-badge">{dashStats?.fertilityActive ?? 0} Active</Badge>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Today's Fertility Appointments</span>
                                 <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none">{queuePatients.filter((p: any) => ['fertility', 'ttc', 'iui', 'ivf', 'iui cycle', 'pcos'].some(t => (p.type || '').toLowerCase().includes(t))).length} Today</Badge>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Pending Lab Tasks</span>
                                 <Badge variant="outline" className="text-slate-500">{dashStats?.pendingLabTasks ?? 0} Pending</Badge>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     {/* SECTION 4 - PREGNANCY SNAPSHOT */}
                     <Card className="shadow-sm border-slate-200 overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-pink-50/30">
                           <CardTitle className="text-sm font-bold text-pink-900 flex items-center gap-2">
                              <Baby className="w-4 h-4 text-pink-600" /> Pregnancy Watch
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                           <div className="divide-y divide-slate-100">
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/clinician/patients/pregnancy')} data-testid="link-pregnancy-row">
                                 <span className="text-xs font-medium text-slate-600">Active Pregnancies</span>
                                 <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-200 border-none" data-testid="stat-pregnancy-watch">{dashStats?.pregnancyFollowups ?? 0} Patients</Badge>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/clinician/patients/high-bp')} data-testid="link-high-bp-row">
                                 <span className="text-xs font-medium text-slate-600">High BP Alerts</span>
                                 <div className="flex items-center gap-1 text-xs font-bold text-rose-600"><AlertCircle className="w-3 h-3" /> {dashStats?.clinicInsights?.highBpAlerts ?? 0}</div>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Today's Pregnancy Visits</span>
                                 <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">{queuePatients.filter((p: any) => ['pregnancy', 'pregnant', 'antenatal'].some(t => (p.type || '').toLowerCase().includes(t))).length} Today</Badge>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     {/* SECTION 5 - POSTPARTUM WATCH */}
                     <Card className="shadow-sm border-slate-200 overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-500"></div>
                        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
                           <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <Users className="w-4 h-4 text-slate-500" /> Postpartum Watch
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                           <div className="divide-y divide-slate-100">
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/clinician/patients/postpartum')} data-testid="link-postpartum-row">
                                 <span className="text-xs font-medium text-slate-600">Active Postpartum</span>
                                 <Badge className="bg-slate-100 text-slate-700 border-none" data-testid="stat-postpartum-watch">{dashStats?.postpartumActive ?? 0} Patients</Badge>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/clinician/patients/high-risk')} data-testid="link-high-risk-row">
                                 <span className="text-xs font-medium text-slate-600">High Risk Flags</span>
                                 <div className="flex items-center gap-1 text-xs font-bold text-rose-600"><Brain className="w-3 h-3" /> {dashStats?.highRiskAlerts ?? 0}</div>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Today's Visits</span>
                                 <Badge variant="outline" className="text-slate-500">{dashStats?.teamActivity?.visitsToday ?? 0} Today</Badge>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     {/* SECTION - USG REFERRALS */}
                     <Card className="shadow-sm border-slate-200 overflow-hidden">
                        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
                           <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <Activity className="w-4 h-4 text-blue-600" /> USG Referrals
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                           <div className="divide-y divide-slate-100">
                              {(dashStats?.usgReferralPatients || queuePatients.slice(0, 3)).map((p: any, idx: number) => (
                                 <div key={p.id || idx} data-testid={`usg-referral-${p.id || idx}`} className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer" onClick={() => { const pat = patients.find((pt: any) => pt.id === p.id); if (pat) navigateToPatient(pat); }}>
                                    <div>
                                       <p className="text-xs font-medium text-slate-800" data-testid={`text-usg-name-${p.id || idx}`}>{p.name}</p>
                                       <p className="text-[10px] text-slate-500">{p.usgType || p.type || 'USG Referral'}</p>
                                    </div>
                                    <Badge variant="outline" className="text-slate-500 border-slate-200">Scheduled</Badge>
                                 </div>
                              ))}
                              {(!dashStats?.usgReferralPatients || dashStats.usgReferralPatients.length === 0) && queuePatients.length === 0 && (
                                 <div className="p-4 text-center text-slate-400 text-xs">No USG referrals today</div>
                              )}
                           </div>
                        </CardContent>
                     </Card>

                     {/* SECTION 6 - CARE TEAM ACTIVITY */}
                     <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-3 px-4 border-b border-slate-100">
                           <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-blue-600" /> Team Activity
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                           <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-purple-700">C</div>
                              <div>
                                 <p className="text-xs font-medium text-slate-800">Clinical Notes</p>
                                 <p className="text-[10px] text-slate-500" data-testid="stat-clinical-notes">{dashStats?.teamActivity?.clinicalNotes ?? 0} entries today</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-emerald-700">N</div>
                              <div>
                                 <p className="text-xs font-medium text-slate-800">Nutrition Plans</p>
                                 <p className="text-[10px] text-slate-500" data-testid="stat-nutrition-plans">{dashStats?.teamActivity?.nutritionPlans ?? 0} total plans</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-rose-700">L</div>
                              <div>
                                 <p className="text-xs font-medium text-slate-800">Lab Reports</p>
                                 <p className="text-[10px] text-slate-500" data-testid="stat-lab-reports-team">{dashStats?.teamActivity?.labReportsTotal ?? 0} reports ({dashStats?.teamActivity?.labReportsToday ?? 0} today)</p>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                  </div>
                </div>

             </div>
          </div>
        )}

        {/* SCHEDULE VIEW (NEW) */}
        {activeView === 'schedule' && (
           <div className="flex-1 overflow-y-auto p-6 flex flex-col h-full">
              <div className="max-w-7xl mx-auto w-full h-full flex flex-col space-y-6">
                 
                 {/* Header & Sync Control */}
                 <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm shrink-0">
                    <div>
                       <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <CalendarIcon className="w-5 h-5 text-blue-600" /> Clinical Schedule
                       </h2>
                       <p className="text-xs text-slate-500 mt-1">Manage appointments, procedures, and on-call shifts.</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-xs font-medium text-slate-600">Google Calendar Synced</span>
                       </div>
                       <div className="h-6 w-px bg-slate-200"></div>
                       
                       <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                          <Button 
                             variant="ghost" 
                             size="sm" 
                             className={`h-7 text-xs ${scheduleViewMode === 'appointments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                             onClick={() => setScheduleViewMode('appointments')}
                          >
                             Appointments
                          </Button>
                          <Button 
                             variant="ghost" 
                             size="sm" 
                             className={`h-7 text-xs ${scheduleViewMode === 'occupancy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                             onClick={() => setScheduleViewMode('occupancy')}
                          >
                             Occupancy
                          </Button>
                       </div>

                       <div className="h-6 w-px bg-slate-200"></div>
                       <div className="flex bg-slate-100 p-1 rounded-lg">
                          <Button 
                             variant="ghost" 
                             size="sm" 
                             className={`h-7 text-xs ${calendarViewMode === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                             onClick={() => setCalendarViewMode('month')}
                          >
                             Month
                          </Button>
                          <Button 
                             variant="ghost" 
                             size="sm" 
                             className={`h-7 text-xs ${calendarViewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                             onClick={() => setCalendarViewMode('week')}
                          >
                             Week
                          </Button>
                          <Button 
                             variant="ghost" 
                             size="sm" 
                             className={`h-7 text-xs ${calendarViewMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                             onClick={() => setCalendarViewMode('day')}
                          >
                             Day
                          </Button>
                       </div>
                       <Button className="bg-blue-600 hover:bg-blue-700 h-9 text-xs">
                          <Plus className="w-4 h-4 mr-2" /> New Event
                       </Button>
                    </div>
                 </div>

                 {/* Capacity / Slot View Overlay */}
                 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-2">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" /> Slot Capacity & Planning
                       </h3>
                       <div className="flex gap-2">
                          <Badge variant="outline" className="bg-slate-50 text-slate-600">Total Planned: 24</Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-600">Utilization: 85%</Badge>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-6 gap-2 text-center text-xs">
                       <div className="col-span-1 bg-slate-50 p-2 rounded font-medium text-slate-500 flex items-center justify-center">Time Slot</div>
                       <div className="col-span-1 bg-blue-50/50 p-2 rounded font-bold text-slate-700">Main Clinic</div>
                       <div className="col-span-1 bg-purple-50/50 p-2 rounded font-bold text-slate-700">North Wing</div>
                       <div className="col-span-1 bg-emerald-50/50 p-2 rounded font-bold text-slate-700">South Center</div>
                       <div className="col-span-1 bg-amber-50/50 p-2 rounded font-bold text-slate-700">East Side</div>
                       <div className="col-span-1 bg-slate-100 p-2 rounded font-bold text-slate-900">Total</div>

                       {/* Slot Rows */}
                       <div className="col-span-1 p-2 text-slate-500 font-medium">09:00 - 10:00</div>
                       <div className="col-span-1 p-2 bg-blue-50/20 text-blue-700 font-bold">5</div>
                       <div className="col-span-1 p-2 bg-purple-50/20 text-purple-700 font-bold">2</div>
                       <div className="col-span-1 p-2 bg-emerald-50/20 text-emerald-700 font-bold">3</div>
                       <div className="col-span-1 p-2 bg-amber-50/20 text-amber-700 font-bold">1</div>
                       <div className="col-span-1 p-2 font-bold bg-slate-50">11</div>

                       <div className="col-span-1 p-2 text-slate-500 font-medium">10:00 - 11:00</div>
                       <div className="col-span-1 p-2 bg-blue-50/20 text-blue-700 font-bold">4</div>
                       <div className="col-span-1 p-2 bg-purple-50/20 text-purple-700 font-bold">3</div>
                       <div className="col-span-1 p-2 bg-emerald-50/20 text-emerald-700 font-bold">2</div>
                       <div className="col-span-1 p-2 bg-amber-50/20 text-amber-700 font-bold">0</div>
                       <div className="col-span-1 p-2 font-bold bg-slate-50">9</div>

                       <div className="col-span-1 p-2 text-slate-500 font-medium">11:00 - 12:00</div>
                       <div className="col-span-1 p-2 bg-blue-50/20 text-blue-700 font-bold">3</div>
                       <div className="col-span-1 p-2 bg-purple-50/20 text-purple-700 font-bold">0</div>
                       <div className="col-span-1 p-2 bg-emerald-50/20 text-emerald-700 font-bold">1</div>
                       <div className="col-span-1 p-2 bg-amber-50/20 text-amber-700 font-bold">0</div>
                       <div className="col-span-1 p-2 font-bold bg-slate-50">4</div>
                    </div>
                 </div>

                 {/* Resource & Staff Booking (NEW) */}
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm mb-2">
                    <div className="flex items-center justify-between mb-3">
                       <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-purple-600" /> Resource & Staff Booking
                       </h3>
                       <Button size="sm" variant="outline" className="h-7 text-xs bg-white text-slate-600 hover:text-purple-600 border-slate-200">
                          View All Availability
                       </Button>
                    </div>
                    
                    <div className="grid grid-cols-6 gap-3">
                       {/* Operation Theater Booking (NEW) */}
                       <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                          <DialogTrigger asChild>
                             <Card className="border-slate-200 shadow-sm bg-white hover:border-red-200 transition-colors cursor-pointer group col-span-1" onClick={() => setBookingType('surgery')}>
                                <CardContent className="p-3 text-center">
                                   <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-red-100 transition-colors">
                                      <Activity className="w-4 h-4" />
                                   </div>
                                   <p className="text-xs font-bold text-slate-700 mb-0.5">Schedule OT</p>
                                   <p className="text-[10px] text-emerald-600 font-medium flex items-center justify-center gap-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> OT-1 Free
                                   </p>
                                   <Button size="sm" className="w-full h-6 text-[10px] mt-2 bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white border-none shadow-none">Book Slot</Button>
                                </CardContent>
                             </Card>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                             <DialogHeader>
                                <DialogTitle>Book Operation Theater</DialogTitle>
                                <DialogDescription>
                                   Schedule a Surgery or C-Section procedure.
                                </DialogDescription>
                             </DialogHeader>
                             <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                   <Label htmlFor="procedure-type" className="text-right text-xs">
                                      Procedure
                                   </Label>
                                   <Select defaultValue="c_section">
                                      <SelectTrigger className="col-span-3 h-8 text-xs">
                                         <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                         <SelectItem value="c_section">C-Section (Elective)</SelectItem>
                                         <SelectItem value="surgery">Laparoscopy</SelectItem>
                                         <SelectItem value="hysteroscopy">Hysteroscopy</SelectItem>
                                         <SelectItem value="erpc">ERPC</SelectItem>
                                      </SelectContent>
                                   </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                   <Label htmlFor="patient-select" className="text-right text-xs">
                                      Patient
                                   </Label>
                                   <Select>
                                      <SelectTrigger className="col-span-3 h-8 text-xs">
                                         <SelectValue placeholder="Select patient" />
                                      </SelectTrigger>
                                      <SelectContent>
                                         {patients.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                         ))}
                                      </SelectContent>
                                   </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                   <Label htmlFor="date-time" className="text-right text-xs">
                                      Date & Time
                                   </Label>
                                   <div className="col-span-3 flex gap-2">
                                      <Input type="date" className="h-8 text-xs flex-1" />
                                      <Select>
                                         <SelectTrigger className="w-[100px] h-8 text-xs">
                                            <SelectValue placeholder="Time" />
                                         </SelectTrigger>
                                         <SelectContent>
                                            <SelectItem value="08:00">08:00 AM</SelectItem>
                                            <SelectItem value="09:00">09:00 AM</SelectItem>
                                            <SelectItem value="10:00">10:00 AM</SelectItem>
                                            <SelectItem value="11:00">11:00 AM</SelectItem>
                                            <SelectItem value="13:00">01:00 PM</SelectItem>
                                         </SelectContent>
                                      </Select>
                                   </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                   <Label className="text-right text-xs">
                                      Team
                                   </Label>
                                   <div className="col-span-3 space-y-2">
                                      <div className="flex items-center space-x-2">
                                         <Checkbox id="anesthetist" defaultChecked />
                                         <label htmlFor="anesthetist" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Anesthetist Required
                                         </label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                         <Checkbox id="pediatrician" />
                                         <label htmlFor="pediatrician" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Pediatrician (for C-Sec)
                                         </label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                         <Checkbox id="assistant" defaultChecked />
                                         <label htmlFor="assistant" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Surgical Assistant
                                         </label>
                                      </div>
                                   </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                   <Label htmlFor="notes" className="text-right text-xs">
                                      Notes
                                   </Label>
                                   <Input id="notes" placeholder="Special requirements..." className="col-span-3 h-8 text-xs" />
                                </div>
                             </div>
                             <DialogFooter>
                                <Button size="sm" variant="outline" onClick={() => setIsBookingOpen(false)}>Cancel</Button>
                                <Button size="sm" type="submit" onClick={() => { setIsBookingOpen(false); }}>Confirm Booking</Button>
                             </DialogFooter>
                          </DialogContent>
                       </Dialog>

                       {/* Pediatrician */}
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group col-span-1">
                          <CardContent className="p-3 text-center">
                             <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-100 transition-colors">
                                <Baby className="w-4 h-4" />
                             </div>
                             <p className="text-xs font-bold text-slate-700 mb-0.5">Pediatrician</p>
                             <p className="text-[10px] text-emerald-600 font-medium flex items-center justify-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Available
                             </p>
                             <Button size="sm" className="w-full h-6 text-[10px] mt-2 bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white border-none shadow-none">Book</Button>
                          </CardContent>
                       </Card>

                       {/* Anesthetist */}
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group col-span-1">
                          <CardContent className="p-3 text-center">
                             <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-100 transition-colors">
                                <Syringe className="w-4 h-4" />
                             </div>
                             <p className="text-xs font-bold text-slate-700 mb-0.5">Anesthetist</p>
                             <p className="text-[10px] text-amber-600 font-medium flex items-center justify-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Limited
                             </p>
                             <Button size="sm" className="w-full h-6 text-[10px] mt-2 bg-slate-100 text-slate-600 hover:bg-purple-600 hover:text-white border-none shadow-none">Request</Button>
                          </CardContent>
                       </Card>

                       {/* Lactation */}
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group col-span-1">
                          <CardContent className="p-3 text-center">
                             <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-pink-100 transition-colors">
                                <Heart className="w-4 h-4" />
                             </div>
                             <p className="text-xs font-bold text-slate-700 mb-0.5">Lactation</p>
                             <p className="text-[10px] text-emerald-600 font-medium flex items-center justify-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Available
                             </p>
                             <Button size="sm" className="w-full h-6 text-[10px] mt-2 bg-slate-100 text-slate-600 hover:bg-pink-600 hover:text-white border-none shadow-none">Book</Button>
                          </CardContent>
                       </Card>

                       {/* Assistant */}
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group col-span-1">
                          <CardContent className="p-3 text-center">
                             <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-indigo-100 transition-colors">
                                <Users className="w-4 h-4" />
                             </div>
                             <p className="text-xs font-bold text-slate-700 mb-0.5">Assistant</p>
                             <p className="text-[10px] text-emerald-600 font-medium flex items-center justify-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> 3 on Duty
                             </p>
                             <Button size="sm" className="w-full h-6 text-[10px] mt-2 bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white border-none shadow-none">Assign</Button>
                          </CardContent>
                       </Card>

                       {/* Nursing Home / Bed */}
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group col-span-1">
                          <CardContent className="p-3 text-center">
                             <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-2 group-hover:bg-slate-200 transition-colors">
                                <Briefcase className="w-4 h-4" />
                             </div>
                             <p className="text-xs font-bold text-slate-700 mb-0.5">Nursing Home</p>
                             <p className="text-[10px] text-rose-600 font-medium flex items-center justify-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Full (Waitlist)
                             </p>
                             <Button size="sm" className="w-full h-6 text-[10px] mt-2 bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white border-none shadow-none">Waitlist</Button>
                          </CardContent>
                       </Card>
                    </div>
                 </div>

                 {/* Calendar Grid */}
                 <Card className="flex-1 shadow-sm border-slate-200 flex flex-col overflow-hidden">
                    {/* Days Header - Different for Month/Week vs Day */}
                    {calendarViewMode !== 'day' ? (
                       <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                             <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {day}
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="border-b border-slate-200 bg-slate-50 py-2 px-4 shrink-0 flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-700">Wednesday, Oct 24</span>
                          <span className="text-xs text-slate-500">8:00 AM - 6:00 PM</span>
                       </div>
                    )}
                    
                    <div className="flex-1 overflow-y-auto relative bg-white">
                    {/* 1. MONTH VIEW */}
                    {calendarViewMode === 'month' && (
                       <div className="grid grid-cols-7 min-h-full auto-rows-fr divide-x divide-slate-100 divide-y border-b border-slate-100">
                          {/* Previous Month Days */}
                          {[29, 30].map(day => (
                             <div key={`prev-${day}`} className="min-h-[100px] bg-slate-50/50 p-2 opacity-50">
                                <span className="text-xs font-medium text-slate-400">{day}</span>
                             </div>
                          ))}

                          {/* Current Month Days (October) */}
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                             <div key={day} className={`min-h-[100px] p-2 hover:bg-slate-50 transition-colors relative group ${day === 24 ? 'bg-blue-50/30' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                   <span className={`text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full ${day === 24 ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                                      {day}
                                   </span>
                                   {day === 24 && <span className="text-[10px] font-bold text-blue-600">Today</span>}
                                </div>
                                
                                {/* Mock Events - Month View */}
                                <div className="space-y-1">
                                   {scheduleViewMode === 'occupancy' ? (
                                      // OCCUPANCY VIEW - MONTH
                                      <div className="space-y-1.5 mt-2">
                                         <div className="space-y-0.5">
                                            <div className="flex justify-between text-[10px] text-slate-500 font-medium"><span>OT Util</span> <span className={day > 20 ? "text-emerald-600" : "text-amber-600"}>{day > 20 ? "40%" : "90%"}</span></div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                               <div className={`h-full w-[${day > 20 ? 40 : 90}%] rounded-full ${day > 20 ? "bg-emerald-500" : "bg-amber-500"}`}></div>
                                            </div>
                                         </div>
                                      </div>
                                   ) : (
                                      // APPOINTMENTS VIEW - MONTH
                                      <>
                                         {appointmentsByDay[day] && (
                                            <>
                                               {appointmentsByDay[day].slice(0, 2).map((apt: any, aidx: number) => {
                                                  const eventColors = [
                                                     { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
                                                     { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
                                                  ];
                                                  const c = eventColors[aidx % eventColors.length];
                                                  return (
                                                     <div key={apt.id || aidx} data-testid={`calendar-event-${day}-${aidx}`} className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.text} border ${c.border} truncate font-medium flex items-center gap-1`}>
                                                        <div className={`w-1 h-1 rounded-full ${c.dot}`}></div> {apt.time} • {apt.patientName}
                                                     </div>
                                                  );
                                               })}
                                               {appointmentsByDay[day].length > 2 && (
                                                  <div className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 truncate font-medium opacity-70">
                                                     +{appointmentsByDay[day].length - 2} more...
                                                  </div>
                                               )}
                                            </>
                                         )}
                                      </>
                                   )}
                                </div>
                             </div>
                          ))}

                          {/* Next Month Days */}
                          {[1, 2].map(day => (
                             <div key={`next-${day}`} className="min-h-[100px] bg-slate-50/50 p-2 opacity-50">
                                <span className="text-xs font-medium text-slate-400">{day}</span>
                             </div>
                          ))}
                       </div>
                    )}

                    {/* 2. WEEK VIEW */}
                    {calendarViewMode === 'week' && (
                       <div className="flex min-h-full">
                          {/* Time Axis */}
                          <div className="w-12 shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col pt-10">
                             {Array.from({ length: 11 }, (_, i) => i + 8).map(hour => (
                                <div key={hour} className="h-20 text-right pr-2 text-[10px] text-slate-400 font-medium relative">
                                   <span className="-top-2 absolute right-2">{hour}:00</span>
                                </div>
                             ))}
                          </div>
                          {/* Days Columns */}
                          <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100">
                             {Array.from({ length: 7 }, (_, i) => i).map(dayIndex => (
                                <div key={dayIndex} className="relative pt-2">
                                   {/* Day Grid Lines */}
                                   {Array.from({ length: 11 }, (_, i) => i + 8).map(hour => (
                                      <div key={hour} className="h-20 border-b border-slate-50 w-full relative group">
                                         {/* Hover add button */}
                                         <div className="absolute inset-0 hover:bg-slate-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                                            <Plus className="w-3 h-3 text-blue-400" />
                                         </div>
                                      </div>
                                   ))}

                                   {/* EVENTS FOR THIS DAY */}
                                   {dayIndex === 3 && scheduleViewMode === 'appointments' && (
                                      <>
                                         {appointments.slice(0, 3).map((apt: any, aidx: number) => {
                                            const patient = patients.find((p: any) => p.id === apt.patientId);
                                            const weekColors = [
                                               { bg: 'bg-blue-100', border: 'border-blue-500', name: 'text-blue-800', desc: 'text-blue-600', hover: 'hover:bg-blue-200' },
                                               { bg: 'bg-pink-100', border: 'border-pink-500', name: 'text-pink-800', desc: 'text-pink-600', hover: 'hover:bg-pink-200' },
                                               { bg: 'bg-purple-100', border: 'border-purple-500', name: 'text-purple-800', desc: 'text-purple-600', hover: 'hover:bg-purple-200' },
                                            ];
                                            const c = weekColors[aidx % weekColors.length];
                                            const tops = [80, 150, 320];
                                            const heights = [60, 45, 90];
                                            return (
                                               <div key={apt.id || aidx} data-testid={`week-event-${apt.id || aidx}`} className={`absolute top-[${tops[aidx]}px] left-1 right-1 h-[${heights[aidx]}px] ${c.bg} border-l-2 ${c.border} rounded p-1 shadow-sm z-10 cursor-pointer ${c.hover} transition-colors`}>
                                                  <p className={`text-[10px] font-bold ${c.name}`}>{patient?.name || apt.reason || 'Appointment'}</p>
                                                  <p className={`text-[9px] ${c.desc}`}>{apt.type || apt.reason || 'Consultation'}</p>
                                               </div>
                                            );
                                         })}
                                      </>
                                   )}
                                   
                                   {dayIndex === 5 && scheduleViewMode === 'appointments' && (
                                      <div className="absolute top-[240px] left-1 right-1 h-[120px] bg-amber-100 border-l-2 border-amber-500 rounded p-1 shadow-sm z-10 cursor-pointer hover:bg-amber-200 transition-colors flex flex-col justify-center">
                                         <p className="text-[10px] font-bold text-amber-800">Dept Meeting</p>
                                         <p className="text-[9px] text-amber-600">Conference Room B</p>
                                      </div>
                                   )}

                                   {/* OCCUPANCY VIEW MOCKUP */}
                                   {scheduleViewMode === 'occupancy' && dayIndex >= 1 && dayIndex <= 5 && (
                                      <>
                                         {/* Random occupancy blocks */}
                                         <div className={`absolute top-[${100 + dayIndex * 20}px] left-0 right-0 h-[${60 + dayIndex * 10}px] bg-slate-100/50 border-y border-dashed border-slate-300 flex items-center justify-center`}>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest rotate-90 md:rotate-0">High Volume</span>
                                         </div>
                                      </>
                                   )}
                                </div>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* 3. DAY VIEW */}
                    {calendarViewMode === 'day' && (
                       <div className="flex min-h-full">
                          {/* Time Axis - Detailed */}
                          <div className="w-16 shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col pt-4">
                             {Array.from({ length: 11 }, (_, i) => i + 8).map(hour => (
                                <div key={hour} className="h-32 text-right pr-2 text-xs text-slate-500 font-bold relative">
                                   <span className="-top-2 absolute right-2">{hour}:00</span>
                                   <span className="top-14 absolute right-2 text-[10px] text-slate-300 font-normal">:30</span>
                                </div>
                             ))}
                          </div>
                          
                          {/* Day Column */}
                          <div className="flex-1 relative pt-4 px-4 bg-slate-50/10">
                             {Array.from({ length: 11 }, (_, i) => i + 8).map(hour => (
                                <div key={hour} className="h-32 border-b border-slate-100 w-full relative">
                                   <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-slate-100"></div>
                                </div>
                             ))}
                             
                             {/* Detailed Events for TODAY */}
                             {scheduleViewMode === 'appointments' ? (
                                <>
                                   {appointments.slice(0, 3).map((apt: any, aidx: number) => {
                                      const patient = patients.find((p: any) => p.id === apt.patientId);
                                      const dayStyles = [
                                         { top: 20, height: 90, borderColor: 'border-blue-200', borderLeft: 'border-l-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', avatarBg: 'bg-blue-50', avatarText: 'text-blue-700', avatarBorder: 'border-blue-100' },
                                         { top: 130, height: 60, borderColor: 'border-pink-200', borderLeft: 'border-l-pink-500', badgeBg: 'bg-pink-100', badgeText: 'text-pink-700', avatarBg: 'bg-pink-50', avatarText: 'text-pink-700', avatarBorder: 'border-pink-100' },
                                         { top: 270, height: 120, borderColor: 'border-purple-200', borderLeft: 'border-l-purple-500', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', avatarBg: 'bg-purple-50', avatarText: 'text-purple-700', avatarBorder: 'border-purple-100' },
                                      ];
                                      const s = dayStyles[aidx];
                                      return (
                                         <div key={apt.id || aidx} data-testid={`day-event-${apt.id || aidx}`} className={`absolute top-[${s.top}px] left-4 right-4 h-[${s.height}px] bg-white border ${s.borderColor} border-l-4 ${s.borderLeft} rounded shadow-sm hover:shadow-md transition-all p-3 flex justify-between items-start`}>
                                            <div>
                                               <div className="flex items-center gap-2 mb-1">
                                                  <Badge className={`${s.badgeBg} ${s.badgeText} hover:${s.badgeBg} border-none h-5 text-[10px]`}>{apt.type || apt.visitType || 'Consultation'}</Badge>
                                                  <span className="text-xs text-slate-500">{apt.time}{apt.endTime ? ` - ${apt.endTime}` : ''}</span>
                                               </div>
                                               <h3 className="font-bold text-slate-800 text-sm">{patient?.name || 'Patient'} - {apt.reason || apt.type || 'Appointment'}</h3>
                                               <p className="text-xs text-slate-500 mt-1 flex items-center gap-2"><MapPin className="w-3 h-3" /> {apt.room || 'Room TBD'} • {providerName}</p>
                                            </div>
                                            <Avatar className={`h-8 w-8 ${s.avatarBg} ${s.avatarText} border ${s.avatarBorder}`}>
                                               <AvatarFallback>{getInitials(patient?.name)}</AvatarFallback>
                                            </Avatar>
                                         </div>
                                      );
                                   })}
                                   {appointments.length >= 2 && (
                                      <div className="absolute top-[210px] left-4 right-4 h-[40px] bg-slate-100 rounded border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 font-medium">
                                         Free Slot (11:15 - 11:45)
                                      </div>
                                   )}
                                </>
                             ) : (
                                // OCCUPANCY DAY VIEW
                                <div className="absolute inset-0 p-4">
                                   <div className="h-full w-full bg-slate-50 rounded-xl border border-slate-200 p-6">
                                      <h3 className="font-bold text-slate-800 mb-4">Resource Utilization - Today</h3>
                                      <div className="space-y-6">
                                         <div>
                                            <div className="flex justify-between text-sm font-medium mb-2"><span>Operation Theater 1</span> <span className="text-emerald-600">Available from 3 PM</span></div>
                                            <div className="h-8 w-full bg-slate-200 rounded-md overflow-hidden flex">
                                               <div className="h-full w-[60%] bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">Booked</div>
                                               <div className="h-full w-[40%] bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">Free</div>
                                            </div>
                                         </div>
                                         <div>
                                            <div className="flex justify-between text-sm font-medium mb-2"><span>USG Room</span> <span className="text-amber-600">Heavy Load</span></div>
                                            <div className="h-8 w-full bg-slate-200 rounded-md overflow-hidden flex">
                                               <div className="h-full w-[30%] bg-rose-500"></div>
                                               <div className="h-full w-[20%] bg-rose-400"></div>
                                               <div className="h-full w-[40%] bg-rose-500"></div>
                                               <div className="h-full w-[10%] bg-emerald-500"></div>
                                            </div>
                                         </div>
                                         <div>
                                            <div className="flex justify-between text-sm font-medium mb-2"><span>Consultation Rooms</span> <span className="text-blue-600">Normal Flow</span></div>
                                            <div className="grid grid-cols-4 gap-2">
                                               <div className="h-12 rounded bg-rose-100 border border-rose-200 flex flex-col items-center justify-center">
                                                  <span className="text-xs font-bold text-rose-800">Room 1</span>
                                                  <span className="text-[10px] text-rose-600">Busy</span>
                                               </div>
                                               <div className="h-12 rounded bg-rose-100 border border-rose-200 flex flex-col items-center justify-center">
                                                  <span className="text-xs font-bold text-rose-800">Room 2</span>
                                                  <span className="text-[10px] text-rose-600">Busy</span>
                                               </div>
                                               <div className="h-12 rounded bg-emerald-100 border border-emerald-200 flex flex-col items-center justify-center">
                                                  <span className="text-xs font-bold text-emerald-800">Room 3</span>
                                                  <span className="text-[10px] text-emerald-600">Free</span>
                                               </div>
                                               <div className="h-12 rounded bg-rose-100 border border-rose-200 flex flex-col items-center justify-center">
                                                  <span className="text-xs font-bold text-rose-800">Room 4</span>
                                                  <span className="text-[10px] text-rose-600">Busy</span>
                                               </div>
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             )}
                          </div>
                       </div>
                    )}
                    </div>
                 </Card>
              </div>
           </div>
        )}

        {/* ANALYTICS VIEW (NEW) */}
        {activeView === 'analytics' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
             <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                   <div>
                      <h2 className="text-2xl font-bold text-slate-900 font-serif">Analytics Intelligence</h2>
                      <p className="text-slate-500 mt-1">Improving women's health outcomes at scale through data.</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <Select defaultValue="3m">
                         <SelectTrigger className="w-[140px] bg-white border-slate-200">
                            <SelectValue placeholder="Time Range" />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="1m">This Month</SelectItem>
                            <SelectItem value="3m">Last 3 Months</SelectItem>
                            <SelectItem value="1y">Last Year</SelectItem>
                         </SelectContent>
                      </Select>
                      <Button variant="outline" className="bg-white border-slate-200 text-slate-700">
                         <Download className="w-4 h-4 mr-2" /> Export Report
                      </Button>
                   </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="fertility" className="w-full space-y-6">
                   <TabsList className="bg-white border border-slate-200 p-1 h-12 rounded-xl w-full justify-start gap-2 shadow-sm">
                      <TabsTrigger value="fertility" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 rounded-lg h-9 px-4 text-slate-600">
                         🧬 Fertility
                      </TabsTrigger>
                      <TabsTrigger value="pregnancy" className="data-[state=active]:bg-pink-50 data-[state=active]:text-pink-700 rounded-lg h-9 px-4 text-slate-600">
                         🤰 Pregnancy Care
                      </TabsTrigger>
                      <TabsTrigger value="postpartum" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 rounded-lg h-9 px-4 text-slate-600">
                         🧑‍🍼 Postpartum
                      </TabsTrigger>
                      <TabsTrigger value="pcos" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg h-9 px-4 text-slate-600">
                         🌿 PCOS & Hormone
                      </TabsTrigger>
                      <TabsTrigger value="clinic" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-lg h-9 px-4 text-slate-600">
                         👩‍⚕️ Clinic Performance
                      </TabsTrigger>
                   </TabsList>

                   {/* 1. FERTILITY ANALYTICS */}
                   <TabsContent value="fertility" className="space-y-6">
                      {/* Key Metrics Row */}
                      <div className="grid grid-cols-4 gap-4">
                         <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-4">
                               <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Active Patients</p>
                               <p className="text-2xl font-bold text-slate-900">58</p>
                               <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600">
                                  <TrendingUp className="w-3 h-3" /> +12% this month
                               </div>
                            </CardContent>
                         </Card>
                         <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-4">
                               <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Ovulation Success</p>
                               <p className="text-2xl font-bold text-slate-900">87%</p>
                               <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" /> Target Met (&gt;85%)
                               </div>
                            </CardContent>
                         </Card>
                         <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-4">
                               <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Avg Follicle Size</p>
                               <p className="text-2xl font-bold text-slate-900">19.2 mm</p>
                               <div className="flex items-center gap-1 mt-2 text-xs font-medium text-slate-500">
                                  At trigger time
                               </div>
                            </CardContent>
                         </Card>
                         <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-4">
                               <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Pregnancy Rate / Cycle</p>
                               <p className="text-2xl font-bold text-slate-900">24%</p>
                               <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600">
                                  <TrendingUp className="w-3 h-3" /> Top 10% benchmark
                               </div>
                            </CardContent>
                         </Card>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                         <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                               <CardTitle className="text-base font-bold text-slate-800">Conception Trends</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <div className="h-[300px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <AreaChart data={fertilityAnalyticsData}>
                                        <defs>
                                           <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                           </linearGradient>
                                           <linearGradient id="colorPreg" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                           </linearGradient>
                                        </defs>
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="active" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorActive)" name="Active Cycles" />
                                        <Area type="monotone" dataKey="pregnancies" stroke="#10b981" fillOpacity={1} fill="url(#colorPreg)" name="Pregnancies" />
                                     </AreaChart>
                                  </ResponsiveContainer>
                               </div>
                            </CardContent>
                         </Card>

                         <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                               <CardTitle className="text-base font-bold text-slate-800">Follicle Size at Trigger</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <div className="h-[300px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <BarChart data={follicleSizeDistribution}>
                                        <XAxis dataKey="size" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{fill: '#f1f5f9'}} />
                                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Patients" />
                                     </BarChart>
                                  </ResponsiveContainer>
                               </div>
                            </CardContent>
                         </Card>
                      </div>

                      {/* Probability Intelligence */}
                      <Card className="bg-slate-900 text-white border-none shadow-md overflow-hidden relative">
                         <div className="absolute top-0 right-0 p-32 bg-purple-600/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                         <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                               <Sparkles className="w-4 h-4 text-yellow-400" /> Probability Intelligence
                            </CardTitle>
                         </CardHeader>
                         <CardContent>
                            <div className="grid grid-cols-3 gap-8">
                               <div>
                                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Cycle Timing Misses</p>
                                  <p className="text-3xl font-bold text-white">12%</p>
                                  <p className="text-slate-400 text-xs mt-1">Patients missed ovulation window</p>
                                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                     <div className="bg-rose-500 h-full w-[12%] rounded-full"></div>
                                  </div>
                               </div>
                               <div>
                                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Low Probability Cohort</p>
                                  <p className="text-3xl font-bold text-white">8</p>
                                  <p className="text-slate-400 text-xs mt-1">Patients &lt;15% prob for 3+ cycles</p>
                                  <Button size="sm" variant="secondary" className="mt-3 h-7 text-xs w-full">Review Protocols</Button>
                               </div>
                               <div>
                                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Success Prediction</p>
                                  <p className="text-3xl font-bold text-emerald-400">92%</p>
                                  <p className="text-slate-400 text-xs mt-1">Accuracy of outcome models</p>
                               </div>
                            </div>
                         </CardContent>
                      </Card>
                   </TabsContent>

                   {/* 2. PREGNANCY ANALYTICS */}
                   <TabsContent value="pregnancy" className="space-y-6">
                      <div className="grid grid-cols-3 gap-6">
                         <Card className="shadow-sm border-slate-200 col-span-2">
                            <CardHeader>
                               <CardTitle className="text-base font-bold text-slate-800">Risk Monitoring Trends</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <div className="h-[300px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <LineChart data={pregnancyRiskData}>
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="anemia" stroke="#f43f5e" strokeWidth={2} dot={{r: 4}} name="Anemia Cases" />
                                        <Line type="monotone" dataKey="gdm" stroke="#f59e0b" strokeWidth={2} dot={{r: 4}} name="GDM Cases" />
                                        <Line type="monotone" dataKey="hypertension" stroke="#6366f1" strokeWidth={2} dot={{r: 4}} name="High BP" />
                                     </LineChart>
                                  </ResponsiveContainer>
                               </div>
                            </CardContent>
                         </Card>
                         
                         <Card className="shadow-sm border-slate-200 col-span-1">
                            <CardHeader>
                               <CardTitle className="text-base font-bold text-slate-800">Compliance & Outcomes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                               <div>
                                  <div className="flex justify-between text-sm mb-1">
                                     <span className="text-slate-600">Scan Completion Rate</span>
                                     <span className="font-bold text-slate-900">94%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                     <div className="bg-emerald-500 h-full w-[94%] rounded-full"></div>
                                  </div>
                               </div>
                               <div>
                                  <div className="flex justify-between text-sm mb-1">
                                     <span className="text-slate-600">Lab Completion Rate</span>
                                     <span className="font-bold text-slate-900">88%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                     <div className="bg-blue-500 h-full w-[88%] rounded-full"></div>
                                  </div>
                               </div>
                               <div>
                                  <div className="flex justify-between text-sm mb-1">
                                     <span className="text-slate-600">Follow-up Adherence</span>
                                     <span className="font-bold text-slate-900">91%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                     <div className="bg-purple-500 h-full w-[91%] rounded-full"></div>
                                  </div>
                               </div>
                               
                               <div className="pt-4 border-t border-slate-100">
                                  <p className="text-xs font-bold text-slate-800 mb-2">Outcome Metrics (YTD)</p>
                                  <div className="grid grid-cols-2 gap-4">
                                     <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                        <p className="text-[10px] text-slate-500">C-Section Rate</p>
                                        <p className="text-lg font-bold text-slate-800">28%</p>
                                     </div>
                                     <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                        <p className="text-[10px] text-slate-500">Avg Birth Weight</p>
                                        <p className="text-lg font-bold text-slate-800">3.1kg</p>
                                     </div>
                                  </div>
                               </div>
                            </CardContent>
                         </Card>
                      </div>
                   </TabsContent>

                   {/* 3. POSTPARTUM ANALYTICS */}
                   <TabsContent value="postpartum" className="space-y-6">
                      <div className="grid grid-cols-3 gap-6">
                          <Card className="shadow-sm border-slate-200 col-span-2">
                            <CardHeader>
                               <CardTitle className="text-base font-bold text-slate-800">Mental & Physical Recovery</CardTitle>
                               <p className="text-xs text-slate-500">Tracking EPDS scores and physical recovery index over 12 weeks</p>
                            </CardHeader>
                            <CardContent>
                               <div className="h-[300px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <ComposedChart data={postpartumScoreData}>
                                        <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Weeks Postpartum', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Physical Score', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'EPDS Score', angle: 90, position: 'insideRight', fontSize: 10 }} />
                                        <Tooltip />
                                        <Area yAxisId="left" type="monotone" dataKey="physical" fill="#e0e7ff" stroke="#6366f1" name="Physical Recovery" />
                                        <Line yAxisId="right" type="monotone" dataKey="epds" stroke="#ec4899" strokeWidth={2} name="EPDS (Depression)" />
                                        <ReferenceLine yAxisId="right" y={10} stroke="red" strokeDasharray="3 3" label={{ value: "Risk Threshold", position: 'insideTopRight', fontSize: 10, fill: 'red' }} />
                                     </ComposedChart>
                                  </ResponsiveContainer>
                               </div>
                            </CardContent>
                         </Card>

                         <Card className="shadow-sm border-slate-200 bg-indigo-50 border-indigo-100">
                            <CardContent className="p-6 space-y-6">
                               <div className="flex items-center gap-3 mb-4">
                                  <div className="p-3 bg-white rounded-full shadow-sm">
                                     <Heart className="w-6 h-6 text-pink-500" />
                                  </div>
                                  <div>
                                     <h3 className="font-bold text-indigo-900">Lactation Success</h3>
                                     <p className="text-xs text-indigo-700">Feeding difficulty resolution</p>
                                  </div>
                               </div>

                               <div className="space-y-4">
                                  <div>
                                     <p className="text-xs font-medium text-indigo-800 mb-1">Difficulty at Week 2</p>
                                     <p className="text-3xl font-bold text-indigo-900">32%</p>
                                     <p className="text-xs text-indigo-600">Of mothers reported issues</p>
                                  </div>
                                  <div>
                                     <p className="text-xs font-medium text-indigo-800 mb-1">Resolved after Consult</p>
                                     <p className="text-3xl font-bold text-emerald-600">85%</p>
                                     <p className="text-xs text-indigo-600">Improvement rate</p>
                                  </div>
                               </div>
                               
                               <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mt-4">
                                  View Lactation Logs
                               </Button>
                            </CardContent>
                         </Card>
                      </div>
                   </TabsContent>

                   {/* 4. PCOS & HORMONE HEALTH */}
                   <TabsContent value="pcos" className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                         <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                               <CardTitle className="text-base font-bold text-slate-800">Symptom Reduction Trends</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <div className="h-[300px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <BarChart data={pcosSymptomData}>
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{fill: '#f1f5f9'}} />
                                        <Bar dataKey="acne" stackId="a" fill="#f472b6" name="Acne Score" />
                                        <Bar dataKey="hirsutism" stackId="a" fill="#c084fc" name="Hirsutism Score" />
                                     </BarChart>
                                  </ResponsiveContainer>
                               </div>
                            </CardContent>
                         </Card>

                         <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                               <CardTitle className="text-base font-bold text-slate-800">Metabolic Health Impact</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <div className="h-[300px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <LineChart data={pcosSymptomData}>
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis domain={[65, 80]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} name="Avg Weight (kg)" />
                                     </LineChart>
                                  </ResponsiveContainer>
                               </div>
                            </CardContent>
                         </Card>
                      </div>
                   </TabsContent>
                   
                   {/* 5. CLINIC PERFORMANCE */}
                   <TabsContent value="clinic" className="space-y-6">
                       <Card className="shadow-sm border-slate-200">
                          <CardHeader>
                             <CardTitle className="text-base font-bold text-slate-800">Multidisciplinary Care Impact</CardTitle>
                          </CardHeader>
                          <CardContent>
                             <div className="grid grid-cols-3 gap-6 text-center">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                   <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                                      <Users className="w-6 h-6" />
                                   </div>
                                   <p className="text-sm font-bold text-slate-700">Nutrition Consults</p>
                                   <p className="text-2xl font-bold text-emerald-600 mt-1">+22%</p>
                                   <p className="text-xs text-slate-500 mt-1">Pregnancy rate improvement</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                   <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3 text-purple-600">
                                      <Brain className="w-6 h-6" />
                                   </div>
                                   <p className="text-sm font-bold text-slate-700">Psych Support</p>
                                   <p className="text-2xl font-bold text-purple-600 mt-1">4.5/5</p>
                                   <p className="text-xs text-slate-500 mt-1">Mood improvement score</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                   <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
                                      <Activity className="w-6 h-6" />
                                   </div>
                                   <p className="text-sm font-bold text-slate-700">Trainer Involvement</p>
                                   <p className="text-2xl font-bold text-blue-600 mt-1">-3.5kg</p>
                                   <p className="text-xs text-slate-500 mt-1">Better weight outcomes</p>
                                </div>
                             </div>
                          </CardContent>
                       </Card>
                   </TabsContent>
                </Tabs>
             </div>
          </div>
        )}

        {/* REVENUE VIEW (NEW) */}
        {activeView === 'revenue' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
             <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                   <div>
                      <h2 className="text-2xl font-bold text-slate-900 font-serif">Financial Overview</h2>
                      <p className="text-slate-500 mt-1">Track clinic revenue, consultation fees, and procedure billing.</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <Select defaultValue="this_month">
                         <SelectTrigger className="w-[180px] bg-white border-slate-200">
                            <SelectValue placeholder="Period" />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="last_month">Last Month</SelectItem>
                            <SelectItem value="ytd">Year to Date</SelectItem>
                         </SelectContent>
                      </Select>
                      <Button variant="outline" className="bg-white border-slate-200 text-slate-700">
                         <Download className="w-4 h-4 mr-2" /> Download Report
                      </Button>
                   </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-4">
                   <Card className="shadow-sm border-slate-200">
                      <CardContent className="p-4">
                         <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Revenue</p>
                            <div className="p-1.5 bg-green-50 rounded-md text-green-600">
                               <CreditCard className="w-4 h-4" />
                            </div>
                         </div>
                         <p className="text-2xl font-bold text-slate-900">$124,500</p>
                         <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600">
                            <TrendingUp className="w-3 h-3" /> +8.2% vs last month
                         </div>
                      </CardContent>
                   </Card>
                   
                   <Card className="shadow-sm border-slate-200">
                      <CardContent className="p-4">
                         <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Consultations</p>
                            <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                               <Users className="w-4 h-4" />
                            </div>
                         </div>
                         <p className="text-2xl font-bold text-slate-900">$42,300</p>
                         <p className="text-xs text-slate-500 mt-2">320 appointments</p>
                      </CardContent>
                   </Card>

                   <Card className="shadow-sm border-slate-200">
                      <CardContent className="p-4">
                         <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Procedures (IVF/IUI)</p>
                            <div className="p-1.5 bg-purple-50 rounded-md text-purple-600">
                               <Dna className="w-4 h-4" />
                            </div>
                         </div>
                         <p className="text-2xl font-bold text-slate-900">$68,100</p>
                         <p className="text-xs text-slate-500 mt-2">18 procedures</p>
                      </CardContent>
                   </Card>

                   <Card className="shadow-sm border-slate-200">
                      <CardContent className="p-4">
                         <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Pending Claims</p>
                            <div className="p-1.5 bg-amber-50 rounded-md text-amber-600">
                               <AlertCircle className="w-4 h-4" />
                            </div>
                         </div>
                         <p className="text-2xl font-bold text-slate-900">$14,100</p>
                         <p className="text-xs text-slate-500 mt-2">5 claims requiring action</p>
                      </CardContent>
                   </Card>
                </div>

                <div className="grid grid-cols-3 gap-6">
                   {/* Revenue Breakdown Chart */}
                   <Card className="col-span-2 shadow-sm border-slate-200">
                      <CardHeader>
                         <CardTitle className="text-base font-bold text-slate-800">Revenue Trend (6 Months)</CardTitle>
                      </CardHeader>
                      <CardContent>
                         <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={[
                                  { month: 'May', total: 98000 },
                                  { month: 'Jun', total: 105000 },
                                  { month: 'Jul', total: 110000 },
                                  { month: 'Aug', total: 102000 },
                                  { month: 'Sep', total: 118000 },
                                  { month: 'Oct', total: 124500 },
                               ]}>
                                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                                  <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => [`$${value}`, 'Revenue']} />
                                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                      </CardContent>
                   </Card>

                   {/* Recent Transactions */}
                   <Card className="col-span-1 shadow-sm border-slate-200">
                      <CardHeader className="flex flex-row items-center justify-between">
                         <CardTitle className="text-base font-bold text-slate-800">Recent Transactions</CardTitle>
                         <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600">View All</Button>
                      </CardHeader>
                      <CardContent className="p-0">
                         <div className="divide-y divide-slate-100">
                            {(invoices.length > 0 ? invoices.slice(0, 5).map((inv: any) => ({
                               patient: inv.patientName || 'Patient',
                               service: (inv.items as any)?.[0]?.name || 'Service',
                               amount: `$${inv.total?.toLocaleString() || '0'}`,
                               status: inv.paymentStatus === 'paid' ? 'Paid' : 'Pending',
                               date: inv.date || 'Recent',
                            })) : patients.slice(0, 5).map((p: any, idx: number) => {
                               const services = ['Consultation', 'Fetal Scan', 'Follow-up', 'Care Visit', 'Hormone Panel'];
                               const amounts = ['$150', '$350', '$150', '$200', '$450'];
                               const statuses = ['Paid', 'Paid', 'Pending', 'Paid', 'Paid'];
                               return {
                                  patient: p.name || 'Patient',
                                  service: services[idx] || 'Consultation',
                                  amount: amounts[idx] || '$150',
                                  status: statuses[idx] || 'Paid',
                                  date: idx < 2 ? 'Today' : 'Yesterday',
                               };
                            })).map((tx: any, i: number) => (
                               <div key={i} data-testid={`billing-transaction-${i}`} className="p-4 hover:bg-slate-50 transition-colors">
                                  <div className="flex justify-between items-start mb-1">
                                     <p className="text-sm font-bold text-slate-900" data-testid={`text-billing-patient-${i}`}>{tx.patient}</p>
                                     <p className="text-sm font-bold text-slate-900">{tx.amount}</p>
                                  </div>
                                  <div className="flex justify-between items-center">
                                     <p className="text-xs text-slate-500">{tx.service}</p>
                                     <Badge variant="outline" className={`text-[10px] ${tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                        {tx.status}
                                     </Badge>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </CardContent>
                   </Card>
                </div>
             </div>
          </div>
        )}

        {/* SETTINGS VIEW (NEW) */}
        {activeView === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
             <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Header */}
                <div>
                   <h2 className="text-2xl font-bold text-slate-900 font-serif">Profile & Settings</h2>
                   <p className="text-slate-500 mt-1">Manage your account preferences and clinic configuration.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {/* Sidebar Settings Nav */}
                   <Card className="h-fit shadow-sm border-slate-200">
                      <CardContent className="p-2">
                         <nav className="space-y-1">
                            <Button 
                               variant="ghost" 
                               className={`w-full justify-start font-medium ${activeSettingsTab === 'profile' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                               onClick={() => setActiveSettingsTab('profile')}
                            >
                               <Users className="w-4 h-4 mr-3" /> Profile Details
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-slate-900">
                               <Bell className="w-4 h-4 mr-3" /> Notifications
                            </Button>
                            <Button 
                               variant="ghost" 
                               className={`w-full justify-start font-medium ${activeSettingsTab === 'availability' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                               onClick={() => setActiveSettingsTab('availability')}
                            >
                               <Briefcase className="w-4 h-4 mr-3" /> Clinic Availability
                            </Button>
                            <Button 
                               variant="ghost" 
                               className={`w-full justify-start font-medium ${activeSettingsTab === 'network' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                               onClick={() => setActiveSettingsTab('network')}
                            >
                               <Users className="w-4 h-4 mr-3" /> My Care Network
                            </Button>
                            <Button 
                               variant="ghost" 
                               className={`w-full justify-start font-medium ${activeSettingsTab === 'medicine-catalog' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                               onClick={() => setActiveSettingsTab('medicine-catalog')}
                            >
                               <Pill className="w-4 h-4 mr-3" /> Medicine Catalog
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-slate-900">
                               <Settings className="w-4 h-4 mr-3" /> System Preferences
                            </Button>
                         </nav>
                      </CardContent>
                   </Card>

                   {/* Settings Content */}
                   <div className="md:col-span-2 space-y-6">
                      
                      {activeSettingsTab === 'profile' && (
                          <>
                            {/* Personal Info Card */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold text-slate-800">Personal Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4 mb-4">
                                    <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                                        <AvatarFallback className="bg-slate-800 text-white text-xl">DR</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <Button variant="outline" size="sm" className="text-xs">Change Photo</Button>
                                    </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input id="firstName" defaultValue={providerName.split(' ').slice(0, -1).join(' ')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input id="lastName" defaultValue={providerName.split(' ').pop() || ''} />
                                    </div>
                                    </div>

                                    <div className="space-y-2">
                                    <Label htmlFor="specialty">Specialty</Label>
                                    <Input id="specialty" defaultValue={providerSpecialty} />
                                    </div>

                                    <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" defaultValue="d.reynolds@helixcare.com" />
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                    <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Qualification & Registration Card */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold text-slate-800">Qualification & Registration</CardTitle>
                                    <p className="text-xs text-slate-500 mt-1">These details appear on your prescriptions and official documents.</p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="qualification">Qualification / Degree</Label>
                                        <Input id="qualification" placeholder="e.g. MBBS, MS (OBG), DNB" defaultValue={clinicianProvider?.qualification || ''} data-testid="input-qualification" />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="regNumber">Registration Number</Label>
                                        <Input id="regNumber" placeholder="e.g. MMC 12345" defaultValue={clinicianProvider?.regNumber || ''} data-testid="input-reg-number" />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="regCouncil">Registration Council</Label>
                                        <Input id="regCouncil" placeholder="e.g. West Bengal Medical Council" defaultValue={clinicianProvider?.regCouncil || ''} data-testid="input-reg-council" />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="regYear">Registration Year</Label>
                                        <Input id="regYear" placeholder="e.g. 2018" defaultValue={clinicianProvider?.regYear || ''} data-testid="input-reg-year" />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="additionalQualifications">Additional Qualifications / Fellowships</Label>
                                      <Input id="additionalQualifications" placeholder="e.g. FRCOG, Fellowship in Reproductive Medicine" defaultValue={clinicianProvider?.additionalQualifications || ''} data-testid="input-additional-qualifications" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="clinicName">Clinic / Hospital Name</Label>
                                      <Input id="clinicName" placeholder="e.g. Saivie Women's Health Centre" defaultValue={clinicianProvider?.clinicName || ''} data-testid="input-clinic-name" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="clinicAddress">Clinic Address</Label>
                                      <Input id="clinicAddress" placeholder="Full clinic address for prescriptions" defaultValue={clinicianProvider?.clinicAddress || ''} data-testid="input-clinic-address" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="clinicPhone">Clinic Phone</Label>
                                        <Input id="clinicPhone" placeholder="e.g. +91 98765 43210" defaultValue={clinicianProvider?.clinicPhone || ''} data-testid="input-clinic-phone" />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="clinicTiming">Clinic Timing</Label>
                                        <Input id="clinicTiming" placeholder="e.g. Mon-Sat 10AM-2PM, 5PM-8PM" defaultValue={clinicianProvider?.clinicTiming || ''} data-testid="input-clinic-timing" />
                                      </div>
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                      <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-save-qualifications" onClick={() => {
                                        const getData = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || '';
                                        const profileData = {
                                          qualification: getData('qualification'),
                                          regNumber: getData('regNumber'),
                                          regCouncil: getData('regCouncil'),
                                          regYear: getData('regYear'),
                                          additionalQualifications: getData('additionalQualifications'),
                                          clinicName: getData('clinicName'),
                                          clinicAddress: getData('clinicAddress'),
                                          clinicPhone: getData('clinicPhone'),
                                          clinicTiming: getData('clinicTiming'),
                                        };
                                        if (clinicianProvider?.id) {
                                          fetch(`/api/providers/${clinicianProvider.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(profileData),
                                          }).then(() => {
                                            const stored = JSON.parse(localStorage.getItem('clinicianProvider') || '{}');
                                            localStorage.setItem('clinicianProvider', JSON.stringify({ ...stored, ...profileData }));
                                            queryClient.invalidateQueries({ queryKey: ['/api/providers'] });
                                          });
                                        }
                                      }}>Save Qualifications</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Security Card */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold text-slate-800">Security & Access</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Two-Factor Authentication</p>
                                        <p className="text-xs text-slate-500">Secure your account with 2FA.</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="text-xs">Enable</Button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                    <Label htmlFor="currentPass">Current Password</Label>
                                    <Input id="currentPass" type="password" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="newPass">New Password</Label>
                                        <Input id="newPass" type="password" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPass">Confirm Password</Label>
                                        <Input id="confirmPass" type="password" />
                                    </div>
                                    </div>
                                    
                                    <div className="pt-4 flex justify-end">
                                    <Button variant="outline" className="text-slate-600 border-slate-300">Update Password</Button>
                                    </div>
                                </CardContent>
                            </Card>
                          </>
                      )}

                      {activeSettingsTab === 'availability' && (
                          <div className="space-y-6">
                              <Card className="shadow-sm border-slate-200">
                                  <CardHeader className="flex flex-row items-center justify-between">
                                      <div>
                                          <CardTitle className="text-base font-bold text-slate-800">Clinics & Locations</CardTitle>
                                          <p className="text-xs text-slate-500 mt-1">Manage practicing locations and operating hours.</p>
                                      </div>
                                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1.5">
                                          <Plus className="w-3.5 h-3.5" /> Add Clinic
                                      </Button>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                      {/* Clinic 1 */}
                                      <div className="bg-white border border-slate-200 rounded-lg p-4">
                                          <div className="flex justify-between items-start mb-4">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                      <Briefcase className="w-5 h-5" />
                                                  </div>
                                                  <div>
                                                      <h3 className="font-bold text-slate-900 text-sm">Saivie Main Center</h3>
                                                      <p className="text-xs text-slate-500">Koramangala, Bangalore</p>
                                                  </div>
                                              </div>
                                              <div className="flex gap-2">
                                                  <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
                                                  <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100">Remove</Button>
                                              </div>
                                          </div>
                                          
                                          <div className="space-y-3">
                                              <div className="grid grid-cols-7 gap-2">
                                                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                                      <div key={day} className={`text-center p-2 rounded border ${i < 5 ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                                          <p className="text-[10px] font-bold text-slate-600 mb-1">{day}</p>
                                                          {i < 5 ? (
                                                              <p className="text-[10px] text-blue-700 font-medium">09:00 - 17:00</p>
                                                          ) : (
                                                              <p className="text-[10px] text-slate-400">Closed</p>
                                                          )}
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>

                                      {/* Clinic 2 */}
                                      <div className="bg-white border border-slate-200 rounded-lg p-4">
                                          <div className="flex justify-between items-start mb-4">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                                                      <Briefcase className="w-5 h-5" />
                                                  </div>
                                                  <div>
                                                      <h3 className="font-bold text-slate-900 text-sm">City Hospital (OPD)</h3>
                                                      <p className="text-xs text-slate-500">Indiranagar, Bangalore</p>
                                                  </div>
                                              </div>
                                              <div className="flex gap-2">
                                                  <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
                                                  <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100">Remove</Button>
                                              </div>
                                          </div>
                                          
                                          <div className="space-y-3">
                                              <div className="grid grid-cols-7 gap-2">
                                                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                                      <div key={day} className={`text-center p-2 rounded border ${day === 'Sat' ? 'bg-purple-50/50 border-purple-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                                          <p className="text-[10px] font-bold text-slate-600 mb-1">{day}</p>
                                                          {day === 'Sat' ? (
                                                              <p className="text-[10px] text-purple-700 font-medium">10:00 - 14:00</p>
                                                          ) : (
                                                              <p className="text-[10px] text-slate-400">Closed</p>
                                                          )}
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                  </CardContent>
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <CardHeader>
                                      <CardTitle className="text-base font-bold text-slate-800">Time Off & Exceptions</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                      <div className="border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-amber-50 rounded text-amber-600">
                                                  <CalendarIcon className="w-4 h-4" />
                                              </div>
                                              <div>
                                                  <p className="text-sm font-bold text-slate-800">Upcoming Leave</p>
                                                  <p className="text-xs text-slate-500">Nov 12 - Nov 15 • Personal Leave</p>
                                              </div>
                                          </div>
                                          <Button variant="outline" size="sm" className="text-xs h-7">Manage</Button>
                                      </div>
                                  </CardContent>
                              </Card>
                          </div>
                      )}

                      {activeSettingsTab === 'network' && (
                          <div className="space-y-6">
                              <Card className="shadow-sm border-slate-200">
                                  <CardHeader className="flex flex-row items-center justify-between">
                                      <div>
                                          <CardTitle className="text-base font-bold text-slate-800">My Care Network</CardTitle>
                                          <p className="text-xs text-slate-500 mt-1">Manage your team of specialists and referral network.</p>
                                      </div>
                                      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1.5">
                                                <Plus className="w-3.5 h-3.5" /> Add Team Member
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Add Team Member</DialogTitle>
                                                <DialogDescription>
                                                    Add a specialist or facility to your care network.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="name" className="text-right text-xs">
                                                        Name
                                                    </Label>
                                                    <Input id="name" placeholder="Dr. John Doe" className="col-span-3 h-8 text-xs" />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="role" className="text-right text-xs">
                                                        Role
                                                    </Label>
                                                    <Select>
                                                        <SelectTrigger className="col-span-3 h-8 text-xs">
                                                            <SelectValue placeholder="Select role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="pediatrician">Pediatrician</SelectItem>
                                                            <SelectItem value="anesthetist">Anesthetist</SelectItem>
                                                            <SelectItem value="nursing_home">Nursing Home</SelectItem>
                                                            <SelectItem value="nutritionist">Nutritionist</SelectItem>
                                                            <SelectItem value="other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="affiliation" className="text-right text-xs">
                                                        Clinic/Facility
                                                    </Label>
                                                    <Input id="affiliation" placeholder="City Hospital" className="col-span-3 h-8 text-xs" />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="phone" className="text-right text-xs">
                                                        Phone
                                                    </Label>
                                                    <Input id="phone" placeholder="+1 234 567 890" className="col-span-3 h-8 text-xs" />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="email" className="text-right text-xs">
                                                        Email
                                                    </Label>
                                                    <Input id="email" placeholder="doctor@example.com" className="col-span-3 h-8 text-xs" />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsAddMemberOpen(false)}>Add Member</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                      
                                      {/* Pediatrician */}
                                      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between group hover:border-blue-200 transition-colors">
                                          <div className="flex items-center gap-4">
                                              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                  <Baby className="w-6 h-6" />
                                              </div>
                                              <div>
                                                  <h3 className="font-bold text-slate-900 text-sm">Dr. Sarah Miller</h3>
                                                  <p className="text-xs text-slate-500 font-medium">Pediatrician</p>
                                                  <p className="text-[10px] text-slate-400 mt-0.5">Children's Health Clinic</p>
                                              </div>
                                          </div>
                                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
                                              <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-100">Remove</Button>
                                          </div>
                                      </div>

                                      {/* Anesthetist */}
                                      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between group hover:border-purple-200 transition-colors">
                                          <div className="flex items-center gap-4">
                                              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                                  <Syringe className="w-6 h-6" />
                                              </div>
                                              <div>
                                                  <h3 className="font-bold text-slate-900 text-sm">Dr. James Wilson</h3>
                                                  <p className="text-xs text-slate-500 font-medium">Anesthetist</p>
                                                  <p className="text-[10px] text-slate-400 mt-0.5">On-Call Associate</p>
                                              </div>
                                          </div>
                                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
                                              <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-100">Remove</Button>
                                          </div>
                                      </div>

                                      {/* Nursing Home */}
                                      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between group hover:border-emerald-200 transition-colors">
                                          <div className="flex items-center gap-4">
                                              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                  <Briefcase className="w-6 h-6" />
                                              </div>
                                              <div>
                                                  <h3 className="font-bold text-slate-900 text-sm">Sunrise Nursing Home</h3>
                                                  <p className="text-xs text-slate-500 font-medium">Inpatient Care Facility</p>
                                                  <p className="text-[10px] text-slate-400 mt-0.5">24/7 Service</p>
                                              </div>
                                          </div>
                                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
                                              <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-100">Remove</Button>
                                          </div>
                                      </div>

                                      {/* Nutritionist */}
                                      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between group hover:border-amber-200 transition-colors">
                                          <div className="flex items-center gap-4">
                                              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                                                  <Heart className="w-6 h-6" />
                                              </div>
                                              <div>
                                                  <h3 className="font-bold text-slate-900 text-sm">Lisa Chen, RD</h3>
                                                  <p className="text-xs text-slate-500 font-medium">Clinical Nutritionist</p>
                                                  <p className="text-[10px] text-slate-400 mt-0.5">Wellness Partner</p>
                                              </div>
                                          </div>
                                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
                                              <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-100">Remove</Button>
                                          </div>
                                      </div>

                                  </CardContent>
                              </Card>
                          </div>
                      )}

                      {activeSettingsTab === 'medicine-catalog' && (
                          <div className="space-y-4">
                              <Card className="shadow-sm border-slate-200">
                                  <CardHeader>
                                      <CardTitle className="text-base font-bold text-slate-800">Clinic Medicine Catalog</CardTitle>
                                      <p className="text-xs text-slate-500 mt-1">Medicines commonly prescribed at this clinic. This list helps AI read handwritten prescriptions more accurately.</p>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                      <div className="grid grid-cols-6 gap-2">
                                          <Input placeholder="Medicine name *" value={newMedName} onChange={e => setNewMedName(e.target.value)} className="h-8 text-xs col-span-2" data-testid="input-catalog-name" />
                                          <Input placeholder="Generic name" value={newMedGeneric} onChange={e => setNewMedGeneric(e.target.value)} className="h-8 text-xs" data-testid="input-catalog-generic" />
                                          <Input placeholder="Default dose" value={newMedDose} onChange={e => setNewMedDose(e.target.value)} className="h-8 text-xs" data-testid="input-catalog-dose" />
                                          <Input placeholder="Frequency" value={newMedFrequency} onChange={e => setNewMedFrequency(e.target.value)} className="h-8 text-xs" data-testid="input-catalog-frequency" />
                                          <Button
                                            size="sm"
                                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 gap-1"
                                            disabled={!newMedName.trim() || addCatalogMutation.isPending}
                                            onClick={() => addCatalogMutation.mutate({
                                              name: newMedName.trim(),
                                              genericName: newMedGeneric.trim() || null,
                                              defaultDose: newMedDose.trim() || null,
                                              defaultFrequency: newMedFrequency.trim() || null,
                                              route: newMedRoute,
                                              category: newMedCategory.trim() || null,
                                            })}
                                            data-testid="button-add-catalog-medicine"
                                          >
                                            {addCatalogMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
                                          </Button>
                                      </div>
                                      <div className="flex gap-2">
                                          <Select value={newMedRoute} onValueChange={setNewMedRoute}>
                                            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Oral">Oral</SelectItem>
                                              <SelectItem value="Vaginal">Vaginal</SelectItem>
                                              <SelectItem value="Subcutaneous">Subcutaneous</SelectItem>
                                              <SelectItem value="Intramuscular">Intramuscular</SelectItem>
                                              <SelectItem value="Topical">Topical</SelectItem>
                                              <SelectItem value="IV">IV</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Input placeholder="Category (e.g. Hormone, Supplement)" value={newMedCategory} onChange={e => setNewMedCategory(e.target.value)} className="h-8 text-xs w-56" data-testid="input-catalog-category" />
                                      </div>

                                      <div className="border-t border-slate-200 pt-3">
                                        <div className="flex items-center justify-between mb-3">
                                          <span className="text-xs text-slate-500 font-semibold">{medicineCatalog.length} medicine(s) in catalog</span>
                                          <Input placeholder="Search catalog..." value={catalogFilter} onChange={e => setCatalogFilter(e.target.value)} className="h-7 text-xs w-48" data-testid="input-catalog-search" />
                                        </div>
                                        <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                                          <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                                              <tr>
                                                <th className="px-3 py-2 font-medium">Medicine</th>
                                                <th className="px-3 py-2 font-medium">Generic Name</th>
                                                <th className="px-3 py-2 font-medium">Default Dose</th>
                                                <th className="px-3 py-2 font-medium">Frequency</th>
                                                <th className="px-3 py-2 font-medium">Route</th>
                                                <th className="px-3 py-2 font-medium">Category</th>
                                                <th className="px-2 py-2 font-medium w-16"></th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {medicineCatalog
                                                .filter((m: any) => {
                                                  if (!catalogFilter) return true;
                                                  const q = catalogFilter.toLowerCase();
                                                  return (m.name || '').toLowerCase().includes(q) || (m.genericName || '').toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q);
                                                })
                                                .map((med: any) => (
                                                <tr key={med.id} className="hover:bg-slate-50" data-testid={`row-catalog-${med.id}`}>
                                                  {editingCatalogId === med.id ? (
                                                    <>
                                                      <td className="px-1 py-1"><Input value={editCatalogData.name || ''} onChange={e => setEditCatalogData({...editCatalogData, name: e.target.value})} className="h-7 text-xs" /></td>
                                                      <td className="px-1 py-1"><Input value={editCatalogData.genericName || ''} onChange={e => setEditCatalogData({...editCatalogData, genericName: e.target.value})} className="h-7 text-xs" /></td>
                                                      <td className="px-1 py-1"><Input value={editCatalogData.defaultDose || ''} onChange={e => setEditCatalogData({...editCatalogData, defaultDose: e.target.value})} className="h-7 text-xs" /></td>
                                                      <td className="px-1 py-1"><Input value={editCatalogData.defaultFrequency || ''} onChange={e => setEditCatalogData({...editCatalogData, defaultFrequency: e.target.value})} className="h-7 text-xs" /></td>
                                                      <td className="px-1 py-1"><Input value={editCatalogData.route || ''} onChange={e => setEditCatalogData({...editCatalogData, route: e.target.value})} className="h-7 text-xs" /></td>
                                                      <td className="px-1 py-1"><Input value={editCatalogData.category || ''} onChange={e => setEditCatalogData({...editCatalogData, category: e.target.value})} className="h-7 text-xs" /></td>
                                                      <td className="px-1 py-1">
                                                        <div className="flex gap-1">
                                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => updateCatalogMutation.mutate({ id: med.id, data: editCatalogData })}>
                                                            <Check className="w-3 h-3" />
                                                          </Button>
                                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600" onClick={() => setEditingCatalogId(null)}>
                                                            <X className="w-3 h-3" />
                                                          </Button>
                                                        </div>
                                                      </td>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <td className="px-3 py-2 font-medium text-slate-800">{med.name}</td>
                                                      <td className="px-3 py-2 text-slate-500">{med.genericName || '—'}</td>
                                                      <td className="px-3 py-2 text-slate-600">{med.defaultDose || '—'}</td>
                                                      <td className="px-3 py-2 text-slate-500">{med.defaultFrequency || '—'}</td>
                                                      <td className="px-3 py-2 text-slate-500">{med.route || '—'}</td>
                                                      <td className="px-3 py-2">
                                                        {med.category && <Badge variant="outline" className="text-[10px]">{med.category}</Badge>}
                                                      </td>
                                                      <td className="px-2 py-2">
                                                        <div className="flex gap-1.5">
                                                          <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-blue-500 border-blue-200 hover:bg-blue-50 hover:text-blue-700" onClick={() => { setEditingCatalogId(med.id); setEditCatalogData({ name: med.name, genericName: med.genericName || '', defaultDose: med.defaultDose || '', defaultFrequency: med.defaultFrequency || '', route: med.route || '', category: med.category || '' }); }} data-testid={`button-edit-catalog-${med.id}`}>
                                                            <Pencil className="w-3 h-3" />
                                                          </Button>
                                                          <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-700" onClick={() => deleteCatalogMutation.mutate(med.id)} data-testid={`button-delete-catalog-${med.id}`}>
                                                            <Trash2 className="w-3 h-3" />
                                                          </Button>
                                                        </div>
                                                      </td>
                                                    </>
                                                  )}
                                                </tr>
                                              ))}
                                              {medicineCatalog.length === 0 && (
                                                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No medicines in catalog yet. Add your first medicine above.</td></tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                  </CardContent>
                              </Card>
                          </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* PATIENT DETAIL VIEW (Previous Implementation) */}
        {activeView === 'patient_detail' && selectedPatient && (
          <div className="flex-1 flex flex-col overflow-hidden z-0 relative">
            {/* Background for Detail View */}
            <div 
              className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: `url(${medicalDashboardBg})`, backgroundSize: 'cover' }}
            />
          
            {/* 1. STICKY PATIENT CONTEXT HEADER */}
            <header className="bg-white border-b border-slate-200 shrink-0 z-10 shadow-sm relative w-full">
              <div className="flex items-center justify-between px-5 py-2">
                 <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveView('dashboard')}>
                       <LayoutDashboard className="w-4 h-4 text-slate-500" />
                    </Button>
                    <div className="flex items-center gap-3">
                       <Avatar className="h-9 w-9 border border-slate-200 bg-slate-100 text-slate-600 text-sm">
                          <AvatarFallback>{selectedPatient.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback>
                       </Avatar>
                       <div>
                          <div className="flex items-center gap-2">
                             <h2 className="text-sm font-bold text-slate-900">{selectedPatient.name}</h2>
                             <span className="text-[11px] text-slate-400 font-medium">{selectedPatient.age}y{selectedPatient.phone ? ` · ${selectedPatient.phone}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                             {selectedPatient.condition && (
                               <Badge variant="outline" className="text-[10px] h-[18px] border-pink-200 text-pink-700 bg-pink-50/80 font-medium px-1.5">
                                 {selectedPatient.condition}
                               </Badge>
                             )}
                             {selectedPatient.status === "High Risk" && (
                               <Badge variant="outline" className="text-[10px] h-[18px] border-rose-200 text-rose-700 bg-rose-50/80 font-semibold px-1.5">
                                 High Risk
                               </Badge>
                             )}
                             {selectedPatient.status && selectedPatient.status !== "High Risk" && (
                               <Badge variant="outline" className="text-[10px] h-[18px] border-emerald-200 text-emerald-700 bg-emerald-50/80 font-medium px-1.5">
                                 {selectedPatient.status}
                               </Badge>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <Select value={careMode} onValueChange={setCareMode}>
                      <SelectTrigger className="h-7 text-[11px] bg-blue-50/80 border-blue-200 w-[170px] font-semibold text-blue-700">
                        <SelectValue placeholder="Select Pathway" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hormone_care">Hormone & Cycle Care</SelectItem>
                        <SelectItem value="natural_conception">Natural Conception</SelectItem>
                        <SelectItem value="induction">Ovulation Induction</SelectItem>
                        <SelectItem value="iui">IUI Procedure Cycle</SelectItem>
                        <SelectItem value="pregnancy">Pregnancy Care</SelectItem>
                        <SelectItem value="postpartum">Postpartum Care</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="text-[11px] font-semibold text-slate-700 bg-slate-100 rounded px-2 py-1">
                       {careMode === 'pregnancy' && (() => {
                         if (selectedPatient.lmp) {
                           const lmpDate = new Date(selectedPatient.lmp);
                           const today = new Date();
                           const diffDays = Math.max(0, Math.floor((today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24)));
                           const weeks = Math.floor(diffDays / 7);
                           const days = diffDays % 7;
                           if (weeks > 42) return 'Post-term';
                           const trimester = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
                           return `Wk ${weeks}+${days} · T${trimester}`;
                         }
                         return 'No LMP';
                       })()}
                       {careMode === 'postpartum' && (() => {
                         if (selectedPatient.lmp) {
                           const lmpDate = new Date(selectedPatient.lmp);
                           const edd = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
                           const today = new Date();
                           const postDays = Math.max(0, Math.floor((today.getTime() - edd.getTime()) / (1000 * 60 * 60 * 24)));
                           const postWeeks = Math.floor(postDays / 7);
                           return `PP Wk ${postWeeks}`;
                         }
                         return 'Postpartum';
                       })()}
                       {careMode !== 'pregnancy' && careMode !== 'postpartum' && `CD ${selectedPatient.cycleDay || '—'}`}
                    </div>

                    <div className="h-5 w-px bg-slate-200" />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => { setIsSearching(true); }} data-testid="button-search-header">
                       <Search className="w-3.5 h-3.5" />
                    </Button>
                 </div>
              </div>

              {/* Dynamic context strip */}
              <div className="flex items-center gap-3 px-5 py-1.5 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-600 overflow-x-auto">
                 {selectedPatient.lmp && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">LMP</span> {new Date(selectedPatient.lmp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                 )}
                 {selectedPatient.lmp && careMode === 'pregnancy' && (() => {
                   const lmpDate = new Date(selectedPatient.lmp);
                   const edd = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
                   return <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">EDD</span> {edd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
                 })()}
                 {selectedPatient.bp && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">BP</span> {selectedPatient.bp}</span>
                 )}
                 {selectedPatient.weight && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">Wt</span> {selectedPatient.weight} kg</span>
                 )}
                 {selectedPatient.height && selectedPatient.weight && (() => {
                   const hm = parseFloat(selectedPatient.height) / 100;
                   if (hm > 0) {
                     const bmi = (selectedPatient.weight / (hm * hm)).toFixed(1);
                     return <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">BMI</span> {bmi}</span>;
                   }
                   return null;
                 })()}
                 {selectedPatient.hb && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">Hb</span> {selectedPatient.hb} g/dL</span>
                 )}
                 {selectedPatient.referredBy && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">Ref</span> {selectedPatient.referredBy}</span>
                 )}
                 {selectedPatient.vaccination && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">Vacc</span> {selectedPatient.vaccination}</span>
                 )}
                 {selectedPatient.insurance && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">Ins</span> {selectedPatient.insurance}</span>
                 )}
                 {selectedPatient.contraception && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">Contra</span> {selectedPatient.contraception}</span>
                 )}
                 {selectedPatient.lastVisit && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">Last Visit</span> {selectedPatient.lastVisit}</span>
                 )}
                 {selectedPatient.nextReview && (
                   <span className="whitespace-nowrap"><span className="font-semibold text-slate-500">Next</span> {selectedPatient.nextReview}</span>
                 )}
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden z-0">
              
              {/* Patient List Column (Left) */}
              <div className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
                 <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2 overflow-hidden">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        placeholder="Search patient by name..."
                        value={patientSearch}
                        onChange={(e) => { setPatientSearch(e.target.value); setIsSearching(!!e.target.value); }}
                        className="h-8 text-xs border-slate-200 pl-8 pr-8"
                        data-testid="input-patient-search"
                      />
                      {patientSearch && (
                        <button onClick={() => { setPatientSearch(""); setIsSearching(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {!isSearching && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={queueDateFrom}
                            onChange={(e) => { setQueueDateFrom(e.target.value); if (e.target.value > queueDateTo) setQueueDateTo(e.target.value); }}
                            className="h-8 text-xs border border-slate-200 rounded-md flex-1 min-w-[120px] px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            data-testid="input-queue-date-from-sidebar"
                          />
                          <span className="text-[10px] text-slate-400 shrink-0">to</span>
                          <input
                            type="date"
                            value={queueDateTo}
                            onChange={(e) => { setQueueDateTo(e.target.value); if (e.target.value < queueDateFrom) setQueueDateFrom(e.target.value); }}
                            className="h-8 text-xs border border-slate-200 rounded-md flex-1 min-w-[120px] px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            data-testid="input-queue-date-to-sidebar"
                          />
                          <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-medium shrink-0">{queuePatients.length}</span>
                        </div>
                      </div>
                    )}
                    {isSearching && searchResults.length > 0 && (
                      <div className="text-[10px] text-slate-400">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</div>
                    )}
                 </div>
                 <ScrollArea className="flex-1">
                    {isSearching ? (
                      <>
                        {searchResults.length === 0 && patientSearch.trim() && (
                          <div className="py-8 text-center text-slate-400 text-xs">No patients found</div>
                        )}
                        {searchResults.map((patient: any) => (
                          <div 
                            key={patient.id}
                            onClick={() => { setSelectedPatient(patient); setSelectedTrailVisitId(null); setPatientSearch(""); setIsSearching(false); }}
                            className={`p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-blue-50/40 group relative`}
                            data-testid={`search-result-${patient.id}`}
                          >
                             <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-sm text-slate-700">{patient.name}</span>
                                <span className="text-[10px] text-slate-400">{patient.phone || ''}</span>
                             </div>
                             <p className="text-xs text-slate-500 mb-1 truncate">{patient.type || 'General'}</p>
                             <div className="flex items-center gap-2">
                                {patient.status === 'High Risk' && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
                                {patient.status === 'Monitor' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                {patient.status === 'Active Cycle' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                <span className="text-[10px] font-medium text-slate-400">{patient.status || 'active'}</span>
                             </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {queuePatients.length === 0 && (
                          <div className="py-8 text-center text-slate-400 text-xs">No patients for this date</div>
                        )}
                        {queuePatients.map((patient: any) => (
                          <div 
                            key={patient.id}
                            onClick={() => { setSelectedPatient(patient); setSelectedTrailVisitId(null); }}
                            className={`p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 group relative ${selectedPatient?.id === patient.id ? 'bg-blue-50/60' : ''}`}
                          >
                             {selectedPatient?.id === patient.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                             
                             <div className="flex justify-between items-start mb-1">
                                <span className={`font-semibold text-sm ${selectedPatient?.id === patient.id ? 'text-blue-900' : 'text-slate-700'}`}>{patient.name}</span>
                                <span className="text-[10px] text-slate-400">{patient.appointmentTime || patient.lastVisit}</span>
                             </div>
                             <p className="text-xs text-slate-500 mb-2 truncate">{patient.type || 'General'}</p>
                             
                             <div className="flex items-center gap-2">
                                {patient.status === 'High Risk' && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
                                {patient.status === 'Monitor' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                {patient.status === 'Active Cycle' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                <span className="text-[10px] font-medium text-slate-400">{patient.status}</span>
                             </div>
                          </div>
                        ))}
                      </>
                    )}
                 </ScrollArea>
              </div>

              {/* Detailed View (Right) - Intelligent Dashboard */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                   
                   {/* PATIENT HISTORY SUMMARY */}
                   <Card className="shadow-sm border-slate-200">
                      <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <History className="w-4 h-4 text-slate-500" />
                              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">Patient History</CardTitle>
                            </div>
                            {!editingHistory ? (
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => { setEditingHistory(true); setEditHistoryData({ medical: [...(selectedPatient.history?.medical || [])], surgical: [...(selectedPatient.history?.surgical || [])], drug: [...(selectedPatient.history?.drug || [])], allergies: [...(selectedPatient.history?.allergies || [])] }); setNewHistoryItem({ medical: '', surgical: '', drug: '', allergies: '' }); }} data-testid="button-edit-history">
                                <Pencil className="w-3 h-3" /> Edit
                              </Button>
                            ) : (
                              <div className="flex gap-1.5">
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => updateHistoryMutation.mutate(editHistoryData)} disabled={updateHistoryMutation.isPending} data-testid="button-save-history">
                                  <Check className="w-3 h-3" /> Save
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-slate-500 border-slate-200" onClick={() => setEditingHistory(false)}>
                                  <X className="w-3 h-3" /> Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                      </CardHeader>
                      <CardContent className="p-4">
                          <div className="grid grid-cols-4 gap-6">
                              <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Past Medical History</h4>
                                  {editingHistory ? (
                                    <div className="space-y-1">
                                      {editHistoryData.medical.map((item, i) => (
                                        <div key={i} className="flex items-center gap-1 group">
                                          <span className="text-xs text-slate-700 flex-1">{item}</span>
                                          <button className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity" onClick={() => setEditHistoryData({...editHistoryData, medical: editHistoryData.medical.filter((_, idx) => idx !== i)})} data-testid={`button-remove-medical-${i}`}><X className="w-3 h-3" /></button>
                                        </div>
                                      ))}
                                      <div className="flex gap-1 mt-1">
                                        <Input placeholder="Add item..." value={newHistoryItem.medical} onChange={e => setNewHistoryItem({...newHistoryItem, medical: e.target.value})} onKeyDown={e => { if (e.key === 'Enter' && newHistoryItem.medical.trim()) { setEditHistoryData({...editHistoryData, medical: [...editHistoryData.medical, newHistoryItem.medical.trim()]}); setNewHistoryItem({...newHistoryItem, medical: ''}); }}} className="h-6 text-xs flex-1" data-testid="input-add-medical" />
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-500" disabled={!newHistoryItem.medical.trim()} onClick={() => { setEditHistoryData({...editHistoryData, medical: [...editHistoryData.medical, newHistoryItem.medical.trim()]}); setNewHistoryItem({...newHistoryItem, medical: ''}); }} data-testid="button-add-medical"><Plus className="w-3 h-3" /></Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                                      {selectedPatient.history?.medical?.map((item: string, i: number) => <li key={i}>{item}</li>) || <li className="text-slate-400 italic">None recorded</li>}
                                    </ul>
                                  )}
                              </div>
                              <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Past Surgical History</h4>
                                  {editingHistory ? (
                                    <div className="space-y-1">
                                      {editHistoryData.surgical.map((item, i) => (
                                        <div key={i} className="flex items-center gap-1 group">
                                          <span className="text-xs text-slate-700 flex-1">{item}</span>
                                          <button className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity" onClick={() => setEditHistoryData({...editHistoryData, surgical: editHistoryData.surgical.filter((_, idx) => idx !== i)})} data-testid={`button-remove-surgical-${i}`}><X className="w-3 h-3" /></button>
                                        </div>
                                      ))}
                                      <div className="flex gap-1 mt-1">
                                        <Input placeholder="Add item..." value={newHistoryItem.surgical} onChange={e => setNewHistoryItem({...newHistoryItem, surgical: e.target.value})} onKeyDown={e => { if (e.key === 'Enter' && newHistoryItem.surgical.trim()) { setEditHistoryData({...editHistoryData, surgical: [...editHistoryData.surgical, newHistoryItem.surgical.trim()]}); setNewHistoryItem({...newHistoryItem, surgical: ''}); }}} className="h-6 text-xs flex-1" data-testid="input-add-surgical" />
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-500" disabled={!newHistoryItem.surgical.trim()} onClick={() => { setEditHistoryData({...editHistoryData, surgical: [...editHistoryData.surgical, newHistoryItem.surgical.trim()]}); setNewHistoryItem({...newHistoryItem, surgical: ''}); }} data-testid="button-add-surgical"><Plus className="w-3 h-3" /></Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                                      {selectedPatient.history?.surgical?.map((item: string, i: number) => <li key={i}>{item}</li>) || <li className="text-slate-400 italic">None recorded</li>}
                                    </ul>
                                  )}
                              </div>
                              <div>
                                   <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Drug History</h4>
                                   {editingHistory ? (
                                    <div className="space-y-1">
                                      {editHistoryData.drug.map((item, i) => (
                                        <div key={i} className="flex items-center gap-1 group">
                                          <span className="text-xs text-slate-700 flex-1">{item}</span>
                                          <button className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity" onClick={() => setEditHistoryData({...editHistoryData, drug: editHistoryData.drug.filter((_, idx) => idx !== i)})} data-testid={`button-remove-drug-${i}`}><X className="w-3 h-3" /></button>
                                        </div>
                                      ))}
                                      <div className="flex gap-1 mt-1">
                                        <Input placeholder="Add item..." value={newHistoryItem.drug} onChange={e => setNewHistoryItem({...newHistoryItem, drug: e.target.value})} onKeyDown={e => { if (e.key === 'Enter' && newHistoryItem.drug.trim()) { setEditHistoryData({...editHistoryData, drug: [...editHistoryData.drug, newHistoryItem.drug.trim()]}); setNewHistoryItem({...newHistoryItem, drug: ''}); }}} className="h-6 text-xs flex-1" data-testid="input-add-drug" />
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-500" disabled={!newHistoryItem.drug.trim()} onClick={() => { setEditHistoryData({...editHistoryData, drug: [...editHistoryData.drug, newHistoryItem.drug.trim()]}); setNewHistoryItem({...newHistoryItem, drug: ''}); }} data-testid="button-add-drug"><Plus className="w-3 h-3" /></Button>
                                      </div>
                                    </div>
                                   ) : (
                                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                                      {selectedPatient.history?.drug?.map((item: string, i: number) => <li key={i}>{item}</li>) || <li className="text-slate-400 italic">None recorded</li>}
                                    </ul>
                                   )}
                              </div>
                               <div>
                                   <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 text-rose-600 border-b border-rose-100 pb-1">Allergies</h4>
                                   {editingHistory ? (
                                    <div className="space-y-1">
                                      {editHistoryData.allergies.map((item, i) => (
                                        <div key={i} className="flex items-center gap-1 group">
                                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">{item}</Badge>
                                          <button className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity" onClick={() => setEditHistoryData({...editHistoryData, allergies: editHistoryData.allergies.filter((_, idx) => idx !== i)})} data-testid={`button-remove-allergy-${i}`}><X className="w-3 h-3" /></button>
                                        </div>
                                      ))}
                                      <div className="flex gap-1 mt-1">
                                        <Input placeholder="Add allergy..." value={newHistoryItem.allergies} onChange={e => setNewHistoryItem({...newHistoryItem, allergies: e.target.value})} onKeyDown={e => { if (e.key === 'Enter' && newHistoryItem.allergies.trim()) { setEditHistoryData({...editHistoryData, allergies: [...editHistoryData.allergies, newHistoryItem.allergies.trim()]}); setNewHistoryItem({...newHistoryItem, allergies: ''}); }}} className="h-6 text-xs flex-1" data-testid="input-add-allergy" />
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-500" disabled={!newHistoryItem.allergies.trim()} onClick={() => { setEditHistoryData({...editHistoryData, allergies: [...editHistoryData.allergies, newHistoryItem.allergies.trim()]}); setNewHistoryItem({...newHistoryItem, allergies: ''}); }} data-testid="button-add-allergy"><Plus className="w-3 h-3" /></Button>
                                      </div>
                                    </div>
                                   ) : (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      {selectedPatient.history?.allergies?.map((item: string, i: number) => (
                                          <Badge key={i} variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">{item}</Badge>
                                      )) || <span className="text-xs text-slate-400 italic">No known allergies</span>}
                                    </div>
                                   )}
                              </div>
                          </div>
                      </CardContent>
                   </Card>

                   {/* LAST VISIT RECAP / PATIENT SNAPSHOT */}
                   {(() => {
                     const hasVisit = !!latestVisit;
                     const activeMeds = medications.filter((m: any) => m.status === 'Active');
                     const hasData = hasVisit || activeMeds.length > 0 || labResults.length > 0;
                     if (!hasData) return null;
                     return (
                     <Card className="shadow-sm border-amber-200 bg-gradient-to-br from-amber-50/60 to-orange-50/40 overflow-hidden" data-testid="last-visit-recap">
                       <div className="px-4 py-2.5 border-b border-amber-100 flex items-center justify-between">
                         <h3 className="font-bold text-sm text-amber-800 flex items-center gap-2">
                           <FileText className="w-4 h-4 text-amber-600" />
                           {hasVisit ? 'Last Visit Recap' : 'Patient Snapshot'}
                           {hasVisit && (
                             <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 font-normal">
                               {new Date(latestVisit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                             </Badge>
                           )}
                         </h3>
                       </div>
                       <CardContent className="p-3">
                         <div className="space-y-2">
                           {hasVisit && latestVisit.chiefComplaint && (
                             <div className="flex gap-2">
                               <span className="text-[10px] font-bold text-amber-600 uppercase min-w-[28px]">CC</span>
                               <p className="text-xs text-slate-700">{latestVisit.chiefComplaint}</p>
                             </div>
                           )}
                           {hasVisit && (() => {
                             const v = (latestVisit.vitals as any) || {};
                             const items = [
                               v.bp && `BP: ${v.bp}`,
                               v.weight && `Wt: ${v.weight}kg`,
                               v.pulse && `Pulse: ${v.pulse}`,
                               v.hb && `Hb: ${v.hb}`,
                               v.fundalHeight && `FH: ${v.fundalHeight}`,
                               v.fetalHeartRate && `FHR: ${v.fetalHeartRate}`,
                               v.spo2 && `SpO2: ${v.spo2}%`,
                             ].filter(Boolean);
                             return items.length > 0 ? (
                               <div className="flex gap-2 items-start">
                                 <span className="text-[10px] font-bold text-amber-600 uppercase min-w-[28px]">O/E</span>
                                 <div className="flex flex-wrap gap-1">
                                   {items.map((item, i) => (
                                     <span key={i} className="text-[10px] bg-white/80 border border-amber-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">{item}</span>
                                   ))}
                                 </div>
                               </div>
                             ) : null;
                           })()}
                           {hasVisit && (latestVisit.objective || ((latestVisit.vitals as any)?.pvExam) || ((latestVisit.vitals as any)?.psExam)) && (
                             <div className="flex gap-2">
                               <span className="text-[10px] font-bold text-amber-600 uppercase min-w-[28px]">Obs</span>
                               <div className="text-xs text-slate-600 space-y-0.5">
                                 {latestVisit.objective && <p>{latestVisit.objective}</p>}
                                 {(latestVisit.vitals as any)?.pvExam && <p><span className="font-semibold">P/V:</span> {(latestVisit.vitals as any).pvExam}</p>}
                                 {(latestVisit.vitals as any)?.psExam && <p><span className="font-semibold">P/S:</span> {(latestVisit.vitals as any).psExam}</p>}
                               </div>
                             </div>
                           )}
                           {hasVisit && (latestVisit.diagnosis || latestVisit.assessment) && (
                             <div className="flex gap-2">
                               <span className="text-[10px] font-bold text-amber-600 uppercase min-w-[28px]">Dx</span>
                               <p className="text-xs font-medium text-slate-800">{latestVisit.diagnosis || latestVisit.assessment}</p>
                             </div>
                           )}

                           {activeMeds.length > 0 && (
                             <div className="flex gap-2 items-start">
                               <span className="text-[10px] font-bold text-amber-600 uppercase min-w-[28px]">Rx</span>
                               <div className="flex flex-wrap gap-1">
                                 {activeMeds.map((m: any, i: number) => (
                                   <span key={i} className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded">{m.name} {m.dose}{m.frequency ? ` (${m.frequency})` : ''}</span>
                                 ))}
                               </div>
                             </div>
                           )}

                           {hasVisit && (() => {
                             const v = (latestVisit.vitals as any) || {};
                             const invTests: string[] = v.nextInvestigationTests || [];
                             const invCustom: string = v.nextInvestigationCustom || '';
                             const allInv = [...invTests, ...(invCustom ? [invCustom] : [])];
                             return allInv.length > 0 ? (
                               <div className="flex gap-2 items-start">
                                 <span className="text-[10px] font-bold text-amber-600 uppercase min-w-[28px]">Inv</span>
                                 <div className="flex flex-wrap gap-1">
                                   {allInv.map((inv, i) => (
                                     <span key={i} className="text-[10px] bg-purple-50 border border-purple-200 text-purple-700 px-1.5 py-0.5 rounded">{inv}</span>
                                   ))}
                                 </div>
                               </div>
                             ) : null;
                           })()}

                           {labResults.length > 0 && (
                             <div className="flex gap-2 items-start">
                               <span className="text-[10px] font-bold text-amber-600 uppercase min-w-[28px]">Labs</span>
                               <div className="flex flex-wrap gap-1">
                                 {labResults.slice(-8).map((lr: any, i: number) => (
                                   <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                     lr.status === 'High' || lr.status === 'Low' ? 'bg-red-50 border-red-200 text-red-700' :
                                     lr.status === 'Borderline' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                     'bg-emerald-50 border-emerald-200 text-emerald-700'
                                   }`}>{lr.testName}: {lr.value}{lr.unit ? ` ${lr.unit}` : ''} {lr.status && `(${lr.status})`}</span>
                                 ))}
                                 {labResults.length > 8 && <span className="text-[10px] text-amber-500">+{labResults.length - 8} more</span>}
                               </div>
                             </div>
                           )}

                           {hasVisit && latestVisit.planNotes && (
                             <div className="flex gap-2">
                               <span className="text-[10px] font-bold text-amber-600 uppercase min-w-[28px]">Plan</span>
                               <p className="text-xs text-slate-600">{latestVisit.planNotes}</p>
                             </div>
                           )}
                         </div>
                       </CardContent>
                     </Card>
                     );
                   })()}

                   {/* 1. CURRENT VISIT CLINICAL WORKSPACE (SOAP) - DYNAMIC */}
                   <Card className="shadow-md border-blue-100 bg-white overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center cursor-pointer" onClick={() => setShowDocumentation(!showDocumentation)}>
                         <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-blue-600" /> 
                            Current Visit Workspace
                            {latestVisit && <Badge variant="outline" className="text-[10px] font-normal text-slate-400 ml-2">{new Date(latestVisit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Badge>}
                            {!latestVisit && !showDocumentation && <span className="text-xs font-normal text-slate-400 ml-2">(No visit records yet)</span>}
                         </h3>
                         <div className="flex items-center gap-2">
                            {visitHistory.length > 1 && <Badge variant="outline" className="text-[10px] font-normal text-slate-500">{visitHistory.length} visits</Badge>}
                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showDocumentation ? 'rotate-90' : ''}`} />
                         </div>
                      </div>
                      
                      {showDocumentation && (
                         <CardContent className="p-0">
                            <div className="flex flex-col divide-y divide-slate-100">
                               
                               {/* S — Subjective (Symptoms) */}
                               <div className="p-4 bg-amber-50/30">
                                  <div className="flex items-center gap-2 mb-2">
                                     <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold h-5 w-5 flex items-center justify-center p-0 rounded">S</Badge>
                                     <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Subjective (Symptoms)</span>
                                  </div>
                                  {latestVisit?.chiefComplaint && (
                                    <div className="mb-2">
                                       <span className="text-[10px] text-slate-400 uppercase font-bold">Chief Complaint</span>
                                       <p className="text-sm text-slate-800 mt-0.5">{latestVisit.chiefComplaint}</p>
                                    </div>
                                  )}
                                  {latestVisit?.subjective ? (
                                    <p className="text-sm text-slate-700 leading-relaxed">{latestVisit.subjective}</p>
                                  ) : (
                                    <Textarea placeholder="Patient's symptoms, complaints, history of present illness..." className="min-h-[60px] text-sm border-amber-200 focus-visible:ring-amber-300" />
                                  )}
                               </div>

                               {/* O — Objective (Observations) */}
                               <div className="p-4 bg-blue-50/30">
                                  <div className="flex items-center gap-2 mb-2">
                                     <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold h-5 w-5 flex items-center justify-center p-0 rounded">O</Badge>
                                     <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Objective (Observations)</span>
                                  </div>
                                  
                                  {/* Dynamic vitals from visit or patient */}
                                  <div className="grid grid-cols-6 gap-2 mb-3">
                                     {(() => {
                                       const vitals = latestVisit?.vitals as any || {};
                                       const vitalItems = [
                                         { label: 'BP', value: vitals.bp || selectedPatient.bp, unit: 'mmHg' },
                                         { label: 'Pulse', value: vitals.pulse, unit: 'bpm' },
                                         { label: 'Weight', value: vitals.weight || selectedPatient.weight, unit: 'kg' },
                                         { label: 'BMI', value: selectedPatient.height && (vitals.weight || selectedPatient.weight) ? ((vitals.weight || selectedPatient.weight) / Math.pow(parseFloat(selectedPatient.height || '0') / 100, 2)).toFixed(1) : null },
                                         { label: 'Hb', value: vitals.hb || selectedPatient.hb, unit: 'g/dL' },
                                         { label: 'SpO2', value: vitals.spo2, unit: '%' },
                                       ];
                                       return vitalItems.map((v, i) => (
                                         <div key={i} className="bg-white p-2 rounded border border-slate-100 text-center">
                                           <div className="text-[10px] text-slate-400 uppercase font-bold">{v.label}</div>
                                           <div className="text-sm font-bold text-slate-800">{v.value || '—'}{v.value && v.unit ? <span className="text-[10px] font-normal text-slate-400 ml-0.5">{v.unit}</span> : ''}</div>
                                         </div>
                                       ));
                                     })()}
                                  </div>

                                  {/* Dynamic cycle info */}
                                  <div className={`grid ${careMode === 'pregnancy' ? 'grid-cols-3' : 'grid-cols-3'} gap-3 mb-3`}>
                                     <div className="bg-white p-2 rounded border border-slate-100">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Cycle Phase</span>
                                        <span className="text-xs font-semibold text-slate-700">
                                          {careMode === 'pregnancy' ? (() => {
                                            if (selectedPatient.lmp) {
                                              const weeks = Math.floor(Math.max(0, (new Date().getTime() - new Date(selectedPatient.lmp).getTime()) / (1000*60*60*24*7)));
                                              return weeks < 13 ? 'Trimester 1' : weeks < 27 ? 'Trimester 2' : 'Trimester 3';
                                            }
                                            return '—';
                                          })() : (() => {
                                            const cd = selectedPatient.cycleDay || 0;
                                            if (cd <= 5) return 'Menstrual';
                                            if (cd <= 13) return 'Follicular';
                                            if (cd <= 16) return 'Ovulatory';
                                            return 'Luteal';
                                          })()}
                                        </span>
                                     </div>
                                     <div className="bg-white p-2 rounded border border-slate-100">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                          {careMode === 'pregnancy' ? 'Gestational Age' : 'Cycle Day'}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-700">
                                          {careMode === 'pregnancy' ? (() => {
                                            if (selectedPatient.lmp) {
                                              const diffDays = Math.max(0, Math.floor((new Date().getTime() - new Date(selectedPatient.lmp).getTime()) / (1000*60*60*24)));
                                              return `${Math.floor(diffDays/7)}w ${diffDays%7}d`;
                                            }
                                            return '—';
                                          })() : `Day ${selectedPatient.cycleDay || '—'}`}
                                        </span>
                                     </div>
                                     <div className="bg-white p-2 rounded border border-slate-100">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Genomic Risk</span>
                                        <span className="text-xs font-semibold text-slate-700">{selectedPatient.condition || '—'}</span>
                                     </div>
                                  </div>

                                  {careMode === 'pregnancy' && (
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                      <div className="bg-gradient-to-br from-pink-50 to-white p-2.5 rounded border border-pink-100">
                                        <span className="text-[10px] text-pink-500 uppercase font-bold block mb-1">Fundal Height</span>
                                        <div className="flex items-center gap-1.5">
                                          <Input
                                            type="text"
                                            placeholder="e.g. 24 cm / corresponds to dates"
                                            value={fundalHeightVal}
                                            onChange={(e) => setFundalHeightVal(e.target.value)}
                                            className="h-7 text-sm font-bold text-slate-800 border-pink-200 focus-visible:ring-pink-300 flex-1 px-2"
                                            data-testid="input-fundal-height"
                                            onBlur={(e) => {
                                              const val = e.target.value;
                                              if (latestVisit?.id) {
                                                const currentVitals = (latestVisit.vitals as any) || {};
                                                fetch(`/api/visit-history/${latestVisit.id}`, {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    vitals: { ...currentVitals, fundalHeight: val }
                                                  })
                                                }).then(() => queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/visit-history`] }));
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="bg-gradient-to-br from-rose-50 to-white p-2.5 rounded border border-rose-100">
                                        <span className="text-[10px] text-rose-500 uppercase font-bold block mb-1">Fetal Heart Rate</span>
                                        <div className="flex items-center gap-1.5">
                                          <Input
                                            type="text"
                                            placeholder="e.g. 140 bpm / regular"
                                            value={fetalHeartRateVal}
                                            onChange={(e) => setFetalHeartRateVal(e.target.value)}
                                            className="h-7 text-sm font-bold text-slate-800 border-rose-200 focus-visible:ring-rose-300 flex-1 px-2"
                                            data-testid="input-fetal-heart-rate"
                                            onBlur={(e) => {
                                              const val = e.target.value;
                                              if (latestVisit?.id) {
                                                const currentVitals = (latestVisit.vitals as any) || {};
                                                fetch(`/api/visit-history/${latestVisit.id}`, {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    vitals: { ...currentVitals, fetalHeartRate: val }
                                                  })
                                                }).then(() => queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/visit-history`] }));
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {latestVisit?.objective ? (
                                    <p className="text-sm text-slate-700 leading-relaxed">{latestVisit.objective}</p>
                                  ) : (
                                    <Textarea placeholder="Clinical findings, examination notes, test results..." className="min-h-[50px] text-sm border-blue-200 focus-visible:ring-blue-300" />
                                  )}
                               </div>

                               {/* A — Assessment */}
                               <div className="p-4 bg-emerald-50/30">
                                  <div className="flex items-center gap-2 mb-2">
                                     <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold h-5 w-5 flex items-center justify-center p-0 rounded">A</Badge>
                                     <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Assessment</span>
                                  </div>

                                  {careMode === 'pregnancy' && (
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                      <div className="bg-white p-2.5 rounded border border-emerald-100">
                                        <span className="text-[10px] text-emerald-600 uppercase font-bold block mb-1.5">P/V (Per Vaginum)</span>
                                        <Textarea
                                          placeholder="Cervix: position, consistency, dilation, effacement. Membranes, presenting part, station..."
                                          defaultValue={(latestVisit?.vitals as any)?.pvExam || ''}
                                          className="min-h-[60px] text-xs border-emerald-200 focus-visible:ring-emerald-300 resize-none"
                                          data-testid="input-pv-exam"
                                          onBlur={(e) => {
                                            const val = e.target.value;
                                            if (latestVisit?.id) {
                                              const currentVitals = (latestVisit.vitals as any) || {};
                                              fetch(`/api/visit-history/${latestVisit.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ vitals: { ...currentVitals, pvExam: val } })
                                              }).then(() => queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/visit-history`] }));
                                            }
                                          }}
                                        />
                                      </div>
                                      <div className="bg-white p-2.5 rounded border border-emerald-100">
                                        <span className="text-[10px] text-emerald-600 uppercase font-bold block mb-1.5">P/S (Per Speculum)</span>
                                        <Textarea
                                          placeholder="Cervix appearance, os, discharge, bleeding, lesions..."
                                          defaultValue={(latestVisit?.vitals as any)?.psExam || ''}
                                          className="min-h-[60px] text-xs border-emerald-200 focus-visible:ring-emerald-300 resize-none"
                                          data-testid="input-ps-exam"
                                          onBlur={(e) => {
                                            const val = e.target.value;
                                            if (latestVisit?.id) {
                                              const currentVitals = (latestVisit.vitals as any) || {};
                                              fetch(`/api/visit-history/${latestVisit.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ vitals: { ...currentVitals, psExam: val } })
                                              }).then(() => queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/visit-history`] }));
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {latestVisit?.assessment ? (
                                    <div className="bg-white border border-emerald-100 rounded p-3">
                                       <p className="text-sm text-slate-700 leading-relaxed italic">"{latestVisit.assessment}"</p>
                                    </div>
                                  ) : latestVisit?.diagnosis ? (
                                    <div className="bg-white border border-emerald-100 rounded p-3">
                                       <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Diagnosis</span>
                                       <p className="text-sm text-slate-700">{latestVisit.diagnosis}</p>
                                    </div>
                                  ) : (
                                    <Textarea placeholder="Clinical assessment, differential diagnosis..." className="min-h-[50px] text-sm border-emerald-200 focus-visible:ring-emerald-300" />
                                  )}
                               </div>

                               {/* P — Plan */}
                               <div className="p-4 bg-purple-50/30">
                                  <div className="flex items-center gap-2 mb-2">
                                     <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold h-5 w-5 flex items-center justify-center p-0 rounded">P</Badge>
                                     <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Plan</span>
                                  </div>
                                  
                                  {/* Plan notes */}
                                  {latestVisit?.planNotes ? (
                                    <div className="bg-white border border-purple-100 rounded p-3 mb-3">
                                       <p className="text-sm text-slate-700 leading-relaxed">{latestVisit.planNotes}</p>
                                    </div>
                                  ) : !medications.length && !latestVisit?.prescriptions && !latestVisit?.labsOrdered ? (
                                    <Textarea placeholder="Treatment plan, prescriptions, follow-up..." className="min-h-[50px] text-sm border-purple-200 focus-visible:ring-purple-300 mb-3" />
                                  ) : null}

                                  {/* Dynamic medications table */}
                                  {(medications.length > 0 || showAddMedRow) && (
                                    <div className="mb-3">
                                       <div className="flex items-center justify-between mb-2">
                                         <span className="text-[10px] text-slate-500 uppercase font-bold">Active Medications</span>
                                         <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200">{medications.filter((m: any) => m.status === 'Active' || m.status === 'active').length} active</Badge>
                                       </div>
                                       <div className="border border-slate-200 rounded-md overflow-visible">
                                          <table className="w-full text-xs text-left">
                                             <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                                <tr>
                                                   <th className="px-3 py-1.5 font-medium">Drug</th>
                                                   <th className="px-3 py-1.5 font-medium">Dose</th>
                                                   <th className="px-3 py-1.5 font-medium">Frequency</th>
                                                   <th className="px-3 py-1.5 font-medium">Date</th>
                                                   <th className="px-3 py-1.5 font-medium">Status</th>
                                                   <th className="px-3 py-1.5 font-medium">Notes</th>
                                                   <th className="px-2 py-1.5 font-medium w-16"></th>
                                                </tr>
                                             </thead>
                                             <tbody className="divide-y divide-slate-100">
                                                {medications.map((med: any) => (
                                                  <tr key={med.id}>
                                                    {editingMedId === med.id ? (
                                                      <>
                                                        <td className="px-1 py-1 relative">
                                                          <Input value={editMedData.name || ''} onChange={e => { setEditMedData({...editMedData, name: e.target.value}); const s = filterCatalogSuggestions(e.target.value); setEditMedSuggestions(s); setShowEditMedSuggestions(s.length > 0); }} onFocus={() => { const s = filterCatalogSuggestions(editMedData.name || ''); setEditMedSuggestions(s); setShowEditMedSuggestions(s.length > 0); }} onBlur={() => setTimeout(() => setShowEditMedSuggestions(false), 200)} className="h-7 text-xs" autoComplete="off" />
                                                          {showEditMedSuggestions && editMedSuggestions.length > 0 && (
                                                            <div className="absolute z-50 top-full left-1 right-1 mt-0.5 bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                              {editMedSuggestions.map((s: any) => (
                                                                <div key={s.id} className="px-3 py-1.5 text-xs hover:bg-blue-50 cursor-pointer flex justify-between items-center" onMouseDown={() => { setEditMedData({...editMedData, name: s.name, dose: s.defaultDose || editMedData.dose, frequency: s.defaultFrequency || editMedData.frequency}); setShowEditMedSuggestions(false); }}>
                                                                  <span className="font-medium text-slate-800">{s.name}</span>
                                                                  <span className="text-slate-400 text-[10px]">{s.genericName || s.category || ''}</span>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </td>
                                                        <td className="px-1 py-1"><Input value={editMedData.dose || ''} onChange={e => setEditMedData({...editMedData, dose: e.target.value})} className="h-7 text-xs" /></td>
                                                        <td className="px-1 py-1"><Input value={editMedData.frequency || ''} onChange={e => setEditMedData({...editMedData, frequency: e.target.value})} className="h-7 text-xs" /></td>
                                                        <td className="px-1 py-1"><Input type="date" value={editMedData.startDate || ''} onChange={e => setEditMedData({...editMedData, startDate: e.target.value})} className="h-7 text-xs" /></td>
                                                        <td className="px-1 py-1">
                                                          <Select value={editMedData.status || 'Active'} onValueChange={v => setEditMedData({...editMedData, status: v})}>
                                                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                              <SelectItem value="Active">Active</SelectItem>
                                                              <SelectItem value="Completed">Completed</SelectItem>
                                                              <SelectItem value="Discontinued">Discontinued</SelectItem>
                                                            </SelectContent>
                                                          </Select>
                                                        </td>
                                                        <td className="px-1 py-1"><Input value={editMedData.notes || ''} onChange={e => setEditMedData({...editMedData, notes: e.target.value})} className="h-7 text-xs" /></td>
                                                        <td className="px-1 py-1">
                                                          <div className="flex gap-1">
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => updateMedMutation.mutate({ id: med.id, data: editMedData })}>
                                                              <Check className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600" onClick={() => setEditingMedId(null)}>
                                                              <X className="w-3 h-3" />
                                                            </Button>
                                                          </div>
                                                        </td>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <td className="px-3 py-2 font-medium text-slate-800">{med.name}</td>
                                                        <td className="px-3 py-2 text-slate-600">{med.dose || '—'}</td>
                                                        <td className="px-3 py-2 text-slate-600">{med.frequency || '—'}</td>
                                                        <td className="px-3 py-2 text-slate-500">{med.startDate ? new Date(med.startDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                                        <td className="px-3 py-2">
                                                          <Badge variant="outline" className={`text-[10px] ${med.status === 'active' || med.status === 'Active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                                                            {med.status || 'Active'}
                                                          </Badge>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-500">{med.notes || '—'}</td>
                                                        <td className="px-1 py-2">
                                                          <div className="flex gap-1">
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600" onClick={() => { setEditingMedId(med.id); setEditMedData({ name: med.name, dose: med.dose || '', frequency: med.frequency || '', startDate: med.startDate || '', status: med.status || 'Active', notes: med.notes || '' }); }} data-testid={`button-edit-med-${med.id}`}>
                                                              <Pencil className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600" onClick={() => deleteMedMutation.mutate(med.id)} data-testid={`button-delete-med-${med.id}`}>
                                                              <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                          </div>
                                                        </td>
                                                      </>
                                                    )}
                                                  </tr>
                                                ))}
                                                {showAddMedRow && (
                                                  <tr className="bg-blue-50/30">
                                                    <td className="px-1 py-1 relative">
                                                      <Input placeholder="Drug name" value={newMed.name} onChange={e => { setNewMed({...newMed, name: e.target.value}); const s = filterCatalogSuggestions(e.target.value); setMedSuggestions(s); setShowMedSuggestions(s.length > 0); }} onFocus={() => { const s = filterCatalogSuggestions(newMed.name); setMedSuggestions(s); setShowMedSuggestions(s.length > 0); }} onBlur={() => setTimeout(() => setShowMedSuggestions(false), 200)} className="h-7 text-xs" autoComplete="off" data-testid="input-new-med-name" />
                                                      {showMedSuggestions && medSuggestions.length > 0 && (
                                                        <div className="absolute z-50 top-full left-1 right-1 mt-0.5 bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                          {medSuggestions.map((s: any) => (
                                                            <div key={s.id} className="px-3 py-1.5 text-xs hover:bg-blue-50 cursor-pointer flex justify-between items-center" onMouseDown={() => { setNewMed({...newMed, name: s.name, dose: s.defaultDose || newMed.dose, frequency: s.defaultFrequency || newMed.frequency}); setShowMedSuggestions(false); }}>
                                                              <span className="font-medium text-slate-800">{s.name}</span>
                                                              <span className="text-slate-400 text-[10px]">{s.genericName || s.category || ''}</span>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </td>
                                                    <td className="px-1 py-1"><Input placeholder="Dose" value={newMed.dose} onChange={e => setNewMed({...newMed, dose: e.target.value})} className="h-7 text-xs" /></td>
                                                    <td className="px-1 py-1"><Input placeholder="Frequency" value={newMed.frequency} onChange={e => setNewMed({...newMed, frequency: e.target.value})} className="h-7 text-xs" /></td>
                                                    <td className="px-1 py-1"><Input type="date" value={newMed.startDate} onChange={e => setNewMed({...newMed, startDate: e.target.value})} className="h-7 text-xs" /></td>
                                                    <td className="px-1 py-1">
                                                      <Select value={newMed.status} onValueChange={v => setNewMed({...newMed, status: v})}>
                                                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="Active">Active</SelectItem>
                                                          <SelectItem value="Completed">Completed</SelectItem>
                                                          <SelectItem value="Discontinued">Discontinued</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                    </td>
                                                    <td className="px-1 py-1"><Input placeholder="Notes" value={newMed.notes} onChange={e => setNewMed({...newMed, notes: e.target.value})} className="h-7 text-xs" /></td>
                                                    <td className="px-1 py-1">
                                                      <div className="flex gap-1">
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700" disabled={!newMed.name.trim() || addMedMutation.isPending} onClick={() => addMedMutation.mutate(newMed)} data-testid="button-save-new-med">
                                                          <Check className="w-3 h-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600" onClick={() => { setShowAddMedRow(false); setNewMed({ name: '', dose: '', frequency: '', startDate: '', status: 'Active', notes: '' }); }}>
                                                          <X className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )}
                                             </tbody>
                                          </table>
                                       </div>
                                       {!showAddMedRow && (
                                         <Button variant="ghost" size="sm" className="mt-1.5 h-7 text-xs text-blue-600 hover:text-blue-700 gap-1" onClick={() => setShowAddMedRow(true)} data-testid="button-add-med-manual">
                                           <Plus className="w-3 h-3" /> Add Medication
                                         </Button>
                                       )}
                                    </div>
                                  )}

                                  {!medications.length && !showAddMedRow && (
                                    <div className="mb-3">
                                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 w-full" onClick={() => setShowAddMedRow(true)} data-testid="button-add-first-med">
                                        <Plus className="w-3.5 h-3.5" /> Add Medication
                                      </Button>
                                    </div>
                                  )}

                                  {/* Dynamic prescriptions from visit */}
                                  {latestVisit?.prescriptions && Array.isArray(latestVisit.prescriptions) && (latestVisit.prescriptions as any[]).length > 0 && (
                                    <div className="mb-3">
                                       <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Visit Prescriptions</span>
                                       <div className="flex flex-wrap gap-2">
                                          {(latestVisit.prescriptions as any[]).map((rx: any, i: number) => (
                                            <Badge key={i} variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                              {typeof rx === 'string' ? rx : `${rx.name || rx.drug} ${rx.dose || ''}`}
                                            </Badge>
                                          ))}
                                       </div>
                                    </div>
                                  )}

                                  {/* Dynamic labs ordered */}
                                  {latestVisit?.labsOrdered && Array.isArray(latestVisit.labsOrdered) && (latestVisit.labsOrdered as any[]).length > 0 && (
                                    <div className="mb-3">
                                       <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Labs Ordered</span>
                                       <div className="flex flex-wrap gap-2">
                                          {(latestVisit.labsOrdered as any[]).map((lab: any, i: number) => (
                                            <Badge key={i} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                              {typeof lab === 'string' ? lab : lab.name || lab.test}
                                            </Badge>
                                          ))}
                                       </div>
                                    </div>
                                  )}

                                  {/* Follow-up */}
                                  {latestVisit?.followUpPlan && (
                                    <div className="bg-white border border-slate-100 rounded p-2 mt-2">
                                       <span className="text-[10px] text-slate-400 uppercase font-bold block">Follow-up Notes</span>
                                       <p className="text-xs text-slate-700 mt-0.5">{latestVisit.followUpPlan}</p>
                                    </div>
                                  )}

                                  {/* Scheduling Section — Next Visit / Immunisation / Investigations */}
                                  {(() => {
                                    const schedVitals = (latestVisit?.vitals as any) || {};
                                    const nextImmDate = schedVitals.nextImmunisationDate || '';
                                    const nextInvDate = schedVitals.nextInvestigationDate || '';
                                    const nextInvNotes = schedVitals.nextInvestigationNotes || '';

                                    const formatCountdown = (dateStr: string) => {
                                      if (!dateStr) return null;
                                      const d = new Date(dateStr);
                                      const today = new Date();
                                      today.setHours(0,0,0,0);
                                      d.setHours(0,0,0,0);
                                      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000*60*60*24));
                                      if (diff === 0) return { text: 'Today', color: 'bg-blue-100 text-blue-700' };
                                      if (diff === 1) return { text: 'Tomorrow', color: 'bg-blue-100 text-blue-700' };
                                      if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: 'bg-rose-100 text-rose-700' };
                                      if (diff <= 7) return { text: `In ${diff} days`, color: 'bg-emerald-100 text-emerald-700' };
                                      return { text: `In ${Math.ceil(diff/7)} weeks`, color: 'bg-slate-100 text-slate-600' };
                                    };

                                    const saveScheduleVitals = (field: string, val: string) => {
                                      if (latestVisit?.id) {
                                        const currentVitals = (latestVisit.vitals as any) || {};
                                        let parsedVal: any = val;
                                        try { parsedVal = JSON.parse(val); } catch {}
                                        fetch(`/api/visit-history/${latestVisit.id}`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ vitals: { ...currentVitals, [field]: parsedVal } })
                                        }).then(() => queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/visit-history`] }));
                                      }
                                    };

                                    const visitCountdown = selectedPatient.nextReview ? formatCountdown(selectedPatient.nextReview) : null;
                                    const immCountdown = nextImmDate ? formatCountdown(nextImmDate) : null;
                                    const invCountdown = nextInvDate ? formatCountdown(nextInvDate) : null;

                                    return (
                                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mt-3" data-testid="card-scheduling">
                                        <div className="flex items-center gap-2 mb-3">
                                          <CalendarCheck className="w-4 h-4 text-blue-600" />
                                          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Upcoming Schedule</span>
                                        </div>

                                        <div className="space-y-2.5">
                                          {/* Next Visit */}
                                          <div className="bg-white rounded-lg border border-blue-100 p-2.5">
                                            <div className="flex items-center justify-between mb-1.5">
                                              <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1.5"><Stethoscope className="w-3 h-3" /> Next Visit / Follow-up</span>
                                              {visitCountdown && <Badge className={`text-[9px] ${visitCountdown.color} border-0`}>{visitCountdown.text}</Badge>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Input
                                                type="date"
                                                key={`visit-${selectedPatient.id}-${selectedPatient.nextReview}`}
                                                defaultValue={selectedPatient.nextReview || ''}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="h-7 text-xs border-blue-200 focus-visible:ring-blue-300 flex-1"
                                                data-testid="input-next-visit-date"
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (val) {
                                                    fetch(`/api/patients/${selectedPatient.id}`, {
                                                      method: 'PATCH',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({ nextReview: val })
                                                    }).then(() => {
                                                      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
                                                      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                                                    });
                                                  }
                                                }}
                                              />
                                              {selectedPatient.nextReview && (
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => { fetch(`/api/patients/${selectedPatient.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nextReview: null }) }).then(() => queryClient.invalidateQueries({ queryKey: ['/api/patients'] })); }} data-testid="button-clear-next-visit"><X className="w-3 h-3" /></Button>
                                              )}
                                            </div>
                                            {selectedPatient.nextReview && (
                                              <p className="text-[10px] text-blue-500 mt-1">{new Date(selectedPatient.nextReview).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                            )}
                                          </div>

                                          {/* Next Immunisation */}
                                          {careMode === 'pregnancy' && (
                                            <div className="bg-white rounded-lg border border-teal-100 p-2.5">
                                              <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[11px] font-bold text-teal-700 flex items-center gap-1.5"><Shield className="w-3 h-3" /> Next Immunisation</span>
                                                {immCountdown && <Badge className={`text-[9px] ${immCountdown.color} border-0`}>{immCountdown.text}</Badge>}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Input
                                                  type="date"
                                                  key={`imm-${selectedPatient.id}-${nextImmDate}`}
                                                  defaultValue={nextImmDate}
                                                  min={new Date().toISOString().split('T')[0]}
                                                  className="h-7 text-xs border-teal-200 focus-visible:ring-teal-300 flex-1"
                                                  data-testid="input-next-immunisation-date"
                                                  onBlur={(e) => { if (e.target.value) saveScheduleVitals('nextImmunisationDate', e.target.value); }}
                                                />
                                                {nextImmDate && (
                                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => saveScheduleVitals('nextImmunisationDate', '')} data-testid="button-clear-next-imm"><X className="w-3 h-3" /></Button>
                                                )}
                                              </div>
                                              {nextImmDate && (
                                                <p className="text-[10px] text-teal-500 mt-1">{new Date(nextImmDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                              )}
                                            </div>
                                          )}

                                          {/* Next Blood Test / USG */}
                                          {(() => {
                                            let invPregnancyWeek = 0;
                                            if (selectedPatient.lmp) {
                                              invPregnancyWeek = Math.floor(Math.max(0, (new Date().getTime() - new Date(selectedPatient.lmp).getTime()) / (1000*60*60*24*7)));
                                            }

                                            const invMilestones: Record<string, { weekRange: string; tests: string[] }> = {
                                              'booking': { weekRange: '6-10 wks', tests: ['CBC', 'Blood Group & Rh', 'RBS', 'TSH', 'Urine R/M', 'HIV/HBsAg/VDRL', 'Rubella IgG', 'USG Dating Scan'] },
                                              'first_trimester': { weekRange: '11-14 wks', tests: ['NT Scan (Nuchal Translucency)', 'Dual Marker', 'Urine Culture', 'TSH (repeat)'] },
                                              'second_trimester_early': { weekRange: '16-20 wks', tests: ['Quadruple Marker', 'USG Anomaly Scan (TIFFA)', 'CBC (repeat)'] },
                                              'second_trimester_mid': { weekRange: '24-28 wks', tests: ['OGTT (75g)', 'CBC (repeat)', 'Anti-D (if Rh-)', 'USG Fetal Echo'] },
                                              'third_trimester_early': { weekRange: '28-32 wks', tests: ['USG Growth Scan', 'CBC (repeat)', 'TSH (repeat)', 'Urine Routine', 'USG Doppler'] },
                                              'third_trimester_late': { weekRange: '34-36 wks', tests: ['USG Growth Scan', 'GBS Screening', 'CBC + Coagulation', 'LFT/KFT', 'NST', 'USG Presentation'] },
                                              'term': { weekRange: '37-40 wks', tests: ['NST (weekly)', 'BPP', 'USG AFI', 'Bishop Score', 'USG EFW & Doppler'] },
                                            };

                                            const fertilityTests = ['Day 2/3 Hormones', 'USG Pelvic', 'HSG', 'Semen Analysis', 'Day 21 Progesterone', 'Vit D/B12/Ferritin', 'OGTT', 'USG Follicular Monitoring'];
                                            const cycleTests = ['Hormonal Panel', 'TSH/T3/T4', 'USG Pelvic', 'Prolactin', 'Fasting Insulin', 'Lipid Profile', 'Vit D/B12', 'CBC'];

                                            let suggestedTests: string[] = [];
                                            let milestoneLabel = '';

                                            if (careMode === 'pregnancy' && invPregnancyWeek > 0) {
                                              const getKey = () => {
                                                if (invPregnancyWeek <= 10) return 'booking';
                                                if (invPregnancyWeek <= 14) return 'first_trimester';
                                                if (invPregnancyWeek <= 20) return 'second_trimester_early';
                                                if (invPregnancyWeek <= 28) return 'second_trimester_mid';
                                                if (invPregnancyWeek <= 32) return 'third_trimester_early';
                                                if (invPregnancyWeek <= 36) return 'third_trimester_late';
                                                return 'term';
                                              };
                                              const key = getKey();
                                              suggestedTests = invMilestones[key].tests;
                                              milestoneLabel = invMilestones[key].weekRange;
                                            } else if (careMode === 'natural_conception' || careMode === 'iui' || careMode === 'ivf') {
                                              suggestedTests = fertilityTests;
                                              milestoneLabel = 'Fertility';
                                            } else {
                                              suggestedTests = cycleTests;
                                              milestoneLabel = 'Cycle';
                                            }

                                            const savedTests: string[] = schedVitals.nextInvestigationTests || [];
                                            const customInvText = schedVitals.nextInvestigationCustom || '';

                                            const toggleTest = (testName: string) => {
                                              const current: string[] = schedVitals.nextInvestigationTests || [];
                                              const updated = current.includes(testName)
                                                ? current.filter((t: string) => t !== testName)
                                                : [...current, testName];
                                              saveScheduleVitals('nextInvestigationTests', JSON.stringify(updated));
                                            };

                                            return (
                                              <div className="bg-white rounded-lg border border-indigo-100 p-2.5">
                                                <div className="flex items-center justify-between mb-1.5">
                                                  <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1.5"><FlaskConical className="w-3 h-3" /> Next Investigations</span>
                                                  <div className="flex items-center gap-1.5">
                                                    {milestoneLabel && <Badge className="text-[9px] bg-indigo-100 text-indigo-600 border-indigo-200">{milestoneLabel}</Badge>}
                                                    {invCountdown && <Badge className={`text-[9px] ${invCountdown.color} border-0`}>{invCountdown.text}</Badge>}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                  <Input
                                                    type="date"
                                                    key={`inv-${selectedPatient.id}-${nextInvDate}`}
                                                    defaultValue={nextInvDate}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="h-7 text-xs border-indigo-200 focus-visible:ring-indigo-300 flex-1"
                                                    data-testid="input-next-investigation-date"
                                                    onBlur={(e) => { if (e.target.value) saveScheduleVitals('nextInvestigationDate', e.target.value); }}
                                                  />
                                                  {nextInvDate && (
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => saveScheduleVitals('nextInvestigationDate', '')} data-testid="button-clear-next-inv"><X className="w-3 h-3" /></Button>
                                                  )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-1" data-testid="investigation-checkboxes">
                                                  {suggestedTests.map((test) => (
                                                    <label key={test} className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-[11px] transition-colors ${savedTests.includes(test) ? 'bg-indigo-100 text-indigo-800 font-medium' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`} data-testid={`checkbox-inv-${test.replace(/[^a-zA-Z0-9]/g, '-')}`}>
                                                      <input
                                                        type="checkbox"
                                                        checked={savedTests.includes(test)}
                                                        onChange={() => toggleTest(test)}
                                                        className="w-3 h-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                      />
                                                      <span className="truncate">{test}</span>
                                                    </label>
                                                  ))}
                                                </div>
                                                <Input
                                                  type="text"
                                                  placeholder="+ Custom / Repeat test..."
                                                  key={`inv-custom-${selectedPatient.id}-${customInvText}`}
                                                  defaultValue={customInvText}
                                                  className="h-7 text-xs border-indigo-200 focus-visible:ring-indigo-300 mt-2"
                                                  data-testid="input-next-investigation-custom"
                                                  onBlur={(e) => saveScheduleVitals('nextInvestigationCustom', e.target.value)}
                                                />
                                                {(nextInvDate || savedTests.length > 0) && (
                                                  <div className="mt-1.5">
                                                    {nextInvDate && <p className="text-[10px] text-indigo-500">{new Date(nextInvDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}</p>}
                                                    {savedTests.length > 0 && <p className="text-[10px] text-indigo-600 font-medium mt-0.5">{savedTests.join(', ')}{customInvText ? `, ${customInvText}` : ''}</p>}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    );
                                  })()}
                               </div>

                               {/* INVESTIGATIONS SECTION */}
                               {(() => {
                                 let pregnancyWeek = 0;
                                 if (selectedPatient.lmp) {
                                   pregnancyWeek = Math.floor(Math.max(0, (new Date().getTime() - new Date(selectedPatient.lmp).getTime()) / (1000*60*60*24*7)));
                                 }

                                 const investigationsByWeek: Record<string, { tests: { name: string; description: string }[]; weekRange: string }> = {
                                   'booking': {
                                     weekRange: '6-10 weeks (Booking Visit)',
                                     tests: [
                                       { name: 'CBC (Complete Blood Count)', description: 'Hemoglobin, WBC, platelets' },
                                       { name: 'Blood Group & Rh Typing', description: 'ABO and Rh factor' },
                                       { name: 'Random Blood Sugar (RBS)', description: 'Screen for diabetes' },
                                       { name: 'TSH (Thyroid Stimulating Hormone)', description: 'Thyroid function' },
                                       { name: 'Urine Routine & Microscopy', description: 'UTI screening, proteinuria' },
                                       { name: 'HIV, HBsAg, VDRL', description: 'Infectious disease screening' },
                                       { name: 'Rubella IgG', description: 'Immunity check' },
                                       { name: 'Blood Pressure', description: 'Baseline BP recording' },
                                       { name: 'USG - Dating Scan', description: 'Confirm gestational age, viability, location' },
                                     ]
                                   },
                                   'first_trimester': {
                                     weekRange: '11-14 weeks (First Trimester Screening)',
                                     tests: [
                                       { name: 'NT Scan (Nuchal Translucency)', description: 'Down syndrome screening with nuchal translucency measurement & CRL' },
                                       { name: 'Dual Marker (PAPP-A + Free β-hCG)', description: 'Combined first trimester screening' },
                                       { name: 'Urine Culture', description: 'Asymptomatic bacteriuria' },
                                       { name: 'TSH (repeat if abnormal)', description: 'Thyroid recheck' },
                                     ]
                                   },
                                   'second_trimester_early': {
                                     weekRange: '16-20 weeks',
                                     tests: [
                                       { name: 'Quadruple Marker', description: 'AFP, hCG, uE3, Inhibin A (if dual marker not done)' },
                                       { name: 'USG - Anomaly Scan (TIFFA)', description: 'Detailed anatomy scan at 18-20 weeks' },
                                       { name: 'CBC (repeat)', description: 'Check for anemia' },
                                     ]
                                   },
                                   'second_trimester_mid': {
                                     weekRange: '24-28 weeks',
                                     tests: [
                                       { name: 'OGTT (75g Glucose Tolerance Test)', description: 'Gestational diabetes screening' },
                                       { name: 'CBC (repeat)', description: 'Hemoglobin check' },
                                       { name: 'Anti-D Injection', description: 'For Rh-negative mothers at 28 weeks' },
                                       { name: 'USG - Fetal Echocardiography', description: 'Detailed cardiac assessment if indicated' },
                                     ]
                                   },
                                   'third_trimester_early': {
                                     weekRange: '28-32 weeks',
                                     tests: [
                                       { name: 'USG - Growth Scan', description: 'Fetal growth assessment, EFW, AFI' },
                                       { name: 'CBC (repeat)', description: 'Anemia screening' },
                                       { name: 'TSH (repeat)', description: 'Thyroid function check' },
                                       { name: 'Urine Routine', description: 'Proteinuria screening for preeclampsia' },
                                       { name: 'USG - Doppler Study', description: 'Umbilical artery, MCA Doppler if IUGR suspected' },
                                     ]
                                   },
                                   'third_trimester_late': {
                                     weekRange: '34-36 weeks',
                                     tests: [
                                       { name: 'USG - Growth Scan (repeat)', description: 'Fetal weight estimation, AFI, placental grading' },
                                       { name: 'GBS Screening (Vaginal Swab)', description: 'Group B Streptococcus at 35-37 weeks' },
                                       { name: 'CBC + Coagulation Profile', description: 'Pre-delivery workup' },
                                       { name: 'LFT, KFT', description: 'Liver and kidney function' },
                                       { name: 'NST (Non-Stress Test)', description: 'Fetal wellbeing' },
                                       { name: 'USG - Presentation & Lie', description: 'Fetal presentation, cord position, placental location' },
                                     ]
                                   },
                                   'term': {
                                     weekRange: '37-40 weeks (Term)',
                                     tests: [
                                       { name: 'NST (weekly)', description: 'Fetal heart rate monitoring' },
                                       { name: 'BPP (Biophysical Profile)', description: 'If indicated' },
                                       { name: 'USG - AFI (Amniotic Fluid Index)', description: 'Fluid assessment' },
                                       { name: 'Bishop Score Assessment', description: 'Cervical readiness evaluation' },
                                       { name: 'USG - EFW & Doppler', description: 'Estimated fetal weight and blood flow assessment' },
                                     ]
                                   },
                                 };

                                 const fertilityInvestigations = [
                                   { name: 'Day 2/3 Hormonal Panel', description: 'FSH, LH, E2, Prolactin, TSH, AMH' },
                                   { name: 'USG - Pelvic Ultrasound', description: 'Antral follicle count, uterine assessment' },
                                   { name: 'HSG (Hysterosalpingography)', description: 'Tubal patency test' },
                                   { name: 'Semen Analysis', description: 'Partner sperm evaluation' },
                                   { name: 'Day 21 Progesterone', description: 'Confirm ovulation' },
                                   { name: 'Karyotype', description: 'Chromosomal analysis if indicated' },
                                   { name: 'Vitamin D, B12, Ferritin', description: 'Nutritional status' },
                                   { name: 'Glucose Tolerance Test', description: 'PCOS/metabolic screening' },
                                   { name: 'USG - Follicular Monitoring', description: 'Serial follicle tracking for ovulation' },
                                   { name: 'USG - Saline Infusion Sonography', description: 'Uterine cavity evaluation' },
                                 ];

                                 const cycleInvestigations = [
                                   { name: 'Hormonal Panel', description: 'FSH, LH, E2, Progesterone, Testosterone, DHEAS' },
                                   { name: 'TSH, Free T3, Free T4', description: 'Thyroid function' },
                                   { name: 'USG - Pelvic Ultrasound', description: 'Ovarian morphology, endometrial thickness' },
                                   { name: 'Prolactin', description: 'Rule out hyperprolactinemia' },
                                   { name: 'Fasting Insulin + Glucose', description: 'Insulin resistance check' },
                                   { name: 'Lipid Profile', description: 'Metabolic health' },
                                   { name: 'Vitamin D, B12', description: 'Nutritional assessment' },
                                   { name: 'CBC', description: 'Anemia screening' },
                                   { name: 'USG - Transvaginal Scan', description: 'Detailed ovarian & uterine assessment' },
                                 ];

                                 let currentTests: { name: string; description: string }[] = [];
                                 let sectionTitle = '';

                                 if (careMode === 'pregnancy' && pregnancyWeek > 0) {
                                   if (pregnancyWeek <= 10) { currentTests = investigationsByWeek.booking.tests; sectionTitle = investigationsByWeek.booking.weekRange; }
                                   else if (pregnancyWeek <= 14) { currentTests = investigationsByWeek.first_trimester.tests; sectionTitle = investigationsByWeek.first_trimester.weekRange; }
                                   else if (pregnancyWeek <= 20) { currentTests = investigationsByWeek.second_trimester_early.tests; sectionTitle = investigationsByWeek.second_trimester_early.weekRange; }
                                   else if (pregnancyWeek <= 28) { currentTests = investigationsByWeek.second_trimester_mid.tests; sectionTitle = investigationsByWeek.second_trimester_mid.weekRange; }
                                   else if (pregnancyWeek <= 32) { currentTests = investigationsByWeek.third_trimester_early.tests; sectionTitle = investigationsByWeek.third_trimester_early.weekRange; }
                                   else if (pregnancyWeek <= 36) { currentTests = investigationsByWeek.third_trimester_late.tests; sectionTitle = investigationsByWeek.third_trimester_late.weekRange; }
                                   else { currentTests = investigationsByWeek.term.tests; sectionTitle = investigationsByWeek.term.weekRange; }
                                 } else if (careMode === 'natural_conception' || careMode === 'iui' || careMode === 'ivf') {
                                   currentTests = fertilityInvestigations;
                                   sectionTitle = 'Fertility Workup';
                                 } else {
                                   currentTests = cycleInvestigations;
                                   sectionTitle = 'Cycle & Hormonal Workup';
                                 }

                                 const allTests = [...currentTests, ...customInvestigations];
                                 const completedMap = getCompletedInvestigations();

                                 const completedTests = allTests.filter(t => isInvestigationCompleted(t.name, completedMap));
                                 const pendingTests = allTests.filter(t => !isInvestigationCompleted(t.name, completedMap));

                                 const weekOrder = ['booking', 'first_trimester', 'second_trimester_early', 'second_trimester_mid', 'third_trimester_early', 'third_trimester_late', 'term'];

                                 const getCurrentWeekKey = () => {
                                   if (pregnancyWeek <= 10) return 'booking';
                                   if (pregnancyWeek <= 14) return 'first_trimester';
                                   if (pregnancyWeek <= 20) return 'second_trimester_early';
                                   if (pregnancyWeek <= 28) return 'second_trimester_mid';
                                   if (pregnancyWeek <= 32) return 'third_trimester_early';
                                   if (pregnancyWeek <= 36) return 'third_trimester_late';
                                   return 'term';
                                 };
                                 const currentWeekKey = getCurrentWeekKey();

                                 const pastWeekKeys = careMode === 'pregnancy' && pregnancyWeek > 0
                                   ? weekOrder.filter(k => weekOrder.indexOf(k) < weekOrder.indexOf(currentWeekKey))
                                   : [];

                                 return (
                                   <div className="p-4 bg-indigo-50/30" data-testid="card-investigations">
                                     <div className="flex items-center justify-between mb-3">
                                       <div className="flex items-center gap-2">
                                         <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold h-5 w-5 flex items-center justify-center p-0 rounded">I</Badge>
                                         <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Investigations</span>
                                         {careMode === 'pregnancy' && pregnancyWeek > 0 && (
                                           <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">Week {pregnancyWeek}</Badge>
                                         )}
                                         {labDocuments.length > 0 && (
                                           <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">{labDocuments.length} Report{labDocuments.length !== 1 ? 's' : ''}</Badge>
                                         )}
                                       </div>
                                       <div className="flex items-center gap-1.5">
                                         {labDocuments.length > 0 && (
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             className="h-7 text-[11px] gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                                             disabled={extractLabMutation.isPending}
                                             onClick={() => selectedPatient && extractLabMutation.mutate(selectedPatient.id)}
                                             data-testid="button-read-reports-investigation"
                                           >
                                             {extractLabMutation.isPending ? (
                                               <><Loader2 className="w-3 h-3 animate-spin" /> Reading...</>
                                             ) : (
                                               <><Sparkle className="w-3 h-3" /> Read Reports</>
                                             )}
                                           </Button>
                                         )}
                                         <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => setShowAddInvestigation(!showAddInvestigation)} data-testid="button-add-investigation">
                                           <Plus className="w-3 h-3" /> Add
                                         </Button>
                                       </div>
                                     </div>

                                     {extractionStatus && (
                                       <div className={`mb-3 px-3 py-2 rounded-md text-xs flex items-center gap-2 ${extractionStatus.startsWith('Error') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                         {extractionStatus.startsWith('Error') ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                         {extractionStatus}
                                       </div>
                                     )}

                                     {extractLabMutation.isPending && (
                                       <div className="mb-3 px-3 py-2 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-2">
                                         <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                         Reading lab reports and matching to investigations...
                                       </div>
                                     )}

                                     {showAddInvestigation && (
                                       <div className="flex gap-2 mb-3 bg-white border border-indigo-200 rounded-md p-2">
                                         <Input placeholder="Investigation name..." value={newInvestigationName} onChange={e => setNewInvestigationName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newInvestigationName.trim()) { setCustomInvestigations([...customInvestigations, { name: newInvestigationName.trim(), description: 'Custom investigation' }]); setNewInvestigationName(''); }}} className="h-7 text-xs flex-1" data-testid="input-new-investigation" />
                                         <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" disabled={!newInvestigationName.trim()} onClick={() => { setCustomInvestigations([...customInvestigations, { name: newInvestigationName.trim(), description: 'Custom investigation' }]); setNewInvestigationName(''); }} data-testid="button-save-investigation">Add</Button>
                                       </div>
                                     )}

                                     <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                       <div className="flex items-center gap-2 mb-2">
                                         <span className="text-[10px] text-indigo-700 uppercase font-bold tracking-wider">Current: {sectionTitle}</span>
                                         <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">{pendingTests.length} Pending</Badge>
                                         <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200">{completedTests.length} Done</Badge>
                                       </div>
                                       <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                         {pendingTests.map((test, i) => {
                                           const isCustom = customInvestigations.some(c => c.name === test.name);
                                           const isUsg = test.name.startsWith('USG');
                                           return (
                                             <label key={`pending-${i}`} className={`flex items-start gap-2 py-1 px-2 rounded cursor-pointer group transition-colors ${selectedInvestigations.has(test.name) ? 'bg-white border border-indigo-300' : 'hover:bg-white/60 border border-transparent'}`} data-testid={`checkbox-investigation-${i}`}>
                                               <Checkbox checked={selectedInvestigations.has(test.name)} onCheckedChange={() => toggleInvestigation(test.name)} className="mt-0.5 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                                               <div className="flex-1 min-w-0">
                                                 <span className={`text-xs font-medium block ${selectedInvestigations.has(test.name) ? 'text-indigo-800' : 'text-slate-800'}`}>
                                                   {isUsg && <span className="inline-block bg-violet-100 text-violet-700 text-[9px] font-bold px-1 rounded mr-1">USG</span>}
                                                   {test.name.replace(/^USG - /, '')}
                                                 </span>
                                                 <span className="text-[10px] text-slate-400 block">{test.description}</span>
                                               </div>
                                               {isCustom && (
                                                 <button onClick={(e) => { e.preventDefault(); setCustomInvestigations(customInvestigations.filter(c => c.name !== test.name)); }} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600" data-testid={`button-remove-custom-investigation-${i}`}><X className="w-3 h-3" /></button>
                                               )}
                                             </label>
                                           );
                                         })}
                                         {completedTests.map((test, i) => {
                                           const match = isInvestigationCompleted(test.name, completedMap);
                                           return (
                                             <div key={`done-${i}`} className="flex items-start gap-2 py-1 px-2 rounded bg-emerald-50/50 border border-emerald-100" data-testid={`completed-investigation-${i}`}>
                                               <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                               <div className="flex-1 min-w-0">
                                                 <span className="text-xs font-medium text-emerald-800 block line-through opacity-80">{test.name}</span>
                                                 <span className="text-[10px] text-emerald-500 block">
                                                   {match?.source}{match?.date ? ` • ${new Date(match.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                                                 </span>
                                               </div>
                                             </div>
                                           );
                                         })}
                                       </div>
                                     </div>

                                     {selectedInvestigations.size > 0 && (
                                       <div className="mb-3 p-2 border border-indigo-100 rounded-md bg-white flex items-center justify-between">
                                         <div className="flex flex-wrap gap-1.5">
                                           {Array.from(selectedInvestigations).map(name => (
                                             <Badge key={name} className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200 gap-1">
                                               {name}
                                               <button onClick={() => toggleInvestigation(name)} className="ml-0.5 hover:text-indigo-900" data-testid={`button-remove-investigation-${name}`}><X className="w-2.5 h-2.5" /></button>
                                             </Badge>
                                           ))}
                                         </div>
                                         <span className="text-[10px] text-indigo-600 font-medium whitespace-nowrap ml-2">{selectedInvestigations.size} selected</span>
                                       </div>
                                     )}

                                     {careMode === 'pregnancy' && pregnancyWeek > 0 && pastWeekKeys.length > 0 && (
                                       <div className="border-t border-slate-200 pt-3">
                                         <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2 tracking-wider">Previous Weeks Investigation History</span>
                                         <div className="space-y-2">
                                           {pastWeekKeys.map(weekKey => {
                                             const group = investigationsByWeek[weekKey];
                                             const groupCompleted = group.tests.filter(t => isInvestigationCompleted(t.name, completedMap));
                                             const groupPending = group.tests.filter(t => !isInvestigationCompleted(t.name, completedMap));
                                             const allDone = groupPending.length === 0;
                                             return (
                                               <div key={weekKey} className={`rounded-lg border p-2.5 ${allDone ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/30 border-amber-200'}`} data-testid={`past-week-${weekKey}`}>
                                                 <div className="flex items-center justify-between mb-1.5">
                                                   <div className="flex items-center gap-2">
                                                     {allDone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                                                     <span className="text-[11px] font-semibold text-slate-700">{group.weekRange}</span>
                                                   </div>
                                                   <div className="flex items-center gap-1.5">
                                                     <Badge className={`text-[9px] ${allDone ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                       {groupCompleted.length}/{group.tests.length} Done
                                                     </Badge>
                                                     {groupPending.length > 0 && (
                                                       <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">
                                                         {groupPending.length} Pending
                                                       </Badge>
                                                     )}
                                                   </div>
                                                 </div>
                                                 <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                                   {group.tests.map((test, ti) => {
                                                     const match = isInvestigationCompleted(test.name, completedMap);
                                                     const done = !!match;
                                                     const isUsg = test.name.startsWith('USG');
                                                     return (
                                                       <div key={ti} className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded text-[11px] ${done ? 'text-emerald-700' : 'text-amber-700'}`} data-testid={`past-investigation-${weekKey}-${ti}`}>
                                                         {done ? <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /> : <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                                                         <span className={`truncate ${done ? 'line-through opacity-70' : 'font-medium'}`}>
                                                           {isUsg && <span className="inline-block bg-violet-100 text-violet-700 text-[8px] font-bold px-0.5 rounded mr-0.5">USG</span>}
                                                           {test.name.replace(/^USG - /, '')}
                                                         </span>
                                                         {done && match?.date && (
                                                           <span className="text-[9px] text-emerald-500 flex-shrink-0">{new Date(match.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                                         )}
                                                       </div>
                                                     );
                                                   })}
                                                 </div>
                                               </div>
                                             );
                                           })}
                                         </div>
                                       </div>
                                     )}

                                     {careMode === 'pregnancy' && pregnancyWeek > 0 && (() => {
                                       const futureKeys = weekOrder.filter(k => weekOrder.indexOf(k) > weekOrder.indexOf(currentWeekKey));
                                       if (futureKeys.length === 0) return null;
                                       return (
                                         <div className="border-t border-slate-100 pt-3 mt-3">
                                           <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2 tracking-wider">Upcoming Weeks</span>
                                           <div className="flex flex-wrap gap-1.5">
                                             {futureKeys.map(key => (
                                               <Badge key={key} variant="outline" className="text-[10px] text-slate-400 border-slate-200 cursor-default">
                                                 {investigationsByWeek[key].weekRange.split('(')[0].trim()} ({investigationsByWeek[key].tests.length} tests)
                                               </Badge>
                                             ))}
                                           </div>
                                         </div>
                                       );
                                     })()}
                                   </div>
                                 );
                               })()}

                               {/* IMMUNISATION SECTION - Pregnancy */}
                               {careMode === 'pregnancy' && (() => {
                                 const pregnancyWeekImm = selectedPatient.lmp ? Math.floor(Math.max(0, (new Date().getTime() - new Date(selectedPatient.lmp).getTime()) / (1000*60*60*24*7))) : 0;
                                 const immunisations = [
                                   { name: 'TT-1 (Tetanus Toxoid)', weekRange: '12-16 weeks', recWeek: 12, icon: '💉' },
                                   { name: 'TT-2 (Tetanus Toxoid)', weekRange: '16-20 weeks (4 wks after TT-1)', recWeek: 16, icon: '💉' },
                                   { name: 'Tdap (Tetanus, Diphtheria, Pertussis)', weekRange: '27-36 weeks', recWeek: 27, icon: '🛡️' },
                                   { name: 'Influenza Vaccine', weekRange: 'Any trimester (seasonal)', recWeek: 14, icon: '🦠' },
                                   { name: 'COVID-19 Vaccine', weekRange: 'Any trimester (if due)', recWeek: -1, icon: '💊' },
                                   { name: 'Hepatitis B (if non-immune)', weekRange: 'Booking visit', recWeek: 8, icon: '🔬' },
                                   { name: 'TT Booster (if previously immunised)', weekRange: '16-20 weeks', recWeek: -1, icon: '💉' },
                                 ];
                                 const vitals = (latestVisit?.vitals as any) || {};
                                 const givenVaccines: Record<string, { date: string }> = vitals.immunisations || {};
                                 const givenCount = Object.keys(givenVaccines).length;

                                 return (
                                   <div className="p-4 bg-teal-50/30" data-testid="card-immunisation">
                                     <div className="flex items-center justify-between mb-3">
                                       <div className="flex items-center gap-2">
                                         <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-[10px] font-bold h-5 w-5 flex items-center justify-center p-0 rounded"><Shield className="w-3 h-3" /></Badge>
                                         <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Immunisation</span>
                                         <Badge className="text-[10px] bg-teal-100 text-teal-700 border-teal-200">{givenCount}/{immunisations.length}</Badge>
                                       </div>
                                     </div>
                                     <div className="space-y-1.5">
                                       {immunisations.map((vax, i) => {
                                         const given = givenVaccines[vax.name];
                                         const isDue = !given && pregnancyWeekImm >= vax.recWeek && vax.recWeek > 0;
                                         const isPast = !given && pregnancyWeekImm > vax.recWeek + 8 && vax.recWeek > 0;
                                         return (
                                           <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${given ? 'bg-emerald-50 border-emerald-200' : isDue ? 'bg-amber-50 border-amber-300 shadow-sm' : isPast ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`} data-testid={`immunisation-${i}`}>
                                             <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                               <span className="text-sm">{vax.icon}</span>
                                               <div className="min-w-0">
                                                 <div className={`text-xs font-semibold truncate ${given ? 'text-emerald-700 line-through opacity-70' : isDue ? 'text-amber-800' : isPast ? 'text-rose-700' : 'text-slate-700'}`}>{vax.name}</div>
                                                 <div className="text-[10px] text-slate-400">{vax.weekRange}</div>
                                               </div>
                                             </div>
                                             <div className="flex items-center gap-2 shrink-0">
                                               {given ? (
                                                 <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><Check className="w-2.5 h-2.5" /> {given.date ? new Date(given.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Done'}</Badge>
                                               ) : isDue ? (
                                                 <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-300 animate-pulse">DUE NOW</Badge>
                                               ) : isPast ? (
                                                 <Badge className="text-[9px] bg-rose-100 text-rose-700 border-rose-200">OVERDUE</Badge>
                                               ) : (
                                                 <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-200">Upcoming</Badge>
                                               )}
                                               {!given && (
                                                 <Button
                                                   variant="ghost"
                                                   size="sm"
                                                   className={`h-6 px-2 text-[10px] ${isDue || isPast ? 'text-emerald-600 hover:bg-emerald-100' : 'text-slate-400 hover:bg-slate-100'}`}
                                                   data-testid={`button-mark-vaccine-${i}`}
                                                   onClick={() => {
                                                     if (latestVisit?.id) {
                                                       const currentVitals = (latestVisit.vitals as any) || {};
                                                       const updatedImm = { ...(currentVitals.immunisations || {}), [vax.name]: { date: new Date().toISOString().split('T')[0] } };
                                                       fetch(`/api/visit-history/${latestVisit.id}`, {
                                                         method: 'PATCH',
                                                         headers: { 'Content-Type': 'application/json' },
                                                         body: JSON.stringify({ vitals: { ...currentVitals, immunisations: updatedImm } })
                                                       }).then(() => queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient.id}/visit-history`] }));
                                                     }
                                                   }}
                                                 >
                                                   <Check className="w-3 h-3 mr-0.5" /> Mark Given
                                                 </Button>
                                               )}
                                             </div>
                                           </div>
                                         );
                                       })}
                                     </div>
                                   </div>
                                 );
                               })()}

                               {/* PREGNANCY PROGRESS TRAIL */}
                               {careMode === 'pregnancy' && selectedPatient.lmp && (() => {
                                 const lmpDate = new Date(selectedPatient.lmp);
                                 const today = new Date();
                                 const totalDays = Math.max(0, Math.floor((today.getTime() - lmpDate.getTime()) / (1000*60*60*24)));
                                 const currentWeekPT = Math.floor(totalDays / 7);
                                 const eddDate = new Date(lmpDate.getTime() + 280 * 24*60*60*1000);
                                 const daysRemaining = Math.max(0, Math.ceil((eddDate.getTime() - today.getTime()) / (1000*60*60*24)));
                                 const progressPct = Math.min(100, (totalDays / 280) * 100);

                                 const vitals = (latestVisit?.vitals as any) || {};
                                 const givenVaccines = vitals.immunisations || {};
                                 const completedMap = getCompletedInvestigations();

                                 const investigationsByWeekPT: Record<string, string[]> = {
                                   'booking': ['CBC (Complete Blood Count)', 'Blood Group & Rh Typing', 'Random Blood Sugar (RBS)', 'TSH (Thyroid Stimulating Hormone)', 'Urine Routine & Microscopy', 'HIV, HBsAg, VDRL', 'Rubella IgG', 'Blood Pressure', 'USG - Dating Scan'],
                                   'first_trimester': ['NT Scan (Nuchal Translucency)', 'Dual Marker (PAPP-A + Free β-hCG)', 'Urine Culture', 'TSH (repeat if abnormal)'],
                                   'second_trimester_early': ['Quadruple Marker', 'USG - Anomaly Scan (TIFFA)', 'CBC (repeat)'],
                                   'second_trimester_mid': ['OGTT (75g Glucose Tolerance Test)', 'CBC (repeat)', 'Anti-D Injection', 'USG - Fetal Echocardiography'],
                                   'third_trimester_early': ['USG - Growth Scan', 'CBC (repeat)', 'TSH (repeat)', 'Urine Routine', 'USG - Doppler Study'],
                                   'third_trimester_late': ['USG - Growth Scan (repeat)', 'GBS Screening (Vaginal Swab)', 'CBC + Coagulation Profile', 'LFT, KFT', 'NST (Non-Stress Test)', 'USG - Presentation & Lie'],
                                   'term': ['NST (weekly)', 'BPP (Biophysical Profile)', 'USG - AFI (Amniotic Fluid Index)', 'Bishop Score Assessment', 'USG - EFW & Doppler'],
                                 };

                                 const milestones = [
                                   { week: 0, label: 'LMP', color: 'bg-pink-500', detail: lmpDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                                   { week: 8, label: 'Booking Visit', color: 'bg-blue-500', detail: 'First prenatal visit' },
                                   { week: 12, label: 'End T1', color: 'bg-indigo-500', detail: 'NT scan, screening' },
                                   { week: 20, label: 'Anomaly Scan', color: 'bg-violet-500', detail: 'TIFFA scan' },
                                   { week: 28, label: 'T3 Begins', color: 'bg-purple-500', detail: 'OGTT, Anti-D' },
                                   { week: 32, label: 'Growth Scan', color: 'bg-fuchsia-500', detail: 'Fetal growth' },
                                   { week: 36, label: 'Pre-delivery', color: 'bg-rose-500', detail: 'GBS, workup' },
                                   { week: 40, label: 'EDD', color: 'bg-red-500', detail: eddDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                                 ];

                                 const allTests = Object.values(investigationsByWeekPT).flat();
                                 const completedTests = allTests.filter(t => isInvestigationCompleted(t, completedMap));
                                 const totalVaccines = 7;
                                 const givenVaccineCount = Object.keys(givenVaccines).length;

                                 const hasVitals = !!(vitals.bp || vitals.weight || vitals.fundalHeight || vitals.fetalHeartRate);
                                 const hasPVPS = !!(vitals.pvExam || vitals.psExam);

                                 const overallItems = [
                                   { label: 'Investigations', done: completedTests.length, total: allTests.length, color: 'text-indigo-600 bg-indigo-100' },
                                   { label: 'Immunisations', done: givenVaccineCount, total: totalVaccines, color: 'text-teal-600 bg-teal-100' },
                                   { label: 'Vitals Recorded', done: hasVitals ? 1 : 0, total: 1, color: 'text-blue-600 bg-blue-100' },
                                   { label: 'Clinical Exam (PV/PS)', done: hasPVPS ? 1 : 0, total: 1, color: 'text-emerald-600 bg-emerald-100' },
                                 ];

                                 const overallDone = overallItems.reduce((s, i) => s + i.done, 0);
                                 const overallTotal = overallItems.reduce((s, i) => s + i.total, 0);
                                 const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;

                                 return (
                                   <div className="p-4 bg-gradient-to-br from-slate-50 to-violet-50/30" data-testid="card-pregnancy-progress">
                                     <div className="flex items-center gap-2 mb-3">
                                       <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-[10px] font-bold h-5 w-5 flex items-center justify-center p-0 rounded"><Milestone className="w-3 h-3" /></Badge>
                                       <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pregnancy Progress Trail</span>
                                       <Badge className="text-[10px] bg-violet-100 text-violet-700 border-violet-200">Week {currentWeekPT} / 40</Badge>
                                     </div>

                                     <div className="relative mb-4">
                                       <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                         <div className="h-full rounded-full bg-gradient-to-r from-pink-400 via-violet-400 to-indigo-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
                                       </div>
                                       <div className="absolute top-0 left-0 w-full h-3 flex items-center">
                                         {milestones.map((m, i) => {
                                           const pos = (m.week / 40) * 100;
                                           const passed = currentWeekPT >= m.week;
                                           return (
                                             <div key={i} className="absolute group" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
                                               <div className={`w-3 h-3 rounded-full border-2 border-white ${passed ? m.color : 'bg-slate-300'} shadow-sm`} />
                                               <div className="absolute top-4 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white px-2 py-1 rounded text-[9px] whitespace-nowrap z-10 shadow-lg">
                                                 <div className="font-bold">{m.label}</div>
                                                 <div className="text-slate-300">{m.detail}</div>
                                               </div>
                                             </div>
                                           );
                                         })}
                                       </div>
                                       <div className="flex justify-between mt-1.5 text-[9px] text-slate-400">
                                         <span>LMP</span>
                                         <span>T1</span>
                                         <span>T2</span>
                                         <span>T3</span>
                                         <span>EDD</span>
                                       </div>
                                     </div>

                                     <div className="grid grid-cols-2 gap-2 mb-3">
                                       <div className="bg-white rounded-lg border border-violet-100 p-2.5 text-center">
                                         <div className="text-lg font-bold text-violet-700">{daysRemaining}</div>
                                         <div className="text-[10px] text-slate-400 uppercase font-bold">Days to EDD</div>
                                       </div>
                                       <div className="bg-white rounded-lg border border-violet-100 p-2.5 text-center">
                                         <div className="text-lg font-bold text-violet-700">{overallPct}%</div>
                                         <div className="text-[10px] text-slate-400 uppercase font-bold">Care Completion</div>
                                       </div>
                                     </div>

                                     <div className="space-y-2">
                                       {overallItems.map((item, i) => {
                                         const pct = item.total > 0 ? Math.round((item.done / item.total) * 100) : 0;
                                         return (
                                           <div key={i} className="flex items-center gap-3">
                                             <span className="text-[11px] text-slate-600 w-32 shrink-0 font-medium">{item.label}</span>
                                             <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                               <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-400' : pct > 50 ? 'bg-violet-400' : pct > 0 ? 'bg-amber-400' : 'bg-slate-200'}`} style={{ width: `${pct}%` }} />
                                             </div>
                                             <span className={`text-[10px] font-bold w-12 text-right ${pct === 100 ? 'text-emerald-600' : 'text-slate-500'}`}>{item.done}/{item.total}</span>
                                           </div>
                                         );
                                       })}
                                     </div>

                                     {overallPct < 50 && (
                                       <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                                         <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                         <span>Several care items pending. Please review investigations, immunisations, and clinical exams to ensure completeness.</span>
                                       </div>
                                     )}
                                     {overallPct >= 80 && (
                                       <div className="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                                         <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                         <span>Care plan is well on track. Continue monitoring vitals and scheduled tests.</span>
                                       </div>
                                     )}
                                   </div>
                                 );
                               })()}

                               {/* Footer actions */}
                               <div className="p-4 bg-slate-100 flex items-center justify-between">
                                  <div className="text-xs text-slate-500">
                                     <span className="font-semibold text-slate-700">{providerName}</span> • {providerSpecialty}
                                  </div>
                                  <div className="flex gap-2">
                                     <input type="file" ref={prescriptionInputRef} onChange={handlePrescriptionUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" />
                                     <Button variant="outline" size="sm" className="h-8 gap-2 bg-white text-xs border-slate-300" onClick={() => prescriptionInputRef.current?.click()} disabled={uploadPrescriptionMutation.isPending}>
                                        {uploadPrescriptionMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading Prescription...</> : <><Upload className="w-3.5 h-3.5" /> Upload Prescription</>}
                                     </Button>
                                     <Button variant="outline" size="sm" className="h-8 gap-2 bg-white text-xs border-slate-300">
                                        <Printer className="w-3.5 h-3.5" /> Print
                                     </Button>
                                     <Button size="sm" className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs shadow-sm" onClick={generatePrescription} data-testid="button-generate-prescription">
                                        <FileText className="w-3.5 h-3.5" /> Generate Prescription
                                     </Button>
                                  </div>
                               </div>

                            </div>
                         </CardContent>
                      )}
                      
                      {/* Collapsed Summary View */}
                      {!showDocumentation && (
                         <CardContent className="p-0">
                            <div className="grid grid-cols-4 divide-x divide-slate-100">
                               {/* Subjective */}
                               <div className="p-4 space-y-3">
                                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">S (Symptoms)</span> <Button variant="ghost" size="icon" className="h-5 w-5"><Sparkles className="w-3 h-3 text-blue-400" /></Button></div>
                                  <div className="space-y-2">
                                     {latestVisit?.chiefComplaint ? (
                                       <div className="bg-slate-50 p-2 rounded text-xs border border-slate-100">{latestVisit.chiefComplaint}</div>
                                     ) : latestVisit?.subjective ? (
                                       <div className="bg-slate-50 p-2 rounded text-xs border border-slate-100 line-clamp-3">{latestVisit.subjective}</div>
                                     ) : (
                                       <>
                                         <div className="bg-slate-50 p-2 rounded text-xs border border-slate-100 text-slate-400 italic">No symptoms recorded</div>
                                       </>
                                     )}
                                  </div>
                               </div>
                               {/* Objective */}
                               <div className="p-4 space-y-3">
                                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">O (Observations)</span></div>
                                  <div className="space-y-2 text-xs text-slate-600">
                                     <div className="flex justify-between"><span>Cycle Phase:</span> <span className="font-medium">{(() => {
                                       if (careMode === 'pregnancy') {
                                         if (selectedPatient.lmp) {
                                           const weeks = Math.floor(Math.max(0, (new Date().getTime() - new Date(selectedPatient.lmp).getTime()) / (1000*60*60*24*7)));
                                           return weeks < 13 ? 'T1' : weeks < 27 ? 'T2' : 'T3';
                                         }
                                         return 'Pregnancy';
                                       }
                                       const cd = selectedPatient.cycleDay || 0;
                                       if (cd <= 5) return 'Menstrual';
                                       if (cd <= 13) return 'Follicular';
                                       if (cd <= 16) return 'Ovulatory';
                                       return 'Luteal';
                                     })()}</span></div>
                                     <div className="flex justify-between"><span>{careMode === 'pregnancy' ? 'Gest. Age:' : 'Cycle Day:'}</span> <span className="font-medium">{careMode === 'pregnancy' ? (() => {
                                       if (selectedPatient.lmp) {
                                         const diffDays = Math.max(0, Math.floor((new Date().getTime() - new Date(selectedPatient.lmp).getTime()) / (1000*60*60*24)));
                                         return `${Math.floor(diffDays/7)}w ${diffDays%7}d`;
                                       }
                                       return '—';
                                     })() : `${selectedPatient.cycleDay || '—'}`}</span></div>
                                     <div className="flex justify-between"><span>Genomic Risk:</span> <span className={`font-medium ${selectedPatient.condition ? 'text-amber-600' : ''}`}>{selectedPatient.condition || '—'}</span></div>
                                     {careMode === 'pregnancy' && (
                                       <>
                                         <div className="flex justify-between"><span>Fundal Height:</span> <span className="font-medium">{(latestVisit?.vitals as any)?.fundalHeight ? `${(latestVisit?.vitals as any).fundalHeight} cm` : '—'}</span></div>
                                         <div className="flex justify-between"><span>Fetal HR:</span> <span className={`font-medium ${(latestVisit?.vitals as any)?.fetalHeartRate ? (Number((latestVisit?.vitals as any).fetalHeartRate) >= 110 && Number((latestVisit?.vitals as any).fetalHeartRate) <= 160 ? 'text-emerald-600' : 'text-rose-600') : ''}`}>{(latestVisit?.vitals as any)?.fetalHeartRate ? `${(latestVisit?.vitals as any).fetalHeartRate} bpm` : '—'}</span></div>
                                       </>
                                     )}
                                  </div>
                               </div>
                               {/* Assessment */}
                               <div className="p-4 space-y-3 bg-blue-50/30">
                                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-blue-600">A (Assessment)</span> <Sparkles className="w-3 h-3 text-blue-500" /></div>
                                  {careMode === 'pregnancy' && (
                                    <div className="space-y-1 text-xs text-slate-600 mb-2">
                                      <div className="flex justify-between"><span>P/V:</span> <span className="font-medium text-right max-w-[120px] truncate">{(latestVisit?.vitals as any)?.pvExam || <span className="text-slate-400 italic">—</span>}</span></div>
                                      <div className="flex justify-between"><span>P/S:</span> <span className="font-medium text-right max-w-[120px] truncate">{(latestVisit?.vitals as any)?.psExam || <span className="text-slate-400 italic">—</span>}</span></div>
                                    </div>
                                  )}
                                  {latestVisit?.assessment ? (
                                    <p className="text-xs leading-relaxed text-slate-700">"{latestVisit.assessment}"</p>
                                  ) : latestVisit?.diagnosis ? (
                                    <p className="text-xs leading-relaxed text-slate-700">{latestVisit.diagnosis}</p>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">No assessment recorded</p>
                                  )}
                               </div>
                               {/* Plan */}
                               <div className="p-4 space-y-3">
                                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">P (Plan)</span></div>
                                  <div className="space-y-2">
                                     {medications.length > 0 ? (
                                       medications.slice(0, 3).map((med: any) => (
                                         <div key={med.id} className="flex items-center gap-2"><Checkbox id={`p-${med.id}`} defaultChecked={med.status === 'active'} /> <label htmlFor={`p-${med.id}`} className="text-xs text-slate-700">{med.name} {med.dose || ''}</label></div>
                                       ))
                                     ) : latestVisit?.planNotes ? (
                                       <p className="text-xs text-slate-700 line-clamp-3">{latestVisit.planNotes}</p>
                                     ) : (
                                       <p className="text-xs text-slate-400 italic">No plan recorded</p>
                                     )}
                                  </div>
                                  <Button size="sm" className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 mt-2" onClick={() => setShowDocumentation(true)}>Full Note & Rx</Button>
                               </div>
                            </div>
                         </CardContent>
                      )}
                   </Card>

                   {/* TREATMENT TRAIL - Horizontal Progress Bar */}
                   {(() => {
                     const patientAppts = selectedPatient ? appointments.filter((a: any) => a.patientId === selectedPatient.id && a.status === 'Completed') : [];
                     const visitDates = new Set(visitHistory.map((v: any) => new Date(v.date).toDateString()));
                     const apptAsVisits = patientAppts
                       .filter((a: any) => !visitDates.has(new Date(a.date).toDateString()))
                       .map((a: any) => ({
                         id: `appt-${a.id}`,
                         date: a.date,
                         visitType: a.visitType || a.type,
                         chiefComplaint: a.chiefComplaint || null,
                         subjective: a.notes || null,
                         objective: null,
                         diagnosis: null,
                         assessment: null,
                         planNotes: null,
                         vitals: a.vitals || {},
                         _isAppointment: true,
                       }));
                     const allTrailVisits = [...visitHistory, ...apptAsVisits];
                     if (allTrailVisits.length === 0) return null;
                     const sortedVisits = allTrailVisits.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                     const selectedVisit = selectedTrailVisitId ? sortedVisits.find((v: any) => v.id === selectedTrailVisitId) : null;
                     const selectedVitals = selectedVisit ? ((selectedVisit as any).vitals as any) || {} : {};
                     const selectedVitalsList = selectedVisit ? [
                       selectedVitals.weight && `Wt: ${selectedVitals.weight}kg`,
                       selectedVitals.bp && `BP: ${selectedVitals.bp}`,
                       selectedVitals.pulse && `Pulse: ${selectedVitals.pulse}`,
                       selectedVitals.hb && `Hb: ${selectedVitals.hb}`,
                       selectedVitals.spo2 && `SpO2: ${selectedVitals.spo2}%`,
                       selectedVitals.fetalHeartRate && `FHR: ${selectedVitals.fetalHeartRate}`,
                       selectedVitals.fundalHeight && `FH: ${selectedVitals.fundalHeight}`,
                       selectedVitals.temperature && `Temp: ${selectedVitals.temperature}°F`,
                     ].filter(Boolean) : [];
                     const selectedInvTests: string[] = selectedVitals.nextInvestigationTests || [];
                     const selectedInvCustom: string = selectedVitals.nextInvestigationCustom || '';
                     const allSelectedInv = [...selectedInvTests, ...(selectedInvCustom ? [selectedInvCustom] : [])];
                     const selectedVisitMeds = selectedVisit ? medications.filter((m: any) => m.startDate && new Date(m.startDate).toDateString() === new Date((selectedVisit as any).date).toDateString()) : [];

                     return (
                     <Card className="shadow-sm border-slate-200 bg-white overflow-hidden" data-testid="treatment-trail-card">
                       <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-4 py-3 border-b border-indigo-100">
                         <h3 className="font-bold text-sm text-indigo-800 flex items-center gap-2">
                           <History className="w-4 h-4 text-indigo-600" />
                           Treatment Trail
                           <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">{visitHistory.length} visit{visitHistory.length !== 1 ? 's' : ''}</Badge>
                           <span className="text-[10px] text-slate-400 font-normal ml-auto">Click a date to view details</span>
                         </h3>
                       </div>

                       <div className="px-4 py-4">
                         <div className="relative">
                           <div className="absolute top-[14px] left-0 right-0 h-[2px] bg-indigo-100" />
                           <div className="flex justify-between items-start relative overflow-x-auto" style={{ minWidth: sortedVisits.length > 8 ? `${sortedVisits.length * 80}px` : 'auto' }}>
                             {sortedVisits.map((visit: any, idx: number) => {
                               const isSelected = selectedTrailVisitId === visit.id;
                               const isToday = new Date(visit.date).toDateString() === new Date().toDateString();
                               const isLatest = idx === sortedVisits.length - 1;
                               return (
                                 <div key={visit.id} className="flex flex-col items-center cursor-pointer group" style={{ minWidth: '60px' }}
                                   onClick={() => setSelectedTrailVisitId(isSelected ? null : visit.id)}
                                   data-testid={`trail-dot-${visit.id}`}>
                                   <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all duration-200 border-2 ${
                                     isSelected ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200' :
                                     isToday ? 'bg-blue-500 border-blue-500 text-white' :
                                     isLatest ? 'bg-indigo-500 border-indigo-500 text-white' :
                                     'bg-white border-indigo-300 text-indigo-500 group-hover:border-indigo-500 group-hover:bg-indigo-50'
                                   }`}>
                                     <span className="text-[8px] font-bold">{idx + 1}</span>
                                   </div>
                                   <span className={`text-[9px] mt-1.5 font-medium text-center leading-tight ${isSelected ? 'text-indigo-700 font-bold' : 'text-slate-500'}`}>
                                     {new Date(visit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                   </span>
                                   {isToday && <span className="text-[7px] text-blue-500 font-bold">TODAY</span>}
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                       </div>

                       {selectedVisit && (
                         <div className="border-t border-indigo-100 bg-gradient-to-b from-indigo-50/30 to-white">
                           <div className="px-4 py-3">
                             <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-slate-800">
                                   {new Date((selectedVisit as any).date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                 </span>
                                 {(selectedVisit as any).visitType && <Badge variant="outline" className="text-[9px] text-slate-500">{(selectedVisit as any).visitType}</Badge>}
                               </div>
                               <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedTrailVisitId(null)}>
                                 <X className="w-3.5 h-3.5 text-slate-400" />
                               </Button>
                             </div>

                             <div className="space-y-2">
                               {(selectedVisit as any).chiefComplaint && (
                                 <div className="flex gap-2">
                                   <span className="text-[10px] font-bold text-indigo-600 uppercase min-w-[32px]">CC</span>
                                   <p className="text-xs text-slate-700">{(selectedVisit as any).chiefComplaint}</p>
                                 </div>
                               )}
                               {(selectedVisit as any).subjective && !(selectedVisit as any).chiefComplaint && (
                                 <div className="flex gap-2">
                                   <span className="text-[10px] font-bold text-indigo-600 uppercase min-w-[32px]">Subj</span>
                                   <p className="text-xs text-slate-600">{(selectedVisit as any).subjective}</p>
                                 </div>
                               )}

                               {selectedVitalsList.length > 0 && (
                                 <div className="flex gap-2 items-start">
                                   <span className="text-[10px] font-bold text-indigo-600 uppercase min-w-[32px]">O/E</span>
                                   <div className="flex flex-wrap gap-1">
                                     {selectedVitalsList.map((v, i) => (
                                       <span key={i} className="text-[10px] bg-white border border-indigo-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">{v}</span>
                                     ))}
                                   </div>
                                 </div>
                               )}

                               {((selectedVisit as any).objective || selectedVitals.pvExam || selectedVitals.psExam) && (
                                 <div className="flex gap-2">
                                   <span className="text-[10px] font-bold text-indigo-600 uppercase min-w-[32px]">Obs</span>
                                   <div className="text-xs text-slate-600 space-y-0.5">
                                     {(selectedVisit as any).objective && <p>{(selectedVisit as any).objective}</p>}
                                     {selectedVitals.pvExam && <p><span className="font-semibold">P/V:</span> {selectedVitals.pvExam}</p>}
                                     {selectedVitals.psExam && <p><span className="font-semibold">P/S:</span> {selectedVitals.psExam}</p>}
                                   </div>
                                 </div>
                               )}

                               {((selectedVisit as any).diagnosis || (selectedVisit as any).assessment) && (
                                 <div className="flex gap-2">
                                   <span className="text-[10px] font-bold text-indigo-600 uppercase min-w-[32px]">Dx</span>
                                   <p className="text-xs font-medium text-slate-800">{(selectedVisit as any).diagnosis || (selectedVisit as any).assessment}</p>
                                 </div>
                               )}

                               {selectedVisitMeds.length > 0 && (
                                 <div className="flex gap-2 items-start">
                                   <span className="text-[10px] font-bold text-blue-600 uppercase min-w-[32px] flex items-center gap-1"><Pill className="w-3 h-3" />Rx</span>
                                   <div className="flex flex-wrap gap-1">
                                     {selectedVisitMeds.map((m: any) => (
                                       <span key={m.id} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                                         {m.name} {m.dose ? `(${m.dose})` : ''}{m.frequency ? ` - ${m.frequency}` : ''}
                                       </span>
                                     ))}
                                   </div>
                                 </div>
                               )}

                               {allSelectedInv.length > 0 && (
                                 <div className="flex gap-2 items-start">
                                   <span className="text-[10px] font-bold text-purple-600 uppercase min-w-[32px] flex items-center gap-1"><FlaskConical className="w-3 h-3" />Inv</span>
                                   <div className="flex flex-wrap gap-1">
                                     {allSelectedInv.map((inv, i) => (
                                       <span key={i} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
                                         {inv}
                                       </span>
                                     ))}
                                   </div>
                                 </div>
                               )}

                               {(selectedVisit as any).planNotes && (
                                 <div className="flex gap-2">
                                   <span className="text-[10px] font-bold text-indigo-600 uppercase min-w-[32px]">Plan</span>
                                   <p className="text-xs text-slate-600">{(selectedVisit as any).planNotes}</p>
                                 </div>
                               )}

                               {!((selectedVisit as any).chiefComplaint || (selectedVisit as any).subjective || selectedVitalsList.length > 0 || (selectedVisit as any).diagnosis || selectedVisitMeds.length > 0 || allSelectedInv.length > 0 || (selectedVisit as any).planNotes) && (
                                 <p className="text-xs text-slate-400 italic">No clinical details recorded for this visit.</p>
                               )}
                             </div>
                           </div>
                         </div>
                       )}
                     </Card>
                     );
                   })()}

                   {/* 1. DYNAMIC SUMMARY BAR BASED ON PATHWAY */}
                   {careMode === 'natural_conception' && (
                      <div className="grid grid-cols-4 gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                         <div className="border-r border-slate-100 px-4">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Trying Duration</p>
                            <p className="text-sm font-bold text-slate-900">6 Months</p>
                         </div>
                         <div className="border-r border-slate-100 px-4">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Ovulatory Status</p>
                            <p className="text-sm font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Confirmed</p>
                         </div>
                         <div className="border-r border-slate-100 px-4">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Luteal Adequacy</p>
                            <p className="text-sm font-bold text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Borderline (9d)</p>
                         </div>
                         <div className="px-4">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Partner Status</p>
                            <p className="text-sm font-bold text-slate-900">Normal</p>
                         </div>
                      </div>
                   )}

                   {careMode === 'pregnancy' && (
                       <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-900 py-3 flex items-center shadow-sm">
                         <AlertCircle className="h-4 w-4 stroke-rose-600 mr-3" />
                         <div className="flex-1 flex justify-between items-center">
                            <div className="flex flex-col">
                               <span className="font-semibold text-sm">High Risk: PIH (Pregnancy Induced Hypertension)</span>
                               <span className="text-xs text-rose-700">BP elevated at 122/82. Monitoring closely.</span>
                            </div>
                            <div className="flex gap-2">
                               <Badge className="bg-white text-rose-700 border-rose-200 hover:bg-rose-100">GDM Diet Controlled</Badge>
                               <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-100 bg-white/50">
                                  Protocol
                               </Button>
                            </div>
                         </div>
                      </Alert>
                   )}

                   {/* MAIN DASHBOARD CONTENT GRID */}
                   <div className="grid grid-cols-3 gap-6">
                      
                      {/* LEFT COLUMN: Clinical Intelligence (Dynamic based on Mode) */}
                      <div className="col-span-2 space-y-6">
                         
                         {/* 1. HORMONE CARE / NATURAL CONCEPTION DASHBOARD */}
                         {(careMode === 'hormone_care' || careMode === 'natural_conception') && (
                            <Card className="shadow-sm border-slate-200">
                               <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                                  <CardTitle className="text-base font-bold text-slate-800">Ovulation Intelligence</CardTitle>
                                  <div className="flex gap-2">
                                     <Badge variant="outline" className="font-normal text-xs text-slate-500">BBT Confirmed</Badge>
                                     <Badge variant="outline" className="font-normal text-xs text-slate-500">LH Surge Detected</Badge>
                                  </div>
                               </CardHeader>
                               <CardContent className="pt-6">
                                  <div className="h-[280px] w-full">
                                     <ResponsiveContainer width="100%" height="100%">
                                       <AreaChart data={hormoneData}>
                                         <defs>
                                           <linearGradient id="colorEstrogen" x1="0" y1="0" x2="0" y2="1">
                                             <stop offset="5%" stopColor="#818cf8" stopOpacity={0.1}/>
                                             <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                           </linearGradient>
                                         </defs>
                                         <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                         <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                         <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                         <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                         <ReferenceLine yAxisId="left" x={14} stroke="#cbd5e1" strokeDasharray="3 3" label={{ position: 'top', value: 'Ovulation', fontSize: 10, fill: '#64748b' }} />
                                         <Area yAxisId="left" type="monotone" dataKey="estrogen" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorEstrogen)" />
                                         <Line yAxisId="right" type="monotone" dataKey="symptoms" stroke="#f59e0b" strokeWidth={2} dot={{r: 4, fill: '#f59e0b'}} />
                                       </AreaChart>
                                     </ResponsiveContainer>
                                  </div>
                               </CardContent>
                            </Card>
                         )}

                         {/* 2. IUI / INDUCTION WORKSPACE */}
                         {(careMode === 'iui' || careMode === 'induction') && (
                            <Card className="shadow-sm border-slate-200 overflow-hidden">
                               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url(${follicleTrackingBg})`, backgroundSize: 'cover' }}></div>
                               <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between relative z-10">
                                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                     <Microscope className="w-4 h-4 text-purple-600" /> Follicle Monitoring
                                  </CardTitle>
                                  <Button size="sm" variant="outline" className="h-7 text-xs">Add Scan Data</Button>
                               </CardHeader>
                               <CardContent className="pt-6 relative z-10">
                                  <div className="h-[280px] w-full">
                                     <ResponsiveContainer width="100%" height="100%">
                                       <BarChart data={follicleData}>
                                         <XAxis dataKey="day" tickFormatter={(val) => `CD ${val}`} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                         <YAxis yAxisId="left" label={{ value: 'Size (mm)', angle: -90, position: 'insideLeft', fontSize: 10 }} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                         <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                                         <ReferenceLine yAxisId="left" y={18} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'right', value: 'Trigger Size', fontSize: 10, fill: '#10b981' }} />
                                         <Bar yAxisId="left" dataKey="left" fill="#818cf8" radius={[4, 4, 0, 0]} name="Left Ovary" barSize={20} />
                                         <Bar yAxisId="left" dataKey="right" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Right Ovary" barSize={20} />
                                         <Line yAxisId="left" type="monotone" dataKey="endometrium" stroke="#f43f5e" strokeWidth={2} dot={{r: 4, fill: '#f43f5e'}} name="Endo Thickness" />
                                       </BarChart>
                                     </ResponsiveContainer>
                                  </div>
                               </CardContent>
                            </Card>
                         )}

                         {/* 3. PREGNANCY WORKSPACE */}
                         {careMode === 'pregnancy' && (
                            <>
                               {/* Fetal Biometry (USG) */}
                               <Card className="shadow-sm border-slate-200">
                                  <CardHeader className="py-3 border-b border-slate-100 flex flex-row items-center justify-between">
                                     <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-emerald-600" /> Fetal Biometry (USG)
                                     </CardTitle>
                                     {usgData.length > 0 && (
                                       <Badge variant="outline" className="text-[10px] font-normal text-slate-500">
                                         {usgData.length} scan{usgData.length > 1 ? 's' : ''} recorded
                                       </Badge>
                                     )}
                                  </CardHeader>
                                  <CardContent className="pt-4">
                                     {/* Dynamic stat cards from latest USG */}
                                     {usgData.length > 0 && (() => {
                                       const latest = usgData[usgData.length - 1];
                                       return (
                                         <div className="grid grid-cols-4 gap-3 mb-4">
                                           <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-center">
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">BPD</div>
                                             <div className="text-base font-bold text-slate-800">{latest.bpd || '—'}<span className="text-[10px] font-normal text-slate-400 ml-0.5">mm</span></div>
                                           </div>
                                           <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-center">
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">HC</div>
                                             <div className="text-base font-bold text-slate-800">{latest.hc || '—'}<span className="text-[10px] font-normal text-slate-400 ml-0.5">mm</span></div>
                                           </div>
                                           <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-center">
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">AC</div>
                                             <div className="text-base font-bold text-slate-800">{latest.ac || '—'}<span className="text-[10px] font-normal text-slate-400 ml-0.5">mm</span></div>
                                           </div>
                                           <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-center">
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">FL</div>
                                             <div className="text-base font-bold text-slate-800">{latest.fl || '—'}<span className="text-[10px] font-normal text-slate-400 ml-0.5">mm</span></div>
                                           </div>
                                         </div>
                                       );
                                     })()}

                                     <div className="h-[250px] w-full">
                                       {usgData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                           <LineChart data={usgData}>
                                              <XAxis dataKey="week" tickFormatter={(v) => `Wk ${v}`} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                                              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} labelFormatter={(v) => `Week ${v}`} />
                                              <Line type="monotone" dataKey="hc" stroke="#3b82f6" strokeWidth={2} name="Head Circ (mm)" dot={{r: 3, fill: '#3b82f6'}} />
                                              <Line type="monotone" dataKey="ac" stroke="#10b981" strokeWidth={2} name="Abd Circ (mm)" dot={{r: 3, fill: '#10b981'}} />
                                              <Line type="monotone" dataKey="fl" stroke="#f59e0b" strokeWidth={2} name="Femur Len (mm)" dot={{r: 3, fill: '#f59e0b'}} />
                                              {usgData[0]?.bpd !== undefined && (
                                                <Line type="monotone" dataKey="bpd" stroke="#8b5cf6" strokeWidth={2} name="BPD (mm)" dot={{r: 3, fill: '#8b5cf6'}} />
                                              )}
                                           </LineChart>
                                        </ResponsiveContainer>
                                       ) : (
                                         <div className="flex items-center justify-center h-full text-sm text-slate-400">No USG data recorded yet</div>
                                       )}
                                     </div>
                                  </CardContent>
                               </Card>

                               {/* Maternal Vitals & Trends */}
                               <Card className="shadow-sm border-slate-200">
                                  <CardHeader className="py-3 border-b border-slate-100 flex flex-row items-center justify-between">
                                     <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-pink-600" /> Maternal Vitals & Trends
                                     </CardTitle>
                                     {pregnancyData.length > 0 && (
                                       <Badge variant="outline" className="text-[10px] font-normal text-slate-500">
                                         {pregnancyData.length} record{pregnancyData.length > 1 ? 's' : ''}
                                       </Badge>
                                     )}
                                  </CardHeader>
                                  <CardContent className="pt-4">
                                     {/* Dynamic latest vitals */}
                                     {pregnancyData.length > 0 && (() => {
                                       const latest = pregnancyData[pregnancyData.length - 1];
                                       return (
                                         <div className="grid grid-cols-4 gap-3 mb-4">
                                           <div className="bg-pink-50/50 p-2.5 rounded border border-pink-100 text-center">
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">Weight</div>
                                             <div className="text-base font-bold text-slate-800">{latest.weight || '—'}<span className="text-[10px] font-normal text-slate-400 ml-0.5">kg</span></div>
                                           </div>
                                           <div className="bg-rose-50/50 p-2.5 rounded border border-rose-100 text-center">
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">BP</div>
                                             <div className="text-base font-bold text-slate-800">{latest.systolic || '—'}/{latest.diastolic || '—'}</div>
                                           </div>
                                           <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100 text-center">
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">Fundal Ht</div>
                                             <div className="text-base font-bold text-slate-800">{latest.fundalHeight || '—'}<span className="text-[10px] font-normal text-slate-400 ml-0.5">cm</span></div>
                                           </div>
                                           <div className="bg-emerald-50/50 p-2.5 rounded border border-emerald-100 text-center">
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">FHR</div>
                                             <div className="text-base font-bold text-slate-800">{latest.fetalHr || '—'}<span className="text-[10px] font-normal text-slate-400 ml-0.5">bpm</span></div>
                                           </div>
                                         </div>
                                       );
                                     })()}

                                     <div className="h-[250px] w-full">
                                       {pregnancyData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                          <ComposedChart data={pregnancyData}>
                                            <XAxis dataKey="week" tickFormatter={(v) => `Wk ${v}`} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                                            <YAxis yAxisId="left" domain={['auto', 'auto']} label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', fontSize: 10 }} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                                            <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} label={{ value: 'BP (mmHg)', angle: 90, position: 'insideRight', fontSize: 10 }} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} labelFormatter={(v) => `Week ${v}`} />
                                            <Area yAxisId="left" type="monotone" dataKey="weight" stroke="#ec4899" strokeWidth={2} fill="#fbcfe8" fillOpacity={0.2} name="Maternal Weight" />
                                            <Line yAxisId="right" type="monotone" dataKey="systolic" stroke="#f43f5e" strokeWidth={2} dot={{r: 3, fill: '#f43f5e'}} name="Systolic BP" />
                                            <Line yAxisId="right" type="monotone" dataKey="diastolic" stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={2} dot={{r: 3, fill: '#f43f5e'}} name="Diastolic BP" />
                                          </ComposedChart>
                                        </ResponsiveContainer>
                                       ) : (
                                         <div className="flex items-center justify-center h-full text-sm text-slate-400">No pregnancy vitals recorded yet</div>
                                       )}
                                     </div>
                                  </CardContent>
                               </Card>
                            </>
                         )}

                         {/* 4. POSTPARTUM WORKSPACE */}
                         {careMode === 'postpartum' && (
                            <Card className="shadow-sm border-slate-200 overflow-hidden">
                               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url(${postpartumRecoveryBg})`, backgroundSize: 'cover' }}></div>
                               <CardHeader className="py-4 border-b border-slate-100 relative z-10">
                                  <CardTitle className="text-base font-bold text-slate-800">Postpartum Recovery Tracker</CardTitle>
                               </CardHeader>
                               <CardContent className="pt-6 relative z-10 space-y-6">
                                  <div>
                                     <div className="flex justify-between text-sm mb-2 font-medium"><span>Physical Recovery</span> <span>85%</span></div>
                                     <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full w-[85%] bg-emerald-500 rounded-full"></div></div>
                                  </div>
                                  <div>
                                     <div className="flex justify-between text-sm mb-2 font-medium"><span>Hormone Reset</span> <span>60%</span></div>
                                     <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full w-[60%] bg-blue-500 rounded-full"></div></div>
                                  </div>
                               </CardContent>
                            </Card>
                         )}

                         {/* SHARED: LAB INTELLIGENCE PANEL */}
                         <Card className="shadow-sm border-slate-200">
                            <CardHeader className="py-3 border-b border-slate-100 flex flex-row items-center justify-between">
                               <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                  <FlaskConical className="w-4 h-4 text-purple-600" /> Lab Intelligence
                                  {labResults.length > 0 && (
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                                      {labResults.length}
                                    </span>
                                  )}
                               </CardTitle>
                               {labDocuments.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[11px] gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
                                    disabled={extractLabMutation.isPending}
                                    onClick={() => selectedPatient && extractLabMutation.mutate(selectedPatient.id)}
                                    data-testid="button-extract-lab"
                                  >
                                    {extractLabMutation.isPending ? (
                                      <><Loader2 className="w-3 h-3 animate-spin" /> Reading Reports...</>
                                    ) : (
                                      <><Sparkle className="w-3 h-3" /> Extract from Reports</>
                                    )}
                                  </Button>
                               )}
                            </CardHeader>
                            {extractionStatus && (
                              <div className={`px-4 py-2 text-xs ${extractionStatus.startsWith('Error') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {extractionStatus}
                              </div>
                            )}
                            <CardContent className="p-0">
                               {labResults.length > 0 ? (
                                  <table className="w-full text-sm text-left">
                                     <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                                        <tr>
                                           <th className="px-4 py-2 font-medium">Test</th>
                                           <th className="px-4 py-2 font-medium">Value</th>
                                           <th className="px-4 py-2 font-medium">Date</th>
                                           <th className="px-4 py-2 font-medium">Status</th>
                                        </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100">
                                        {labResults.map((lr: any) => {
                                           const s = (lr.status || '').toLowerCase();
                                           const badgeClass = s === 'normal' ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                              : s === 'high' || s === 'critical' ? 'border-rose-200 text-rose-700 bg-rose-50'
                                              : s === 'low' || s === 'monitor' || s === 'borderline' ? 'border-amber-200 text-amber-700 bg-amber-50'
                                              : 'border-slate-200 text-slate-700 bg-slate-50';
                                           return (
                                              <tr key={lr.id} data-testid={`lab-result-row-${lr.id}`}>
                                                 <td className="px-4 py-3 font-medium text-slate-700">{lr.testName}</td>
                                                 <td className="px-4 py-3">{lr.value != null ? `${lr.value} ${lr.unit || ''}` : '-'}</td>
                                                 <td className="px-4 py-3 text-xs text-slate-400">{lr.date ? new Date(lr.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}</td>
                                                 <td className="px-4 py-3">
                                                    <Badge variant="outline" className={badgeClass}>
                                                       {lr.status || 'N/A'}
                                                    </Badge>
                                                 </td>
                                              </tr>
                                           );
                                        })}
                                     </tbody>
                                  </table>
                               ) : (
                                  <table className="w-full text-sm text-left">
                                     <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                                        <tr>
                                           <th className="px-4 py-2 font-medium">Test</th>
                                           <th className="px-4 py-2 font-medium">Value</th>
                                           <th className="px-4 py-2 font-medium">Trend</th>
                                           <th className="px-4 py-2 font-medium">Status</th>
                                        </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100">
                                        {careMode === 'pregnancy' ? (
                                           <>
                                              <tr>
                                                 <td className="px-4 py-3 font-medium text-slate-700">Fasting Glucose</td>
                                                 <td className="px-4 py-3">88 mg/dL</td>
                                                 <td className="px-4 py-3 text-emerald-500">Stable</td>
                                                 <td className="px-4 py-3"><Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Normal</Badge></td>
                                              </tr>
                                              <tr>
                                                 <td className="px-4 py-3 font-medium text-slate-700">OGTT (1hr)</td>
                                                 <td className="px-4 py-3">135 mg/dL</td>
                                                 <td className="px-4 py-3 text-amber-500">Borderline</td>
                                                 <td className="px-4 py-3"><Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Monitor</Badge></td>
                                              </tr>
                                              <tr>
                                                 <td className="px-4 py-3 font-medium text-slate-700">Hemoglobin</td>
                                                 <td className="px-4 py-3">11.2 g/dL</td>
                                                 <td className="px-4 py-3 text-slate-400">Stable</td>
                                                 <td className="px-4 py-3"><Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Normal</Badge></td>
                                              </tr>
                                           </>
                                        ) : (
                                           <>
                                              <tr>
                                                 <td className="px-4 py-3 font-medium text-slate-700">Progesterone (D21)</td>
                                                 <td className="px-4 py-3">8.2 ng/mL</td>
                                                 <td className="px-4 py-3 text-rose-500 flex items-center gap-1"><TrendingUp className="w-3 h-3 rotate-180" /> Dropping</td>
                                                 <td className="px-4 py-3"><Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50">Low</Badge></td>
                                              </tr>
                                              <tr>
                                                 <td className="px-4 py-3 font-medium text-slate-700">AMH</td>
                                                 <td className="px-4 py-3">2.1 ng/mL</td>
                                                 <td className="px-4 py-3 text-slate-400">- Stable</td>
                                                 <td className="px-4 py-3"><Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Normal</Badge></td>
                                              </tr>
                                           </>
                                        )}
                                     </tbody>
                                  </table>
                               )}
                            </CardContent>
                         </Card>

                         {/* LAB REPORTS (from Google Drive) */}
                         {labDocuments.length > 0 && (
                            <Card className="shadow-sm border-slate-200">
                               <CardHeader className="py-3 border-b border-slate-100">
                                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                     <FileText className="w-4 h-4 text-purple-500" /> Lab Reports
                                     <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium ml-auto">
                                        {labDocuments.length}
                                     </span>
                                  </CardTitle>
                               </CardHeader>
                               <CardContent className="p-0">
                                  <div className="divide-y divide-slate-100">
                                     {labDocuments.map((doc: any) => (
                                        <div key={doc.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors" data-testid={`lab-doc-${doc.id}`}>
                                           <div className="flex items-center gap-3 min-w-0 flex-1">
                                              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                                                 <FileText className="w-4 h-4 text-purple-500" />
                                              </div>
                                              <div className="min-w-0">
                                                 <p className="text-sm font-medium text-slate-700 truncate">
                                                    {doc.metadata?.extractedPatientName || doc.name?.replace(/TestReport_/g, '').replace(/_[^_]+\.pdf$/, '') || 'Lab Report'}
                                                 </p>
                                                 <p className="text-[10px] text-slate-400">
                                                    {doc.date ? new Date(doc.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Imported'}
                                                    {doc.metadata?.fileSize && ` · ${(parseInt(doc.metadata.fileSize) / 1024 / 1024).toFixed(1)} MB`}
                                                 </p>
                                              </div>
                                           </div>
                                           {doc.metadata?.driveViewUrl && (
                                              <a
                                                href={doc.metadata.driveViewUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 ml-2 text-purple-500 hover:text-purple-700 transition-colors"
                                                title="View in Google Drive"
                                                data-testid={`lab-doc-link-${doc.id}`}
                                              >
                                                 <ExternalLink className="w-4 h-4" />
                                              </a>
                                           )}
                                        </div>
                                     ))}
                                  </div>
                               </CardContent>
                            </Card>
                         )}

                      </div>

                      {/* RIGHT COLUMN: Protocols & Meds (Dynamic) */}
                      <div className="space-y-6">
                         
                         {/* PROTOCOL PLANNER */}
                         <Card className="shadow-sm border-slate-200 bg-slate-50/50">
                            <CardHeader className="py-3 border-b border-slate-100">
                               <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                  <ClipboardList className="w-4 h-4 text-indigo-600" /> Care Protocols
                               </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                               {/* DYNAMIC PROTOCOL SUGGESTIONS */}
                               {careMode === 'pregnancy' && (
                                  <div className="bg-white border border-rose-100 rounded-lg p-3 shadow-sm">
                                     <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-rose-900">HIGH RISK PROTOCOL</h4>
                                        <Badge className="text-[10px] bg-rose-100 text-rose-700 border-none">PIH + GDM</Badge>
                                     </div>
                                     <ul className="space-y-2">
                                        <li className="text-xs text-slate-600 flex items-center gap-2"><Scale className="w-3 h-3 text-rose-500" /> Weekly BP Log</li>
                                        <li className="text-xs text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> GDM Diet (1800 cal)</li>
                                        <li className="text-xs text-slate-600 flex items-center gap-2"><Activity className="w-3 h-3 text-emerald-500" /> Daily Fetal Count</li>
                                     </ul>
                                  </div>
                               )}

                               {careMode === 'natural_conception' && (
                                  <div className="bg-white border border-indigo-100 rounded-lg p-3 shadow-sm">
                                     <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-indigo-900">TIMED INTERCOURSE</h4>
                                        <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-none">Active</Badge>
                                     </div>
                                     <ul className="space-y-2">
                                        <li className="text-xs text-slate-600 flex items-center gap-2"><CalendarCheck className="w-3 h-3 text-emerald-500" /> Fertile Window: CD 12-16</li>
                                        <li className="text-xs text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> LH Surge Monitored</li>
                                     </ul>
                                  </div>
                               )}
                               
                               {/* Default Fallback */}
                               {careMode !== 'pregnancy' && careMode !== 'natural_conception' && (
                                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm opacity-70">
                                     <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-slate-700">LUTEAL SUPPORT</h4>
                                        <Button size="sm" variant="ghost" className="h-5 text-[10px] text-slate-400">Add</Button>
                                     </div>
                                     <p className="text-[10px] text-slate-500">Standard luteal phase support protocol.</p>
                                  </div>
                               )}
                            </CardContent>
                         </Card>
                         
                         {/* MEDICATION MANAGEMENT */}
                         <Card className="shadow-sm border-slate-200">
                            <CardHeader className="py-3 border-b border-slate-100 flex justify-between items-center flex-row">
                               <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                  <Pill className="w-4 h-4 text-blue-600" /> Active Meds
                                  {medications.length > 0 && <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">{medications.filter((m: any) => m.status === 'Active' || m.status === 'active').length}</Badge>}
                               </CardTitle>
                               <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowDocumentation(true)}><ChevronRight className="w-4 h-4" /></Button>
                            </CardHeader>
                            <CardContent className="p-0">
                               {medications.length > 0 ? (
                                 medications.map((med: any, i: number) => (
                                   <div key={med.id} className={`p-3 flex justify-between items-center ${i < medications.length - 1 ? 'border-b border-slate-50' : ''}`} data-testid={`active-med-card-${med.id}`}>
                                     <div className="min-w-0 flex-1">
                                       <div className="font-medium text-sm text-slate-900 truncate">{med.name}</div>
                                       <div className="text-xs text-slate-500">{[med.dose, med.frequency].filter(Boolean).join(' • ') || '—'}{med.notes ? ` • ${med.notes}` : ''}</div>
                                     </div>
                                     <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                       <Badge variant="secondary" className={`text-[10px] ${med.status === 'Active' || med.status === 'active' ? 'bg-emerald-50 text-emerald-700' : med.status === 'Completed' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                                         {med.status || 'Active'}
                                       </Badge>
                                       <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-300 hover:text-blue-600" onClick={() => { setShowDocumentation(true); setEditingMedId(med.id); setEditMedData({ name: med.name, dose: med.dose || '', frequency: med.frequency || '', startDate: med.startDate || '', status: med.status || 'Active', notes: med.notes || '' }); }} data-testid={`button-edit-med-card-${med.id}`}>
                                         <Pencil className="w-3 h-3" />
                                       </Button>
                                     </div>
                                   </div>
                                 ))
                               ) : (
                                 <div className="p-4 text-center">
                                   <p className="text-xs text-slate-400 mb-2">No medications prescribed</p>
                                   <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-dashed border-blue-300 text-blue-600" onClick={() => { setShowDocumentation(true); setShowAddMedRow(true); }} data-testid="button-add-med-from-card">
                                     <Plus className="w-3 h-3" /> Add Medication
                                   </Button>
                                 </div>
                               )}
                            </CardContent>
                         </Card>

                         {/* PATIENT COMMUNICATION LOG */}
                         <Card className="shadow-sm border-slate-200">
                            <CardHeader className="py-3 border-b border-slate-100">
                               <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-slate-500" /> Recent Comms
                               </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                               <div className="p-3 border-b border-slate-50">
                                  <div className="flex justify-between text-xs mb-1">
                                     <span className="font-semibold text-slate-700">Plan Updated</span>
                                     <span className="text-slate-400">Today</span>
                                  </div>
                                  <p className="text-xs text-slate-500 truncate">
                                     {careMode === 'pregnancy' ? "Added BP monitoring log to patient portal." : "Cycle plan updated."}
                                  </p>
                               </div>
                            </CardContent>
                         </Card>

                      </div>

                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
