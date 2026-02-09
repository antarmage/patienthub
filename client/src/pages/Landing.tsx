import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, User, ShieldCheck, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import calmGradient from "../assets/images/calm-gradient.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasscodeSubmit = async () => {
    if (!passcode.trim()) {
      setError("Please enter your passcode");
      return;
    }
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
      if (data.username) {
        localStorage.setItem("staffUsername", data.username);
      }
      if (data.role === "clinician") {
        setLocation("/clinician");
      } else if (data.role === "staff") {
        setLocation("/staff");
      } else {
        setError("Unknown role. Contact admin.");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handlePasscodeSubmit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${calmGradient})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Link href="/patient">
              <div className="group bg-white/60 backdrop-blur-md border border-white/50 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer flex items-center gap-6" data-testid="link-patient-portal">
                <div className="bg-primary/10 p-4 rounded-full group-hover:bg-primary/20 transition-colors">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif text-foreground group-hover:text-primary transition-colors">Patient Portal</h3>
                  <p className="text-muted-foreground">My insights, cycle map, and daily guide.</p>
                </div>
                <ArrowRight className="ml-auto w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div
              className={`group bg-white/80 backdrop-blur-md border p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer ${
                showPasscode ? 'border-blue-300 ring-2 ring-blue-100' : 'border-blue-100 hover:border-blue-300'
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
                          <>
                            Sign In
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-slate-400 text-center">
                        Your role determines which portal opens.
                      </p>
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
