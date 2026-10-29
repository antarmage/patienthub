import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Baby,
  Bell,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Hourglass,
  Loader2,
  MoreVertical,
  Phone,
  Printer,
  RefreshCw,
  Syringe,
  UserCheck,
  UserPlus,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPregnancyReminders } from "@/lib/pregnancyMilestones";
import { getInventoryAlerts, getStockStatus, getExpiryStatus, useInventory } from "@/components/InventoryManager";
import { ReferralsCard, type ReferralRequest } from "@/components/ReferralsCard";
import { printPatientSummary } from "@/components/IntakeSummary";
import { hasVisitSurvey } from "@/lib/consultationSurvey";

export type ArrivalState = "upcoming" | "late" | "waiting" | "in-consultation" | "completed" | "cancelled" | "no-show";
type FlowFilter = "all" | "upcoming" | "arrived" | "waiting" | "completed" | "closed";

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
  onCheckIn: (apt: any) => void;
  onComplete: (apt: any) => void;
  onAfterVisit: (apt: any) => void;
  onRecordPrescription: (apt: any) => void;
  onUploadPrescription: (patient: any) => void;
  prescribedAppointmentIds: Set<number>;
  onOpenTask: (task: any) => void;
  onOpenPatient: (patient: any) => void;
  onRegisterPatient: () => void;
  onUploadReport: () => void;
  onViewSchedule: () => void;
  onViewFollowUps: () => void;
  onCallFollowUp: (id: number) => void;
}

export function getArrivalState(apt: any): ArrivalState {
  const status = String(apt.status || "").toLowerCase();
  if (status.includes("cancel")) return "cancelled";
  if (status.replace(/[\s_]/g, "-") === "no-show") return "no-show";
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
  upcoming: { label: "Upcoming", className: "bg-saivie-surface-muted text-saivie-teal border-saivie-border" },
  late: { label: "Late", className: "bg-rose-50 text-rose-700 border-rose-200" },
  waiting: { label: "Waiting", className: "bg-amber-50 text-amber-700 border-amber-200" },
  "in-consultation": { label: "In consultation", className: "bg-sky-50 text-sky-700 border-sky-200" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-saivie-sage text-saivie-plum border-saivie-border" },
  "no-show": { label: "No-show", className: "bg-orange-50 text-orange-700 border-orange-200" },
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
  onCheckIn,
  onComplete,
  onAfterVisit,
  onRecordPrescription,
  onUploadPrescription,
  prescribedAppointmentIds,
  onOpenTask,
  onOpenPatient,
  onRegisterPatient,
  onUploadReport,
  onViewSchedule,
  onViewFollowUps,
  onCallFollowUp,
}: ReceptionDashboardProps) {
  const [filter, setFilter] = useState<FlowFilter>("all");
  const [now, setNow] = useState(() => Date.now());
  const [referRequest, setReferRequest] = useState<ReferralRequest | null>(null);
  const clearReferRequest = useCallback(() => setReferRequest(null), []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(
    () =>
      appointments
        .map((apt) => ({ apt, state: getArrivalState(apt) }))
        .sort((a, b) => timeToMinutes(a.apt.time) - timeToMinutes(b.apt.time)),
    [appointments],
  );

  const isClosed = (state: ArrivalState) => state === "cancelled" || state === "no-show";
  const counts = {
    all: rows.filter((r) => !isClosed(r.state)).length,
    closed: rows.filter((r) => isClosed(r.state)).length,
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
    if (filter === "closed") return isClosed(r.state);
    return !isClosed(r.state);
  });

  const waitingRows = rows
    .filter((r) => r.state === "waiting")
    .sort((a, b) => new Date(a.apt.checkedInAt || 0).getTime() - new Date(b.apt.checkedInAt || 0).getTime());

  const findPatient = (apt: any) => patients.find((p) => p.id === apt.patientId);
  const pendingRx = appointments.filter((apt) => getArrivalState(apt) === "completed" && !prescribedAppointmentIds.has(apt.id));
  const { data: inventoryItems = [] } = useInventory();
  const inventoryAlerts = useMemo(() => getInventoryAlerts(inventoryItems), [inventoryItems]);
  const inventoryAlertCount = new Set([...inventoryAlerts.stock, ...inventoryAlerts.expiry].map((i) => i.id)).size;
  const pregnancyReminders = useMemo(() => getPregnancyReminders(patients), [patients]);
  const queryClient = useQueryClient();
  const vaccinationRemindersQuery = useQuery<any[]>({
    queryKey: ["/api/vaccination-reminders"],
    queryFn: async () => {
      const res = await fetch("/api/vaccination-reminders");
      if (!res.ok) throw new Error("Could not load vaccination reminders");
      return res.json();
    },
  });
  const recordVaccinationMutation = useMutation({
    mutationFn: async (reminder: any) => {
      const res = await fetch("/api/vaccination-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: reminder.patientId,
          scheduleId: reminder.scheduleId,
          doseNumber: reminder.doseNumber,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not record vaccine dose");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/vaccination-reminders"] }),
  });
  const isPending = (id: number) => pendingAppointmentId === id;
  const stamp = () => new Date().toISOString();

  const renderAction = (apt: any, state: ArrivalState) => {
    const base = "h-8 min-w-[88px] text-xs border-saivie-border bg-saivie-surface-muted text-saivie-teal hover:bg-saivie-sage";
    const busy = isPending(apt.id);
    const closeMenu = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-saivie-plum" aria-label="More actions" data-testid={`btn-more-${apt.id}`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem data-testid={`menu-no-show-${apt.id}`}
            onClick={() => { if (window.confirm(`Mark ${apt.patient} as no-show?`)) onUpdateAppointment(apt.id, { status: "no-show" }); }}>
            Mark as no-show
          </DropdownMenuItem>
          <DropdownMenuItem className="text-rose-600" data-testid={`menu-cancel-${apt.id}`}
            onClick={() => { if (window.confirm(`Cancel ${apt.patient}'s appointment?`)) onUpdateAppointment(apt.id, { status: "cancelled" }); }}>
            Cancel appointment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    if (state === "cancelled" || state === "no-show") {
      return (
        <Button size="sm" variant="outline" className={base} disabled={busy} data-testid={`btn-reinstate-${apt.id}`}
          onClick={() => onUpdateAppointment(apt.id, { status: "scheduled" })}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reinstate"}
        </Button>
      );
    }
    if (state === "upcoming" || state === "late") {
      return (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className={base} disabled={busy} data-testid={`btn-checkin-${apt.id}`}
            onClick={() => onCheckIn(apt)}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check in"}
          </Button>
          {closeMenu}
        </div>
      );
    }
    if (state === "waiting") {
      return (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className={base} disabled={busy} data-testid={`btn-start-visit-${apt.id}`}
            onClick={() => onUpdateAppointment(apt.id, { status: "in-consultation", seenAt: stamp() })}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Start visit"}
          </Button>
          {closeMenu}
        </div>
      );
    }
    if (state === "in-consultation") {
      return (
        <Button size="sm" variant="outline" className={base} disabled={busy} data-testid={`btn-complete-${apt.id}`}
          onClick={() => onComplete(apt)}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Complete"}
        </Button>
      );
    }
    return (
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="outline" className={base} data-testid={`btn-next-steps-${apt.id}`} onClick={() => onAfterVisit(apt)}>
          Next steps
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className={base} data-testid={`btn-view-${apt.id}`}>
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { const patient = findPatient(apt); if (patient) onUploadPrescription(patient); }} data-testid={`menu-upload-rx-${apt.id}`}>
              Upload prescription
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRecordPrescription(apt)} data-testid={`menu-manual-rx-${apt.id}`}>
              {prescribedAppointmentIds.has(apt.id) ? "Edit data manually ✓" : "Add data manually"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setReferRequest({ patientId: apt.patientId, appointmentId: apt.id })} data-testid={`menu-refer-scan-${apt.id}`}>
              Refer for scan
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const patient = findPatient(apt); if (patient) onOpenPatient(patient); }}>
              Open patient record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const handleWaitingStatus = (apt: any, value: string) => {
    if (value === "in-consultation") onUpdateAppointment(apt.id, { status: "in-consultation", seenAt: stamp() });
    else if (value === "completed") onComplete(apt);
    else if (value === "undo") onUpdateAppointment(apt.id, { status: "On Time", checkedInAt: null });
  };

  const statCards = [
    { key: "total", label: "Today's appointments", value: counts.all, link: "View calendar", onClick: onViewSchedule, icon: CalendarCheck, tone: "bg-saivie-sage text-saivie-teal", testId: "stat-today-visits" },
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
    { id: "closed", label: "Cancelled / No-show" },
  ];

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.key} className="border-saivie-border shadow-sm" data-testid={card.testId}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-saivie-plum">{card.label}</p>
                </div>
                <p className="mt-3 text-3xl font-bold text-saivie-plum">{card.value}</p>
                {card.onClick ? (
                  <button type="button" className="mt-1 flex items-center gap-1 text-xs text-saivie-plum hover:text-saivie-plum" onClick={card.onClick}>
                    {card.link} <ChevronRight className="h-3 w-3" />
                  </button>
                ) : (
                  <p className="mt-1 text-xs text-saivie-plum">Pending</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-saivie-border shadow-sm" data-testid="card-patient-flow">
          <CardHeader className="space-y-3 pb-3">
            <CardTitle className="text-lg font-bold text-saivie-plum">Today's patient flow</CardTitle>
            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${filter === tab.id ? "border-saivie-border bg-saivie-sage text-saivie-plum" : "border-saivie-border bg-saivie-ivory text-saivie-plum hover:bg-saivie-surface-muted"}`}
                  data-testid={`filter-flow-${tab.id}`}
                >
                  {tab.label} ({counts[tab.id]})
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-saivie-border bg-saivie-surface-muted text-[11px] uppercase tracking-wider text-saivie-plum">
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
                    <tr key={apt.id} className="hover:bg-saivie-surface-muted/60" data-testid={`flow-row-${apt.id}`}>
                      <td className="whitespace-nowrap px-5 py-3 text-saivie-plum">{formatTime(apt.time)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saivie-sage text-[11px] font-bold text-saivie-teal">{initials(apt.patient)}</div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="font-semibold text-saivie-plum">{apt.patient}</p>
                              {hasVisitSurvey(patient?.history, apt.id) ? (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700" title="Pre-visit survey submitted for this appointment" data-testid={`flow-survey-${apt.id}`}>
                                  <ClipboardCheck className="h-3 w-3" />Survey filled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-saivie-border bg-saivie-ivory px-2 py-0.5 text-[10px] font-medium text-saivie-plum/70" title="Pre-visit survey not submitted for this appointment" data-testid={`flow-survey-${apt.id}`}>
                                  <ClipboardList className="h-3 w-3" />Survey pending
                                </span>
                              )}
                            </div>
                            {patient?.phone ? (
                              <a href={`tel:${patient.phone.replace(/[^\d+]/g, "")}`} className="mt-0.5 inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-saivie-teal hover:underline" aria-label={`Call ${apt.patient} on ${patient.phone}`} data-testid={`flow-phone-${apt.id}`}>
                                <Phone className="h-3 w-3" />{patient.phone}
                              </a>
                            ) : (
                              <p className="mt-0.5 text-xs text-saivie-plum/60" data-testid={`flow-phone-${apt.id}`}>No phone</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-saivie-plum md:table-cell">{apt.type || apt.visitType || "Appointment"}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className={`text-[11px] font-medium ${badge.className}`}>{badge.label}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {renderAction(apt, state)}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-saivie-plum hover:text-saivie-teal" data-testid={`btn-print-summary-${apt.id}`}
                            title="Print patient summary" aria-label={`Print summary for ${apt.patient}`}
                            onClick={() => printPatientSummary(findPatient(apt) ?? { name: apt.patient }, apt.vitals)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="pr-4">
                        {patient && (
                          <button type="button" aria-label={`Open ${apt.patient}`} className="text-slate-300 hover:text-saivie-plum" onClick={() => onOpenPatient(patient)}>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-saivie-plum">
                      {rows.length === 0 ? "No appointments scheduled for today" : "No patients in this view"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-saivie-border shadow-sm" data-testid="card-waiting-queue">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-saivie-plum">
              <UserCheck className="h-5 w-5 text-saivie-teal" /> Waiting queue
            </CardTitle>
            <button type="button" className="flex items-center gap-1 text-xs font-medium text-saivie-teal hover:underline" onClick={() => setFilter("waiting")}>
              View all in queue <ChevronRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-saivie-border bg-saivie-surface-muted text-[11px] uppercase tracking-wider text-saivie-plum">
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
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saivie-sage text-[11px] font-bold text-saivie-teal">{initials(apt.patient)}</div>
                          <span className="font-semibold text-saivie-plum">{apt.patient}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-saivie-plum">{formatClock(apt.checkedInAt)}</td>
                      <td className="hidden px-3 py-3 text-saivie-plum md:table-cell">{apt.type || "Appointment"}</td>
                      <td className="px-3 py-3"><Badge variant="outline" className={`text-[11px] ${tone}`}>{minutes} min</Badge></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" data-testid={`queue-print-summary-${apt.id}`}
                          title="Print history & check-in vitals for the doctor"
                          onClick={() => printPatientSummary(findPatient(apt) ?? { name: apt.patient }, apt.vitals)}>
                          <Printer className="mr-1 h-3 w-3" /> Print
                        </Button>
                        <Select value="" onValueChange={(value) => handleWaitingStatus(apt, value)} disabled={isPending(apt.id)}>
                          <SelectTrigger className="h-8 w-36 border-saivie-border bg-saivie-surface-muted text-xs text-saivie-teal" data-testid={`select-status-${apt.id}`}>
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in-consultation">Start consultation</SelectItem>
                            <SelectItem value="completed">Mark completed</SelectItem>
                            <SelectItem value="undo">Undo check-in</SelectItem>
                          </SelectContent>
                        </Select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {waitingRows.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-saivie-plum">No patients are waiting right now</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 space-y-6 xl:col-span-4">
        <Card className="border-saivie-border shadow-sm" data-testid="card-reception-tasks">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-saivie-plum">
              <ClipboardList className="h-5 w-5 text-saivie-teal" /> Reception tasks
            </CardTitle>
            <Badge className="border-0 bg-saivie-sage text-saivie-teal">{tasks.length} pending</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-saivie-plum">{task.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-saivie-plum">
                    {task.urgency === "High" && <AlertCircle className="h-3 w-3 text-rose-500" />}
                    {task.patient}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-8 shrink-0 border-saivie-border bg-saivie-surface-muted text-xs text-saivie-teal hover:bg-saivie-sage" onClick={() => onOpenTask(task)} data-testid={`btn-task-${task.id}`}>
                  Review
                </Button>
              </div>
            ))}
            {tasks.length === 0 && <p className="px-5 py-6 text-center text-sm text-saivie-plum">No pending tasks</p>}
          </CardContent>
        </Card>

        <ReferralsCard patients={patients} request={referRequest} onRequestHandled={clearReferRequest} />

        <Card className="border-saivie-border shadow-sm" data-testid="card-inventory-alerts">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-saivie-plum">
              <AlertCircle className="h-5 w-5 text-amber-500" /> Stock alerts
            </CardTitle>
            <Badge className={`border-0 ${inventoryAlertCount ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              {inventoryAlertCount ? `${inventoryAlertCount} need attention` : "All stocked"}
            </Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {[...inventoryAlerts.stock, ...inventoryAlerts.expiry.filter((i) => !inventoryAlerts.stock.includes(i))].slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-saivie-plum">{item.name}</p>
                  <p className="truncate text-xs text-saivie-plum">
                    {getStockStatus(item) === "out" ? "Out of stock" : getStockStatus(item) === "low" ? `Low: ${item.quantity} ${item.unit} left` : `${item.quantity} ${item.unit}`}
                    {getExpiryStatus(item) !== "ok" && ` · ${getExpiryStatus(item) === "expired" ? "Expired" : "Expiring soon"}`}
                  </p>
                </div>
              </div>
            ))}
            {inventoryAlertCount === 0 && <p className="px-5 py-4 text-center text-sm text-saivie-plum">No low-stock or expiring items</p>}
          </CardContent>
        </Card>

        <Card className="border-saivie-border shadow-sm" data-testid="card-pending-prescriptions">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-saivie-plum">
              <ClipboardList className="h-5 w-5 text-saivie-teal" /> Prescriptions to record
            </CardTitle>
            <Badge className="border-0 bg-saivie-sage text-saivie-teal">{pendingRx.length} pending</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {pendingRx.slice(0, 6).map((apt) => (
              <div key={apt.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-saivie-plum">{findPatient(apt)?.name || "Patient"}</p>
                  <p className="truncate text-xs text-saivie-plum">{String(apt.date).slice(0, 10)} · {apt.type || apt.visitType}</p>
                </div>
                <Button size="sm" variant="outline" className="h-8 shrink-0 border-saivie-border bg-saivie-surface-muted text-xs text-saivie-teal hover:bg-saivie-sage" onClick={() => onRecordPrescription(apt)}>
                  Record
                </Button>
              </div>
            ))}
            {pendingRx.length === 0 && <p className="px-5 py-6 text-center text-sm text-saivie-plum">All prescriptions recorded</p>}
          </CardContent>
        </Card>

        <Card className="border-saivie-border shadow-sm" data-testid="card-followup-reminders">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-saivie-plum">
              <Bell className="h-5 w-5 text-saivie-teal" /> Follow-up reminders
            </CardTitle>
            <Badge className="border-0 bg-saivie-sage text-saivie-teal">{followUps.length} pending</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {followUps.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-saivie-plum">{item.name}</p>
                  <p className={`truncate text-xs ${item.overdue ? "text-rose-600" : "text-saivie-plum"}`}>{item.detail}</p>
                  {item.lastVisit && <p className="truncate text-[11px] text-saivie-plum">Last visit: {item.lastVisit}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 border-saivie-border bg-saivie-surface-muted text-xs text-saivie-teal hover:bg-saivie-sage" onClick={() => onCallFollowUp(item.id)} data-testid={`btn-call-followup-${item.id}`}>
                    <Phone className="mr-1 h-3 w-3" />Call patient
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-saivie-plum">
                    <Link href="/staff/booking">Book visit</Link>
                  </Button>
                </div>
              </div>
            ))}
            {followUps.length === 0 && <p className="px-5 py-6 text-center text-sm text-saivie-plum">No follow-ups due</p>}
            {followUps.length > 0 && (
              <button type="button" className="w-full px-5 py-2.5 text-center text-xs font-medium text-saivie-teal hover:bg-saivie-surface-muted" onClick={onViewFollowUps}>
                View all follow-up calls
              </button>
            )}
          </CardContent>
        </Card>

        <Card className="border-saivie-border shadow-sm" data-testid="card-pregnancy-reminders">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-saivie-plum">
              <Baby className="h-5 w-5 text-saivie-rose" /> Pregnancy milestones
            </CardTitle>
            <Badge className="border-0 bg-saivie-blush text-saivie-plum">{pregnancyReminders.length} due</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {pregnancyReminders.slice(0, 5).map((item, index) => (
              <div key={`${item.patient.id}-${index}`} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-saivie-plum">{item.patient.name} · {item.week}w</p>
                  <p className="truncate text-xs text-saivie-plum">{item.label}</p>
                  <p className={`text-[11px] ${item.status === "due" ? "text-rose-600" : "text-saivie-plum"}`}>
                    {item.status === "due" ? "Due now" : "Coming up"} · {item.windowText}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {item.patient.phone && (
                    <Button asChild size="sm" variant="outline" className="h-7 border-saivie-border bg-saivie-surface-muted text-xs text-saivie-teal hover:bg-saivie-sage">
                      <a href={`tel:${item.patient.phone}`}><Phone className="mr-1 h-3 w-3" />Call</a>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-saivie-plum">
                    <Link href="/staff/booking">Book</Link>
                  </Button>
                </div>
              </div>
            ))}
            {pregnancyReminders.length === 0 && <p className="px-5 py-6 text-center text-sm text-saivie-plum">No milestones due</p>}
          </CardContent>
        </Card>

        <Card className="border-saivie-border shadow-sm" data-testid="card-vaccination-reminders">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-saivie-plum">
              <Syringe className="h-5 w-5 text-saivie-teal" /> Vaccination reminders
            </CardTitle>
            <Badge className="border-0 bg-saivie-sage text-saivie-teal">{vaccinationRemindersQuery.data?.length || 0} due</Badge>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {vaccinationRemindersQuery.isLoading ? (
              <p className="px-5 py-6 text-center text-sm text-saivie-plum">Loading vaccine reminders...</p>
            ) : vaccinationRemindersQuery.isError ? (
              <p role="alert" className="px-5 py-6 text-center text-sm text-rose-600">{vaccinationRemindersQuery.error.message}</p>
            ) : vaccinationRemindersQuery.data?.length ? (
              vaccinationRemindersQuery.data.slice(0, 8).map((item) => (
                <div key={`${item.patientId}-${item.scheduleId}-${item.doseNumber}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-saivie-plum">{item.patientName}</p>
                    <p className="truncate text-xs text-saivie-plum">{item.vaccineName} · Dose {item.doseNumber}/{item.doseCount}</p>
                    <p className={`text-[11px] ${item.status === "overdue" ? "text-rose-600" : "text-amber-700"}`}>
                      {item.status === "overdue" ? "Overdue" : item.status === "due" ? "Due today" : `Due ${item.dueDate}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {item.phone && (
                      <Button asChild size="sm" variant="outline" className="h-7 border-saivie-border bg-saivie-surface-muted text-xs text-saivie-teal hover:bg-saivie-sage">
                        <a href={`tel:${item.phone}`}><Phone className="mr-1 h-3 w-3" />Call</a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-saivie-plum"
                      onClick={() => recordVaccinationMutation.mutate(item)}
                      disabled={recordVaccinationMutation.isPending}
                    >
                      Record given
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-center text-sm text-saivie-plum">No vaccination doses due</p>
            )}
            {(vaccinationRemindersQuery.data?.length || 0) > 8 && (
              <p className="px-5 py-2 text-center text-xs text-saivie-plum">Showing 8 of {vaccinationRemindersQuery.data?.length} reminders</p>
            )}
            {recordVaccinationMutation.isError && <p role="alert" className="px-5 py-2 text-xs text-rose-600">{recordVaccinationMutation.error.message}</p>}
          </CardContent>
        </Card>

        <Card className="border-saivie-border shadow-sm" data-testid="card-quick-actions">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-saivie-plum">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 justify-start gap-2 border-saivie-border text-xs text-saivie-plum" onClick={onRegisterPatient} data-testid="btn-quick-register">
              <UserPlus className="h-4 w-4 text-saivie-teal" /> Register patient
            </Button>
            <Button asChild variant="outline" className="h-14 justify-start gap-2 border-saivie-border text-xs text-saivie-plum">
              <Link href="/staff/booking"><CalendarPlus className="h-4 w-4 text-saivie-teal" /> Book appointment</Link>
            </Button>
            <Button asChild variant="outline" className="h-14 justify-start gap-2 border-saivie-border text-xs text-saivie-plum">
              <Link href="/staff/check-in"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Check in patient</Link>
            </Button>
            <Button variant="outline" className="h-14 justify-start gap-2 border-saivie-border text-xs text-saivie-plum" onClick={onUploadReport} data-testid="btn-quick-upload">
              <Upload className="h-4 w-4 text-saivie-teal" /> Upload report
            </Button>
          </CardContent>
        </Card>

        <Card className="border-saivie-border shadow-sm" data-testid="card-sheets-sync">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><FileText className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-saivie-plum">
                    Google Sheets
                    <span className={`h-2 w-2 rounded-full ${sheetStatus?.connected ? "bg-emerald-500" : "bg-rose-500"}`} />
                  </p>
                  <p className="truncate text-xs text-saivie-plum">
                    {sheetStatus?.connected ? `${sheetStatus.rowCount} records available` : "Not connected"}
                    {lastSyncedAt && ` · Synced ${lastSyncedAt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 shrink-0 border-saivie-border bg-saivie-surface-muted text-xs text-saivie-teal hover:bg-saivie-sage" onClick={onSync} disabled={isSyncing} data-testid="button-sync-sheets">
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
