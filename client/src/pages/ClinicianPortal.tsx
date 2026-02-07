import React, { useState, useEffect } from "react";
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
  Briefcase
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

// Mock Data
const patients = [
  { id: 1, name: "Ananya S.", age: 29, status: "High Risk", focus: "Natural Conception", lastVisit: "2 days ago", cycleDay: 14, avatar: "AS", mode: "natural_conception", referredBy: "Dr. Sharma (GP)", referredTo: "Nutritionist" },
  { id: 2, name: "Meera D.", age: 34, status: "Monitor", focus: "Pregnancy Wk 24", lastVisit: "1 week ago", cycleDay: null, avatar: "MD", mode: "pregnancy", referredBy: "Self", referredTo: "Fetal Medicine" },
  { id: 3, name: "Sarah J.", age: 31, status: "Stable", focus: "Postpartum Wk 6", lastVisit: "3 weeks ago", cycleDay: null, avatar: "SJ", mode: "postpartum", referredBy: "Dr. Khan (OBGYN)", referredTo: "Psychologist" },
  { id: 4, name: "Elena R.", age: 36, status: "Active Cycle", focus: "IUI Cycle #2", lastVisit: "Yesterday", cycleDay: 11, avatar: "ER", mode: "iui", referredBy: "Dr. Patel (Endo)", referredTo: "-" },
  { id: 5, name: "Priya K.", age: 28, status: "Assessment", focus: "PCOS Mgmt", lastVisit: "Today", cycleDay: 21, avatar: "PK", mode: "hormone_care", referredBy: "Dr. Lee (Derm)", referredTo: "Dietitian" },
];

const hormoneData = [
  { day: 1, estrogen: 20, progesterone: 5, symptoms: 2 },
  { day: 5, estrogen: 30, progesterone: 5, symptoms: 1 },
  { day: 10, estrogen: 60, progesterone: 6, symptoms: 3 },
  { day: 14, estrogen: 90, progesterone: 8, symptoms: 2 },
  { day: 16, estrogen: 50, progesterone: 20, symptoms: 5 },
  { day: 20, estrogen: 40, progesterone: 60, symptoms: 7 }, 
  { day: 25, estrogen: 30, progesterone: 40, symptoms: 8 },
  { day: 28, estrogen: 25, progesterone: 10, symptoms: 4 },
];

const pregnancyData = [
  { week: 12, weight: 60, expected: 61, systolic: 110, diastolic: 70 },
  { week: 16, weight: 62, expected: 63, systolic: 112, diastolic: 72 },
  { week: 20, weight: 65, expected: 65, systolic: 115, diastolic: 74 },
  { week: 24, weight: 68, expected: 68, systolic: 122, diastolic: 82 }, // Spike
  { week: 28, weight: 71, expected: 71, systolic: 120, diastolic: 80 }, 
  { week: 32, weight: 74, expected: 74, systolic: 122, diastolic: 81 },
];

const follicleData = [
  { day: 3, left: 5, right: 4, endometrium: 4 },
  { day: 7, left: 8, right: 6, endometrium: 5.5 },
  { day: 10, left: 14, right: 9, endometrium: 7.2 },
  { day: 12, left: 18, right: 11, endometrium: 9.1 }, // Trigger ready
];

const usgData = [
  { week: 12, hc: 60, ac: 55, fl: 8 },
  { week: 16, hc: 110, ac: 100, fl: 20 },
  { week: 20, hc: 180, ac: 160, fl: 32 },
  { week: 24, hc: 220, ac: 200, fl: 43 },
  { week: 28, hc: 260, ac: 240, fl: 52 },
];

export default function ClinicianPortal() {
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' or 'patient_detail'
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);
  const [careMode, setCareMode] = useState("natural_conception"); 
  const [showDocumentation, setShowDocumentation] = useState(false);

  // Sync care mode when patient changes
  useEffect(() => {
     setCareMode(selectedPatient.mode);
  }, [selectedPatient]);

  // Set the theme attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'clinician');
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  const navigateToPatient = (patient: typeof patients[0]) => {
    setSelectedPatient(patient);
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
          <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50">
            <Activity className="mr-3 h-4 w-4" /> Analytics
          </Button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
             <Avatar className="h-9 w-9 border border-slate-600">
                <AvatarFallback className="bg-slate-700 text-slate-300">DR</AvatarFallback>
             </Avatar>
             <div className="text-sm">
                <p className="text-white font-medium">Dr. Reynolds</p>
                <p className="text-xs text-slate-500">Reproductive Endo</p>
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
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Today's Appointments</p>
                            <p className="text-xl font-bold text-slate-900">18</p>
                         </div>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Dna className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Fertility Active</p>
                            <p className="text-xl font-bold text-slate-900">9</p>
                         </div>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-pink-50 rounded-lg text-pink-600"><Baby className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pregnancy Follow-ups</p>
                            <p className="text-xl font-bold text-slate-900">6</p>
                         </div>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><FileText className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Referrals In/Out</p>
                            <p className="text-xl font-bold text-slate-900">4 <span className="text-sm text-slate-400 font-normal">/ 2</span></p>
                         </div>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><AlertTriangle className="w-5 h-5" /></div>
                         <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">High Risk Alerts</p>
                            <p className="text-xl font-bold text-slate-900">2</p>
                         </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">Wednesday, Oct 24</p>
                      <p className="text-xs text-slate-500">Clinic Hours: 09:00 - 17:00</p>
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
                           {/* Priority Card 1 - Fertility */}
                           <Card className="border-l-4 border-l-rose-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToPatient(patients[0])}>
                              <CardContent className="p-4">
                                 <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                       <Avatar className="h-8 w-8 text-xs border border-rose-100 bg-rose-50 text-rose-700">
                                          <AvatarFallback>AS</AvatarFallback>
                                       </Avatar>
                                       <div>
                                          <p className="font-bold text-sm text-slate-900">Ananya S.</p>
                                          <p className="text-[10px] text-slate-500">TTC 6 mo</p>
                                       </div>
                                    </div>
                                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none text-[10px]">Action</Badge>
                                 </div>
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                                       <Microscope className="w-3 h-3 text-purple-500" /> Follicle Ready (20mm)
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-rose-600 font-medium">
                                       <Syringe className="w-3 h-3" /> Trigger Due Today
                                    </div>
                                 </div>
                              </CardContent>
                           </Card>

                           {/* Priority Card 2 - Pregnancy */}
                           <Card className="border-l-4 border-l-amber-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToPatient(patients[1])}>
                              <CardContent className="p-4">
                                 <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                       <Avatar className="h-8 w-8 text-xs border border-amber-100 bg-amber-50 text-amber-700">
                                          <AvatarFallback>MD</AvatarFallback>
                                       </Avatar>
                                       <div>
                                          <p className="font-bold text-sm text-slate-900">Meera D.</p>
                                          <p className="text-[10px] text-slate-500">Pregnancy 24w</p>
                                       </div>
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none text-[10px]">Review</Badge>
                                 </div>
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                                       <FlaskConical className="w-3 h-3 text-slate-500" /> OGTT Pending
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                                       <Scale className="w-3 h-3" /> Weight gain high
                                    </div>
                                 </div>
                              </CardContent>
                           </Card>

                           {/* Priority Card 3 - Postpartum */}
                           <Card className="border-l-4 border-l-amber-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToPatient(patients[2])}>
                              <CardContent className="p-4">
                                 <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                       <Avatar className="h-8 w-8 text-xs border border-slate-100 bg-slate-50 text-slate-600">
                                          <AvatarFallback>SJ</AvatarFallback>
                                       </Avatar>
                                       <div>
                                          <p className="font-bold text-sm text-slate-900">Sarah J.</p>
                                          <p className="text-[10px] text-slate-500">Postpartum 6w</p>
                                       </div>
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none text-[10px]">Alert</Badge>
                                 </div>
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-rose-600 font-medium">
                                       <Brain className="w-3 h-3" /> EPDS Score High
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                       <MessageSquare className="w-3 h-3" /> Psych Consult Needed
                                    </div>
                                 </div>
                              </CardContent>
                           </Card>
                        </div>
                     </div>

                     {/* SECTION 2 - TODAY'S PATIENT FLOW */}
                     <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                           <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <CalendarCheck className="w-4 h-4 text-blue-600" /> Today's Patient Flow
                           </CardTitle>
                           <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500">View Full Schedule</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                           <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-100">
                                 <tr>
                                    <th className="px-4 py-3 font-medium w-20">Time</th>
                                    <th className="px-4 py-3 font-medium">Patient</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Stage</th>
                                    <th className="px-4 py-3 font-medium">Clinical Flag</th>
                                    <th className="px-4 py-3 font-medium w-10"></th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => navigateToPatient(patients[0])}>
                                    <td className="px-4 py-3 text-slate-500 font-medium">09:00</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900">Ananya S.</td>
                                    <td className="px-4 py-3"><Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">Fertility</Badge></td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">Day 12 Scan</td>
                                    <td className="px-4 py-3 flex items-center gap-2 text-xs font-medium text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ovulation Window</td>
                                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                                 </tr>
                                 <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => navigateToPatient(patients[1])}>
                                    <td className="px-4 py-3 text-slate-500 font-medium">09:30</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900">Meera D.</td>
                                    <td className="px-4 py-3"><Badge variant="outline" className="border-pink-200 text-pink-700 bg-pink-50">Pregnancy</Badge></td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">Week 24</td>
                                    <td className="px-4 py-3 flex items-center gap-2 text-xs font-medium text-amber-600"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Routine Follow-up</td>
                                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                                 </tr>
                                 <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => navigateToPatient(patients[2])}>
                                    <td className="px-4 py-3 text-slate-500 font-medium">10:00</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900">Sarah J.</td>
                                    <td className="px-4 py-3"><Badge variant="outline" className="border-slate-200 text-slate-700 bg-slate-50">Postpartum</Badge></td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">Week 6</td>
                                    <td className="px-4 py-3 flex items-center gap-2 text-xs font-medium text-amber-600"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Mood Check</td>
                                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                                 </tr>
                                 <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => navigateToPatient(patients[3])}>
                                    <td className="px-4 py-3 text-slate-500 font-medium">10:30</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900">Elena R.</td>
                                    <td className="px-4 py-3"><Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">IUI Cycle</Badge></td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">CD 11</td>
                                    <td className="px-4 py-3 flex items-center gap-2 text-xs font-medium text-blue-600"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Trigger Ready</td>
                                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                                 </tr>
                              </tbody>
                           </table>
                        </CardContent>
                     </Card>

                     {/* SECTION 7 - CLINIC INSIGHTS (Bottom Panel) */}
                     <div className="grid grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-none shadow-md">
                           <CardContent className="p-4">
                              <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-bold mb-1">Pregnancies (This Month)</p>
                              <div className="flex items-end justify-between">
                                 <p className="text-3xl font-bold">5</p>
                                 <TrendingUp className="w-4 h-4 text-indigo-300 mb-1" />
                              </div>
                           </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                           <CardContent className="p-4">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Cycle Success Rate</p>
                              <div className="flex items-end justify-between">
                                 <p className="text-2xl font-bold text-slate-800">24%</p>
                                 <span className="text-xs text-emerald-600 font-medium">+2% vs last mo</span>
                              </div>
                           </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                           <CardContent className="p-4">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">PCOS Symptom Trend</p>
                              <div className="flex items-end justify-between">
                                 <p className="text-2xl font-bold text-slate-800">High</p>
                                 <span className="text-xs text-emerald-600 font-medium">Improvement ↑</span>
                              </div>
                           </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                           <CardContent className="p-4">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Postpartum Recovery</p>
                              <div className="flex items-end justify-between">
                                 <p className="text-2xl font-bold text-slate-800">8.2<span className="text-sm text-slate-400 font-normal">/10</span></p>
                                 <Activity className="w-4 h-4 text-slate-400 mb-1" />
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
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Ovulation Window</span>
                                 <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">3 Active</Badge>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">IUIs Planned</span>
                                 <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none">2 This Week</Badge>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Low Probability</span>
                                 <Badge variant="outline" className="text-slate-500">2 Optimize</Badge>
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
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">High BP Alerts</span>
                                 <div className="flex items-center gap-1 text-xs font-bold text-rose-600"><AlertCircle className="w-3 h-3" /> 1</div>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Low Hb Cases</span>
                                 <div className="flex items-center gap-1 text-xs font-bold text-amber-600">2</div>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Scans Due</span>
                                 <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">4 This Week</Badge>
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
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Depression Risk</span>
                                 <div className="flex items-center gap-1 text-xs font-bold text-rose-600"><Brain className="w-3 h-3" /> 1 High</div>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Lactation Issues</span>
                                 <Badge variant="outline" className="text-slate-500">2 Logged</Badge>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <span className="text-xs font-medium text-slate-600">Contraception</span>
                                 <Badge className="bg-slate-100 text-slate-700 border-none">3 Due</Badge>
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
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <div>
                                    <p className="text-xs font-medium text-slate-800">Ananya S.</p>
                                    <p className="text-[10px] text-slate-500">Follicular Study (Day 12)</p>
                                 </div>
                                 <Badge variant="outline" className="text-slate-500 border-slate-200">Scheduled</Badge>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <div>
                                    <p className="text-xs font-medium text-slate-800">Meera D.</p>
                                    <p className="text-[10px] text-slate-500">Anomaly Scan (Week 20)</p>
                                 </div>
                                 <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Completed</Badge>
                              </div>
                              <div className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                 <div>
                                    <p className="text-xs font-medium text-slate-800">Elena R.</p>
                                    <p className="text-[10px] text-slate-500">Early Pregnancy Scan</p>
                                 </div>
                                 <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                              </div>
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
                              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-purple-700">P</div>
                              <div>
                                 <p className="text-xs font-medium text-slate-800">Psychologist Notes</p>
                                 <p className="text-[10px] text-slate-500">2 new entries added today</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-emerald-700">N</div>
                              <div>
                                 <p className="text-xs font-medium text-slate-800">Nutrition Plans</p>
                                 <p className="text-[10px] text-slate-500">3 updated by Dietitian</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-rose-700">L</div>
                              <div>
                                 <p className="text-xs font-medium text-slate-800">Lab Results</p>
                                 <p className="text-[10px] text-slate-500">6 reports uploaded</p>
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
                       <div className="flex bg-slate-100 p-1 rounded-lg">
                          <Button variant="ghost" size="sm" className="h-7 text-xs bg-white text-slate-900 shadow-sm">Month</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-900">Week</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-900">Day</Button>
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
                    
                    <div className="grid grid-cols-5 gap-3">
                       {/* Pediatrician */}
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group">
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
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group">
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
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group">
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
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group">
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
                       <Card className="border-slate-200 shadow-sm bg-white hover:border-purple-200 transition-colors cursor-pointer group">
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
                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                       {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                             {day}
                          </div>
                       ))}
                    </div>
                    
                    {/* Calendar Cells */}
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-slate-100 divide-y">
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
                             
                             {/* Mock Events */}
                             <div className="space-y-1">
                                {day === 2 && (
                                   <div className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 truncate font-medium">
                                      09:00 AM • IUI Proc
                                   </div>
                                )}
                                {day === 8 && (
                                   <div className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 truncate font-medium">
                                      11:30 AM • Conf
                                   </div>
                                )}
                                {day === 12 && (
                                   <div className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 truncate font-medium">
                                      On-Call Shift
                                   </div>
                                )}
                                {day === 24 && (
                                   <>
                                      <div className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 truncate font-medium flex items-center gap-1">
                                         <div className="w-1 h-1 rounded-full bg-blue-500"></div> 9:00 • Ananya S.
                                      </div>
                                      <div className="text-[10px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 border border-pink-200 truncate font-medium flex items-center gap-1">
                                         <div className="w-1 h-1 rounded-full bg-pink-500"></div> 9:30 • Meera D.
                                      </div>
                                      <div className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 truncate font-medium opacity-70">
                                         +4 more...
                                      </div>
                                   </>
                                )}
                                {day === 25 && (
                                   <div className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 truncate font-medium flex items-center gap-1">
                                      <div className="w-1 h-1 rounded-full bg-blue-500"></div> 10:00 • Priya K.
                                   </div>
                                )}
                                {day === 28 && (
                                   <div className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 truncate font-medium">
                                      Dept Meeting
                                   </div>
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
                 </Card>
              </div>
           </div>
        )}

        {/* PATIENT DETAIL VIEW (Previous Implementation) */}
        {activeView === 'patient_detail' && (
          <div className="flex-1 flex flex-col overflow-hidden z-0 relative">
            {/* Background for Detail View */}
            <div 
              className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: `url(${medicalDashboardBg})`, backgroundSize: 'cover' }}
            />
          
            {/* 1. STICKY PATIENT CONTEXT HEADER */}
            <header className="h-18 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative w-full">
              <div className="flex items-center gap-6">
                 <Button variant="ghost" size="icon" className="mr-2" onClick={() => setActiveView('dashboard')}>
                    <LayoutDashboard className="w-5 h-5 text-slate-500" />
                 </Button>
                 <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-slate-200 bg-slate-100 text-slate-600">
                       <AvatarFallback>{selectedPatient.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                       <h2 className="text-lg font-bold text-slate-900 leading-none">{selectedPatient.name}</h2>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">Age: {selectedPatient.age}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500">Ref By: {selectedPatient.referredBy}</span>
                          <span className="text-slate-300">•</span>
                          
                          {/* 4. CARE PATHWAY SWITCH */}
                          <Select value={careMode} onValueChange={setCareMode}>
                            <SelectTrigger className="h-6 text-[10px] bg-slate-50 border-slate-200 w-[180px] font-semibold text-blue-700">
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

                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-medium text-slate-700">
                             {careMode === 'hormone_care' && 'Cycle Day 21 (Luteal)'}
                             {careMode === 'natural_conception' && 'Cycle Day 14 (Ovulatory)'}
                             {careMode === 'induction' && 'Cycle Day 10 (Follicular)'}
                             {careMode === 'iui' && 'Cycle Day 11 (Trigger Ready)'}
                             {careMode === 'pregnancy' && 'Week 24 (Trimester 2)'}
                             {careMode === 'postpartum' && 'Week 6 (Recovery)'}
                          </span>
                       </div>
                    </div>
                 </div>
                 
                 {/* Risk Badge */}
                 {selectedPatient.status === "High Risk" && (
                    <div className="px-3 py-1 bg-rose-50 border border-rose-100 rounded-full flex items-center gap-1.5">
                       <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                       <span className="text-xs font-semibold text-rose-700">High Risk</span>
                    </div>
                 )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                 <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-slate-300 text-slate-600">
                    <FileText className="w-3.5 h-3.5" /> Note
                 </Button>
                 <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-slate-300 text-slate-600">
                    <Activity className="w-3.5 h-3.5" /> Lab
                 </Button>
                 <Button size="sm" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Insight
                 </Button>
                 <Separator orientation="vertical" className="h-8 mx-2" />
                 <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400">
                    <Search className="w-4 h-4" />
                 </Button>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden z-0">
              
              {/* Patient List Column (Left) */}
              <div className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
                 <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500 pl-2">Patient Queue</h3>
                    <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-medium">24</span>
                 </div>
                 <ScrollArea className="flex-1">
                    {patients.map(patient => (
                      <div 
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 group relative ${selectedPatient.id === patient.id ? 'bg-blue-50/60' : ''}`}
                      >
                         {selectedPatient.id === patient.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                         
                         <div className="flex justify-between items-start mb-1">
                            <span className={`font-semibold text-sm ${selectedPatient.id === patient.id ? 'text-blue-900' : 'text-slate-700'}`}>{patient.name}</span>
                            <span className="text-[10px] text-slate-400">{patient.lastVisit}</span>
                         </div>
                         <p className="text-xs text-slate-500 mb-2 truncate">{patient.focus}</p>
                         
                         <div className="flex items-center gap-2">
                            {patient.status === 'High Risk' && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
                            {patient.status === 'Monitor' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                            {patient.status === 'Active Cycle' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                            <span className="text-[10px] font-medium text-slate-400">{patient.status}</span>
                         </div>
                      </div>
                    ))}
                 </ScrollArea>
              </div>

              {/* Detailed View (Right) - Intelligent Dashboard */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                   
                   {/* 1. CURRENT VISIT CLINICAL WORKSPACE (SOAP) - EXPANDED */}
                   <Card className="shadow-md border-blue-100 bg-white overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center cursor-pointer" onClick={() => setShowDocumentation(!showDocumentation)}>
                         <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-blue-600" /> 
                            Current Visit Workspace
                            {!showDocumentation && <span className="text-xs font-normal text-slate-400 ml-2">(Click to expand documentation)</span>}
                         </h3>
                         <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Auto-save on</span>
                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showDocumentation ? 'rotate-90' : ''}`} />
                         </div>
                      </div>
                      
                      {showDocumentation && (
                         <CardContent className="p-0">
                            <div className="flex flex-col divide-y divide-slate-100">
                               
                               {/* 1. Chief Complaints */}
                               <div className="p-4 bg-slate-50/30">
                                  <div className="flex items-center gap-2 mb-2">
                                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chief Complaints</span>
                                     <div className="flex gap-2 ml-2">
                                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-slate-100 font-normal">Unable to conceive</Badge>
                                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-slate-100 font-normal">Irregular ovulation</Badge>
                                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-slate-100 font-normal">Pain</Badge>
                                     </div>
                                  </div>
                                  <Textarea placeholder="Patient's primary concerns..." className="min-h-[60px] text-sm" />
                               </div>

                               {/* 2. O/E - Vitals & Examination */}
                               <div className="p-4 grid grid-cols-4 gap-6">
                                  <div className="col-span-1 space-y-3">
                                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Vitals</span>
                                     <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                           <div>
                                              <Label className="text-[10px] text-slate-500">BP</Label>
                                              <div className="relative">
                                                 <Input className="h-7 text-xs pr-6" placeholder="120/80" />
                                                 <Activity className="w-3 h-3 absolute right-2 top-2 text-slate-400" />
                                              </div>
                                           </div>
                                           <div>
                                              <Label className="text-[10px] text-slate-500">Pulse</Label>
                                              <div className="relative">
                                                 <Input className="h-7 text-xs pr-6" placeholder="72" />
                                                 <Heart className="w-3 h-3 absolute right-2 top-2 text-slate-400" />
                                              </div>
                                           </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                           <div>
                                              <Label className="text-[10px] text-slate-500">Weight</Label>
                                              <div className="relative">
                                                 <Input className="h-7 text-xs pr-6" placeholder="kg" />
                                                 <Scale className="w-3 h-3 absolute right-2 top-2 text-slate-400" />
                                              </div>
                                           </div>
                                           <div>
                                              <Label className="text-[10px] text-slate-500">BMI</Label>
                                              <Input className="h-7 text-xs bg-slate-50" readOnly placeholder="--" />
                                           </div>
                                        </div>
                                     </div>
                                  </div>
                                  
                                  <div className="col-span-3">
                                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Clinical Examination</span>
                                     <div className="grid grid-cols-3 gap-3">
                                        <div className="border border-slate-200 rounded p-2">
                                           <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs font-medium">Thyroid</span>
                                              <Checkbox className="h-3 w-3" />
                                           </div>
                                           <Input className="h-6 text-[10px] border-none bg-slate-50 px-2" placeholder="Notes..." />
                                        </div>
                                        <div className="border border-slate-200 rounded p-2">
                                           <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs font-medium">Hirsutism</span>
                                              <Checkbox className="h-3 w-3" />
                                           </div>
                                           <Input className="h-6 text-[10px] border-none bg-slate-50 px-2" placeholder="Score..." />
                                        </div>
                                        <div className="border border-slate-200 rounded p-2">
                                           <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs font-medium">Pelvic Tenderness</span>
                                              <Checkbox className="h-3 w-3" />
                                           </div>
                                           <Input className="h-6 text-[10px] border-none bg-slate-50 px-2" placeholder="Notes..." />
                                        </div>
                                     </div>
                                  </div>
                               </div>

                               {/* 3. Medicines & Treatment Plan */}
                               <div className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rx / Treatment Plan</span>
                                     <div className="flex gap-2">
                                        <Badge variant="outline" className="text-[10px] cursor-pointer bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"><Plus className="w-3 h-3 mr-1" /> Letrozole</Badge>
                                        <Badge variant="outline" className="text-[10px] cursor-pointer bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"><Plus className="w-3 h-3 mr-1" /> Progesterone</Badge>
                                     </div>
                                  </div>
                                  <div className="border border-slate-200 rounded-md overflow-hidden">
                                     <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                           <tr>
                                              <th className="px-3 py-2 font-medium w-1/3">Drug Name</th>
                                              <th className="px-3 py-2 font-medium">Dose</th>
                                              <th className="px-3 py-2 font-medium">Freq</th>
                                              <th className="px-3 py-2 font-medium">Duration</th>
                                              <th className="px-3 py-2 font-medium">Instruction</th>
                                           </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                           <tr>
                                              <td className="p-2"><Input className="h-7 text-xs border-none focus-visible:ring-0 px-1" placeholder="Search drug..." /></td>
                                              <td className="p-2"><Input className="h-7 text-xs border-none focus-visible:ring-0 px-1" placeholder="e.g. 5mg" /></td>
                                              <td className="p-2"><Input className="h-7 text-xs border-none focus-visible:ring-0 px-1" placeholder="OD/BD" /></td>
                                              <td className="p-2"><Input className="h-7 text-xs border-none focus-visible:ring-0 px-1" placeholder="5 days" /></td>
                                              <td className="p-2"><Input className="h-7 text-xs border-none focus-visible:ring-0 px-1" placeholder="CD 3-7" /></td>
                                           </tr>
                                        </tbody>
                                     </table>
                                     <Button variant="ghost" className="w-full text-xs text-slate-400 h-8 hover:text-slate-600">+ Add Medication</Button>
                                  </div>
                               </div>

                              {/* 4. Referrals & Lifestyle (NEW) */}
                              <div className="p-4 bg-slate-50/30">
                                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Referrals & Recommendations</span>
                                 <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                       <Label className="text-[10px] text-slate-500 mb-1.5 block">Internal/External Referral</Label>
                                       <Select defaultValue={selectedPatient.referredTo !== "-" ? selectedPatient.referredTo : undefined}>
                                          <SelectTrigger className="h-8 text-xs bg-white border-slate-200 w-full">
                                             <SelectValue placeholder="Select Specialty..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                             <SelectItem value="Fetal Medicine">Fetal Medicine</SelectItem>
                                             <SelectItem value="Nutritionist">Nutritionist</SelectItem>
                                             <SelectItem value="Psychologist">Psychologist</SelectItem>
                                             <SelectItem value="Endocrinologist">Endocrinologist</SelectItem>
                                             <SelectItem value="Dietitian">Dietitian</SelectItem>
                                          </SelectContent>
                                       </Select>
                                    </div>
                                    <div className="flex-1">
                                       <Label className="text-[10px] text-slate-500 mb-1.5 block">Lifestyle Intervention</Label>
                                       <div className="flex items-center gap-2 h-8 px-3 bg-white border border-slate-200 rounded-md">
                                          <Checkbox id="lifestyle-mod-plan" className="h-4 w-4 rounded-full data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                                          <label htmlFor="lifestyle-mod-plan" className="text-xs font-medium text-slate-700 cursor-pointer select-none">Prescribe Lifestyle Modification</label>
                                       </div>
                                    </div>
                                 </div>
                              </div>

                               {/* 4. Investigation Suggestions */}
                               <div className="p-4 bg-slate-50/30">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Order Investigations</span>
                                  <Tabs defaultValue="hormones" className="w-full">
                                     <TabsList className="h-7 bg-slate-200/50 mb-3">
                                        <TabsTrigger value="hormones" className="text-[10px] h-6 px-3">Hormones</TabsTrigger>
                                        <TabsTrigger value="blood" className="text-[10px] h-6 px-3">Routine Bloods</TabsTrigger>
                                        <TabsTrigger value="fertility" className="text-[10px] h-6 px-3">Fertility</TabsTrigger>
                                        <TabsTrigger value="imaging" className="text-[10px] h-6 px-3">Imaging</TabsTrigger>
                                     </TabsList>
                                     <TabsContent value="hormones" className="mt-0">
                                        <div className="flex flex-wrap gap-2">
                                           {['AMH', 'TSH', 'Prolactin', 'FSH/LH', 'Progesterone', 'Estradiol', 'Testosterone'].map(test => (
                                              <div key={test} className="flex items-center space-x-2 bg-white border border-slate-200 rounded px-2 py-1.5">
                                                 <Checkbox id={test} className="h-3.5 w-3.5" />
                                                 <label htmlFor={test} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                                    {test}
                                                 </label>
                                              </div>
                                           ))}
                                        </div>
                                     </TabsContent>
                                  </Tabs>
                               </div>

                               {/* 5. Prescription Generator */}
                               <div className="p-4 bg-slate-100 flex items-center justify-between">
                                  <div className="text-xs text-slate-500">
                                     <span className="font-semibold text-slate-700">Dr. Reynolds</span> • Reproductive Endocrinology
                                  </div>
                                  <div className="flex gap-2">
                                     <Button variant="outline" size="sm" className="h-8 gap-2 bg-white text-xs border-slate-300">
                                        <Printer className="w-3.5 h-3.5" /> Print
                                     </Button>
                                     <Button size="sm" className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs shadow-sm">
                                        <FileText className="w-3.5 h-3.5" /> Generate Prescription
                                     </Button>
                                  </div>
                               </div>

                            </div>
                         </CardContent>
                      )}
                      
                      {/* Collapsed Summary View (Always Visible if Collapsed) */}
                      {!showDocumentation && (
                         <CardContent className="p-0">
                            <div className="grid grid-cols-4 divide-x divide-slate-100">
                               {/* Subjective */}
                               <div className="p-4 space-y-3">
                                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">S (Symptoms)</span> <Button variant="ghost" size="icon" className="h-5 w-5"><Sparkles className="w-3 h-3 text-blue-400" /></Button></div>
                                  <div className="space-y-2">
                                     <div className="bg-slate-50 p-2 rounded text-xs border border-slate-100">PMS severity score: 8/10</div>
                                     <div className="bg-slate-50 p-2 rounded text-xs border border-slate-100">Sleep quality: Poor</div>
                                  </div>
                               </div>
                               {/* Objective */}
                               <div className="p-4 space-y-3">
                                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">O (Observations)</span></div>
                                  <div className="space-y-2 text-xs text-slate-600">
                                     <div className="flex justify-between"><span>Cycle Phase:</span> <span className="font-medium">Luteal</span></div>
                                     <div className="flex justify-between"><span>Luteal Length:</span> <span className="font-medium text-rose-600">9 days</span></div>
                                     <div className="flex justify-between"><span>Genomic Risk:</span> <span className="font-medium text-amber-600">PCOS</span></div>
                                  </div>
                               </div>
                               {/* Assessment (AI) */}
                               <div className="p-4 space-y-3 bg-blue-50/30">
                                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-blue-600">A (Assessment)</span> <Sparkles className="w-3 h-3 text-blue-500" /></div>
                                  <p className="text-xs leading-relaxed text-slate-700">
                                     "Recurrent short luteal phase with likely progesterone insufficiency. PMS exacerbated by reported sleep deficit."
                                  </p>
                               </div>
                               {/* Plan */}
                               <div className="p-4 space-y-3">
                                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">P (Plan)</span></div>
                                  <div className="space-y-2">
                                     <div className="flex items-center gap-2"><Checkbox id="p1" defaultChecked /> <label htmlFor="p1" className="text-xs text-slate-700">Start luteal progesterone</label></div>
                                     <div className="flex items-center gap-2"><Checkbox id="p2" /> <label htmlFor="p2" className="text-xs text-slate-700">Order Day 21 labs</label></div>
                                  </div>
                                  <Button size="sm" className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 mt-2" onClick={() => setShowDocumentation(true)}>Full Note & Rx</Button>
                               </div>
                            </div>
                         </CardContent>
                      )}
                   </Card>

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

                         {/* 3. PREGNANCY WORKSPACE (ENHANCED) */}
                         {careMode === 'pregnancy' && (
                            <>
                               {/* USG & Biometry Card */}
                               <Card className="shadow-sm border-slate-200 overflow-hidden">
                                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url(${fetalBiometryBg})`, backgroundSize: 'cover' }}></div>
                                  <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between relative z-10">
                                     <div className="flex items-center gap-2">
                                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                           <Activity className="w-4 h-4 text-emerald-600" /> Fetal Biometry (USG)
                                        </CardTitle>
                                        <Badge variant="outline" className="bg-white/50">Last Scan: 2 days ago</Badge>
                                     </div>
                                  </CardHeader>
                                  <CardContent className="pt-6 relative z-10">
                                     <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="bg-white/80 p-3 rounded border border-slate-100 shadow-sm text-center">
                                           <div className="text-[10px] text-slate-500 uppercase font-bold">Est. Fetal Weight</div>
                                           <div className="text-lg font-bold text-slate-800">600g <span className="text-xs font-normal text-emerald-600">50th %ile</span></div>
                                        </div>
                                        <div className="bg-white/80 p-3 rounded border border-slate-100 shadow-sm text-center">
                                           <div className="text-[10px] text-slate-500 uppercase font-bold">Amniotic Fluid (AFI)</div>
                                           <div className="text-lg font-bold text-slate-800">14cm <span className="text-xs font-normal text-emerald-600">Normal</span></div>
                                        </div>
                                        <div className="bg-white/80 p-3 rounded border border-slate-100 shadow-sm text-center">
                                           <div className="text-[10px] text-slate-500 uppercase font-bold">Placenta</div>
                                           <div className="text-lg font-bold text-slate-800">Posterior <span className="text-xs font-normal text-slate-400">Gr I</span></div>
                                        </div>
                                     </div>
                                     
                                     {/* NEW: Head Circumference Growth Chart */}
                                     <div className="bg-white/60 rounded-lg p-2 border border-slate-100 mt-2">
                                        <div className="text-xs font-semibold text-slate-600 mb-2 pl-2">Growth Trends (HC/AC/FL)</div>
                                        <div className="h-[180px] w-full">
                                           <ResponsiveContainer width="100%" height="100%">
                                              <LineChart data={usgData}>
                                                 <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                                 <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                                 <Line type="monotone" dataKey="hc" stroke="#3b82f6" strokeWidth={2} name="Head Circ (mm)" dot={{r: 3}} />
                                                 <Line type="monotone" dataKey="ac" stroke="#10b981" strokeWidth={2} name="Abd Circ (mm)" dot={{r: 3}} />
                                                 <Line type="monotone" dataKey="fl" stroke="#f59e0b" strokeWidth={2} name="Femur Len (mm)" dot={{r: 3}} />
                                              </LineChart>
                                           </ResponsiveContainer>
                                        </div>
                                     </div>
                                  </CardContent>
                               </Card>

                               {/* Maternal Vitals & Trends */}
                               <Card className="shadow-sm border-slate-200">
                                  <CardHeader className="py-4 border-b border-slate-100">
                                     <CardTitle className="text-base font-bold text-slate-800">Maternal Vitals & Trends</CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-6">
                                     <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <ComposedChart data={pregnancyData}>
                                            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                            <YAxis yAxisId="left" domain={[50, 100]} label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', fontSize: 10 }} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                            <YAxis yAxisId="right" orientation="right" domain={[60, 160]} label={{ value: 'BP (mmHg)', angle: 90, position: 'insideRight', fontSize: 10 }} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Area yAxisId="left" type="monotone" dataKey="weight" stroke="#ec4899" strokeWidth={2} fill="#fbcfe8" fillOpacity={0.2} name="Maternal Weight" />
                                            <Line yAxisId="right" type="monotone" dataKey="systolic" stroke="#f43f5e" strokeWidth={2} dot={{r: 4, fill: '#f43f5e'}} name="Systolic BP" />
                                            <Line yAxisId="right" type="monotone" dataKey="diastolic" stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={2} dot={{r: 4, fill: '#f43f5e'}} name="Diastolic BP" />
                                          </ComposedChart>
                                        </ResponsiveContainer>
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
                            <CardHeader className="py-3 border-b border-slate-100">
                               <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                  <FlaskConical className="w-4 h-4 text-purple-600" /> Lab Intelligence
                               </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
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
                            </CardContent>
                         </Card>

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
                               </CardTitle>
                               <Button size="icon" variant="ghost" className="h-6 w-6"><ChevronRight className="w-4 h-4" /></Button>
                            </CardHeader>
                            <CardContent className="p-0">
                               {(careMode === 'iui' || careMode === 'induction') ? (
                                  <div className="p-3 border-b border-slate-50 flex justify-between items-center">
                                     <div>
                                        <div className="font-medium text-sm text-slate-900">Letrozole</div>
                                        <div className="text-xs text-slate-500">5mg • CD 3-7</div>
                                     </div>
                                     <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Completed</Badge>
                                  </div>
                               ) : (
                                  <div className="p-3 border-b border-slate-50 flex justify-between items-center">
                                     <div>
                                        <div className="font-medium text-sm text-slate-900">Prenatal Multi</div>
                                        <div className="text-xs text-slate-500">Daily</div>
                                     </div>
                                     <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Active</Badge>
                                  </div>
                               )}
                               {careMode === 'pregnancy' && (
                                  <div className="p-3 flex justify-between items-center">
                                     <div>
                                        <div className="font-medium text-sm text-slate-900">Aspirin</div>
                                        <div className="text-xs text-slate-500">81mg • Preeclampsia Prevention</div>
                                     </div>
                                     <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Active</Badge>
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
