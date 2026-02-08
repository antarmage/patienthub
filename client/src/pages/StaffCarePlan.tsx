import React, { useState } from "react";
import { Link, useRoute } from "wouter";
import { 
  ArrowLeft,
  Info,
  Dna,
  Clock,
  Plus,
  Minus,
  Save,
  FlaskConical,
  Users,
  Activity,
  Brain,
  Dumbbell,
  FileText,
  Stethoscope,
  Utensils,
  AlertCircle,
  Heart,
  MinusCircle,
  Coffee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ListPlus, Trash2 } from "lucide-react";

// --- MOCK DATA (Should match StaffPortal for consistency) ---
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
    clinicianNote: "Referral: Dr. Reynolds. Patient struggles with insulin resistance. Focus on fiber intake and low glycemic load.",
    history: {
        diagnosis: "Diagnosed PCOS (2019), Insulin Resistance (2021).",
        medications: "Metformin 500mg, Ovasitol.",
        allergies: "Peanuts (Severe).",
        lifestyle: "Sedentary job, high stress. Sleeps 6 hours avg."
    }
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
    clinicianNote: "Referral: Dr. Reynolds. Confirmed Endo Stage II. Avoid inflammatory foods. Prioritize omega-3s for pain management.",
    history: {
        diagnosis: "Endometriosis Stage II (Laparoscopy 2023).",
        medications: "NSAIDs (PRN), Magnesium.",
        allergies: "None known.",
        lifestyle: "Active, yoga practitioner. Vegetarian."
    }
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
    clinicianNote: "Referral: Dr. Reynolds. GDM risk high. Strict sugar control needed. Monitor post-prandial spikes.",
    history: {
        diagnosis: "Pre-diabetic range HbA1c in first trimester.",
        medications: "Prenatal Vitamins, Iron.",
        allergies: "Dairy (Mild intolerance).",
        lifestyle: "Corporate job, moderate activity. Craves sweets."
    }
  }
];

export default function StaffCarePlan() {
  const [match, params] = useRoute("/staff/create-plan/:id?");
  const patientId = params?.id ? parseInt(params.id) : null;
  const initialPatient = patientId ? functionalMedicinePatients.find(p => p.id === patientId) : null;
  
  const [selectedPatient, setSelectedPatient] = useState<any>(initialPatient);
  
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
            <div>
                <h1 className="text-lg font-bold text-slate-900">Create Personalized Nutrition Plan</h1>
                <p className="text-xs text-slate-500">Design a functional nutrition protocol based on patient's genomic and metabolic profile.</p>
            </div>
        </div>
        <div className="flex gap-2">
             <Link href="/staff">
                <Button variant="outline" size="sm" className="bg-white border-slate-200">
                    Cancel
                </Button>
             </Link>
             <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                <Save className="w-4 h-4 mr-2" /> Create & Assign Plan
             </Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        
        {/* 1. Patient & Goal Selection */}
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900">Patient Context</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Select Patient</Label>
                        <Select 
                            value={selectedPatient?.id.toString()} 
                            onValueChange={(val) => {
                                const p = functionalMedicinePatients.find(pat => pat.id.toString() === val);
                                setSelectedPatient(p);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Search patient..." />
                            </SelectTrigger>
                            <SelectContent>
                                {functionalMedicinePatients.map(p => (
                                    <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.condition})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Plan Goal</Label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Primary Outcome..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="inflammation">Reduce Inflammation (hs-CRP)</SelectItem>
                                <SelectItem value="fertility">Boost Egg Quality</SelectItem>
                                <SelectItem value="gut">Gut Repair (4R Protocol)</SelectItem>
                                <SelectItem value="bloodsugar">Insulin Sensitivity</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Clinician Instructions (Dynamic) */}
                {selectedPatient && selectedPatient.clinicianNote && (
                    <div className="mt-4 bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 items-start">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-blue-800 uppercase mb-0.5">Clinician Instruction</p>
                            <p className="text-sm text-blue-700 leading-snug">{selectedPatient.clinicianNote}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* 2. Patient History & Clinical Intake */}
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-slate-600" />
                    <CardTitle className="text-base font-bold text-slate-900">Clinical Intake & History</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {selectedPatient?.history ? (
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                            <h4 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-2">Medical History (Pre-filled)</h4>
                            <div className="grid grid-cols-1 gap-2">
                                <div>
                                    <span className="text-xs font-medium text-slate-500 block">Diagnosis</span>
                                    <span className="text-sm text-slate-800">{selectedPatient.history.diagnosis}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-slate-500 block">Current Medications</span>
                                    <span className="text-sm text-slate-800">{selectedPatient.history.medications}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-slate-500 block">Allergies/Intolerances</span>
                                    <span className="text-sm text-slate-800">{selectedPatient.history.allergies}</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Dietary Recall (24h)</Label>
                                <Textarea placeholder="Note what the patient ate yesterday..." className="h-24 resize-none" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Weight History</Label>
                                    <Input placeholder="When did weight gain start?" className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Anxiety & Mood Meds</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Taking any anxiety meds?" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No, none</SelectItem>
                                            <SelectItem value="ssri">Yes, SSRIs</SelectItem>
                                            <SelectItem value="benzo">Yes, Benzodiazepines</SelectItem>
                                            <SelectItem value="herbal">Herbal / Natural Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Current Symptoms (Reported)</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="sym-bloating" />
                                        <label htmlFor="sym-bloating" className="text-sm text-slate-600">Bloating/Gas</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="sym-fatigue" />
                                        <label htmlFor="sym-fatigue" className="text-sm text-slate-600">Chronic Fatigue</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="sym-brainfog" />
                                        <label htmlFor="sym-brainfog" className="text-sm text-slate-600">Brain Fog</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="sym-cravings" />
                                        <label htmlFor="sym-cravings" className="text-sm text-slate-600">Sugar Cravings</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        Please select a patient to view and document their clinical history.
                    </div>
                )}
                
                <div className="space-y-2">
                    <Label>Consultation Notes</Label>
                    <Textarea placeholder="Key takeaways from today's session, specific goals discussed..." className="h-20" />
                </div>
            </CardContent>
        </Card>

        {/* 3. Lifestyle & Routine Assessment */}
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-600" />
                    <CardTitle className="text-base font-bold text-slate-900">Lifestyle & Routine Assessment</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Activity Level</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select activity level..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sedentary">Sedentary (Office Job)</SelectItem>
                                    <SelectItem value="light">Lightly Active (1-3 days/week)</SelectItem>
                                    <SelectItem value="moderate">Moderately Active (3-5 days/week)</SelectItem>
                                    <SelectItem value="active">Very Active (6-7 days/week)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Work Schedule</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select work pattern..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="9-5">Standard 9-5</SelectItem>
                                    <SelectItem value="shift">Shift Work / Night Shifts</SelectItem>
                                    <SelectItem value="flexible">Flexible / Remote</SelectItem>
                                    <SelectItem value="student">Student Schedule</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Typical Wake Time</Label>
                                <Input type="time" />
                            </div>
                            <div className="space-y-2">
                                <Label>Typical Bedtime</Label>
                                <Input type="time" />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>Sleep Quality</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="How do you sleep?" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="good">Good (Uninterrupted)</SelectItem>
                                    <SelectItem value="fair">Fair (Waking up 1-2 times)</SelectItem>
                                    <SelectItem value="poor">Poor (Insomnia / Restless)</SelectItem>
                                    <SelectItem value="apnea">Sleep Apnea (Diagnosed)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* 4. Dietary Preferences & Constraints */}
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-slate-600" />
                    <CardTitle className="text-base font-bold text-slate-900">Dietary Preferences & Constraints</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="space-y-6">
                    {/* Allergies & Sensitivities */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            Known Allergies & Sensitivities
                        </Label>
                        <Textarea 
                            placeholder="List confirmed allergies (e.g. Peanuts) or sensitivities (e.g. Dairy causes bloating)..." 
                            className="h-20 bg-rose-50/30 border-rose-100 focus:border-rose-300" 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Favorites & Non-Negotiables */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-pink-500" />
                                Favorites & Non-Negotiables
                            </Label>
                            <div className="space-y-2">
                                <Input placeholder="Must-have comfort foods..." className="bg-slate-50" />
                                <p className="text-[10px] text-slate-400">Foods the patient is unwilling to give up.</p>
                            </div>
                        </div>

                        {/* Aversions (Hates) */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <MinusCircle className="w-4 h-4 text-slate-500" />
                                Food Aversions (Dislikes)
                            </Label>
                            <div className="space-y-2">
                                <Input placeholder="Foods they absolutely hate..." className="bg-slate-50" />
                                <p className="text-[10px] text-slate-400">Foods to avoid in the meal plan.</p>
                            </div>
                        </div>
                    </div>

                    {/* Cravings & Addictions */}
                    <div className="space-y-3">
                         <Label className="flex items-center gap-2">
                            <Coffee className="w-4 h-4 text-amber-600" />
                            Cravings & Habits
                        </Label>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="flex items-center space-x-2 border border-slate-200 rounded p-3 hover:bg-slate-50 cursor-pointer">
                                <Checkbox id="crave-sugar" />
                                <label htmlFor="crave-sugar" className="text-sm font-medium leading-none cursor-pointer text-slate-700">Sugar / Sweets</label>
                            </div>
                            <div className="flex items-center space-x-2 border border-slate-200 rounded p-3 hover:bg-slate-50 cursor-pointer">
                                <Checkbox id="crave-caffeine" />
                                <label htmlFor="crave-caffeine" className="text-sm font-medium leading-none cursor-pointer text-slate-700">Caffeine</label>
                            </div>
                            <div className="flex items-center space-x-2 border border-slate-200 rounded p-3 hover:bg-slate-50 cursor-pointer">
                                <Checkbox id="crave-salty" />
                                <label htmlFor="crave-salty" className="text-sm font-medium leading-none cursor-pointer text-slate-700">Salty Snacks</label>
                            </div>
                             <div className="flex items-center space-x-2 border border-slate-200 rounded p-3 hover:bg-slate-50 cursor-pointer">
                                <Checkbox id="crave-soda" />
                                <label htmlFor="crave-soda" className="text-sm font-medium leading-none cursor-pointer text-slate-700">Soda / Fizzy</label>
                            </div>
                            <div className="col-span-2 flex items-center space-x-2 border border-slate-200 rounded p-3 hover:bg-slate-50">
                                <Checkbox id="habit-alcohol" className="mt-0.5" />
                                <div className="flex-1">
                                    <label htmlFor="habit-alcohol" className="text-sm font-medium leading-none cursor-pointer text-slate-700 block mb-1">Alcohol</label>
                                    <Input placeholder="How often? (e.g. 2x/week)" className="h-6 text-[10px] bg-white" />
                                </div>
                            </div>
                            <div className="col-span-2 flex items-center space-x-2 border border-slate-200 rounded p-3 hover:bg-slate-50">
                                <Checkbox id="habit-nicotine" className="mt-0.5" />
                                <div className="flex-1">
                                    <label htmlFor="habit-nicotine" className="text-sm font-medium leading-none cursor-pointer text-slate-700 block mb-1">Nicotine</label>
                                    <Input placeholder="How often? (e.g. 5/day)" className="h-6 text-[10px] bg-white" />
                                </div>
                            </div>
                        </div>
                        <Input placeholder="Other specific cravings or addictions..." className="mt-2" />
                    </div>
                </div>
                
                <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                    <Button className="bg-slate-900 text-white hover:bg-slate-800">
                        <Save className="w-4 h-4 mr-2" /> Save Intake & Proceed to Planning
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* 5. Genomic Modifiers */}
        <Card className="shadow-sm border-slate-200 bg-purple-50/30">
            <CardHeader className="py-4 border-b border-purple-100 bg-purple-50">
                <div className="flex items-center gap-2">
                    <Dna className="w-4 h-4 text-purple-600" />
                    <CardTitle className="text-base font-bold text-purple-900">Genomic Adjustments</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-6">
                    <div className="flex items-start space-x-2">
                        <Checkbox id="mthfr" />
                        <div className="grid gap-0.5 leading-none">
                            <label htmlFor="mthfr" className="text-sm font-medium text-slate-700 cursor-pointer">Methylation Support</label>
                            <p className="text-xs text-slate-500">For MTHFR variants</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Checkbox id="caffeine" />
                        <div className="grid gap-0.5 leading-none">
                            <label htmlFor="caffeine" className="text-sm font-medium text-slate-700 cursor-pointer">Caffeine Protocol</label>
                            <p className="text-xs text-slate-500">Slow metabolizer limit</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Checkbox id="gluten" />
                        <div className="grid gap-0.5 leading-none">
                            <label htmlFor="gluten" className="text-sm font-medium text-slate-700 cursor-pointer">Gluten Elimination</label>
                            <p className="text-xs text-slate-500">HLA-DQ2/DQ8</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* 6. Macronutrient Targets */}
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900">Macronutrient Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
                        <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Protein</p>
                        <p className="font-bold text-slate-900 text-2xl">30%</p>
                        <div className="w-full bg-slate-200 h-1.5 mt-3 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[30%]"></div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
                        <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Fats</p>
                        <p className="font-bold text-slate-900 text-2xl">40%</p>
                        <div className="w-full bg-slate-200 h-1.5 mt-3 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full w-[40%]"></div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
                        <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Carbs</p>
                        <p className="font-bold text-slate-900 text-2xl">30%</p>
                        <div className="w-full bg-slate-200 h-1.5 mt-3 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full w-[30%]"></div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* 7. Daily Schedule */}
        <div className="space-y-6">
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-sm font-bold text-slate-900 uppercase">Sleep Schedule</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                     <div className="grid grid-cols-2 gap-4">
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
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                     <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-bold text-slate-900">Daily Meal Structure</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <Tabs defaultValue="monday" className="w-full">
                        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-slate-200 rounded-none mb-6">
                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                                <TabsTrigger 
                                    key={day} 
                                    value={day.toLowerCase()}
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none px-4 py-2 text-slate-500"
                                >
                                    {day}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        
                        <div className="space-y-8">
                            {mealPlanItems.map((meal, index) => (
                                <div key={meal.id} className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-slate-900 text-sm">{meal.name}</h4>
                                        <div className="flex items-center text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                                            <span className="text-xs font-medium">{meal.time}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3 items-center">
                                        <div className="flex-1">
                                            <Input 
                                                defaultValue={meal.item || (index === 0 ? "Oatmeal with Flax & Berries" : index === 2 ? "Quinoa Salad with Chickpeas" : "")} 
                                                placeholder="Enter meal item..."
                                                className="rounded-full bg-white border-slate-200 text-sm h-10 px-4"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <Input 
                                                defaultValue={meal.qty || (index === 0 ? "1 bowl" : index === 2 ? "1 plate" : "")} 
                                                placeholder="Qty"
                                                className="rounded-full bg-white border-slate-200 text-sm h-10 px-4"
                                            />
                                        </div>
                                        <div className="w-40">
                                            <Input 
                                                defaultValue={meal.macros || (index === 0 ? "350kcal, 12g P" : index === 2 ? "450kcal, 18g P" : "")} 
                                                placeholder="Macros"
                                                className="rounded-full bg-white border-slate-200 text-sm h-10 px-4 text-slate-500"
                                            />
                                        </div>
                                        <div className="flex gap-1 ml-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50">
                                                <ListPlus className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50" onClick={() => removeMealItem(meal.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Tabs>
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                        <Button variant="outline" size="sm" className="text-slate-500 hover:text-indigo-600 hover:border-indigo-200" onClick={addMealItem}>
                            <Plus className="w-4 h-4 mr-2" /> Add Meal Slot
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
                 <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-center">
                         <CardTitle className="text-sm font-bold text-slate-900 uppercase">Functional Supplements</CardTitle>
                         <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600">+ Add Item</Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                        <div className="p-3 flex items-center justify-between bg-slate-50">
                            <span className="text-sm font-medium">Magnesium Glycinate</span>
                            <span className="text-xs text-slate-500">400mg • Bedtime</span>
                        </div>
                        <div className="p-3 flex items-center justify-between bg-slate-50">
                            <span className="text-sm font-medium">Omega-3 (EPA/DHA)</span>
                            <span className="text-xs text-slate-500">2g • With Lunch</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}