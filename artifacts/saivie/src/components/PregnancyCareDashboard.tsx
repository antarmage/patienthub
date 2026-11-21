import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  FlaskConical,
  HeartPulse,
  Stethoscope,
  Utensils,
  Video,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  patient: any;
  week: number | null;
  appointments: any[];
  medications: any[];
  labResults: any[];
  visitHistory: any[];
  weightLogs: any[];
  bpLogs?: any[];
  onBook: () => void;
  onOpenTrack: () => void;
  onOpenRecords: () => void;
}

function dateLabel(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
}

export default function PregnancyCareDashboard({
  patient,
  week,
  appointments,
  medications,
  labResults,
  visitHistory,
  weightLogs,
  bpLogs = [],
  onBook,
  onOpenTrack,
  onOpenRecords,
}: Props) {
  const [questions, setQuestions] = useState<number[]>([]);
  const pregnancyWeek = week ?? null;
  const upcoming = [...appointments]
    .filter((item) => {
      const status = String(item.status || "").toLowerCase();
      return item.date && !["cancelled", "canceled", "no-show", "completed"].includes(status);
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const latestVisit = [...visitHistory].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
  const visitVitals = latestVisit?.vitals && typeof latestVisit.vitals === "object"
    ? latestVisit.vitals as Record<string, unknown>
    : {};
  const today = new Date().toISOString().slice(0, 10);
  const sortedWeights = [...(weightLogs || [])].sort((a, b) =>
    new Date(b.loggedAt || b.date || 0).getTime() - new Date(a.loggedAt || a.date || 0).getTime());
  const todayWeight = sortedWeights.find((item) => String(item.date || "").slice(0, 10) === today);
  const weight = todayWeight?.weight != null
    ? Number(todayWeight.weight)
    : sortedWeights[0]?.weight != null
      ? Number(sortedWeights[0].weight)
      : visitVitals.weight != null
        ? Number(visitVitals.weight)
        : patient?.weight != null
          ? Number(patient.weight)
          : null;
  const sortedBp = [...(bpLogs || [])].sort((a, b) =>
    new Date(b.loggedAt || b.date || 0).getTime() - new Date(a.loggedAt || a.date || 0).getTime());
  const todayBp = sortedBp.find((item) => String(item.date || "").slice(0, 10) === today);
  const bp = todayBp?.systolic != null && todayBp?.diastolic != null
    ? `${todayBp.systolic}/${todayBp.diastolic}`
    : sortedBp[0]?.systolic != null && sortedBp[0]?.diastolic != null
      ? `${sortedBp[0].systolic}/${sortedBp[0].diastolic}`
      : typeof visitVitals.bp === "string"
        ? visitVitals.bp
        : patient?.bp || null;
  const pulse = sortedBp[0]?.pulse != null
    ? Number(sortedBp[0].pulse)
    : visitVitals.pulse != null
      ? Number(visitVitals.pulse)
      : null;
  const latestLabs = [...labResults].sort((a, b) =>
    new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 4);

  const appointmentTypes: Array<{ label: string; detail: string; color: string; iconColor: string; icon: React.ElementType }> = [
    { label: "Obstetrician", detail: "Online or in person", color: "#E4DCFF", iconColor: "#3A24B8", icon: Stethoscope },
    { label: "Nutritionist", detail: "Diet and wellness", color: "#FFD9C9", iconColor: "#A8341A", icon: Utensils },
    { label: "Blood test", detail: "Prenatal panels", color: "#FFE7A8", iconColor: "#7A4B00", icon: FlaskConical },
  ];

  const questionItems = [
    "Glucose screening: when is mine?",
    "Which vaccines are recommended now?",
    "Birth plan: what should I decide?",
    "Movement and swelling: anything to watch?",
  ];

  const recentLabs = [...labResults].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 4);
  const activeMedications = medications.filter((item) => String(item.status || "").toLowerCase() === "active");

  return (
    <div className="space-y-8 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-stretch justify-between gap-8 rounded-[40px] bg-[#FFA7B6] p-6 md:p-12"
      >
        <div className="flex min-w-0 basis-[480px] flex-1 flex-col justify-center gap-4">
          <span className="inline-flex h-8 w-fit items-center rounded-full bg-[#2A1220] px-4 text-[12px] font-extrabold tracking-[0.1em] text-[#FFA7B6]">
            {pregnancyWeek != null ? `WEEK ${pregnancyWeek} · MY CARE` : "MY CARE"}
          </span>
          <h1 className="font-serif text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[72px]">
            Your care team, <em className="font-medium">all in one place.</em>
          </h1>
          <p className="max-w-[36ch] text-[17px] font-medium leading-[1.4] md:text-[20px]">
            Book visits, message your team and keep your prenatal records together.
          </p>
        </div>

        <div className="flex min-w-0 basis-[420px] flex-[0_1_420px] flex-col justify-center gap-3 rounded-[32px] bg-white p-7">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#6A5560]">NEXT UP</p>
          {upcoming ? (
            <>
              <p className="font-serif text-[32px] font-bold leading-[1.1]">{dateLabel(upcoming.date)}</p>
              <p className="text-[16px] leading-[1.5] text-[#3A2A44]">
                {upcoming.time ? `${upcoming.time} · ` : ""}{upcoming.visitMode === "telemedicine" ? "Video" : "In person"}
              </p>
              <div className="flex flex-wrap gap-[10px]">
                {upcoming.visitMode === "telemedicine" && upcoming.telemedicineLink && (
                  <a href={upcoming.telemedicineLink} target="_blank" rel="noreferrer" className="flex h-11 items-center rounded-full bg-[#2A1220] px-[18px] text-[15px] font-bold text-[#FFF4E6]">
                    Join
                  </a>
                )}
                <button type="button" onClick={onBook} className="h-11 rounded-full border border-[#D9C3AE] bg-white px-[18px] text-[15px] font-bold">
                  Reschedule
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-serif text-[32px] font-bold leading-[1.1]">No upcoming visit</p>
              <p className="text-[16px] leading-[1.5] text-[#3A2A44]">Choose a care appointment below.</p>
              <button type="button" onClick={onBook} className="h-11 w-fit rounded-full bg-[#2A1220] px-[18px] text-[15px] font-bold text-[#FFF4E6]">
                Book appointment
              </button>
            </>
          )}
        </div>
      </motion.section>

      <section className="space-y-4">
        <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">Book an appointment</h2>
        <div className="flex flex-wrap gap-5">
          {([
            ["Obstetrician", "Online or in person", "#E4DCFF", "#3A24B8", Stethoscope],
            ["Nutritionist", "Diet and wellness", "#FFD9C9", "#A8341A", Utensils],
            ["Blood test", "Prenatal panels", "#FFE7A8", "#7A4B00", FlaskConical],
          ] as Array<[string, string, string, string, React.ElementType]>).map(([label, detail, bg, iconColor, Icon]) => {
            const IconComponent = Icon as React.ElementType;
            return (
              <button
                key={String(label)}
                type="button"
                onClick={onBook}
                className="flex min-w-0 flex-[1_1_240px] flex-col items-start gap-4 rounded-[32px] border border-[#F0DCC4] bg-white p-7 text-left"
              >
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full" style={{ background: bg, color: iconColor }}>
                  <IconComponent className="h-[26px] w-[26px]" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-serif text-[26px] font-bold">{label}</span>
                  <span className="text-[16px] text-[#5A4552]">{detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-stretch gap-5">
        <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-[32px] border border-[#F0DCC4] bg-white p-8">
          <h2 className="font-serif text-[30px] font-bold">Questions for your next visit</h2>
          {questionItems.map((question, index) => (
            <button
              key={question}
              type="button"
              onClick={() => setQuestions((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}
              className="flex min-h-[44px] items-start gap-3 text-left"
              aria-pressed={questions.includes(index)}
            >
              <span className={`mt-[2px] h-6 w-6 shrink-0 rounded-[6px] border-2 ${questions.includes(index) ? "border-[#2A1220] bg-[#2A1220]" : "border-[#2A1220]"} box-border`} />
              <span className="text-[17px] leading-[1.45]">{question}</span>
            </button>
          ))}
        </section>

        <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-[32px] bg-[#FFE7A8] p-8">
          <h2 className="font-serif text-[30px] font-bold leading-[1.1]">Report for your doctor</h2>
          <p className="text-[16px] leading-[1.5] text-[#5A4552]">
            Your weight, blood pressure and baby-movement logs in one clean summary.
          </p>
          <button type="button" onClick={onOpenRecords} className="mt-auto h-[52px] w-fit rounded-full bg-[#2A1220] px-6 text-[16px] font-bold text-[#FFF4E6]">
            Export as PDF
          </button>
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="font-serif text-[38px] font-bold tracking-[-0.02em]">Reports and notes</h2>
        {labResults.length || visitHistory.length || weightLogs.length || bpLogs.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {latestLabs.length > 0 && latestLabs.map((lab) => (
              <article key={lab.id} className="rounded-[28px] border border-[#F0DCC4] bg-white p-6">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">Lab result</p>
                <p className="mt-2 font-serif text-[22px] font-bold">{lab.testName || "Test"}</p>
                <p className="mt-1 text-[15px] text-[#5A4552]">{lab.value != null ? `${lab.value} ${lab.unit || ""}` : lab.status || "Recorded"}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border-2 border-dashed border-[#D9C3AE] p-9">
            <p className="text-[18px] font-bold">Nothing here yet</p>
            <p className="mt-2 text-[16px] leading-[1.5] text-[#5A4552]">Test results and notes from your care team will show up here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
