import { Fragment, useMemo, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calendarDate, calendarDateValue } from "@/lib/calendarDates";
import { directoryPatientIds, type DirectoryAppointment } from "@/lib/patientDirectory";
import { compareClinicalPatients, matchesPatientTab, matchesTrimester, patientGestation, patientRisk, type ClinicalDirectoryPatient, type PatientListSort, type PatientListTab, type TrimesterFilter } from "@/lib/clinicalPatientList";

const tabs: { value: PatientListTab; label: string }[] = [
  { value: "today", label: "Today" }, { value: "pregnant", label: "Pregnant" },
  { value: "pcos", label: "PCOS" }, { value: "high-risk", label: "High-risk" },
  { value: "follow-ups", label: "Follow-ups due" }, { value: "all", label: "All patients" },
];
const trimesters: { value: TrimesterFilter; label: string }[] = [
  { value: "all", label: "All pregnant" }, { value: "first", label: "1st · 0-13w" },
  { value: "second", label: "2nd · 14-27w" }, { value: "third", label: "3rd · 28w+" },
  { value: "near-term", label: "Near term · 37w+" },
];

function displayDate(value?: string | null, today?: string) {
  if (!value) return "Not recorded";
  if (value === today) return "Today";
  const date = calendarDate(value);
  return date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : value;
}

function riskStyle(level: string) {
  switch (level.toLowerCase()) {
    case "critical": return "bg-rose-100 text-rose-800";
    case "high": return "bg-orange-100 text-orange-800";
    case "medium": case "moderate": return "bg-[#eef2df] text-[#626d30]";
    case "low": return "bg-[#edf3f0] text-[#315d54]";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function ClinicalPatientList({ patients, allPatients, appointments, loadingAppointments, appointmentsAvailable, loadingPatients, patientsAvailable, onOpen, children }: {
  patients: ClinicalDirectoryPatient[];
  allPatients: ClinicalDirectoryPatient[];
  appointments: DirectoryAppointment[];
  loadingAppointments: boolean;
  appointmentsAvailable: boolean;
  loadingPatients: boolean;
  patientsAvailable: boolean;
  onOpen: (patient: ClinicalDirectoryPatient) => void;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<PatientListTab>("all");
  const [trimester, setTrimester] = useState<TrimesterFilter>("all");
  const [risk, setRisk] = useState("all");
  const [sort, setSort] = useState<PatientListSort>("name");
  const today = calendarDateValue(new Date());
  const todayIds = useMemo(() => directoryPatientIds(appointments, today, today), [appointments, today]);
  const nextVisits = useMemo(() => {
    const visits = new Map<string, DirectoryAppointment>();
    [...appointments].filter((appointment) => appointment.date >= today && !["completed", "cancelled", "canceled"].includes((appointment.status || "").toLowerCase()))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""))
      .forEach((appointment) => {
        if (appointment.patientId != null && !visits.has(String(appointment.patientId))) visits.set(String(appointment.patientId), appointment);
      });
    return visits;
  }, [appointments, today]);
  const filtered = patients.filter((patient) => matchesPatientTab(patient, tab, today, todayIds)
    && (tab !== "pregnant" || matchesTrimester(patientGestation(patient, today).weeks, trimester))
    && (risk === "all" || patientRisk(patient).toLowerCase() === risk))
    .sort((a, b) => compareClinicalPatients(a, b, sort, today));
  const grouped = tab === "pregnant" && sort === "due-date";
  const groups = grouped ? [
    { label: "Near term · 37w+ · LMP estimates", patients: filtered.filter((patient) => (patientGestation(patient, today).weeks ?? -1) >= 37), near: true },
    { label: "Before 37 weeks · LMP estimates", patients: filtered.filter((patient) => { const weeks = patientGestation(patient, today).weeks; return weeks !== null && weeks < 37; }), near: false },
    { label: "Pregnancy dating not available", patients: filtered.filter((patient) => patientGestation(patient, today).weeks === null), near: false },
  ] : [{ label: "", patients: filtered, near: false }];

  return <div className="space-y-4">
    <div className="flex gap-6 overflow-x-auto border-b border-saivie-border" role="group" aria-label="Patient care filters">
      {tabs.map((item) => <button key={item.value} type="button" aria-pressed={tab === item.value}
        className={`shrink-0 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${tab === item.value ? "border-saivie-plum text-saivie-plum" : "border-transparent text-saivie-plum/70 hover:text-saivie-teal"}`}
        onClick={() => { setTab(item.value); setTrimester("all"); setSort(item.value === "pregnant" ? "due-date" : item.value === "follow-ups" ? "next-review" : "name"); }}>
        {item.label} <span className="ml-1 rounded-full bg-[#e7efec] px-2 text-[11px] text-saivie-teal">{loadingPatients || (item.value === "today" && loadingAppointments) ? "..." : !patientsAvailable || (item.value === "today" && !appointmentsAvailable) ? "—" : allPatients.filter((patient) => matchesPatientTab(patient, item.value, today, todayIds)).length}</span>
      </button>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">{tab === "pregnant" ? trimesters.map((item) => <button key={item.value} type="button" aria-pressed={trimester === item.value} onClick={() => setTrimester(item.value)}
        className={`rounded-full border px-4 py-2 text-xs font-semibold ${trimester === item.value ? "border-saivie-teal bg-saivie-teal text-white" : item.value === "near-term" ? "border-rose-200 bg-white text-rose-700" : "border-saivie-border bg-white text-saivie-plum"}`}>{item.label}</button>) :
        <p className="text-xs text-saivie-plum/70" role="status">{loadingPatients ? "Loading records..." : `${filtered.length} matching records`}</p>}</div>
      <div className="flex gap-2">
        <Select value={risk} onValueChange={setRisk}><SelectTrigger aria-label="Filter by risk" className="h-10 w-[145px] rounded-full bg-white text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Risk: All</SelectItem>{["Critical", "High", "Medium", "Low", "Not assessed"].map((level) => <SelectItem key={level} value={level.toLowerCase()}>{level}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value: PatientListSort) => setSort(value)}><SelectTrigger aria-label="Sort patients" className="h-10 w-[210px] rounded-full bg-white text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="name">Sort: Name, A-Z</SelectItem><SelectItem value="due-date">Sort: Due date, soonest</SelectItem><SelectItem value="next-review">Sort: Follow-up, soonest</SelectItem><SelectItem value="risk">Sort: Highest risk</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
    <section className="overflow-hidden rounded-2xl border border-saivie-border bg-white">
      {children}
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-[#f5f7f5] text-[10px] uppercase tracking-wider text-saivie-plum/80"><tr>
          <th className="px-5 py-3">Patient</th><th className="px-5 py-3">Gestation · Due date / Care</th><th className="px-5 py-3">Recorded flags</th><th className="px-5 py-3">Next visit</th><th className="px-5 py-3">Risk</th><th className="w-12"><span className="sr-only">Open record</span></th>
        </tr></thead>
        <tbody>{groups.map((group) => <Fragment key={group.label}>
          {group.label && group.patients.length > 0 && <tr className={group.near ? "bg-[#fcf1f4] text-[#a4455d]" : "bg-[#eff5f2] text-saivie-teal"}><th colSpan={6} className="px-5 py-2 text-xs font-semibold">{group.label} · {group.patients.length} {group.patients.length === 1 ? "patient" : "patients"}</th></tr>}
          {group.patients.map((patient) => {
            const gestation = patientGestation(patient, today);
            const nextVisit = nextVisits.get(String(patient.id));
            const level = patientRisk(patient);
            const flags = [...new Set([patient.condition, ...(patient.riskScore?.factors || []).map((factor) => factor.factor)].filter((value): value is string => Boolean(value)))];
            return <tr key={patient.id} data-testid={`patient-directory-row-${patient.id}`} className="border-t border-slate-100 hover:bg-[#f8faf8]">
              <td className="px-5 py-4"><button type="button" onClick={() => onOpen(patient)} className="flex items-center gap-3 text-left focus-visible:outline-saivie-teal">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf3f0] text-xs font-semibold text-saivie-teal">{patient.name.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("")}</span>
                <span><span className="block font-semibold text-saivie-plum">{patient.name || "Unnamed patient"}</span><span className="block text-xs text-saivie-plum/70">{patient.age != null ? `${patient.age} y · ` : ""}{patient.phone ? `•••• ${patient.phone.slice(-5)}` : "No phone recorded"}</span></span>
              </button></td>
              <td className="px-5 py-4">{gestation.dating && gestation.weeks !== null ? <div className="max-w-[240px]">
                <div><strong className="text-saivie-plum">{gestation.weeks}w {gestation.days}d</strong> <span className="text-[11px] text-saivie-plum/70">{gestation.weeks < 14 ? "1st" : gestation.weeks < 28 ? "2nd" : "3rd"} trimester</span></div>
                <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-[#e5ece8]" aria-hidden="true"><div className={`h-full ${gestation.weeks >= 37 ? "bg-[#ac4c65]" : "bg-[#5c8f80]"}`} style={{ width: `${Math.min(100, ((gestation.weeks * 7 + (gestation.days || 0)) / 280) * 100)}%` }} /></div>
                <p className="text-[11px] text-saivie-plum/70">EDD {displayDate(gestation.dating.dueDate)} · LMP estimate</p>
              </div> : <div><p className="text-saivie-plum">{patient.type || patient.mode || "General care"}</p>{gestation.pregnant && <p className="text-xs text-saivie-plum/70">Valid LMP needed for dating</p>}</div>}</td>
              <td className="max-w-[250px] px-5 py-4"><div className="flex flex-wrap gap-1">{flags.length ? flags.map((flag) => <span key={flag} className="rounded bg-[#f4eef3] px-2 py-1 text-[10px] text-saivie-plum">{flag}</span>) : <span className="text-xs text-saivie-plum/60">None recorded</span>}</div></td>
              <td className="px-5 py-4"><p className={`font-medium ${nextVisit?.date === today ? "text-saivie-teal" : "text-saivie-plum"}`}>{nextVisit ? `${displayDate(nextVisit.date, today)}${nextVisit.time ? ` · ${nextVisit.time}` : ""}` : loadingAppointments ? "Loading visits..." : !appointmentsAvailable ? "Schedule unavailable" : "No upcoming visit"}</p>
                <p className="mt-1 text-[11px] text-saivie-plum/70">Last visit {displayDate(patient.lastVisit)}</p>{patient.nextReview && <p className="text-[11px] text-saivie-plum/70">Follow-up {displayDate(patient.nextReview, today)}</p>}</td>
              <td className="px-5 py-4"><span className={`inline-block rounded px-2 py-1 text-[11px] font-semibold ${riskStyle(level)}`}>{level}</span></td>
              <td className="pr-4"><button type="button" onClick={() => onOpen(patient)} aria-label={`Open ${patient.name}'s record`} className="rounded-full p-2 text-saivie-plum hover:bg-saivie-sage"><ChevronRight className="h-4 w-4" /></button></td>
            </tr>;
          })}
        </Fragment>)}
        {!filtered.length && !loadingPatients && patientsAvailable && (tab !== "today" || appointmentsAvailable) && <tr><td colSpan={6} className="px-5 py-14 text-center"><Users className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 font-medium text-saivie-plum">No matching patients</p><p className="mt-1 text-xs text-saivie-plum/70">Adjust the care, date, search or risk filters.</p></td></tr>}
        </tbody>
      </table></div>
    </section>
  </div>;
}
