import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  Bell,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Hourglass,
  Loader2,
  Phone,
  RefreshCw,
  UserCheck,
  UserPlus,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ArrivalState = "upcoming" | "late" | "waiting" | "in-consultation" | "completed";
type FlowFilter = "all" | "upcoming" | "arrived" | "waiting" | "completed";

export interface ReceptionFollowUp {
  id: number;
  name: string;
  detail: string;
  lastVisit?: string | null;
  phone?: string | null;
  overdue: boolean;
}

interface ReceptionDashboardProps {
  appointments: any[];
  patients: any[];
  tasks: any[];
  followUps: ReceptionFollowUp[];
  pendingAppointmentId: number | null;
  sheetStatus: any;
  syncResult: any;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  onSync: () => void;
  onUpdateAppointment: (id: number, data: Record<string, unknown>) => void;
  onOpenTask: (task: any) => void;
  onOpenPatient: (patient: any) => void;
  onRegisterPatient: () => void;
  onUploadReport: () => void;
  onViewSchedule: () => void;
  onViewFollowUps: () => void;
}

export function getArrivalState(apt: any): ArrivalState {
  if (apt.completedAt || String(apt.status || "").toLowerCase() === "completed") return "completed";
  if (apt.seenAt) return "in-consultation";
  if (apt.checkedInAt || String(apt.status || "").toLowerCase() === "checked-in") return "waiting";
  if (String(apt.status || "").toLowerCase() === "late") return "late";
  return "upcoming";
}

function timeToMinutes(time: string | undefined): number {
  const match = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(time || "");
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = Number(match[1]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + Number(match[2]);
}

function formatTime(time: string | undefined): string {
  const minutes = timeToMinutes(time);
  if (minutes === Number.MAX_SAFE_INTEGER) return time || "—";
  const hours = Math.floor(minutes / 60);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${String(hours % 12 || 12).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")} ${suffix}`;
}

function formatClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function initials(name: string): string {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

const ARRIVAL_BADGE: Record<ArrivalState, { label: string; className: string }> = {
  upcoming: { label: "Upcoming", className: "bg-violet-50 text-violet-700 border-violet-200" },
  late: { label: "Late", className: "bg-rose-50 text-rose-700 border-rose-200" },
  waiting: { label: "Waiting", className: "bg-amber-50 text-amber-700 border-amber-200" },
  "in-consultation": { label: "In consultation", className: "bg-sky-50 text-sky-700 border-sky-200" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function ReceptionDashboard({
  appointments,
  patients,
  tasks,
  followUps,
  pendingAppointmentId,
  sheetStatus,
  syncResult,
  lastSyncedAt,
  isSyncing,
  onSync,
  onUpdateAppointment,
  onOpenTask,
  onOpenPatient,
  onRegisterPatient,
  onUploadReport,
  onViewSchedule,
  onViewFollowUps,
}: ReceptionDashboardProps) {
  const [filter, setFilter] = useState<FlowFilter>("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(
    () =>
      appointments
        .filter((apt) => !String(apt.status || "").toLowerCase().includes("cancel"))
        .map((apt) => ({ apt, state: getArrivalState(apt) }))
        .sort((a, b) => timeToMinutes(a.apt.time) - timeToMinutes(b.apt.time)),
    [appointments],
  );

  const counts = {
    all: rows.length,
    upcoming: rows.filter((r) => r.state === "upcoming" || r.state === "late").length,
    arrived: rows.filter((r) => r.state === "waiting" || r.state === "in-consultation").length,
    waiting: rows.filter((r) => r.state === "waiting").length,
    completed: rows.filter((r) => r.state === "completed").length,
  };
  const checkedInCount = rows.filter((r) => r.apt.checkedInAt || r.state === "in-consultation" || r.state === "completed").length;

  const visibleRows = rows.filter((r) => {
    if (filter === "upcoming") return r.state === "upcoming" || r.state === "late";
    if (filter === "arrived") return r.state === "waiting" || r.state === "in-consultation";
    if (filter === "waiting") return r.state === "waiting";
    if (filter === "completed") return r.state === "completed";
    return true;
  });

  const waitingRows = rows
    .filter((r) => r.state === "waiting")
    .sort((a, b) => new Date(a.apt.checkedInAt || 0).getTime() - new Date(b.apt.checkedInAt || 0).getTime());

  const findPatient = (apt: any) => patients.find((p) => p.id === apt.patientId);
  const isPending = (id: number) => pendingAppointmentId === id;
  const stamp = () => new Date().toISOString();

  const renderAction = (apt: any, state: ArrivalState) => {
    const base = "h-8 min-w-[88px] text-xs border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100";
    const busy = isPending(apt.id);
    if (state === "upcoming" || state === "late") {
      return (
        <Button size="sm" variant="outline" className={base} disabled={busy} data-testid={`btn-checkin-${apt.id}`}
          onClick={() => onUpdateAppointment(apt.id, { status: "checked-in", checkedInAt: stamp() })}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check in"}
        </Button>
      );
    }
    if (state === "waiting") {
      return (
        <Button size="sm" variant="outline" className={base} disabled={busy} data-testid={`btn-start-visit-${apt.id}`}
          onClick={() => onUpdateAppointment(apt.id, { status: "in-consultation", seenAt: stamp() })}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Start visit"}
        </Button>
      );
    }
    if (state === "in-consultation") {
      return (
        <Button size="sm" variant="outline" className={base} disabled={busy} data-testid={`btn-complete-${apt.id}`}
          onClick={() => onUpdateAppointment(apt.id, { status: "Completed", completedAt: stamp() })}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Complete"}
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" className={base} data-testid={`btn-view-${apt.id}`}
        onClick={() => { const patient = findPatient(apt); if (patient) onOpenPatient(patient); }}>
        View
      </Button>
    );
  };

  const handleWaitingStatus = (apt: any, value: string) => {
    if (value === "in-consultation") onUpdateAppointment(apt.id, { status: "in-consultation", seenAt: stamp() });
    else if (value === "completed") onUpdateAppointment(apt.id, { status: "Completed", completedAt: stamp() });
    else if (value === "undo") onUpdateAppointment(apt.id, { status: "On Time", checkedInAt: null });
  };

  const statCards = [
    { key: "total", label: "Today's appointments", value: counts.all, link: "View calendar", onClick: onViewSchedule, icon: CalendarCheck, tone: "bg-violet-100 text-violet-600", testId: "stat-today-visits" },
    { key: "checked", label: "Checked in", value: checkedInCount, link: "View arrivals", onClick: () => setFilter("arrived"), icon: UserCheck, tone: "bg-emerald-100 text-emerald-600", testId: "stat-checked-in" },
    { key: "waiting", label: "Waiting", value: counts.waiting, link: "View queue", onClick: () => setFilter("waiting"), icon: Hourglass, tone: "bg-amber-100 text-amber-600", testId: "stat-waiting" },
    { key: "tasks", label: "Admin tasks", value: tasks.length, link: "See tasks", onClick: undefined, icon: ClipboardList, tone: "bg-sky-100 text-sky-600", testId: "stat-pending-tasks" },
  ];

  const filterTabs: Array<{ id: FlowFilter; label: string }> = [
    { id: "all", label: "All today" },
    { id: "upcoming", label: "Upcoming" },
    { id: "arrived", label: "Arrived" },
    { id: "waiting", label: "Waiting" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.key} className="border-slate-200 shadow-sm" data-testid={card.testId}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">{card.label}</p>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{card.value}</p>
                {card.onClick ? (
                  <button type="button" className="mt-1 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800" onClick={card.onClick}>
                    {card.link} <ChevronRight className="h-3 w-3" />
                  </button>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Pending</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-slate-200 shadow-sm" data-testid="card-patient-flow">
          <CardHeader className="space-y-3 pb-3">
            <CardTitle className="text-lg font-bold text-slate-800">Today's patient flow</CardTitle>
            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${filter === tab.id ? "border-violet-300 bg-violet-100 text-violet-800" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                  data-testid={`filter-flow-${tab.id}`}
                >
                  {tab.label} ({counts[tab.id]})
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-3 py-3 font-semibold">Patient</th>
                  <th className="hidden px-3 py-3 font-semibold md:table-cell">Visit type</th>
                  <th className="px-3 py-3 font-semibold">Arrival status</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map(({ apt, state }) => {
                  const badge = ARRIVAL_BADGE[state];
                  const patient = findPatient(apt);
                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/60" data-testid={`flow-row-${apt.id}`}>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatTime(apt.time)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">{initials(apt.patient)}</div>
                          <span className="font-semibold text-slate-900">{apt.patient}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-slate-600 md:table-cell">{apt.type || apt.visitType || "Appointment"}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className={`text-[11px] font-medium ${badge.className}`}>{badge.label}</Badge>
                      </td>
                      <td className="px-3 py-3">{renderAction(apt, state)}</td>
                      <td className="pr-4">
                        {patient && (
                          <button type="button" aria-label={`Open ${apt.patient}`} className="text-slate-300 hover:text-slate-600" onClick={() => onOpenPatient(patient)}>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                      {rows.length === 0 ? "No appointments scheduled for today" : "No patients in this view"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm" data-testid="card-waiting-queue">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <UserCheck className="h-5 w-5 text-violet-500" /> Waiting queue
            </CardTitle>
            <button type="button" className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline" onClick={() => setFilter("waiting")}>
              View all in queue <ChevronRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Patient</th>
                  <th className="px-3 py-3 font-semibold">Arrived</th>
                  <th className="hidden px-3 py-3 font-semibold md:table-cell">Waiting for</th>
                  <th className="px-3 py-3 font-semibold">Waiting time</th>
                  <th className="px-3 py-3 font-semibold">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waitingRows.map(({ apt }) => {
                  const minutes = Math.max(0, Math.floor((now - new Date(apt.checkedInAt || now).getTime()) / 60000));
                  const tone = minutes >= 30 ? "bg-rose-50 text-rose-700 border-rose-200" : minutes >= 15 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200";
                  return (
                    <tr key={apt.id} data-testid={`queue-row-${apt.id}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">{initials(apt.patient)}</div>
                          <span className="font-semibold text-slate-900">{apt.patient}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatClock(apt.checkedInAt)}</td>
                      <td className="hidden px-3 py-3 text-slate-600 md:table-cell">{apt.type || "Appointment"}</td>
                      <td className="px-3 py-3"><Badge variant="outline" className={`text-[11px] ${tone}`}>{minutes} min</Badge></td>
                      <td className="px-3 py-3">
                        <Select value="" onValueChange={(value) => handleWaitingStatus(apt, value)} disabled={isPending(apt.id)}>
                          <SelectTrigger className="h-8 w-36 border-teal-200 bg-teal-50 text-xs text-teal-700" data-testid={`select-status-${apt.id}`}>
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in-consultation">Start consultation</SelectItem>
                            <SelectItem value="completed">Mark completed</SelectItem>
                            <SelectItem value="undo">Undo check-in</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
                {waitingRows.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No patients are waiting right now</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 space-y-6 xl:col-span-4">
        <Card className="border-slate-200 shadow-sm" data-testid="card-reception-tasks">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <ClipboardList className="h-5 w-5 text-violet-500" /> Reception tasks
            </CardTitle>
            <Badge className="border-0 bg-violet-100 text-violet-700">{tasks.length} pending</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                    {task.urgency === "High" && <AlertCircle className="h-3 w-3 text-rose-500" />}
                    {task.patient}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-8 shrink-0 border-teal-200 bg-teal-50 text-xs text-teal-700 hover:bg-teal-100" onClick={() => onOpenTask(task)} data-testid={`btn-task-${task.id}`}>
                  Review
                </Button>
              </div>
            ))}
            {tasks.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">No pending tasks</p>}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm" data-testid="card-followup-reminders">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Bell className="h-5 w-5 text-violet-500" /> Follow-up reminders
            </CardTitle>
            <Badge className="border-0 bg-violet-100 text-violet-700">{followUps.length} pending</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {followUps.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className={`truncate text-xs ${item.overdue ? "text-rose-600" : "text-slate-500"}`}>{item.detail}</p>
                  {item.lastVisit && <p className="truncate text-[11px] text-slate-400">Last visit: {item.lastVisit}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {item.phone ? (
                    <Button asChild size="sm" variant="outline" className="h-7 border-teal-200 bg-teal-50 text-xs text-teal-700 hover:bg-teal-100">
                      <a href={`tel:${item.phone}`}><Phone className="mr-1 h-3 w-3" />Call patient</a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onViewFollowUps}>Open</Button>
                  )}
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-slate-600">
                    <Link href="/staff/booking">Book visit</Link>
                  </Button>
                </div>
              </div>
            ))}
            {followUps.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">No follow-ups due</p>}
            {followUps.length > 0 && (
              <button type="button" className="w-full px-5 py-2.5 text-center text-xs font-medium text-teal-700 hover:bg-slate-50" onClick={onViewFollowUps}>
                View all follow-up calls
              </button>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm" data-testid="card-quick-actions">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 justify-start gap-2 border-slate-200 text-xs text-slate-700" onClick={onRegisterPatient} data-testid="btn-quick-register">
              <UserPlus className="h-4 w-4 text-violet-500" /> Register patient
            </Button>
            <Button asChild variant="outline" className="h-14 justify-start gap-2 border-slate-200 text-xs text-slate-700">
              <Link href="/staff/booking"><CalendarPlus className="h-4 w-4 text-teal-600" /> Book appointment</Link>
            </Button>
            <Button asChild variant="outline" className="h-14 justify-start gap-2 border-slate-200 text-xs text-slate-700">
              <Link href="/staff/check-in"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Check in patient</Link>
            </Button>
            <Button variant="outline" className="h-14 justify-start gap-2 border-slate-200 text-xs text-slate-700" onClick={onUploadReport} data-testid="btn-quick-upload">
              <Upload className="h-4 w-4 text-violet-500" /> Upload report
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm" data-testid="card-sheets-sync">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><FileText className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    Google Sheets
                    <span className={`h-2 w-2 rounded-full ${sheetStatus?.connected ? "bg-emerald-500" : "bg-rose-500"}`} />
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {sheetStatus?.connected ? `${sheetStatus.rowCount} records available` : "Not connected"}
                    {lastSyncedAt && ` · Synced ${lastSyncedAt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 shrink-0 border-teal-200 bg-teal-50 text-xs text-teal-700 hover:bg-teal-100" onClick={onSync} disabled={isSyncing} data-testid="button-sync-sheets">
                {isSyncing ? <><RefreshCw className="mr-1 h-3 w-3 animate-spin" />Syncing</> : "Sync patient data"}
              </Button>
            </div>
            {syncResult && (
              <p className={`rounded p-2 text-xs ${syncResult.error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`} data-testid="sync-result">
                {syncResult.error || syncResult.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
