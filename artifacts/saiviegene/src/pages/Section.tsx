import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert, Activity, Pill, Sparkles, Dna } from "lucide-react";

interface GenomeResult {
  healthRisks: Array<{ name: string; risk: string; score: number; description: string }>;
  predispositions: Array<{ name: string; likelihood: string; gene: string; description: string }>;
  pharmacogenomics: Array<{ drug: string; response: string; gene: string; recommendation: string }>;
  traits: Array<{ trait: string; value: string; description: string }>;
}

const META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  healthRisks: { label: "Health Risks", Icon: ShieldAlert, color: "hsl(0 70% 55%)" },
  predispositions: { label: "Disease Predispositions", Icon: Activity, color: "hsl(260 70% 65%)" },
  pharmacogenomics: { label: "Pharmacogenomics", Icon: Pill, color: "hsl(200 80% 55%)" },
  traits: { label: "Traits & Ancestry", Icon: Sparkles, color: "hsl(44 87% 55%)" },
};

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    high: { bg: "hsl(0 70% 55% / 0.15)", color: "hsl(0 70% 65%)", label: "High Risk" },
    moderate: { bg: "hsl(44 87% 55% / 0.15)", color: "hsl(44 87% 60%)", label: "Moderate" },
    low: { bg: "hsl(142 70% 45% / 0.15)", color: "hsl(142 70% 55%)", label: "Low Risk" },
    elevated: { bg: "hsl(0 70% 55% / 0.12)", color: "hsl(0 70% 65%)", label: "Elevated" },
    average: { bg: "hsl(225 25% 20%)", color: "hsl(225 20% 60%)", label: "Average" },
    reduced: { bg: "hsl(142 70% 45% / 0.12)", color: "hsl(142 70% 55%)", label: "Reduced" },
    poor: { bg: "hsl(0 70% 55% / 0.12)", color: "hsl(0 70% 65%)", label: "Poor Metaboliser" },
    normal: { bg: "hsl(142 70% 45% / 0.12)", color: "hsl(142 70% 55%)", label: "Normal" },
    rapid: { bg: "hsl(44 87% 55% / 0.12)", color: "hsl(44 87% 60%)", label: "Rapid Metaboliser" },
    sensitive: { bg: "hsl(260 70% 65% / 0.12)", color: "hsl(260 70% 70%)", label: "Sensitive" },
  };
  const m = map[level] ?? { bg: "hsl(225 25% 18%)", color: "hsl(225 20% 60%)", label: level };
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-2">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(score, 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

export default function Section() {
  const { key } = useParams<{ key: string }>();
  const [, navigate] = useLocation();
  const [result, setResult] = useState<GenomeResult | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("saiviegene_token");
    const patientId = localStorage.getItem("saiviegene_patient_id");
    (async () => {
      try {
        const res = await fetch(`/api/genome/results${patientId ? `?patientId=${patientId}` : ""}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setResult(await res.json());
      } catch (_) {}
    })();
  }, []);

  const meta = META[key ?? ""] ?? { label: key, Icon: Dna, color: "hsl(44 87% 55%)" };
  const Icon = meta.Icon;

  const items: unknown[] = result ? (result[key as keyof GenomeResult] as unknown[] ?? []) : [];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="px-6 pt-14 pb-4 flex items-center gap-3 sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-card-border">
        <button onClick={() => navigate("/dashboard")} className="w-10 h-10 rounded-xl flex items-center justify-center bg-card border border-card-border">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${meta.color.slice(0, -1)} / 0.12)` }}>
            <Icon className="w-4 h-4" style={{ color: meta.color }} strokeWidth={1.5} />
          </div>
          <h1 className="text-lg font-bold text-foreground">{meta.label}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {!result ? (
          [...Array(4)].map((_, i) => <div key={i} className="rounded-2xl h-24 shimmer" />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${meta.color.slice(0, -1)} / 0.1)` }}>
              <Icon className="w-8 h-8" style={{ color: meta.color }} strokeWidth={1.5} />
            </div>
            <p className="text-foreground font-semibold mb-2">No data available</p>
            <p className="text-muted-foreground text-sm">Upload a genome file to see results here.</p>
          </div>
        ) : (
          items.map((item: unknown, i: number) => {
            const it = item as Record<string, string | number>;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl p-4"
                style={{ background: "hsl(225 35% 11%)", border: "1px solid hsl(225 25% 16%)" }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-foreground text-sm flex-1">
                    {(it.name ?? it.drug ?? it.trait) as string}
                  </p>
                  <RiskBadge level={(it.risk ?? it.likelihood ?? it.response) as string} />
                </div>

                {it.score !== undefined && (
                  <ScoreBar score={Number(it.score)} color={Number(it.score) >= 70 ? "hsl(0 70% 55%)" : Number(it.score) >= 40 ? "hsl(44 87% 55%)" : "hsl(142 70% 45%)"} />
                )}

                {it.gene && (
                  <p className="text-xs text-primary mt-2 font-mono">Gene: {it.gene as string}</p>
                )}

                {it.value && (
                  <p className="text-sm text-foreground/80 mt-1">{it.value as string}</p>
                )}

                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {(it.description ?? it.recommendation) as string}
                </p>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
