import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
    Calendar as CalendarIcon,
    Clock,
    ChevronRight,
    ArrowLeft,
    User,
    Search,
    CheckCircle2,
    Stethoscope,
    CreditCard,
    FileText,
    Copy,
    ExternalLink,
    Share2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export default function NewBooking() {
    const [_, setLocation] = useLocation();
    const [step, setStep] = useState(1);
    const [date, setDate] = useState<Date | undefined>(new Date());

    // Form State
    const [patientType, setPatientType] = useState("existing");
    const [selectedSlot, setSelectedSlot] = useState("");
    const [selectedService, setSelectedService] = useState("");
    const [selectedProvider, setSelectedProvider] = useState("");
    const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);
    const { toast } = useToast();

    const timeSlots = [
        "09:00 AM", "09:30 AM", "10:00 AM", "11:15 AM", "02:00 PM", "03:30 PM", "04:15 PM"
    ];

    const [searchQuery, setSearchQuery] = useState("");

    const { data: patientsData } = useQuery({
        queryKey: ['/api/patients'],
        queryFn: async () => {
            const res = await fetch('/api/patients');
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        }
    });
    const matchedPatients = useMemo(() => {
        if (!patientsData || !searchQuery) return patientsData || [];
        return patientsData.filter((p: any) =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [patientsData, searchQuery]);

    const { data: servicesData } = useQuery({
        queryKey: ['/api/services'],
        queryFn: async () => {
            const res = await fetch('/api/services');
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

    const services = useMemo(() => {
        if (!servicesData) return [];
        return servicesData.map((s: any) => ({
            id: s.serviceId || String(s.id),
            name: s.name,
            duration: s.duration,
            price: s.price,
        }));
    }, [servicesData]);

    const providers = useMemo(() => {
        if (!providersData) return [];
        return providersData.map((p: any) => ({
            id: p.name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, ''),
            name: p.name,
            role: p.role,
            avail: p.availability,
        }));
    }, [providersData]);

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const mutation = useMutation({
        mutationFn: async (apptData: any) => {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apptData),
            });
            if (!res.ok) throw new Error('Failed to create appointment');
            return res.json();
        },
        onSuccess: (data) => {
            setCreatedAppointmentId(data.id);
            setIsSuccess(true);
            toast({
                title: "Appointment Booked",
                description: "The appointment has been successfully scheduled.",
            });
        }
    });

    const handleConfirm = () => {
        if (!selectedPatientId || !selectedSlot || !date) {
            toast({
                title: "Missing Information",
                description: "Please ensure patient, date, and time are selected.",
                variant: "destructive"
            });
            return;
        }

        mutation.mutate({
            patientId: selectedPatientId,
            providerId: providersData?.find((p: any) => p.name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '') === selectedProvider)?.id || 1,
            serviceId: parseInt(selectedService) || 1,
            date: date.toISOString().split('T')[0],
            time: selectedSlot,
            status: "scheduled"
        });
    };

    const onboardingUrl = `${window.location.origin}/onboarding/${createdAppointmentId}`;

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setLocation("/staff")}>
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Button>
                        <h1 className="text-xl font-bold font-serif text-slate-900">Booking Confirmed</h1>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-6">
                    <Card className="max-w-2xl w-full border-indigo-100 shadow-xl overflow-hidden">
                        <div className="bg-indigo-600 p-8 text-center text-white">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                <CheckCircle2 className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-serif font-bold">Appointment Scheduled!</h2>
                            <p className="text-indigo-100 mt-2 opacity-90">Session ID: #{createdAppointmentId}</p>
                        </div>

                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Share2 className="w-5 h-5 text-indigo-600" />
                                    Share Patient Onboarding Link
                                </h3>
                                <p className="text-slate-500 text-sm">
                                    Copy this unique link and send it to the patient. They can use it to complete their medical history and chief complaint before the visit.
                                </p>

                                <div className="flex gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200 items-center">
                                    <code className="flex-1 text-sm font-mono text-indigo-700 break-all select-all">
                                        {onboardingUrl}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 bg-white"
                                        onClick={() => {
                                            navigator.clipboard.writeText(onboardingUrl);
                                            toast({ title: "Link Copied", description: "Copied to clipboard" });
                                        }}
                                    >
                                        <Copy className="w-4 h-4 mr-2" /> Copy
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="outline" className="h-12" onClick={() => window.open(onboardingUrl, '_blank')}>
                                    <ExternalLink className="w-4 h-4 mr-2" /> Preview Onboarding
                                </Button>
                                <Button className="h-12 bg-slate-900 hover:bg-black" onClick={() => setLocation("/staff")}>
                                    Done
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/staff")}>
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold font-serif text-slate-900">New Booking</h1>
                        <p className="text-xs text-slate-500">Schedule Appointment</p>
                    </div>
                </div>

                {/* Progress Stepper */}
                <div className="hidden md:flex items-center gap-2">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {s}
                            </div>
                            {s < 4 && <div className={`w-12 h-0.5 mx-2 transition-colors ${step > s ? 'bg-indigo-600' : 'bg-slate-200'}`} />}
                        </div>
                    ))}
                </div>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex gap-8">

                {/* Left Col - Form Content */}
                <div className="flex-1 space-y-6">

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-slate-900">Patient Details</h2>
                                <p className="text-slate-500">Who is this appointment for?</p>
                            </div>

                            <RadioGroup defaultValue="existing" value={patientType} onValueChange={setPatientType} className="grid grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="existing" id="existing" className="peer sr-only" />
                                    <Label
                                        htmlFor="existing"
                                        className="flex flex-col items-center justify-between rounded-xl border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-indigo-600 [&:has([data-state=checked])]:border-indigo-600 cursor-pointer transition-all"
                                    >
                                        <User className="mb-3 h-6 w-6 text-slate-600" />
                                        <span className="font-medium text-slate-900">Existing Patient</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="new" id="new" className="peer sr-only" />
                                    <Label
                                        htmlFor="new"
                                        className="flex flex-col items-center justify-between rounded-xl border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-indigo-600 [&:has([data-state=checked])]:border-indigo-600 cursor-pointer transition-all"
                                    >
                                        <div className="mb-3 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">+</div>
                                        <span className="font-medium text-slate-900">New Patient</span>
                                    </Label>
                                </div>
                            </RadioGroup>

                            {patientType === 'existing' ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <Input className="pl-9 h-11" placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} data-testid="input-patient-search" />
                                    </div>

                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {matchedPatients.slice(0, 5).map((p: any) => (
                                            <div
                                                key={p.id}
                                                className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${selectedPatientId === p.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                                                onClick={() => setSelectedPatientId(p.id)}
                                                data-testid={`patient-result-${p.id}`}
                                            >
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-indigo-200 text-indigo-700">{p.avatar || p.name?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                                                    <p className="text-xs text-slate-500">{p.type} • ID: #{p.id}</p>
                                                </div>
                                                {selectedPatientId === p.id && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                                            </div>
                                        ))}
                                        {matchedPatients.length === 0 && (
                                            <p className="text-sm text-slate-400 text-center py-4">No patients found</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>First Name</Label>
                                        <Input placeholder="Jane" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Last Name</Label>
                                        <Input placeholder="Doe" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input placeholder="(555) 000-0000" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input placeholder="jane@example.com" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-slate-900">Service & Provider</h2>
                                <p className="text-slate-500">What type of appointment is this?</p>
                            </div>

                            <div className="space-y-4">
                                <Label>Select Service</Label>
                                <div className="grid grid-cols-1 gap-3">
                                    {services.map((s: any) => (
                                        <div
                                            key={s.id}
                                            onClick={() => setSelectedService(s.id)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedService === s.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${selectedService === s.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Stethoscope className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                                                    <p className="text-xs text-slate-500">{s.duration}</p>
                                                </div>
                                            </div>
                                            <span className="font-medium text-slate-700">{s.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label>Select Provider</Label>
                                <Select onValueChange={setSelectedProvider} value={selectedProvider}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Any Available Provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                <span className="font-medium text-slate-900">{p.name}</span>
                                                <span className="text-slate-400 ml-2 text-xs">({p.role})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-slate-900">Date & Time</h2>
                                <p className="text-slate-500">When should we schedule this?</p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        className="rounded-md border-0"
                                    />
                                </div>

                                <div className="flex-1 w-full">
                                    <Label className="mb-3 block">Available Slots</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {timeSlots.map(time => (
                                            <Button
                                                key={time}
                                                variant={selectedSlot === time ? "default" : "outline"}
                                                className={`w-full justify-start ${selectedSlot === time ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-slate-600'}`}
                                                onClick={() => setSelectedSlot(time)}
                                            >
                                                <Clock className="w-4 h-4 mr-2 opacity-70" />
                                                {time}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea placeholder="Any specific requirements or symptoms..." className="min-h-[100px]" />
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-slate-900">Review & Confirm</h2>
                                <p className="text-slate-500">Please verify the appointment details</p>
                            </div>

                            <Card className="border-indigo-100 bg-indigo-50/20 shadow-none">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-start pb-4 border-b border-indigo-100">
                                        <div>
                                            <p className="text-xs text-indigo-500 uppercase font-bold tracking-wide">Patient</p>
                                            <p className="text-lg font-serif font-bold text-slate-900">{matchedPatients[0]?.name || "New Patient"}</p>
                                        </div>
                                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">{patientType === 'existing' ? 'Existing' : 'New'}</Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs text-indigo-500 uppercase font-bold tracking-wide mb-1">Service</p>
                                            <p className="font-medium text-slate-900">{services.find((s: any) => s.id?.toString() === selectedService)?.name || "Not selected"}</p>
                                            <p className="text-xs text-slate-500">{services.find((s: any) => s.id?.toString() === selectedService)?.duration || ""} mins</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-500 uppercase font-bold tracking-wide mb-1">Provider</p>
                                            <p className="font-medium text-slate-900">{providers.find((p: any) => p.id?.toString() === selectedProvider)?.name || "Not selected"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-500 uppercase font-bold tracking-wide mb-1">Date</p>
                                            <p className="font-medium text-slate-900">{date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-500 uppercase font-bold tracking-wide mb-1">Time</p>
                                            <p className="font-medium text-slate-900">{selectedSlot || "09:00 AM"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-sm">
                                <CreditCard className="w-5 h-5 shrink-0" />
                                <p>Payment of <span className="font-bold">$200</span> will be collected at the time of check-in.</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100 mt-8">
                        {step > 1 && (
                            <Button variant="outline" onClick={handleBack} size="lg">Back</Button>
                        )}
                        {step < 4 ? (
                            <Button
                                onClick={handleNext}
                                className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                                size="lg"
                                disabled={step === 2 && !selectedService}
                            >
                                Next Step
                            </Button>
                        ) : (
                            <Button
                                onClick={handleConfirm}
                                className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                                size="lg"
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? "Confirming..." : "Confirm Booking"}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Right Col - Summary/Help */}
                <div className="w-80 hidden lg:block space-y-6">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-500">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white">
                                <FileText className="w-3 h-3 mr-2" /> View Patient History
                            </Button>
                            <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white">
                                <CreditCard className="w-3 h-3 mr-2" /> Check Insurance Status
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
                        <h3 className="font-serif font-bold text-lg mb-2">Need Help?</h3>
                        <p className="text-indigo-100 text-sm mb-4">
                            Call the support line if you're having trouble with the scheduling system.
                        </p>
                        <p className="font-mono text-sm bg-white/20 p-2 rounded text-center">Ext. 4049</p>
                    </div>
                </div>

            </main>
        </div>
    );
}
