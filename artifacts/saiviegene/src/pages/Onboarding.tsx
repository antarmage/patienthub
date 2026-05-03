import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Dna, ShieldCheck, FlaskConical, ChevronRight } from "lucide-react";

const slides = [
  {
    icon: Dna,
    title: "Your DNA,\nDecoded",
    subtitle: "Upload your genome file and unlock precision health insights powered by advanced genomic analysis.",
    color: "from-[#0a0e1a] via-[#0d1428] to-[#0a0e1a]",
    iconBg: "hsl(44 87% 55% / 0.12)",
    iconColor: "hsl(44 87% 55%)",
  },
  {
    icon: ShieldCheck,
    title: "Know Your\nRisks Early",
    subtitle: "Discover genetic predispositions to health conditions before symptoms appear. Knowledge is your best prevention.",
    color: "from-[#0a0e1a] via-[#0e1220] to-[#0a0e1a]",
    iconBg: "hsl(142 70% 45% / 0.12)",
    iconColor: "hsl(142 70% 45%)",
  },
  {
    icon: FlaskConical,
    title: "Personalised\nMedicine",
    subtitle: "Understand how your genes affect medication response, nutrition, and fitness — tailored guidance just for you.",
    color: "from-[#0a0e1a] via-[#120e1e] to-[#0a0e1a]",
    iconBg: "hsl(260 70% 60% / 0.12)",
    iconColor: "hsl(260 70% 65%)",
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [, navigate] = useLocation();

  const slide = slides[current];
  const Icon = slide.icon;
  const isLast = current === slides.length - 1;

  function handleNext() {
    if (isLast) {
      localStorage.setItem("saiviegene_onboarded", "true");
      const token = localStorage.getItem("saiviegene_token");
      if (token) {
        const subscribed = localStorage.getItem("saiviegene_subscribed") === "true";
        navigate(subscribed ? "/dashboard" : "/paywall");
      } else {
        navigate("/auth");
      }
    } else {
      setCurrent((c) => c + 1);
    }
  }

  function handleSkip() {
    localStorage.setItem("saiviegene_onboarded", "true");
    const token = localStorage.getItem("saiviegene_token");
    if (token) {
      const subscribed = localStorage.getItem("saiviegene_subscribed") === "true";
      navigate(subscribed ? "/dashboard" : "/paywall");
    } else {
      navigate("/auth");
    }
  }

  return (
    <div className={`min-h-dvh bg-gradient-to-b ${slide.color} flex flex-col relative overflow-hidden`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-5"
          style={{ background: slide.iconColor, filter: "blur(60px)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-5"
          style={{ background: slide.iconColor, filter: "blur(80px)" }}
        />
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: 4 + (i % 3) * 3,
              height: 4 + (i % 3) * 3,
              background: slide.iconColor,
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
            }}
            animate={{ y: [0, -12, 0], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between px-6 pt-14 pb-4 relative z-10">
        <div className="flex items-center gap-1.5">
          <Dna className="w-5 h-5" style={{ color: "hsl(44 87% 55%)" }} />
          <span className="text-sm font-semibold tracking-wider text-white/70">SAIVIEGENE</span>
        </div>
        {current < slides.length - 1 && (
          <button onClick={handleSkip} className="text-sm text-white/40 hover:text-white/70 transition-colors">
            Skip
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              className="w-28 h-28 rounded-3xl flex items-center justify-center mb-10 animate-float"
              style={{ background: slide.iconBg, border: `1px solid ${slide.iconColor}22` }}
              animate={{ boxShadow: [`0 0 30px ${slide.iconColor}22`, `0 0 60px ${slide.iconColor}44`, `0 0 30px ${slide.iconColor}22`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Icon className="w-14 h-14" style={{ color: slide.iconColor }} strokeWidth={1.5} />
            </motion.div>

            <h1 className="text-4xl font-bold text-white leading-tight mb-5 whitespace-pre-line">
              {slide.title}
            </h1>
            <p className="text-base text-white/55 leading-relaxed max-w-xs">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-8 pb-16 flex flex-col gap-6 relative z-10">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                background: i === current ? "hsl(44 87% 55%)" : "hsl(225 25% 25%)",
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, hsl(44 87% 55%), hsl(38 90% 45%))", color: "hsl(225 35% 8%)" }}
        >
          {isLast ? "Get Started" : "Continue"}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
