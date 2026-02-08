import React, { useState } from "react";
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
  Clock
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

// --- MOCK DATA (Should match StaffPortal for consistency) ---
const patients = [
  { 
    id: 101, 
    name: "Ananya S.", 
    age: 29, 
    condition: "PCOS (Insulin Resistant)", 
    avatar: "AS",
    meta: {
      phase: "Luteal Phase (Day 22)",
      bmr: 1450,
      tdee: 1850,
      weight: "68.2 kg",
      height: "165 cm",
      bmi: "25.0",
      activity: "Moderate (Yoga 3x/week)"
    },
    labs: {
        hscrp: { value: 3.2, status: "High", range: "< 1.0", name: "hs-CRP" },
        insulin: { value: 12.5, status: "Elevated", range: "< 10.0", name: "Fasting Insulin" },
        hba1c: { value: 5.7, status: "Borderline", range: "< 5.7", name: "HbA1c" },
        vitd: { value: 22, status: "Low", range: "30-100", name: "Vitamin D" }
    },
    clinicianNote: "Referral: Dr. Reynolds. Patient struggles with insulin resistance. Focus on fiber intake and low glycemic load."
  },
   { 
    id: 102, 
    name: "Priya K.", 
    age: 28, 
    condition: "Endometriosis Stage II", 
    avatar: "PK",
    meta: {
      phase: "Follicular Phase (Day 5)",
      bmr: 1380,
      tdee: 1700,
      weight: "62.0 kg",
      height: "162 cm",
      bmi: "23.6",
      activity: "Sedentary"
    },
    labs: {
        hscrp: { value: 5.8, status: "Critical", range: "< 1.0", name: "hs-CRP" },
        ca125: { value: 45, status: "High", range: "< 35", name: "CA-125" },
        estradiol: { value: 180, status: "Normal", range: "30-400", name: "Estradiol" }
    },
    clinicianNote: "Referral: Dr. Reynolds. Confirmed Endo Stage II. Avoid inflammatory foods. Prioritize omega-3s for pain management."
  }
];

export default function StaffPatientProtocol() {
  const [match, params] = useRoute("/staff/protocol/:id");
  const patientId = params?.id ? parseInt(params.id) : null;
  const patient = patients.find(p => p.id === patientId) || patients[0]; // Fallback for demo

  const [mealPlanItems, setMealPlanItems] = useState([
    { id: 1, time: "08:00", name: "Breakfast", item: "Oatmeal with Flax & Berries", qty: "1 bowl", macros: "350kcal, 12g P" },
    { id: 2, time: "11:00", name: "Morning Snack", item: "Walnuts (Soaked)", qty: "5-6 pcs", macros: "120kcal, 4g P" },
    { id: 3, time: "13:00", name: "Lunch", item: "Quinoa Salad with Chickpeas", qty: "1 plate", macros: "450kcal, 18g P" },
    { id: 4, time: "16:00", name: "Afternoon Snack", item: "Green Tea + Apple", qty: "1 cup", macros: "80kcal, 0g P" },
    { id: 5, time: "19:30", name: "Dinner", item: "Lentil Soup + Steamed Veg", qty: "1 bowl", macros: "320kcal, 15g P" }
  ]);

  const totalCalories = 1320; // Mock calculation
  const targetCalories = patient.meta.tdee - 300; // Deficit goal

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
             <Button className="bg-slate-900 text-white hover:bg-slate-800" size="sm">
                <Save className="w-4 h-4 mr-2" /> Save Protocol
             </Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
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
                            <span className="font-bold text-sm truncate">{patient.meta.phase.split(' ')[0]}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Day {patient.meta.phase.split('Day ')[1]?.replace(')', '')}</p>
                    </CardContent>
                 </Card>

                 <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex flex-col justify-center h-full">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-1">Energy Exp (TDEE)</p>
                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                            <Flame className="w-4 h-4" />
                            <span className="font-bold text-lg">{patient.meta.tdee}</span>
                            <span className="text-xs font-normal text-slate-500">kcal</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Activity: {patient.meta.activity.split(' ')[0]}</p>
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
                                <p className="text-sm font-bold text-slate-800">{patient.meta.weight}</p>
                                <p className="text-[10px] text-slate-400">Weight</p>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-bold text-slate-800">{patient.meta.bmi}</p>
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
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600 h-7">View Full Report</Button>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {Object.entries(patient.labs).map(([key, data]: [string, any]) => (
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
                        <Select defaultValue="inflammation">
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
                        <Select defaultValue={patient.id === 101 ? "anti-inflammatory" : "low-histamine"}>
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
             <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold text-slate-900 font-serif">Daily Meal Plan</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">Customize meals based on caloric needs and phase.</p>
                </div>
                <div className="flex items-center gap-4">
                     <div className="text-right">
                         <p className="text-[10px] uppercase font-bold text-slate-400">Planned</p>
                         <p className={`text-sm font-bold ${totalCalories > targetCalories ? 'text-amber-600' : 'text-slate-700'}`}>
                             {totalCalories} / {targetCalories} kcal
                         </p>
                     </div>
                     <Button size="sm" variant="outline" className="bg-white text-slate-600 border-slate-200">
                        <Calendar className="w-4 h-4 mr-2" /> Copy to Week
                     </Button>
                </div>
             </CardHeader>
             <CardContent className="p-0">
                 <div className="grid grid-cols-1 divide-y divide-slate-100">
                    {mealPlanItems.map((meal) => (
                        <div key={meal.id} className="p-4 hover:bg-slate-50/50 group transition-colors">
                            {/* Card Header-like Row */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-800">{meal.name}</span>
                                <div className="inline-flex items-center">
                                    <Clock className="w-3 h-3 mr-1.5 text-slate-400" />
                                    <Input 
                                        defaultValue={meal.time}
                                        className="h-6 w-16 text-[10px] font-mono bg-white border-slate-200 text-slate-600 px-1 text-center focus:border-indigo-500"
                                        placeholder="00:00"
                                    />
                                </div>
                            </div>
                            
                            {/* Inputs Row */}
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-6">
                                    <Input 
                                        defaultValue={meal.item} 
                                        className="h-9 bg-white border-slate-200 focus:border-indigo-500 text-sm font-medium" 
                                        placeholder="Enter meal description..."
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input 
                                        defaultValue={meal.qty} 
                                        className="h-9 bg-white border-slate-200 text-xs text-slate-600" 
                                        placeholder="Qty (e.g., 1 bowl)"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input 
                                        defaultValue={meal.macros} 
                                        className="h-9 bg-white border-slate-200 text-xs text-slate-500 font-mono" 
                                        placeholder="Macros"
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-rose-500">
                                        <AlertCircle className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <div className="p-3 bg-slate-50/50 text-center">
                        <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:bg-indigo-50">
                            + Add Meal Slot
                        </Button>
                    </div>
                 </div>
             </CardContent>
        </Card>

      </main>
    </div>
  );
}
