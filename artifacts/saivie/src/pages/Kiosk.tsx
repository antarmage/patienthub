import React, { useState, useEffect, useRef, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Screen =
  | "phone"
  | "appointments"
  | "confirm-checkin"
  | "intake"
  | "status"
  | "done";

interface KioskPatient {
  id: number;
  name: string;
  phone?: string;
}

interface KioskAppointment {
  id: number;
  date: string;
  time: string;
  type: string;
  status: string | null;
  checkedInAt: string | null;
  providerName: string;
}

const IDLE_SECONDS = 90;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  "checked-in": { label: "Checked In — Waiting", color: "#f59e0b" },
  waiting: { label: "Waiting", color: "#f59e0b" },
  "with doctor": { label: "With Doctor", color: "#6366f1" },
  "with-doctor": { label: "With Doctor", color: "#6366f1" },
  completed: { label: "Completed", color: "#10b981" },
  done: { label: "Completed", color: "#10b981" },
};

function getStatusInfo(status: string | null) {
  const key = (status || "").toLowerCase();
  return STATUS_LABEL[key] ?? { label: status || "Waiting", color: "#f59e0b" };
}

export default function Kiosk() {
  const [screen, setScreen] = useState<Screen>("phone");
  const [phone, setPhone] = useState("");
  const [patient, setPatient] = useState<KioskPatient | null>(null);
  const [appointments, setAppointments] = useState<KioskAppointment[]>([]);
  const [selected, setSelected] = useState<KioskAppointment | null>(null);
  const [intakeData, setIntakeData] = useState({
    chiefComplaint: "",
    currentMeds: "",
    allergies: "",
    newSymptoms: "",
  });
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [idleCountdown, setIdleCountdown] = useState(IDLE_SECONDS);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleCountdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetToHome = useCallback(() => {
    setScreen("phone");
    setPhone("");
    setPatient(null);
    setAppointments([]);
    setSelected(null);
    setIntakeData({ chiefComplaint: "", currentMeds: "", allergies: "", newSymptoms: "" });
    setLiveStatus(null);
    setLoading(false);
    setError("");
    setIdleCountdown(IDLE_SECONDS);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleCountdownTimer.current) clearInterval(idleCountdownTimer.current);
    setIdleCountdown(IDLE_SECONDS);
    if (screen !== "phone") {
      idleTimer.current = setTimeout(resetToHome, IDLE_SECONDS * 1000);
      let secs = IDLE_SECONDS;
      idleCountdownTimer.current = setInterval(() => {
        secs -= 1;
        setIdleCountdown(secs);
        if (secs <= 0) {
          if (idleCountdownTimer.current) clearInterval(idleCountdownTimer.current);
        }
      }, 1000);
    }
  }, [screen, resetToHome]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (idleCountdownTimer.current) clearInterval(idleCountdownTimer.current);
    };
  }, [screen, resetIdleTimer]);

  useEffect(() => {
    const events = ["mousedown", "touchstart", "keydown"];
    const handler = () => resetIdleTimer();
    events.forEach(e => document.addEventListener(e, handler));
    return () => events.forEach(e => document.removeEventListener(e, handler));
  }, [resetIdleTimer]);

  useEffect(() => {
    if (screen === "status" && selected) {
      const poll = async () => {
        try {
          const res = await fetch(`${BASE}/api/kiosk/appointment/${selected.id}`);
          if (res.ok) {
            const data = await res.json();
            setLiveStatus(data.status);
          }
        } catch {}
      };
      poll();
      pollTimer.current = setInterval(poll, 30000);
      return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
    }
  }, [screen, selected]);

  const dialPhone = (digit: string) => {
    if (digit === "⌫") {
      setPhone(p => p.slice(0, -1));
    } else if (phone.length < 13) {
      setPhone(p => p + digit);
    }
    setError("");
  };

  const handleLookup = async () => {
    if (phone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/kiosk/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "No appointments found for this number.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPatient(data.patient);
      setAppointments(data.appointments);
      setScreen("appointments");
    } catch {
      setError("Unable to connect. Please ask staff for help.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAppointment = (appt: KioskAppointment) => {
    setSelected(appt);
    setScreen("confirm-checkin");
  };

  const handleCheckIn = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const now = new Date().toISOString();
      const res = await fetch(`${BASE}/api/appointments/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedInAt: now, status: "checked-in" }),
      });
      if (!res.ok) throw new Error("Check-in failed");
      const updated = await res.json();
      setSelected(s => s ? { ...s, ...updated } : s);
      setScreen("intake");
    } catch {
      setError("Check-in failed. Please ask a staff member for help.");
    } finally {
      setLoading(false);
    }
  };

  const handleIntakeSubmit = async () => {
    if (!selected || !patient) return;
    setLoading(true);
    setError("");
    try {
      const notesText = [
        intakeData.chiefComplaint ? `Chief complaint: ${intakeData.chiefComplaint}` : "",
        intakeData.currentMeds ? `Current medications: ${intakeData.currentMeds}` : "",
        intakeData.allergies ? `Allergies: ${intakeData.allergies}` : "",
        intakeData.newSymptoms ? `New symptoms: ${intakeData.newSymptoms}` : "",
      ].filter(Boolean).join("\n");

      await Promise.all([
        fetch(`${BASE}/api/appointments/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chiefComplaint: intakeData.chiefComplaint || undefined, notes: notesText }),
        }),
        fetch(`${BASE}/api/patients/${patient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(intakeData.allergies ? { history: { allergies: intakeData.allergies } } : {}),
          }),
        }),
      ]);
      setLiveStatus("checked-in");
      setScreen("status");
    } catch {
      setError("Could not save your details. You are still checked in.");
      setLiveStatus("checked-in");
      setScreen("status");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipIntake = () => {
    setLiveStatus("checked-in");
    setScreen("status");
  };

  const digits = ["1","2","3","4","5","6","7","8","9","+","0","⌫"];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "#f8fafc",
        userSelect: "none",
        touchAction: "manipulation",
      }}
      onPointerMove={resetIdleTimer}
    >
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700,
          }}>S</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>Saivie</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Patient Check-In Kiosk</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {screen !== "phone" && (
            <div style={{
              fontSize: 12, color: idleCountdown <= 20 ? "#fbbf24" : "rgba(255,255,255,0.4)",
              fontWeight: 500,
            }}>
              {idleCountdown <= 20 ? `↩ Resetting in ${idleCountdown}s` : "Touch anywhere to stay"}
            </div>
          )}
          <div style={{
            fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)",
          }}>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>

        {/* ── PHONE SCREEN ── */}
        {screen === "phone" && (
          <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: "#818cf8", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
              Welcome
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.5px" }}>
              Check in for your appointment
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: 36 }}>
              Enter the mobile number you registered with us
            </p>

            <div style={{
              background: "rgba(255,255,255,0.06)", border: "2px solid rgba(129,140,248,0.5)",
              borderRadius: 16, padding: "20px 24px", marginBottom: 20,
              fontSize: 32, fontWeight: 700, letterSpacing: 4, minHeight: 72,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: phone ? "#f8fafc" : "rgba(255,255,255,0.2)",
            }}>
              {phone || "+91 XXXXX XXXXX"}
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 10, padding: "10px 16px", marginBottom: 16,
                color: "#fca5a5", fontSize: 14, fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20,
            }}>
              {digits.map(d => (
                <button
                  key={d}
                  onClick={() => dialPhone(d)}
                  style={{
                    background: d === "⌫" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${d === "⌫" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: 14, padding: "22px 12px",
                    fontSize: d === "⌫" ? 20 : 26, fontWeight: 600,
                    color: d === "⌫" ? "#fca5a5" : "#f8fafc",
                    cursor: "pointer",
                    transition: "background 0.1s, transform 0.05s",
                  }}
                  onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)"; }}
                  onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={handleLookup}
              disabled={loading || phone.replace(/\D/g, "").length < 7}
              style={{
                width: "100%", padding: "20px", borderRadius: 16, border: "none",
                background: loading || phone.replace(/\D/g, "").length < 7
                  ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "#fff", fontSize: 18, fontWeight: 700, cursor: loading ? "wait" : "pointer",
                transition: "opacity 0.2s",
                boxShadow: "0 4px 24px rgba(99,102,241,0.4)",
              }}
            >
              {loading ? "Looking up…" : "Find My Appointment →"}
            </button>
          </div>
        )}

        {/* ── APPOINTMENTS SCREEN ── */}
        {screen === "appointments" && patient && (
          <div style={{ width: "100%", maxWidth: 640 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 13, color: "#818cf8", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                Today's Appointments
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
                Welcome, {patient.name.split(" ")[0]}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>
                Select your appointment to check in
              </p>
            </div>

            {appointments.length === 0 ? (
              <div style={{
                background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "40px 32px", textAlign: "center",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>
                  No appointments found for today. Please speak to a staff member.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {appointments.map(appt => (
                  <button
                    key={appt.id}
                    onClick={() => handleSelectAppointment(appt)}
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1.5px solid rgba(129,140,248,0.3)",
                      borderRadius: 18, padding: "24px 28px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      cursor: "pointer", color: "#f8fafc", textAlign: "left",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onPointerEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.18)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(129,140,248,0.7)"; }}
                    onPointerLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(129,140,248,0.3)"; }}
                  >
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{appt.time}</div>
                      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
                        {appt.type || "Consultation"}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                        with {appt.providerName}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        display: "inline-block", padding: "6px 14px", borderRadius: 20,
                        background: appt.checkedInAt ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.15)",
                        color: appt.checkedInAt ? "#6ee7b7" : "#fcd34d",
                        fontSize: 12, fontWeight: 600, marginBottom: 8,
                      }}>
                        {appt.checkedInAt ? "Already Checked In" : "Tap to Check In"}
                      </div>
                      <div style={{ fontSize: 24, color: "rgba(255,255,255,0.4)" }}>›</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={resetToHome}
              style={{
                marginTop: 24, width: "100%", padding: "14px", borderRadius: 12,
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer",
              }}
            >
              ← Go Back
            </button>
          </div>
        )}

        {/* ── CONFIRM CHECK-IN SCREEN ── */}
        {screen === "confirm-checkin" && selected && patient && (
          <div style={{ width: "100%", maxWidth: 520, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#818cf8", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
              Confirm Check-In
            </div>

            <div style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 24, padding: "32px", marginBottom: 24,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 800, margin: "0 auto 16px",
              }}>
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{patient.name}</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>Please confirm your details below</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, textAlign: "left" }}>
                {[
                  { label: "Time", value: selected.time },
                  { label: "Service", value: selected.type || "Consultation" },
                  { label: "Provider", value: selected.providerName },
                  { label: "Date", value: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" }) },
                ].map(item => (
                  <div key={item.label} style={{
                    background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px",
                  }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.15)", borderRadius: 10, padding: "10px 16px",
                color: "#fca5a5", fontSize: 14, marginBottom: 16,
              }}>{error}</div>
            )}

            <button
              onClick={handleCheckIn}
              disabled={loading}
              style={{
                width: "100%", padding: "20px", borderRadius: 16, border: "none",
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "#fff", fontSize: 18, fontWeight: 700, cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 24px rgba(99,102,241,0.4)", marginBottom: 12,
              }}
            >
              {loading ? "Checking you in…" : "✓ Confirm Check-In"}
            </button>
            <button
              onClick={() => setScreen("appointments")}
              style={{
                width: "100%", padding: "14px", borderRadius: 12,
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* ── INTAKE FORM SCREEN ── */}
        {screen === "intake" && selected && patient && (
          <div style={{ width: "100%", maxWidth: 600 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(16,185,129,0.2)", border: "2px solid #6ee7b7",
                fontSize: 26, marginBottom: 14,
              }}>✓</div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>You're checked in!</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>
                Please take a moment to complete a quick pre-visit form
              </p>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: "28px", marginBottom: 20,
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  { key: "chiefComplaint", label: "Main reason for today's visit", placeholder: "e.g. Lower back pain, follow-up for pregnancy…" },
                  { key: "currentMeds", label: "Current medications (if any)", placeholder: "e.g. Folic acid 5mg, Metformin 500mg…" },
                  { key: "allergies", label: "Known allergies", placeholder: "e.g. Penicillin, nuts, latex… or 'None'" },
                  { key: "newSymptoms", label: "Any new symptoms since your last visit?", placeholder: "e.g. Mild nausea, headaches, swelling… or 'None'" },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6, letterSpacing: "0.2px" }}>
                      {field.label}
                    </label>
                    <textarea
                      value={intakeData[field.key as keyof typeof intakeData]}
                      onChange={e => setIntakeData(d => ({ ...d, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={2}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10, padding: "12px 14px",
                        color: "#f8fafc", fontSize: 15, resize: "none",
                        outline: "none", fontFamily: "inherit",
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(129,140,248,0.7)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.15)", borderRadius: 10, padding: "10px 16px",
                color: "#fca5a5", fontSize: 14, marginBottom: 16,
              }}>{error}</div>
            )}

            <button
              onClick={handleIntakeSubmit}
              disabled={loading}
              style={{
                width: "100%", padding: "20px", borderRadius: 16, border: "none",
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "#fff", fontSize: 18, fontWeight: 700, cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 24px rgba(99,102,241,0.4)", marginBottom: 12,
              }}
            >
              {loading ? "Saving…" : "Submit & See My Status →"}
            </button>
            <button
              onClick={handleSkipIntake}
              style={{
                width: "100%", padding: "14px", borderRadius: 12,
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer",
              }}
            >
              Skip — Go to Status Screen
            </button>
          </div>
        )}

        {/* ── STATUS SCREEN ── */}
        {screen === "status" && selected && patient && (
          <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Your Appointment</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>
                Live status — refreshes every 30 seconds
              </p>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24, padding: "36px 32px", marginBottom: 24,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
                {selected.time} · {selected.type || "Consultation"}
              </div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>
                with {selected.providerName}
              </div>

              {/* Status pill */}
              <div style={{ marginBottom: 20 }}>
                {(() => {
                  const info = getStatusInfo(liveStatus);
                  return (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      padding: "14px 28px", borderRadius: 40,
                      background: `${info.color}20`,
                      border: `2px solid ${info.color}60`,
                    }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: info.color,
                        boxShadow: `0 0 8px ${info.color}`,
                        animation: "pulse 2s infinite",
                      }} />
                      <span style={{ fontSize: 17, fontWeight: 700, color: info.color }}>
                        {info.label}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Status timeline */}
              <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
                {[
                  { key: "checked-in", label: "Checked In" },
                  { key: "with-doctor", label: "With Doctor" },
                  { key: "completed", label: "Done" },
                ].map((step, idx) => {
                  const statusKey = (liveStatus || "").toLowerCase();
                  const isActive = statusKey === step.key || statusKey === step.key.replace("-", " ");
                  const isDone =
                    (step.key === "checked-in" && (statusKey === "with-doctor" || statusKey === "with doctor" || statusKey === "completed" || statusKey === "done")) ||
                    (step.key === "with-doctor" && (statusKey === "completed" || statusKey === "done"));
                  return (
                    <React.Fragment key={step.key}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: isDone ? "#10b981" : isActive ? "#6366f1" : "rgba(255,255,255,0.1)",
                          border: `2px solid ${isDone ? "#6ee7b7" : isActive ? "#818cf8" : "rgba(255,255,255,0.2)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 700, margin: "0 auto 6px",
                          color: isDone || isActive ? "#fff" : "rgba(255,255,255,0.3)",
                        }}>
                          {isDone ? "✓" : idx + 1}
                        </div>
                        <div style={{ fontSize: 11, color: isActive ? "#f8fafc" : "rgba(255,255,255,0.35)", fontWeight: isActive ? 600 : 400, maxWidth: 70 }}>
                          {step.label}
                        </div>
                      </div>
                      {idx < 2 && (
                        <div style={{
                          width: 48, height: 2, background: isDone ? "#10b981" : "rgba(255,255,255,0.1)",
                          marginTop: 13, alignSelf: "flex-start",
                        }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
              Please take a seat in the waiting area. You will be called when the doctor is ready.
            </p>

            <button
              onClick={resetToHome}
              style={{
                width: "100%", padding: "16px", borderRadius: 14,
                background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.5)", fontSize: 15, cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ← Done — New Patient
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        * { -webkit-tap-highlight-color: transparent; }
        textarea::placeholder { color: rgba(255,255,255,0.2); }
        textarea { caret-color: #818cf8; }
      `}</style>
    </div>
  );
}
