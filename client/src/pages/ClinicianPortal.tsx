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
  CalendarCheck
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
  Bar
} from "recharts";
import medicalDashboardBg from "../assets/images/medical-dashboard-bg.png";
import pregnancyGrowthBg from "../assets/images/pregnancy-growth-bg.png";
import postpartumRecoveryBg from "../assets/images/postpartum-recovery-bg.png";
import follicleTrackingBg from "../assets/images/follicle-tracking-bg.png";
import iuiTimelineBg from "../assets/images/iui-timeline-bg.png";

// Mock Data
const patients = [
  { id: 1, name: "Ananya S.", age: 29, status: "High Risk", focus: "Natural Conception", lastVisit: "2 days ago", cycleDay: 14, avatar: "AS", mode: "natural_conception" },
  { id: 2, name: "Meera D.", age: 34, status: "Monitor", focus: "Pregnancy Wk 24", lastVisit: "1 week ago", cycleDay: null, avatar: "MD", mode: "pregnancy" },
  { id: 3, name: "Sarah J.", age: 31, status: "Stable", focus: "Postpartum Wk 6", lastVisit: "3 weeks ago", cycleDay: null, avatar: "SJ", mode: "postpartum" },
  { id: 4, name: "Elena R.", age: 36, status: "Active Cycle", focus: "IUI Cycle #2", lastVisit: "Yesterday", cycleDay: 11, avatar: "ER", mode: "iui" },
  { id: 5, name: "Priya K.", age: 28, status: "Assessment", focus: "PCOS Mgmt", lastVisit: "Today", cycleDay: 21, avatar: "PK", mode: "hormone_care" },
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
  { week: 12, weight: 60, expected: 61, bp: 110 },
  { week: 16, weight: 62, expected: 63, bp: 112 },
  { week: 20, weight: 65, expected: 65, bp: 115 },
  { week: 24, weight: 68, expected: 68, bp: 118 }, // Current
  { week: 28, weight: 71, expected: 71, bp: 120 }, // Projected
  { week: 32, weight: 74, expected: 74, bp: 122 },
];

const follicleData = [
  { day: 3, left: 5, right: 4, endometrium: 4 },
  { day: 7, left: 8, right: 6, endometrium: 5.5 },
  { day: 10, left: 14, right: 9, endometrium: 7.2 },
  { day: 12, left: 18, right: 11, endometrium: 9.1 }, // Trigger ready
];

export default function ClinicianPortal() {
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);
  const [careMode, setCareMode] = useState("natural_conception"); 

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
          <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50">
            <LayoutDashboard className="mr-3 h-4 w-4" /> Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start bg-blue-600/10 text-blue-400 border border-blue-600/20">
            <Users className="mr-3 h-4 w-4" /> Patients
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50">
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Subtle Dashboard Background */}
        <div 
           className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: `url(${medicalDashboardBg})`, backgroundSize: 'cover' }}
        />

        {/* 1. STICKY PATIENT CONTEXT HEADER */}
        <header className="h-18 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-slate-200 bg-slate-100 text-slate-600">
                   <AvatarFallback>{selectedPatient.avatar}</AvatarFallback>
                </Avatar>
                <div>
                   <h2 className="text-lg font-bold text-slate-900 leading-none">{selectedPatient.name}</h2>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">Age: {selectedPatient.age}</span>
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

               {careMode === 'iui' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
                     <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url(${iuiTimelineBg})`, backgroundSize: 'cover' }}></div>
                     <div className="relative z-10 flex gap-8 items-center">
                        <div>
                           <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Current Cycle</p>
                           <p className="text-lg font-bold text-blue-900">IUI Cycle #2</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Cycle Day</p>
                           <p className="text-lg font-bold text-slate-900">Day 11</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Leading Follicle</p>
                           <p className="text-lg font-bold text-emerald-600">18mm (Left)</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Plan</p>
                           <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">Trigger Planned</Badge>
                        </div>
                     </div>
                  </div>
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
                              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3">
                                 <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                 <div className="text-sm text-amber-900">
                                    <span className="font-semibold">AI Insight:</span> Ovulation confirmed, but luteal phase is borderline (9 days). Consider luteal progesterone support to optimize implantation window.
                                 </div>
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
                              <div className="grid grid-cols-2 gap-4 mt-4">
                                 <div className="bg-white/80 p-3 rounded border border-slate-100 shadow-sm">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Stimulation Log</div>
                                    <div className="flex justify-between items-center">
                                       <span className="text-sm font-medium text-slate-800">Letrozole 5mg</span>
                                       <span className="text-xs text-slate-500">CD 3-7</span>
                                    </div>
                                 </div>
                                 <div className="bg-white/80 p-3 rounded border border-slate-100 shadow-sm">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Trigger Decision</div>
                                    <div className="flex justify-between items-center">
                                       <span className="text-sm font-bold text-emerald-600">Ready for Trigger</span>
                                       <Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700">Order Ovidrel</Button>
                                    </div>
                                 </div>
                              </div>
                           </CardContent>
                        </Card>
                     )}

                     {/* 3. PREGNANCY WORKSPACE */}
                     {careMode === 'pregnancy' && (
                        <Card className="shadow-sm border-slate-200 overflow-hidden">
                           <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url(${pregnancyGrowthBg})`, backgroundSize: 'cover' }}></div>
                           <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between relative z-10">
                              <div className="flex items-center gap-2">
                                 <CardTitle className="text-base font-bold text-slate-800">Maternal & Fetal Trends</CardTitle>
                                 <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100 border-none">Week 24</Badge>
                              </div>
                           </CardHeader>
                           <CardContent className="pt-6 relative z-10">
                              <div className="h-[280px] w-full">
                                 <ResponsiveContainer width="100%" height="100%">
                                   <AreaChart data={pregnancyData}>
                                     <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                     <YAxis yAxisId="left" domain={[55, 80]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                     <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                     <Area yAxisId="left" type="monotone" dataKey="weight" stroke="#ec4899" strokeWidth={3} fill="#fbcfe8" fillOpacity={0.2} name="Maternal Weight" />
                                     <Line yAxisId="left" type="monotone" dataKey="expected" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} name="Expected Curve" />
                                   </AreaChart>
                                 </ResponsiveContainer>
                              </div>
                           </CardContent>
                        </Card>
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
                              <div>
                                 <div className="flex justify-between text-sm mb-2 font-medium"><span>Mood Stability (EPDS)</span> <span className="text-amber-600">Score 12 (Attention Needed)</span></div>
                                 <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full w-[40%] bg-amber-500 rounded-full"></div></div>
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

                           {careMode === 'iui' && (
                              <div className="bg-white border border-purple-100 rounded-lg p-3 shadow-sm">
                                 <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-xs font-bold text-purple-900">IUI PROTOCOL</h4>
                                    <Badge className="text-[10px] bg-purple-100 text-purple-700 border-none">Stimulation</Badge>
                                 </div>
                                 <ul className="space-y-2">
                                    <li className="text-xs text-slate-600 flex items-center gap-2"><Syringe className="w-3 h-3 text-purple-500" /> Trigger: Ovidrel 250mcg</li>
                                    <li className="text-xs text-slate-600 flex items-center gap-2"><Timer className="w-3 h-3 text-purple-500" /> IUI Timing: 36h post-trigger</li>
                                 </ul>
                              </div>
                           )}

                           <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm opacity-70">
                              <div className="flex justify-between items-center mb-2">
                                 <h4 className="text-xs font-bold text-slate-700">LUTEAL SUPPORT</h4>
                                 <Button size="sm" variant="ghost" className="h-5 text-[10px] text-slate-400">Add</Button>
                              </div>
                              <p className="text-[10px] text-slate-500">Progesterone + Magnesium protocol not yet started.</p>
                           </div>
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
                              <p className="text-xs text-slate-500 truncate">IUI scheduled for Friday at 10am.</p>
                           </div>
                        </CardContent>
                     </Card>

                  </div>

               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
