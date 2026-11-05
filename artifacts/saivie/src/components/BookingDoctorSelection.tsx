import { CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BookingDoctor {
    id: string;
    providerId: number;
    name: string;
    role?: string | null;
    photo?: string;
    initials: string;
}

export function BookingDoctorSelection({ doctors, selectedId, onSelect, loading, error, onRetry }: {
    doctors: BookingDoctor[];
    selectedId: string;
    onSelect: (id: string) => void;
    loading: boolean;
    error: boolean;
    onRetry: () => void;
}) {
    return <div className="space-y-5">
        <div className="space-y-1">
            <h2 className="font-serif text-2xl font-bold text-[#1f4a42]">Who will see her?</h2>
            <p className="text-sm text-[#52645e]">Choose a doctor. Tap the selected doctor again to clear. Confirm they offer the selected service before booking.</p>
        </div>
        <div className="space-y-3" role="group" aria-label="Choose a doctor">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">Choose a doctor</h3>
            <button type="button" disabled className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-[#e0e9e4] bg-white p-4 text-left opacity-60" aria-describedby="automatic-doctor-unavailable">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dce9e4] text-[#2d6a5f]"><Users aria-hidden="true" className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#243b35]">Any available doctor</span><span id="automatic-doctor-unavailable" className="block text-xs text-[#52645e]">Automatic assignment is not available</span></span>
                <span className="h-6 w-6 shrink-0 rounded-full border-2 border-[#c6d9d1]" aria-hidden="true" />
            </button>
            {loading ? <p role="status" className="text-sm text-[#52645e]">Loading doctors...</p>
                : error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load doctors. <Button type="button" variant="link" onClick={onRetry}>Retry doctors</Button></div>
                : doctors.length === 0 ? <p role="status" className="rounded-xl border border-[#d2dfd9] bg-white p-4 text-sm text-[#52645e]">No doctors are listed. Ask the clinic to add a doctor before booking.</p>
                : doctors.map((doctor) => <button key={doctor.id} type="button" aria-pressed={selectedId === doctor.id}
                    onClick={() => onSelect(selectedId === doctor.id ? "" : doctor.id)} data-testid={`booking-doctor-${doctor.providerId}`}
                    className={`flex w-full flex-wrap items-center gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal focus-visible:ring-offset-2 ${selectedId === doctor.id ? "border-[#2d6a5f] bg-[#f0f7f4] ring-1 ring-[#2d6a5f]" : "border-[#e0e9e4] bg-white hover:bg-[#f0f7f4]"}`}>
                    {doctor.photo ? <img src={doctor.photo} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                        : <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dce9e4] text-xs font-semibold text-[#2d6a5f]">{doctor.initials}</span>}
                    <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-[#243b35]">{doctor.name}</span>{doctor.role && <span className="mt-0.5 block break-words text-xs text-[#52645e]">{doctor.role}</span>}</span>
                    <span className="hidden rounded-full border border-[#d2dfd9] bg-white px-3 py-1.5 text-[10px] text-[#52645e] sm:block">Next slot unavailable</span>
                    {selectedId === doctor.id ? <CheckCircle2 aria-hidden="true" className="h-6 w-6 shrink-0 fill-[#2d6a5f] text-white" />
                        : <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border-2 border-[#c6d9d1]" />}
                </button>)}
        </div>
        <p className="text-[10px] leading-relaxed text-[#52645e]">Service eligibility and live appointment slots are not linked to these profiles. Confirm the doctor's schedule with the clinic; date and time are chosen in the Schedule step.</p>
    </div>;
}
