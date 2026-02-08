import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, User, Users, Stethoscope } from "lucide-react";
// Import the generated background image
import calmGradient from "../assets/images/calm-gradient.png";

export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Background Image Layer */}
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
              <div className="group bg-white/60 backdrop-blur-md border border-white/50 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer flex items-center gap-6">
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
            <Link href="/clinician">
              <div className="group bg-white/80 backdrop-blur-md border border-blue-100 p-8 rounded-2xl shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer flex items-center gap-6">
                <div className="bg-blue-50 p-4 rounded-full group-hover:bg-blue-100 transition-colors">
                  <Stethoscope className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif text-blue-900 group-hover:text-blue-700 transition-colors">Clinician Portal</h3>
                  <p className="text-slate-500">Decision support & risk analysis.</p>
                </div>
                <ArrowRight className="ml-auto w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Link href="/staff">
              <div className="group bg-white/60 backdrop-blur-md border border-purple-100 p-8 rounded-2xl shadow-sm hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer flex items-center gap-6">
                <div className="bg-purple-50 p-4 rounded-full group-hover:bg-purple-100 transition-colors">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif text-purple-900 group-hover:text-purple-700 transition-colors">Staff Portal</h3>
                  <p className="text-slate-500">Care team & specialist access.</p>
                </div>
                <ArrowRight className="ml-auto w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
