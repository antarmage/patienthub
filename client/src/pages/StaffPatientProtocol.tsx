import React, { useState, useMemo, useEffect } from "react";
import { useRoute } from "wouter";
import { 
  ArrowLeft, 
  Activity, 
  Flame, 
  Apple, 
  Calendar, 
  Utensils, 
  AlertCircle, 
  FileText, 
  TrendingUp, 
  ChevronDown,
  Info,
  Save,
  Printer,
  Share2,
  Trash2,
  Sparkles,
  ListPlus,
  Plus,
  X,
  Clock,
  Check,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const historyData = [
  { date: 'Oct 01', weight: 69.5, inflammation: 4.2, adherence: 85 },
  { date: 'Oct 08', weight: 69.1, inflammation: 3.8, adherence: 90 },
  { date: 'Oct 15', weight: 68.8, inflammation: 3.5, adherence: 80 },
  { date: 'Oct 22', weight: 68.5, inflammation: 3.2, adherence: 95 },
  { date: 'Oct 29', weight: 68.2, inflammation: 2.8, adherence: 92 },
  { date: 'Nov 05', weight: 67.9, inflammation: 2.5, adherence: 98 },
];

const intakeLog = [
    { id: 1, date: "Today", meal: "Breakfast", status: "Consumed", item: "Oatmeal with Flax & Berries", notes: "Felt full" },
    { id: 2, date: "Today", meal: "Morning Snack", status: "Skipped", item: "Walnuts (Soaked)", notes: "Forgot due to meeting" },
    { id: 3, date: "Yesterday", meal: "Dinner", status: "Consumed", item: "Lentil Soup", notes: "" },
    { id: 4, date: "Yesterday", meal: "Afternoon Snack", status: "Consumed", item: "Green Tea", notes: "" },
    { id: 5, date: "Yesterday", meal: "Lunch", status: "Consumed", item: "Quinoa Salad", notes: "" },
];

export default function StaffPatientProtocol() {
  const patientsQuery = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const providersQuery = useQuery({
    queryKey: ['/api/providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const nutritionPlansQuery = useQuery({
    queryKey: ['/api/nutrition-plans'],
    queryFn: async () => {
      const res = await fetch('/api/nutrition-plans');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const workoutsQuery = useQuery({
    queryKey: ['/api/workouts'],
    queryFn: async () => {
      const res = await fetch('/api/workouts');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const labTasksQuery = useQuery({
    queryKey: ['/api/lab-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/lab-tasks');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const appointmentsQuery = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      const res = await fetch('/api/appointments');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const allPatients = patientsQuery.data || [];
  const allProviders = providersQuery.data || [];
  const nutritionPlans = nutritionPlansQuery.data || [];
  const workouts = workoutsQuery.data || [];

  const functionalMedicinePatients = useMemo(
    () => allPatients.filter((p: any) => p.genomics != null),
    [allPatients]
  );

  const labTasks = useMemo(
    () => (labTasksQuery.data || []).map((task: any) => {
      const pat = allPatients.find((p: any) => p.id === task.patientId);
      return { ...task, patientName: pat?.name || 'Unknown' };
    }),
    [labTasksQuery.data, allPatients]
  );

  const appointments = useMemo(
    () => (appointmentsQuery.data || []).map((appt: any) => {
      const pat = allPatients.find((p: any) => p.id === appt.patientId);
      const prov = allProviders.find((pr: any) => pr.id === appt.providerId);
      return { ...appt, patientName: pat?.name || 'Unknown', providerName: prov?.name || 'Unknown' };
    }),
    [appointmentsQuery.data, allPatients, allProviders]
  );

  const patients = allPatients;
  const [match, params] = useRoute("/staff/protocol/:id");
  const patientId = params?.id ? parseInt(params.id) : null;
  const patient = patients.find((p: any) => p.id === patientId) || patients[0];

  const { toast } = useToast();
  const [primaryGoal, setPrimaryGoal] = useState("inflammation");
  const [dietaryStrategy, setDietaryStrategy] = useState("anti-inflammatory");
  const [isSaving, setIsSaving] = useState(false);

  const protocolQuery = useQuery({
    queryKey: ['/api/patient-protocols', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const res = await fetch(`/api/patient-protocols/${patientId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!patientId,
  });

  const existingProtocol = protocolQuery.data;
  const [protocolLoaded, setProtocolLoaded] = useState(false);

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [isCustomMealOpen, setIsCustomMealOpen] = useState(false);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Mock database of weekly plans
  const [weeklyPlan, setWeeklyPlan] = useState<Record<string, any[]>>({
    "Monday": [
        { id: 1, time: "08:00", name: "Breakfast", item: "Oatmeal with Flax & Berries", qty: "1 bowl", macros: "350kcal, 12g P" },
        { id: 2, time: "11:00", name: "Morning Snack", item: "Walnuts (Soaked)", qty: "5-6 pcs", macros: "120kcal, 4g P" },
        { id: 3, time: "13:00", name: "Lunch", item: "Quinoa Salad with Chickpeas", qty: "1 plate", macros: "450kcal, 18g P" },
        { id: 4, time: "16:00", name: "Afternoon Snack", item: "Green Tea + Apple", qty: "1 cup", macros: "80kcal, 0g P" },
        { id: 5, time: "19:30", name: "Dinner", item: "Lentil Soup + Steamed Veg", qty: "1 bowl", macros: "320kcal, 15g P" }
    ],
    "Tuesday": [
        { id: 6, time: "08:00", name: "Breakfast", item: "Scrambled Eggs (or Tofu) with Spinach", qty: "2 eggs", macros: "320kcal, 18g P" },
        { id: 7, time: "11:00", name: "Morning Snack", item: "Almonds", qty: "10 pcs", macros: "140kcal, 5g P" },
        { id: 8, time: "13:00", name: "Lunch", item: "Grilled Chicken/Paneer Salad", qty: "1 bowl", macros: "400kcal, 25g P" },
    ]
  });

  useEffect(() => {
    if (existingProtocol && !protocolLoaded) {
      if (existingProtocol.weeklyPlan) {
        setWeeklyPlan(existingProtocol.weeklyPlan as Record<string, any[]>);
      }
      if (existingProtocol.primaryGoal) {
        setPrimaryGoal(existingProtocol.primaryGoal);
      }
      if (existingProtocol.dietaryStrategy) {
        setDietaryStrategy(existingProtocol.dietaryStrategy);
      }
      setProtocolLoaded(true);
    }
  }, [existingProtocol, protocolLoaded]);

  const currentDayPlan = weeklyPlan[selectedDay] || [];

  const updateMealItem = (day: string, id: number, field: string, value: string) => {
    setWeeklyPlan(prev => ({
        ...prev,
        [day]: prev[day]?.map(item => item.id === id ? { ...item, [field]: value } : item) || []
    }));
  };

  const [customMealData, setCustomMealData] = useState({ name: "", type: "", time: "00:00", qty: "1 serving", macros: "" });

  const handleCustomMealAdd = () => {
    const newId = Date.now();
    setWeeklyPlan(prev => ({
        ...prev,
        [selectedDay]: [...(prev[selectedDay] || []), { 
            id: newId, 
            time: customMealData.time, 
            name: customMealData.type === 'drink' ? 'Hydration' : 'Custom Meal', 
            item: customMealData.name, 
            qty: customMealData.qty, 
            macros: customMealData.macros 
        }]
    }));
    setIsCustomMealOpen(false);
    setCustomMealData({ name: "", type: "", time: "00:00", qty: "1 serving", macros: "" }); // Reset
  };

  const [isRequestLabOpen, setIsRequestLabOpen] = useState(false);
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  
  const labCategories = {
    "Hormonal": ["FSH/LH", "Estradiol", "Progesterone", "Testosterone (Total/Free)", "Prolactin"],
    "Metabolic": ["HbA1c", "Fasting Insulin", "Lipid Profile", "Thyroid Panel (TSH, T3, T4)"],
    "Inflammatory": ["hs-CRP", "Homocysteine", "Ferritin", "ESR"],
    "Nutritional": ["Vitamin D", "Vitamin B12", "Iron Studies", "Magnesium"]
  };

  const toggleLabSelection = (lab: string) => {
    if (selectedLabs.includes(lab)) {
      setSelectedLabs(selectedLabs.filter(l => l !== lab));
    } else {
      setSelectedLabs([...selectedLabs, lab]);
    }
  };

  // --- COMPONENT HANDLERS ---
  const addComponentToMeal = (day: string, mealId: number) => {
    setWeeklyPlan(prev => ({
        ...prev,
        [day]: prev[day]?.map(item => {
            if (item.id === mealId) {
                const currentComponents = item.components || [];
                return { 
                    ...item, 
                    components: [...currentComponents, { id: Date.now(), name: "", qty: "" }]
                };
            }
            return item;
        }) || []
    }));
  };

  const updateComponent = (day: string, mealId: number, compId: number, field: string, value: string) => {
    setWeeklyPlan(prev => ({
        ...prev,
        [day]: prev[day]?.map(item => {
            if (item.id === mealId && item.components) {
                return {
                    ...item,
                    components: item.components.map((c: any) => c.id === compId ? { ...c, [field]: value } : c)
                };
            }
            return item;
        }) || []
    }));
  };

  const removeComponent = (day: string, mealId: number, compId: number) => {
    setWeeklyPlan(prev => ({
        ...prev,
        [day]: prev[day]?.map(item => {
            if (item.id === mealId && item.components) {
                return {
                    ...item,
                    components: item.components.filter((c: any) => c.id !== compId)
                };
            }
            return item;
        }) || []
    }));
  };

  const removeMealItem = (day: string, id: number) => {
    setWeeklyPlan(prev => ({
        ...prev,
        [day]: prev[day]?.filter(item => item.id !== id) || []
    }));
  };

  const addMealItem = (day: string) => {
    const newId = Date.now();
    setWeeklyPlan(prev => ({
        ...prev,
        [day]: [...(prev[day] || []), { 
            id: newId, 
            time: "00:00", 
            name: "New Meal", 
            item: "", 
            qty: "", 
            macros: "" 
        }]
    }));
  };

  const copyToAllDays = () => {
    const currentPlan = weeklyPlan[selectedDay] || [];
    const newWeeklyPlan = { ...weeklyPlan };
    days.forEach(day => {
        if (day !== selectedDay) {
            // Deep copy to avoid reference issues
            newWeeklyPlan[day] = JSON.parse(JSON.stringify(currentPlan)).map((item: any) => ({...item, id: Math.random() })); 
        }
    });
    setWeeklyPlan(newWeeklyPlan);
  };

  const handleSaveProtocol = async () => {
    if (!patient) return;
    setIsSaving(true);
    try {
      const staffUsername = localStorage.getItem("staffUsername") || "unknown";
      const res = await fetch("/api/patient-protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          primaryGoal,
          dietaryStrategy,
          weeklyPlan,
          savedBy: staffUsername,
          savedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Protocol saved", description: `Protocol for ${patient.name} saved successfully.` });
    } catch {
      toast({ title: "Error", description: "Failed to save protocol. Please try again.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const totalCalories = useMemo(() => {
    const dayPlan = weeklyPlan[selectedDay] || [];
    return dayPlan.reduce((sum: number, item: any) => {
      const match = (item.macros || "").match(/(\d+)\s*kcal/i);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);
  }, [weeklyPlan, selectedDay]);
  const targetCalories = (patient?.meta?.tdee || 1800) - 300;

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-500">Loading patient data...</p>
          <Link href="/staff">
            <Button variant="outline" size="sm">Back to Staff Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
            <Link href="/staff">
                <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2 text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
            </Link>
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-slate-200">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{patient.avatar}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-slate-900">{patient.name}</h1>
                        <Badge variant="outline" className="text-xs font-normal bg-indigo-50 text-indigo-700 border-indigo-100">{patient.condition}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">ID: #{patient.id} • Age: {patient.age} • Female</p>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
             <Button variant="outline" size="sm" className="bg-white border-slate-200">
                <Share2 className="w-4 h-4 mr-2" /> Share
             </Button>
             <Button variant="outline" size="sm" className="bg-white border-slate-200">
                <Printer className="w-4 h-4 mr-2" /> Print
             </Button>
             <Button className="bg-slate-900 text-white hover:bg-slate-800" size="sm" onClick={handleSaveProtocol} disabled={isSaving} data-testid="button-save-protocol">
                <Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving..." : "Save Protocol"}
             </Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <Tabs defaultValue="protocol" className="w-full">
            <div className="flex items-center justify-between mb-6">
                 <TabsList className="bg-white border border-slate-200">
                    <TabsTrigger value="protocol">Protocol Design</TabsTrigger>
                    <TabsTrigger value="progress">History & Progress</TabsTrigger>
                 </TabsList>
                 <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" /> Last 30 Days
                 </div>
            </div>

            <TabsContent value="protocol" className="space-y-6">

            {/* Patient History Section */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-slate-600" />
                        <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">Patient History</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-6">
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Past Medical History</h4>
                            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                {patient.history?.medical?.map((item: string, i: number) => <li key={i}>{item}</li>) || <li className="text-slate-400 italic text-xs">None recorded</li>}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Past Surgical History</h4>
                            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                {patient.history?.surgical?.map((item: string, i: number) => <li key={i}>{item}</li>) || <li className="text-slate-400 italic text-xs">None recorded</li>}
                            </ul>
                        </div>
                        <div>
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Drug History</h4>
                             <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                {patient.history?.drug?.map((item: string, i: number) => <li key={i}>{item}</li>) || <li className="text-slate-400 italic text-xs">None recorded</li>}
                            </ul>
                        </div>
                         <div>
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 text-rose-600 border-b border-rose-100 pb-1">Allergies</h4>
                             <div className="flex flex-wrap gap-2 pt-1">
                                {patient.history?.allergies?.map((item: string, i: number) => (
                                    <Badge key={i} variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">{item}</Badge>
                                )) || <span className="text-sm text-slate-400 italic">No known allergies</span>}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        
        {/* TOP ROW: Metabolic Context & Doctor's Note */}
        <div className="grid grid-cols-12 gap-6">
            {/* Clinician Note */}
            <Card className="col-span-4 bg-blue-50/50 border-blue-100 shadow-sm">
                <CardHeader className="py-3 px-4 border-b border-blue-100 bg-blue-50">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        <CardTitle className="text-sm font-bold text-blue-900 uppercase tracking-wide">Clinician Instructions</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <p className="text-sm text-blue-800 leading-relaxed font-medium">
                        "{patient.clinicianNote}"
                    </p>
                </CardContent>
            </Card>

            {/* Metabolic Stats */}
            <div className="col-span-8 grid grid-cols-4 gap-4">
                 <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex flex-col justify-center h-full">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-1">Current Phase</p>
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="font-bold text-sm truncate">{(patient?.meta?.phase || 'Follicular').split(' ')[0]}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Day {(patient?.meta?.phase || '').split('Day ')[1]?.replace(')', '') || '-'}</p>
                    </CardContent>
                 </Card>

                 <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex flex-col justify-center h-full">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-1">Energy Exp (TDEE)</p>
                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                            <Flame className="w-4 h-4" />
                            <span className="font-bold text-lg">{patient?.meta?.tdee || 1800}</span>
                            <span className="text-xs font-normal text-slate-500">kcal</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Activity: {(patient?.meta?.activity || 'Moderate').split(' ')[0]}</p>
                    </CardContent>
                 </Card>

                 <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex flex-col justify-center h-full">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-1">Target Intake</p>
                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                            <Apple className="w-4 h-4" />
                            <span className="font-bold text-lg">{targetCalories}</span>
                            <span className="text-xs font-normal text-slate-500">kcal</span>
                        </div>
                        <Badge variant="secondary" className="w-fit text-[9px] h-4 px-1 bg-emerald-50 text-emerald-700">-300 deficit</Badge>
                    </CardContent>
                 </Card>

                 <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex flex-col justify-center h-full">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-1">Biometrics</p>
                        <div className="flex justify-between items-end">
                             <div>
                                <p className="text-sm font-bold text-slate-800">{patient?.meta?.weight || patient?.weight || '-'}</p>
                                <p className="text-[10px] text-slate-400">Weight</p>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-bold text-slate-800">{patient?.meta?.bmi || '-'}</p>
                                <p className="text-[10px] text-slate-400">BMI</p>
                             </div>
                        </div>
                    </CardContent>
                 </Card>
            </div>
        </div>

        {/* MIDDLE ROW: Lab Reports & Protocol Goals */}
        <div className="grid grid-cols-12 gap-6">
            {/* Labs Panel */}
            <Card className="col-span-8 shadow-sm border-slate-200">
                <CardHeader className="py-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-900">Recent Lab Biomarkers</CardTitle>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-7 border-slate-200"
                            onClick={() => setIsRequestLabOpen(true)}
                        >
                            <Plus className="w-3 h-3 mr-1" /> Request Labs
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs text-indigo-600 h-7">View Full Report</Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {Object.entries(patient.labs || {}).map(([key, data]: [string, any]) => (
                            <div key={key} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded group border border-transparent hover:border-slate-100 transition-all">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase">{data.name}</p>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                        <span className={`text-lg font-bold ${data.status === 'High' || data.status === 'Critical' || data.status === 'Low' ? 'text-red-600' : 'text-slate-800'}`}>
                                            {data.value}
                                        </span>
                                        <span className="text-xs text-slate-400">Ref: {data.range}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                     <Badge className={`${
                                         data.status === 'Normal' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                                         data.status === 'Borderline' || data.status === 'Elevated' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                                         'bg-red-100 text-red-700 hover:bg-red-100'
                                     } border-none`}>
                                         {data.status}
                                     </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Protocol Goals */}
            <Card className="col-span-4 shadow-sm border-slate-200">
                <CardHeader className="py-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900">Protocol Focus</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                     <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Primary Goal</Label>
                        <Select value={primaryGoal} onValueChange={setPrimaryGoal}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="inflammation">Reduce Inflammation (hs-CRP)</SelectItem>
                                <SelectItem value="insulin">Improve Insulin Sensitivity</SelectItem>
                                <SelectItem value="hormone">Hormone Balance</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Dietary Strategy</Label>
                        <Select value={dietaryStrategy} onValueChange={setDietaryStrategy}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="anti-inflammatory">Anti-Inflammatory & Low GI</SelectItem>
                                <SelectItem value="low-histamine">Low Histamine Protocol</SelectItem>
                                <SelectItem value="mediterranean">Mediterranean Diet</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                </CardContent>
            </Card>
        </div>

        {/* BOTTOM SECTION: Diet Planner */}
        <Card className="shadow-sm border-slate-200 overflow-hidden">
             <CardHeader className="py-0 px-0 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 font-serif">Weekly Meal Plan</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">Plan meals for the entire week.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Planned</p>
                            <p className={`text-sm font-bold ${totalCalories > targetCalories ? 'text-amber-600' : 'text-slate-700'}`}>
                                {totalCalories} / {targetCalories} kcal
                            </p>
                        </div>
                        <Button size="sm" variant="outline" className="bg-white text-slate-600 border-slate-200" onClick={copyToAllDays}>
                            <Calendar className="w-4 h-4 mr-2" /> Copy {selectedDay} to All
                        </Button>
                    </div>
                </div>
                
                {/* Day Tabs */}
                <div className="px-4 pt-2 bg-white">
                    <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
                        <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-6 border-b border-transparent">
                            {days.map(day => (
                                <TabsTrigger 
                                    key={day} 
                                    value={day}
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 px-2 py-3 text-slate-500 hover:text-slate-800 transition-all"
                                >
                                    {day}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
             </CardHeader>
             <CardContent className="p-0">
                 <div className="grid grid-cols-1 divide-y divide-slate-100">
                    {currentDayPlan.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No meals planned for {selectedDay}.
                        </div>
                    )}
                    {currentDayPlan.map((meal) => (
                        <div key={meal.id} className="p-4 hover:bg-slate-50/50 group transition-colors">
                            {/* Card Header-like Row */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-800">{meal.name}</span>
                                <div className="inline-flex items-center">
                                    <Clock className="w-3 h-3 mr-1.5 text-slate-400" />
                                    <Input 
                                        value={meal.time}
                                        onChange={(e) => updateMealItem(selectedDay, meal.id, "time", e.target.value)}
                                        className="h-6 w-16 text-[10px] font-mono bg-white border-slate-200 text-slate-600 px-1 text-center focus:border-indigo-500"
                                        placeholder="00:00"
                                    />
                                </div>
                            </div>
                            
                            {/* Inputs Row */}
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-6">
                                    <Input 
                                        value={meal.item}
                                        onChange={(e) => updateMealItem(selectedDay, meal.id, "item", e.target.value)} 
                                        className="h-9 bg-white border-slate-200 focus:border-indigo-500 text-sm font-medium" 
                                        placeholder="Enter meal description..."
                                    />
                                    
                                    {/* Components List (If Active) */}
                                    {meal.components && meal.components.length > 0 && (
                                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-100">
                                            {meal.components.map((comp: any) => (
                                                <div key={comp.id} className="flex gap-2 items-center">
                                                    <Input 
                                                        value={comp.name}
                                                        onChange={(e) => updateComponent(selectedDay, meal.id, comp.id, "name", e.target.value)}
                                                        className="h-7 text-xs bg-slate-50 border-slate-200 w-2/3"
                                                        placeholder="Item (e.g. Rice)"
                                                    />
                                                    <Input 
                                                        value={comp.qty}
                                                        onChange={(e) => updateComponent(selectedDay, meal.id, comp.id, "qty", e.target.value)}
                                                        className="h-7 text-xs bg-slate-50 border-slate-200 w-1/3"
                                                        placeholder="Qty"
                                                    />
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 text-slate-400 hover:text-rose-500"
                                                        onClick={() => removeComponent(selectedDay, meal.id, comp.id)}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-3">
                                    <Input 
                                        value={meal.qty}
                                        onChange={(e) => updateMealItem(selectedDay, meal.id, "qty", e.target.value)} 
                                        className="h-9 bg-white border-slate-200 text-xs text-slate-600" 
                                        placeholder="Qty (e.g., 1 bowl)"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input 
                                        value={meal.macros}
                                        onChange={(e) => updateMealItem(selectedDay, meal.id, "macros", e.target.value)} 
                                        className="h-9 bg-white border-slate-200 text-xs text-slate-500 font-mono" 
                                        placeholder="Macros"
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                                        title="Compose Meal"
                                        onClick={() => addComponentToMeal(selectedDay, meal.id)}
                                    >
                                        <ListPlus className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                        onClick={() => removeMealItem(selectedDay, meal.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <div className="p-3 bg-slate-50/50 text-center flex items-center justify-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-indigo-600 hover:bg-indigo-50"
                            onClick={() => addMealItem(selectedDay)}
                        >
                            + Add Meal Slot
                        </Button>
                        <span className="text-slate-300">|</span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-emerald-600 hover:bg-emerald-50"
                            onClick={() => setIsCustomMealOpen(true)}
                        >
                            <Sparkles className="w-3 h-3 mr-1" /> Create Custom Item
                        </Button>
                    </div>
                 </div>
             </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-slate-900">Weight Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                    <defs>
                                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                    <RechartsTooltip />
                                    <Area type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorWeight)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                         <CardTitle className="text-base font-bold text-slate-900">Inflammation Markers (hs-CRP)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                    <RechartsTooltip />
                                    <Line type="monotone" dataKey="inflammation" stroke="#ef4444" strokeWidth={2} dot={{r: 4, fill: '#ef4444'}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-900">Recent Intake History</CardTitle>
                    <Button variant="outline" size="sm" className="h-8">Export Log</Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {intakeLog.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${log.status === 'Consumed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{log.meal}</p>
                                        <p className="text-xs text-slate-500">{log.item} • {log.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {log.notes && <span className="text-xs text-slate-400 italic">"{log.notes}"</span>}
                                    <Badge variant="outline" className={`${log.status === 'Consumed' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100'}`}>
                                        {log.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        </Tabs>

            <Dialog open={isRequestLabOpen} onOpenChange={setIsRequestLabOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Request Lab Panel</DialogTitle>
                        <DialogDescription>Select biomarkers to be tested for {patient.name}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 gap-6 py-4">
                        {Object.entries(labCategories).map(([category, labs]) => (
                            <div key={category} className="space-y-3">
                                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-1">{category}</h4>
                                <div className="space-y-2">
                                    {labs.map(lab => (
                                        <div key={lab} className="flex items-center space-x-2">
                                            <input 
                                                type="checkbox" 
                                                id={`lab-${lab}`} 
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={selectedLabs.includes(lab)}
                                                onChange={() => toggleLabSelection(lab)}
                                            />
                                            <label 
                                                htmlFor={`lab-${lab}`} 
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600"
                                            >
                                                {lab}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Label>Clinical Justification / Notes</Label>
                        <Input placeholder="e.g. Monitoring insulin resistance progress..." />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsRequestLabOpen(false)}>Cancel</Button>
                        <Button onClick={() => setIsRequestLabOpen(false)} disabled={selectedLabs.length === 0}>
                            Send Request ({selectedLabs.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Custom Meal Dialog */}
            <Dialog open={isCustomMealOpen} onOpenChange={setIsCustomMealOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Custom Recipe</DialogTitle>
                    <DialogDescription>Design a specialized meal, drink, or supplement stack.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Recipe Name</Label>
                            <Input 
                                placeholder="e.g. Adrenal Mocktail" 
                                value={customMealData.name}
                                onChange={(e) => setCustomMealData({...customMealData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select onValueChange={(val) => setCustomMealData({...customMealData, type: val})}>
                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="drink">Healing Drink</SelectItem>
                                    <SelectItem value="salad">Superfood Salad</SelectItem>
                                    <SelectItem value="snack">Protein Snack</SelectItem>
                                    <SelectItem value="meal">Main Meal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Time</Label>
                            <Input 
                                type="time"
                                value={customMealData.time}
                                onChange={(e) => setCustomMealData({...customMealData, time: e.target.value})}
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input 
                                placeholder="e.g. 1 glass" 
                                value={customMealData.qty}
                                onChange={(e) => setCustomMealData({...customMealData, qty: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Ingredients & Instructions</Label>
                        <Input className="h-20" placeholder="List key ingredients..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Target Macros</Label>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Calories (e.g. 150kcal)" 
                                className="w-full" 
                                value={customMealData.macros}
                                onChange={(e) => setCustomMealData({...customMealData, macros: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCustomMealOpen(false)}>Cancel</Button>
                    <Button onClick={handleCustomMealAdd}>Add to Plan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
