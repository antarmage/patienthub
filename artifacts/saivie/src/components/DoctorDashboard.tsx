import { useState } from "react";
import {
    Activity, AlertTriangle, ArrowRight, Baby, BriefcaseBusiness, CalendarDays, CheckCircle2,
    Clock, Dna, FileText, HeartPulse, RefreshCw, Search, Settings, Stethoscope, Users, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doctorQueueState, type DoctorDashboardPatient, type DoctorQueueFilter } from "@/lib/doctorDashboard";
import { HpvBadge } from "@/components/HpvBadge";
import { useHpvClinicStatuses } from "@/hooks/use-hpv-protection";

type DashboardCategory = "today-appointments" | "fertility" | "pregnancy" | "postpartum" | "high-risk";

interface DoctorDashboardStats {
    todayAppointments?: number;
    fertilityActive?: number;
    pregnancyFollowups?: number;
    postpartumActive?: number;
    highRiskAlerts?: number;
    pendingLabTasks?: number;
    totalReferrals?: number;
    teamActivity?: {
        clinicalNotes?: number;
        nutritionPlans?: number;
        labReportsToday?: number;
        labReportsTotal?: number;
        visitsToday?: number;
    };
    clinicInsights?: {
        highBpAlerts?: number;
        lowHbCases?: number;
    };
}

interface DoctorDashboardProps<T extends DoctorDashboardPatient> {
    doctorName: string;
    patients: T[];
    date: string;
    stats?: DoctorDashboardStats | null;
    statsLoading: boolean;
    statsError: Error | null;
    onDate: (date: string) => void;
    filter: DoctorQueueFilter;
    onFilter: (filter: DoctorQueueFilter) => void;
    isLoading: boolean;
    error: Error | null;
    isStarting: boolean;
    onRefresh: () => void;
    onOpen: (patient: T) => void;
    onStart: (patient: T) => void;
    onSchedule: () => void;
    onSettings: () => void;
    onOpenCategory: (category: DashboardCategory) => void;
}

const filterLabels: Record<DoctorQueueFilter, string> = {
    all: "All patients", waiting: "Waiting", "in-consultation": "In consultation", scheduled: "Upcoming", completed: "Completed",
};

function careType(patient: DoctorDashboardPatient) {
    const type = (patient.type || "").toLowerCase();
    if (["fertility", "ttc", "iui", "ivf", "pcos", "natural_conception"].some((value) => type.includes(value))) return "Fertility";
    if (["pregnancy", "pregnant", "antenatal"].some((value) => type.includes(value))) return "Pregnancy";
    if (["postpartum", "postnatal"].some((value) => type.includes(value))) return "Postpartum";
    return patient.type || "General";
}

function patientStateLabel(patient: DoctorDashboardPatient) {
    const state = doctorQueueState(patient);
    return state === "closed" ? "Closed" : filterLabels[state];
}

function SummaryCard({
    label, value, detail, icon: Icon, tone, onClick,
}: {
    label: string;
    value: number | string;
    detail: string;
    icon: typeof Users;
    tone: string;
    onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#e9e1d2] bg-[#fffaf0] p-4 text-left transition hover:border-[#c89bb5] hover:shadow-sm">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-[#705364]">{label}</span>
                <span className="block text-2xl font-semibold leading-tight">{value}</span>
                <span className="block truncate text-[10px] text-[#705364]">{detail}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#875477]" />
        </button>
    );
}

export function DoctorDashboard<T extends DoctorDashboardPatient>({
    doctorName, patients, date, stats, statsLoading, statsError, onDate, filter, onFilter,
    isLoading, error, isStarting, onRefresh, onOpen, onStart, onSchedule, onSettings, onOpenCategory,
}: DoctorDashboardProps<T>) {
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selectedDate = new Date(`${date}T00:00:00`);
    const datePatients = patients.filter((patient) => patient.appointmentDate === date && doctorQueueState(patient) !== "closed");
    const hpvStatus = useHpvClinicStatuses(datePatients.map((patient) => patient.id));
    const visible = datePatients.filter((patient) =>
        (filter === "all" || doctorQueueState(patient) === filter) &&
        `${patient.name} ${patient.type || ""} ${patient.appointmentChiefComplaint || ""}`.toLowerCase().includes(search.trim().toLowerCase()),
    );
    const selected = visible.find((patient) => patient.appointmentId === selectedId) || visible[0];
    const waiting = datePatients.filter((patient) => doctorQueueState(patient) === "waiting").length;
    const riskPatients = datePatients
        .filter((patient) => ["critical", "high"].includes((patient.riskScore?.level || "").toLowerCase()))
        .sort((a, b) => (b.riskScore?.score || 0) - (a.riskScore?.score || 0));
    const fertilityToday = datePatients.filter((patient) => careType(patient) === "Fertility").length;
    const pregnancyToday = datePatients.filter((patient) => careType(patient) === "Pregnancy").length;
    const postpartumToday = datePatients.filter((patient) => careType(patient) === "Postpartum").length;
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const appointmentsValue = stats?.todayAppointments ?? (date === todayString ? datePatients.length : "—");
    const hour = today.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    return (
        <section className="space-y-6 text-[#242821]" data-testid="doctor-dashboard">
            <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[#e9d9df] bg-[#fffaf0] px-4">
                    <Search className="h-4 w-4 shrink-0 text-[#875477]" />
                    <Input className="border-0 bg-transparent shadow-none focus-visible:ring-0" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients, visit reason..." aria-label="Search dashboard patients" data-testid="input-doctor-dashboard-search" />
                    <span className="hidden rounded-full bg-[#242821] px-3 py-1 text-xs text-white sm:block">Patients</span>
                </div>
                <Button variant="outline" size="icon" aria-label="Refresh dashboard" onClick={onRefresh}><RefreshCw className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" aria-label="Doctor settings" onClick={onSettings}><Settings className="h-4 w-4" /></Button>
            </div>

            <header>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#875477]">Today at a glance</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{greeting}, {doctorName}</h1>
                <p className="mt-2 text-sm text-[#705364]">{selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {waiting} {waiting === 1 ? "patient" : "patients"} waiting for consultation.</p>
            </header>

            {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load your dashboard: {error.message} <Button variant="link" onClick={onRefresh}>Retry</Button></div>}
            {!error && isLoading && <p role="status" className="py-4 text-center">Loading your clinic...</p>}
            {!error && !isLoading && <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Clinic summary">
                    <SummaryCard label="Today's appointments" value={statsLoading ? "…" : appointmentsValue} detail="Open today's schedule" icon={CalendarDays} tone="bg-[#f7df78] text-[#584c1e]" onClick={() => onOpenCategory("today-appointments")} />
                    <SummaryCard label="Fertility care" value={statsLoading ? "…" : stats?.fertilityActive ?? "—"} detail={`${fertilityToday} on selected day`} icon={Dna} tone="bg-[#efb8d5] text-[#704660]" onClick={() => onOpenCategory("fertility")} />
                    <SummaryCard label="Pregnancy follow-ups" value={statsLoading ? "…" : stats?.pregnancyFollowups ?? "—"} detail={`${pregnancyToday} on selected day`} icon={Baby} tone="bg-[#b9cee8] text-[#385679]" onClick={() => onOpenCategory("pregnancy")} />
                    <SummaryCard label="Postpartum care" value={statsLoading ? "…" : stats?.postpartumActive ?? "—"} detail={`${postpartumToday} on selected day`} icon={HeartPulse} tone="bg-[#b9cb8c] text-[#45552c]" onClick={() => onOpenCategory("postpartum")} />
                    <SummaryCard label="High-risk alerts" value={statsLoading ? "…" : stats?.highRiskAlerts ?? "—"} detail={`${riskPatients.length} high-risk visits on selected day`} icon={AlertTriangle} tone="bg-[#f3c6b7] text-[#8b3c33]" onClick={() => onOpenCategory("high-risk")} />
                </div>
                {statsError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Clinic-wide summary could not be loaded: {statsError.message}</p>}

                <section className="rounded-3xl border border-[#eadbdc] bg-[#fffaf5] p-5" aria-label="Needs doctor attention">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#a34343]">Priority attention</p>
                            <h2 className="mt-1 text-lg font-semibold">Needs doctor attention</h2>
                        </div>
                        <Badge variant="outline" className="bg-white">{riskPatients.length} high-risk {riskPatients.length === 1 ? "visit" : "visits"} today</Badge>
                    </div>
                    {riskPatients.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {riskPatients.slice(0, 6).map((patient) => <button key={patient.appointmentId} type="button" onClick={() => onOpen(patient)} className="rounded-2xl border border-rose-200 bg-white p-4 text-left transition hover:shadow-sm" data-testid={`dashboard-priority-${patient.appointmentId}`}>
                            <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-semibold">{patient.name}</span>
                                <Badge className={patient.riskScore?.level?.toLowerCase() === "critical" ? "bg-rose-700 text-white" : "bg-orange-100 text-orange-800"}>{patient.riskScore?.level || "High"}</Badge>
                            </div>
                            <p className="mt-2 text-xs text-[#705364]">{patient.type || "Patient"}{patient.appointmentTime ? ` · ${patient.appointmentTime}` : ""} · {patientStateLabel(patient)}</p>
                            <p className="mt-2 text-sm">{patient.appointmentChiefComplaint || "Recorded elevated clinical risk"}</p>
                        </button>)}
                    </div> : <div className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-[#526044]"><CheckCircle2 className="h-5 w-5 shrink-0" />No high or critical risk is recorded for the selected day.</div>}
                </section>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <section className="min-w-0 rounded-3xl border border-[#e9e1d2] bg-[#fffaf0] p-5" aria-label="Today's patient flow">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#875477]">Today’s patient flow</p>
                                <h2 className="mt-1 text-lg font-semibold">Schedule with clinical context</h2>
                            </div>
                            <Select value={filter} onValueChange={(value: DoctorQueueFilter) => onFilter(value)}>
                                <SelectTrigger className="h-9 w-40 bg-white text-xs" aria-label="Filter patient queue"><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(filterLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="max-h-[520px] space-y-2 overflow-y-auto">
                            {visible.map((patient) => <div key={patient.appointmentId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#eee5d7] bg-white p-3" data-testid={`dashboard-patient-${patient.appointmentId}`}>
                                <span className="w-14 shrink-0 text-xs font-medium text-[#705364]">{patient.appointmentTime || "—"}</span>
                                <span className="min-w-0 flex-1">
                                    <button type="button" className="block max-w-full truncate text-left text-sm font-semibold hover:underline" onClick={() => setSelectedId(patient.appointmentId)}>{patient.name}</button>
                                    <HpvBadge status={hpvStatus(patient.id)} className="mt-1" />
                                    <span className="block truncate text-xs text-[#705364]">{careType(patient)} · {patient.appointmentChiefComplaint || patient.appointmentType || "Visit reason not recorded"}</span>
                                </span>
                                <Badge variant="outline">{patientStateLabel(patient)}</Badge>
                                {patient.riskScore?.level && <Badge className="bg-rose-50 text-rose-800">{patient.riskScore.level} risk</Badge>}
                                <Button size="sm" variant="outline" onClick={() => onOpen(patient)} data-testid="btn-dashboard-open-patient">Open</Button>
                                {doctorQueueState(patient) === "waiting" && <Button size="sm" disabled={isStarting} onClick={() => onStart(patient)} data-testid="btn-dashboard-start-consult">Start</Button>}
                                {doctorQueueState(patient) === "in-consultation" && <Button size="sm" onClick={() => onOpen(patient)}>Resume</Button>}
                                {patient.appointmentVisitMode === "telemedicine" && <OnlineConsultationActions appointmentId={patient.appointmentId} canShare />}
                            </div>)}
                            {!visible.length && <p className="rounded-2xl bg-white p-6 text-center text-sm">No patients match this view.</p>}
                        </div>
                    </section>

                    <aside className="space-y-4">
                        <div className="rounded-3xl bg-[#fff9ed] p-3">
                            <Calendar mode="single" selected={selectedDate} defaultMonth={selectedDate} className="mx-auto bg-transparent" onSelect={(day) => {
                                if (day) {
                                    onDate(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`);
                                    setSelectedId(null);
                                }
                            }} />
                            <Button className="w-full bg-[#242821] text-white hover:bg-[#383e31]" onClick={onSchedule}><CalendarDays className="mr-2 h-4 w-4" />Open schedule</Button>
                        </div>
                        <section className="rounded-3xl bg-[#efb8d5] p-5" aria-label="Visit details" data-testid="dashboard-visit-details">
                            <h2 className="font-semibold">Visit details</h2>
                            {selected ? <>
                                <div className="mt-3 flex items-start justify-between gap-2"><h3 className="font-semibold">{selected.name}</h3><Badge variant="outline" className="bg-white/70 text-[10px]">#{selected.appointmentId}</Badge></div>
                                <p className="mt-1 text-xs">{selected.age != null ? `${selected.age} years · ` : ""}{careType(selected)}</p>
                                <HpvBadge status={hpvStatus(selected.id)} variant="full" className="mt-3" />
                                <dl className="mt-4 space-y-3 text-xs">
                                    <div><dt className="text-[#705364]">Reason for visit</dt><dd className="mt-1 font-medium">{selected.appointmentChiefComplaint || "Not recorded"}</dd></div>
                                    <div><dt className="text-[#705364]">Check-in vitals</dt><dd className="mt-1">{[selected.appointmentVitals?.bp && `BP ${selected.appointmentVitals.bp}`, selected.appointmentVitals?.pulse && `Pulse ${selected.appointmentVitals.pulse}`, selected.appointmentVitals?.weight && `Weight ${selected.appointmentVitals.weight} kg`].filter(Boolean).join(" · ") || "Not recorded"}</dd></div>
                                    <div><dt className="text-[#705364]">Appointment notes</dt><dd className="mt-1 whitespace-pre-wrap">{selected.appointmentNotes || "No appointment notes"}</dd></div>
                                </dl>
                                <Button size="sm" variant="outline" className="mt-4 bg-white/70" onClick={() => onOpen(selected)}>Open patient record<ArrowRight className="ml-1 h-3 w-3" /></Button>
                            </> : <p className="mt-3 text-sm">Select a patient from the flow to review visit details.</p>}
                        </section>
                    </aside>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <section className="rounded-3xl bg-[#f7df78] p-5" aria-label="Fertility intelligence snapshot">
                        <div className="flex items-center gap-2"><Dna className="h-5 w-5" /><h2 className="font-semibold">Fertility intelligence</h2></div>
                        <p className="mt-4 text-3xl font-semibold">{statsLoading ? "…" : stats?.fertilityActive ?? "—"}</p>
                        <p className="text-xs">active fertility patients · {fertilityToday} on selected day</p>
                        <p className="mt-3 border-t border-black/10 pt-3 text-xs">Cycle-window and treatment milestone counts are not currently available in the dashboard data.</p>
                        <Button variant="link" className="mt-1 px-0 text-[#242821]" onClick={() => onOpenCategory("fertility")}>Open fertility patients<ArrowRight className="ml-1 h-3 w-3" /></Button>
                    </section>
                    <section className="rounded-3xl bg-[#b9cee8] p-5" aria-label="Pregnancy monitoring snapshot">
                        <div className="flex items-center gap-2"><Baby className="h-5 w-5" /><h2 className="font-semibold">Pregnancy monitoring</h2></div>
                        <p className="mt-4 text-3xl font-semibold">{statsLoading ? "…" : stats?.pregnancyFollowups ?? "—"}</p>
                        <p className="text-xs">active follow-ups · {pregnancyToday} on selected day</p>
                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-3 text-sm">
                            <div><strong>{statsLoading ? "…" : stats?.clinicInsights?.highBpAlerts ?? "—"}</strong><p className="text-[10px]">High BP alerts</p></div>
                            <div><strong>{statsLoading ? "…" : stats?.clinicInsights?.lowHbCases ?? "—"}</strong><p className="text-[10px]">Low Hb cases</p></div>
                        </div>
                        <Button variant="link" className="mt-1 px-0 text-[#242821]" onClick={() => onOpenCategory("pregnancy")}>Review pregnancy patients<ArrowRight className="ml-1 h-3 w-3" /></Button>
                    </section>
                    <section className="rounded-3xl bg-[#b9cb8c] p-5" aria-label="Postpartum watch">
                        <div className="flex items-center gap-2"><HeartPulse className="h-5 w-5" /><h2 className="font-semibold">Postpartum watch</h2></div>
                        <p className="mt-4 text-3xl font-semibold">{statsLoading ? "…" : stats?.postpartumActive ?? "—"}</p>
                        <p className="text-xs">active postpartum patients · {postpartumToday} on selected day</p>
                        <p className="mt-3 border-t border-black/10 pt-3 text-xs">Mood, lactation, and contraception alerts are not currently summarized in the dashboard data.</p>
                        <Button variant="link" className="mt-1 px-0 text-[#242821]" onClick={() => onOpenCategory("postpartum")}>Review postpartum patients<ArrowRight className="ml-1 h-3 w-3" /></Button>
                    </section>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <section className="rounded-3xl border border-[#e9e1d2] bg-white p-5" aria-label="Care team activity">
                        <div className="mb-4 flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-[#875477]" /><h2 className="font-semibold">Care team activity</h2></div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div><FileText className="mb-2 h-4 w-4 text-[#875477]" /><strong>{statsLoading ? "…" : stats?.teamActivity?.clinicalNotes ?? "—"}</strong><p className="text-xs text-[#705364]">Clinical notes today</p></div>
                            <div><Activity className="mb-2 h-4 w-4 text-[#875477]" /><strong>{statsLoading ? "…" : stats?.teamActivity?.nutritionPlans ?? "—"}</strong><p className="text-xs text-[#705364]">Nutrition plans total</p></div>
                            <div><Users className="mb-2 h-4 w-4 text-[#875477]" /><strong>{statsLoading ? "…" : stats?.teamActivity?.visitsToday ?? "—"}</strong><p className="text-xs text-[#705364]">Visits recorded today</p></div>
                            <div><Stethoscope className="mb-2 h-4 w-4 text-[#875477]" /><strong>{statsLoading ? "…" : stats?.teamActivity?.labReportsToday ?? "—"}</strong><p className="text-xs text-[#705364]">Lab reports today</p></div>
                        </div>
                    </section>
                    <section className="rounded-3xl border border-[#e9e1d2] bg-white p-5" aria-label="Clinic insights">
                        <div className="mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-[#875477]" /><h2 className="font-semibold">Clinic insights</h2></div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <div><strong>{statsLoading ? "…" : stats?.teamActivity?.visitsToday ?? "—"}</strong><p className="text-xs text-[#705364]">Visits today</p></div>
                            <div><strong>{statsLoading ? "…" : stats?.pendingLabTasks ?? "—"}</strong><p className="text-xs text-[#705364]">Pending lab tasks</p></div>
                            <div><strong>{statsLoading ? "…" : stats?.totalReferrals ?? "—"}</strong><p className="text-xs text-[#705364]">Referrals recorded</p></div>
                        </div>
                        <p className="mt-4 flex items-center gap-2 border-t border-[#eee5d7] pt-3 text-xs text-[#705364]"><Clock className="h-4 w-4" />Only metrics currently supplied by clinic records are shown.</p>
                    </section>
                </div>
            </>}
        </section>
    );
}
import { OnlineConsultationActions } from "@/components/OnlineConsultationActions";
