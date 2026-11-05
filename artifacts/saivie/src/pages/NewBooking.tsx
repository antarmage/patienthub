import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { authenticatedFetch as fetch } from "@/lib/authenticatedFetch";
import { readApiResponse } from "@/lib/authenticatedFetch";
import { OnlineConsultationActions } from "@/components/OnlineConsultationActions";
import { OnboardingLink } from "@/components/OnboardingLink";
import {
    Calendar as CalendarIcon,
    ChevronRight,
    ArrowLeft,
    User,
    Search,
    CheckCircle2,
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
import { bookingDateKey, emptyNewPatientDraft, formatAppointmentTime, missingBookingFields, newPatientPayload, type NewPatientDraft } from "@/lib/bookingDraft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BookingScheduleSelection } from "@/components/BookingScheduleSelection";
import { validBookingTime } from "@/lib/bookingSchedule";
import { BookingPatientAvatar } from "@/components/BookingPatientAvatar";
import { BookingServiceSelection } from "@/components/BookingServiceSelection";
import { BookingDoctorSelection, type BookingDoctor } from "@/components/BookingDoctorSelection";
import { BookingVisitSelection } from "@/components/BookingVisitSelection";
import { bookingVisitContext, bookingVisitModeLabel, type BookingVisitReason } from "@/lib/bookingVisit";
import type { BookingService } from "@/lib/bookingServices";
import { Separator } from "@/components/ui/separator";
import { getArrivalState, type ArrivalState } from "@/components/ReceptionDashboard";
import { bookingPatientCategory, bookingPatientFilters, filterBookingPatients, findBookingPhoneMatches, type BookingPatientFilter } from "@/lib/bookingPatients";

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

const APPOINTMENT_STAGES = ["Scheduled", "Checked in", "With doctor", "Completed", "Prescription"] as const;

function recordList(value: unknown): any[] {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function visitHasUpload(visit: any) {
    return recordList(visit?.prescriptions).length > 0
        || recordList(visit?.labsOrdered).length > 0
        || Boolean(visit?.followUpPlan)
        || /uploaded/i.test(visit?.outcome || "");
}

function appointmentStage(appointment: any, visits: any[]): number | null {
    const state = getArrivalState(appointment);
    if (state === "cancelled" || state === "no-show") return null;
    const uploaded = visits.some((visit) =>
        visitHasUpload(visit) && (visit.appointmentId === appointment.id || (visit.date && visit.date === appointment.date))
    );
    if (uploaded) return 4;
    if (state === "completed") return 3;
    if (state === "in-consultation") return 2;
    if (state === "waiting") return 1;
    return 0;
}

const STATUS_BADGE: Record<ArrivalState, string> = {
    upcoming: "bg-saivie-surface-muted text-saivie-teal",
    late: "bg-rose-50 text-rose-700",
    waiting: "bg-amber-50 text-amber-700",
    "in-consultation": "bg-sky-50 text-sky-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-saivie-sage text-saivie-plum",
    "no-show": "bg-orange-50 text-orange-700",
};

function formatHistoryDate(value: string | null | undefined) {
    if (!value) return "Date not recorded";
    const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function NewBooking() {
    const [_, setLocation] = useLocation();
    const params = new URLSearchParams(useSearch());
    const walkIn = params.get("walkIn") === "1";
    const receptionist = (localStorage.getItem("staffUsername") || "").includes("reception");
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [date, setDate] = useState<Date | undefined>(new Date());

    // Form State
    const [patientType, setPatientType] = useState("existing");
    const [selectedTime, setSelectedTime] = useState(() => walkIn ? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}` : "");
    const [duration, setDuration] = useState(30);
    const [selectedService, setSelectedService] = useState("");
    const [selectedProvider, setSelectedProvider] = useState("");
    const [selectedPatientId, setSelectedPatientId] = useState<number | null>(() => {
        const id = Number(params.get("patientId"));
        return Number.isSafeInteger(id) && id > 0 ? id : null;
    });
    const [visitMode, setVisitMode] = useState("in-clinic");
    const [visitModeConfirmed, setVisitModeConfirmed] = useState(false);
    const [visitReason, setVisitReason] = useState<BookingVisitReason | "">("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);
    const [createdTelemedicineLink, setCreatedTelemedicineLink] = useState<string | null>(null);
    const [createdPatientConsultationUrl, setCreatedPatientConsultationUrl] = useState<string | null>(null);
    const [notificationStatus, setNotificationStatus] = useState("");
    const [patientReportedLmpWarning, setPatientReportedLmpWarning] = useState<string | null>(null);
    const [newPatient, setNewPatient] = useState<NewPatientDraft>(emptyNewPatientDraft);
    const [dismissedMatchIds, setDismissedMatchIds] = useState<number[]>([]);
    const [showNewPatientLmp, setShowNewPatientLmp] = useState(false);
    const [showNewPatientEmail, setShowNewPatientEmail] = useState(false);
    const [showNewPatientReferrer, setShowNewPatientReferrer] = useState(false);
    // Reused on retry so a failed appointment save does not register the same new patient twice.
    const [createdPatient, setCreatedPatient] = useState<{ id: number; key: string } | null>(null);
    const [notes, setNotes] = useState(params.get("reason") || "");
    const { toast } = useToast();

    const newPatientData = useMemo(() => newPatientPayload(newPatient), [newPatient]);
    const newPatientRegistrationData = useMemo(() => newPatientData ? {
        name: newPatientData.name,
        age: newPatientData.age,
        phone: newPatientData.phone,
        email: newPatientData.email,
        referredBy: newPatientData.referredBy,
    } : null, [newPatientData]);
    const newPatientKey = JSON.stringify(newPatientRegistrationData);
    const hasPatient = patientType === "existing" ? !!selectedPatientId : !!newPatientData;
    const updateNewPatient = (field: keyof NewPatientDraft, value: string) => {
        setNewPatient((current) => ({ ...current, [field]: value }));
        if (field === "phone") setDismissedMatchIds([]);
    };

    const [searchQuery, setSearchQuery] = useState("");
    const [patientFilter, setPatientFilter] = useState<BookingPatientFilter>("All");

    const { data: patientsData, isPending: patientsLoading, isError: patientsError, refetch: retryPatients } = useQuery({
        queryKey: ['/api/patients'],
        queryFn: async () => {
            const res = await fetch('/api/patients');
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        }
    });
    const matchedPatients = useMemo(() => {
        return filterBookingPatients(patientsData || [], searchQuery, patientFilter);
    }, [patientsData, searchQuery, patientFilter]);
    const possibleMatches = useMemo(() => findBookingPhoneMatches(patientsData || [], newPatient.phone)
        .filter((patient) => !dismissedMatchIds.includes(patient.id)), [patientsData, newPatient.phone, dismissedMatchIds]);
    const openNewPatient = () => { setPatientType("new"); setSelectedPatientId(null); };

    const { data: servicesData, isPending: servicesLoading, isError: servicesError, refetch: retryServices } = useQuery<Array<{
        id: number; name: string; category: string; description?: string | null; price: number; isActive?: boolean;
    }>>({
        queryKey: ['/api/billing-catalog'],
        queryFn: async () => {
            const res = await fetch('/api/billing-catalog');
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        }
    });

    const { data: providersData, isPending: providersLoading, isError: providersError, refetch: retryProviders } = useQuery<Array<{
        id: number; name: string; role?: string | null; specialty?: string | null;
        photoUrl?: string; photo?: string; image?: string; avatar?: string;
    }>>({
        queryKey: ['/api/providers'],
        queryFn: async () => {
            const res = await fetch('/api/providers');
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        }
    });

    const services = useMemo<BookingService[]>(() => (servicesData || [])
        .filter((item) => item.isActive !== false)
        .map((item) => ({ ...item, id: String(item.id), price: Number(item.price) || 0 })), [servicesData]);

    const selectedPatient = useMemo(
        () => patientsData?.find((patient: any) => patient.id === selectedPatientId) ?? null,
        [patientsData, selectedPatientId]
    );

    const { data: patientHistory, isLoading: historyLoading, isError: historyError } = useQuery({
        queryKey: ["/api/patient-history", selectedPatientId],
        enabled: !!selectedPatientId && !receptionist,
        queryFn: async () => {
            const id = selectedPatientId;
            const [visitsRes, scopedRes, medsRes] = await Promise.all([
                fetch(`/api/patients/${id}/visit-history`),
                fetch("/api/appointments", { headers: { "X-Patient-Id": String(id) } }),
                fetch(`/api/patients/${id}/medications`),
            ]);
            if (!visitsRes.ok) throw new Error("Failed to load visits");
            const visits = await visitsRes.json();
            let appointments: any[] = [];
            if (scopedRes.ok) {
                appointments = await scopedRes.json();
            } else {
                const allRes = await fetch("/api/appointments");
                if (!allRes.ok) throw new Error("Failed to load appointments");
                appointments = await allRes.json();
            }
            const medications = medsRes.ok ? await medsRes.json() : [];
            return {
                visits: Array.isArray(visits) ? visits : [],
                appointments: (Array.isArray(appointments) ? appointments : []).filter((appointment) => appointment.patientId === id),
                medications: Array.isArray(medications) ? medications : [],
            };
        },
    });

    const providers = useMemo<BookingDoctor[]>(() => {
        if (!providersData) return [];
        return providersData.map((p) => ({
            id: String(p.id),
            providerId: p.id,
            name: p.name,
            role: p.specialty || p.role,
            photo: providerPhoto(p),
            initials: providerInitials(p.name || ""),
        }));
    }, [providersData]);

    const handleNext = () => {
        if (step === 4) setVisitModeConfirmed(true);
        setStep(step + 1);
    };
    const handleBack = () => setStep(step - 1);

    const mutation = useMutation({
        mutationFn: async (apptData: any) => {
            let patientId = apptData.patientId as number | null;
            if (patientType === "new") {
                if (!newPatientRegistrationData) throw new Error("Enter the new patient's name and age.");
                if (createdPatient?.key === newPatientKey) {
                    patientId = createdPatient.id;
                } else {
                    const patientRes = await fetch('/api/patients', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newPatientRegistrationData),
                    });
                    const patient = await patientRes.json().catch(() => ({}));
                    if (!patientRes.ok || !patient.id) throw new Error(patient.error || 'Failed to register patient');
                    patientId = patient.id;
                    setCreatedPatient({ id: patient.id, key: newPatientKey });
                    queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
                }
            }
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...apptData, patientId }),
            });
            const body = await readApiResponse(res);
            if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "number") throw new Error("The API did not confirm the appointment.");
            let lmpSaveError: string | null = null;
            if (patientType === "new" && newPatientData?.lmp) {
                try {
                    await readApiResponse(await fetch(`/api/appointments/${body.id}/reception-vitals`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ vitals: null, lmp: newPatientData.lmp }),
                    }));
                } catch (error) {
                    lmpSaveError = error instanceof Error ? error.message : "The patient-reported LMP could not be saved.";
                }
            }
            return { ...body, id: body.id, lmpSaveError };
        },
        onSuccess: (data) => {
            const lmpWarning = typeof data.lmpSaveError === "string" ? data.lmpSaveError : null;
            queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
            setCreatedAppointmentId(data.id);
            setCreatedTelemedicineLink("telemedicineLink" in data && typeof data.telemedicineLink === "string" ? data.telemedicineLink : null);
            setCreatedPatientConsultationUrl("patientConsultationUrl" in data && typeof data.patientConsultationUrl === "string" ? data.patientConsultationUrl : null);
            setNotificationStatus("notificationStatus" in data && typeof data.notificationStatus === "string" ? data.notificationStatus : "not-sent");
            setPatientReportedLmpWarning(lmpWarning);
            setIsSuccess(true);
            toast({
                title: lmpWarning ? "Appointment booked; LMP needs attention" : walkIn ? "Walk-in checked in" : "Appointment Booked",
                description: lmpWarning ? "The appointment was saved, but the patient-reported LMP was not. Please record it before consultation." : walkIn ? "The patient has been added to today's doctor queue." : "The appointment has been successfully scheduled.",
            });
        },
        onError: (err: Error) => {
            toast({ title: "Booking failed", description: err.message, variant: "destructive" });
        }
    });

    const handleConfirm = () => {
        const missing = missingBookingFields({ hasPatient, date, time: selectedTime });
        if (!services.some((service) => service.id === selectedService)) missing.push("service");
        if (!providers.some((provider) => provider.id === selectedProvider)) missing.push("doctor");
        if (!visitMode) missing.push("visit type");
        if (missing.length > 0 || !date) {
            toast({
                title: "Missing Information",
                description: `Please select the ${missing.join(", ")} before confirming.`,
                variant: "destructive"
            });
            return;
        }

        mutation.mutate({
            patientId: patientType === "existing" ? selectedPatientId : null,
            providerId: providers.find((p: any) => p.id === selectedProvider)?.providerId ?? null,
            type: services.find((s: any) => s.id === selectedService)?.name,
            visitType: services.find((s: any) => s.id === selectedService)?.name,
            date: bookingDateKey(date),
            time: formatAppointmentTime(selectedTime),
            duration,
            reason: bookingVisitContext(visitReason, notes),
            status: walkIn ? "checked-in" : "scheduled",
            ...(walkIn ? { checkedInAt: new Date().toISOString() } : {}),
            visitMode,
        });
    };


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
                            <h2 className="text-3xl font-serif font-bold">{walkIn ? "Walk-in added to today's queue!" : "Appointment Scheduled!"}</h2>
                            <p className="text-saivie-sage mt-2 opacity-90">Session ID: #{createdAppointmentId}</p>
                        </div>

                        <CardContent className="p-8 space-y-8">
                            {patientReportedLmpWarning && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">The appointment was saved, but the patient-reported LMP could not be recorded: {patientReportedLmpWarning}. Please record it from reception vitals before consultation.</p>}
                            {createdTelemedicineLink && (
                                <div className="space-y-3 p-5 bg-saivie-surface-muted border border-saivie-border rounded-xl">
                                    <h3 className="text-base font-bold text-saivie-plum flex items-center gap-2">
                                        <Video className="w-5 h-5 text-saivie-teal" />
                                        Private Patient Consultation Page
                                    </h3>
                                    <p className="text-saivie-plum text-sm">
                                        Google Meet is ready. {notificationStatus === "sent" ? "The patient page link was submitted to WhatsApp for delivery." : "Share the patient page link manually; WhatsApp delivery was not confirmed."} The private page expires 30 days after the appointment.
                                    </p>
                                    <div className="flex gap-2 items-center bg-saivie-ivory rounded-lg border border-saivie-border p-3">
                                        <code className="flex-1 text-xs font-mono text-saivie-teal break-all select-all">{createdPatientConsultationUrl || "Patient page link unavailable. Open online consultation below."}</code>
                                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => {
                                            if (!createdPatientConsultationUrl) return;
                                            navigator.clipboard.writeText(createdPatientConsultationUrl).then(() => toast({ title: "Private patient link copied" }), (error: Error) => toast({ title: "Copy failed", description: error.message, variant: "destructive" }));
                                        }}>
                                            <Copy className="w-3 h-3 mr-1" /> Copy
                                        </Button>
                                    </div>
                                    <Button size="sm" variant="outline" className="w-full border-saivie-border text-saivie-teal" onClick={() => window.open(createdTelemedicineLink, '_blank')}>
                                        <ExternalLink className="w-3 h-3 mr-2" /> Join Google Meet
                                    </Button>
                                    {createdAppointmentId && <OnlineConsultationActions appointmentId={createdAppointmentId} />}
                                </div>
                            )}

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-saivie-plum flex items-center gap-2">
                                    <Share2 className="w-5 h-5 text-saivie-teal" />
                                    Share Patient Onboarding Link
                                </h3>
                                {createdAppointmentId && <OnboardingLink appointmentId={createdAppointmentId} />}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                        <p className="text-xs text-saivie-plum">{walkIn ? "Register today's arrival" : "Schedule Appointment"}</p>
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

            <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">

                {/* Left Col - Form Content */}
                <div className="min-w-0 flex-1 space-y-6">

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-serif font-bold text-[#1f4a42]">Who is this appointment for?</h2>
                                <p className="text-sm text-[#52645e]">{patientType === "new" ? "Start with a name and age. Contact details are optional." : "Search for an existing patient, or add a new one without leaving this step."}</p>
                            </div>

                            <div className="flex flex-wrap gap-2" role="group" aria-label="Patient type">
                                {(["existing", "new"] as const).map((type) => <Button key={type} type="button" aria-pressed={patientType === type}
                                    variant={patientType === type ? "default" : "outline"}
                                    className={`h-10 rounded-full px-5 ${patientType === type ? "bg-[#2d6a5f] text-white hover:bg-[#24574e]" : "border-[#d2dfd9] bg-white text-[#243b35]"}`}
                                    onClick={() => { setPatientType(type); if (type === "new") setSelectedPatientId(null); }}>
                                    {type === "new" && patientType === type ? "✓ " : ""}{type === "existing" ? "Existing patient" : "New patient"}
                                </Button>)}
                            </div>

                            {patientType === 'existing' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="relative min-w-0 flex-1">
                                            <Search className="absolute left-3 top-3 w-4 h-4 text-[#52645e]" />
                                            <Input className="rounded-full border-[#a5bfb5] bg-white pl-9 h-11" aria-label="Search patients by name, phone or ID" placeholder="Search by name, phone or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} data-testid="input-patient-search" />
                                        </div>
                                        <Button variant="outline" className="h-11 shrink-0 rounded-full border-[#80a89b] bg-white text-[#1f4a42]" onClick={openNewPatient}>+ New patient</Button>
                                    </div>

                                    <div className="flex flex-wrap gap-2" aria-label="Patient categories">
                                        {bookingPatientFilters.map((filter) => <Button key={filter} type="button" size="sm" variant="outline" aria-pressed={patientFilter === filter} onClick={() => setPatientFilter(filter)} className={`rounded-full ${patientFilter === filter ? "border-[#2d6a5f] bg-[#2d6a5f] text-white hover:bg-[#24574e] hover:text-white" : "border-[#d2dfd9] bg-white text-[#243b35]"}`}>{filter}</Button>)}
                                    </div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">{searchQuery.trim() ? "Search results" : patientFilter === "All" ? "Patients" : `${patientFilter} patients`}</p>
                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                        {patientsLoading && <p role="status" className="py-4 text-center text-sm">Loading patients...</p>}
                                        {patientsError && <p role="alert" className="py-4 text-center text-sm text-rose-700">Could not load patients. <Button variant="link" onClick={() => void retryPatients()}>Retry</Button></p>}
                                        {!patientsLoading && !patientsError && matchedPatients.map((p: any) => (
                                            <button
                                                type="button"
                                                key={p.id}
                                                aria-pressed={selectedPatientId === p.id}
                                                className={`w-full border rounded-2xl p-3 flex items-center gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal ${selectedPatientId === p.id ? 'border-[#2d6a5f] bg-[#f0f7f4]' : 'border-[#e0e9e4] bg-white hover:bg-[#f0f7f4]'}`}
                                                onClick={() => setSelectedPatientId(selectedPatientId === p.id ? null : p.id)}
                                                data-testid={`patient-result-${p.id}`}
                                            >
                                                <BookingPatientAvatar />
                                                <div className="flex-1">
                                                    <p className="font-bold text-saivie-plum text-sm">{p.name}</p>
                                                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#52645e]"><span className="rounded-full bg-saivie-sage px-2 py-0.5 font-medium text-[#1f4a42]">{bookingPatientCategory(p)}</span> ID #{p.id}</p>
                                                </div>
                                                {selectedPatientId === p.id ? <CheckCircle2 className="w-5 h-5 shrink-0 text-saivie-teal" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-[#b8cec4]" />}
                                            </button>
                                        ))}
                                        {!patientsLoading && !patientsError && matchedPatients.length === 0 && (
                                            <p className="text-sm text-saivie-plum text-center py-4">No patients found</p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-[#b8cec4] p-3">
                                        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-saivie-sage text-[#1f4a42]">+</span>
                                        <div className="min-w-0 flex-1"><p className="text-xs font-semibold">Can't find her?</p><p className="text-[11px] text-[#52645e]">Add a new patient here. Complete the required details before booking.</p></div>
                                        <Button variant="outline" size="sm" className="rounded-full border-[#80a89b] bg-white text-[#1f4a42]" onClick={openNewPatient}>Add new patient</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-patient-first-name">First Name *</Label>
                                        <Input id="new-patient-first-name" placeholder="Jane" autoComplete="given-name" className="h-11 rounded-full border-[#a5bfb5] bg-white px-4" value={newPatient.firstName} onChange={(e) => updateNewPatient("firstName", e.target.value)} data-testid="input-new-patient-first-name" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-patient-last-name">Last Name</Label>
                                        <Input id="new-patient-last-name" placeholder="Doe" autoComplete="family-name" className="h-11 rounded-full border-[#a5bfb5] bg-white px-4" value={newPatient.lastName} onChange={(e) => updateNewPatient("lastName", e.target.value)} data-testid="input-new-patient-last-name" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-patient-age">Age *</Label>
                                        <Input id="new-patient-age" type="number" min={0} max={120} placeholder="30" className="h-11 rounded-full border-[#a5bfb5] bg-white px-4" value={newPatient.age} onChange={(e) => updateNewPatient("age", e.target.value)} data-testid="input-new-patient-age" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-patient-phone">Phone</Label>
                                        <div className="flex h-11 items-center gap-2 rounded-full border border-[#a5bfb5] bg-white px-4 focus-within:ring-2 focus-within:ring-saivie-teal">
                                            <span aria-hidden="true" className="rounded-full bg-[#e8f0ec] px-2 py-1 text-[10px] font-semibold text-[#52645e]">+91</span>
                                            <Input id="new-patient-phone" type="tel" autoComplete="tel-national" placeholder="98765 43210" className="h-9 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" value={newPatient.phone} onChange={(e) => updateNewPatient("phone", e.target.value)} data-testid="input-new-patient-phone" />
                                        </div>
                                    </div>
                                    {patientsError && <p role="alert" className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Could not check for an existing patient match. <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => void retryPatients()}>Retry</Button></p>}
                                    {possibleMatches.length > 0 && <section aria-label="Possible existing patient matches" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:col-span-2" data-testid="possible-patient-matches">
                                        <h3 className="text-xs font-semibold text-amber-900">Possible match found</h3>
                                        {possibleMatches.map((match: any) => <div key={match.id} className="flex flex-wrap items-center gap-3">
                                            <BookingPatientAvatar />
                                            <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#243b35]">{match.name}</p><p className="text-[10px] text-[#52645e]">{bookingPatientCategory(match)} · ID #{match.id} · phone ends {String(match.phone || "").replace(/\D/g, "").slice(-4)}</p></div>
                                            <Button type="button" size="sm" className="rounded-full bg-[#2d6a5f] text-[10px] text-white hover:bg-[#24574e]" onClick={() => { setPatientType("existing"); setSelectedPatientId(match.id); setPatientFilter("All"); setSearchQuery(""); }}>Use this patient</Button>
                                            <Button type="button" size="sm" variant="outline" className="rounded-full border-[#80a89b] bg-white text-[10px]" onClick={() => setDismissedMatchIds((current) => [...current, match.id])}>Not her, continue</Button>
                                        </div>)}
                                    </section>}
                                    <fieldset className="space-y-2 sm:col-span-2">
                                        <legend className="text-xs font-medium text-[#52645e]">Care area <span className="font-normal">(helps prioritize appointment options)</span></legend>
                                        <div className="flex flex-wrap gap-2">
                                            {(["Pregnancy", "Fertility", "PCOS", "Gynae", "Other"] as const).map((area) => <Button key={area} type="button" size="sm" variant={newPatient.careArea === area ? "default" : "outline"} aria-pressed={newPatient.careArea === area}
                                                className={`rounded-full ${newPatient.careArea === area ? "bg-[#2d6a5f] text-white hover:bg-[#24574e]" : "border-[#d2dfd9] bg-white text-[#243b35]"}`}
                                                onClick={() => { updateNewPatient("careArea", area); if (area !== "Pregnancy") updateNewPatient("lmp", ""); }}>
                                                {newPatient.careArea === area ? "✓ " : ""}{area}
                                            </Button>)}
                                        </div>
                                    </fieldset>
                                    <div className="sm:col-span-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="mr-1 text-[10px] text-muted-foreground">Optional</span>
                                            {newPatient.careArea === "Pregnancy" && <Button type="button" size="sm" variant="outline" aria-expanded={showNewPatientLmp} className="rounded-full border-[#d2dfd9] bg-white text-[10px]" onClick={() => setShowNewPatientLmp((open) => !open)}>+ LMP</Button>}
                                            <Button type="button" size="sm" variant="outline" aria-expanded={showNewPatientEmail} className="rounded-full border-[#d2dfd9] bg-white text-[10px]" onClick={() => setShowNewPatientEmail((open) => !open)}>+ Email</Button>
                                            <Button type="button" size="sm" variant="outline" aria-expanded={showNewPatientReferrer} className="rounded-full border-[#d2dfd9] bg-white text-[10px]" onClick={() => setShowNewPatientReferrer((open) => !open)}>+ Referred by</Button>
                                        </div>
                                    </div>
                                    {newPatient.careArea === "Pregnancy" && showNewPatientLmp && <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="new-patient-lmp">Last menstrual period (optional)</Label>
                                        <Input id="new-patient-lmp" type="date" max={bookingDateKey(new Date())} className="h-11 rounded-full border-[#a5bfb5] bg-white px-4" value={newPatient.lmp} onChange={(e) => updateNewPatient("lmp", e.target.value)} data-testid="input-new-patient-lmp" />
                                        <p className="text-[10px] text-[#52645e]">Saved as patient-reported context for this booking. It does not set confirmed pregnancy dates.</p>
                                    </div>}
                                    {showNewPatientEmail && <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="new-patient-email">Email</Label>
                                        <Input id="new-patient-email" type="email" autoComplete="email" placeholder="jane@example.com" className="h-11 rounded-full border-[#a5bfb5] bg-white px-4" value={newPatient.email} onChange={(e) => updateNewPatient("email", e.target.value)} data-testid="input-new-patient-email" />
                                    </div>}
                                    {showNewPatientReferrer && <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="new-patient-referred-by">Referred by</Label>
                                        <Input id="new-patient-referred-by" placeholder="Provider name, if any" className="h-11 rounded-full border-[#a5bfb5] bg-white px-4" value={newPatient.referredBy} onChange={(e) => updateNewPatient("referredBy", e.target.value)} data-testid="input-new-patient-referred-by" />
                                    </div>}
                                    <p className="text-xs text-saivie-plum sm:col-span-2">The patient record is created when you confirm the booking. Care area helps prioritize this booking; your clinical team can update the chart afterward.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <BookingServiceSelection
                                key={patientType === "new" ? newPatient.careArea : selectedPatientId}
                                services={services} selectedId={selectedService} onSelect={setSelectedService}
                                careArea={patientType === "new" ? newPatient.careArea : selectedPatient ? bookingPatientCategory(selectedPatient) : ""}
                                loading={servicesLoading} error={servicesError} onRetry={() => void retryServices()}
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <BookingDoctorSelection doctors={providers} selectedId={selectedProvider} onSelect={setSelectedProvider}
                                loading={providersLoading} error={providersError} onRetry={() => void retryProviders()} />
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <BookingVisitSelection mode={visitMode} onModeChange={(mode) => { setVisitMode(mode); setVisitModeConfirmed(true); }}
                                reason={visitReason} onReasonChange={setVisitReason} notes={notes} onNotesChange={setNotes} />
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <BookingScheduleSelection date={date} onDateChange={setDate} time={selectedTime} onTimeChange={setSelectedTime}
                                duration={duration} onDurationChange={setDuration} walkIn={walkIn}
                                providerId={providers.find((provider) => provider.id === selectedProvider)?.providerId} />
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
                                            <p className="text-lg font-serif font-bold text-saivie-plum">{patientType === 'existing' ? (selectedPatient?.name || "Not selected") : (newPatientData?.name || "Not entered")}</p>
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
                                            <p className="font-medium text-saivie-plum">{selectedTime ? `${formatAppointmentTime(selectedTime)} · ${duration} min` : "Not selected"}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-saivie-teal uppercase font-bold tracking-wide mb-1">Visit Mode</p>
                                            <p className="font-medium text-saivie-plum flex items-center gap-2">
                                                {visitMode === "telemedicine" ? <><Video className="w-4 h-4 text-saivie-teal" /> Video Consultation</> :
                                                 visitMode === "home-visit" ? <><Home className="w-4 h-4 text-amber-500" /> Home Visit</> :
                                                 <><Building2 className="w-4 h-4 text-saivie-plum" /> In-Clinic</>}
                                            </p>
                                        </div>
                                        {bookingVisitContext(visitReason, notes) && <div className="col-span-2">
                                            <p className="text-xs text-saivie-teal uppercase font-bold tracking-wide mb-1">Reason &amp; booking note</p>
                                            <p className="whitespace-pre-wrap break-words text-sm text-saivie-plum">{bookingVisitContext(visitReason, notes)}</p>
                                        </div>}
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
                                disabled={(step === 1 && !hasPatient) || (step === 2 && !selectedService) || (step === 3 && (providersLoading || providersError || !providers.some((provider) => provider.id === selectedProvider))) || (step === 4 && !visitMode) || (step === 5 && (!date || !validBookingTime(selectedTime)))}
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
                <aside className="w-full lg:w-64 lg:shrink-0 space-y-5 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto" aria-label="Booking summary">
                    <Card className="rounded-2xl border-[#e0e9e4] bg-white shadow-none" data-testid="booking-summary">
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">Booking summary</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex items-center gap-3 border-b border-[#edf1ef] py-3">
                                <BookingPatientAvatar />
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold text-[#243b35]">{patientType === "existing" ? selectedPatient?.name || "Select a patient" : [newPatient.firstName, newPatient.lastName].filter(Boolean).join(" ") || "New patient"}</p>
                                    <p className="text-[10px] text-[#52645e]">{patientType === "existing" && selectedPatient ? `${bookingPatientCategory(selectedPatient)} · ID #${selectedPatient.id}` : patientType === "new" ? `New · Age ${newPatient.age || "—"} · ${newPatient.careArea} · Not registered yet` : "No patient selected"}</p>
                                </div>
                            </div>
                            <ol>
                                {[
                                    { label: "Patient", value: hasPatient ? "Selected" : "" },
                                    { label: "Service", value: services.find((service) => service.id === selectedService)?.name || (step === 2 ? "In progress" : "") },
                                    { label: "Doctor", value: providers.find((provider) => provider.id === selectedProvider)?.name || (step === 3 ? "In progress" : "") },
                                    { label: "Visit", value: step >= 4 || visitModeConfirmed ? [bookingVisitModeLabel(visitMode), visitReason].filter(Boolean).join(" · ") : "" },
                                    { label: "Schedule", value: date && validBookingTime(selectedTime) ? `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${formatAppointmentTime(selectedTime)} · ${duration} min` : step === 5 ? "In progress" : "" },
                                    { label: "Review", value: step === 6 ? "Ready to review" : "" },
                                ].map((item, index) => (
                                    <li key={item.label} className="flex items-center gap-3 border-b border-[#edf1ef] py-2.5 last:border-0" aria-current={step === index + 1 ? "step" : undefined}>
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${item.value && index < step - 1 || index === 0 && hasPatient ? "bg-[#2d6a5f] text-white" : "bg-[#e3ede8] text-[#52645e]"}`}>
                                            {item.value && index < step - 1 || index === 0 && hasPatient ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                                        </span>
                                        <div className="min-w-0"><p className="text-xs text-[#243b35]">{item.label}</p><p className="break-words text-[10px] text-[#52645e]">{item.value || (index + 1 === step + 1 ? "Next" : "—")}</p></div>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>
                    {patientType === "new" && <Card className="rounded-2xl border-[#e0e9e4] bg-white shadow-none" data-testid="new-patient-save-info">
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">How a new patient is saved</CardTitle></CardHeader>
                        <CardContent className="space-y-3 p-4 pt-1">
                            <p className="text-xs font-medium text-[#243b35]">{[newPatient.firstName, newPatient.lastName].map((part) => part.trim()).filter(Boolean).join(" ") || "Patient name"}{newPatient.age ? ` · Age ${newPatient.age}` : ""}</p>
                            <p className="text-[10px] text-[#52645e]">{newPatient.careArea} · Not registered yet</p>
                            {newPatient.phone.trim() && <p className="break-all text-[10px] text-[#52645e]">Phone: {newPatient.phone.trim()}</p>}
                            {newPatient.email.trim() && <p className="break-all text-[10px] text-[#52645e]">Email: {newPatient.email.trim()}</p>}
                            {newPatient.referredBy.trim() && <p className="break-words text-[10px] text-[#52645e]">Referred by: {newPatient.referredBy.trim()}</p>}
                            {newPatient.lmp && <p className="text-[10px] text-[#52645e]">Patient-reported LMP: {newPatient.lmp}</p>}
                            <div className="space-y-2 border-t border-[#edf1ef] pt-3">
                                <p className="text-[10px] font-semibold text-[#243b35]">The patient record is created when you confirm the booking.</p>
                                <p className="text-[10px] leading-relaxed text-[#52645e]">Name and age are required. Contact details are optional. The care area helps put relevant appointment options first; your clinical team can update the chart afterward.</p>
                            </div>
                        </CardContent>
                    </Card>}
                    {patientType === "existing" && selectedPatient && bookingPatientCategory(selectedPatient) === "Pregnant" && <p className="px-2 text-xs text-[#52645e]">Next step puts pregnancy care first, because this patient is marked pregnant.</p>}
                    {!receptionist && <details className="space-y-4">
                    <summary className="cursor-pointer text-xs font-medium text-saivie-teal">Patient history &amp; quick actions</summary>
                    <Card className="bg-saivie-surface-muted border-saivie-border">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wide text-saivie-plum">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start text-xs h-9 bg-saivie-ivory"
                                onClick={() => {
                                    if (!selectedPatientId) {
                                        toast({ title: "Select a patient", description: "Choose a patient on the first step to see visits and appointment status.", variant: "destructive" });
                                        return;
                                    }
                                    document.getElementById("patient-history")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                }}
                            >
                                <FileText className="w-3 h-3 mr-2" /> View Patient History
                            </Button>
                            <Button variant="outline" className="w-full justify-start text-xs h-9 bg-saivie-ivory">
                                <CreditCard className="w-3 h-3 mr-2" /> Check Insurance Status
                            </Button>
                        </CardContent>
                    </Card>

                    <Card id="patient-history" className="border-saivie-border bg-saivie-ivory">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wide text-saivie-plum">
                                {selectedPatient?.name || "Patient history"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {!selectedPatientId && (
                                <p className="text-xs text-saivie-plum">Select a patient to see visits and the appointment status tracker.</p>
                            )}
                            {selectedPatientId && historyLoading && <p className="text-xs text-saivie-plum">Loading history...</p>}
                            {selectedPatientId && historyError && <p className="text-xs text-rose-700">Could not load this patient's history.</p>}
                            {selectedPatientId && !historyLoading && !historyError && (
                                <>
                                    <section className="space-y-2">
                                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-saivie-teal">Visits</h3>
                                        {(patientHistory?.visits.length ?? 0) === 0 ? (
                                            <p className="text-xs text-saivie-plum">No visits recorded yet.</p>
                                        ) : (
                                            [...patientHistory!.visits]
                                                .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
                                                .map((visit) => (
                                                    <div key={visit.id} className="rounded-lg border border-saivie-border p-2.5">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="font-semibold text-xs text-saivie-plum">{visit.visitType || "Visit"}</p>
                                                            <span className="text-[10px] text-saivie-plum shrink-0">{formatHistoryDate(visit.date)}</span>
                                                        </div>
                                                        {visit.chiefComplaint && <p className="mt-1 text-[11px] text-saivie-plum">{visit.chiefComplaint}</p>}
                                                        {visit.diagnosis && <p className="mt-1 text-[11px] text-saivie-plum">Diagnosis: {visit.diagnosis}</p>}
                                                        {visit.outcome && <p className="mt-1 text-[11px] font-medium text-saivie-teal">{visit.outcome}</p>}
                                                        {recordList(visit.prescriptions).length > 0 && (
                                                            <div className="mt-2 space-y-1">
                                                                <p className="text-[10px] font-bold uppercase text-saivie-teal">After prescription upload</p>
                                                                {recordList(visit.prescriptions).map((med, index) => (
                                                                    <p key={index} className="text-[11px] text-saivie-plum">
                                                                        {[med.name, med.dosage || med.dose, med.frequency, med.duration].filter(Boolean).join(" · ")}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {recordList(visit.labsOrdered).length > 0 && (
                                                            <p className="mt-1 text-[11px] text-saivie-plum">
                                                                Labs: {recordList(visit.labsOrdered).map((lab) => lab.name || lab.result).filter(Boolean).join(", ")}
                                                            </p>
                                                        )}
                                                        {visit.followUpPlan && <p className="mt-1 text-[11px] text-saivie-plum">Follow-up: {visit.followUpPlan}</p>}
                                                        {visit.planNotes && <p className="mt-1 text-[11px] text-saivie-plum">Advice: {visit.planNotes}</p>}
                                                    </div>
                                                ))
                                        )}
                                    </section>
                                    {(patientHistory?.medications.length ?? 0) > 0 && (
                                        <section className="space-y-2">
                                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-saivie-teal">Saved medications</h3>
                                            {patientHistory!.medications.map((med: any) => (
                                                <div key={med.id} className="rounded-lg border border-saivie-border p-2.5">
                                                    <p className="font-semibold text-xs text-saivie-plum">{med.name}</p>
                                                    <p className="mt-1 text-[11px] text-saivie-plum">{[med.dose, med.frequency, med.status].filter(Boolean).join(" · ")}</p>
                                                </div>
                                            ))}
                                        </section>
                                    )}
                                    <section className="space-y-2">
                                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-saivie-teal">Appointment status</h3>
                                        {(patientHistory?.appointments.length ?? 0) === 0 ? (
                                            <p className="text-xs text-saivie-plum">No appointments recorded yet.</p>
                                        ) : (
                                            [...patientHistory!.appointments]
                                                .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.time || "").localeCompare(String(a.time || "")))
                                                .map((appointment) => {
                                                    const state = getArrivalState(appointment);
                                                    const stage = appointmentStage(appointment, patientHistory?.visits ?? []);
                                                    return (
                                                        <div key={appointment.id} className="rounded-lg border border-saivie-border p-2.5 space-y-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="font-semibold text-xs text-saivie-plum">{appointment.type || appointment.visitType || "Appointment"}</p>
                                                                    <p className="text-[10px] text-saivie-plum mt-0.5">{formatHistoryDate(appointment.date)}{appointment.time ? ` · ${appointment.time}` : ""}</p>
                                                                </div>
                                                                <Badge className={`border-none capitalize text-[10px] ${STATUS_BADGE[state]}`}>{state.replace("-", " ")}</Badge>
                                                            </div>
                                                            {stage === null ? (
                                                                <p className="text-[10px] text-saivie-plum">Closed. Not on the visit tracker.</p>
                                                            ) : (
                                                                <ol className="space-y-1">
                                                                    {APPOINTMENT_STAGES.map((label, index) => (
                                                                        <li key={label} className="flex items-center gap-2 text-[10px]">
                                                                            <span className={`h-2 w-2 rounded-full ${index <= stage ? "bg-saivie-teal" : "bg-saivie-sage"}`} />
                                                                            <span className={index === stage ? "font-bold text-saivie-teal" : "text-saivie-plum"}>{label}</span>
                                                                        </li>
                                                                    ))}
                                                                </ol>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </section>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <div className="rounded-xl bg-gradient-to-br from-saivie-teal to-saivie-teal p-6 text-white">
                        <h3 className="font-serif font-bold text-lg mb-2">Need Help?</h3>
                        <p className="text-saivie-sage text-sm mb-4">
                            Call the support line if you're having trouble with the scheduling system.
                        </p>
                        <p className="font-mono text-sm bg-saivie-ivory/20 p-2 rounded text-center">Ext. 4049</p>
                    </div>
                    </details>}
                </aside>

            </main>
        </div>
    );
}
