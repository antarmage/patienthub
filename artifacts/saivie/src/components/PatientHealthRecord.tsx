import React, { useEffect, useRef, useState } from "react";
import { authenticatedFetch as fetch } from "@/lib/authenticatedFetch";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Apple, ArrowLeft, CalendarDays, Check, ChevronRight, FileText, FlaskConical, Pill, Upload } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { exactLabNumber, recordedLabValue } from "@/lib/labReading";
import { patientMedicationCategory, patientMedicationNeedsReview, patientMedicationNote } from "@/lib/patientMedicationDisplay";
import { patientHealthRecordProgress } from "@/lib/patientHealthRecord";
import { nextAppointment, type PortalAppointment } from "@/lib/patientAppointments";
import { bookingVisitModeLabel } from "@/lib/bookingVisit";

type Section = "overview" | "medications" | "lab-reports" | "history";

interface LabValue {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: string;
  flag: string;
}

interface LabReading {
  date: string;
  provider: string;
  rawText: string;
  warnings: string[];
  results: LabValue[];
}

interface Props {
  patient: Record<string, any>;
  patientId: number;
  medications: Record<string, any>[];
  labResults: Record<string, any>[];
  labResultsLoading?: boolean;
  labResultsError?: boolean;
  onRetryLabResults?: () => void;
  visitHistory: Record<string, any>[];
  visitHistoryLoading?: boolean;
  visitHistoryError?: boolean;
  onRetryVisits?: () => void;
  appointments?: PortalAppointment[];
  appointmentsLoading?: boolean;
  appointmentsError?: boolean;
  onRetryAppointments?: () => void;
  providers?: { id: number; name: string }[];
  onBookAppointment?: () => void;
  initialSection: Section;
  pregnancyEpisode?: Record<string, any> | null;
  onUpdatePregnancy?: () => void;
  onBack: () => void;
  onScheduleMedicationReminder: () => void;
  onOpenPrograms: (category: "Move" | "Nourish") => void;
  onOpenCareTeam?: () => void;
}

const JSON_HEADERS: HeadersInit = { "Content-Type": "application/json" };

function visitDateLabel(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return "Date not recorded";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Date not recorded" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PatientHealthRecord({
  patient,
  patientId,
  medications,
  labResults,
  labResultsLoading = false,
  labResultsError = false,
  onRetryLabResults,
  visitHistory,
  visitHistoryLoading = false,
  visitHistoryError = false,
  onRetryVisits,
  appointments = [],
  appointmentsLoading = false,
  appointmentsError = false,
  onRetryAppointments,
  providers = [],
  onBookAppointment,
  initialSection,
  pregnancyEpisode = null,
  onUpdatePregnancy,
  onBack,
  onScheduleMedicationReminder,
  onOpenPrograms,
  onOpenCareTeam,
}: Props) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const [section, setSection] = useState<Section>(initialSection);
  const [file, setFile] = useState<{ fileName: string; mimeType: string; fileData: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readingError, setReadingError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [readingResult, setReadingResult] = useState<LabReading | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [reportDate, setReportDate] = useState("");
  const [healthValues, setHealthValues] = useState<LabValue[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    if (section === "lab-reports" && readingResult && healthValues.length > 0) {
      reviewHeading.current?.focus();
    }
  }, [readingResult, section, healthValues.length]);

  const progress = patientHealthRecordProgress(patient, medications, labResults);
  const pregnancyDueDate = typeof pregnancyEpisode?.details?.dueDate === "string"
    ? pregnancyEpisode.details.dueDate
    : typeof pregnancyEpisode?.details?.lmp === "string"
      ? (() => {
          const date = new Date(pregnancyEpisode.details.lmp);
          if (Number.isNaN(date.getTime())) return "";
          date.setDate(date.getDate() + 280);
          return date.toISOString().slice(0, 10);
        })()
      : "";
  const pregnancyDueDateLabel = pregnancyDueDate
    ? new Date(`${pregnancyDueDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "Not recorded";

  const selectFile = async (selected: File | undefined) => {
    setReadingError("");
    setSaveError("");
    setSaveMessage("");
    setReadingResult(null);
    setHealthValues([]);
    setReviewed(false);
    setFile(null);
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) {
      setReadingError("Choose a file smaller than 5 MB.");
      return;
    }
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!supportedTypes.includes(selected.type)) {
      setReadingError("Choose a JPG, PNG, WebP, GIF or PDF report.");
      return;
    }

    try {
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read the selected file."));
        reader.onerror = () => reject(new Error("Could not read the selected file."));
        reader.readAsDataURL(selected);
      });
      const fileData = fileDataUrl.split(",")[1];
      if (!fileData) throw new Error("The selected file is empty.");
      const uploaded = { fileName: selected.name, mimeType: selected.type, fileData };
      setFile(uploaded);
      setReading(true);
      const response = await fetch("/api/patient-lab-reports/read", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ patientId, ...uploaded }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not read the lab report.");
      if (!Array.isArray(body.results)) throw new Error("The report could not be read. You can try another photo.");
      const result: LabReading = {
        date: typeof body.date === "string" ? body.date : "",
        provider: typeof body.provider === "string" ? body.provider : "",
        rawText: typeof body.rawText === "string" ? body.rawText : "",
        warnings: Array.isArray(body.warnings) ? body.warnings.filter((warning: unknown) => typeof warning === "string") : [],
        results: body.results.map((value: Partial<LabValue>) => ({
          testName: value.testName || "",
          value: value.value || "",
          unit: value.unit || "",
          referenceRange: value.referenceRange || "",
          status: value.status || "",
          flag: value.flag || "",
        })),
      };
      setReadingResult(result);
      setReportDate(/^\d{4}-\d{2}-\d{2}$/.test(result.date) ? result.date : "");
      setHealthValues(result.results);
      if (result.results.length === 0) setReadingError("No test values were readable. Try a clearer photo or ask your clinic to add the report.");
    } catch (error) {
      setFile(null);
      setReadingError(error instanceof Error ? error.message : "Could not read the lab report.");
    } finally {
      setReading(false);
    }
  };

  const updateValue = (index: number, field: keyof LabValue, value: string) => {
    setReviewed(false);
    setHealthValues((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const saveReport = async () => {
    if (!file || !readingResult || !reviewed || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate) ||
      healthValues.length === 0 || healthValues.some((row) => !row.testName.trim() || !row.value.trim())) return;
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    let savedCount = 0;
    try {
      const existingResponse = await fetch(`/api/patients/${patientId}/lab-results`);
      if (!existingResponse.ok) throw new Error("Could not check your saved results. Nothing was saved.");
      const existingResults: Record<string, any>[] = await existingResponse.json();
      const resultKey = (name: string, value: string, unit: string) =>
        JSON.stringify([name.trim().toLowerCase(), reportDate, value.trim(), unit.trim()]);
      const savedKeys = new Set(existingResults.map((result) => {
        const details = result.results && typeof result.results === "object" ? result.results as Record<string, unknown> : {};
        return resultKey(
          String(result.testName || ""),
          String(details.rawValue ?? result.value ?? ""),
          String(result.unit || ""),
        );
      }));

      const uploadResponse = await fetch("/api/patient-documents", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          patientId,
          fileName: file.fileName,
          fileData: file.fileData,
          mimeType: file.mimeType,
          docType: "Diagnostic",
          label: "Lab report",
          uploadedAt: new Date().toISOString(),
        }),
      });
      const uploadBody = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadBody.error || "Could not save the report image.");

      for (const result of healthValues) {
        const key = resultKey(result.testName, result.value, result.unit);
        if (savedKeys.has(key)) continue;
        const resultResponse = await fetch("/api/patient-lab-results", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            patientId,
            testName: result.testName.trim(),
            date: reportDate,
            value: exactLabNumber(result.value),
            unit: result.unit.trim(),
            status: result.status.trim(),
            results: {
              rawValue: result.value.trim(),
              referenceRange: result.referenceRange.trim(),
              flag: result.flag.trim(),
              provider: readingResult.provider,
              reviewedByPatient: true,
              source: "Patient-uploaded lab report",
              sourceDocumentId: uploadBody.id,
            },
          }),
        });
        const body = await resultResponse.json();
        if (!resultResponse.ok) {
          throw new Error(savedCount
            ? `${savedCount} value(s) were saved, but the rest could not be saved: ${body.error || "Please retry."}`
            : body.error || "Could not save the reviewed values.");
        }
        savedKeys.add(key);
        savedCount++;
      }

      await queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/lab-results`] });
      setSaveMessage(savedCount
        ? `${savedCount} reviewed value${savedCount === 1 ? "" : "s"} added to Lab reports.`
        : "Report saved. These values were already in your Lab reports.");
      setReadingResult(null);
      setHealthValues([]);
      setFile(null);
      setReviewed(false);
      setSection("lab-reports");
      onScheduleMedicationReminder();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the lab report.");
    } finally {
      setSaving(false);
    }
  };

  const activeMedications = medications.filter((medication) =>
    String(medication.status || "").toLowerCase() === "active");
  const latestVisits = [...visitHistory].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 2);
  const latestLabs = [...labResults].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 3);
  const lmp = pregnancyEpisode?.details?.lmp;
  const lmpTime = typeof lmp === "string" ? new Date(lmp).getTime() : NaN;
  const week = Number.isFinite(lmpTime) ? Math.floor((Date.now() - lmpTime) / (7 * 86400000)) : null;
  const nextVisit = nextAppointment(appointments);

  return (
    <div className="mx-auto max-w-[1160px] space-y-5 px-4 pb-32 pt-5 md:px-0 md:pb-10">
      {section === "overview" && (
        <>
          <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-saivie-plum">
            <ArrowLeft className="h-4 w-4" /> Today
          </button>
          <header>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-saivie-rose">Your health, in one place</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-saivie-plum">Health record</h1>
          </header>

          {pregnancyEpisode && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8D8C8] bg-white/80 px-4 py-3" aria-label="Pregnancy profile">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#775B63]">My pregnancy</p>
                <p className="mt-1 text-sm font-semibold text-saivie-plum">Due date · {pregnancyDueDateLabel}</p>
              </div>
              <button type="button" onClick={onUpdatePregnancy} className="min-h-11 rounded-full px-3 text-sm font-semibold text-saivie-plum underline underline-offset-4">
                Update status
              </button>
            </section>
          )}
        </>
      )}

      {section === "overview" && (
        <section className="space-y-6 text-[#2A1220]" aria-label="Health record overview">
          <div className="flex flex-wrap items-center gap-8 rounded-[36px] bg-[#FFA7B6] p-6 md:p-10">
            <div className="min-w-0 flex-[1_1_390px]">
              <span className="inline-flex rounded-full bg-[#2A1220] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">
                {week !== null && week >= 0 ? `Week ${week} · ` : ""}Health record
              </span>
              <h2 className="mt-4 max-w-[550px] font-serif text-[42px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[62px]">
                Your health record, <em className="font-medium">in one place.</em>
              </h2>
              <p className="mt-4 max-w-[420px] text-base leading-relaxed">Visits, labs, medications, food and exercise, together.</p>
            </div>
            <div className="min-w-0 flex-[1_1_300px] rounded-[26px] bg-white p-6 md:max-w-[390px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">{labResultsLoading ? "Loading profile progress" : labResultsError ? "Profile progress unavailable" : `Profile · ${progress.progress}% complete`}</p>
              {!labResultsLoading && !labResultsError && <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F0DCC4]" role="progressbar" aria-label="Health record progress" aria-valuenow={progress.progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-[#2A1220]" style={{ width: `${progress.progress}%` }} />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-bold leading-tight">{progress.missingItems.length ? "A few details would help your care team." : "Your checklist is complete."}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5A4552]">
                {progress.missingItems.length ? `Still to review: ${progress.missingItems.map((item) => item.label.toLowerCase()).join(", ")}.` : "You can review your information anytime."}
              </p>
              <button type="button" onClick={() => setShowChecklist((current) => !current)} aria-expanded={showChecklist} className="mt-4 min-h-11 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">
                {showChecklist ? "Hide checklist" : "Review my profile"}
              </button>
              </>}
            </div>
          </div>
          {onOpenCareTeam && <button type="button" onClick={onOpenCareTeam} className="min-h-11 rounded-full border border-[#D9C3AE] bg-white px-5 text-sm font-bold">Appointments and care team</button>}

          {showChecklist && !labResultsLoading && !labResultsError && <Card className="rounded-[24px] border-[var(--line)] bg-white/80">
            <CardContent className="space-y-1 p-4">
              <h2 className="mb-2 font-serif text-xl font-semibold text-saivie-plum">Your health record checklist</h2>
              {progress.items.map((item) => {
                const actionable = item.id === "medications" || item.id === "lab-report";
                const content = (
                  <>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.complete ? "bg-emerald-100 text-emerald-700" : "bg-[#FFF0E8] text-saivie-rose"}`}>
                    {item.complete ? <Check className="h-4 w-4" /> : actionable ? <ChevronRight className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                  </span>
                  <span className="flex-1 text-sm font-medium text-saivie-plum">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.complete ? "Added" : actionable ? "Add" : "Discuss at your next visit"}
                  </span>
                  </>
                );
                return actionable ? (
                  <button key={item.id} type="button" onClick={() => setSection(item.id === "medications" ? "medications" : "lab-reports")}
                    className="flex min-h-[54px] w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-saivie-ivory/70">
                    {content}
                  </button>
                ) : (
                  <div key={item.id} className="flex min-h-[54px] items-center gap-3 rounded-xl px-2">
                    {content}
                  </div>
                );
              })}
            </CardContent>
          </Card>}

          <h2 className="font-serif text-[36px] font-bold">Your record</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article className="flex min-h-[245px] flex-col rounded-[28px] border border-[#F0DCC4] bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#E4DCFF] p-3 text-[#3A24B8]"><CalendarDays className="h-5 w-5" /></span>
                <div><h3 className="font-serif text-2xl font-bold">Visits</h3><p className="text-xs text-[#6A5560]">{visitHistoryLoading ? "Loading visits" : visitHistoryError ? "Unable to load visits" : `${visitHistory.length} recorded`}</p></div>
              </div>
              <div className="mt-4 flex-1 text-sm">
                {!visitHistoryLoading && !visitHistoryError && (latestVisits.length ? latestVisits.map((visit) => <p key={visit.id} className="flex justify-between gap-3 border-t border-[#F0DCC4] py-3"><span>{visit.visitType || visit.diagnosis || "Care visit"}</span><span className="shrink-0 text-[#6A5560]">{visit.date || ""}</span></p>) : <p className="border-t border-[#F0DCC4] pt-3 text-[#6A5560]">Your visits will appear here.</p>)}
              </div>
              <button type="button" onClick={() => setSection("history")} className="min-h-11 w-fit rounded-full border border-[#D9C3AE] px-5 text-sm font-bold">Open visits</button>
            </article>
            <article className="flex min-h-[245px] flex-col rounded-[28px] border border-[#F0DCC4] bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#FFD9C9] p-3 text-[#A8341A]"><FlaskConical className="h-5 w-5" /></span>
                <div><h3 className="font-serif text-2xl font-bold">Lab reports</h3><p className="text-xs text-[#6A5560]">{labResultsLoading ? "Loading results" : labResultsError ? "Unable to load results" : `${labResults.length} saved ${labResults.length === 1 ? "result" : "results"}`}</p></div>
              </div>
              <div className="mt-4 flex-1 text-sm">
                {!labResultsLoading && !labResultsError && (latestLabs.length ? latestLabs.map((lab) => {
                  const rawValue = lab.results && typeof lab.results === "object" ? lab.results.rawValue : null;
                  const value = rawValue ?? lab.value;
                  return <p key={lab.id} className="flex justify-between gap-3 border-t border-[#F0DCC4] py-3"><span>{lab.testName || "Lab result"}</span><span className="text-right text-[#6A5560]">{value != null ? `${value} ${lab.unit || ""}` : "Recorded"}</span></p>;
                }) : <p className="border-t border-[#F0DCC4] pt-3 text-[#6A5560]">Your lab reports will appear here.</p>)}
              </div>
              <button type="button" onClick={() => setSection("lab-reports")} className="min-h-11 w-fit rounded-full border border-[#D9C3AE] px-5 text-sm font-bold">Open lab reports</button>
            </article>
            <article className="flex min-h-[245px] flex-col rounded-[28px] border border-[#F0DCC4] bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#CFF1EA] p-3 text-[#0B6B5F]"><Pill className="h-5 w-5" /></span>
                <div><h3 className="font-serif text-2xl font-bold">Medications</h3><p className="text-xs text-[#6A5560]">{activeMedications.length} current {activeMedications.length === 1 ? "medicine" : "medicines"}</p></div>
              </div>
              <div className="mt-4 flex-1 text-sm">
                {activeMedications.length ? activeMedications.slice(0, 3).map((medicine) => <p key={medicine.id} className="flex justify-between gap-3 border-t border-[#F0DCC4] py-3"><span>{medicine.name || "Medicine"}</span><span className="text-right text-[#6A5560]">{patientMedicationNeedsReview(medicine.notes) ? "Review with care team" : medicine.dose || ""}</span></p>) : <p className="border-t border-[#F0DCC4] pt-3 text-[#6A5560]">No current medicines recorded.</p>}
              </div>
              <button type="button" onClick={() => setSection("medications")} className="min-h-11 w-fit rounded-full border border-[#D9C3AE] px-5 text-sm font-bold">Open medications</button>
            </article>
            {([
              ["Nutrition", "Explore nourishment programs.", "Nourish", Apple, "#FFE7A8"],
              ["Exercise", "Explore movement programs at your own pace.", "Move", Activity, "#E4DCFF"],
            ] as const).map(([title, description, category, Icon, color]) => (
              <article key={title} className="flex min-h-[210px] flex-col rounded-[28px] border border-[#F0DCC4] bg-white p-6">
                <div className="flex items-center gap-3"><span className="rounded-full p-3" style={{ backgroundColor: color }}><Icon className="h-5 w-5" /></span><h3 className="font-serif text-2xl font-bold">{title}</h3></div>
                <p className="mt-4 flex-1 text-sm text-[#5A4552]">{description}</p>
                <button type="button" onClick={() => onOpenPrograms(category)} className="min-h-11 w-fit rounded-full border border-[#D9C3AE] px-5 text-sm font-bold">Open {title.toLowerCase()}</button>
              </article>
            ))}
            <article className="flex min-h-[210px] flex-col rounded-[28px] bg-[#FFE7A8] p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Add to your record</p>
              <h3 className="mt-3 font-serif text-2xl font-bold">Upload, review and confirm.</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed">Add a lab report, check the extracted values and confirm before saving.</p>
              <button type="button" onClick={() => setSection("lab-reports")} className="min-h-11 w-fit rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">Open lab reports</button>
            </article>
          </div>
          <p className="text-sm text-[#5A4552]">Sharing and export options are not available here yet. Contact your care team if you have questions about your records.</p>
        </section>
      )}

      {section === "medications" && (
        <section className="space-y-6 text-[#2A1220]" aria-label="Medications">
          <button type="button" onClick={() => setSection("overview")} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> Health record
          </button>
          <div className="flex flex-wrap items-center gap-8 rounded-[36px] bg-[#FFA7B6] p-6 md:p-10">
            <div className="min-w-0 flex-[1_1_390px]">
              <span className="inline-flex rounded-full bg-[#2A1220] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">
                {week !== null && week >= 0 ? `Week ${week} · ` : ""}Medications
              </span>
              <h1 className="mt-4 max-w-[550px] font-serif text-[42px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[62px]">
                Your medications, <em className="font-medium">simply.</em>
              </h1>
              <p className="mt-4 max-w-[420px] text-base leading-relaxed">Your medicines, as recorded by you or your care team.</p>
            </div>
            <div className="min-w-0 flex-[1_1_250px] rounded-[26px] bg-white p-6 md:max-w-[300px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">Your list</p>
              <p className="mt-3 font-serif text-5xl font-bold">{activeMedications.length}</p>
              <p className="mt-1 text-sm text-[#5A4552]">current {activeMedications.length === 1 ? "medicine" : "medicines"} recorded</p>
            </div>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <div className="space-y-5">
              <section className="rounded-[28px] border border-[#F0DCC4] bg-white p-6 md:p-7">
                <h2 className="font-serif text-3xl font-bold">Today</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5A4552]">Scheduled dose tracking is not available here yet. Check the directions in your medicine list and ask your care team if you have questions.</p>
              </section>

              <section className="rounded-[28px] border border-[#F0DCC4] bg-white p-6 md:p-7">
                <h2 className="font-serif text-3xl font-bold">All medications</h2>
                {activeMedications.length ? (
                  <div className="mt-4">
                    {activeMedications.map((medication) => {
                      const needsReview = patientMedicationNeedsReview(medication.notes);
                      const note = needsReview
                        ? "Product, dose, schedule and duration are not confirmed. Ask your care team before taking or continuing this medicine."
                        : patientMedicationNote(medication.notes);
                      return (
                        <div key={medication.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-[#F0DCC4] py-4">
                          <div className="min-w-0 flex-1 basis-[220px]">
                            <p className="text-base font-bold">{medication.name}</p>
                            {(medication.dose || medication.frequency) && <p className="mt-1 text-sm text-[#5A4552]">{[medication.dose, medication.frequency].filter(Boolean).join(" · ")}</p>}
                            {medication.instructions && <p className="mt-2 text-sm">{medication.instructions}</p>}
                            {medication.startDate && <p className="mt-2 text-xs text-[#6A5560]">Started {new Date(`${medication.startDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                            {medication.endDate && <p className="mt-1 text-xs text-[#6A5560]">End date {new Date(`${medication.endDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                            {note && <p className="mt-2 text-xs leading-relaxed text-[#6A5560]">{note}</p>}
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${needsReview ? "bg-amber-100 text-amber-900" : "bg-[#CFF1EA] text-[#0B6B5F]"}`}>
                            {needsReview ? "Review with care team" : patientMedicationCategory(medication.name, medication.route)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-[#FAF5EF] p-6 text-center">
                    <Pill className="mx-auto h-7 w-7 text-saivie-rose" />
                    <p className="mt-2 text-sm font-semibold">No current medicines added yet</p>
                    <p className="mt-1 text-xs text-[#6A5560]">Ask your care team to review or update your list.</p>
                  </div>
                )}
                {medications.some((medication) => String(medication.status || "").toLowerCase() !== "active") && (
                  <details className="mt-4 border-t border-[#F0DCC4] pt-4">
                    <summary className="cursor-pointer text-sm font-semibold">Past medications</summary>
                    <div className="mt-3 space-y-2">
                      {medications.filter((medication) => String(medication.status || "").toLowerCase() !== "active").map((medication) => (
                        <div key={medication.id} className="rounded-xl bg-saivie-ivory/70 p-3">
                          <p className="text-sm font-medium">{medication.name}</p>
                          <p className="mt-1 text-xs text-[#6A5560]">{[medication.dose, medication.frequency].filter(Boolean).join(" · ") || "Details not recorded"}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </section>
            </div>
            <aside className="space-y-5">
              <section className="rounded-[28px] bg-[#FFD9C9] p-6 md:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Ask first</p>
                <h2 className="mt-3 font-serif text-2xl font-bold">Check before you take anything new.</h2>
                <p className="mt-3 text-sm leading-relaxed">Your doctor or pharmacist can help you check medicines, supplements and herbal products.</p>
                {onOpenCareTeam && <button type="button" onClick={onOpenCareTeam} className="mt-5 min-h-11 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">Appointments and care team</button>}
              </section>
              <section className="rounded-[28px] bg-[#E4DCFF] p-6 md:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Your medicine list</p>
                <p className="mt-3 text-sm leading-relaxed">This list is not a new prescription. Ask your care team to confirm any details that are missing or need review.</p>
              </section>
            </aside>
          </div>
        </section>
      )}

      {section === "lab-reports" && (
        <section className="space-y-6 text-[#2A1220]" aria-label="Lab reports">
          <button type="button" onClick={() => setSection("overview")} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-saivie-plum">
            <ArrowLeft className="h-4 w-4" /> Health record
          </button>
          <div className="flex flex-wrap items-center gap-8 rounded-[36px] bg-[#FFA7B6] p-6 md:p-10">
            <div className="min-w-0 flex-[1_1_390px]">
              <span className="inline-flex rounded-full bg-[#2A1220] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">
                {week !== null && week >= 0 ? `Week ${week} · ` : ""}Lab reports
              </span>
              <h1 className="mt-4 max-w-[550px] font-serif text-[42px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[62px]">
                Your lab reports, <em className="font-medium">in plain words.</em>
              </h1>
              <p className="mt-4 max-w-[420px] text-base leading-relaxed">Results to review and discuss with your care team.</p>
            </div>
            <div className="min-w-0 flex-[1_1_250px] rounded-[26px] bg-white p-6 md:max-w-[300px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6A5560]">At a glance</p>
              {labResultsLoading ? <p className="mt-3 text-sm">Loading results…</p> : labResultsError ? <p className="mt-3 text-sm">Results unavailable</p> : <>
                <p className="mt-3 font-serif text-3xl font-bold">{labResults.length}</p>
                <p className="mt-1 text-sm text-[#5A4552]">saved {labResults.length === 1 ? "result" : "results"}</p>
              </>}
            </div>
          </div>

          {readingError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">{readingError}</p>}
          {saveError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">{saveError}</p>}
          {saveMessage && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-900">{saveMessage}</p>}

          {readingResult && healthValues.length > 0 && (
            <Card className="rounded-[24px] border-[var(--line)] bg-white/90">
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 ref={reviewHeading} tabIndex={-1} className="font-serif text-xl font-semibold text-saivie-plum">Check the values</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Compare each value with the original report. Nothing is saved until you confirm.</p>
                </div>
                {readingResult.warnings.map((warning, index) => <p key={index} role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>)}
                {file && (
                  <details className="rounded-xl border border-[var(--line)] p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-saivie-plum">View original report</summary>
                    {file.mimeType.startsWith("image/") ? (
                      <img src={`data:${file.mimeType};base64,${file.fileData}`} alt="Original uploaded lab report" className="mt-3 max-h-[60vh] w-full rounded-lg object-contain" />
                    ) : (
                      <iframe src={`data:${file.mimeType};base64,${file.fileData}`} title="Original uploaded lab report" className="mt-3 h-[60vh] w-full rounded-lg border" />
                    )}
                  </details>
                )}
                <label className="block space-y-1 text-sm font-medium text-saivie-plum">
                  Report date
                  <DateInput value={reportDate} disabled={saving} onValueChange={(value) => { setReviewed(false); setReportDate(value); }} />
                </label>
                <div className="space-y-3">
                  {healthValues.map((result, index) => (
                    <div key={index} className="grid gap-2 rounded-xl border border-[var(--line)] p-3 sm:grid-cols-2">
                      {([
                        ["testName", "Test"],
                        ["value", "Value"],
                        ["unit", "Unit"],
                        ["referenceRange", "Reference range"],
                      ] as [keyof LabValue, string][]).map(([field, label]) => (
                        <label key={field} className="space-y-1 text-xs font-medium text-saivie-plum">
                          {label}
                          <Input value={result[field]} disabled={saving} onChange={(event) => updateValue(index, field, event.target.value)} />
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <label className="flex items-start gap-2 text-sm text-saivie-plum">
                  <input type="checkbox" checked={reviewed} disabled={saving} onChange={(event) => setReviewed(event.target.checked)} className="mt-1" />
                  <span>I checked the test names, values, units and date against the original report.</span>
                </label>
                <Button type="button" className="min-h-12 w-full rounded-xl" disabled={saving || !reviewed || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate) || healthValues.some((row) => !row.testName.trim() || !row.value.trim())} onClick={() => void saveReport()}>
                  {saving ? "Saving reviewed values…" : "Confirm and save"}
                </Button>
                {readingResult.rawText && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Show text read from the report</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-saivie-ivory p-3">{readingResult.rawText}</pre>
                  </details>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <div className="space-y-4">
              <h2 className="font-serif text-3xl font-bold">Results</h2>
              {labResultsLoading ? <p role="status" className="text-sm">Loading results…</p> : labResultsError ? (
                <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  Unable to load your lab results. {onRetryLabResults && <button type="button" onClick={onRetryLabResults} className="font-bold underline">Retry</button>}
                </div>
              ) : labResults.length ? [...labResults].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).map((result) => {
                const details = result.results && typeof result.results === "object" ? result.results as Record<string, unknown> : {};
                const value = recordedLabValue(result);
                const reference = typeof details.referenceRange === "string" && details.referenceRange.trim()
                  ? details.referenceRange.trim()
                  : typeof result.referenceMin === "number" && typeof result.referenceMax === "number"
                    ? `${result.referenceMin}–${result.referenceMax}${result.unit ? ` ${result.unit}` : ""}`
                    : "";
                return (
                  <article key={result.id} className="rounded-[24px] border border-[#F0DCC4] bg-white p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-2xl font-bold">{result.testName || "Lab result"}</h3>
                        <p className="mt-1 text-xs text-[#6A5560]">{visitDateLabel(result.date)}{details.reviewedByPatient === true ? " · Confirmed by you" : ""}</p>
                      </div>
                      {details.reviewedByPatient === true && <span className="rounded-full bg-[#CFF1EA] px-3 py-1 text-xs font-semibold text-[#0B6B5F]">Your report</span>}
                    </div>
                    <p className="mt-4 break-words font-serif text-3xl font-bold">{value ?? "Value not recorded"}</p>
                    {reference && <p className="mt-3 text-sm text-[#5A4552]">Report reference range: {reference}</p>}
                    {typeof result.notes === "string" && result.notes.trim() && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{result.notes}</p>}
                  </article>
                );
              }) : (
                <div className="rounded-[24px] border border-dashed border-[#D9C3AE] bg-white p-6 text-center">
                  <FlaskConical className="mx-auto h-7 w-7 text-saivie-teal" />
                  <p className="mt-2 text-sm font-semibold">Your lab reports will appear here</p>
                  <p className="mt-1 text-xs text-[#6A5560]">Upload a report to get started.</p>
                </div>
              )}
            </div>
            <aside className="space-y-5">
              <section className="rounded-[28px] bg-[#2A1220] p-6 text-white md:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">Add a report</p>
                <h2 className="mt-3 font-serif text-2xl font-bold">Upload it. Check it. Done.</h2>
                <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
                  <li>Take a photo or upload a PDF.</li>
                  <li>AI reads the values from your report.</li>
                  <li>Check each value before you save.</li>
                </ol>
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden"
                  onChange={(event) => { void selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                <button type="button" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#FFA7B6] px-5 text-sm font-bold text-[#2A1220] disabled:opacity-60" disabled={reading || saving} onClick={() => fileInput.current?.click()}>
                  <Upload className="h-4 w-4" /> {reading ? "Reading your report…" : file ? "Choose a different report" : "Upload report"}
                </button>
              </section>
              <section className="rounded-[28px] bg-[#FFE7A8] p-6 md:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Good to know</p>
                <p className="mt-3 text-sm leading-relaxed">A reference range on a report is not a diagnosis. Your doctor can interpret your results for you.</p>
              </section>
            </aside>
          </div>
        </section>
      )}

      {section === "history" && (
        <section className="space-y-6 text-[#2A1220]" aria-label="Visit history">
          <button type="button" onClick={() => setSection("overview")} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> Health record
          </button>
          <div className="flex flex-wrap items-center gap-8 rounded-[36px] bg-[#FFA7B6] p-6 md:p-10">
            <div className="min-w-0 flex-[1_1_390px]">
              <span className="inline-flex rounded-full bg-[#2A1220] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">
                {week !== null && week >= 0 ? `Week ${week} · ` : ""}Visits
              </span>
              <h1 className="mt-4 max-w-[550px] font-serif text-[42px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[62px]">
                Your visits, <em className="font-medium">in order.</em>
              </h1>
              <p className="mt-4 max-w-[420px] text-base leading-relaxed">Check-ups and notes recorded by your care team.</p>
            </div>
            <div className="min-w-0 flex-[1_1_250px] rounded-[26px] bg-white p-6 md:max-w-[300px]">
              <p className="font-serif text-2xl font-bold">
                {visitHistoryLoading ? "Loading visits…" : visitHistoryError ? "Visits unavailable" : `${visitHistory.length} ${visitHistory.length === 1 ? "visit" : "visits"} recorded`}
              </p>
              <p className="mt-2 text-sm text-[#5A4552]">
                {appointmentsLoading ? "Loading next visit…" : appointmentsError ? "Next visit unavailable" : nextVisit ? `Next: ${visitDateLabel(nextVisit.date)}` : "No upcoming appointment"}
              </p>
            </div>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <div>
              <h2 className="font-serif text-3xl font-bold">History</h2>
              {visitHistoryLoading ? (
                <p role="status" className="mt-4 text-sm">Loading visits…</p>
              ) : visitHistoryError ? (
                <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  Unable to load your visits. {onRetryVisits && <button type="button" onClick={onRetryVisits} className="font-bold underline">Retry</button>}
                </div>
              ) : visitHistory.length ? (
                <ol className="mt-4 space-y-5 border-l-2 border-[#E8D8C8] pl-5">
                  {[...visitHistory].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).map((visit) => {
                    const vitals = visit.vitals && typeof visit.vitals === "object" ? visit.vitals as Record<string, unknown> : {};
                    const values: { label: string; value: unknown }[] = [
                      { label: "BP", value: vitals.bp || vitals.bloodPressure },
                      { label: "Weight", value: vitals.weight ? `${vitals.weight} kg` : null },
                      { label: "Fundal height", value: vitals.fundalHeight ? `${vitals.fundalHeight} cm` : null },
                      { label: "Baby heart", value: vitals.fetalHeartRate || vitals.fetalHeart },
                    ].filter(({ value }) => value != null && value !== "");
                    const provider = providers.find((item) => item.id === visit.providerId);
                    return (
                      <li key={visit.id} className="relative">
                        <span aria-hidden="true" className="absolute -left-[27px] top-6 h-3 w-3 rounded-full border-2 border-[#2A1220] bg-[#FFA7B6]" />
                        <article className="rounded-[24px] border border-[#F0DCC4] bg-white p-5 md:p-6">
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6A5560]">
                            {visitDateLabel(visit.date)}{vitals.pog ? ` · ${String(vitals.pog)}` : ""}
                          </p>
                          <h3 className="mt-3 font-serif text-2xl font-bold">{visit.visitType || visit.diagnosis || "Care visit"}</h3>
                          {provider?.name && <p className="mt-1 text-sm text-[#6A5560]">{provider.name}</p>}
                          {values.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {values.map(({ label, value }) => (
                              <div key={label} className="rounded-xl bg-[#FAF5EF] p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#6A5560]">{label}</p>
                                <p className="mt-1 text-sm font-bold">{String(value)}</p>
                              </div>
                            ))}
                          </div>}
                          {(visit.chiefComplaint || visit.subjective || visit.diagnosis) && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{visit.chiefComplaint || visit.subjective || visit.diagnosis}</p>}
                          {typeof visit.planNotes === "string" && visit.planNotes.trim() && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{visit.planNotes}</p>}
                          {typeof vitals.followUpDate === "string" && vitals.followUpDate && <p className="mt-3 text-xs text-[#6A5560]">Follow-up: {visitDateLabel(vitals.followUpDate)}</p>}
                          {typeof visit.followUpPlan === "string" && visit.followUpPlan.trim() && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{visit.followUpPlan}</p>}
                        </article>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="mt-4 rounded-[24px] border border-dashed border-[#D9C3AE] bg-white p-6 text-center">
                  <FileText className="mx-auto h-7 w-7 text-saivie-teal" />
                  <p className="mt-2 text-sm font-semibold">Your visit history will appear here</p>
                  <p className="mt-1 text-xs text-[#6A5560]">Ask your care team about adding your visit notes.</p>
                </div>
              )}
            </div>
            <aside className="space-y-5">
              <section className="rounded-[28px] bg-[#2A1220] p-6 text-white md:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FFA7B6]">Next visit</p>
                {appointmentsLoading ? <p role="status" className="mt-3 text-sm">Loading appointment…</p> : appointmentsError ? (
                  <p role="alert" className="mt-3 text-sm">Unable to load appointments. {onRetryAppointments && <button type="button" onClick={onRetryAppointments} className="font-bold underline">Retry</button>}</p>
                ) : nextVisit ? (
                  <>
                    <h2 className="mt-3 font-serif text-2xl font-bold">{nextVisit.type || "Upcoming appointment"}</h2>
                    <p className="mt-2 text-sm">{[visitDateLabel(nextVisit.date), nextVisit.time, nextVisit.visitMode ? bookingVisitModeLabel(nextVisit.visitMode) : null].filter(Boolean).join(" · ")}</p>
                    {providers.find((item) => item.id === nextVisit.providerId)?.name && <p className="mt-2 text-sm">{providers.find((item) => item.id === nextVisit.providerId)?.name}</p>}
                  </>
                ) : (
                  <>
                    <h2 className="mt-3 font-serif text-2xl font-bold">No upcoming appointment</h2>
                    <p className="mt-2 text-sm">Your next appointment will appear here.</p>
                  </>
                )}
                {onBookAppointment && <button type="button" onClick={onBookAppointment} className="mt-5 min-h-11 rounded-full bg-[#FFA7B6] px-5 text-sm font-bold text-[#2A1220]">Book an appointment</button>}
              </section>
              <section className="rounded-[28px] bg-[#FFE7A8] p-6 md:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Preparing for your visit</p>
                <p className="mt-3 text-sm leading-relaxed">Bring any questions or records you would like to discuss with your care team.</p>
              </section>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}
