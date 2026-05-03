import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Dna, Upload as UploadIcon, FileText, CheckCircle2, AlertCircle, ChevronRight, Loader2, LogOut } from "lucide-react";

const ACCEPTED = [".vcf", ".txt", ".csv", ".zip"];
const ACCEPTED_LABELS = ["VCF", "23andMe", "AncestryDNA", "ZIP"];

function getApiBase() {
  return "";
}

export default function Upload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  function handleFile(f: File) {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext) && !f.name.toLowerCase().includes("genome") && !f.name.toLowerCase().includes("dna")) {
      setError("Please upload a VCF, 23andMe, or AncestryDNA file");
      return;
    }
    setError("");
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("saiviegene_token");
      const patientId = localStorage.getItem("saiviegene_patient_id");
      const formData = new FormData();
      formData.append("file", file);
      if (patientId) formData.append("patientId", patientId);

      const res = await fetch(`${getApiBase()}/api/genome/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      navigate(`/processing/${data.jobId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed, please try again");
      setUploading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("saiviegene_token");
    localStorage.removeItem("saiviegene_patient_id");
    navigate("/auth");
  }

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
        <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-6 relative z-10">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 animate-float"
          style={{ background: "hsl(44 87% 55% / 0.12)", border: "1px solid hsl(44 87% 55% / 0.2)" }}>
          <UploadIcon className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">Upload Your<br />Genome File</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Supports VCF, raw 23andMe, and AncestryDNA exports. Your data is encrypted and never shared.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileRef.current?.click()}
          className="rounded-3xl border-2 border-dashed p-8 flex flex-col items-center text-center cursor-pointer transition-all duration-200 mb-4"
          style={{
            borderColor: dragging ? "hsl(44 87% 55%)" : file ? "hsl(142 70% 45% / 0.6)" : "hsl(225 25% 22%)",
            background: dragging ? "hsl(44 87% 55% / 0.06)" : file ? "hsl(142 70% 45% / 0.05)" : "hsl(225 35% 10%)",
          }}
        >
          <AnimatePresence mode="wait">
            {file ? (
              <motion.div key="file" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(142 70% 45% / 0.12)" }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: "hsl(142 70% 45%)" }} />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyse</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Change file
                </button>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(225 35% 14%)" }}>
                  <FileText className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-foreground/80">Drop your genome file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or tap to browse files</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  {ACCEPTED_LABELS.map((l) => (
                    <span key={l} className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: "hsl(225 35% 14%)", color: "hsl(225 20% 55%)" }}>
                      {l}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input ref={fileRef} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-destructive mb-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <div className="rounded-2xl border border-card-border bg-card p-4 mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Privacy & Security</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your genome data is encrypted end-to-end using AES-256. We never sell or share your genetic data. Analysis runs on secure isolated servers and results are accessible only to you and your care team.
          </p>
        </div>
      </div>

      <div className="px-6 pb-16 relative z-10">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, hsl(44 87% 55%), hsl(38 90% 45%))", color: "hsl(225 35% 8%)" }}
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <><UploadIcon className="w-5 h-5" />Analyse My Genome<ChevronRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
