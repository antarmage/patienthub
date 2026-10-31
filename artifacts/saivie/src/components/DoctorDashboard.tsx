import { useState } from "react";
import { ArrowRight, CalendarDays, Clock, RefreshCw, Search, Settings, Stethoscope, Video } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doctorQueueState, visitDurationSummary, type DoctorDashboardPatient, type DoctorQueueFilter } from "@/lib/doctorDashboard";

interface DoctorDashboardProps<T extends DoctorDashboardPatient> {
    doctorName: string;
    patients: T[];
    date: string;
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
}

const filterLabels: Record<DoctorQueueFilter, string> = { all: "All patients", waiting: "Waiting", "in-consultation": "In consultation", scheduled: "Upcoming", completed: "Completed" };
const tones = ["bg-[#f7df78]", "bg-[#efb8d5]", "bg-[#b9cb8c]", "bg-[#b9cee8]"];
function patientStateLabel(patient: DoctorDashboardPatient) {
    const state = doctorQueueState(patient);
    return state === "closed" ? "Closed" : filterLabels[state];
}

export function DoctorDashboard<T extends DoctorDashboardPatient>({
    doctorName, patients, date, onDate, filter, onFilter, isLoading, error, isStarting,
    onRefresh, onOpen, onStart, onSchedule, onSettings,
}: DoctorDashboardProps<T>) {
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selectedDate = new Date(`${date}T00:00:00`);
    const datePatients = patients.filter((patient) => patient.appointmentDate === date && doctorQueueState(patient) !== "closed");
    const visible = datePatients.filter((patient) => (filter === "all" || doctorQueueState(patient) === filter) && `${patient.name} ${patient.type || ""} ${patient.appointmentChiefComplaint || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
    const selected = visible.find((patient) => patient.appointmentId === selectedId) || visible[0];
    const durations = visitDurationSummary(datePatients);
    const waiting = datePatients.filter((patient) => doctorQueueState(patient) === "waiting").length;
    const ageBands = [
        { label: "< 30", count: datePatients.filter((patient) => patient.age != null && patient.age < 30).length },
        { label: "30–44", count: datePatients.filter((patient) => patient.age != null && patient.age >= 30 && patient.age < 45).length },
        { label: "45+", count: datePatients.filter((patient) => patient.age != null && patient.age >= 45).length },
    ];
    const riskGroups = ["Critical", "High", "Medium", "Low"].map((level) => ({ level, count: datePatients.filter((patient) => patient.riskScore?.level === level).length }));
    const unscored = datePatients.filter((patient) => !patient.riskScore?.level).length;
    const videoCount = datePatients.filter((patient) => patient.appointmentVisitMode === "telemedicine").length;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const durationLabel = (value: number | null) => value == null ? "—" : `${value} min`;
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
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{greeting}, {doctorName}</h1>
                <p className="mt-2 text-sm text-saivie-plum">{selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {waiting} {waiting === 1 ? "patient" : "patients"} waiting for consultation.</p>
            </header>
            {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load your dashboard: {error.message} <Button variant="link" onClick={onRefresh}>Retry</Button></div>}
            {isLoading ? <p role="status" className="py-10 text-center">Loading your clinic...</p> : !error && <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
                <div className="min-w-0 space-y-6">
                    <div className="grid gap-3 sm:grid-cols-[0.85fr_1.5fr]">
                        <section className={`rounded-3xl p-5 ${tones[0]}`} aria-label="Patient summary">
                            <h2 className="font-semibold">Patients</h2>
                            <p className="mt-2 text-3xl font-semibold">{datePatients.length}<span className="ml-2 text-xs font-normal">appointments</span></p>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">{ageBands.map((band) => <div key={band.label}><strong>{band.count}</strong><p className="mt-1 text-[10px]">Age {band.label}</p></div>)}</div>
                            <div className="mt-3 h-28" aria-label="Appointments by age group"><ResponsiveContainer width="100%" height="100%"><BarChart data={ageBands}><XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="count" fill="#343a27" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                            {datePatients.some((patient) => patient.age == null) && <p className="text-[10px]">Unknown ages excluded from chart</p>}
                        </section>
                        <section className={`rounded-3xl p-5 ${tones[1]}`} aria-label="Visit duration summary">
                            <h2 className="font-semibold">Visits summary</h2>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">{[["Average", durations.average], ["Minimum", durations.minimum], ["Maximum", durations.maximum]].map(([label, value]) => <div key={label}><strong>{durationLabel(typeof value === "number" ? value : null)}</strong><p className="mt-1 text-[10px] uppercase">{label}</p></div>)}</div>
                            <div className="mt-5 h-32">
                                {durations.visits.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={durations.visits}><CartesianGrid vertical={false} stroke="#d39cbb" strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis width={28} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => [`${value} min`, "Visit duration"]} /><Line type="monotone" dataKey="minutes" stroke="#704660" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer> : <p className="pt-8 text-center text-xs">Duration chart appears after visits have recorded start and completion times.</p>}
                            </div>
                        </section>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <section className={`rounded-3xl p-5 ${tones[2]}`} aria-label="Recorded risk levels">
                            <h2 className="font-semibold">By risk level</h2>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{riskGroups.map((group) => <div key={group.level}><strong>{group.count}</strong><p className="text-[10px] uppercase">{group.level}</p></div>)}</div>
                            <p className="mt-2 text-[10px]">{unscored} not scored · Recorded clinical risk, not inferred</p>
                        </section>
                        <section className={`rounded-3xl p-5 ${tones[3]}`} aria-label="Session summary">
                            <h2 className="font-semibold">Sessions</h2>
                            <div className="mt-3 grid grid-cols-3 gap-3">{[["In clinic", datePatients.length - videoCount], ["Telemedicine", videoCount], ["Completed", datePatients.filter((patient) => doctorQueueState(patient) === "completed").length]].map(([label, value]) => <div key={label}><strong>{value}</strong><p className="text-[10px] uppercase">{label}</p></div>)}</div>
                        </section>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                        <section className="min-w-0" aria-label="Patient list">
                            <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Patient's list</h2><Select value={filter} onValueChange={(value: DoctorQueueFilter) => onFilter(value)}><SelectTrigger className="h-8 w-36 bg-[#242821] text-xs text-white" aria-label="Filter patient queue"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(filterLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                            <div className="max-h-[420px] space-y-2 overflow-y-auto">
                                {visible.map((patient, index) => <button key={patient.appointmentId} type="button" data-testid={`dashboard-patient-${patient.appointmentId}`} onClick={() => setSelectedId(patient.appointmentId)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${selected?.appointmentId === patient.appointmentId ? "bg-[#efb8d5] ring-1 ring-[#c68ba9]" : "bg-[#eee9da]"}`}>
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tones[index % tones.length]}`}><Stethoscope className="h-4 w-4" /></span>
                                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{patient.name}</span><span className="block truncate text-[10px]">{patient.appointmentType || patient.type || "Appointment"} · {patientStateLabel(patient)}</span></span>
                                    <span className="rounded-full bg-white/70 px-2 py-1 text-[10px]">{patient.appointmentTime || "No time"}</span>
                                </button>)}
                                {!visible.length && <p className="rounded-2xl bg-white/60 p-6 text-center text-sm">No patients match this view.</p>}
                            </div>
                        </section>
                        <section aria-label="Visit details">
                            <h2 className="mb-3 font-semibold">Visit details</h2>
                            <div className="min-h-64 rounded-3xl bg-[#efb8d5] p-5" data-testid="dashboard-visit-details">
                                {selected ? <>
                                    <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{selected.name}</h3><Badge variant="outline" className="bg-white/70 text-[10px]">Visit #{selected.appointmentId}</Badge></div>
                                    <p className="mt-1 text-xs">{selected.age != null ? `${selected.age} years · ` : ""}{selected.type || "General"}</p>
                                    <dl className="mt-5 space-y-4 text-xs">
                                        <div><dt className="text-[#705364]">Reason for visit</dt><dd className="mt-1 font-medium">{selected.appointmentChiefComplaint || "Not recorded"}</dd></div>
                                        <div><dt className="text-[#705364]">Check-in vitals</dt><dd className="mt-1 flex flex-wrap gap-2">{selected.appointmentVitals?.bp && <span>BP {selected.appointmentVitals.bp}</span>}{selected.appointmentVitals?.pulse && <span>Pulse {selected.appointmentVitals.pulse}</span>}{selected.appointmentVitals?.weight && <span>Weight {selected.appointmentVitals.weight} kg</span>}{!selected.appointmentVitals?.bp && !selected.appointmentVitals?.pulse && !selected.appointmentVitals?.weight && "Not recorded"}</dd></div>
                                        <div><dt className="text-[#705364]">Appointment notes</dt><dd className="mt-1 whitespace-pre-wrap">{selected.appointmentNotes || "No appointment notes"}</dd></div>
                                    </dl>
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" className="bg-white/70" onClick={() => onOpen(selected)} data-testid="btn-dashboard-open-patient">Open details<ArrowRight className="ml-1 h-3 w-3" /></Button>
                                        {doctorQueueState(selected) === "waiting" && <Button size="sm" disabled={isStarting} onClick={() => onStart(selected)} data-testid="btn-dashboard-start-consult">Start consultation</Button>}
                                        {doctorQueueState(selected) === "in-consultation" && <Button size="sm" onClick={() => onOpen(selected)}>Resume consultation</Button>}
                                        {selected.appointmentTelemedicineLink && <Button size="sm" variant="outline" asChild><a href={selected.appointmentTelemedicineLink} target="_blank" rel="noopener noreferrer"><Video className="mr-1 h-3 w-3" />Join call</a></Button>}
                                    </div>
                                </> : <p className="text-sm">Select a patient to review their visit.</p>}
                            </div>
                        </section>
                    </div>
                </div>
                <aside className="min-w-0 space-y-5" aria-label="Calendar and timeline">
                    <div className="rounded-3xl bg-[#fff9ed] p-3">
                        <Calendar mode="single" selected={selectedDate} defaultMonth={selectedDate} className="mx-auto bg-transparent" onSelect={(day) => { if (day) { onDate(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`); setSelectedId(null); } }} />
                        <Button className="mt-3 w-full bg-[#242821] text-white hover:bg-[#383e31]" onClick={onSchedule}><CalendarDays className="mr-2 h-4 w-4" />Open schedule</Button>
                    </div>
                    <div>
                        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{selectedDate.toLocaleDateString("en-IN", { month: "long", day: "numeric" })}</h2><span className="text-xs">Day's timeline</span></div>
                        <div className="max-h-[440px] space-y-2 overflow-y-auto">
                            {[...datePatients].sort((a, b) => (a.appointmentTime || "").localeCompare(b.appointmentTime || "")).map((patient, index) => <button key={patient.appointmentId} type="button" onClick={() => { onFilter("all"); setSearch(""); setSelectedId(patient.appointmentId); }} className="flex w-full items-start gap-3 text-left" data-testid={`dashboard-timeline-${patient.appointmentId}`}>
                                <span className="w-12 shrink-0 pt-4 text-[10px]">{patient.appointmentTime || "—"}</span>
                                <span className="flex flex-1 gap-3 rounded-2xl bg-[#eee9da] p-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tones[index % tones.length]}`}><Clock className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-semibold">{patient.name}</span><span className="mt-1 block text-[10px]">{patient.appointmentType || "Appointment"}</span><span className="mt-1 block text-[10px]">{patientStateLabel(patient)}</span></span></span>
                            </button>)}
                            {!datePatients.length && <p className="rounded-2xl bg-white/60 p-5 text-xs">No appointments for this day.</p>}
                        </div>
                        <Button variant="outline" className="mt-4 w-full" onClick={onSchedule}>View full schedule<ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                </aside>
            </div>}
        </section>
    );
}
