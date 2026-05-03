import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, User, ShieldCheck, Lock, Eye, EyeOff, AlertCircle, Loader2, Phone } from "lucide-react";
import calmGradient from "../assets/images/calm-gradient.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  // ── Staff passcode flow ──────────────────────────────────────────────────
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // OTP step for staff
  const [staffOtpRequired, setStaffOtpRequired] = useState(false);
  const [staffOtp, setStaffOtp] = useState("");
  const [staffMaskedPhone, setStaffMaskedPhone] = useState("");
  const [pendingPasscode, setPendingPasscode] = useState("");

  // ── Patient phone flow ───────────────────────────────────────────────────
  const [showPatientLogin, setShowPatientLogin] = useState(false);
  const [patientPhone, setPatientPhone] = useState("");
  const [patientError, setPatientError] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  // OTP step for patient
  const [patientOtpSent, setPatientOtpSent] = useState(false);
  const [patientOtp, setPatientOtp] = useState("");

  // ── Staff: step 1 — validate passcode → trigger OTP ─────────────────────
  const handlePasscodeSubmit = async () => {
    if (!passcode.trim()) { setError("Please enter your passcode"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      if (!res.ok) {
        setError("Invalid passcode. Please try again.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.otpRequired) {
        // Server sent OTP to staff phone; show OTP input
        setPendingPasscode(passcode.trim());
        setStaffMaskedPhone(data.phone || "");
        setStaffOtpRequired(true);
        setLoading(false);
        return;
      }
      // No phone on account — direct access (legacy)
      if (data.username) localStorage.setItem("staffUsername", data.username);
      if (data.provider) localStorage.setItem("clinicianProvider", JSON.stringify(data.provider));
      if (data.role === "clinician") setLocation("/clinician");
      else if (data.role === "staff") setLocation("/staff");
      else if (data.role === "owner") setLocation("/owner");
      else setError("Unknown role. Contact admin.");
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  // ── Staff: step 2 — verify OTP ───────────────────────────────────────────
  const handleStaffOtpSubmit = async () => {
    if (staffOtp.length !== 6) { setError("Please enter the 6-digit code"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: pendingPasscode, otp: staffOtp }),
      });
      if (!res.ok) {
        setError("Invalid or expired code. Please try again.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.username) localStorage.setItem("staffUsername", data.username);
      if (data.provider) localStorage.setItem("clinicianProvider", JSON.stringify(data.provider));
      if (data.role === "clinician") setLocation("/clinician");
      else if (data.role === "staff") setLocation("/staff");
      else if (data.role === "owner") setLocation("/owner");
      else setError("Unknown role. Contact admin.");
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  // ── Patient: step 1 — send OTP ───────────────────────────────────────────
  const handlePatientRequestOtp = async () => {
    const cleaned = patientPhone.replace(/[\s\-\(\)]/g, "");
    if (!cleaned || cleaned.length < 10) {
      setPatientError("Please enter your 10-digit phone number");
      return;
    }
    setPatientError("");
    setPatientLoading(true);
    try {
      const res = await fetch("/api/auth/patient-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPatientError(data.error || "Could not verify phone number.");
        setPatientLoading(false);
        return;
      }
      setPatientOtpSent(true);
    } catch {
      setPatientError("Connection error. Please try again.");
    }
    setPatientLoading(false);
  };

  // ── Patient: step 2 — verify OTP and log in ──────────────────────────────
  const handlePatientVerifyOtp = async () => {
    if (patientOtp.length !== 6) {
      setPatientError("Please enter the 6-digit code");
      return;
    }
    setPatientError("");
    setPatientLoading(true);
    try {
      const cleaned = patientPhone.replace(/[\s\-\(\)]/g, "");
      const res = await fetch("/api/auth/patient-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, otp: patientOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPatientError(data.error || "Verification failed.");
        setPatientLoading(false);
        return;
      }
      localStorage.setItem("patientUser", JSON.stringify(data.patient));
      setLocation("/patient");
    } catch {
      setPatientError("Connection error. Please try again.");
    }
    setPatientLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (staffOtpRequired) handleStaffOtpSubmit();
      else handlePasscodeSubmit();
    }
  };

  const handlePatientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (patientOtpSent) handlePatientVerifyOtp();
      else handlePatientRequestOtp();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      <div
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${calmGradient})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-serif text-foreground leading-tight mb-4">
              Understand <br/>
              <span className="italic text-primary">My Body</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-md">
              Bridging the gap between complex genomics and clear, daily life guidance.
            </p>
          </motion.div>
        </div>

        <div className="grid gap-6">
          {/* ── Patient Portal ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div
              className={`group bg-white/60 backdrop-blur-md border p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer ${
                showPatientLogin ? "border-primary/30 ring-2 ring-primary/10" : "border-white/50"
              }`}
              onClick={() => { if (!showPatientLogin) setShowPatientLogin(true); }}
              data-testid="link-patient-portal"
            >
              <div className="flex items-center gap-6">
                <div className="bg-primary/10 p-4 rounded-full group-hover:bg-primary/20 transition-colors">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif text-foreground group-hover:text-primary transition-colors">Patient Portal</h3>
                  <p className="text-muted-foreground">My insights, cycle map, and daily guide.</p>
                </div>
                {!showPatientLogin && (
                  <ArrowRight className="ml-auto w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                )}
              </div>

              <AnimatePresence>
                {showPatientLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-5 border-t border-primary/10 space-y-3" onClick={(e) => e.stopPropagation()}>
                      {!patientOtpSent ? (
                        <>
                          <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                            <Phone className="w-4 h-4 text-primary" />
                            Enter your registered phone number
                          </p>
                          <Input
                            type="tel"
                            value={patientPhone}
                            onChange={(e) => { setPatientPhone(e.target.value); setPatientError(""); }}
                            onKeyDown={handlePatientKeyDown}
                            placeholder="10-digit phone number"
                            className="h-12 text-lg tracking-wider bg-white border-slate-200 focus:border-primary focus:ring-primary/20"
                            autoFocus
                            maxLength={13}
                            data-testid="input-patient-phone"
                          />
                          {patientError && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-500 flex items-center gap-1.5"
                              data-testid="text-patient-error"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              {patientError}
                            </motion.p>
                          )}
                          <Button
                            onClick={handlePatientRequestOtp}
                            disabled={patientLoading}
                            className="w-full h-11 bg-primary hover:bg-primary/90 text-white"
                            data-testid="button-patient-login"
                          >
                            {patientLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>Send Code <ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-slate-600 font-medium">
                            Enter the 6-digit code sent to your WhatsApp
                          </p>
                          <Input
                            type="number"
                            value={patientOtp}
                            onChange={(e) => { setPatientOtp(e.target.value.slice(0, 6)); setPatientError(""); }}
                            onKeyDown={handlePatientKeyDown}
                            placeholder="000000"
                            className="h-12 text-2xl tracking-widest text-center bg-white border-slate-200 focus:border-primary focus:ring-primary/20"
                            autoFocus
                            data-testid="input-patient-otp"
                          />
                          {patientError && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-500 flex items-center gap-1.5"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              {patientError}
                            </motion.p>
                          )}
                          <Button
                            onClick={handlePatientVerifyOtp}
                            disabled={patientLoading || patientOtp.length !== 6}
                            className="w-full h-11 bg-primary hover:bg-primary/90 text-white"
                            data-testid="button-patient-verify"
                          >
                            {patientLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>Verify & Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                          </Button>
                          <button
                            onClick={() => { setPatientOtpSent(false); setPatientOtp(""); setPatientError(""); }}
                            className="text-xs text-slate-400 hover:text-slate-600 w-full text-center"
                          >
                            ← Change number
                          </button>
                          <p className="text-xs text-slate-400 text-center">Code expires in 5 minutes.</p>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Clinician & Staff Portal ───────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div
              className={`group bg-white/80 backdrop-blur-md border p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer ${
                showPasscode ? "border-blue-300 ring-2 ring-blue-100" : "border-blue-100 hover:border-blue-300"
              }`}
              onClick={() => { if (!showPasscode) setShowPasscode(true); }}
              data-testid="link-staff-clinician-portal"
            >
              <div className="flex items-center gap-6">
                <div className="bg-blue-50 p-4 rounded-full group-hover:bg-blue-100 transition-colors">
                  <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-serif text-blue-900 group-hover:text-blue-700 transition-colors">
                    Clinician & Staff Portal
                  </h3>
                  <p className="text-slate-500">Secure access for healthcare team.</p>
                </div>
                {!showPasscode && (
                  <Lock className="ml-auto w-5 h-5 text-slate-400" />
                )}
              </div>

              <AnimatePresence>
                {showPasscode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-5 border-t border-blue-100 space-y-3" onClick={(e) => e.stopPropagation()}>
                      {!staffOtpRequired ? (
                        <>
                          <p className="text-sm text-slate-600 font-medium">Enter your passcode to continue</p>
                          <div className="relative">
                            <Input
                              type={showPin ? "text" : "password"}
                              value={passcode}
                              onChange={(e) => { setPasscode(e.target.value); setError(""); }}
                              onKeyDown={handleKeyDown}
                              placeholder="Enter passcode"
                              className="pr-10 h-12 text-lg tracking-widest bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-200"
                              autoFocus
                              data-testid="input-passcode"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPin(!showPin)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              data-testid="button-toggle-pin"
                            >
                              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {error && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-500 flex items-center gap-1.5"
                              data-testid="text-passcode-error"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              {error}
                            </motion.p>
                          )}
                          <Button
                            onClick={handlePasscodeSubmit}
                            disabled={loading}
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
                            data-testid="button-passcode-submit"
                          >
                            {loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-slate-600 font-medium">
                            Enter the 6-digit code sent to <strong>{staffMaskedPhone || "your registered phone"}</strong> via WhatsApp
                          </p>
                          <Input
                            type="number"
                            value={staffOtp}
                            onChange={(e) => { setStaffOtp(e.target.value.slice(0, 6)); setError(""); }}
                            onKeyDown={handleKeyDown}
                            placeholder="000000"
                            className="h-12 text-2xl tracking-widest text-center bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-200"
                            autoFocus
                            data-testid="input-staff-otp"
                          />
                          {error && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-500 flex items-center gap-1.5"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              {error}
                            </motion.p>
                          )}
                          <Button
                            onClick={handleStaffOtpSubmit}
                            disabled={loading || staffOtp.length !== 6}
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
                            data-testid="button-staff-otp-submit"
                          >
                            {loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                          </Button>
                          <button
                            onClick={() => { setStaffOtpRequired(false); setStaffOtp(""); setError(""); setPasscode(""); }}
                            className="text-xs text-slate-400 hover:text-slate-600 w-full text-center"
                          >
                            ← Back to passcode
                          </button>
                          <p className="text-xs text-slate-400 text-center">Code expires in 5 minutes.</p>
                        </>
                      )}
                      {!staffOtpRequired && (
                        <p className="text-xs text-slate-400 text-center">
                          Your role determines which portal opens.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
