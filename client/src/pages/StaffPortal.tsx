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
  Scale
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

// --- MOCK DATA ---
const patients = [
  { id: 1, name: "Ananya S.", age: 29, type: "Fertility", status: "Active Cycle", avatar: "AS", mood: "Anxious", weight: 68, hb: 11.2 },
  { id: 2, name: "Meera D.", age: 34, type: "Pregnancy", status: "Week 24", avatar: "MD", mood: "Stable", weight: 72, hb: 10.5 },
  { id: 3, name: "Sarah J.", age: 31, type: "Postpartum", status: "Week 6", avatar: "SJ", mood: "Depressed", weight: 65, hb: 12.0 },
  { id: 4, name: "Priya K.", age: 28, type: "PCOS", status: "Treatment", avatar: "PK", mood: "Stable", weight: 78, hb: 11.8 },
  { id: 5, name: "Elena R.", age: 36, type: "Fertility", status: "IUI Prep", avatar: "ER", mood: "Stressed", weight: 62, hb: 12.5 },
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

export default function StaffPortal() {
  const [activeRole, setActiveRole] = useState("nutritionist");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
                 <Button variant="secondary" className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} bg-slate-100 text-slate-900`}>
                    <Activity className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Dashboard"}
                 </Button>
                 <Button variant="ghost" className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} text-slate-500 hover:text-slate-900`}>
                    <Users className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "My Patients"}
                 </Button>
                 <Button variant="ghost" className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} text-slate-500 hover:text-slate-900`}>
                    <CalendarCheck className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Schedule"}
                 </Button>
                 <Button variant="ghost" className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} text-slate-500 hover:text-slate-900`}>
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
            
            {/* 1. NUTRITIONIST VIEW */}
            {activeRole === 'nutritionist' && (
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
