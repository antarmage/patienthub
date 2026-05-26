
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
    UserPlus,
    Stethoscope,
    History,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

export default function PatientOnboarding() {
    const { id } = useParams();
    const [_, setLocation] = useLocation();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [chiefComplaint, setChiefComplaint] = useState("");
    const [medicalHistory, setMedicalHistory] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const { data: onboardingData, isLoading } = useQuery({
        queryKey: [`/api/onboarding`, id],
        queryFn: async () => {
            const res = await fetch(`/api/onboarding`, {
                headers: { "X-Appointment-Id": String(id) },
            });
            if (!res.ok) throw new Error("Failed to load onboarding session");
            return res.json();
        }
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/onboarding/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save onboarding data");
            return res.json();
        },
        onSuccess: () => {
            setSubmitted(true);
            toast({
                title: "Onboarding Complete",
                description: "Your information has been securely shared with our clinical team.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Submission Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Sparkles className="w-10 h-10 text-indigo-400 animate-spin" />
                    <p className="text-slate-400 font-medium font-serif">Initializing your onboarding...</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[slate-50] flex items-center justify-center p-6 font-sans">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full"
                >
                    <Card className="border-none shadow-2xl shadow-indigo-100/50 text-center overflow-hidden bg-white">
                        <div className="h-2 bg-indigo-600 w-full" />
                        <CardContent className="pt-12 pb-12 space-y-6">
                            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-100">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-2 px-4">
                                <h2 className="text-3xl font-serif font-bold text-slate-900 leading-tight">You're All Set!</h2>
                                <p className="text-slate-500 text-lg">
                                    Welcome to the clinic, <span className="text-indigo-600 font-bold">{onboardingData?.patient?.name}</span>. Your data is now with your doctor.
                                </p>
                            </div>
                            <Separator className="bg-slate-100" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Appointment Confirmed</p>
                                <p className="text-slate-700 font-serif text-lg">
                                    {new Date(onboardingData?.appointment?.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                            <Button
                                className="w-full h-12 bg-slate-900 hover:bg-black text-white rounded-xl transition-all font-bold"
                                onClick={() => setLocation("/")}
                            >
                                Go to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-100">

            {/* Dynamic Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1.5 bg-slate-50 z-50">
                <motion.div
                    initial={{ width: "33%" }}
                    animate={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
                    className="h-full bg-indigo-600"
                />
            </div>

            <div className="max-w-3xl mx-auto px-6 pt-20 pb-20">

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm tracking-widest uppercase">
                                    <UserPlus className="w-4 h-4" />
                                    Onboarding Stage 01
                                </div>
                                <h1 className="text-5xl md:text-6xl font-serif font-bold leading-[1.1] text-slate-900">
                                    Help us understand <br /> your <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">needs</span>.
                                </h1>
                                <p className="text-slate-500 text-xl max-w-xl">
                                    Hi {onboardingData?.patient?.name}, before your visit on {onboardingData?.appointment?.date}, please tell us what's on your mind.
                                </p>
                            </div>

                            <Card className="border-slate-100 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden bg-white">
                                <CardContent className="p-8 md:p-10 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 text-lg font-bold">1</span>
                                            <Label className="text-xl font-bold text-slate-800">Your Chief Complaint</Label>
                                        </div>
                                        <Textarea
                                            placeholder="Share what symptoms or concerns you want to discuss..."
                                            className="min-h-[180px] bg-slate-50/50 border-slate-200 rounded-2xl p-6 text-lg focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none resize-none"
                                            value={chiefComplaint}
                                            onChange={(e) => setChiefComplaint(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xl font-bold transition-all shadow-lg shadow-indigo-100"
                                        disabled={!chiefComplaint}
                                        onClick={() => setStep(2)}
                                    >
                                        Next Step
                                        <ArrowRight className="ml-3 w-6 h-6" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm tracking-widest uppercase">
                                    <ShieldCheck className="w-4 h-4" />
                                    Onboarding Stage 02
                                </div>
                                <h1 className="text-5xl md:text-6xl font-serif font-bold leading-[1.1] text-slate-900">
                                    Previous <span className="text-indigo-600 italic">Medical</span> Records.
                                </h1>
                                <p className="text-slate-500 text-xl max-w-xl">
                                    Providing your past medical history or surgeries helps your doctor build a safer care plan.
                                </p>
                            </div>

                            <Card className="border-slate-100 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden bg-white">
                                <CardContent className="p-8 md:p-10 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 text-lg font-bold">2</span>
                                            <Label className="text-xl font-bold text-slate-800">History & Surgeries</Label>
                                        </div>
                                        <Textarea
                                            placeholder="Past diagnoses, surgeries (with dates if known), or major health events..."
                                            className="min-h-[180px] bg-slate-50/50 border-slate-200 rounded-2xl p-6 text-lg focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none resize-none"
                                            value={medicalHistory}
                                            onChange={(e) => setMedicalHistory(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <Button variant="outline" className="h-16 flex-1 rounded-2xl text-lg font-bold border-slate-200" onClick={() => setStep(1)}>
                                            Go Back
                                        </Button>
                                        <Button
                                            className="h-16 flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xl font-bold transition-all shadow-lg shadow-indigo-100"
                                            disabled={mutation.isPending}
                                            onClick={() => {
                                                mutation.mutate({
                                                    chiefComplaint,
                                                    history: medicalHistory ? {
                                                        medical: [medicalHistory],
                                                        manual_entry: medicalHistory
                                                    } : undefined
                                                });
                                            }}
                                        >
                                            {mutation.isPending ? "Submitting..." : "Complete Onboarding"}
                                            <Sparkles className="ml-3 w-6 h-6" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <footer className="mt-20 text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-slate-300">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs font-bold tracking-widest uppercase">Saivie Secure Clinical Protocol</span>
                    </div>
                    <p className="text-slate-400 text-sm max-w-md mx-auto italic">
                        Your clinical data is encrypted and shared only with your attending physician at Saivie Reproductive Intelligence.
                    </p>
                </footer>
            </div>
        </div>
    );
}
