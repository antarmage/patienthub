import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

function api(path: string, opts?: RequestInit, token?: string) {
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

type Staff = { id: string; username: string; role: string };
type Patient = { id: number; name: string; phone?: string; condition?: string; age?: number; dateOfBirth?: string };
type Observation = {
  id: number; patientId: number; observedAt: string; painScore: number | null;
  systolic: number | null; diastolic: number | null; pulse: number | null;
  nausea: boolean; mobility: string | null; woundCondition: string | null;
  notes: string | null; recordedBy: string | null;
};

const PAIN_LABELS: Record<number, string> = {
  0: "0 – None", 1: "1", 2: "2", 3: "3 – Mild", 4: "4", 5: "5 – Moderate",
  6: "6", 7: "7 – Severe", 8: "8", 9: "9", 10: "10 – Worst"
};

const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

function PainSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          Pain Score: <span className={`font-bold ${value <= 3 ? "text-emerald-600" : value <= 6 ? "text-amber-600" : "text-rose-600"}`}>{PAIN_LABELS[value]}</span>
        </span>
      </div>
      <input
        type="range" min={0} max={10} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-sky-500"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>0 – None</span><span>5 – Moderate</span><span>10 – Worst</span>
      </div>
    </div>
  );
}

function ObservationRow({ obs }: { obs: Observation }) {
  const when = new Date(obs.observedAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const painColor = obs.painScore != null
    ? obs.painScore <= 3 ? "bg-emerald-100 text-emerald-700" : obs.painScore <= 6 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
    : "bg-slate-100 text-slate-500";
  return (
    <div className="grid grid-cols-6 gap-3 px-4 py-3 border-b border-slate-100 text-sm items-center">
      <span className="text-slate-500 text-xs">{when}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-center ${painColor}`}>
        {obs.painScore != null ? obs.painScore : "—"}
      </span>
      <span className="text-slate-700 text-xs text-center">
        {obs.systolic && obs.diastolic ? `${obs.systolic}/${obs.diastolic}` : "—"}
      </span>
      <span className="text-slate-700 text-xs text-center">{obs.pulse ?? "—"}</span>
      <span className="text-xs text-center">
        {obs.nausea ? <span className="text-amber-600 font-medium">Yes</span> : <span className="text-slate-400">No</span>}
      </span>
      <span className="text-slate-500 text-xs truncate">{obs.woundCondition || obs.mobility || obs.notes || "—"}</span>
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
  const [loginForm, setLoginForm] = useState({ username: "", passcode: "" });
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const r = await api("/api/postop/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: loginForm.username, passcode: loginForm.passcode }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setLoginError((err as any).error || "Login failed");
        return;
      }
      const data = await r.json();
      sessionStorage.setItem("recover_token", data.staffToken);
      sessionStorage.setItem("recover_staff", JSON.stringify(data.user));
      setToken(data.staffToken);
      setStaff(data.user);
    } catch {
      setLoginError("Network error, please try again.");
    } finally {
      setLoginLoading(false);
    }
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

  const { data: patients = [], isFetching } = useQuery<Patient[]>({
    queryKey: ["/api/postop/patients", search],
    queryFn: async () => {
      if (!token) return [];
      const r = await api(`/api/postop/patients?q=${encodeURIComponent(search)}`, {}, token);
      if (r.status === 401) { handleLogout(); return []; }
      return r.json();
    },
    enabled: !!token,
  });

  const { data: observations = [], refetch: refetchObs } = useQuery<Observation[]>({
    queryKey: ["/api/postop/observations", selectedPatient?.id],
    queryFn: async () => {
      if (!token || !selectedPatient) return [];
      const r = await api(`/api/postop/observations/${selectedPatient.id}`, {}, token);
      if (r.status === 401) { handleLogout(); return []; }
      return r.json();
    },
    enabled: !!token && !!selectedPatient,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const r = await api("/api/postop/observations", {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatient!.id,
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
      if (r.status === 401) { handleLogout(); throw new Error("Session expired"); }
      if (!r.ok) throw new Error("Failed to save");
      return r.json();
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
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="pb-2 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-sky-600" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">SaivieRecover</CardTitle>
            <p className="text-slate-500 text-sm mt-1">Post-Operative Care Tablet</p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-slate-700">Staff Username</Label>
                <Input
                  id="username" autoCapitalize="none" autoCorrect="off"
                  value={loginForm.username} onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Enter your username" className="h-13 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passcode" className="text-sm font-semibold text-slate-700">Passcode</Label>
                <Input
                  id="passcode" type="password" autoComplete="current-password"
                  value={loginForm.passcode} onChange={e => setLoginForm(f => ({ ...f, passcode: e.target.value }))}
                  placeholder="Enter passcode" className="h-13 text-base"
                />
              </div>
              {loginError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">{loginError}</div>
              )}
              <Button type="submit" className="w-full h-13 text-base font-semibold bg-sky-600 hover:bg-sky-700" disabled={loginLoading || !loginForm.username || !loginForm.passcode}>
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-sky-600" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-none">SaivieRecover</h1>
            <p className="text-xs text-slate-400 mt-0.5">Post-Op Care</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {selectedPatient && (
            <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2">
              <span className="text-xs text-slate-500">Patient:</span>
              <span className="text-sm font-semibold text-sky-800">{selectedPatient.name}</span>
              <button onClick={() => { setSelectedPatient(null); setView("search"); resetForm(); }} className="ml-2 text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-700">{staff.username}</p>
            <p className="text-xs text-slate-400">{staff.role || "Staff"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs text-slate-500 border-slate-200">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Sub-nav (only when patient selected) */}
      {selectedPatient && (
        <div className="bg-white border-b border-slate-200 px-6 flex gap-0">
          {(["form", "history"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${view === v ? "border-sky-500 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {v === "form" ? "New Observation" : "History"}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Patient search */}
        {view === "search" && (
          <div className="max-w-3xl mx-auto px-6 pt-10 pb-20 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Find Patient</h2>
              <p className="text-slate-500 text-sm">Search by name or phone number to begin recording post-op vitals.</p>
            </div>
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patient name or phone…"
              className="h-14 text-base shadow-sm"
            />
            <div className="space-y-2">
              {isFetching ? (
                <div className="text-center py-8 text-slate-400 text-sm">Searching…</div>
              ) : patients.length === 0 && search ? (
                <div className="text-center py-8 text-slate-400 text-sm">No patients found for "{search}"</div>
              ) : (
                patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p); setView("confirm"); }}
                    className="w-full text-left bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-all px-5 py-4 shadow-sm group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-base">{p.name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {[p.age && `${p.age} yrs`, p.phone, p.condition].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-sky-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Confirm Patient Identity</h2>
              <p className="text-slate-500 text-sm">Please verify the patient's details before recording observations.</p>
            </div>
            <Card className="shadow-md border-sky-200 bg-sky-50/30">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-sky-100">
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xl">
                    {selectedPatient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-800">{selectedPatient.name}</p>
                    {selectedPatient.condition && <p className="text-sm text-sky-600 font-medium mt-0.5">{selectedPatient.condition}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Age</p>
                    <p className="text-slate-800 font-medium">{selectedPatient.age ? `${selectedPatient.age} years` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Phone</p>
                    <p className="text-slate-800 font-medium">{selectedPatient.phone || "—"}</p>
                  </div>
                  {selectedPatient.dateOfBirth && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date of Birth</p>
                      <p className="text-slate-800 font-medium">{new Date(selectedPatient.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-13 text-base font-semibold" onClick={() => { setSelectedPatient(null); setView("search"); }}>
                Wrong Patient
              </Button>
              <Button className="flex-[2] h-13 text-base font-bold bg-sky-600 hover:bg-sky-700 shadow-md" onClick={() => setView("form")}>
                Confirm — Record Observations
              </Button>
            </div>
          </div>
        )}

        {/* Observation form */}
        {view === "form" && selectedPatient && (
          <div className="max-w-3xl mx-auto px-6 pt-8 pb-20 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">New Observation</h2>
              <p className="text-slate-500 text-sm">Recording vitals for <span className="font-semibold text-sky-700">{selectedPatient.name}</span></p>
            </div>

            {/* Pain score */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <span>🩹</span> Pain Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <PainSlider value={formData.painScore} onChange={v => setFormData(f => ({ ...f, painScore: v }))} />
              </CardContent>
            </Card>

            {/* Vitals */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <span>❤️</span> Vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Systolic (mmHg)</Label>
                    <Input
                      type="number" inputMode="numeric" placeholder="e.g. 120"
                      value={formData.systolic} onChange={e => setFormData(f => ({ ...f, systolic: e.target.value }))}
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Diastolic (mmHg)</Label>
                    <Input
                      type="number" inputMode="numeric" placeholder="e.g. 80"
                      value={formData.diastolic} onChange={e => setFormData(f => ({ ...f, diastolic: e.target.value }))}
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pulse (bpm)</Label>
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
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <span>📋</span> Clinical Observations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                <div className="flex items-center justify-between py-2 border border-slate-100 rounded-xl px-4 bg-slate-50/50">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Nausea / Vomiting</p>
                    <p className="text-xs text-slate-400">Patient reporting nausea or has vomited</p>
                  </div>
                  <Switch
                    checked={formData.nausea}
                    onCheckedChange={v => setFormData(f => ({ ...f, nausea: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mobility Status</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Bedrest", "Sitting up", "Ambulating"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFormData(f => ({ ...f, mobility: f.mobility === opt ? "" : opt }))}
                        className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all ${formData.mobility === opt ? "bg-sky-500 text-white border-sky-500 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Wound Condition</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Clean & dry", "Mild ooze", "Saturated", "Signs of infection"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFormData(f => ({ ...f, woundCondition: f.woundCondition === opt ? "" : opt }))}
                        className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all ${formData.woundCondition === opt
                          ? opt === "Signs of infection" ? "bg-rose-500 text-white border-rose-500 shadow-sm" : "bg-sky-500 text-white border-sky-500 shadow-sm"
                          : opt === "Signs of infection" ? "bg-white text-rose-600 border-rose-200 hover:border-rose-300" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Additional Notes</Label>
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
                className="flex-[2] h-14 text-base font-bold bg-sky-600 hover:bg-sky-700 shadow-md"
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
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Observation History</h2>
                <p className="text-slate-500 text-sm">{selectedPatient.name} — all recorded post-op entries</p>
              </div>
              <Button onClick={() => { resetForm(); setView("form"); }} className="bg-sky-600 hover:bg-sky-700 h-11 font-semibold">
                + New Observation
              </Button>
            </div>

            <Card className="shadow-sm border-slate-200 overflow-hidden">
              <div className="grid grid-cols-6 gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <span>Time</span>
                <span className="text-center">Pain</span>
                <span className="text-center">BP</span>
                <span className="text-center">Pulse</span>
                <span className="text-center">Nausea</span>
                <span>Notes</span>
              </div>
              {observations.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">No observations recorded yet.</div>
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
                  <Card key={card.label} className="shadow-sm border-slate-200">
                    <CardContent className="p-5 text-center">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{card.label}</p>
                      <p className={`text-3xl font-bold ${card.colorText}`}>{card.value}</p>
                      <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
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
