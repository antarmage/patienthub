import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { Dna } from "lucide-react";

const STEPS = [
  "Parsing genome file…",
  "Extracting SNP variants…",
  "Mapping genetic markers…",
  "Analysing health risks…",
  "Computing pharmacogenomics…",
  "Generating trait profile…",
  "Building your report…",
];

export default function Processing() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, navigate] = useLocation();
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 1.2, 100);
        return next;
      });
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    }, 500);

    let polling: ReturnType<typeof setInterval>;

    async function poll() {
      try {
        const token = sessionStorage.getItem("saiviegene_token");
        const res = await fetch(`/api/genome/status/${jobId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "done") {
            clearInterval(interval);
            clearInterval(polling);
            setProgress(100);
            setTimeout(() => navigate("/dashboard"), 800);
          }
        }
      } catch (_) {}
    }

    polling = setInterval(poll, 2000);
    poll();

    return () => {
      clearInterval(interval);
      clearInterval(polling);
    };
  }, [jobId, navigate]);

  const orbits = [80, 120, 160];

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center relative overflow-hidden px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 bottom-0" style={{ background: "radial-gradient(ellipse at 50% 40%, hsl(44 87% 55% / 0.06), transparent 65%)" }} />
      </div>

      <div className="flex items-center gap-1.5 absolute top-14 left-6">
        <Dna className="w-5 h-5 text-primary" />
        <span className="text-sm font-semibold tracking-wider text-foreground/70">SAIVIEGENE</span>
      </div>

      <div className="relative flex items-center justify-center mb-12">
        {orbits.map((size, i) => (
          <motion.div
            key={size}
            className="absolute rounded-full border"
            style={{
              width: size,
              height: size,
              borderColor: `hsl(44 87% 55% / ${0.12 + i * 0.06})`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8 + i * 4, repeat: Infinity, ease: "linear", repeatType: i % 2 === 0 ? "loop" : "reverse" }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: 8,
                height: 8,
                background: "hsl(44 87% 55%)",
                top: -4,
                left: "50%",
                transform: "translateX(-50%)",
                boxShadow: "0 0 12px hsl(44 87% 55%)",
              }}
            />
          </motion.div>
        ))}

        <motion.div
          className="w-20 h-20 rounded-2xl flex items-center justify-center animate-pulse-glow"
          style={{ background: "hsl(44 87% 55% / 0.12)", border: "1px solid hsl(44 87% 55% / 0.3)" }}
        >
          <Dna className="w-10 h-10 text-primary" strokeWidth={1.5} />
        </motion.div>
      </div>

      <div className="w-full max-w-xs text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Analysing Your DNA</h2>
        <p className="text-sm text-muted-foreground mb-6">This takes 30–60 seconds. Please don't close this page.</p>

        <div className="w-full bg-muted rounded-full h-2 mb-3 overflow-hidden">
          <motion.div
            className="h-full rounded-full progress-bar"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mb-4">
          <span>{Math.round(progress)}%</span>
          <span>Complete</span>
        </div>

        <motion.p
          key={stepIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-primary font-medium"
        >
          {STEPS[stepIdx]}
        </motion.p>
      </div>

      <div className="absolute bottom-16 left-0 right-0 flex justify-center">
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-full"
              style={{ background: "hsl(44 87% 55%)" }}
              animate={{ height: [8, 20, 8] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
