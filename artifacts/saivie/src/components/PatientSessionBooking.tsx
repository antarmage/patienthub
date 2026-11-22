import React, { useEffect, useRef } from "react";
import { Activity, Apple, ArrowLeft, HeartPulse } from "lucide-react";

interface Props {
  week: number | null;
  backLabel: string;
  onBack: () => void;
  onRequestAppointment: () => void;
}

export default function PatientSessionBooking({ week, backLabel, onBack, onRequestAppointment }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="space-y-7 text-[#2A1220]" aria-label="Session booking">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
      </button>
      <div className="rounded-[40px] bg-[#FFE7A8] p-6 md:p-12">
        {week !== null && week >= 0 && <span className="inline-flex rounded-full bg-[#2A1220] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFA7B6]">Week {week}</span>}
        <h1 ref={heading} tabIndex={-1} className="mt-4 font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] outline-none md:text-[72px]">
          Book a <em className="font-medium">session.</em>
        </h1>
        <p className="mt-4 text-[17px] font-medium leading-[1.45] md:text-xl">Request support from your care team.</p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-4 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Who would you like?</h2>
            <div className="flex items-start gap-3 rounded-[20px] border border-[#F0DCC4] p-4">
              <span className="rounded-full bg-[#FFE7A8] p-3 text-[#7A4B00]"><Apple className="h-5 w-5" aria-hidden="true" /></span>
              <div><h3 className="font-serif text-xl font-bold">Nutritionist</h3><p className="text-sm leading-relaxed text-[#5A4552]">Request a nutrition appointment through the clinic.</p></div>
            </div>
            {([
              ["Prenatal coach", Activity],
              ["Women's health physio", HeartPulse],
            ] as const).map(([label, Icon]) => (
              <div key={label} className="flex items-start gap-3 rounded-[20px] border border-[#F0DCC4] p-4">
                <span className="rounded-full bg-[#F7F1ED] p-3 text-[#6A5560]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <div><h3 className="font-serif text-xl font-bold">{label}</h3><p className="text-sm text-[#5A4552]">Booking not available here yet.</p></div>
              </div>
            ))}
          </section>
          <section className="space-y-2 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">How and when?</h2>
            <p className="text-[15px] leading-relaxed">Choose a preferred date and time in the appointment request. Contact the clinic to confirm availability. Live availability and session format selection are not available here yet.</p>
          </section>
        </div>
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
            <h2 className="font-serif text-[26px] font-bold leading-tight">Your health information</h2>
            <p className="text-[15px] leading-relaxed">This page does not offer controls for choosing what to share. Ask your clinic about how your information is used and shared.</p>
          </section>
          <section className="space-y-3 rounded-[28px] bg-[#2A1220] p-[22px] text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">Appointment request</p>
            <h2 className="font-serif text-[26px] font-bold leading-tight">Talk to your care team.</h2>
            <p className="text-sm leading-relaxed text-[#E8DCE2]">Request a doctor or nutritionist appointment. Your request is not a confirmed session.</p>
            <p className="text-sm leading-relaxed text-[#E8DCE2]">Pricing, plan coverage and cancellation details are not available here. Check with your clinic.</p>
            <button type="button" onClick={onRequestAppointment} className="min-h-11 rounded-full bg-[#FFA7B6] px-5 text-sm font-bold text-[#2A1220]">Request an appointment</button>
          </section>
          <p className="text-xs leading-relaxed text-[#6A5560]">Your care team is not an emergency service. In an emergency, call local emergency services.</p>
        </div>
      </div>
    </section>
  );
}
