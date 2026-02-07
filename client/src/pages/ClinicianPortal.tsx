import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  Search, 
  Bell, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  TrendingUp, 
  Dna, 
  FileText,
  ChevronRight,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

// Mock Data
const patients = [
  { id: 1, name: "Ananya S.", age: 29, status: "Critical", risk: "High", focus: "TTC 6mo", alert: "Short luteal phase detected" },
  { id: 2, name: "Meera D.", age: 34, status: "Monitor", risk: "Medium", focus: "PMS Severe", alert: "Irregular cycle length" },
  { id: 3, name: "Sarah J.", age: 31, status: "Stable", risk: "Low", focus: "General", alert: null },
  { id: 4, name: "Priya K.", age: 27, status: "Stable", risk: "Low", focus: "PCOS Mgmt", alert: null },
];

const hormoneData = [
  { day: 1, estrogen: 20, progesterone: 5 },
  { day: 5, estrogen: 30, progesterone: 5 },
  { day: 10, estrogen: 60, progesterone: 6 },
  { day: 14, estrogen: 90, progesterone: 8 },
  { day: 16, estrogen: 50, progesterone: 20 },
  { day: 20, estrogen: 40, progesterone: 60 },
  { day: 25, estrogen: 30, progesterone: 40 },
  { day: 28, estrogen: 25, progesterone: 10 },
];

export default function ClinicianPortal() {
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);

  // Set the theme attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'clinician');
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-white font-serif text-xl tracking-tight">Helix<span className="text-blue-400">Care</span></h1>
          <p className="text-xs text-slate-500 mt-1">Clinician Dashboard v2.1</p>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
            <LayoutDashboard className="mr-3 h-4 w-4" /> Overview
          </Button>
          <Button variant="ghost" className="w-full justify-start bg-blue-600 text-white hover:bg-blue-700">
            <Users className="mr-3 h-4 w-4" /> Patients
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
            <Calendar className="mr-3 h-4 w-4" /> Schedule
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800">
            <Activity className="mr-3 h-4 w-4" /> Analytics
          </Button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
             <Avatar className="h-8 w-8 border border-slate-600">
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
              placeholder="Search patients, genomic markers, IDs..."
            />
          </div>
          <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" className="relative text-slate-500">
               <Bell className="h-4 w-4" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Patient List Column */}
          <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-700">Active Patients</h3>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">24 Total</span>
             </div>
             <ScrollArea className="flex-1">
                {patients.map(patient => (
                  <div 
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${selectedPatient.id === patient.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                  >
                     <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-slate-900">{patient.name}</span>
                        {patient.risk === 'High' && <Badge variant="destructive" className="h-5 text-[10px] px-1.5">High Risk</Badge>}
                        {patient.risk === 'Medium' && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 h-5 text-[10px] px-1.5">Monitor</Badge>}
                     </div>
                     <p className="text-xs text-slate-500 mb-2">{patient.focus}</p>
                     {patient.alert && (
                       <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                         <AlertCircle className="w-3 h-3" /> {patient.alert}
                       </div>
                     )}
                  </div>
                ))}
             </ScrollArea>
          </div>

          {/* Detailed View */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
               
               {/* Patient Header */}
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-serif text-slate-900 mb-1">{selectedPatient.name}</h2>
                    <div className="flex gap-4 text-sm text-slate-500">
                      <span>Age: {selectedPatient.age}</span>
                      <span>•</span>
                      <span>Last Visit: 2 days ago</span>
                      <span>•</span>
                      <span className="text-blue-600 font-medium">Cycle Day 14</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-slate-600">View Full History</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">Add Clinical Note</Button>
                  </div>
               </div>

               {/* Alert Box */}
               {selectedPatient.risk === "High" && (
                 <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-rose-900">Clinical Attention Required</h4>
                      <p className="text-sm text-rose-700 mt-1">
                        Short luteal phase detected (last 2 cycles &lt; 10 days). Combined with elevated PCOS PRS score, this suggests progesterone insufficiency risk.
                      </p>
                    </div>
                 </div>
               )}

               <div className="grid grid-cols-3 gap-6">
                  {/* Left Column: Stats & Genetics */}
                  <div className="space-y-6 col-span-2">
                     
                     <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-2 border-b border-slate-100">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base font-semibold text-slate-800">Cycle Physiology Timeline</CardTitle>
                            <Tabs defaultValue="hormones" className="w-[200px]">
                              <TabsList className="h-7 w-full bg-slate-100">
                                <TabsTrigger value="hormones" className="text-xs h-5">Hormones</TabsTrigger>
                                <TabsTrigger value="temp" className="text-xs h-5">BBT</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                           <div className="h-[250px] w-full">
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
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                                  />
                                  <Area type="monotone" dataKey="estrogen" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorEstrogen)" name="Estradiol" />
                                  <Area type="monotone" dataKey="progesterone" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorProg)" name="Progesterone" />
                                </AreaChart>
                              </ResponsiveContainer>
                           </div>
                        </CardContent>
                     </Card>

                     <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-2">
                           <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                             <Dna className="w-4 h-4 text-blue-500" /> Genomic Risk Panel
                           </CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                                 <div>
                                    <p className="text-sm font-medium text-slate-900">Ovarian Reserve Genetics</p>
                                    <p className="text-xs text-slate-500">Slight early decline tendency detected.</p>
                                 </div>
                                 <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Moderate Risk</Badge>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                                 <div>
                                    <p className="text-sm font-medium text-slate-900">Insulin Sensitivity</p>
                                    <p className="text-xs text-slate-500">Elevated risk for metabolic resistance.</p>
                                 </div>
                                 <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50">High Risk</Badge>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                                 <div>
                                    <p className="text-sm font-medium text-slate-900">Inflammation Pathways</p>
                                    <p className="text-xs text-slate-500">Normal inflammatory response predicted.</p>
                                 </div>
                                 <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Stable</Badge>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                  </div>

                  {/* Right Column: AI Insights & Actions */}
                  <div className="space-y-6">
                     
                     <Card className="bg-slate-900 text-white border-none shadow-md">
                        <CardHeader>
                           <CardTitle className="flex items-center gap-2 text-base">
                             <Sparkles className="w-4 h-4 text-purple-400" /> AI Pattern Analysis
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="text-sm text-slate-300 leading-relaxed">
                             Patient's severe PMS clusters in <span className="text-white font-medium">high-progesterone phases</span>. Lifestyle adherence during luteal phase correlates with <span className="text-green-400 font-medium">32% symptom reduction</span>.
                           </div>
                           <Separator className="bg-slate-700" />
                           <div className="space-y-2">
                              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Suggested Actions</p>
                              <Button variant="secondary" className="w-full justify-start text-xs h-8 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700">
                                <FileText className="w-3 h-3 mr-2" /> View Evidence Base
                              </Button>
                              <Button variant="secondary" className="w-full justify-start text-xs h-8 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700">
                                <TrendingUp className="w-3 h-3 mr-2" /> Compare Cohort Data
                              </Button>
                           </div>
                        </CardContent>
                     </Card>

                     <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-2">
                           <CardTitle className="text-base font-semibold text-slate-800">Shared Insight Layer</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <p className="text-xs text-slate-500 mb-4">Send a simplified explanation to the patient portal.</p>
                           
                           <div className="space-y-3">
                              <div className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                                 <p className="text-xs text-slate-700 font-medium mb-1">Recommendation:</p>
                                 <p className="text-sm text-slate-600">"Your body needs extra recovery time this week due to hormone shifts."</p>
                              </div>
                              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-xs">
                                Send to Patient <ArrowUpRight className="w-3 h-3 ml-2" />
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
