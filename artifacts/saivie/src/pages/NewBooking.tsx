import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    Share2,
    Building2,
    Home,
    Video
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

function providerInitials(name: string) {
    return name
        .replace(/^dr\.?\s+/i, "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "DR";
}

function providerPhoto(provider: { photoUrl?: string; photo?: string; image?: string; avatar?: string }) {
    return [provider.photoUrl, provider.photo, provider.image, provider.avatar].find(
        (value) => typeof value === "string" && /^(https?:\/\/|\/|data:image\/)/.test(value)
    );
}

export default function NewBooking() {
    const [_, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [date, setDate] = useState<Date | undefined>(new Date());

    // Form State
    const [patientType, setPatientType] = useState("existing");
    const [selectedTime, setSelectedTime] = useState("");
    const [selectedService, setSelectedService] = useState("");
    const [selectedProvider, setSelectedProvider] = useState("");
    const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
    const [visitMode, setVisitMode] = useState("in-clinic");
    const [isSuccess, setIsSuccess] = useState(false);
    const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);
    const [createdTelemedicineLink, setCreatedTelemedicineLink] = useState<string | null>(null);
    const { toast } = useToast();

    const formatAppointmentTime = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        const period = hours >= 12 ? "PM" : "AM";
        return `${String(hours % 12 || 12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
    };

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
        queryKey: ['/api/billing-catalog'],
        queryFn: async () => {
            const res = await fetch('/api/billing-catalog');
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
        const active = servicesData.filter((s: any) => s.isActive !== false);
        const visitItems = active.filter((s: any) => /consult|scan|usg|ultra/i.test(s.category || ''));
        return (visitItems.length > 0 ? visitItems : active)
            .map((s: any) => ({
                id: String(s.id),
                name: s.name,
                price: Number(s.price) || 0,
                duration: '',
            }));
    }, [servicesData]);

    const providers = useMemo(() => {
        if (!providersData) return [];
        return providersData.map((p: any) => ({
            id: p.name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, ''),
            name: p.name,
            role: p.role || p.specialty,
            photo: providerPhoto(p),
            initials: providerInitials(p.name || ""),
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
            queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
            setCreatedAppointmentId(data.id);
            setCreatedTelemedicineLink(data.telemedicineLink || null);
            setIsSuccess(true);
            toast({
                title: "Appointment Booked",
                description: "The appointment has been successfully scheduled.",
            });
        },
        onError: (err: Error) => {
            toast({ title: "Booking failed", description: err.message, variant: "destructive" });
        }
    });

    const handleConfirm = () => {
        if (!selectedPatientId || !selectedTime || !date) {
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
            type: services.find((s: any) => s.id === selectedService)?.name,
            visitType: services.find((s: any) => s.id === selectedService)?.name,
            date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            time: formatAppointmentTime(selectedTime),
            status: "scheduled",
            visitMode,
        });
    };

    const onboardingUrl = `${window.location.origin}/onboarding/${createdAppointmentId}`;

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-saivie-surface-muted flex flex-col font-sans">
                <header className="bg-saivie-ivory border-b border-saivie-border px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setLocation("/staff")}>
                            <ArrowLeft className="w-5 h-5 text-saivie-plum" />
                        </Button>
                        <h1 className="text-xl font-bold font-serif text-saivie-plum">Booking Confirmed</h1>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-6">
                    <Card className="max-w-2xl w-full border-saivie-border shadow-xl overflow-hidden">
                        <div className="bg-saivie-teal p-8 text-center text-white">
                            <div className="w-16 h-16 bg-saivie-ivory/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                <CheckCircle2 className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-serif font-bold">Appointment Scheduled!</h2>
                            <p className="text-saivie-sage mt-2 opacity-90">Session ID: #{createdAppointmentId}</p>
                        </div>

                        <CardContent className="p-8 space-y-8">
                            {createdTelemedicineLink && (
                                <div className="space-y-3 p-5 bg-saivie-surface-muted border border-saivie-border rounded-xl">
                                    <h3 className="text-base font-bold text-saivie-plum flex items-center gap-2">
                                        <Video className="w-5 h-5 text-saivie-teal" />
                                        Video Consultation Link
                                    </h3>
                                    <p className="text-saivie-plum text-sm">
                                        This secure Jitsi Meet link has been sent to the patient via WhatsApp. Share it again if needed.
                                    </p>
                                    <div className="flex gap-2 items-center bg-saivie-ivory rounded-lg border border-saivie-border p-3">
                                        <code className="flex-1 text-xs font-mono text-saivie-teal break-all select-all">{createdTelemedicineLink}</code>
                                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => {
                                            navigator.clipboard.writeText(createdTelemedicineLink);
                                            toast({ title: "Link Copied", description: "Telemedicine link copied" });
                                        }}>
                                            <Copy className="w-3 h-3 mr-1" /> Copy
                                        </Button>
                                    </div>
                                    <Button size="sm" variant="outline" className="w-full border-saivie-border text-saivie-teal" onClick={() => window.open(createdTelemedicineLink, '_blank')}>
                                        <ExternalLink className="w-3 h-3 mr-2" /> Open Video Room
                                    </Button>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-saivie-plum flex items-center gap-2">
                                    <Share2 className="w-5 h-5 text-saivie-teal" />
                                    Share Patient Onboarding Link
                                </h3>
                                <p className="text-saivie-plum text-sm">
                                    Copy this unique link and send it to the patient. They can use it to complete their medical history and chief complaint before the visit.
                                </p>

                                <div className="flex gap-2 p-4 bg-saivie-surface-muted rounded-xl border border-saivie-border items-center">
                                    <code className="flex-1 text-sm font-mono text-saivie-teal break-all select-all">
                                        {onboardingUrl}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 bg-saivie-ivory"
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
                                <Button className="h-12 bg-saivie-plum hover:bg-black" onClick={() => setLocation("/staff")}>
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
        <div className="min-h-screen bg-saivie-surface-muted flex flex-col font-sans text-saivie-plum">

            {/* Header */}
            <header className="bg-saivie-ivory border-b border-saivie-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/staff")}>
                        <ArrowLeft className="w-5 h-5 text-saivie-plum" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold font-serif text-saivie-plum">New Booking</h1>
                        <p className="text-xs text-saivie-plum">Schedule Appointment</p>
                    </div>
                </div>

                {/* Progress Stepper */}
                <div className="hidden md:flex items-center gap-1">
                    {["Patient", "Service", "Doctor", "Visit", "Schedule", "Review"].map((label, index) => {
                        const s = index + 1;
                        return (
                            <div key={label} className="flex items-center">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-saivie-teal text-white' : 'bg-saivie-sage text-saivie-plum'}`}>
                                        {s}
                                    </div>
                                    <span className={`text-xs font-medium ${step >= s ? 'text-saivie-teal' : 'text-saivie-plum'}`}>{label}</span>
                                </div>
                                {s < 6 && <div className={`w-4 h-0.5 mx-1.5 transition-colors ${step > s ? 'bg-saivie-teal' : 'bg-saivie-sage'}`} />}
                            </div>
                        );
                    })}
                </div>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex gap-8">

                {/* Left Col - Form Content */}
                <div className="flex-1 space-y-6">

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-saivie-plum">Patient Details</h2>
                                <p className="text-saivie-plum">Who is this appointment for?</p>
                            </div>

                            <RadioGroup defaultValue="existing" value={patientType} onValueChange={setPatientType} className="grid grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="existing" id="existing" className="peer sr-only" />
                                    <Label
                                        htmlFor="existing"
                                        className="flex flex-col items-center justify-between rounded-xl border-2 border-saivie-border bg-saivie-ivory p-4 hover:bg-saivie-surface-muted peer-data-[state=checked]:border-saivie-teal [&:has([data-state=checked])]:border-saivie-teal cursor-pointer transition-all"
                                    >
                                        <User className="mb-3 h-6 w-6 text-saivie-plum" />
                                        <span className="font-medium text-saivie-plum">Existing Patient</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="new" id="new" className="peer sr-only" />
                                    <Label
                                        htmlFor="new"
                                        className="flex flex-col items-center justify-between rounded-xl border-2 border-saivie-border bg-saivie-ivory p-4 hover:bg-saivie-surface-muted peer-data-[state=checked]:border-saivie-teal [&:has([data-state=checked])]:border-saivie-teal cursor-pointer transition-all"
                                    >
                                        <div className="mb-3 h-6 w-6 rounded-full bg-saivie-sage flex items-center justify-center text-saivie-plum">+</div>
                                        <span className="font-medium text-saivie-plum">New Patient</span>
                                    </Label>
                                </div>
                            </RadioGroup>

                            {patientType === 'existing' ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-saivie-plum" />
                                        <Input className="pl-9 h-11" placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} data-testid="input-patient-search" />
                                    </div>

                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {matchedPatients.slice(0, 5).map((p: any) => (
                                            <div
                                                key={p.id}
                                                className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${selectedPatientId === p.id ? 'border-saivie-teal bg-saivie-surface-muted' : 'border-saivie-border bg-saivie-ivory hover:bg-saivie-surface-muted'}`}
                                                onClick={() => setSelectedPatientId(p.id)}
                                                data-testid={`patient-result-${p.id}`}
                                            >
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-saivie-sage text-saivie-teal">{p.avatar || p.name?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-bold text-saivie-plum text-sm">{p.name}</p>
                                                    <p className="text-xs text-saivie-plum">{p.type} • ID: #{p.id}</p>
                                                </div>
                                                {selectedPatientId === p.id && <CheckCircle2 className="w-5 h-5 text-saivie-teal" />}
                                            </div>
                                        ))}
                                        {matchedPatients.length === 0 && (
                                            <p className="text-sm text-saivie-plum text-center py-4">No patients found</p>
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
                                <h2 className="text-2xl font-serif font-bold text-saivie-plum">Service</h2>
                                <p className="text-saivie-plum">What type of appointment is this?</p>
                            </div>

                            <div className="space-y-4">
                                <Label>Select Service</Label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {services.map((s: any) => (
                                        <button
                                            type="button"
                                            key={s.id}
                                            onClick={() => setSelectedService(s.id)}
                                            aria-pressed={selectedService === s.id}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal focus-visible:ring-offset-2 ${selectedService === s.id ? 'border-saivie-teal bg-saivie-surface-muted/30' : 'border-saivie-border bg-saivie-ivory hover:border-saivie-border'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${selectedService === s.id ? 'bg-saivie-sage text-saivie-teal' : 'bg-saivie-sage text-saivie-plum'}`}>
                                                    <Stethoscope className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-saivie-plum text-sm">{s.name}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-saivie-plum">Doctor</h2>
                                <p className="text-saivie-plum">Who should see this patient?</p>
                            </div>

                            <div className="space-y-4">
                                <Label>Select Provider</Label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {providers.map((p: any) => (
                                        <button
                                            type="button"
                                            key={p.id}
                                            onClick={() => setSelectedProvider(p.id)}
                                            aria-pressed={selectedProvider === p.id}
                                            className={`overflow-hidden rounded-xl border-2 cursor-pointer transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal focus-visible:ring-offset-2 ${selectedProvider === p.id ? 'border-saivie-teal bg-saivie-surface-muted/30' : 'border-saivie-border bg-saivie-ivory hover:border-saivie-border'}`}
                                        >
                                            <div className="aspect-[4/3] w-full bg-saivie-sage">
                                                {p.photo ? (
                                                    <img src={p.photo} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center font-serif text-3xl font-bold text-saivie-teal">
                                                        {p.initials}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <p className="font-bold text-saivie-plum text-sm leading-snug">{p.name}</p>
                                                {p.role && <p className="text-xs text-saivie-plum mt-1">{p.role}</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-saivie-plum">Visit Mode</h2>
                                <p className="text-saivie-plum">How will this appointment happen?</p>
                            </div>

                            <div className="space-y-3">
                                <Label>Visit Mode</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: "in-clinic", label: "In-Clinic", icon: Building2, desc: "Visit the clinic" },
                                        { value: "home-visit", label: "Home Visit", icon: Home, desc: "Doctor comes to you" },
                                        { value: "telemedicine", label: "Video Call", icon: Video, desc: "Online consultation" },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setVisitMode(opt.value)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${visitMode === opt.value ? 'border-saivie-teal bg-saivie-surface-muted' : 'border-saivie-border bg-saivie-ivory hover:border-saivie-border'}`}
                                            data-testid={`btn-visit-mode-${opt.value}`}
                                        >
                                            <opt.icon className={`w-6 h-6 ${visitMode === opt.value ? 'text-saivie-teal' : 'text-saivie-plum'}`} />
                                            <div>
                                                <p className={`font-bold text-sm ${visitMode === opt.value ? 'text-saivie-teal' : 'text-saivie-plum'}`}>{opt.label}</p>
                                                <p className="text-xs text-saivie-plum">{opt.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {visitMode === "telemedicine" && (
                                    <p className="text-xs text-saivie-teal bg-saivie-surface-muted px-3 py-2 rounded-lg flex items-center gap-2">
                                        <Video className="w-3 h-3" /> A secure video link (Jitsi Meet) will be generated and sent to the patient via WhatsApp.
                                    </p>
                                )}
                                {visitMode === "home-visit" && (
                                    <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2">
                                        <Home className="w-3 h-3" /> Ensure patient address is on file. Additional home visit charges may apply.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-saivie-plum">Date & Time</h2>
                                <p className="text-saivie-plum">When should we schedule this?</p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="border border-saivie-border rounded-xl bg-saivie-ivory p-4 shadow-sm">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        className="rounded-md border-0"
                                    />
                                </div>

                                <div className="flex-1 w-full">
                                    <Label htmlFor="appointment-time" className="mb-3 block">Appointment Time</Label>
                                    <div className="max-w-xs">
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saivie-plum" />
                                            <Input
                                                id="appointment-time"
                                                type="time"
                                                value={selectedTime}
                                                onChange={(event) => setSelectedTime(event.target.value)}
                                                className="pl-10"
                                                required
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-saivie-plum">Choose any appointment time; it does not have to match a preset slot.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea placeholder="Any specific requirements or symptoms..." className="min-h-[100px]" />
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-saivie-plum">Review & Confirm</h2>
                                <p className="text-saivie-plum">Please verify the appointment details</p>
                            </div>

                            <Card className="border-saivie-border bg-saivie-surface-muted/20 shadow-none">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-start pb-4 border-b border-saivie-border">
                                        <div>
                                            <p className="text-xs text-saivie-teal uppercase font-bold tracking-wide">Patient</p>
                                            <p className="text-lg font-serif font-bold text-saivie-plum">{matchedPatients[0]?.name || "New Patient"}</p>
                                        </div>
                                        <Badge className="bg-saivie-sage text-saivie-teal hover:bg-saivie-sage">{patientType === 'existing' ? 'Existing' : 'New'}</Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs text-saivie-teal uppercase font-bold tracking-wide mb-1">Service</p>
                                            <p className="font-medium text-saivie-plum">{services.find((s: any) => s.id?.toString() === selectedService)?.name || "Not selected"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-saivie-teal uppercase font-bold tracking-wide mb-1">Provider</p>
                                            {(() => {
                                                const provider = providers.find((p: any) => p.id?.toString() === selectedProvider);
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        {provider?.photo && (
                                                            <img src={provider.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                                                        )}
                                                        <p className="font-medium text-saivie-plum">{provider?.name || "Not selected"}</p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div>
                                            <p className="text-xs text-saivie-teal uppercase font-bold tracking-wide mb-1">Date</p>
                                            <p className="font-medium text-saivie-plum">{date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-saivie-teal uppercase font-bold tracking-wide mb-1">Time</p>
                                            <p className="font-medium text-saivie-plum">{selectedTime ? formatAppointmentTime(selectedTime) : "Not selected"}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-saivie-teal uppercase font-bold tracking-wide mb-1">Visit Mode</p>
                                            <p className="font-medium text-saivie-plum flex items-center gap-2">
                                                {visitMode === "telemedicine" ? <><Video className="w-4 h-4 text-saivie-teal" /> Video Consultation</> :
                                                 visitMode === "home-visit" ? <><Home className="w-4 h-4 text-amber-500" /> Home Visit</> :
                                                 <><Building2 className="w-4 h-4 text-saivie-plum" /> In-Clinic</>}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-sm">
                                <CreditCard className="w-5 h-5 shrink-0" />
                                <p>
                                    {(() => {
                                        const price = services.find((s: any) => s.id === selectedService)?.price;
                                        return price
                                            ? <>Payment of <span className="font-bold">₹{price.toLocaleString("en-IN")}</span> will be collected at the time of check-in.</>
                                            : "Payment will be collected at the time of check-in.";
                                    })()}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-saivie-border mt-8">
                        {step > 1 && (
                            <Button variant="outline" onClick={handleBack} size="lg">Back</Button>
                        )}
                        {step < 6 ? (
                            <Button
                                onClick={handleNext}
                                className="ml-auto bg-saivie-teal hover:bg-saivie-teal text-white min-w-[140px]"
                                size="lg"
                                disabled={(step === 2 && !selectedService) || (step === 3 && !selectedProvider)}
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
                    <Card className="bg-saivie-surface-muted border-saivie-border">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wide text-saivie-plum">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start text-xs h-9 bg-saivie-ivory">
                                <FileText className="w-3 h-3 mr-2" /> View Patient History
                            </Button>
                            <Button variant="outline" className="w-full justify-start text-xs h-9 bg-saivie-ivory">
                                <CreditCard className="w-3 h-3 mr-2" /> Check Insurance Status
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="rounded-xl bg-gradient-to-br from-saivie-teal to-saivie-teal p-6 text-white">
                        <h3 className="font-serif font-bold text-lg mb-2">Need Help?</h3>
                        <p className="text-saivie-sage text-sm mb-4">
                            Call the support line if you're having trouble with the scheduling system.
                        </p>
                        <p className="font-mono text-sm bg-saivie-ivory/20 p-2 rounded text-center">Ext. 4049</p>
                    </div>
                </div>

            </main>
        </div>
    );
}
