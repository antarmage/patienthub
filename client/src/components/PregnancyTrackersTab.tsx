import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Droplets, Scale, Activity, Pill,
  Plus, CheckCircle2, Circle, Trash2, Upload, FileText,
  Image, X, ShieldCheck, AlertTriangle, Info, TrendingUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip
} from "recharts";

// ── Gestational week from LMP ─────────────────────────────────────────────────
function getGestationalWeek(lmp?: string): number {
  if (!lmp) return 20;
  return Math.max(4, Math.min(42, Math.floor((new Date().getTime() - new Date(lmp).getTime()) / (7 * 24 * 60 * 60 * 1000))));
}

// Recommended total weight gain by pre-pregnancy BMI (IOM guidelines)
function getWeightGainTarget(bmi?: number) {
  if (!bmi || bmi < 18.5) return { min: 12.5, max: 18, label: "Underweight" };
  if (bmi < 25) return { min: 11.5, max: 16, label: "Normal weight" };
  if (bmi < 30) return { min: 7, max: 11.5, label: "Overweight" };
  return { min: 5, max: 9, label: "Obese" };
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
// All patient self-service endpoints require X-Patient-Id to prevent IDOR.
function patientHeaders(patientId: number): HeadersInit {
  return { "Content-Type": "application/json", "X-Patient-Id": String(patientId) };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  patient: any;
  medications: any[];
  patientId: number;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PregnancyTrackersTab({ patient, medications, patientId }: Props) {
  const [section, setSection] = useState<"trackers" | "records">("trackers");

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-500">
      {/* Section Switcher */}
      <div className="flex gap-2 bg-white/30 backdrop-blur-sm rounded-2xl p-1.5">
        {(["trackers", "records"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 text-xs font-semibold py-2 rounded-xl transition-all ${section === s ? "bg-white shadow text-pink-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            {s === "trackers" ? "My Trackers" : "My Records"}
          </button>
        ))}
      </div>

      {section === "trackers" && <TrackersSection patient={patient} medications={medications} patientId={patientId} />}
      {section === "records" && <RecordsSection patientId={patientId} patient={patient} />}
    </div>
  );
}

// ── Trackers Section ──────────────────────────────────────────────────────────
function TrackersSection({ patient, medications, patientId }: { patient: any; medications: any[]; patientId: number }) {
  return (
    <div className="space-y-4">
      <WaterTracker patientId={patientId} />
      <WeightTracker patientId={patientId} patient={patient} />
      <BPTracker patientId={patientId} patient={patient} />
      <MedicineTracker patientId={patientId} medications={medications} />
    </div>
  );
}

// ── Water Tracker ─────────────────────────────────────────────────────────────
function WaterTracker({ patientId }: { patientId: number }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const goal = 2500;

  const { data: logs = [] } = useQuery<any[]>({
    queryKey: [`/api/water-logs?patientId=${patientId}&date=${today}`],
    queryFn: async () => {
      const r = await fetch(`/api/water-logs?patientId=${patientId}&date=${today}`, { headers: { "X-Patient-Id": String(patientId) } });
      return r.json();
    },
  });

  const totalMl = logs.reduce((s: number, l: any) => s + (l.amountMl || 0), 0);
  const pct = Math.min(100, Math.round((totalMl / goal) * 100));

  const addLog = useMutation({
    mutationFn: async (amountMl: number) => {
      const r = await fetch("/api/water-logs", {
        method: "POST",
        headers: patientHeaders(patientId),
        body: JSON.stringify({ patientId, date: today, amountMl, loggedAt: new Date().toISOString() }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/water-logs?patientId=${patientId}&date=${today}`] }),
  });

  const delLog = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/water-logs/${id}`, { method: "DELETE", headers: { "X-Patient-Id": String(patientId) } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/water-logs?patientId=${patientId}&date=${today}`] }),
  });

  const ringColor = pct >= 100 ? "#10b981" : pct >= 60 ? "#3b82f6" : "#f59e0b";
  const statusColor = pct >= 100 ? "text-emerald-600" : pct >= 60 ? "text-blue-600" : "text-amber-600";

  return (
    <Card className="glass-panel border-blue-200/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-sky-50/30 to-white/40" />
      <CardContent className="relative p-5 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-xl"><Droplets className="w-4 h-4 text-blue-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Water Intake</h3>
              <p className="text-[10px] text-muted-foreground">Goal: {goal} ml/day</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-bold ${statusColor}`}>{totalMl}</span>
            <span className="text-xs text-slate-400 ml-1">/ {goal} ml</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#dbeafe" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={ringColor} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-700">{pct}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-slate-500">
              {pct >= 100 ? "🎉 Daily goal reached!" : `${goal - totalMl} ml more to reach your goal`}
            </p>
            <div className="flex flex-wrap gap-2">
              {[250, 500, 750].map(ml => (
                <button key={ml} onClick={() => addLog.mutate(ml)} disabled={addLog.isPending}
                  className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors">
                  <Plus className="w-3 h-3" />{ml} ml
                </button>
              ))}
            </div>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Today's Log</p>
            {[...logs].reverse().slice(0, 5).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-slate-700">{l.amountMl} ml</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">
                    {l.loggedAt ? new Date(l.loggedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                  <button onClick={() => delLog.mutate(l.id)} className="text-slate-300 hover:text-rose-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Weight Tracker ─────────────────────────────────────────────────────────────
function WeightTracker({ patientId, patient }: { patientId: number; patient: any }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");

  const { data: metrics = [] } = useQuery<any[]>({
    queryKey: [`/api/pregnancy-metrics?patientId=${patientId}`],
    queryFn: async () => {
      const r = await fetch(`/api/pregnancy-metrics?patientId=${patientId}`, { headers: { "X-Patient-Id": String(patientId) } });
      return r.json();
    },
  });

  const sorted = [...metrics].filter((m: any) => m.weight != null).sort((a: any, b: any) => a.week - b.week);
  const latest = sorted[sorted.length - 1];
  const chartData = sorted.slice(-8).map((m: any) => ({ week: `W${m.week}`, weight: m.weight }));

  // Healthy gain indicator: compare latest weight to pre-pregnancy estimate
  const prePregnancyWeight = patient?.weight || patient?.vitals?.weight;
  const gainKg = latest && prePregnancyWeight ? (latest.weight - parseFloat(prePregnancyWeight)).toFixed(1) : null;
  const gainTarget = patient?.bmi ? getWeightGainTarget(parseFloat(patient.bmi)) : getWeightGainTarget(undefined);
  const currentWeek = getGestationalWeek(patient?.lmp);
  const expectedGainAtWeek = gainTarget.min + ((gainTarget.max - gainTarget.min) / 2) * (currentWeek / 40);

  const addWeight = useMutation({
    mutationFn: async () => {
      const week = getGestationalWeek(patient?.lmp);
      const r = await fetch("/api/pregnancy-metrics", {
        method: "POST",
        headers: patientHeaders(patientId),
        body: JSON.stringify({ patientId, week, weight: parseFloat(weight), enteredBy: "patient" }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/pregnancy-metrics?patientId=${patientId}`] });
      setShowForm(false);
      setWeight("");
    },
  });

  return (
    <Card className="glass-panel border-amber-200/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-white/40" />
      <CardContent className="relative p-5 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-xl"><Scale className="w-4 h-4 text-amber-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Weight</h3>
              <p className="text-[10px] text-muted-foreground">Pregnancy weight tracker</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="p-1.5 bg-amber-100 hover:bg-amber-200 rounded-full transition-colors">
            <Plus className="w-4 h-4 text-amber-700" />
          </button>
        </div>

        {latest && (
          <div className="flex items-center gap-3 bg-white/50 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Latest</p>
              <p className="text-2xl font-bold text-amber-700">
                {latest.weight} <span className="text-sm font-normal text-slate-500">kg</span>
              </p>
              <p className="text-[10px] text-slate-400">Week {latest.week}{latest.enteredBy === "patient" ? " · Self-reported" : ""}</p>
            </div>
            {gainKg !== null && (
              <>
                <div className="h-10 w-px bg-slate-200" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Gained</p>
                  <p className="text-lg font-semibold text-slate-700">+{gainKg} kg</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-slate-400" />
                    <p className="text-[10px] text-slate-400">
                      Expected ~{expectedGainAtWeek.toFixed(1)} kg by W{currentWeek}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Healthy gain range */}
        <div className="bg-amber-50 rounded-xl px-3 py-2 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-800">
            Recommended total gain ({gainTarget.label}): <strong>{gainTarget.min}–{gainTarget.max} kg</strong> over 40 weeks.
          </p>
        </div>

        {showForm && (
          <div className="flex gap-2 items-center">
            <input type="number" step="0.1" placeholder="Weight in kg" value={weight} onChange={e => setWeight(e.target.value)}
              className="flex-1 border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white/70" />
            <button onClick={() => addWeight.mutate()} disabled={!weight || addWeight.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
              Save
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
        )}

        {chartData.length > 1 && (
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "none", fontSize: "11px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="weight" radius={[4, 4, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length === 0 && !showForm && (
          <p className="text-xs text-slate-400 text-center py-2">No weight logs yet. Tap + to add your first reading.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── BP Tracker ─────────────────────────────────────────────────────────────────
function BPTracker({ patientId, patient }: { patientId: number; patient: any }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");

  const { data: metrics = [] } = useQuery<any[]>({
    queryKey: [`/api/pregnancy-metrics?patientId=${patientId}`],
    queryFn: async () => {
      const r = await fetch(`/api/pregnancy-metrics?patientId=${patientId}`, { headers: { "X-Patient-Id": String(patientId) } });
      return r.json();
    },
  });

  const bpLogs = [...metrics]
    .filter((m: any) => m.systolic != null && m.diastolic != null)
    .sort((a: any, b: any) => b.week - a.week);
  const latest = bpLogs[0];

  const getBPStatus = (sys: number, dia: number) => {
    if (sys >= 160 || dia >= 110) return { label: "Severe — Call Doctor", color: "text-red-700 bg-red-100 border-red-200", icon: <AlertTriangle className="w-3 h-3" /> };
    if (sys >= 140 || dia >= 90) return { label: "High — Monitor Closely", color: "text-rose-700 bg-rose-100 border-rose-200", icon: <AlertTriangle className="w-3 h-3" /> };
    if (sys >= 120 || dia >= 80) return { label: "Elevated", color: "text-amber-700 bg-amber-100 border-amber-200", icon: <Info className="w-3 h-3" /> };
    return { label: "Normal", color: "text-emerald-700 bg-emerald-100 border-emerald-200", icon: <ShieldCheck className="w-3 h-3" /> };
  };

  const status = latest ? getBPStatus(latest.systolic, latest.diastolic) : null;

  const addBP = useMutation({
    mutationFn: async () => {
      const week = getGestationalWeek(patient?.lmp);
      const r = await fetch("/api/pregnancy-metrics", {
        method: "POST",
        headers: patientHeaders(patientId),
        body: JSON.stringify({ patientId, week, systolic: parseInt(systolic), diastolic: parseInt(diastolic), enteredBy: "patient" }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/pregnancy-metrics?patientId=${patientId}`] });
      setShowForm(false);
      setSystolic("");
      setDiastolic("");
    },
  });

  return (
    <Card className="glass-panel border-rose-200/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-pink-50/30 to-white/40" />
      <CardContent className="relative p-5 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 rounded-xl"><Activity className="w-4 h-4 text-rose-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Blood Pressure</h3>
              <p className="text-[10px] text-muted-foreground">Systolic / Diastolic mmHg</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="p-1.5 bg-rose-100 hover:bg-rose-200 rounded-full transition-colors">
            <Plus className="w-4 h-4 text-rose-700" />
          </button>
        </div>

        {latest && status && (
          <div className="flex items-center gap-4 bg-white/50 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Latest Reading</p>
              <p className="text-2xl font-bold text-rose-700">
                {latest.systolic}<span className="text-base text-slate-400 font-normal">/{latest.diastolic}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                mmHg · Week {latest.week}{latest.enteredBy === "patient" ? " · Self-reported" : ""}
              </p>
            </div>
            <Badge className={`text-[10px] flex items-center gap-1 border ml-auto ${status.color}`}>
              {status.icon}{status.label}
            </Badge>
          </div>
        )}

        {showForm && (
          <div className="flex gap-2 items-center">
            <input type="number" placeholder="Systolic" value={systolic} onChange={e => setSystolic(e.target.value)}
              className="w-1/3 border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white/70 text-center" />
            <span className="text-slate-400 font-bold">/</span>
            <input type="number" placeholder="Diastolic" value={diastolic} onChange={e => setDiastolic(e.target.value)}
              className="w-1/3 border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white/70 text-center" />
            <button onClick={() => addBP.mutate()} disabled={!systolic || !diastolic || addBP.isPending}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
              Save
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
        )}

        {bpLogs.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recent Readings</p>
            {bpLogs.slice(0, 4).map((m: any, i: number) => {
              const s = getBPStatus(m.systolic, m.diastolic);
              return (
                <div key={m.id || i} className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-slate-700 font-medium">
                    {m.systolic}/{m.diastolic} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Week {m.week}</span>
                    <Badge className={`text-[10px] border ${s.color}`}>{s.label.split(" —")[0]}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {bpLogs.length === 0 && !showForm && (
          <p className="text-xs text-slate-400 text-center py-2">No BP readings yet. Tap + to log your first reading.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Medicine Tracker ──────────────────────────────────────────────────────────
function MedicineTracker({ patientId, medications }: { patientId: number; medications: any[] }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const activeMeds = medications.filter((m: any) => !m.status || (m.status || "").toLowerCase() === "active");

  const { data: logs = [] } = useQuery<any[]>({
    queryKey: [`/api/medication-logs?patientId=${patientId}&date=${today}`],
    queryFn: async () => {
      const r = await fetch(`/api/medication-logs?patientId=${patientId}&date=${today}`, { headers: { "X-Patient-Id": String(patientId) } });
      return r.json();
    },
  });

  const takenIds = new Set(logs.map((l: any) => l.medicationId));
  const takenCount = takenIds.size;

  const markTaken = useMutation({
    mutationFn: async (medicationId: number) => {
      const r = await fetch("/api/medication-logs", {
        method: "POST",
        headers: patientHeaders(patientId),
        body: JSON.stringify({ patientId, medicationId, takenDate: today, takenAt: new Date().toISOString() }),
      });
      if (!r.ok) {
        const err = await r.json();
        if (r.status === 409) return; // already taken — ignore
        throw new Error(err.error);
      }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/medication-logs?patientId=${patientId}&date=${today}`] }),
  });

  const unmarkTaken = useMutation({
    mutationFn: async (medicationId: number) => {
      await fetch("/api/medication-logs/unmark", {
        method: "POST",
        headers: patientHeaders(patientId),
        body: JSON.stringify({ patientId, medicationId, takenDate: today }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/medication-logs?patientId=${patientId}&date=${today}`] }),
  });

  return (
    <Card className="glass-panel border-violet-200/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-purple-50/30 to-white/40" />
      <CardContent className="relative p-5 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-100 rounded-xl"><Pill className="w-4 h-4 text-violet-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Today's Medicines</h3>
              <p className="text-[10px] text-muted-foreground">{takenCount} of {activeMeds.length} taken today</p>
            </div>
          </div>
          <div className={`text-sm font-bold ${takenCount === activeMeds.length && activeMeds.length > 0 ? "text-emerald-600" : "text-violet-600"}`}>
            {takenCount}/{activeMeds.length}
          </div>
        </div>

        {activeMeds.length > 0 && (
          <div className="w-full bg-violet-100 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-violet-400 to-purple-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${activeMeds.length > 0 ? (takenCount / activeMeds.length) * 100 : 0}%` }}
            />
          </div>
        )}

        {activeMeds.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">No active medications prescribed.</p>
        ) : (
          <div className="space-y-2">
            {activeMeds.map((med: any) => {
              const taken = takenIds.has(med.id);
              return (
                <button
                  key={med.id}
                  onClick={() => taken ? unmarkTaken.mutate(med.id) : markTaken.mutate(med.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all text-left ${taken ? "bg-emerald-50 border-emerald-200" : "bg-white/60 border-white/60 hover:border-violet-200"}`}
                >
                  <div className={`shrink-0 ${taken ? "text-emerald-500" : "text-slate-300"}`}>
                    {taken ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${taken ? "text-emerald-800 line-through opacity-70" : "text-slate-800"}`}>
                      {med.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{[med.dose, med.frequency].filter(Boolean).join(" — ")}</p>
                  </div>
                  {taken && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">Taken</Badge>}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Records Section ───────────────────────────────────────────────────────────
function RecordsSection({ patientId, patient }: { patientId: number; patient: any }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<"Diagnostic" | "Prescription">("Diagnostic");
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const currentTrimester = patient?.lmp
    ? (getGestationalWeek(patient.lmp) < 13 ? 1 : getGestationalWeek(patient.lmp) < 27 ? 2 : 3)
    : undefined;

  // Patient-uploaded documents
  const { data: patientDocs = [] } = useQuery<any[]>({
    queryKey: [`/api/patient-documents?patientId=${patientId}`],
    queryFn: async () => {
      const r = await fetch(`/api/patient-documents?patientId=${patientId}`, { headers: { "X-Patient-Id": String(patientId) } });
      return r.json();
    },
  });

  // Clinician-uploaded documents (read-only)
  const { data: clinicianDocs = [] } = useQuery<any[]>({
    queryKey: [`/api/patients/${patientId}/documents`],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/documents`);
      return r.json();
    },
  });

  const uploadDoc = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      if (file.size > 5 * 1024 * 1024) { setUploadError("File must be under 5 MB."); setUploading(false); return; }
      const allowedMime = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "image/heic", "image/heif"];
      if (!allowedMime.includes(file.type)) { setUploadError("Unsupported file type. Use JPG, PNG, or PDF."); setUploading(false); return; }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const fileData = dataUrl.split(",")[1];
        const r = await fetch("/api/patient-documents", {
          method: "POST",
          headers: patientHeaders(patientId),
          body: JSON.stringify({
            patientId,
            fileName: file.name,
            fileData,
            mimeType: file.type,
            docType,
            trimester: currentTrimester,
            label: label || file.name,
            uploadedAt: new Date().toISOString(),
          }),
        });
        if (r.ok) {
          qc.invalidateQueries({ queryKey: [`/api/patient-documents?patientId=${patientId}`] });
          setLabel("");
        } else {
          const err = await r.json();
          setUploadError(err.error || "Upload failed");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setUploadError(e.message);
      setUploading(false);
    }
  };

  const deleteDoc = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/patient-documents/${id}`, { method: "DELETE", headers: { "X-Patient-Id": String(patientId) } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/patient-documents?patientId=${patientId}`] }),
  });

  const patientDiag = patientDocs.filter((d: any) => d.docType === "Diagnostic");
  const patientPrx = patientDocs.filter((d: any) => d.docType === "Prescription");

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Upload Section */}
      <Card className="glass-panel border-indigo-200/40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-blue-50/30 to-white/40" />
        <CardContent className="relative p-5 z-10 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-xl"><Upload className="w-4 h-4 text-indigo-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Upload Report</h3>
              <p className="text-[10px] text-muted-foreground">JPG, PNG, PDF · Max 5 MB</p>
            </div>
          </div>

          <div className="flex gap-2">
            {(["Diagnostic", "Prescription"] as const).map(t => (
              <button key={t} onClick={() => setDocType(t)}
                className={`flex-1 text-xs font-semibold py-2 rounded-xl border transition-all ${docType === t ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white/60 text-slate-500 border-white/60 hover:border-indigo-100"}`}>
                {t === "Diagnostic" ? "🔬 Diagnostic" : "📋 Prescription"}
              </button>
            ))}
          </div>

          <input placeholder="Label (e.g. Anomaly Scan W20)" value={label} onChange={e => setLabel(e.target.value)}
            className="w-full border border-indigo-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white/70" />

          {uploadError && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{uploadError}</p>}

          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ""; }} />

          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl py-4 flex flex-col items-center gap-2 transition-colors group disabled:opacity-50">
            {uploading
              ? <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              : <Upload className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />}
            <p className="text-xs text-slate-500">{uploading ? "Uploading…" : "Tap to choose file"}</p>
          </button>
        </CardContent>
      </Card>

      {/* Clinician-uploaded docs (read-only) */}
      {clinicianDocs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <FileText className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-700">From Your Clinic</h4>
            <Badge variant="outline" className="text-[10px] ml-auto">{clinicianDocs.length}</Badge>
          </div>
          <div className="space-y-2">
            {clinicianDocs.map((doc: any) => (
              <Card key={doc.id} className="glass-panel border-white/60">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{doc.name || doc.type || "Document"}</p>
                    <p className="text-[10px] text-slate-400">
                      {doc.date ? new Date(doc.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                      {doc.type ? ` · ${doc.type}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 text-slate-400">Clinic</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Patient-uploaded: Diagnostic */}
      <DocList
        title="My Diagnostic Reports"
        icon={<FileText className="w-4 h-4 text-purple-600" />}
        docs={patientDiag}
        onDelete={id => deleteDoc.mutate(id)}
        patientId={patientId}
      />

      {/* Patient-uploaded: Prescriptions */}
      <DocList
        title="My Prescriptions"
        icon={<Image className="w-4 h-4 text-blue-600" />}
        docs={patientPrx}
        onDelete={id => deleteDoc.mutate(id)}
        patientId={patientId}
      />

      {patientDocs.length === 0 && clinicianDocs.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No documents yet. Upload your first report above.</p>
        </div>
      )}
    </div>
  );
}

// ── Document Viewer Modal ─────────────────────────────────────────────────────
function DocViewer({ doc, patientId, onClose }: { doc: any; patientId: number; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(doc.fileData ? `data:${doc.mimeType};base64,${doc.fileData}` : null);
  const [loading, setLoading] = useState(!doc.fileData);

  React.useEffect(() => {
    if (doc.fileData) return;
    setLoading(true);
    fetch(`/api/patient-documents/${doc.id}`, { headers: { "X-Patient-Id": String(patientId) } })
      .then(r => r.json())
      .then(full => { if (full.fileData) setSrc(`data:${full.mimeType};base64,${full.fileData}`); })
      .finally(() => setLoading(false));
  }, [doc.id, doc.fileData, patientId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <p className="text-sm font-semibold text-slate-800 truncate max-w-[80%]">{doc.label || doc.fileName}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[200px]">
          {loading && <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
          {!loading && !src && <p className="text-sm text-slate-400">Unable to load file preview.</p>}
          {!loading && src && doc.mimeType?.includes("image") && (
            <img src={src} alt={doc.label || doc.fileName} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
          )}
          {!loading && src && doc.mimeType === "application/pdf" && (
            <iframe src={src} title={doc.label || doc.fileName} className="w-full h-96 rounded-lg border" />
          )}
        </div>
        {src && (
          <div className="px-4 pb-4">
            <a href={src} download={doc.fileName}
              className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold py-2.5 rounded-xl transition-colors">
              <Upload className="w-4 h-4 rotate-180" /> Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function DocList({ title, icon, docs, onDelete, patientId }: {
  title: string; icon: React.ReactNode; docs: any[]; onDelete: (id: number) => void; patientId: number;
}) {
  const [viewing, setViewing] = useState<any | null>(null);
  if (docs.length === 0) return null;
  return (
    <div>
      {viewing && <DocViewer doc={viewing} patientId={patientId} onClose={() => setViewing(null)} />}
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <Badge variant="outline" className="text-[10px] ml-auto">{docs.length}</Badge>
      </div>
      <div className="space-y-2">
        {docs.map((doc: any) => (
          <Card key={doc.id} className="glass-panel border-white/60">
            <CardContent className="p-3 flex items-center gap-3">
              <button onClick={() => setViewing(doc)} className="p-2 bg-slate-100 hover:bg-indigo-100 rounded-lg shrink-0 transition-colors">
                {doc.mimeType?.includes("image") ? <Image className="w-4 h-4 text-slate-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
              </button>
              <button onClick={() => setViewing(doc)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-slate-700 truncate">{doc.label || doc.fileName}</p>
                <p className="text-[10px] text-slate-400">
                  {doc.trimester ? `Trimester ${doc.trimester}` : ""}
                  {doc.trimester && doc.uploadedAt ? " · " : ""}
                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                  <span className="text-indigo-400 ml-2">Tap to view</span>
                </p>
              </button>
              <button onClick={() => onDelete(doc.id)} className="text-slate-300 hover:text-rose-400 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
