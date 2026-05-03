import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Dna, Phone, ArrowLeft, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = BASE.startsWith("/saiviegene") ? "" : "";

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

type Step = "phone" | "otp";

export default function Auth() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  async function handleSendOtp() {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 9) { setError("Please enter a valid phone number"); return; }
    setError("");
    setLoading(true);
    try {
      await apiPost("/api/mobile/auth/request", { phone: `+${cleaned}` });
      setStep("otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length < 4) { setError("Enter the verification code"); return; }
    setError("");
    setLoading(true);
    try {
      const cleaned = phone.replace(/\D/g, "");
      const data = await apiPost("/api/mobile/auth/login", { phone: `+${cleaned}`, otp });
      localStorage.setItem("saiviegene_token", data.mobileToken);
      localStorage.setItem("saiviegene_patient_id", String(data.patient?.id ?? data.patientId ?? ""));
      const subscribed = localStorage.getItem("saiviegene_subscribed") === "true";
      navigate(subscribed ? "/dashboard" : "/paywall");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-80 opacity-30" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(44 87% 55% / 0.15), transparent 70%)" }} />
      </div>

      <div className="px-6 pt-14 pb-4 flex items-center gap-3 relative z-10">
        {step === "otp" && (
          <button onClick={() => setStep("phone")} className="w-10 h-10 rounded-xl flex items-center justify-center bg-card border border-card-border">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <Dna className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold tracking-wider text-foreground/70">SAIVIEGENE</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 relative z-10">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: step === "otp" ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "hsl(44 87% 55% / 0.12)", border: "1px solid hsl(44 87% 55% / 0.2)" }}>
            <Phone className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {step === "phone" ? "Sign In" : "Verify Code"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {step === "phone"
              ? "Enter your phone number to access your genome insights"
              : `We sent a 6-digit code to +${phone.replace(/\D/g, "")}`}
          </p>

          {step === "phone" ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground/70 mb-2 block">Phone Number</label>
                <div className="flex items-center gap-2 bg-card border border-card-border rounded-2xl px-4 py-4 focus-within:border-primary/60 transition-colors">
                  <span className="text-muted-foreground text-sm">+</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="1 234 567 8900"
                    className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-base"
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    autoFocus
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground/70 mb-2 block">Verification Code</label>
                <input
                  type="number"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-card border border-card-border rounded-2xl px-4 py-4 text-foreground placeholder-muted-foreground outline-none text-2xl tracking-widest text-center focus:border-primary/60 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  autoFocus
                />
              </div>
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      </div>

      <div className="px-6 pb-16 relative z-10">
        <button
          onClick={step === "phone" ? handleSendOtp : handleVerifyOtp}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, hsl(44 87% 55%), hsl(38 90% 45%))", color: "hsl(225 35% 8%)" }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            step === "phone" ? "Send Code" : "Verify & Continue"
          )}
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to SaivieGene's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
