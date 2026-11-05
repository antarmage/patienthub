import { useState } from "react";
import { Building2, CheckCircle2, Home, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bookingVisitReasons, type BookingVisitReason } from "@/lib/bookingVisit";

export function BookingVisitSelection({ mode, onModeChange, reason, onReasonChange, notes, onNotesChange }: {
    mode: string;
    onModeChange: (mode: string) => void;
    reason: BookingVisitReason | "";
    onReasonChange: (reason: BookingVisitReason | "") => void;
    notes: string;
    onNotesChange: (notes: string) => void;
}) {
    const [showNote, setShowNote] = useState(Boolean(notes));
    return <div className="space-y-5">
        <div className="space-y-1">
            <h2 className="font-serif text-2xl font-bold text-[#1f4a42]">How will the visit happen?</h2>
            <p className="text-sm text-[#52645e]">A few taps. Only the visit type is required here.</p>
        </div>
        <section className="space-y-2" aria-label="Visit type">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">Visit type</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                    { value: "in-clinic", label: "In-clinic", icon: Building2, description: "She comes to the clinic" },
                    { value: "telemedicine", label: "Video call", icon: Video, description: "Online consultation" },
                    { value: "phone-call", label: "Phone call", icon: Phone, description: "Voice-only booking unavailable", disabled: true },
                    { value: "home-visit", label: "Home visit", icon: Home, description: "Doctor comes to her" },
                ].map((option) => <button key={option.value} type="button" disabled={option.disabled}
                    aria-pressed={mode === option.value} onClick={() => onModeChange(mode === option.value ? "" : option.value)}
                    data-testid={`btn-visit-mode-${option.value}`}
                    className={`flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${mode === option.value ? "border-[#2d6a5f] bg-[#f0f7f4] ring-1 ring-[#2d6a5f]" : "border-[#d2dfd9] bg-white hover:bg-[#f0f7f4]"}`}>
                    <option.icon aria-hidden="true" className="h-6 w-6 shrink-0 text-[#2d6a5f]" />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#243b35]">{option.label}</span><span className="mt-0.5 block text-xs text-[#52645e]">{option.description}</span></span>
                    {mode === option.value && <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 fill-[#2d6a5f] text-white" />}
                </button>)}
            </div>
            {mode === "telemedicine" && <p className="text-xs text-[#52645e]">Uses the selected doctor's connected Google Meet account. After booking, check the confirmation for the private patient link and WhatsApp delivery status.</p>}
            {mode === "home-visit" && <p className="text-xs text-amber-800">Confirm the patient's address and home-visit availability with the clinic. Additional charges may apply.</p>}
        </section>
        <section className="space-y-2" aria-label="Reason for visit">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">Reason for visit <span className="font-normal normal-case">(optional)</span></h3>
            <div className="flex flex-wrap gap-2">
                {bookingVisitReasons.map((value) => <Button key={value} type="button" variant="outline" aria-pressed={reason === value}
                    onClick={() => { onReasonChange(reason === value ? "" : value); if (value === "Other") setShowNote(true); }}
                    className={`h-10 rounded-full px-4 ${reason === value ? "border-[#2d6a5f] bg-[#2d6a5f] text-white hover:bg-[#24574e] hover:text-white" : "border-[#d2dfd9] bg-white text-[#243b35]"}`}>
                    {reason === value ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}{value === "Other" ? "+ Other" : value}
                </Button>)}
            </div>
        </section>
        <section className="space-y-2" aria-label="Before the visit">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">Before the visit</h3>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled className="h-10 rounded-full border-[#d2dfd9] bg-white px-4">Send pre-visit survey · unavailable</Button>
                <Button type="button" variant="outline" aria-expanded={showNote} aria-controls="booking-visit-note" className="h-10 rounded-full border-[#d2dfd9] bg-white px-4 text-[#243b35]" onClick={() => setShowNote((open) => !open)}>{showNote ? "Hide note" : "+ Add a note"}</Button>
            </div>
            <p className="text-[10px] leading-relaxed text-[#52645e]">Automatic survey sending is not available. After confirming the booking, create and copy a private onboarding link to share manually.</p>
            {showNote && <div id="booking-visit-note" className="space-y-2 pt-2">
                <Label htmlFor="appointment-notes">Booking note (optional)</Label>
                <Textarea id="appointment-notes" value={notes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Any specific requirements or patient-reported concerns..." className="min-h-[100px] rounded-xl border-[#d2dfd9] bg-white" />
                <p className="text-[10px] text-[#52645e]">Saved as booking context for the care team, not as a diagnosis.</p>
            </div>}
        </section>
    </div>;
}
