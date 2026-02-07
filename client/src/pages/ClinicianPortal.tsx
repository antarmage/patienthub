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
  ClipboardList
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Line
} from "recharts";
import medicalDashboardBg from "../assets/images/medical-dashboard-bg.png";
import genomicHelix from "../assets/images/genomic-helix.png";

// Mock Data
const patients = [
  { id: 1, name: "Ananya S.", age: 29, status: "High Risk", focus: "TTC 6mo", lastVisit: "2 days ago", cycleDay: 14, avatar: "AS" },
  { id: 2, name: "Meera D.", age: 34, status: "Monitor", focus: "PMS Severe", lastVisit: "1 week ago", cycleDay: 21, avatar: "MD" },
  { id: 3, name: "Sarah J.", age: 31, status: "Stable", focus: "General", lastVisit: "3 weeks ago", cycleDay: 5, avatar: "SJ" },
];

const hormoneData = [
  { day: 1, estrogen: 20, progesterone: 5, symptoms: 2 },
  { day: 5, estrogen: 30, progesterone: 5, symptoms: 1 },
  { day: 10, estrogen: 60, progesterone: 6, symptoms: 3 },
  { day: 14, estrogen: 90, progesterone: 8, symptoms: 2 },
  { day: 16, estrogen: 50, progesterone: 20, symptoms: 5 },
  { day: 20, estrogen: 40, progesterone: 60, symptoms: 7 }, // Symptom spike
  { day: 25, estrogen: 30, progesterone: 40, symptoms: 8 },
  { day: 28, estrogen: 25, progesterone: 10, symptoms: 4 },
];

export default function ClinicianPortal() {
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);
  const [activeTab, setActiveTab] = useState("reproductive");

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
                      <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-blue-200 text-blue-700 bg-blue-50">TTC</Badge>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-medium text-slate-700">Cycle Day 14</span>
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
                <FileText className="w-3.5 h-3.5" /> Add Note
             </Button>
             <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-slate-300 text-slate-600">
                <Activity className="w-3.5 h-3.5" /> Order Lab
             </Button>
             <Button size="sm" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm">
                <ArrowUpRight className="w-3.5 h-3.5" /> Send Insight
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
                        <span className="text-[10px] font-medium text-slate-400">{patient.status}</span>
                     </div>
                  </div>
                ))}
             </ScrollArea>
          </div>

          {/* Detailed View (Right) - Intelligent Dashboard */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
               
               {/* 3. CLINICAL SNAPSHOT SUMMARY */}
               <div className="grid grid-cols-5 gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="col-span-1 border-r border-slate-100 pr-4">
                     <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Reproductive Status</p>
                     <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md text-blue-600"><Baby className="w-4 h-4" /></div>
                        <div>
                           <p className="text-sm font-bold text-slate-900">TTC</p>
                           <p className="text-[10px] text-slate-500">3 Months</p>
                        </div>
                     </div>
                  </div>
                  <div className="col-span-1 border-r border-slate-100 px-4">
                     <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Avg Cycle</p>
                     <p className="text-sm font-bold text-slate-900">28 Days</p>
                     <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ovulatory</p>
                  </div>
                  <div className="col-span-1 border-r border-slate-100 px-4">
                     <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Luteal Phase</p>
                     <p className="text-sm font-bold text-slate-900">9 Days</p>
                     <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Borderline Short</p>
                  </div>
                   <div className="col-span-1 border-r border-slate-100 px-4">
                     <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">PMS Severity</p>
                     <p className="text-sm font-bold text-slate-900">Moderate</p>
                     <p className="text-[10px] text-slate-500">Pain Score 6/10</p>
                  </div>
                  <div className="col-span-1 pl-4">
                     <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Genomic Risk</p>
                     <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4 bg-rose-50 text-rose-700 border-rose-200">PCOS ↑</Badge>
                        <Badge variant="outline" className="text-[10px] h-4 bg-amber-50 text-amber-700 border-amber-200">Thyroid ↑</Badge>
                     </div>
                  </div>
               </div>

               {/* 2. SMART COLLAPSIBLE CARDS - ALERTS */}
               <div className="space-y-3">
                  <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-900 py-3 flex items-center shadow-sm">
                     <AlertCircle className="h-4 w-4 stroke-rose-600 mr-3" />
                     <div className="flex-1 flex justify-between items-center">
                        <span className="font-semibold text-sm">Luteal Phase &lt; 9 days detected in last 2 cycles</span>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-100 bg-white/50">
                           Review Protocol
                        </Button>
                     </div>
                  </Alert>
                  
                  <Alert className="bg-amber-50 border-amber-200 text-amber-900 py-3 flex items-center shadow-sm">
                     <Activity className="h-4 w-4 stroke-amber-600 mr-3" />
                     <div className="flex-1 flex justify-between items-center">
                        <span className="font-medium text-sm">Sleep deficit increasing PMS severity (+30% vs baseline)</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-700 hover:bg-amber-100 hover:text-amber-800">
                           Dismiss
                        </Button>
                     </div>
                  </Alert>
               </div>

               {/* MAIN DASHBOARD CONTENT */}
               <div className="grid grid-cols-3 gap-6">
                  
                  {/* LEFT COLUMN: Reproductive Intelligence */}
                  <div className="col-span-2 space-y-6">
                     <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                           <div className="flex items-center gap-2">
                              <CardTitle className="text-base font-bold text-slate-800">Reproductive Intelligence</CardTitle>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] font-normal">Last 30 Days</Badge>
                           </div>
                           <Tabs defaultValue="combined" className="w-[300px]">
                              <TabsList className="h-8 w-full bg-slate-100/80 p-0.5">
                                 <TabsTrigger value="hormones" className="text-xs h-7 px-3">Hormones</TabsTrigger>
                                 <TabsTrigger value="symptoms" className="text-xs h-7 px-3">Symptoms</TabsTrigger>
                                 <TabsTrigger value="combined" className="text-xs h-7 px-3">Combined</TabsTrigger>
                              </TabsList>
                           </Tabs>
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
                                    <linearGradient id="colorProg" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                                    labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                  />
                                  <ReferenceLine x={14} stroke="#cbd5e1" strokeDasharray="3 3" label={{ position: 'top', value: 'Ovulation', fontSize: 10, fill: '#64748b' }} />
                                  
                                  <Area yAxisId="left" type="monotone" dataKey="estrogen" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorEstrogen)" name="Estrogen" />
                                  <Area yAxisId="left" type="monotone" dataKey="progesterone" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorProg)" name="Progesterone" />
                                  <Line yAxisId="right" type="monotone" dataKey="symptoms" stroke="#f59e0b" strokeWidth={2} dot={{r: 4, fill: '#f59e0b'}} name="Pain Score" />
                                </AreaChart>
                              </ResponsiveContainer>
                           </div>
                           
                           {/* AI Interpretation Box */}
                           <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex gap-3">
                              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                              <div className="text-sm text-indigo-900">
                                 <span className="font-semibold">AI Insight:</span> Pain clusters in mid-luteal phase across 3 cycles. Pattern suggests progesterone sensitivity correlating with symptom spikes.
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     {/* EMR Timeline View */}
                     <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-3 border-b border-slate-100">
                           <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
                              <span>Clinical Timeline</span>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                 View Full EMR <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                           <div className="relative border-l-2 border-slate-200 ml-2 space-y-6 pb-2">
                              <div className="ml-6 relative">
                                 <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white"></div>
                                 <p className="text-xs font-semibold text-slate-500 mb-0.5">Mar 01, 2024</p>
                                 <p className="text-sm font-medium text-slate-900">Symptoms improved 40%</p>
                                 <p className="text-xs text-slate-600 mt-1">Patient reports better sleep and reduced bloating after protocol adjustment.</p>
                              </div>
                              <div className="ml-6 relative">
                                 <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></div>
                                 <p className="text-xs font-semibold text-slate-500 mb-0.5">Feb 02, 2024</p>
                                 <p className="text-sm font-medium text-slate-900">Progesterone started</p>
                                 <p className="text-xs text-slate-600 mt-1">Prescribed bio-identical progesterone 200mg for luteal phase support.</p>
                              </div>
                              <div className="ml-6 relative">
                                 <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></div>
                                 <p className="text-xs font-semibold text-slate-500 mb-0.5">Jan 12, 2024</p>
                                 <p className="text-sm font-medium text-slate-900">Severe PMS Reported</p>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  </div>

                  {/* RIGHT COLUMN: Genetics & Actions */}
                  <div className="space-y-6">
                     
                     {/* Genomic Risk Panel - Actionable */}
                     <Card className="shadow-sm border-slate-200 overflow-hidden">
                        <div className="bg-slate-900 p-4 flex items-center justify-between relative overflow-hidden">
                           <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                           <div className="relative z-10 flex items-center gap-2 text-white">
                              <Dna className="w-4 h-4 text-blue-400" />
                              <h3 className="font-bold text-sm">Genomic Intelligence</h3>
                           </div>
                        </div>
                        <CardContent className="p-4 space-y-4">
                           <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-1">
                                 <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">PCOS Predisposition</span>
                                 <Badge variant="destructive" className="h-5 text-[10px]">High Risk</Badge>
                              </div>
                              <p className="text-xs text-rose-700 leading-relaxed mb-3">
                                 Higher likelihood of insulin resistance and ovulatory irregularity based on polygenic risk score.
                              </p>
                              <Button size="sm" className="w-full bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 text-xs h-7 shadow-sm">
                                 See Cycle Impact
                              </Button>
                           </div>

                           <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-1">
                                 <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Thyroid Function</span>
                                 <Badge variant="outline" className="h-5 text-[10px] bg-white border-amber-300 text-amber-700">Moderate</Badge>
                              </div>
                              <p className="text-xs text-amber-700 leading-relaxed">
                                 Variants associated with slightly lower T4 to T3 conversion.
                              </p>
                           </div>
                        </CardContent>
                     </Card>

                     {/* AI Action Box */}
                     <Card className="shadow-md border-blue-100 bg-gradient-to-br from-white to-blue-50/50">
                        <CardHeader className="pb-2">
                           <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-blue-600" /> Clinical Insight
                           </CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="space-y-3">
                              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                 <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Pattern Detected</p>
                                 <p className="text-sm font-medium text-slate-900">Short luteal phase recurring</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                 <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Why It Matters</p>
                                 <p className="text-sm font-medium text-slate-900">May reduce implantation chances</p>
                              </div>
                              
                              <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-md transition-all mt-2">
                                 Review Luteal Support Protocol <ArrowUpRight className="ml-2 w-4 h-4" />
                              </Button>
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
