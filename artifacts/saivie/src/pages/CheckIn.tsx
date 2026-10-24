import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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

export default function CheckIn() {
  const { data: appointmentsData } = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      const res = await fetch('/api/appointments');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: patientsData } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: providersData } = useQuery({
    queryKey: ['/api/providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const upcomingAppointments = useMemo(() => {
    if (!appointmentsData || !patientsData || !providersData) return [];
    return appointmentsData.map((appt: any) => {
      const patient = patientsData.find((p: any) => p.id === appt.patientId);
      const provider = providersData.find((pr: any) => pr.id === appt.providerId);
      return {
        id: appt.id,
        name: patient?.name || 'Unknown',
        time: appt.time,
        type: appt.type,
        doctor: provider?.name || 'Unknown',
        status: appt.status,
        image: patient?.avatar || '??',
      };
    });
  }, [appointmentsData, patientsData, providersData]);
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [step, setStep] = useState(1); // 1: List, 2: Details/Confirm, 3: Success

  const filteredAppointments = upcomingAppointments.filter((app: any) => 
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
    <div className="min-h-screen bg-saivie-surface-muted flex flex-col font-sans text-saivie-plum">
      
      {/* Header */}
      <header className="bg-saivie-ivory border-b border-saivie-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/staff")}>
            <ArrowLeft className="w-5 h-5 text-saivie-plum" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-serif text-saivie-plum">Patient Check-In</h1>
            <p className="text-xs text-saivie-plum">Front Desk Kiosk Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                System Online
            </div>
            <div className="text-sm font-medium text-saivie-plum">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        
        {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-3xl font-serif text-saivie-plum">Who is arriving?</h2>
                    <p className="text-saivie-plum">Search for scheduled patients or scan QR code</p>
                </div>

                <div className="relative max-w-xl mx-auto">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-saivie-plum" />
                    <Input 
                        className="pl-12 h-12 text-lg shadow-sm border-saivie-border rounded-full"
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
                    {filteredAppointments.map((app: any) => (
                        <Card 
                            key={app.id} 
                            className="cursor-pointer hover:border-saivie-border hover:shadow-md transition-all group"
                            onClick={() => {
                                setSelectedAppointment(app);
                                setStep(2);
                            }}
                        >
                            <CardContent className="p-5 flex items-center gap-4">
                                <Avatar className="h-14 w-14 border-2 border-saivie-border group-hover:border-saivie-border transition-colors">
                                    <AvatarFallback className="bg-saivie-sage text-saivie-plum font-bold">{app.image}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg text-saivie-plum group-hover:text-saivie-teal transition-colors">{app.name}</h3>
                                        <Badge variant="outline" className={`${app.status === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-saivie-surface-muted text-saivie-plum'}`}>
                                            {app.time}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-saivie-plum flex items-center gap-1.5 mt-1">
                                        <User className="w-3.5 h-3.5" /> {app.doctor}
                                    </p>
                                    <p className="text-xs font-medium text-saivie-plum mt-1 uppercase tracking-wide">
                                        {app.type}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-saivie-teal" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )}

        {step === 2 && selectedAppointment && (
            <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
                <Card className="border-saivie-border shadow-lg overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-saivie-teal to-saivie-teal"></div>
                    <CardHeader className="text-center pb-2">
                        <Avatar className="h-24 w-24 mx-auto border-4 border-white shadow-sm mb-4">
                            <AvatarFallback className="bg-saivie-sage text-saivie-plum text-2xl font-bold">{selectedAppointment.image}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-2xl font-serif text-saivie-plum">{selectedAppointment.name}</CardTitle>
                        <CardDescription>Confirming arrival for {selectedAppointment.time} appointment</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-saivie-surface-muted p-4 rounded-xl border border-saivie-border text-center">
                                <p className="text-xs text-saivie-plum uppercase tracking-wide font-medium mb-1">Provider</p>
                                <p className="font-bold text-saivie-plum">{selectedAppointment.doctor}</p>
                            </div>
                            <div className="bg-saivie-surface-muted p-4 rounded-xl border border-saivie-border text-center">
                                <p className="text-xs text-saivie-plum uppercase tracking-wide font-medium mb-1">Service</p>
                                <p className="font-bold text-saivie-plum">{selectedAppointment.type}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-medium text-sm text-saivie-plum flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                Outstanding Actions
                            </h4>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-3">
                                <div className="mt-0.5 min-w-4 h-4 rounded border border-amber-400 bg-saivie-ivory" />
                                <div>
                                    <p className="text-sm font-medium text-amber-900">Update Insurance Information</p>
                                    <p className="text-xs text-amber-700">Card on file expired last month.</p>
                                </div>
                            </div>
                            <div className="bg-saivie-surface-muted border border-saivie-border rounded-lg p-3 flex items-start gap-3 opacity-60">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-saivie-plum line-through">Sign Consent Form</p>
                                    <p className="text-xs text-saivie-plum">Completed via Portal</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <div className="p-6 bg-saivie-surface-muted border-t border-saivie-border flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Cancel</Button>
                        <Button className="flex-1 bg-saivie-teal hover:bg-saivie-teal text-white shadow-saivie-teal shadow-md" onClick={handleCheckIn}>
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
                    <h2 className="text-3xl font-serif font-bold text-saivie-plum mb-2">You're all set!</h2>
                    <p className="text-saivie-plum">
                        <span className="font-bold text-saivie-plum">{selectedAppointment?.name}</span> has been checked in.
                    </p>
                    <p className="text-saivie-plum text-sm mt-2">
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
