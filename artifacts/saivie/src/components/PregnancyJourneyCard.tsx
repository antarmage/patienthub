import React, { useId } from "react";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";
import { gestationalWeekAtDate } from "@/lib/pregnancyGraphReferences";
import { calendarDate } from "@/lib/calendarDates";

const displayDate = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

export function PregnancyJourneyCard({ context }: { context: PregnancyVisitContext }) {
  const illustrationId = useId();
  if (!context.pregnancy) return null;
  const dating = context.weightReference;
  const week = dating ? gestationalWeekAtDate(dating, context.asOf) : null;
  const days = week === null ? null : Math.round(week * 7);
  if (context.journeySuppressed || days === null || days < 14 * 7) return null;
  const trimester = days === null ? null : days < 14 * 7 ? 1 : days < 28 * 7 ? 2 : 3;
  const dueDate = dating?.datingBasis === "LMP" && dating.lmp && calendarDate(dating.lmp)
    ? new Date(Date.parse(`${dating.lmp}T00:00:00Z`) + 280 * 86400000).toISOString().slice(0, 10)
    : dating && ["Ultrasound", "Clinical assessment"].includes(dating.datingBasis) && dating.dueDate && calendarDate(dating.dueDate)
      ? dating.dueDate : null;
  const phase = trimester === 1 ? "Your first trimester" : trimester === 2 ? "Your second trimester" : "Your third trimester";
  return <section aria-label="Your pregnancy journey" data-testid="pregnancy-journey-card"
    className="mt-5 rounded-2xl border border-saivie-border bg-saivie-surface-muted p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <div className="mx-auto w-36 shrink-0 sm:mx-0 sm:w-40">
        <svg viewBox="0 0 220 210" width="100%" role="img" aria-labelledby={`${illustrationId}-title ${illustrationId}-desc`}>
          <title id={`${illustrationId}-title`}>A little life, a growing journey</title>
          <desc id={`${illustrationId}-desc`}>A symbolic illustration of a curled baby surrounded by a soft protective oval. Not a scan, not to scale and not a depiction of this baby's development.</desc>
          <ellipse cx="108" cy="106" rx="83" ry="89" fill="#CFE2DC" />
          <path d="M151 38 C188 61 188 130 155 163 C126 192 61 181 47 140 C33 100 48 52 83 36" fill="#FFFFFC" stroke="#252525" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M123 67 C144 61 161 78 157 98 C155 111 145 121 133 122 C147 140 133 158 112 157 C91 156 78 140 80 121 C81 110 88 102 96 98 C88 81 101 66 123 67 Z" fill="#E5C4DB" stroke="#252525" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M140 93 Q136 97 132 94 M100 115 Q110 123 120 118 M113 144 Q104 141 104 134" fill="none" stroke="#252525" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M84 153 C64 154 60 136 66 126" fill="none" stroke="#252525" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M177 36 C171 26 157 31 163 41 L177 53 L190 40 C197 28 181 26 177 36 Z" fill="#E5C4DB" stroke="#252525" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-saivie-teal">Your pregnancy journey</p>
        <h2 className="mt-1 text-xl font-semibold">{days === null ? "Every visit is part of your journey" : `${Math.floor(days / 7)} weeks, ${days % 7} days`}</h2>
        <p className="mt-1 text-sm text-saivie-teal">{trimester === null ? "Your care team can help confirm your pregnancy dates." : phase}</p>
        <p className="mt-2 text-xs">For this appointment: {displayDate(context.asOf)}</p>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-saivie-teal">Recorded LMP</dt><dd className="mt-1 font-medium">{dating?.lmp && calendarDate(dating.lmp) ? displayDate(dating.lmp) : "Not recorded"}</dd></div>
          <div><dt className="text-xs text-saivie-teal">Estimated due date</dt><dd className="mt-1 font-medium">{dueDate && days !== null ? displayDate(dueDate) : "Not established"}</dd></div>
        </dl>
        {dating && <p className="mt-3 break-words text-xs text-saivie-teal">
          Dating: {dating.datingSource || (dating.datingBasis === "LMP" ? "Recorded LMP; confirm with your care team" : dating.datingBasis)}.
          {["Ultrasound", "Clinical assessment"].includes(dating.datingBasis) && " Weeks and due date follow the recorded clinical dating, not the LMP."}
        </p>}
      </div>
    </div>
    <p className="mt-3 border-t border-saivie-border pt-3 text-xs text-saivie-teal">Illustration only, not a scan or to scale. It does not show your baby's actual size, health or development. Your care team can confirm dating and growth.</p>
  </section>;
}
