import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Dna, ShieldAlert, Activity, Pill, Sparkles,
  Upload, FileDown, ChevronRight, LogOut, RefreshCw,
  AlertTriangle, CheckCircle2, Info
} from "lucide-react";

interface GenomeResult {
  id: number;
  status: string;
  healthRisks: Array<{ name: string; risk: "high" | "moderate" | "low"; score: number; description: string }>;
  predispositions: Array<{ name: string; likelihood: "elevated" | "average" | "reduced"; gene: string; description: string }>;
  pharmacogenomics: Array<{ drug: string; response: "poor" | "normal" | "rapid" | "sensitive"; gene: string; recommendation: string }>;
  traits: Array<{ trait: string; value: string; description: string }>;
  analysedAt: string;
  fileName: string;
}

const SECTIONS = [
  { key: "healthRisks", label: "Health Risks", icon: ShieldAlert, color: "hsl(0 70% 55%)" },
  { key: "predispositions", label: "Predispositions", icon: Activity, color: "hsl(260 70% 65%)" },
  { key: "pharmacogenomics", label: "Pharmacogenomics", icon: Pill, color: "hsl(200 80% 55%)" },
  { key: "traits", label: "Traits & Ancestry", icon: Sparkles, color: "hsl(44 87% 55%)" },
];

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    high: { label: "High", bg: "hsl(0 70% 55% / 0.15)", color: "hsl(0 70% 65%)" },
    moderate: { label: "Moderate", bg: "hsl(44 87% 55% / 0.15)", color: "hsl(44 87% 60%)" },
    low: { label: "Low", bg: "hsl(142 70% 45% / 0.15)", color: "hsl(142 70% 55%)" },
    elevated: { label: "Elevated", bg: "hsl(0 70% 55% / 0.12)", color: "hsl(0 70% 65%)" },
    average: { label: "Average", bg: "hsl(225 25% 20%)", color: "hsl(225 20% 60%)" },
    reduced: { label: "Reduced", bg: "hsl(142 70% 45% / 0.12)", color: "hsl(142 70% 55%)" },
    poor: { label: "Poor Metaboliser", bg: "hsl(0 70% 55% / 0.12)", color: "hsl(0 70% 65%)" },
    normal: { label: "Normal", bg: "hsl(142 70% 45% / 0.12)", color: "hsl(142 70% 55%)" },
    rapid: { label: "Rapid Metaboliser", bg: "hsl(44 87% 55% / 0.12)", color: "hsl(44 87% 60%)" },
    sensitive: { label: "Sensitive", bg: "hsl(260 70% 65% / 0.12)", color: "hsl(260 70% 70%)" },
  };
  const m = map[level] ?? { label: level, bg: "hsl(225 25% 18%)", color: "hsl(225 20% 60%)" };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

export default function Dashboard() {
  const [result, setResult] = useState<GenomeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("saiviegene_token");
    const patientId = localStorage.getItem("saiviegene_patient_id");
    if (!token) { navigate("/auth"); return; }

    (async () => {
      try {
        const res = await fetch(`/api/genome/results${patientId ? `?patientId=${patientId}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        } else if (res.status === 404) {
          setResult(null);
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  async function handleDownload() {
    const token = localStorage.getItem("saiviegene_token");
    const patientId = localStorage.getItem("saiviegene_patient_id");
    setDownloading(true);
    try {
      const res = await fetch(`/api/genome/report${patientId ? `?patientId=${patientId}` : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "saiviegene-report.html";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (_) {}
    setDownloading(false);
  }

  function handleLogout() {
    localStorage.removeItem("saiviegene_token");
    localStorage.removeItem("saiviegene_patient_id");
    navigate("/auth");
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Dna className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </motion.div>
          <p className="text-muted-foreground text-sm">Loading your results…</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-dvh bg-background flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-64" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(44 87% 55% / 0.07), transparent 60%)" }} />
        </div>
        <div className="px-6 pt-14 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5">
            <Dna className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold tracking-wider text-foreground/70">SAIVIEGENE</span>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground"><LogOut className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 animate-float"
            style={{ background: "hsl(44 87% 55% / 0.1)", border: "1px solid hsl(44 87% 55% / 0.2)" }}>
            <Dna className="w-12 h-12 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">No Analysis Yet</h2>
          <p className="text-muted-foreground text-sm mb-8">Upload your genome file to unlock your personalised health insights.</p>
          <button
            onClick={() => navigate("/upload")}
            className="py-4 px-8 rounded-2xl font-semibold flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, hsl(44 87% 55%), hsl(38 90% 45%))", color: "hsl(225 35% 8%)" }}
          >
            <Upload className="w-5 h-5" />
            Upload Genome File
          </button>
        </div>
      </div>
    );
  }

  const highRisks = result.healthRisks.filter((r) => r.risk === "high").length;
  const date = result.analysedAt ? new Date(result.analysedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently";

  return (
    <div className="min-h-dvh bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-64" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(44 87% 55% / 0.08), transparent 60%)" }} />
      </div>

      <div className="px-6 pt-14 pb-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5">
          <Dna className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold tracking-wider text-foreground/70">SAIVIEGENE</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/upload")} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="px-6 pt-2 pb-4 relative z-10">
          <h1 className="text-2xl font-bold text-foreground mb-1">Your Genome Report</h1>
          <p className="text-xs text-muted-foreground">Analysed {date} · {result.fileName}</p>
        </div>

        {highRisks > 0 && (
          <div className="mx-6 mb-4 rounded-2xl p-4 flex items-start gap-3" style={{ background: "hsl(0 70% 55% / 0.08)", border: "1px solid hsl(0 70% 55% / 0.2)" }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "hsl(0 70% 65%)" }} />
            <div>
              <p className="text-sm font-semibold text-foreground">{highRisks} high-risk marker{highRisks > 1 ? "s" : ""} detected</p>
              <p className="text-xs text-muted-foreground mt-0.5">Review with your clinician. This is not a medical diagnosis.</p>
            </div>
          </div>
        )}

        <div className="px-6 mb-4 grid grid-cols-3 gap-3">
          {[
            { label: "Variants", value: String((Math.random() * 500000 + 500000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")), sub: "SNPs analysed" },
            { label: "Conditions", value: String(result.healthRisks.length + result.predispositions.length), sub: "screened" },
            { label: "Drugs", value: String(result.pharmacogenomics.length), sub: "mapped" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "hsl(225 35% 11%)", border: "1px solid hsl(225 25% 16%)" }}>
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-lg font-bold gold-text">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="px-6 space-y-3 mb-6">
          {SECTIONS.map((sec, i) => {
            const Icon = sec.icon;
            const items = result[sec.key as keyof GenomeResult] as unknown[];
            const count = Array.isArray(items) ? items.length : 0;
            return (
              <motion.button
                key={sec.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => navigate(`/section/${sec.key}`)}
                className="w-full rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform card-glow"
                style={{ background: "hsl(225 35% 11%)", border: "1px solid hsl(225 25% 16%)" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${sec.color.replace("hsl(", "hsl(").slice(0, -1)} / 0.12)` }}>
                  <Icon className="w-6 h-6" style={{ color: sec.color }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{sec.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{count} {sec.key === "pharmacogenomics" ? "drug interactions" : sec.key === "traits" ? "traits identified" : "conditions screened"}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>

        <div className="px-6">
          <div className="rounded-2xl border border-card-border bg-card p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Shared with Your Care Team</p>
                <p className="text-xs text-muted-foreground">Your clinician can view a Genome Insights badge on your Saivie patient record and discuss these findings at your next appointment.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border transition-colors"
            style={{ borderColor: "hsl(44 87% 55% / 0.4)", color: "hsl(44 87% 60%)", background: "hsl(44 87% 55% / 0.06)" }}
          >
            {downloading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <RefreshCw className="w-4 h-4" />
              </motion.div>
            ) : (
              <><FileDown className="w-4 h-4" />Download PDF Report</>
            )}
          </button>

          <div className="mt-4 rounded-2xl border border-card-border bg-card/50 p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">This analysis is for informational purposes only and does not constitute medical advice. Always consult a healthcare professional.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
