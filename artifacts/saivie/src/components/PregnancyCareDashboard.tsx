import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Heart,
  Pill,
  Stethoscope,
  TestTube,
  UserRound,
  Video,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  patient: any;
  week: number | null;
  appointments: any[];
  medications: any[];
  labResults: any[];
  visitHistory: any[];
  weightLogs: any[];
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
  onBook,
  onOpenTrack,
  onOpenRecords,
}: Props) {
  const activeMedicines = medications.filter((item) => String(item.status || "").toLowerCase() === "active");
  const upcoming = [...appointments]
    .filter((item) => {
      const status = String(item.status || "").toLowerCase();
      return item.date && !["cancelled", "canceled", "no-show", "completed"].includes(status);
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const latestVisit = [...visitHistory].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
  const visitVitals = latestVisit?.vitals && typeof latestVisit.vitals === "object" ? latestVisit.vitals as Record<string, unknown> : {};
  const latestDbWeight = weightLogs?.[0]?.weight != null ? Number(weightLogs[0].weight) : null;
  const latestWeight = latestDbWeight ?? (visitVitals.weight != null ? Number(visitVitals.weight) : patient?.weight != null ? Number(patient.weight) : null);
  const latestBp = typeof visitVitals.bp === "string" ? visitVitals.bp : patient?.bp || null;
  const latestPulse = visitVitals.pulse != null ? Number(visitVitals.pulse) : null;
  const latestLabs = [...labResults].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 4);

  const pregnancyWeeks = week ?? null;

  return (
    <div className="space-y-6 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[32px] border border-[#F3DAD0] bg-[#FFF4EE] p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#6A5560]">
              {pregnancyWeeks != null ? `WEEK ${pregnancyWeeks} · PREGNANCY` : "PREGNANCY"}
            </p>
            <h1 className="mt-2 font-serif text-[38px] font-bold leading-[1.02]">Your pregnancy care</h1>
          </div>
          <button type="button" onClick={onBook} className="min-h-[52px] rounded-full bg-[#2A1220] px-6 text-[16px] font-bold text-[#FFF4EE]">
            Book appointment
          </button>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <section className="space-y-4">
          <Card className="rounded-[32px] border border-[#F3DAD0] bg-white">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F8EEF5]">
                  <CalendarDays className="h-5 w-5 text-[#8D5B7B]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">Next appointment</p>
                  {upcoming ? (
                    <>
                      <p className="mt-2 font-serif text-[24px] font-bold leading-[1.1]">{dateLabel(upcoming.date)}</p>
                      {upcoming.time && <p className="mt-1 text-[14px] text-[#5A4552]">{upcoming.time}</p>}
                      {upcoming.type && <p className="mt-1 text-[14px] text-[#5A4552]">{upcoming.type}</p>}
                    </>
                  ) : (
                    <p className="mt-2 font-serif text-[24px] font-bold leading-[1.1]">No upcoming visit booked</p>
                  )}
                </div>
                {upcoming?.visitMode === "telemedicine" && upcoming?.telemedicineLink && (
                  <a href={upcoming.telemedicineLink} target="_blank" rel="noreferrer" className="flex h-11 items-center rounded-full bg-[#2A1220] px-4 text-[14px] font-bold text-white">
                    <Video className="mr-2 h-4 w-4" />Join
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border border-[#F3DAD0] bg-white">
            <CardContent className="p-6">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">Vitals</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["Weight", latestWeight != null ? `${latestWeight} kg` : "Not recorded"],
                  ["BP", latestBp || "Not recorded"],
                  ["Pulse", latestPulse != null ? `${latestPulse} bpm` : "Not recorded"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[20px] border border-[#F0DCC4] p-4 text-center">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#6A5560]">{label}</p>
                    <p className="mt-2 font-serif text-[22px] font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="flex min-w-0 flex-col gap-5">
          <Card className="rounded-[32px] border border-[#F3DAD0] bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">Prenatal medicines</p>
                <Pill className="h-4 w-4 text-[#8D5B7B]" />
              </div>
              {activeMedicines.length ? (
                <div className="mt-4 space-y-3">
                  {activeMedicines.slice(0, 4).map((medicine) => (
                    <div key={medicine.id} className="rounded-[20px] bg-[#F8EEF5] p-4">
                      <p className="text-[15px] font-bold">{medicine.name}</p>
                      {[medicine.dose, medicine.frequency].filter(Boolean).length > 0 && (
                        <p className="mt-1 text-[13px] text-[#5A4552]">{[medicine.dose, medicine.frequency].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-[15px] text-[#5A4552]">No active medicines recorded.</p>
              )}
            </CardContent>
          </Card>

          <section className="rounded-[32px] bg-[#2A1220] p-6 text-[#FFF4EE]">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#FFA7B6]">COMING UP</p>
            <h2 className="mt-3 font-serif text-[28px] font-bold leading-[1.1]">
              {pregnancyWeeksCard(week)}
            </h2>
          </section>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-[32px] border border-[#F3DAD0] bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[26px] font-bold">Recent visits</h2>
            <Stethoscope className="h-5 w-5 text-[#8D5B7B]" />
          </div>
          {visitHistory.length ? (
            <div className="mt-4 space-y-3">
              {[...visitHistory].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 3).map((visit) => (
                <div key={visit.id} className="rounded-[20px] border border-[#F0DCC4] p-4">
                  <p className="text-[14px] font-bold">{visit.diagnosis || visit.visitType || "Prenatal visit"}</p>
                  <p className="mt-1 text-[13px] text-[#6A5560]">{dateLabel(visit.date)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[15px] text-[#6A5560]">No prenatal visits recorded yet.</p>
          )}
        </section>

        <section className="rounded-[32px] border border-[#F3DAD0] bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[26px] font-bold">Recent lab results</h2>
            <FlaskConical className="h-5 w-5 text-[#2F6B60]" />
          </div>
          {latestLabs.length ? (
            <div className="mt-4 space-y-3">
              {latestLabs.map((lab) => (
                <div key={lab.id} className="flex items-center justify-between rounded-[20px] border border-[#F0DCC4] p-4">
                  <div>
                    <p className="text-[14px] font-bold">{lab.testName || "Lab result"}</p>
                    <p className="mt-1 text-[12px] text-[#6A5560]">{dateLabel(lab.date)}</p>
                  </div>
                  <Badge variant="outline" className="text-[12px]">{lab.value != null ? `${lab.value} ${lab.unit || ""}` : lab.status || "Recorded"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[15px] text-[#6A5560]">No lab results recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  );

  function pregnancyWeeksCard(currentWeek: number | null) {
    if (currentWeek == null) return "Routine care plan";
    if (currentWeek >= 28) return "Third trimester plan";
    const remaining = 28 - currentWeek;
    return `${remaining} weeks until third trimester`;
  }
}
