import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Dna, Check, Sparkles, Lock, X } from "lucide-react";

const PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$19.99",
    period: "/month",
    priceNote: "Billed monthly",
    badge: null,
  },
  {
    id: "annual",
    label: "Annual",
    price: "$9.99",
    period: "/month",
    priceNote: "Billed $119.88/year",
    badge: "Save 50%",
  },
];

const FEATURES = [
  "Full genome analysis (VCF, 23andMe, AncestryDNA)",
  "Health Risk Assessment — 50+ conditions",
  "Disease Predisposition Screening",
  "Pharmacogenomics Drug Response Report",
  "Traits & Ancestry Breakdown",
  "Clinician-ready PDF Report",
  "Unlimited re-analyses",
  "Shared with your Saivie care team",
];

export default function Paywall() {
  const [selected, setSelected] = useState("annual");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  function handleSubscribe() {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("saiviegene_subscribed", "true");
      localStorage.setItem("saiviegene_plan", selected);
      setLoading(false);
      navigate("/upload");
    }, 1200);
  }

  function handleRestore() {
    const prev = localStorage.getItem("saiviegene_plan");
    if (prev) {
      localStorage.setItem("saiviegene_subscribed", "true");
      navigate("/dashboard");
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-96" style={{ background: "radial-gradient(ellipse at 50% -10%, hsl(44 87% 55% / 0.12), transparent 65%)" }} />
      </div>

      <div className="px-6 pt-14 pb-2 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5">
          <Dna className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold tracking-wider text-foreground/70">SAIVIEGENE</span>
        </div>
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 pt-6 relative z-10 flex-1 overflow-y-auto pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold tracking-wider text-primary uppercase">Premium Access</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Unlock Your</h1>
        <h1 className="text-3xl font-bold gold-text mb-6">Genetic Blueprint</h1>

        <div className="flex gap-3 mb-6">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className="flex-1 rounded-2xl p-4 border-2 transition-all duration-200 text-left relative overflow-hidden"
              style={{
                borderColor: selected === plan.id ? "hsl(44 87% 55%)" : "hsl(225 25% 18%)",
                background: selected === plan.id ? "hsl(44 87% 55% / 0.08)" : "hsl(225 35% 11%)",
              }}
            >
              {plan.badge && (
                <div className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg, hsl(44 87% 55%), hsl(38 90% 45%))", color: "hsl(225 35% 8%)" }}>
                  {plan.badge}
                </div>
              )}
              <div className="text-xs font-semibold text-muted-foreground mb-1">{plan.label}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{plan.priceNote}</div>
              {selected === plan.id && (
                <div className="absolute top-3 left-3 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "hsl(44 87% 55%)" }}>
                  <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-4 mb-6 space-y-2.5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3"
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "hsl(44 87% 55% / 0.15)" }}>
                <Check className="w-3 h-3 text-primary" strokeWidth={2.5} />
              </div>
              <span className="text-sm text-foreground/80">{f}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-12 relative z-10 bg-background pt-3 border-t border-card-border">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 mb-3 active:scale-[0.98] transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, hsl(44 87% 55%), hsl(38 90% 45%))", color: "hsl(225 35% 8%)" }}
        >
          {loading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="w-5 h-5" />
            </motion.div>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Subscribe Now
            </>
          )}
        </button>
        <button onClick={handleRestore} className="w-full text-center text-xs text-muted-foreground py-1">
          Restore Purchase
        </button>
        <p className="text-center text-xs text-muted-foreground/50 mt-2">
          Cancel anytime · Secure payment · HIPAA compliant
        </p>
      </div>
    </div>
  );
}
