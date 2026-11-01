import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

function api(path: string, opts?: RequestInit, token?: string) {
  const url = /^https?:\/\//i.test(path) || path.startsWith("//") ? path : `${API_BASE}${path}`;
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

type Staff = { id: string; username: string; role: string };
const recoveryPatientSchema = z.object({
  id: z.number().int().positive(), name: z.string(), phone: z.string().nullable().optional(), age: z.number().nullable().optional(),
  surgery: z.object({ id: z.number().int().positive(), procedureName: z.string(), plannedDate: z.string(), completedAt: z.string(), surgeonName: z.string() }),
});
type Patient = z.infer<typeof recoveryPatientSchema>;
const observationSchema = z.object({
  id: z.number().int().positive(), patientId: z.number().int().positive(), surgeryPlanId: z.number().int().positive(),
  observedAt: z.string(), painScore: z.number().nullable(), systolic: z.number().nullable(),
  diastolic: z.number().nullable(), pulse: z.number().nullable(), nausea: z.boolean(),
  mobility: z.string().nullable(), woundCondition: z.string().nullable(), notes: z.string().nullable(), recordedBy: z.string().nullable(),
});
type Observation = z.infer<typeof observationSchema>;

const PAIN_LABELS: Record<number, string> = {
  0: "0 – None", 1: "1", 2: "2", 3: "3 – Mild", 4: "4", 5: "5 – Moderate",
  6: "6", 7: "7 – Severe", 8: "8", 9: "9", 10: "10 – Worst"
};

const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

function PainSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Pain Score: <span className={`font-bold ${value <= 3 ? "text-emerald-600" : value <= 6 ? "text-amber-600" : "text-rose-600"}`}>{PAIN_LABELS[value]}</span>
        </span>
      </div>
      <input
        type="range" min={0} max={10} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0 – None</span><span>5 – Moderate</span><span>10 – Worst</span>
      </div>
    </div>
  );
}

function ObservationRow({ obs }: { obs: Observation }) {
  const when = new Date(obs.observedAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const painColor = obs.painScore != null
    ? obs.painScore <= 3 ? "bg-emerald-100 text-emerald-700" : obs.painScore <= 6 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
    : "bg-secondary text-muted-foreground";
  return (
    <div className="grid grid-cols-6 gap-3 px-4 py-3 border-b border-border text-sm items-center">
      <span className="text-muted-foreground text-xs">{when}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-center ${painColor}`}>
        {obs.painScore != null ? obs.painScore : "—"}
      </span>
      <span className="text-foreground text-xs text-center">
        {obs.systolic && obs.diastolic ? `${obs.systolic}/${obs.diastolic}` : "—"}
      </span>
      <span className="text-foreground text-xs text-center">{obs.pulse ?? "—"}</span>
      <span className="text-xs text-center">
        {obs.nausea ? <span className="text-amber-600 font-medium">Yes</span> : <span className="text-muted-foreground">No</span>}
      </span>
      <span className="text-muted-foreground text-xs truncate">{obs.woundCondition || obs.mobility || obs.notes || "—"}</span>
    </div>
  );
}

export default function RecoverApp() {
  const { toast } = useToast();

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("recover_token"));
  const [staff, setStaff] = useState<Staff | null>(() => {
    try { return JSON.parse(sessionStorage.getItem("recover_staff") || "null"); } catch { return null; }
  });
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Auto-lock (goes to patient search, keeps session) ─────────────────────
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (token) {
      idleTimer.current = setTimeout(() => {
        // Lock to patient search screen (do NOT log out — keep session active)
        setSelectedPatient(null);
        setView("search");
        setSearch("");
        toast({ title: "Screen cleared", description: "Patient cleared after 2 min inactivity. Please search again." });
      }, IDLE_TIMEOUT_MS);
    }
  }, [token]);

  useEffect(() => {
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  function handleLogout() {
    sessionStorage.removeItem("recover_token");
    sessionStorage.removeItem("recover_staff");
    setToken(null);
    setStaff(null);
    setSelectedPatient(null);
    setView("search");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const r = await api("/api/postop/auth/passcode", {
        method: "POST",
        body: JSON.stringify({ passcode }),
      });
      if (!r.headers.get("content-type")?.includes("application/json")) throw new Error("The recovery API is unavailable. Check that the updated API is deployed.");
      const data: unknown = await r.json();
      if (!r.ok) {
        setLoginError(data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Sign-in failed");
        return;
      }
      if (!data || typeof data !== "object" || !("staffToken" in data) || typeof data.staffToken !== "string" || !data.staffToken ||
          !("user" in data) || !data.user || typeof data.user !== "object" || !("id" in data.user) || typeof data.user.id !== "string" ||
          !("username" in data.user) || typeof data.user.username !== "string" || !("role" in data.user) || typeof data.user.role !== "string") throw new Error("The recovery API returned an invalid staff session.");
      sessionStorage.setItem("recover_token", data.staffToken);
      sessionStorage.setItem("recover_staff", JSON.stringify(data.user));
      setToken(data.staffToken);
      setStaff({ id: data.user.id, username: data.user.username, role: data.user.role });
      setPasscode("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function recoveryResponse(response: Response): Promise<unknown> {
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("The recovery API is unavailable. Deploy the updated API and recovery app together.");
    const data: unknown = await response.json();
    if (!response.ok) {
      const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : `Recovery request failed (HTTP ${response.status})`;
      if (response.status === 401) handleLogout();
      if (response.status === 409 || response.status === 404) {
        setSelectedPatient(null); setView("search"); setSearch("");
        toast({ title: "Recovery enrollment changed", description: message, variant: "destructive" });
      }
      throw new Error(message);
    }
    return data;
  }

  // ── App state ──────────────────────────────────────────────────────────────
  type View = "search" | "confirm" | "form" | "history";
  const [view, setView] = useState<View>("search");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    painScore: 0, systolic: "", diastolic: "", pulse: "",
    nausea: false, mobility: "", woundCondition: "", notes: "",
  });

  function resetForm() {
    setFormData({ painScore: 0, systolic: "", diastolic: "", pulse: "", nausea: false, mobility: "", woundCondition: "", notes: "" });
  }

  // Pain score 0 is a valid clinical value; submission is always allowed since nurse
  // has explicitly confirmed the patient and navigated to the form.
  const isFormFilled = true;

  const { data: patients = [], isFetching, error: patientsError, refetch: refetchPatients } = useQuery<Patient[]>({
    queryKey: ["/api/postop/patients", staff?.id, search],
    queryFn: async () => {
      if (!token) return [];
      const r = await api(`/api/postop/patients?q=${encodeURIComponent(search)}`, {}, token);
      return z.array(recoveryPatientSchema).parse(await recoveryResponse(r));
    },
    enabled: !!token,
    refetchInterval: 15_000,
    retry: false,
  });

  const { data: observations = [], error: observationsError, refetch: refetchObs } = useQuery<Observation[]>({
    queryKey: ["/api/postop/observations", staff?.id, selectedPatient?.id, selectedPatient?.surgery.id],
    queryFn: async () => {
      if (!token || !selectedPatient) return [];
      const r = await api(`/api/postop/observations`, { headers: { "X-Patient-Id": String(selectedPatient.id), "X-Surgery-Plan-Id": String(selectedPatient.surgery.id) } }, token);
      const data = await recoveryResponse(r);
      const observations = z.array(observationSchema).parse(data);
      if (observations.some((observation) => observation.patientId !== selectedPatient.id || observation.surgeryPlanId !== selectedPatient.surgery.id)) throw new Error("The recovery API returned observations for a different surgery");
      return observations;
    },
    enabled: !!token && !!selectedPatient,
    refetchInterval: 15_000,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const r = await api("/api/postop/observations", {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatient!.id,
          surgeryPlanId: selectedPatient!.surgery.id,
          observedAt: new Date().toISOString(),
          painScore: formData.painScore,
          systolic: formData.systolic || null,
          diastolic: formData.diastolic || null,
          pulse: formData.pulse || null,
          nausea: formData.nausea,
          mobility: formData.mobility || null,
          woundCondition: formData.woundCondition || null,
          notes: formData.notes || null,
        }),
      }, token!);
      return recoveryResponse(r);
    },
    onSuccess: () => {
      toast({ title: "Observation saved", description: "Post-op record submitted successfully." });
      resetForm();
      refetchObs();
      setView("history");
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!token || !staff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-secondary flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="pb-2 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-primary" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">SaivieRecover</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">Post-Operative Care Tablet</p>
          </CardHeader>
          <CardContent className="pt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter your individual staff passcode to sign in. No WhatsApp code is required.</p>
                <div className="space-y-2">
                  <Label htmlFor="passcode" className="text-sm font-semibold text-foreground">Passcode</Label>
                  <Input
                    id="passcode" type="password" autoComplete="current-password"
                    value={passcode} onChange={e => setPasscode(e.target.value)}
                    placeholder="Enter passcode" className="h-13 text-base"
                  />
                </div>
                {loginError && (
                  <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">{loginError}</div>
                )}
                <Button type="submit" className="w-full h-13 text-base font-semibold bg-primary hover:bg-primary/90" disabled={loginLoading || !passcode.trim()}>
                  {loginLoading ? "Signing in…" : "Sign In"}
                </Button>
              </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main app shell ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-primary" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-none">SaivieRecover</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Post-Op Care</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {selectedPatient && (
            <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2">
              <span className="text-xs text-muted-foreground">Patient:</span>
              <span className="text-sm font-semibold text-secondary-foreground">{selectedPatient.name}</span>
              <button onClick={() => { setSelectedPatient(null); setView("search"); resetForm(); }} className="ml-2 text-muted-foreground hover:text-foreground">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs font-semibold text-foreground">{staff.username}</p>
            <p className="text-xs text-muted-foreground">{staff.role || "Staff"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs text-muted-foreground border-border">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Sub-nav (only when patient selected) */}
      {selectedPatient && (
        <div className="bg-card border-b border-border px-6 flex gap-0">
          {(["form", "history"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${view === v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {v === "form" ? "New Observation" : "History"}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {observationsError && selectedPatient && <div role="alert" className="mx-auto max-w-3xl p-4 text-sm text-rose-700">Could not load recovery observations: {observationsError.message} <Button variant="link" onClick={() => void refetchObs()}>Retry</Button></div>}
        {/* Patient search */}
        {view === "search" && (
          <div className="max-w-3xl mx-auto px-6 pt-10 pb-20 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Patients in recovery</h2>
              <p className="text-muted-foreground text-sm">Only patients whose surgery has been marked completed by a doctor appear here. Planned, cancelled and discharged cases are excluded.</p>
            </div>
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patient name or phone…"
              className="h-14 text-base shadow-sm"
            />
            <div className="space-y-2">
              {patientsError ? <div role="alert" className="rounded-xl border border-rose-200 p-4 text-sm text-rose-700">{patientsError.message} <Button variant="link" onClick={() => void refetchPatients()}>Retry</Button></div> : isFetching ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Searching…</div>
              ) : patients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">{search ? `No recovery patients found for "${search}"` : "No patients are currently in surgical recovery."}</div>
              ) : (
                patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p); setView("confirm"); }}
                    className="w-full text-left bg-card rounded-xl border border-border hover:border-primary hover:bg-secondary/40 transition-all px-5 py-4 shadow-sm group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground text-base">{p.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {[p.age && `${p.age} yrs`, p.phone].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-1 text-sm text-primary">{p.surgery.procedureName} · {p.surgery.surgeonName} · {new Date(p.surgery.completedAt).toLocaleDateString("en-IN")}</p>
                      </div>
                      <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Patient confirmation */}
        {view === "confirm" && selectedPatient && (
          <div className="max-w-2xl mx-auto px-6 pt-10 pb-20 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Confirm Patient Identity</h2>
              <p className="text-muted-foreground text-sm">Please verify the patient's details before recording observations.</p>
            </div>
            <Card className="shadow-md border-border bg-secondary/30">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-xl">
                    {selectedPatient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{selectedPatient.name}</p>
                    <p className="text-sm text-primary font-medium mt-0.5">{selectedPatient.surgery.procedureName} · {selectedPatient.surgery.surgeonName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Surgery completed {new Date(selectedPatient.surgery.completedAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Age</p>
                    <p className="text-foreground font-medium">{selectedPatient.age ? `${selectedPatient.age} years` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                    <p className="text-foreground font-medium">{selectedPatient.phone || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-13 text-base font-semibold" onClick={() => { setSelectedPatient(null); setView("search"); }}>
                Wrong Patient
              </Button>
              <Button className="flex-[2] h-13 text-base font-bold bg-primary hover:bg-primary/90 shadow-md" onClick={() => setView("form")}>
                Confirm — Record Observations
              </Button>
            </div>
          </div>
        )}

        {/* Observation form */}
        {view === "form" && selectedPatient && (
          <div className="max-w-3xl mx-auto px-6 pt-8 pb-20 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">New Observation</h2>
              <p className="text-muted-foreground text-sm">Recording vitals for <span className="font-semibold text-primary">{selectedPatient.name}</span> · {selectedPatient.surgery.procedureName}</p>
            </div>

            {/* Pain score */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                  <span>🩹</span> Pain Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <PainSlider value={formData.painScore} onChange={v => setFormData(f => ({ ...f, painScore: v }))} />
              </CardContent>
            </Card>

            {/* Vitals */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                  <span>❤️</span> Vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Systolic (mmHg)</Label>
                    <Input
                      type="number" inputMode="numeric" placeholder="e.g. 120"
                      value={formData.systolic} onChange={e => setFormData(f => ({ ...f, systolic: e.target.value }))}
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diastolic (mmHg)</Label>
                    <Input
                      type="number" inputMode="numeric" placeholder="e.g. 80"
                      value={formData.diastolic} onChange={e => setFormData(f => ({ ...f, diastolic: e.target.value }))}
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pulse (bpm)</Label>
                    <Input
                      type="number" inputMode="numeric" placeholder="e.g. 72"
                      value={formData.pulse} onChange={e => setFormData(f => ({ ...f, pulse: e.target.value }))}
                      className="h-12 text-base"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observations */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                  <span>📋</span> Clinical Observations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                <div className="flex items-center justify-between py-2 border border-border rounded-xl px-4 bg-muted/50">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Nausea / Vomiting</p>
                    <p className="text-xs text-muted-foreground">Patient reporting nausea or has vomited</p>
                  </div>
                  <Switch
                    checked={formData.nausea}
                    onCheckedChange={v => setFormData(f => ({ ...f, nausea: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mobility Status</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Bedrest", "Sitting up", "Ambulating"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFormData(f => ({ ...f, mobility: f.mobility === opt ? "" : opt }))}
                        className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all ${formData.mobility === opt ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary"}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wound Condition</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Clean & dry", "Mild ooze", "Saturated", "Signs of infection"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFormData(f => ({ ...f, woundCondition: f.woundCondition === opt ? "" : opt }))}
                        className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all ${formData.woundCondition === opt
                          ? opt === "Signs of infection" ? "bg-rose-500 text-white border-rose-500 shadow-sm" : "bg-primary text-primary-foreground border-primary shadow-sm"
                          : opt === "Signs of infection" ? "bg-card text-rose-600 dark:text-rose-300 border-rose-200 hover:border-rose-300" : "bg-card text-muted-foreground border-border hover:border-primary"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Additional Notes</Label>
                  <Textarea
                    placeholder="Observations, concerns, or instructions given to patient…"
                    value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                    className="min-h-[90px] text-sm resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Validation warning */}
            {!isFormFilled && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
                Please fill in at least one field (pain score &gt; 0, a vital sign, or a clinical observation).
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-14 text-base font-semibold" onClick={() => setView("history")}>
                Cancel
              </Button>
              <Button
                className="flex-[2] h-14 text-base font-bold bg-primary hover:bg-primary/90 shadow-md"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !isFormFilled}
              >
                {submitMutation.isPending ? "Saving…" : "Save Observation"}
              </Button>
            </div>
          </div>
        )}

        {/* History */}
        {view === "history" && selectedPatient && (
          <div className="max-w-5xl mx-auto px-6 pt-8 pb-20 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Observation History</h2>
                <p className="text-muted-foreground text-sm">{selectedPatient.name} — {selectedPatient.surgery.procedureName} recovery entries</p>
              </div>
              <Button onClick={() => { resetForm(); setView("form"); }} className="bg-primary hover:bg-primary/90 h-11 font-semibold">
                + New Observation
              </Button>
            </div>

            <Card className="shadow-sm border-border overflow-hidden">
              <div className="grid grid-cols-6 gap-3 px-4 py-3 bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wide">
                <span>Time</span>
                <span className="text-center">Pain</span>
                <span className="text-center">BP</span>
                <span className="text-center">Pulse</span>
                <span className="text-center">Nausea</span>
                <span>Notes</span>
              </div>
              {observations.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">No observations recorded yet.</div>
              ) : (
                observations.map(obs => <ObservationRow key={obs.id} obs={obs} />)
              )}
            </Card>

            {observations.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Latest Pain", value: observations[0].painScore != null ? `${observations[0].painScore}/10` : "—", sub: PAIN_LABELS[observations[0].painScore ?? 0] || "", colorText: observations[0].painScore != null && observations[0].painScore <= 3 ? "text-emerald-600" : observations[0].painScore != null && observations[0].painScore <= 6 ? "text-amber-600" : "text-rose-600" },
                  { label: "Latest BP", value: observations[0].systolic && observations[0].diastolic ? `${observations[0].systolic}/${observations[0].diastolic}` : "—", sub: "mmHg", colorText: "text-sky-700" },
                  { label: "Latest Pulse", value: observations[0].pulse != null ? `${observations[0].pulse}` : "—", sub: "bpm", colorText: "text-emerald-700" },
                ].map(card => (
                  <Card key={card.label} className="shadow-sm border-border">
                    <CardContent className="p-5 text-center">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{card.label}</p>
                      <p className={`text-3xl font-bold ${card.colorText}`}>{card.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
