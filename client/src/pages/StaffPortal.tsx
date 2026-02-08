import React, { useState } from "react";
import { 
  Users, 
  Activity, 
  Brain, 
  Dumbbell, 
  Sparkles, 
  FlaskConical, 
  CalendarCheck,
  ChevronRight,
  Search,
  Bell,
  Menu,
  Apple,
  Heart,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  TrendingUp,
  Scale,
  Dna,
  Zap,
  Leaf,
  Info,
  Plus,
  Minus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// --- MOCK DATA ---
const patients = [
  { id: 1, name: "Ananya S.", age: 29, type: "Fertility", status: "Active Cycle", avatar: "AS", mood: "Anxious", weight: 68, hb: 11.2 },
  { id: 2, name: "Meera D.", age: 34, type: "Pregnancy", status: "Week 24", avatar: "MD", mood: "Stable", weight: 72, hb: 10.5 },
  { id: 3, name: "Sarah J.", age: 31, type: "Postpartum", status: "Week 6", avatar: "SJ", mood: "Depressed", weight: 65, hb: 12.0 },
  { id: 4, name: "Priya K.", age: 28, type: "PCOS", status: "Treatment", avatar: "PK", mood: "Stable", weight: 78, hb: 11.8 },
  { id: 5, name: "Elena R.", age: 36, type: "Fertility", status: "IUI Prep", avatar: "ER", mood: "Stressed", weight: 62, hb: 12.5 },
];

const functionalMedicinePatients = [
  {
    id: 101,
    name: "Ananya S.",
    age: 29,
    condition: "PCOS (Insulin Resistant)",
    genomics: {
      mthfr: { status: "Heterozygous", risk: "Medium" },
      caffeine: { status: "Slow Metabolizer", risk: "High" },
      gluten: { status: "HLA-DQ2 Positive", risk: "High" },
      comt: { status: "Met/Met (Worrier)", risk: "Medium" }
    },
    functional: {
      gut: { status: "Dysbiosis", score: 45 },
      inflammation: { marker: "hs-CRP", value: "3.2", status: "Elevated" },
      nutrient: { deficiency: "Vitamin D, Magnesium", status: "Critical" },
      hormone: { focus: "Estrogen Dominance", status: "Imbalanced" }
    },
    plan: "Anti-inflammatory, Gluten-Free",
    nextReview: "2 days",
    clinicianNote: "Referral: Dr. Reynolds. Patient struggles with insulin resistance. Focus on fiber intake and low glycemic load."
  },
  {
    id: 102,
    name: "Priya K.",
    age: 28,
    condition: "Endometriosis Stage II",
    genomics: {
      mthfr: { status: "Normal", risk: "Low" },
      caffeine: { status: "Fast Metabolizer", risk: "Low" },
      gluten: { status: "Negative", risk: "Low" },
      estrogen: { status: "CYP1A1 Slow", risk: "High" }
    },
    functional: {
      gut: { status: "Leaky Gut", score: 60 },
      inflammation: { marker: "Homocysteine", value: "12", status: "Borderline" },
      nutrient: { deficiency: "Omega-3", status: "Moderate" },
      hormone: { focus: "Progesterone Support", status: "Low" }
    },
    plan: "Low Histamine, High Omega-3",
    nextReview: "1 week",
    clinicianNote: "Referral: Dr. Reynolds. Confirmed Endo Stage II. Avoid inflammatory foods. Prioritize omega-3s for pain management."
  },
  {
    id: 103,
    name: "Meera D.",
    age: 34,
    condition: "Gestational Diabetes Risk",
    genomics: {
      mthfr: { status: "Homozygous", risk: "High" },
      caffeine: { status: "Slow Metabolizer", risk: "High" },
      carbs: { status: "TCF7L2 Variant", risk: "High" },
      comt: { status: "Val/Val (Warrior)", risk: "Low" }
    },
    functional: {
      gut: { status: "Stable", score: 85 },
      inflammation: { marker: "Insulin", value: "18", status: "High" },
      nutrient: { deficiency: "Chromium", status: "Moderate" },
      hormone: { focus: "Insulin Sensitivity", status: "Resistant" }
    },
    plan: "Low Glycemic Index, Methylated Folate",
    nextReview: "Tomorrow",
    clinicianNote: "Referral: Dr. Reynolds. GDM risk high. Strict sugar control needed. Monitor post-prandial spikes."
  },
  {
    id: 104,
    name: "Zara M.",
    age: 31,
    condition: "Pregnancy (Trimester 2)",
    genomics: {
      mthfr: { status: "Heterozygous", risk: "Medium" },
      caffeine: { status: "Fast Metabolizer", risk: "Low" },
      gluten: { status: "Negative", risk: "Low" },
      comt: { status: "Val/Met (Balanced)", risk: "Low" }
    },
    functional: {
      gut: { status: "Good", score: 90 },
      inflammation: { marker: "hs-CRP", value: "0.8", status: "Optimal" },
      nutrient: { deficiency: "Iron", status: "Mild" },
      hormone: { focus: "Thyroid Support", status: "Stable" }
    },
    plan: "Prenatal Wellness, Iron-Rich",
    nextReview: "2 weeks",
    clinicianNote: "Routine prenatal care (Week 20). Focus on iron-rich foods and adequate protein for fetal growth. Monitor energy levels."
  }
];

const nutritionPlans = [
  { id: 1, name: "Ovulation Support", tags: ["High Protein", "Low GI"], assignedTo: 12 },
  { id: 2, name: "GDM Management", tags: ["Sugar Control", "Balanced"], assignedTo: 5 },
  { id: 3, name: "Postpartum Healing", tags: ["Galactogogues", "Iron Rich"], assignedTo: 8 },
];

const workouts = [
  { id: 1, name: "Follicular Yoga", phase: "Follicular", intensity: "Low" },
  { id: 2, name: "Luteal Strength", phase: "Luteal", intensity: "Medium" },
  { id: 3, name: "Trimester 2 Flow", phase: "Pregnancy", intensity: "Low" },
];

const labTasks = [
  { id: 1, patient: "Ananya S.", test: "Serum Progesterone", due: "Today", status: "Pending" },
  { id: 2, patient: "Meera D.", test: "OGTT (75g)", due: "Tomorrow", status: "Scheduled" },
  { id: 3, patient: "Priya K.", test: "Hormone Panel", due: "Overdue", status: "Delayed" },
];

const appointments = [
  { time: "09:00", patient: "Ananya S.", type: "Fertility Scan", doctor: "Dr. Reynolds" },
  { time: "09:30", patient: "Meera D.", type: "Antenatal Check", doctor: "Dr. Reynolds" },
  { time: "10:00", patient: "Sarah J.", type: "Postpartum Review", doctor: "Dr. Reynolds" },
  { time: "11:00", patient: "Priya K.", type: "Diet Consult", doctor: "Ms. Gupta" },
];

import { Link, useLocation } from "wouter";

export default function StaffPortal() {
  const [_, setLocation] = useLocation();
  const [activeRole, setActiveRole] = useState("nutritionist");
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard', 'patients', 'schedule', 'reports'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdjustProtocolOpen, setIsAdjustProtocolOpen] = useState(false);
  const [selectedPatientForAdjust, setSelectedPatientForAdjust] = useState<any>(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);

  const [selectedPatientForCreate, setSelectedPatientForCreate] = useState<any>(null);

  const [mealPlanItems, setMealPlanItems] = useState([
    { id: 1, time: "08:00", name: "Breakfast", item: "", qty: "", macros: "" },
    { id: 2, time: "11:00", name: "Morning Snack", item: "", qty: "", macros: "" },
    { id: 3, time: "13:00", name: "Lunch", item: "", qty: "", macros: "" },
    { id: 4, time: "16:00", name: "Afternoon Snack", item: "", qty: "", macros: "" },
    { id: 5, time: "19:30", name: "Dinner", item: "", qty: "", macros: "" }
  ]);

  const addMealItem = () => {
    const newItem = { 
        id: Date.now(), 
        time: "00:00", 
        name: "Meal/Snack", 
        item: "", 
        qty: "", 
        macros: "" 
    };
    setMealPlanItems([...mealPlanItems, newItem]);
  };

  const removeMealItem = (id: number) => {
    setMealPlanItems(mealPlanItems.filter(item => item.id !== id));
  };

  const roles = [
    { id: "nutritionist", label: "Nutritionist", icon: Apple, color: "text-emerald-600", bg: "bg-emerald-50" },
    { id: "psychologist", label: "Psychologist", icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
    { id: "trainer", label: "Physical Trainer", icon: Dumbbell, color: "text-blue-600", bg: "bg-blue-50" },
    { id: "dermatologist", label: "Dermatologist", icon: Sparkles, color: "text-rose-600", bg: "bg-rose-50" },
    { id: "phlebotomist", label: "Phlebotomist", icon: FlaskConical, color: "text-amber-600", bg: "bg-amber-50" },
    { id: "receptionist", label: "Receptionist", icon: CalendarCheck, color: "text-slate-600", bg: "bg-slate-50" },
  ];

  const currentRole = roles.find(r => r.id === activeRole);

  const handleLogin = (roleId: string) => {
    setActiveRole(roleId);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <Card className="max-w-md w-full shadow-lg border-slate-200">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-serif font-bold text-2xl mb-4">H</div>
                    <CardTitle className="text-2xl font-serif text-slate-900">HelixCare Staff Portal</CardTitle>
                    <p className="text-slate-500 text-sm">Select your role to access the care workspace.</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                        {roles.map(role => (
                            <button
                                key={role.id}
                                onClick={() => handleLogin(role.id)}
                                className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all bg-white group"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:bg-white transition-colors ${role.bg}`}>
                                    <role.icon className={`w-5 h-5 ${role.color}`} />
                                </div>
                                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{role.label}</span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar - Logged In State */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-serif font-bold">H</div>
                <span className="font-serif font-bold text-lg text-slate-800">HelixCare</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-serif font-bold mx-auto">H</div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setSidebarOpen(!sidebarOpen)}>
             <Menu className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4">
            <div className="space-y-1">
                 <Button 
                    variant={activeView === 'dashboard' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('dashboard')}
                 >
                    <Activity className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Dashboard"}
                 </Button>
                 <Button 
                    variant={activeView === 'patients' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'patients' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('patients')}
                 >
                    <Users className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "My Patients"}
                 </Button>
                 <Button 
                    variant={activeView === 'schedule' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'schedule' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('schedule')}
                 >
                    <CalendarCheck className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Schedule"}
                 </Button>
                 <Button 
                    variant={activeView === 'reports' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'reports' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('reports')}
                 >
                    <FileText className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Notes & Reports"}
                 </Button>
            </div>
        </div>

        <div className="mt-auto p-4 border-t border-slate-100">
             <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarFallback className="bg-slate-100 text-slate-600">ST</AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-900 truncate">Staff Portal</p>
                        <button onClick={() => setIsLoggedIn(false)} className="text-xs text-rose-500 hover:text-rose-700 truncate text-left block w-full">Sign Out</button>
                    </div>
                )}
             </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${currentRole?.bg}`}>
                    {currentRole && <currentRole.icon className={`w-5 h-5 ${currentRole.color}`} />}
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">{currentRole?.label} Dashboard</h1>
                    <p className="text-xs text-slate-500">Welcome back, here's your daily overview.</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input placeholder="Search patient..." className="pl-9 w-64 h-9 bg-slate-50 border-slate-200" />
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-slate-200 relative">
                    <Bell className="w-4 h-4 text-slate-500" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                </Button>
            </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6">
            
            {/* 6. SCHEDULE VIEW */}
            {activeView === 'schedule' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-900 font-serif">Staff Schedule</h2>
                        <div className="flex gap-2">
                             <Button variant="outline" className="bg-white border-slate-200">
                                <CalendarCheck className="w-4 h-4 mr-2" /> Sync Calendar
                             </Button>
                             <Button className="bg-slate-900 text-white hover:bg-slate-800">
                                <Plus className="w-4 h-4 mr-2" /> New Appointment
                             </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
                        {/* Calendar Sidebar */}
                        <Card className="col-span-3 border-slate-200 shadow-sm flex flex-col">
                            <CardHeader className="py-4 border-b border-slate-100">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-slate-800">February 2026</h3>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight className="w-4 h-4 rotate-180" /></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                                    <span className="text-slate-400">Su</span>
                                    <span className="text-slate-400">Mo</span>
                                    <span className="text-slate-400">Tu</span>
                                    <span className="text-slate-400">We</span>
                                    <span className="text-slate-400">Th</span>
                                    <span className="text-slate-400">Fr</span>
                                    <span className="text-slate-400">Sa</span>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                                    {/* Mock Calendar Grid */}
                                    {[...Array(3)].map((_, i) => <span key={`empty-${i}`} className="p-2"></span>)}
                                    {[...Array(28)].map((_, i) => (
                                        <button 
                                            key={i} 
                                            className={`p-2 rounded-full hover:bg-slate-100 ${i === 7 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-700'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Filters</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="filter-consult" defaultChecked />
                                                <label htmlFor="filter-consult" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Consultations</label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="filter-scan" defaultChecked />
                                                <label htmlFor="filter-scan" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Scans & Tests</label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="filter-team" />
                                                <label htmlFor="filter-team" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Team Meetings</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Daily Schedule */}
                        <Card className="col-span-9 border-slate-200 shadow-sm flex flex-col overflow-hidden">
                             <CardHeader className="py-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                                 <div className="flex gap-4">
                                    <span className="text-sm font-bold text-slate-900 border-b-2 border-indigo-600 pb-3 -mb-3.5">Day View</span>
                                    <span className="text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-900">Week View</span>
                                 </div>
                                 <span className="text-xs font-medium text-slate-500">Sunday, Feb 8th</span>
                             </CardHeader>
                             <ScrollArea className="flex-1 bg-white">
                                <div className="divide-y divide-slate-50">
                                    {/* 09:00 Slot */}
                                    <div className="flex h-32 group">
                                        <div className="w-20 py-4 px-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100 group-hover:bg-slate-50/50">
                                            09:00 AM
                                        </div>
                                        <div className="flex-1 p-2 relative">
                                            <div className="absolute top-2 left-2 right-2 bottom-2 bg-indigo-50 border-l-4 border-indigo-500 rounded p-3 cursor-pointer hover:shadow-sm transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-indigo-900 text-sm">Initial Fertility Assessment</p>
                                                        <p className="text-xs text-indigo-700 mt-0.5">Ananya S. • In-Person</p>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-white text-indigo-700 text-[10px] hover:bg-white">Confirmed</Badge>
                                                </div>
                                                <div className="mt-3 flex gap-2">
                                                    <Avatar className="h-6 w-6 text-[10px]">
                                                        <AvatarFallback className="bg-indigo-200 text-indigo-800">AS</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs text-indigo-600 self-center">+ Dr. Reynolds (OBGYN)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 10:00 Slot */}
                                    <div className="flex h-32 group">
                                        <div className="w-20 py-4 px-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100 group-hover:bg-slate-50/50">
                                            10:00 AM
                                        </div>
                                        <div className="flex-1 p-2 relative">
                                            <div className="absolute top-2 left-2 right-2 bottom-2 bg-emerald-50 border-l-4 border-emerald-500 rounded p-3 cursor-pointer hover:shadow-sm transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-emerald-900 text-sm">Diet Plan Review</p>
                                                        <p className="text-xs text-emerald-700 mt-0.5">Priya K. (PCOS) • Video Call</p>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-white text-emerald-700 text-[10px] hover:bg-white">Checking In</Badge>
                                                </div>
                                                 <div className="mt-3 flex gap-2">
                                                    <Avatar className="h-6 w-6 text-[10px]">
                                                        <AvatarFallback className="bg-emerald-200 text-emerald-800">PK</AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 11:00 Slot (Empty) */}
                                    <div className="flex h-20 group">
                                        <div className="w-20 py-4 px-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100 group-hover:bg-slate-50/50">
                                            11:00 AM
                                        </div>
                                        <div className="flex-1 p-2 group-hover:bg-slate-50/30 cursor-pointer border-b border-transparent group-hover:border-slate-100 flex items-center justify-center">
                                            <Button variant="ghost" size="sm" className="hidden group-hover:flex text-slate-400 text-xs h-8">
                                                <Plus className="w-3 h-3 mr-1" /> Add Slot
                                            </Button>
                                        </div>
                                    </div>

                                     {/* 12:00 Slot */}
                                    <div className="flex h-32 group">
                                        <div className="w-20 py-4 px-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100 group-hover:bg-slate-50/50">
                                            12:00 PM
                                        </div>
                                        <div className="flex-1 p-2 relative">
                                            <div className="absolute top-2 left-2 right-2 bottom-2 bg-amber-50 border-l-4 border-amber-500 rounded p-3 cursor-pointer hover:shadow-sm transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-amber-900 text-sm">Staff Case Review</p>
                                                        <p className="text-xs text-amber-700 mt-0.5">Multidisciplinary Team • Conf Room B</p>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-white text-amber-700 text-[10px] hover:bg-white">Internal</Badge>
                                                </div>
                                                <div className="mt-3 flex -space-x-2">
                                                    <Avatar className="h-6 w-6 text-[10px] border-2 border-white">
                                                        <AvatarFallback className="bg-slate-200 text-slate-700">DR</AvatarFallback>
                                                    </Avatar>
                                                    <Avatar className="h-6 w-6 text-[10px] border-2 border-white">
                                                        <AvatarFallback className="bg-slate-200 text-slate-700">ST</AvatarFallback>
                                                    </Avatar>
                                                    <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500">+3</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                             </ScrollArea>
                        </Card>
                    </div>
                </div>
            )}

            {/* 7. REPORTS & NOTES VIEW */}
            {activeView === 'reports' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 font-serif">Clinical Documentation</h2>
                            <p className="text-slate-500 text-sm mt-1">Manage progress notes, lab reports, and care summaries.</p>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" className="bg-white border-slate-200">
                                <Search className="w-4 h-4 mr-2" /> Search Archives
                             </Button>
                             <Button className="bg-slate-900 text-white hover:bg-slate-800">
                                <Plus className="w-4 h-4 mr-2" /> Create New Note
                             </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        {/* Reports Sidebar */}
                        <Card className="col-span-4 border-slate-200 shadow-sm h-[calc(100vh-12rem)] flex flex-col">
                            <CardHeader className="py-4 border-b border-slate-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input placeholder="Filter by patient or type..." className="pl-9 bg-slate-50 border-slate-200" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-y-auto">
                                <div className="divide-y divide-slate-100">
                                    {/* Note Item 1 */}
                                    <div className="p-4 hover:bg-slate-50 cursor-pointer border-l-4 border-transparent hover:border-indigo-500 transition-all bg-indigo-50/30">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-900 text-sm">Diet Plan Adjustment</span>
                                            <span className="text-[10px] text-slate-400">10:30 AM</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">Patient reported increased bloating with dairy reintroduction. Switched to lactose-free alternatives for Week 3.</p>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5 text-[8px]">
                                                <AvatarFallback className="bg-slate-200">AS</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-slate-600 font-medium">Ananya S.</span>
                                            <Badge variant="secondary" className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Progress Note</Badge>
                                        </div>
                                    </div>

                                    {/* Note Item 2 */}
                                    <div className="p-4 hover:bg-slate-50 cursor-pointer border-l-4 border-transparent hover:border-indigo-500 transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-900 text-sm">Lab Results Review</span>
                                            <span className="text-[10px] text-slate-400">Yesterday</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">Serum progesterone levels indicate ovulation occurred. Luteal phase support protocol initiated.</p>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5 text-[8px]">
                                                <AvatarFallback className="bg-slate-200">MD</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-slate-600 font-medium">Meera D.</span>
                                            <Badge variant="secondary" className="ml-auto text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-100">Lab Analysis</Badge>
                                        </div>
                                    </div>

                                    {/* Note Item 3 */}
                                    <div className="p-4 hover:bg-slate-50 cursor-pointer border-l-4 border-transparent hover:border-indigo-500 transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-900 text-sm">Postpartum Screening</span>
                                            <span className="text-[10px] text-slate-400">Feb 6</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">EPDS Score: 12. Mild anxiety symptoms noted. Referred to Dr. Cohen for follow-up.</p>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5 text-[8px]">
                                                <AvatarFallback className="bg-slate-200">SJ</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-slate-600 font-medium">Sarah J.</span>
                                            <Badge variant="secondary" className="ml-auto text-[10px] bg-rose-100 text-rose-700 hover:bg-rose-100">Screening</Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Editor Area */}
                        <Card className="col-span-8 border-slate-200 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
                            <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/30">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-slate-900">Diet Plan Adjustment</h3>
                                        <Badge variant="outline" className="text-xs text-slate-500 font-normal">Draft</Badge>
                                    </div>
                                    <p className="text-xs text-slate-500">Created by <span className="font-medium text-slate-700">You</span> • Today at 10:30 AM</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50">Delete</Button>
                                    <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">Save & Sign</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex-1 overflow-y-auto">
                                <div className="space-y-6 max-w-2xl">
                                    {/* Patient Context */}
                                    <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                                        <Avatar className="h-10 w-10 border-2 border-white">
                                            <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">AS</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900">Ananya S.</p>
                                            <p className="text-xs text-slate-500">DOB: 12/04/1995 • MRN: #883920</p>
                                        </div>
                                        <Button variant="ghost" size="sm" className="ml-auto text-xs text-blue-600 h-7">View History</Button>
                                    </div>

                                    {/* SOAP Note Structure */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">S (Subjective)</Label>
                                            <Textarea 
                                                className="min-h-[80px] bg-slate-50/50 border-slate-200 focus:bg-white transition-colors text-sm"
                                                defaultValue="Patient reports feeling significantly better energy levels. However, noted bloating 30 mins after consuming greek yogurt." 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">O (Objective)</Label>
                                            <Textarea 
                                                className="min-h-[80px] bg-slate-50/50 border-slate-200 focus:bg-white transition-colors text-sm"
                                                defaultValue="Weight: 68.2kg (-0.5kg). BP: 118/76. Food log shows 90% adherence to anti-inflammatory protocol." 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">A (Assessment)</Label>
                                            <Textarea 
                                                className="min-h-[80px] bg-slate-50/50 border-slate-200 focus:bg-white transition-colors text-sm"
                                                defaultValue="Likely lactose intolerance or casein sensitivity. Progress towards weight goal is steady." 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">P (Plan)</Label>
                                            <Textarea 
                                                className="min-h-[80px] bg-slate-50/50 border-slate-200 focus:bg-white transition-colors text-sm"
                                                defaultValue="1. Switch to coconut or almond yogurt.\n2. Continue magnesium at bedtime.\n3. Review in 2 weeks." 
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Attachments */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Attachments</Label>
                                        <div className="flex gap-3">
                                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-700">
                                                <FileText className="w-3 h-3 text-slate-400" />
                                                Updated_Meal_Plan.pdf
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 border border-dashed border-blue-200 bg-blue-50/50">
                                                + Upload File
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* 1. NUTRITIONIST VIEW */}
            {activeRole === 'nutritionist' && activeView === 'dashboard' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Alerts Banner */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-red-50 border-red-100 shadow-sm">
                            <CardContent className="p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-red-900 text-sm">Low Hb Alerts</p>
                                    <p className="text-xs text-red-700 mt-1">3 Pregnant patients flagged with Hb &lt; 10.5</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50 border-amber-100 shadow-sm">
                            <CardContent className="p-4 flex items-start gap-3">
                                <Scale className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-amber-900 text-sm">Weight Gain Warning</p>
                                    <p className="text-xs text-amber-700 mt-1">2 PCOS patients gaining &gt;2kg this month</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                            <CardContent className="p-4 flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-emerald-900 text-sm">Goal Achieved</p>
                                    <p className="text-xs text-emerald-700 mt-1">5 patients hit target BMI for IVF</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-6">
                            {/* Patient List */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-800">Assigned Patients</CardTitle>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="cursor-pointer bg-slate-50 hover:bg-slate-100">All</Badge>
                                        <Badge variant="outline" className="cursor-pointer bg-slate-50 hover:bg-slate-100">Fertility</Badge>
                                        <Badge variant="outline" className="cursor-pointer bg-slate-50 hover:bg-slate-100">PCOS</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Patient</th>
                                                <th className="px-4 py-3 font-medium">Type</th>
                                                <th className="px-4 py-3 font-medium">Weight Trend</th>
                                                <th className="px-4 py-3 font-medium">Status</th>
                                                <th className="px-4 py-3 font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {patients.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8 text-xs">
                                                                <AvatarFallback>{p.avatar}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-semibold text-slate-900">{p.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{p.type}</Badge></td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-700 font-medium">{p.weight}kg</span>
                                                            <TrendingUp className="w-3 h-3 text-red-500" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {p.hb < 11 ? (
                                                            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">Low Hb: {p.hb}</Badge>
                                                        ) : (
                                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">On Track</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Button size="sm" variant="outline" className="h-7 text-xs">View Log</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="col-span-1 space-y-6">
                            {/* Meal Plan Templates */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold text-slate-800">Diet Plan Templates</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 divide-y divide-slate-100">
                                    {nutritionPlans.map(plan => (
                                        <div key={plan.id} className="p-3 hover:bg-slate-50 cursor-pointer">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-medium text-sm text-slate-800">{plan.name}</span>
                                                <span className="text-xs text-slate-400">{plan.assignedTo} users</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {plan.tags.map(tag => (
                                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-3">
                                        <Button className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                                            + Create New Plan
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. NUTRITIONIST - MY PATIENTS VIEW (Functional & Genomics) */}
            {activeRole === 'nutritionist' && activeView === 'patients' && (
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 font-serif">Functional Nutrition Panel</h2>
                            <p className="text-slate-500 mt-1">Integrative care combining genomics, gut health, and nutrient biomarkers.</p>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" className="bg-white border-slate-200">
                                <FlaskConical className="w-4 h-4 mr-2" /> Request Lab Panel
                             </Button>
                             
                             <Link href="/staff/create-plan">
                                <Button className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" /> New Care Plan
                                </Button>
                             </Link>

                             {/* ADJUST PROTOCOL DIALOG */}
                             <Dialog open={isAdjustProtocolOpen} onOpenChange={setIsAdjustProtocolOpen}>
                                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Adjust Active Protocol</DialogTitle>
                                        <DialogDescription>
                                            Modify the current intervention plan for {selectedPatientForAdjust?.name}.
                                        </DialogDescription>
                                    </DialogHeader>
                                    
                                    {selectedPatientForAdjust && (
                                        <div className="grid gap-6 py-4">
                                            
                                            {/* 1. Patient Context (Read Only) */}
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Avatar className="h-8 w-8 text-xs">
                                                            <AvatarFallback>{selectedPatientForAdjust.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-sm">{selectedPatientForAdjust.name}</p>
                                                            <p className="text-xs text-slate-500">{selectedPatientForAdjust.condition}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                     <p className="text-[10px] font-bold text-slate-500 uppercase">Current Goal</p>
                                                     <p className="font-bold text-emerald-700 text-sm">{selectedPatientForAdjust.functional.hormone.focus}</p>
                                                </div>
                                            </div>

                                            {/* Clinician Instructions (Dynamic) */}
                                            {selectedPatientForAdjust.clinicianNote && (
                                                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 items-start">
                                                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-bold text-blue-800 uppercase mb-0.5">Clinician Instruction</p>
                                                        <p className="text-sm text-blue-700 leading-snug">{selectedPatientForAdjust.clinicianNote}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 2. Goal Adjustment */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Adjust Primary Goal</Label>
                                                    <Select defaultValue="inflammation">
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="inflammation">Reduce Inflammation (hs-CRP)</SelectItem>
                                                            <SelectItem value="fertility">Boost Egg Quality</SelectItem>
                                                            <SelectItem value="gut">Gut Repair (4R Protocol)</SelectItem>
                                                            <SelectItem value="bloodsugar">Insulin Sensitivity</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Dietary Phase</Label>
                                                    <Select defaultValue="elimination">
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="elimination">Elimination Phase (Strict)</SelectItem>
                                                            <SelectItem value="reintroduction">Reintroduction Phase</SelectItem>
                                                            <SelectItem value="maintenance">Maintenance & Diversity</SelectItem>
                                                            <SelectItem value="keto">Therapeutic Ketogenic</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* 3. Genomic Modifiers (Preserved) */}
                                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Dna className="w-4 h-4 text-purple-600" />
                                                    <h4 className="text-sm font-bold text-purple-900">Genomic Adjustments (Active)</h4>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="flex items-start space-x-2">
                                                        <Checkbox id="adj-mthfr" defaultChecked={selectedPatientForAdjust.genomics.mthfr.risk === 'Medium' || selectedPatientForAdjust.genomics.mthfr.risk === 'High'} />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <label htmlFor="adj-mthfr" className="text-xs font-medium text-slate-700 cursor-pointer">Methylation Support</label>
                                                            <p className="text-[10px] text-slate-500">MTHFR Status: {selectedPatientForAdjust.genomics.mthfr.status}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start space-x-2">
                                                        <Checkbox id="adj-caffeine" defaultChecked={selectedPatientForAdjust.genomics.caffeine.risk === 'High'} />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <label htmlFor="adj-caffeine" className="text-xs font-medium text-slate-700 cursor-pointer">Caffeine Protocol</label>
                                                            <p className="text-[10px] text-slate-500">{selectedPatientForAdjust.genomics.caffeine.status}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start space-x-2">
                                                        <Checkbox id="adj-gluten" defaultChecked={selectedPatientForAdjust.genomics.gluten?.risk === 'High'} />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <label htmlFor="adj-gluten" className="text-xs font-medium text-slate-700 cursor-pointer">Gluten Elimination</label>
                                                            <p className="text-[10px] text-slate-500">Risk: {selectedPatientForAdjust.genomics.gluten?.risk || 'Low'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 4. Daily Schedule (Wake/Sleep) */}
                                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500 uppercase">Wake Up Time</Label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                        <Input type="time" className="pl-9 bg-white" defaultValue="07:00" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500 uppercase">Bedtime</Label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                        <Input type="time" className="pl-9 bg-white" defaultValue="22:30" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 5. Structured Meal Plan (Time-Based) */}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <Label>Daily Meal Structure</Label>
                                                    <div className="flex gap-2">
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 cursor-pointer">Training Day</Badge>
                                                        <Badge variant="outline" className="text-slate-500 cursor-pointer hover:bg-slate-50">Rest Day</Badge>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                                                    {mealPlanItems.map((meal, index) => (
                                                        <div key={meal.id} className={`space-y-2 ${index !== 0 ? 'pt-2 border-t border-slate-200' : ''}`}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${index % 3 === 0 ? 'bg-amber-400' : index % 3 === 1 ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                                                                <Input 
                                                                    defaultValue={meal.name} 
                                                                    className="h-6 w-32 text-xs font-bold text-slate-800 border-none bg-transparent p-0 focus-visible:ring-0" 
                                                                />
                                                                <div className="relative ml-auto">
                                                                    <Clock className="absolute left-2 top-1.5 h-3 w-3 text-slate-400" />
                                                                    <Input 
                                                                        type="time" 
                                                                        defaultValue={meal.time} 
                                                                        className="h-6 w-24 text-xs bg-white pl-6 border-slate-200" 
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-12 gap-2">
                                                                <div className="col-span-5">
                                                                    <Input placeholder="E.g., Oatmeal with Berries" className="h-8 text-xs bg-white" defaultValue={meal.item} />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <Input placeholder="Qty" className="h-8 text-xs bg-white" defaultValue={meal.qty} />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <Input placeholder="Macros" className="h-8 text-xs bg-white" defaultValue={meal.macros} />
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                                        onClick={() => removeMealItem(meal.id)}
                                                                    >
                                                                        <Minus className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="w-full text-xs border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                                        onClick={addMealItem}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> Add Meal Time
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* 6. Supplement Stack */}
                                            <div className="space-y-3">
                                                <Label>Active Supplements</Label>
                                                <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                                                    <div className="p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Checkbox id="supp1" defaultChecked />
                                                            <div>
                                                                <p className="text-sm font-medium">Magnesium Glycinate</p>
                                                                <p className="text-xs text-slate-500">400mg • Bedtime</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400">Edit</Button>
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-rose-500">Stop</Button>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Checkbox id="supp2" defaultChecked />
                                                            <div>
                                                                <p className="text-sm font-medium">Omega-3 (EPA/DHA)</p>
                                                                <p className="text-xs text-slate-500">2g • With Lunch</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400">Edit</Button>
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-rose-500">Stop</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" className="w-full text-xs bg-slate-50 hover:bg-slate-100 border-dashed border-slate-300 text-slate-500">
                                                    + Add New Supplement
                                                </Button>
                                            </div>

                                            {/* Notes */}
                                            <div className="space-y-2">
                                                <Label>Clinical Adjustment Note</Label>
                                                <Textarea placeholder="Reason for adjustment (e.g. reported bloating, improved symptoms)..." />
                                            </div>

                                        </div>
                                    )}

                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsAdjustProtocolOpen(false)}>Cancel</Button>
                                        <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setIsAdjustProtocolOpen(false)}>Save Changes</Button>
                                    </DialogFooter>
                                </DialogContent>
                             </Dialog>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 pb-2">
                        <Badge variant="secondary" className="px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 cursor-pointer">All Patients</Badge>
                        <Badge variant="outline" className="px-3 py-1 bg-white hover:bg-slate-50 cursor-pointer">PCOS</Badge>
                        <Badge variant="outline" className="px-3 py-1 bg-white hover:bg-slate-50 cursor-pointer">Endometriosis</Badge>
                        <Badge variant="outline" className="px-3 py-1 bg-white hover:bg-slate-50 cursor-pointer">Fertility Prep</Badge>
                        <Badge variant="outline" className="px-3 py-1 bg-white hover:bg-slate-50 cursor-pointer">GDM Risk</Badge>
                    </div>

                    <div className="grid gap-6">
                        {functionalMedicinePatients.map(patient => (
                            <Card key={patient.id} className="shadow-sm border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="grid grid-cols-12 divide-x divide-slate-100">
                                    
                                    {/* Patient Info */}
                                    <div className="col-span-3 p-5 bg-slate-50/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{patient.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{patient.name}</h3>
                                                <p className="text-xs text-slate-500">{patient.age}y • {patient.condition}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Dietary Plan</span>
                                                <span className="font-medium text-slate-700">{patient.plan}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Next Review</span>
                                                <span className="font-medium text-blue-600">{patient.nextReview}</span>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" className="w-full mt-4 text-xs bg-white">Full Profile</Button>
                                    </div>

                                    {/* Genomics Column */}
                                    <div className="col-span-3 p-5">
                                        <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Dna className="w-4 h-4" /> Genomic Insight
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center bg-purple-50 p-2 rounded border border-purple-100">
                                                <div>
                                                    <p className="text-[10px] font-bold text-purple-900">MTHFR</p>
                                                    <p className="text-[10px] text-purple-700">{patient.genomics.mthfr.status}</p>
                                                </div>
                                                <Badge className={`${patient.genomics.mthfr.risk === 'High' ? 'bg-rose-500' : patient.genomics.mthfr.risk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'} h-1.5 w-1.5 p-0 rounded-full`}></Badge>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-700">Caffeine Metabolism</p>
                                                    <p className="text-[10px] text-slate-500">{patient.genomics.caffeine.status}</p>
                                                </div>
                                                <Badge className={`${patient.genomics.caffeine.risk === 'High' ? 'bg-rose-500' : 'bg-emerald-500'} h-1.5 w-1.5 p-0 rounded-full`}></Badge>
                                            </div>
                                            {(patient.genomics.gluten || patient.genomics.carbs) && (
                                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-700">{patient.genomics.gluten ? 'Gluten Sensitivity' : 'Carb Sensitivity'}</p>
                                                        <p className="text-[10px] text-slate-500">{patient.genomics.gluten ? patient.genomics.gluten.status : patient.genomics.carbs?.status}</p>
                                                    </div>
                                                    <Badge className={`${(patient.genomics.gluten?.risk === 'High' || patient.genomics.carbs?.risk === 'High') ? 'bg-rose-500' : 'bg-emerald-500'} h-1.5 w-1.5 p-0 rounded-full`}></Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Functional Markers Column */}
                                    <div className="col-span-3 p-5">
                                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <FlaskConical className="w-4 h-4" /> Functional Markers
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-600">Gut Microbiome</span>
                                                    <span className={`font-bold ${patient.functional.gut.score < 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{patient.functional.gut.status}</span>
                                                </div>
                                                <Progress value={patient.functional.gut.score} className="h-1.5 bg-slate-100" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-600">Inflammation ({patient.functional.inflammation.marker})</span>
                                                    <span className="font-bold text-amber-600">{patient.functional.inflammation.value}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-500 w-3/4 rounded-full"></div>
                                                    </div>
                                                    <span className="text-[10px] text-amber-600 font-medium">{patient.functional.inflammation.status}</span>
                                                </div>
                                            </div>
                                            <div className="bg-rose-50 p-2 rounded border border-rose-100 flex items-start gap-2">
                                                <AlertCircle className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-rose-800">Deficiencies</p>
                                                    <p className="text-[10px] text-rose-600">{patient.functional.nutrient.deficiency}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Plan Column */}
                                    <div className="col-span-3 p-5 bg-slate-50/30">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-amber-500" /> Intervention
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                                                <p className="text-xs text-slate-600">Supplement Protocol <span className="text-slate-400 text-[10px]">(Active)</span></p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                                                <p className="text-xs text-slate-600">Elimination Diet <span className="text-slate-400 text-[10px]">(Week 2)</span></p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Primary Focus</p>
                                                <p className="text-sm font-medium text-slate-800">{patient.functional.hormone.focus}</p>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                className="w-full bg-slate-900 text-white hover:bg-slate-800 h-8 text-xs mt-2"
                                                onClick={() => setLocation(`/staff/protocol/${patient.id}`)}
                                            >
                                                Adjust Protocol
                                            </Button>
                                        </div>
                                    </div>

                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. PSYCHOLOGIST VIEW */}
            {activeRole === 'psychologist' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        <Card className="shadow-sm border-slate-200 col-span-1">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">High Stress Alerts</p>
                                <p className="text-2xl font-bold text-slate-900">4</p>
                                <p className="text-xs text-rose-600 mt-1">Requires immediate contact</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200 col-span-1">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Avg EPDS Score</p>
                                <p className="text-2xl font-bold text-slate-900">8.2</p>
                                <p className="text-xs text-emerald-600 mt-1">Improved by 1.2 pts</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200 col-span-1">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Sessions Today</p>
                                <p className="text-2xl font-bold text-slate-900">6</p>
                                <p className="text-xs text-slate-500 mt-1">2 Couples / 4 Individual</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-4 border-b border-slate-100">
                             <CardTitle className="text-base font-bold text-slate-800">Patient Monitoring</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                             <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Patient</th>
                                        <th className="px-4 py-3 font-medium">Stage</th>
                                        <th className="px-4 py-3 font-medium">Current Mood</th>
                                        <th className="px-4 py-3 font-medium">Clinical Flags</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {patients.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                                            <td className="px-4 py-3 text-slate-500">{p.status}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={`
                                                    ${p.mood === 'Anxious' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                                    ${p.mood === 'Depressed' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                                                    ${p.mood === 'Stable' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                                    ${p.mood === 'Stressed' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                                                `}>
                                                    {p.mood}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {p.type === 'Fertility' && p.mood !== 'Stable' && "Failed Cycle x2"}
                                                {p.type === 'Postpartum' && "Sleep Deprived"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600">Log Note</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 3. PHYSICAL TRAINER VIEW */}
            {activeRole === 'trainer' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                         <Card className="shadow-sm border-slate-200">
                            <CardHeader className="py-3 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold text-slate-800">Workout Plans</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {workouts.map(w => (
                                    <div key={w.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-blue-200 transition-colors cursor-pointer bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Activity className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900">{w.name}</p>
                                                <p className="text-xs text-slate-500">{w.phase} Phase • {w.intensity} Intensity</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    </div>
                                ))}
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    Create New Plan
                                </Button>
                            </CardContent>
                         </Card>

                         <Card className="shadow-sm border-slate-200">
                            <CardHeader className="py-3 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold text-slate-800">Activity Alerts</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    <div className="p-4 flex gap-3">
                                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0"></div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Sudden Activity Drop</p>
                                            <p className="text-xs text-slate-500">Meera D. (Pregnancy) has 0 activity mins for 3 days.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 flex gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Weight Plateau</p>
                                            <p className="text-xs text-slate-500">Priya K. (PCOS) weight stable for 4 weeks despite plan.</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                         </Card>
                    </div>
                </div>
            )}

            {/* 4. DERMATOLOGIST VIEW */}
            {activeRole === 'dermatologist' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-3 gap-6">
                         {patients.filter(p => p.type === 'PCOS' || p.type === 'Pregnancy').map(p => (
                             <Card key={p.id} className="shadow-sm border-slate-200">
                                 <CardHeader className="pb-2">
                                     <div className="flex justify-between items-start">
                                         <div className="flex items-center gap-3">
                                             <Avatar>
                                                 <AvatarFallback>{p.avatar}</AvatarFallback>
                                             </Avatar>
                                             <div>
                                                 <CardTitle className="text-sm font-bold text-slate-900">{p.name}</CardTitle>
                                                 <p className="text-xs text-slate-500">{p.type} • {p.status}</p>
                                             </div>
                                         </div>
                                     </div>
                                 </CardHeader>
                                 <CardContent className="space-y-3 pt-2">
                                     <div className="grid grid-cols-2 gap-2 text-center">
                                         <div className="bg-slate-50 p-2 rounded">
                                             <p className="text-[10px] text-slate-500 uppercase">Acne Score</p>
                                             <p className="font-bold text-slate-800">3/5</p>
                                         </div>
                                         <div className="bg-slate-50 p-2 rounded">
                                             <p className="text-[10px] text-slate-500 uppercase">Hair Fall</p>
                                             <p className="font-bold text-slate-800">Mild</p>
                                         </div>
                                     </div>
                                     <div className="flex gap-2">
                                         <Button size="sm" variant="outline" className="w-full text-xs">Update Score</Button>
                                         <Button size="sm" className="w-full text-xs bg-rose-600 hover:bg-rose-700">Prescribe</Button>
                                     </div>
                                 </CardContent>
                             </Card>
                         ))}
                    </div>
                </div>
            )}

            {/* 5. PHLEBOTOMIST VIEW */}
            {activeRole === 'phlebotomist' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold text-slate-800">Investigation Queue</CardTitle>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs">
                                <FlaskConical className="w-3.5 h-3.5 mr-1.5" /> Log New Collection
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Patient</th>
                                        <th className="px-6 py-3 font-medium">Test Name</th>
                                        <th className="px-6 py-3 font-medium">Due</th>
                                        <th className="px-6 py-3 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {labTasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={`
                                                    ${task.status === 'Pending' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                                    ${task.status === 'Scheduled' ? 'bg-slate-100 text-slate-700 border-slate-200' : ''}
                                                    ${task.status === 'Delayed' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                                                `}>
                                                    {task.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-900">{task.patient}</td>
                                            <td className="px-6 py-4 text-slate-600">{task.test}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {task.due}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {task.status === 'Pending' && (
                                                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Collect Sample</Button>
                                                )}
                                                {task.status === 'Delayed' && (
                                                    <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 bg-rose-50">Send Reminder</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 6. RECEPTIONIST VIEW */}
            {activeRole === 'receptionist' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Today's Visits</p>
                                <p className="text-2xl font-bold text-slate-900">24</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Checked In</p>
                                <p className="text-2xl font-bold text-emerald-600">8</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">No Shows</p>
                                <p className="text-2xl font-bold text-rose-600">1</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Pending Pay</p>
                                <p className="text-2xl font-bold text-amber-600">3</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-4 border-b border-slate-100 flex justify-between items-center">
                            <CardTitle className="text-base font-bold text-slate-800">Appointment Flow</CardTitle>
                            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 text-xs">
                                + New Booking
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                             <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Time</th>
                                        <th className="px-4 py-3 font-medium">Patient</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
                                        <th className="px-4 py-3 font-medium">Doctor/Staff</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {appointments.map((apt, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-medium text-slate-500">{apt.time}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-900">{apt.patient}</td>
                                            <td className="px-4 py-3 text-slate-600">{apt.type}</td>
                                            <td className="px-4 py-3 text-slate-500">{apt.doctor}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Scheduled</Badge>
                                            </td>
                                            <td className="px-4 py-3 flex gap-2">
                                                <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Check In</Button>
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-rose-600">Cancel</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </CardContent>
                    </Card>
                </div>
            )}

        </div>
      </main>
    </div>
  );
}
