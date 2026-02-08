import React, { useState } from "react";
import { useLocation } from "wouter";
import { 
  Search, 
  CheckCircle2, 
  User, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  ScanLine,
  Activity,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Mock Data
const upcomingAppointments = [
  { id: 1, name: "Ananya S.", time: "09:00", type: "Fertility Scan", doctor: "Dr. Reynolds", status: "On Time", image: "AS" },
  { id: 2, name: "Meera D.", time: "09:30", type: "Antenatal Check", doctor: "Dr. Reynolds", status: "Late", image: "MD" },
  { id: 3, name: "Sarah J.", time: "10:00", type: "Postpartum Review", doctor: "Dr. Reynolds", status: "On Time", image: "SJ" },
  { id: 4, name: "Priya K.", time: "11:00", type: "Diet Consult", doctor: "Ms. Gupta", status: "On Time", image: "PK" },
];

export default function CheckIn() {
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [step, setStep] = useState(1); // 1: List, 2: Details/Confirm, 3: Success

  const filteredAppointments = upcomingAppointments.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCheckIn = () => {
    // Simulate check-in process
    setTimeout(() => {
        setStep(3);
    }, 500);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedAppointment(null);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/staff")}>
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-serif text-slate-900">Patient Check-In</h1>
            <p className="text-xs text-slate-500">Front Desk Kiosk Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                System Online
            </div>
            <div className="text-sm font-medium text-slate-600">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        
        {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-3xl font-serif text-slate-800">Who is arriving?</h2>
                    <p className="text-slate-500">Search for scheduled patients or scan QR code</p>
                </div>

                <div className="relative max-w-xl mx-auto">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <Input 
                        className="pl-12 h-12 text-lg shadow-sm border-slate-300 rounded-full" 
                        placeholder="Search by name or phone..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <Button className="absolute right-1.5 top-1.5 rounded-full px-4" size="sm">
                        <ScanLine className="w-4 h-4 mr-2" /> Scan QR
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    {filteredAppointments.map(app => (
                        <Card 
                            key={app.id} 
                            className="cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
                            onClick={() => {
                                setSelectedAppointment(app);
                                setStep(2);
                            }}
                        >
                            <CardContent className="p-5 flex items-center gap-4">
                                <Avatar className="h-14 w-14 border-2 border-slate-100 group-hover:border-indigo-100 transition-colors">
                                    <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">{app.image}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-700 transition-colors">{app.name}</h3>
                                        <Badge variant="outline" className={`${app.status === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600'}`}>
                                            {app.time}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                                        <User className="w-3.5 h-3.5" /> {app.doctor}
                                    </p>
                                    <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">
                                        {app.type}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )}

        {step === 2 && selectedAppointment && (
            <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
                <Card className="border-slate-200 shadow-lg overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                    <CardHeader className="text-center pb-2">
                        <Avatar className="h-24 w-24 mx-auto border-4 border-white shadow-sm mb-4">
                            <AvatarFallback className="bg-slate-100 text-slate-700 text-2xl font-bold">{selectedAppointment.image}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-2xl font-serif text-slate-900">{selectedAppointment.name}</CardTitle>
                        <CardDescription>Confirming arrival for {selectedAppointment.time} appointment</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Provider</p>
                                <p className="font-bold text-slate-800">{selectedAppointment.doctor}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Service</p>
                                <p className="font-bold text-slate-800">{selectedAppointment.type}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-medium text-sm text-slate-900 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                Outstanding Actions
                            </h4>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-3">
                                <div className="mt-0.5 min-w-4 h-4 rounded border border-amber-400 bg-white" />
                                <div>
                                    <p className="text-sm font-medium text-amber-900">Update Insurance Information</p>
                                    <p className="text-xs text-amber-700">Card on file expired last month.</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3 opacity-60">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700 line-through">Sign Consent Form</p>
                                    <p className="text-xs text-slate-500">Completed via Portal</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Cancel</Button>
                        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 shadow-md" onClick={handleCheckIn}>
                            Confirm Check-In
                        </Button>
                    </div>
                </Card>
            </div>
        )}

        {step === 3 && (
            <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2">You're all set!</h2>
                    <p className="text-slate-600">
                        <span className="font-bold text-slate-900">{selectedAppointment?.name}</span> has been checked in.
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        Notified {selectedAppointment?.doctor}
                    </p>
                </div>
                <div className="pt-8">
                    <Button onClick={handleReset} variant="outline" className="min-w-[200px]">
                        Process Next Patient
                    </Button>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
