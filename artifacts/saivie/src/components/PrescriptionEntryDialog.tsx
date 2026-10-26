import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { pregnancyWeeks, prescriptionTestOptions } from "@/lib/prescriptionTests";
import { estimatePregnancyDating, pregnancyDatingFromLmp } from "@/lib/pregnancyDating";
import { MedicineDoseInput } from "@/components/MedicineDoseInput";
import { MedicineFrequencyInput } from "@/components/MedicineFrequencyInput";
import { parseCallDate, prescriptionDueDate } from "../../../../lib/db/src/follow-up";
import { MedicineAutocomplete } from "@/components/MedicineAutocomplete";

interface Medicine {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface TestLine {
  name: string;
  type: "lab" | "usg";
  fromBilling?: boolean;
}

async function readApiJson(res: Response) {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    throw new Error("The server returned a web page instead of saving the prescription. Restart the API server and try again.");
  }
  if (!trimmed) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 180) || "Unexpected server response");
  }
}

const emptyMedicine = (): Medicine => ({ name: "", dose: "", frequency: "", duration: "", instructions: "" });
const PATIENT_TYPES = ["General", "PCOS", "Irregular period", "Pregnant", "MTP", "Fertility", "Postpartum", "Gynecology"];
const UTERUS_SIZES = Array.from({ length: 42 }, (_, index) => `${index + 1} weeks`);
const FETAL_HEART_SOUNDS = Array.from({ length: 121 }, (_, index) => String(index + 60));
const SCAN_WEIGHTS = Array.from({ length: 120 }, (_, index) => `${(index + 1) * 50} g`);
type EntryStep = "patient" | "examination" | "scans" | "medicines" | "plan";

function ScanSelect({ label, value, options, onChange, testId }: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  testId: string;
}) {
  const [other, setOther] = useState(false);
  return (
    <div className="space-y-1">
      <Label htmlFor={testId}>{label}</Label>
      <select id={testId} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={other ? "__other" : value} onChange={(event) => {
        const next = event.target.value;
        setOther(next === "__other");
        if (next !== "__other") onChange(next);
      }} data-testid={testId}>
        <option value="">Not recorded</option>
        {value && !options.includes(value) && <option value={value}>{value}</option>}
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="__other">Other / exact value</option>
      </select>
      {other && <Input aria-label={`${label} - exact value`} value={value} placeholder="Enter exactly as reported" onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}

function ScanGestation({ value, onChange, index }: { value: string; onChange: (value: string) => void; index: number }) {
  const gestation = pregnancyWeeks(value, "", "");
  const weeks = gestation === null ? "" : String(Math.floor(gestation));
  const days = gestation === null ? "0" : String(Math.round((gestation - Math.floor(gestation)) * 7));
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">POG at scan</legend>
      {value && gestation === null && <p className="text-xs text-muted-foreground">Recorded: {value}</p>}
      <div className="flex gap-2">
        <select aria-label="Scan gestation weeks" data-testid={`input-rx-usg-weeks-${index}`} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm" value={weeks} onChange={(event) => onChange(event.target.value ? `${event.target.value} weeks ${days} days` : "")}>
          <option value="">Weeks</option>
          {Array.from({ length: 43 }, (_, week) => <option key={week} value={String(week)}>{week} weeks</option>)}
        </select>
        <select aria-label="Scan gestation days" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm" disabled={weeks === ""} value={days} onChange={(event) => onChange(`${weeks} weeks ${event.target.value} days`)}>
          {Array.from({ length: 7 }, (_, day) => <option key={day} value={String(day)}>{day} days</option>)}
        </select>
      </div>
    </fieldset>
  );
}

function ExamSelect({ label, value, options, onChange, testId, unit = "" }: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  testId: string;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={testId}>{label}</Label>
      <select id={testId} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId}>
        <option value="">Not recorded</option>
        {value && !options.includes(value) && <option value={value}>{value} (previously recorded)</option>}
        {options.map((option) => <option key={option} value={option}>{option}{unit}</option>)}
      </select>
    </div>
  );
}

function demographicsFrom(sourcePatient: any, visit?: any) {
  const vitals = visit?.vitals && typeof visit.vitals === "object" ? visit.vitals : {};
  return {
    lmp: String(vitals.lmp || sourcePatient?.lmp || "").slice(0, 10),
    height: vitals.height != null ? String(vitals.height) : sourcePatient?.height != null ? String(sourcePatient.height) : "",
    weight: vitals.weight != null ? String(vitals.weight) : sourcePatient?.weight != null ? String(sourcePatient.weight) : "",
    age: vitals.age != null ? String(vitals.age) : sourcePatient?.age != null ? String(sourcePatient.age) : "",
    patientType: String(vitals.patientType || sourcePatient?.type || "General"),
  };
}

function obstetricFrom(vitals: any, sourcePatient: any, draft?: any) {
  const history = sourcePatient?.history && typeof sourcePatient.history === "object" ? sourcePatient.history.obstetric || {} : {};
  return {
    eod: String(vitals?.eod || draft?.eod || history.eod || "").slice(0, 10),
    pog: String(vitals?.pog || draft?.pog || history.pog || ""),
    gravida: String(vitals?.gravida || draft?.gravida || history.gravida || ""),
    surgicalHistory: String(vitals?.surgicalHistory || draft?.surgicalHistory || history.surgicalHistory || ""),
  };
}

interface UsgLine {
  scanDate: string;
  finding: string;
  weeks: string;
  placenta: string;
  liquor: string;
  efw: string;
  anomaly: string;
}

function toIsoDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "null" || raw === "undefined") return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    const month = Number(dmy[2]);
    const day = Number(dmy[1]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  if (/[a-z]/i.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
  }
  return "";
}

interface AntenatalExam {
  bloodGroup: string;
  hb: string;
  hbDate: string;
  urineRe: string;
  urineReDate: string;
  usg: UsgLine[];
  slf: string;
  pulse: string;
  bp: string;
  spo2: string;
  rr: string;
  perAbdomen: string;
  uterusSize: string;
  uterusSizeDate: string;
  fetalMovements: string;
  fetalHeartSound: string;
  fetalHeartDoppler: string;
  scarTenderness: string;
}

function emptyUsg(): UsgLine {
  return { scanDate: "", finding: "", weeks: "", placenta: "", liquor: "", efw: "", anomaly: "" };
}

function usgListsFrom(...sources: any[]): any[][] {
  return sources.flatMap((source) => {
    if (Array.isArray(source)) return [source];
    if (Array.isArray(source?.usg)) return [source.usg];
    if (Array.isArray(source?.scans)) return [source.scans];
    return [];
  }).filter((list) => list.length);
}

function emptyAntenatal(): AntenatalExam {
  return {
    bloodGroup: "",
    hb: "",
    hbDate: "",
    urineRe: "",
    urineReDate: "",
    usg: [emptyUsg()],
    slf: "",
    pulse: "",
    bp: "",
    spo2: "",
    rr: "",
    perAbdomen: "",
    uterusSize: "",
    uterusSizeDate: "",
    fetalMovements: "",
    fetalHeartSound: "",
    fetalHeartDoppler: "",
    scarTenderness: "",
  };
}

function antenatalFrom(vitals: any, sourcePatient: any, draft?: any, examination?: any): AntenatalExam {
  const history = sourcePatient?.history && typeof sourcePatient.history === "object" ? sourcePatient.history.obstetric || {} : {};
  const saved = vitals?.antenatal || draft?.antenatal || {};
  const lists = usgListsFrom(saved, examination, draft?.antenatal, history.antenatal);
  const longest = Math.max(1, ...lists.map((list) => list.length));
  const usg = Array.from({ length: longest }, (_, index) => lists.reduce((line, list) => ({ ...line, ...(list[index] || {}) }), {}));
  return {
    ...emptyAntenatal(),
    ...saved,
    bloodGroup: String(saved.bloodGroup || history.bloodGroup || ""),
    hbDate: String(saved.hbDate || "").slice(0, 10),
    urineReDate: String(saved.urineReDate || "").slice(0, 10),
    uterusSizeDate: String(saved.uterusSizeDate || "").slice(0, 10),
    hb: String(saved.hb || ""),
    urineRe: String(saved.urineRe || ""),
    slf: String(saved.slf || ""),
    pulse: String(vitals?.pulse ?? draft?.pulse ?? saved.pulse ?? ""),
    bp: String(vitals?.bp ?? draft?.bp ?? saved.bp ?? ""),
    spo2: String(vitals?.spo2 ?? draft?.spo2 ?? saved.spo2 ?? ""),
    rr: String(vitals?.rr ?? draft?.rr ?? saved.rr ?? ""),
    perAbdomen: String(saved.perAbdomen || ""),
    uterusSize: String(saved.uterusSize || ""),
    fetalMovements: String(saved.fetalMovements || ""),
    fetalHeartSound: String(saved.fetalHeartSound || ""),
    fetalHeartDoppler: String(saved.fetalHeartDoppler || ""),
    scarTenderness: String(saved.scarTenderness || ""),
    usg: usg.map((line: any) => ({
      scanDate: toIsoDate(line?.scanDate || line?.date),
      finding: String(line?.finding || ""),
      weeks: String(line?.weeks || line?.pog || ""),
      placenta: String(line?.placenta || ""),
      liquor: String(line?.liquor || ""),
      efw: String(line?.efw || ""),
      anomaly: String(line?.anomaly || ""),
    })),
  };
}

function antenatalPayload(exam: AntenatalExam) {
  const usg = exam.usg
    .map((line) => ({
      scanDate: toIsoDate(line.scanDate) || null,
      finding: line.finding.trim() || null,
      weeks: line.weeks.trim() || null,
      placenta: line.placenta.trim() || null,
      liquor: line.liquor.trim() || null,
      efw: line.efw.trim() || null,
      anomaly: line.anomaly.trim() || null,
    }))
    .filter((line) => line.scanDate || line.finding || line.weeks || line.placenta || line.liquor || line.efw || line.anomaly);
  return {
    bloodGroup: exam.bloodGroup.trim() || null,
    hb: exam.hb.trim() || null,
    hbDate: exam.hbDate || null,
    urineRe: exam.urineRe.trim() || null,
    urineReDate: exam.urineReDate || null,
    usg,
    slf: exam.slf.trim() || null,
    pulse: exam.pulse.trim() || null,
    bp: exam.bp.trim() || null,
    spo2: exam.spo2.trim() || null,
    rr: exam.rr.trim() || null,
    perAbdomen: exam.perAbdomen.trim() || null,
    uterusSize: exam.uterusSize.trim() || null,
    uterusSizeDate: exam.uterusSizeDate || null,
    fetalMovements: exam.fetalMovements.trim() || null,
    fetalHeartSound: exam.fetalHeartSound.trim() || null,
    fetalHeartDoppler: exam.fetalHeartDoppler.trim() || null,
    scarTenderness: exam.scarTenderness.trim() || null,
  };
}

function antenatalLines(exam: ReturnType<typeof antenatalPayload>) {
  const usg = exam.usg.map((line) => [
    line.scanDate ? `Scan date ${line.scanDate}` : null,
    line.finding,
    line.weeks ? `POG ${line.weeks}` : null,
    line.placenta ? `Placenta ${line.placenta}` : null,
    line.liquor ? `Liquor ${line.liquor}` : null,
    line.efw ? `EFW ${line.efw}` : null,
    line.anomaly,
  ].filter(Boolean).join(", "));
  return [
    exam.bloodGroup ? `Blood group: ${exam.bloodGroup}` : null,
    exam.hb ? `Hb: ${exam.hb}${exam.hbDate ? ` (${exam.hbDate})` : ""}` : null,
    exam.urineRe ? `Urine RE: ${exam.urineRe}${exam.urineReDate ? ` (${exam.urineReDate})` : ""}` : null,
    usg.length ? `USG: ${usg.join("; ")}` : null,
    exam.slf ? `SLF: ${exam.slf}` : null,
    exam.pulse ? `PR: ${exam.pulse}` : null,
    exam.bp ? `BP: ${exam.bp}` : null,
    exam.spo2 ? `SpO2: ${exam.spo2}%` : null,
    exam.rr ? `RR: ${exam.rr} breaths/min` : null,
    exam.perAbdomen ? `P/A: ${exam.perAbdomen}` : null,
    exam.uterusSize ? `Uterus: ${exam.uterusSize}${exam.uterusSizeDate ? ` (${exam.uterusSizeDate})` : ""}` : null,
    exam.fetalMovements ? `FM: ${exam.fetalMovements}` : null,
    exam.fetalHeartSound ? `FHS: ${exam.fetalHeartSound}` : null,
    exam.fetalHeartDoppler ? `Fetal heart Doppler: ${exam.fetalHeartDoppler}` : null,
    exam.scarTenderness ? `Scar tenderness: ${exam.scarTenderness}` : null,
  ].filter(Boolean) as string[];
}

const TEST_CATEGORY = /lab|test|diagnos|usg|ultra|scan|sono/i;
const USG_CATEGORY = /usg|ultra|scan|sono/i;

interface Props {
  appointment: any | null;
  patient: any | null;
  onClose: () => void;
  onSaved?: (patientId: number) => void;
}

export function PrescriptionEntryDialog({ appointment, patient, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMedicine()]);
  const [tests, setTests] = useState<TestLine[]>([]);
  const [lmp, setLmp] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [patientType, setPatientType] = useState("General");
  const [eodDraft, setEod] = useState("");
  const [pogDraft, setPog] = useState("");
  const [gravida, setGravida] = useState("");
  const [surgicalHistory, setSurgicalHistory] = useState("");
  const [antenatal, setAntenatal] = useState<AntenatalExam>(emptyAntenatal());
  const pregnant = /pregnant/i.test(patientType);
  const antenatalExam = pregnant ? antenatalPayload(antenatal) : null;
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [examination, setExamination] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpDateOverride, setFollowUpDateOverride] = useState<string | null>(null);
  const [newTest, setNewTest] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [entered, setEntered] = useState(false);
  const closing = useRef(false);
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const [step, setStep] = useState<EntryStep>("patient");
  const fileRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const patientId = appointment?.patientId ?? patient?.id;
  const editing = !!appointment?.edit;
  const needsDate = !appointment?.id || editing;
  const recordedVitals = {
    pulse: antenatal.pulse.trim() || null,
    bp: antenatal.bp.trim() || null,
    spo2: antenatal.spo2.trim() || null,
    rr: antenatal.rr.trim() || null,
  };
  const visitDate = prescriptionDate || String(appointment?.date || "").slice(0, 10);
  const lmpDating = pregnant ? pregnancyDatingFromLmp(lmp, visitDate) : null;
  const datingEstimate = pregnant && !lmp ? estimatePregnancyDating({
    asOf: visitDate,
    pog: pogDraft,
    dueDate: eodDraft,
    scans: antenatal.usg,
  }) : null;
  const eod = eodDraft || lmpDating?.dueDate || datingEstimate?.dueDate || "";
  const pog = pogDraft || lmpDating?.pog || datingEstimate?.pog || "";
  const followUpDate = followUpDateOverride ?? prescriptionDueDate(followUp, visitDate) ?? "";
  const changePrescriptionDate = (date: string) => {
    setPrescriptionDate(date);
    setFollowUpDateOverride(null);
    const dating = pregnancyDatingFromLmp(lmp || datingEstimate?.estimatedLmp || "", date);
    setEod(dating?.dueDate || "");
    setPog(dating?.pog || "");
  };
  const suggestedTests = prescriptionTestOptions(patientType, pregnancyWeeks(pog, lmp || datingEstimate?.estimatedLmp || "", prescriptionDate || String(appointment?.date || "").slice(0, 10)));
  const steps: { id: EntryStep; label: string; description: string }[] = [
    { id: "patient", label: "Patient & date", description: "Start with the prescription date and patient details." },
    { id: "examination", label: "Complaint & O/E", description: "Record the complaint, examination and diagnosis. Leave anything not recorded blank." },
    ...(pregnant ? [{ id: "scans" as const, label: "Ultrasound scans", description: "Add scan findings if available. Blood test results belong in the separate report section." }] : []),
    { id: "medicines", label: "Medicines", description: "Add the medicines from the prescription, or continue if there are none." },
    { id: "plan", label: "Plan & save", description: "Add advised tests, advice and follow-up, then save the prescription." },
  ];
  const stepIndex = steps.findIndex((item) => item.id === step);
  const currentStep = steps[stepIndex];

  const goToStep = (next: EntryStep) => {
    if (needsDate && !/^\d{4}-\d{2}-\d{2}$/.test(prescriptionDate)) {
      toast({ title: "Enter the prescription date", variant: "destructive" });
      setStep("patient");
      return;
    }
    setStep(next);
  };

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    stepHeadingRef.current?.focus();
  }, [step]);

  const { data: visits = [], isFetched } = useQuery<any[]>({
    queryKey: ["/api/patients", patientId, "visit-history"],
    enabled: !!appointment && !!patientId,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/visit-history`);
      return res.ok ? res.json() : [];
    },
  });

  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["/api/patients", patientId, "invoices"],
    enabled: !!appointment && !!patientId,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/invoices`);
      return res.ok ? res.json() : [];
    },
  });

  const existing = visits.find((v: any) => v.appointmentId === appointment?.id) || null;

  const billedTests: TestLine[] = invoices
    .filter((inv: any) => inv.appointmentId === appointment?.id || String(inv.date).slice(0, 10) === String(appointment?.date).slice(0, 10))
    .flatMap((inv: any) => (Array.isArray(inv.items) ? inv.items : []))
    .filter((it: any) => TEST_CATEGORY.test(String(it.category || "")))
    .map((it: any) => ({
      name: String(it.name || it.description || ""),
      type: (USG_CATEGORY.test(String(it.category || "")) ? "usg" : "lab") as "lab" | "usg",
      fromBilling: true,
    }))
    .filter((t: TestLine) => t.name);
  const testOptions = [...suggestedTests.tests, ...billedTests, ...tests].filter((test, index, all) =>
    all.findIndex((item) => item.name.toLowerCase() === test.name.toLowerCase()) === index,
  );

  useEffect(() => {
    if (!appointment) return;
    setFollowUpDateOverride(appointment.historical && !appointment.draft ? null
      : existing?.vitals?.followUpDate ?? appointment.draft?.followUpDate ?? appointment.followUpDate ?? null);
    const draft = appointment.draft;
    if (draft) {
      const rx = existing?.prescriptions;
      const draftMedicines = Array.isArray(draft.medicines) ? draft.medicines : [];
      const savedMedicines = Array.isArray(rx?.medicines) ? rx.medicines : Array.isArray(rx) ? rx : [];
      setMedicines((savedMedicines.length ? savedMedicines : draftMedicines.length ? draftMedicines : [emptyMedicine()]));
      setTests(Array.isArray(existing?.labsOrdered) && existing.labsOrdered.length ? existing.labsOrdered : Array.isArray(draft.tests) ? draft.tests : []);
      const demo = demographicsFrom(patient, existing || { vitals: draft });
      setLmp(String(existing?.vitals?.lmp || draft.lmp || demo.lmp || "").slice(0, 10));
      setHeight(existing?.vitals?.height != null ? String(existing.vitals.height) : draft.height != null ? String(draft.height) : demo.height);
      setWeight(existing?.vitals?.weight != null ? String(existing.vitals.weight) : draft.weight != null ? String(draft.weight) : demo.weight);
      setAge(existing?.vitals?.age != null ? String(existing.vitals.age) : draft.age != null ? String(draft.age) : demo.age);
      setPatientType(existing?.vitals?.patientType || draft.patientType || demo.patientType);
      const obstetric = obstetricFrom(existing?.vitals, patient, draft);
      setEod(existing?.vitals?.eod || draft.eod || (demo.lmp ? "" : obstetric.eod));
      setPog(existing?.vitals?.pog || draft.pog || (demo.lmp ? "" : obstetric.pog));
      setGravida(obstetric.gravida);
      setSurgicalHistory(obstetric.surgicalHistory);
      setAntenatal(antenatalFrom(existing?.vitals, patient, draft, existing?.examination));
      setChiefComplaint(existing?.chiefComplaint || draft.chiefComplaint || "");
      setExamination(typeof existing?.examination === "string" ? existing.examination : existing?.examination?.findings || existing?.objective || draft.examination || "");
      setDiagnosis(existing?.diagnosis || draft.diagnosis || "");
      setAdvice(existing?.planNotes || draft.advice || "");
      setFollowUp(existing?.followUpPlan || draft.followUp || "");
      setPrescriptionDate(String(draft.prescriptionDate || existing?.date || appointment.date || "").slice(0, 10));
      return;
    }
    if (appointment.historical) {
      setMedicines([emptyMedicine()]);
      setTests([]);
      setChiefComplaint("");
      setExamination("");
      setDiagnosis("");
      setAdvice("");
      setFollowUp("");
      setPrescriptionDate("");
      setScanned(false);
      const demo = demographicsFrom(patient);
      setLmp(demo.lmp);
      setHeight(demo.height);
      setWeight(demo.weight);
      setAge(demo.age);
      setPatientType(demo.patientType);
      const obstetric = obstetricFrom(null, patient);
      setEod(demo.lmp ? "" : obstetric.eod);
      setPog(demo.lmp ? "" : obstetric.pog);
      setGravida(obstetric.gravida);
      setSurgicalHistory(obstetric.surgicalHistory);
      setAntenatal(antenatalFrom(null, patient));
      return;
    }
    if (!isFetched) return;
    const rx: any = existing?.prescriptions || {};
    setMedicines(Array.isArray(rx.medicines) && rx.medicines.length ? rx.medicines : Array.isArray(rx) && rx.length ? rx : [emptyMedicine()]);
    setTests(Array.isArray(existing?.labsOrdered) ? (existing!.labsOrdered as TestLine[]) : []);
    const demo = demographicsFrom(patient, existing);
    setLmp(demo.lmp);
    setHeight(demo.height);
    setWeight(demo.weight);
    setAge(demo.age);
    setPatientType(demo.patientType);
    const obstetric = obstetricFrom(existing?.vitals, patient);
    setEod(existing?.vitals?.eod || (demo.lmp ? "" : obstetric.eod));
    setPog(existing?.vitals?.pog || (demo.lmp ? "" : obstetric.pog));
    setGravida(obstetric.gravida);
    setSurgicalHistory(obstetric.surgicalHistory);
    setAntenatal(antenatalFrom(existing?.vitals, patient, undefined, existing?.examination));
    setChiefComplaint(existing?.chiefComplaint || "");
    setExamination(typeof existing?.examination === "string" ? existing.examination : existing?.examination?.findings || existing?.objective || "");
    setDiagnosis(existing?.diagnosis || "");
    setAdvice(existing?.planNotes || "");
    setFollowUp(existing?.followUpPlan || "");
    setPrescriptionDate(String(existing?.date || appointment.date || "").slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment, isFetched, existing?.id, patient?.id]);

  const scanFile = async (file: File) => {
    if (!patientId) return;
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/patients/${patientId}/parse-prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: base64, mimeType: file.type || "application/pdf", fileName: file.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not read the prescription");
      if (data.medicines?.length) setMedicines(data.medicines);
      if (data.tests?.length) {
        setTests((prev) => [...prev, ...data.tests.filter((t: TestLine) => !prev.some((x) => x.name.toLowerCase() === t.name.toLowerCase()))]);
      }
      if (data.diagnosis) setDiagnosis(data.diagnosis);
      if (data.advice) setAdvice(data.advice);
      if (data.followUp) {
        setFollowUp(data.followUp);
        setFollowUpDateOverride(null);
      }
      if (needsDate && data.prescriptionDate && /^\d{4}-\d{2}-\d{2}$/.test(data.prescriptionDate)) {
        changePrescriptionDate(data.prescriptionDate);
      }
      setScanned(true);
      toast({ title: "Prescription read", description: "Please check every field against the paper copy before saving." });
    } catch (err: any) {
      toast({ title: "Could not read prescription", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addTest = (t: TestLine) => {
    if (tests.some((x) => x.name.toLowerCase() === t.name.toLowerCase())) return;
    setTests([...tests, t]);
  };

  const updateMedicine = (i: number, key: keyof Medicine, value: string) =>
    setMedicines(medicines.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));

  const saveOnCurrentServer = async () => {
    const visitDate = (prescriptionDate || String(appointment?.date || "")).slice(0, 10);
    let visitAppointment = appointment?.id ? appointment : null;
    if (!visitAppointment) {
      const listed = await fetch(`/api/appointments?date=${visitDate}`);
      const all = await readApiJson(listed);
      visitAppointment = (Array.isArray(all) ? all : []).find((item: any) =>
        item.patientId === patientId && item.status !== "cancelled",
      );
    }
    if (!visitAppointment) {
      const today = new Date().toISOString().slice(0, 10);
      const created = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          date: visitDate,
          time: "09:00",
          duration: 15,
          type: "Consultation",
          visitType: "Consultation",
          visitMode: "in-clinic",
          status: visitDate <= today ? "completed" : "scheduled",
          chiefComplaint: chiefComplaint.trim() || null,
          reason: chiefComplaint.trim() || diagnosis.trim() || "Historical prescription",
          notes: "Created automatically from a manually entered prescription",
          completedAt: visitDate <= today ? `${visitDate}T09:00:00.000Z` : null,
        }),
      });
      visitAppointment = await readApiJson(created);
      if (!created.ok) throw new Error(visitAppointment.error || "Could not create the visit for this prescription date");
    }
    if (visitAppointment?.id && String(visitAppointment.date || "").slice(0, 10) !== visitDate) {
      await fetch(`/api/appointments/${visitAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: visitDate, chiefComplaint: chiefComplaint.trim() || null, reason: chiefComplaint.trim() || diagnosis.trim() || "Historical prescription" }),
      });
    }
    const followUpRes = await fetch(`/api/appointments/${visitAppointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpDate: followUpDate || null, followUpNotes: followUp.trim() || null }),
    });
    if (!followUpRes.ok) throw new Error("Could not save the follow-up date for receptionist reminders");

    const namedMedicines = medicines.filter((med) => med.name.trim());
    const listedVisits = await fetch(`/api/patients/${patientId}/visit-history`);
    const allVisits = await readApiJson(listedVisits);
    const matchedVisit = existing || (Array.isArray(allVisits) ? allVisits.find((visit: any) => visit.appointmentId === visitAppointment.id) : null);
    const saved = await fetch(matchedVisit ? `/api/visit-history/${matchedVisit.id}` : `/api/patients/${patientId}/visit-history`, {
      method: matchedVisit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: visitAppointment.id,
        providerId: visitAppointment.providerId ?? null,
        date: visitDate,
        visitType: visitAppointment.type || visitAppointment.visitType || "Consultation",
        chiefComplaint: chiefComplaint.trim() || null,
        subjective: chiefComplaint.trim() || null,
        examination: examination.trim() ? { findings: examination.trim() } : null,
        objective: examination.trim() || null,
        vitals: {
          ...recordedVitals,
          datingEstimate,
          followUpDate: followUpDate || null,
          lmp: lmp || null,
          height: height.trim() || null,
          weight: weight.trim() ? Number(weight) : null,
          age: age.trim() ? Number(age) : null,
          patientType: patientType || null,
          eod: pregnant ? eod || null : null,
          pog: pregnant ? pog.trim() || null : null,
          gravida: pregnant ? gravida.trim() || null : null,
          surgicalHistory: pregnant ? surgicalHistory.trim() || null : null,
          antenatal: antenatalExam,
        },
        diagnosis,
        planNotes: advice,
        followUpPlan: followUp,
        prescriptions: {
          source: scanned ? "paper-scanned-reviewed" : "paper-transcribed",
          enteredAt: existing?.prescriptions?.enteredAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          medicines: namedMedicines,
        },
        labsOrdered: tests,
      }),
    });
    const savedBody = await readApiJson(saved);
    if (!saved.ok) throw new Error(savedBody.error || "Failed to save");
    const summary = [
      `Prescription date: ${visitDate}`,
      datingEstimate ? `Estimated LMP equivalent: ${datingEstimate.estimatedLmp} (from ${datingEstimate.source}; not patient-reported)` : null,
      patientType.trim() ? `Patient type: ${patientType.trim()}` : null,
      pregnant && eod ? `EDD: ${eod}` : null,
      pregnant && pog.trim() ? `POG: ${pog.trim()}` : null,
      pregnant && gravida.trim() ? `Gravida: ${gravida.trim()}` : null,
      pregnant && surgicalHistory.trim() ? `Past surgery: ${surgicalHistory.trim()}` : null,
      ...(antenatalExam ? antenatalLines(antenatalExam) : []),
      ...(!pregnant ? [
        recordedVitals.pulse ? `PR: ${recordedVitals.pulse}` : null,
        recordedVitals.bp ? `BP: ${recordedVitals.bp}` : null,
        recordedVitals.spo2 ? `SpO2: ${recordedVitals.spo2}%` : null,
        recordedVitals.rr ? `RR: ${recordedVitals.rr} breaths/min` : null,
      ] : []),
      chiefComplaint.trim() ? `Chief complaint: ${chiefComplaint.trim()}` : null,
      followUpDate ? `Follow-up date: ${followUpDate}` : null,
      examination.trim() ? `O/E: ${examination.trim()}` : null,
      namedMedicines.length ? `Medicines: ${namedMedicines.map((med) => med.name.trim()).join(", ")}` : "No medicines entered",
    ].filter(Boolean).join("\n");
    const listedDocs = await fetch(`/api/patients/${patientId}/documents`);
    const docs = await readApiJson(listedDocs);
    const existingDoc = Array.isArray(docs) ? docs.find((doc: any) => doc.metadata?.source === "manual-entry" && doc.metadata?.appointmentId === visitAppointment.id) : null;
    const recorded = await fetch(existingDoc ? `/api/documents/${existingDoc.id}` : `/api/patients/${patientId}/documents`, {
      method: existingDoc ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Prescription - ${visitDate}`,
        type: "Prescription",
        category: "prescription",
        date: visitDate,
        description: summary,
        metadata: {
          source: "manual-entry",
          appointmentId: visitAppointment.id,
          savedMedications: namedMedicines.map((med) => med.name.trim()),
          patientType: patientType.trim() || null,
          eod: pregnant ? eod || null : null,
          pog: pregnant ? pog.trim() || null : null,
          gravida: pregnant ? gravida.trim() || null : null,
          surgicalHistory: pregnant ? surgicalHistory.trim() || null : null,
          antenatal: antenatalExam,
          datingEstimate,
          followUpDate: followUpDate || null,
        },
      }),
    });
    const recordedBody = await readApiJson(recorded);
    if (!recorded.ok) throw new Error(recordedBody.error || "The visit was saved, but it could not be added to the patient record");
    const patientPatch: Record<string, unknown> = {};
    if (lmp) patientPatch.lmp = lmp;
    if (height.trim()) patientPatch.height = height.trim();
    if (weight.trim() && !Number.isNaN(Number(weight))) patientPatch.weight = Number(weight);
    if (age.trim() && !Number.isNaN(Number(age))) patientPatch.age = Number(age);
    if (patientType.trim()) patientPatch.type = patientType.trim();
    if (pregnant) {
      patientPatch.pregnancyStatus = "pregnant";
      const existingHistory = patient?.history && typeof patient.history === "object" ? patient.history : {};
      patientPatch.history = {
        ...existingHistory,
        obstetric: {
          ...(existingHistory.obstetric || {}),
          eod: eod || null,
          pog: pog.trim() || null,
          gravida: gravida.trim() || null,
          surgicalHistory: surgicalHistory.trim() || null,
          bloodGroup: antenatal.bloodGroup.trim() || existingHistory.obstetric?.bloodGroup || null,
          antenatal: antenatalPayload(antenatal),
          datingEstimate,
        },
      };
    }
    if (Object.keys(patientPatch).length > 0) {
      const patientRes = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientPatch),
      });
      if (!patientRes.ok) throw new Error("Prescription was saved, but the patient details could not be updated");
    }
    if (!matchedVisit) await Promise.all(namedMedicines.map((med) => fetch(`/api/patients/${patientId}/medications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: med.name.trim(),
        dose: med.dose || null,
        frequency: med.frequency || null,
        startDate: visitDate,
        status: "active",
        notes: [med.duration ? `Duration: ${med.duration}` : "", med.instructions || ""].filter(Boolean).join(". ") || null,
      }),
    })));
  };

  const persistExamination = async (appointmentId?: number) => {
    if (!patientId) return;
    const visitDate = (prescriptionDate || String(appointment?.date || "")).slice(0, 10);
    const visitsRes = await fetch(`/api/patients/${patientId}/visit-history`);
    const visits = await readApiJson(visitsRes);
    const visit = Array.isArray(visits)
      ? visits.find((item: any) => appointmentId && item.appointmentId === appointmentId) || visits.find((item: any) => String(item.date || "").slice(0, 10) === visitDate)
      : null;
    if (!visit?.id) throw new Error("The examination could not be attached to this visit");
    const patched = await fetch(`/api/visit-history/${visit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vitals: { ...(visit.vitals || {}), ...recordedVitals, datingEstimate, followUpDate: followUpDate || null, patientType: patientType || visit.vitals?.patientType || null, antenatal: antenatalExam },
        examination: {
          ...(visit.examination && typeof visit.examination === "object" ? visit.examination : {}),
          findings: examination.trim() || visit.examination?.findings || visit.objective || "",
          scans: antenatalExam?.usg || [],
        },
      }),
    });
    const patchedBody = await readApiJson(patched);
    const savedScanDates = (patchedBody?.vitals?.antenatal?.usg || []).map((line: any) => toIsoDate(line?.scanDate || line?.date));
    const missingScanDate = antenatalExam?.usg.some((line) => line.scanDate && !savedScanDates.includes(line.scanDate));
    const missingVitals = Object.entries(recordedVitals).some(([key, value]) => value !== (patchedBody?.vitals?.[key] ?? null));
    if (!patched.ok || (antenatalExam?.usg.length && !patchedBody?.vitals?.antenatal?.usg?.length) || missingScanDate || missingVitals) {
      throw new Error(patchedBody.error || "The examination or scan details were not saved");
    }
    const docsRes = await fetch(`/api/patients/${patientId}/documents`);
    const docs = await readApiJson(docsRes);
    const doc = Array.isArray(docs)
      ? docs.find((item: any) => item.metadata?.source === "manual-entry" && (item.metadata?.appointmentId === appointmentId || String(item.date || "").slice(0, 10) === visitDate))
      : null;
    if (!doc?.id) return;
    const usgSummary = antenatalExam ? antenatalLines(antenatalExam).find((line) => line.startsWith("USG:")) : undefined;
    const description = String(doc.description || "")
      .split("\n")
      .filter((line) => line && !/^(USG:|PR:|BP:|SpO2:|RR:|Estimated LMP equivalent:)/.test(line))
      .concat([
        ...(datingEstimate ? [`Estimated LMP equivalent: ${datingEstimate.estimatedLmp} (from ${datingEstimate.source}; not patient-reported)`] : []),
        ...(usgSummary ? [usgSummary] : []),
        ...Object.entries(recordedVitals).filter(([, value]) => value !== null).map(([key, value]) =>
          `${({ pulse: "PR", bp: "BP", spo2: "SpO2", rr: "RR" })[key as keyof typeof recordedVitals]}: ${value}${key === "spo2" ? "%" : key === "rr" ? " breaths/min" : ""}`),
      ])
      .join("\n");
    const recorded = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        metadata: { ...(doc.metadata || {}), vitals: recordedVitals, datingEstimate, antenatal: antenatalExam },
      }),
    });
    if (!recorded.ok) throw new Error("The examination was saved on the visit, but not on the patient record");
  };

  const closePage = () => {
    if (closing.current) return;
    closing.current = true;
    setEntered(false);
    window.setTimeout(() => {
      closing.current = false;
      onClose();
    }, 280);
  };

  useEffect(() => {
    setStep("patient");
    if (!appointment) {
      setEntered(false);
      return;
    }
    setEntered(false);
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [appointment]);

  const save = async () => {
    if (!patientId || (!appointment?.id && !appointment?.historical && !patient)) return;
    if (needsDate && !/^\d{4}-\d{2}-\d{2}$/.test(prescriptionDate)) {
      toast({ title: "Enter the prescription date", variant: "destructive" });
      return;
    }
    if (followUpDate && (!parseCallDate(followUpDate) || followUpDate < visitDate)) {
      toast({ title: "Check the follow-up date", description: "Enter a valid date on or after the prescription date.", variant: "destructive" });
      setStep("plan");
      return;
    }
    if ((antenatal.spo2 && (!Number.isFinite(Number(antenatal.spo2)) || Number(antenatal.spo2) < 0 || Number(antenatal.spo2) > 100)) ||
        (antenatal.rr && (!Number.isInteger(Number(antenatal.rr)) || Number(antenatal.rr) < 0))) {
      toast({ title: "Check vitals", description: "SpO2 must be between 0 and 100%. RR must be a non-negative whole number.", variant: "destructive" });
      setStep("examination");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/manual-prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment?.id ?? null,
          prescriptionDate: prescriptionDate || String(appointment?.date || "").slice(0, 10),
          chiefComplaint: chiefComplaint.trim(),
          examination: examination.trim(),
          lmp,
          height: height.trim(),
          weight: weight.trim(),
          age: age.trim(),
          patientType,
          vitals: recordedVitals,
          datingEstimate,
          eod: pregnant ? eod : "",
          pog: pregnant ? pog : "",
          gravida: pregnant ? gravida : "",
          surgicalHistory: pregnant ? surgicalHistory : "",
          antenatal: antenatalExam,
          diagnosis,
          advice,
          followUp,
          followUpDate,
          medicines: medicines.filter((med) => med.name.trim()),
          tests,
          scanned,
        }),
      });
      const raw = await res.text();
      const routeMissing = res.status === 404 || raw.includes("Cannot POST") || raw.trimStart().startsWith("<");
      let savedAppointmentId = appointment?.id;
      if (routeMissing) {
        await saveOnCurrentServer();
      } else {
        const body = raw.trim() ? JSON.parse(raw) : {};
        if (!res.ok) throw new Error(body.error || "Could not save prescription");
        savedAppointmentId = body.appointment?.id || body.visit?.appointmentId || appointment?.id;
      }
      await persistExamination(savedAppointmentId);
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicine-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-calls"] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/documents`] });
      toast({ title: editing ? "Prescription updated" : appointment?.id ? "Prescription recorded" : "Prescription recorded and visit created" });
      onSaved?.(patientId);
      closePage();
    } catch (err: any) {
      toast({ title: "Could not save prescription", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) return null;

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col bg-background transition-transform duration-300 ease-out ${entered ? "translate-x-0" : "translate-x-full"}`}>
      <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
        <Button type="button" variant="outline" onClick={closePage} disabled={saving} data-testid="btn-rx-close">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Close
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{editing ? "Edit prescription" : "Record prescription"}{patient?.name ? ` — ${patient.name}` : ""}</h1>
          <p className="text-sm text-muted-foreground">
            {editing
              ? "Update this record, then close to return to the list."
              : needsDate
              ? "Enter the paper prescription. Close returns to the patient list."
              : `Visit on ${String(appointment.date).slice(0, 10)}. Close returns to the list.`}
          </p>
        </div>
      </header>
      <nav aria-label="Prescription entry steps" className="border-b px-4 py-3 sm:px-6">
        <ol className="mx-auto flex max-w-3xl gap-2 overflow-x-auto">
          {steps.map((item, index) => (
            <li key={item.id} className="shrink-0">
              <Button type="button" size="sm" variant={step === item.id ? "default" : "ghost"} aria-current={step === item.id ? "step" : undefined} disabled={saving || scanning} onClick={() => goToStep(item.id)} data-testid={`btn-rx-step-${item.id}`}>
                {index + 1}. {item.label}
              </Button>
            </li>
          ))}
        </ol>
      </nav>
      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs text-muted-foreground">Step {stepIndex + 1} of {steps.length}</p>
          <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-1 text-xl font-semibold outline-none">{currentStep.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{currentStep.description}</p>
        </div>

        <div className="space-y-5">
          {step === "patient" && (
          <>
          {needsDate && (
            <div className="space-y-1">
              <Label>Prescription date</Label>
              <Input type="date" value={prescriptionDate} onChange={(e) => changePrescriptionDate(e.target.value)} data-testid="input-rx-date" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>LMP</Label>
              <Input type="date" value={lmp} onChange={(e) => {
                setLmp(e.target.value);
                setEod("");
                setPog("");
              }} data-testid="input-rx-lmp" />
              <p className="text-xs text-muted-foreground">Leave blank if unknown. We can estimate dating from POG, due date or a dated scan.</p>
            </div>
            <div className="space-y-1">
              <Label>Age</Label>
              <Input type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} data-testid="input-rx-age" />
            </div>
            <div className="space-y-1">
              <Label>Patient type</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={patientType} onChange={(e) => {
                const next = e.target.value;
                setPatientType(next);
                if (/pregnant/i.test(next)) {
                  const obstetric = obstetricFrom(null, patient);
                  if (!lmp) {
                    setEod((current) => current || obstetric.eod);
                    setPog((current) => current || obstetric.pog);
                  }
                  setGravida((current) => current || obstetric.gravida);
                  setSurgicalHistory((current) => current || obstetric.surgicalHistory);
                }
              }} data-testid="input-rx-patient-type">
                {[...new Set([patientType, ...PATIENT_TYPES])].filter(Boolean).map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Height (cm)</Label>
              <Input type="number" min="0" value={height} onChange={(e) => setHeight(e.target.value)} data-testid="input-rx-height" />
            </div>
            <div className="space-y-1">
              <Label>Weight (kg)</Label>
              <Input type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} data-testid="input-rx-weight" />
            </div>
          </div>
          {pregnant && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-saivie-border p-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>EDD</Label>
                <Input type="date" value={eod} onChange={(e) => {
                  setEod(e.target.value);
                  if (!lmp) setPog("");
                }} data-testid="input-rx-eod" />
                <p className="text-[11px] text-muted-foreground">Expected date of delivery. Calculated automatically when dating is available; editable.</p>
              </div>
              <div className="space-y-1">
                <Label>POG</Label>
                <Input value={pog} onChange={(e) => {
                  setPog(e.target.value);
                  if (!lmp) setEod("");
                }} placeholder="28 weeks 3 days" data-testid="input-rx-pog" />
                <p className="text-xs text-muted-foreground">Calculated automatically from LMP and the prescription date; editable. Not the scan date.</p>
              </div>
              <div className="space-y-1">
                <Label>Gravida</Label>
                <Input value={gravida} onChange={(e) => setGravida(e.target.value)} placeholder="G2 P1" data-testid="input-rx-gravida" />
              </div>
              <div className="space-y-1">
                <Label>Past surgery</Label>
                <Input value={surgicalHistory} onChange={(e) => setSurgicalHistory(e.target.value)} placeholder="CS / LSCS" data-testid="input-rx-surgery" />
              </div>
              {!lmp && (
                <div className="col-span-2 rounded-md bg-muted/30 p-3 text-sm" data-testid="rx-dating-estimate">
                  {datingEstimate ? (
                    <>
                      <p className="font-medium">Estimated LMP equivalent: {datingEstimate.estimatedLmp}</p>
                      <p>Estimated due date: {datingEstimate.dueDate} · POG: {datingEstimate.pog}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Based on {datingEstimate.source === "scan" ? `the earliest entered dated scan (${datingEstimate.sourceDate})` : datingEstimate.source === "due-date" ? "the entered due date" : "POG at the prescription date"}. Saved separately from reported LMP. Clinician confirmation is needed; this does not establish or change the official pregnancy dating.</p>
                    </>
                  ) : <p className="text-muted-foreground">LMP unknown? Enter POG with the prescription date, an expected due date, or scan date and scan POG in the ultrasound step.</p>}
                </div>
              )}
            </div>
          )}
          <div className="rounded-lg border border-dashed border-saivie-border bg-saivie-surface-muted/50 p-3">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" data-testid="input-rx-file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) scanFile(f); }} />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-saivie-plum">
                {scanned ? "Filled from the photo — review and correct below." : "Have a photo of the paper prescription? Upload it and the fields below are filled in for you to check."}
              </p>
              <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={scanning} onClick={() => fileRef.current?.click()} data-testid="btn-rx-scan">
                {scanning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Camera className="mr-1 h-4 w-4" />}
                {scanning ? "Reading..." : "Upload photo"}
              </Button>
            </div>
          </div>

          </>
          )}
          {step === "examination" && (
          <>
          <div className="space-y-1">
            <Label>Chief complaint</Label>
            <Textarea rows={2} placeholder="Why the patient came in" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} data-testid="input-rx-chief-complaint" />
          </div>

          <div className="space-y-1">
            <Label>O/E</Label>
            <Textarea rows={2} placeholder="On examination" value={examination} onChange={(e) => setExamination(e.target.value)} data-testid="input-rx-examination" />
              <fieldset className="rounded-lg border border-saivie-border p-3">
                <legend className="px-1 text-sm font-semibold">Vitals</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="input-rx-pulse">PR (pulse rate)</Label>
                    <Input id="input-rx-pulse" value={antenatal.pulse} onChange={(e) => setAntenatal({ ...antenatal, pulse: e.target.value })} placeholder="Beats per minute" data-testid="input-rx-pulse" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="input-rx-bp">BP (blood pressure)</Label>
                    <Input id="input-rx-bp" value={antenatal.bp} onChange={(e) => setAntenatal({ ...antenatal, bp: e.target.value })} placeholder="120/80" data-testid="input-rx-bp" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="input-rx-spo2">SpO2 (oxygen saturation, %)</Label>
                    <Input id="input-rx-spo2" type="number" min="0" max="100" step="0.1" value={antenatal.spo2} onChange={(e) => setAntenatal({ ...antenatal, spo2: e.target.value })} placeholder="%" data-testid="input-rx-spo2" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="input-rx-rr">RR (respiratory rate)</Label>
                    <Input id="input-rx-rr" type="number" min="0" step="1" value={antenatal.rr} onChange={(e) => setAntenatal({ ...antenatal, rr: e.target.value })} placeholder="Breaths per minute" data-testid="input-rx-rr" />
                  </div>
                </div>
              </fieldset>
            {pregnant && (
              <div className="space-y-3 rounded-lg border border-saivie-border p-3">
                <fieldset className="rounded-md border p-3">
                  <legend className="px-1 text-sm font-semibold">Per abdomen</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ExamSelect label="Uterus size" value={antenatal.uterusSize} options={UTERUS_SIZES} onChange={(value) => setAntenatal({ ...antenatal, uterusSize: value })} testId="input-rx-uterus" />
                    <ExamSelect label="Fetal movement" value={antenatal.fetalMovements} options={["Perceived", "Not perceived", "Decreased"]} onChange={(value) => setAntenatal({ ...antenatal, fetalMovements: value })} testId="input-rx-fm" />
                    <ExamSelect label="Fetal heart sound" value={antenatal.fetalHeartSound} options={FETAL_HEART_SOUNDS} unit=" bpm" onChange={(value) => setAntenatal({ ...antenatal, fetalHeartSound: value })} testId="input-rx-fhs" />
                    <ExamSelect label="Scar tenderness" value={antenatal.scarTenderness} options={["Present", "Absent", "NA"]} onChange={(value) => setAntenatal({ ...antenatal, scarTenderness: value })} testId="input-rx-scar" />
                  </div>
                </fieldset>
                <div className="space-y-1">
                  <Label htmlFor="input-rx-doppler">Fetal heart Doppler (optional)</Label>
                  <Input id="input-rx-doppler" value={antenatal.fetalHeartDoppler} onChange={(e) => setAntenatal({ ...antenatal, fetalHeartDoppler: e.target.value })} placeholder="Doppler findings" data-testid="input-rx-doppler" />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Diagnosis / notes</Label>
            <Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} data-testid="input-rx-diagnosis" />
          </div>
          </>
          )}
          {step === "scans" && pregnant && (
                <div className="space-y-2">
                  <Label>USG</Label>
                  <p className="text-xs text-muted-foreground">Pick the date and select findings from the report. Leave anything not reported blank.</p>
                  {antenatal.usg.map((line, index) => (
                    <div key={index} className="space-y-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Scan {index + 1}</h3>
                        {antenatal.usg.length > 1 && (
                          <Button type="button" size="sm" variant="ghost" aria-label={`Remove scan ${index + 1}`} onClick={() => setAntenatal({ ...antenatal, usg: antenatal.usg.filter((_, i) => i !== index) })}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Scan date</Label>
                          <Input type="date" value={toIsoDate(line.scanDate)} onChange={(e) => setAntenatal({ ...antenatal, usg: antenatal.usg.map((item, i) => i === index ? { ...item, scanDate: e.target.value } : item) })} aria-label="Scan date" data-testid={`input-rx-usg-date-${index}`} />
                        </div>
                        <ScanGestation value={line.weeks} index={index} onChange={(value) => setAntenatal({ ...antenatal, usg: antenatal.usg.map((item, i) => i === index ? { ...item, weeks: value } : item) })} />
                        <ScanSelect label="Finding" value={line.finding} options={["Single live fetus", "Live twin pregnancy", "Multiple live fetuses", "Intrauterine gestational sac"]} onChange={(value) => setAntenatal({ ...antenatal, usg: antenatal.usg.map((item, i) => i === index ? { ...item, finding: value } : item) })} testId={`input-rx-usg-finding-${index}`} />
                        <ScanSelect label="Placenta" value={line.placenta} options={["Anterior", "Posterior", "Fundal", "Anterior upper segment", "Posterior upper segment", "Lateral", "Low-lying", "Placenta previa"]} onChange={(value) => setAntenatal({ ...antenatal, usg: antenatal.usg.map((item, i) => i === index ? { ...item, placenta: value } : item) })} testId={`input-rx-usg-placenta-${index}`} />
                        <ScanSelect label="Liquor (amniotic fluid)" value={line.liquor} options={["Adequate", "Reduced", "Increased", "Oligohydramnios", "Polyhydramnios"]} onChange={(value) => setAntenatal({ ...antenatal, usg: antenatal.usg.map((item, i) => i === index ? { ...item, liquor: value } : item) })} testId={`input-rx-usg-liquor-${index}`} />
                        <div className="space-y-1">
                          <ScanSelect label="Estimated fetal weight" value={line.efw} options={SCAN_WEIGHTS} onChange={(value) => setAntenatal({ ...antenatal, usg: antenatal.usg.map((item, i) => i === index ? { ...item, efw: value } : item) })} testId={`input-rx-usg-efw-${index}`} />
                          <p className="text-xs text-muted-foreground">Use the exact report value; choose Other if needed. Do not round.</p>
                        </div>
                        <ScanSelect label="Anomaly" value={line.anomaly} options={["No gross anomaly detected", "Anomaly reported", "Assessment incomplete"]} onChange={(value) => setAntenatal({ ...antenatal, usg: antenatal.usg.map((item, i) => i === index ? { ...item, anomaly: value } : item) })} testId={`input-rx-usg-anomaly-${index}`} />
                      </div>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => setAntenatal({ ...antenatal, usg: [...antenatal.usg, emptyUsg()] })}>Add scan</Button>
                </div>
          )}

          {step === "medicines" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Medicines prescribed</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setMedicines([...medicines, emptyMedicine()])} data-testid="btn-rx-add-medicine">
                <Plus className="mr-1 h-3 w-3" /> Add medicine
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Type a name and select saved medicine details to prefill. Review dose, frequency, duration and instructions for this patient.</p>
            {medicines.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
                <div className="col-span-12 sm:col-span-4">
                  <MedicineAutocomplete value={m.name} onChange={(value) => updateMedicine(i, "name", value)} onSelect={(medicine) =>
                    setMedicines((current) => current.map((item, index) => index === i ? {
                      name: medicine.name, dose: medicine.dose, frequency: medicine.frequency,
                      duration: medicine.duration, instructions: medicine.instructions,
                    } : item))
                  } testId={`input-rx-med-name-${i}`} />
                </div>
                <MedicineDoseInput className="col-span-12 sm:col-span-4" label={`Medicine ${i + 1} dose`} value={m.dose || ""} onChange={(value) => updateMedicine(i, "dose", value)} testId={`input-rx-med-dose-${i}`} />
                <Input className="col-span-10 sm:col-span-2" placeholder="Duration" value={m.duration} onChange={(e) => updateMedicine(i, "duration", e.target.value)} />
                <Button type="button" size="icon" variant="ghost" className="col-span-2 justify-self-end" onClick={() => setMedicines(medicines.length > 1 ? medicines.filter((_, idx) => idx !== i) : [emptyMedicine()])}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <MedicineFrequencyInput className="col-span-12" label={`Medicine ${i + 1} frequency`} value={m.frequency} onChange={(value) => updateMedicine(i, "frequency", value)} testId={`input-rx-med-frequency-${i}`} />
                <Input className="col-span-12" placeholder="Instructions (e.g. after food)" value={m.instructions} onChange={(e) => updateMedicine(i, "instructions", e.target.value)} />
              </div>
            ))}
          </div>
          )}

          {step === "plan" && (
          <>
          <div className="space-y-2">
            <Label>Tests advised (lab / USG)</Label>
            <p className="text-xs text-muted-foreground">Tests ordered on this prescription, not report results.</p>
            <div className="rounded-md border bg-muted/30 p-3" data-testid="rx-test-context">
              <p className="text-sm font-medium">{suggestedTests.context}</p>
              <p className="mt-1 text-xs text-muted-foreground">Options for clinician review, not automatic orders. Confirm timing, prior results and local protocol. Only checked tests are saved.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["lab", "usg"] as const).map((type) => (
                <fieldset key={type} className="space-y-2 rounded-md border p-3">
                  <legend className="px-1 text-sm font-medium">{type === "lab" ? "Labs" : "USG / ultrasound"}</legend>
                  {testOptions.filter((test) => test.type === type).map((test) => (
                    <label key={test.name} className="flex cursor-pointer items-start gap-2 rounded p-1 text-sm">
                      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={tests.some((item) => item.name.toLowerCase() === test.name.toLowerCase())} onChange={(event) => {
                        if (event.target.checked) addTest(test);
                        else setTests(tests.filter((item) => item.name.toLowerCase() !== test.name.toLowerCase()));
                      }} />
                      <span>{test.name}{billedTests.some((item) => item.name.toLowerCase() === test.name.toLowerCase()) ? " (billed)" : ""}</span>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
            <div className="flex gap-2">
              <Input aria-label="Other test" placeholder="Other test (optional)" value={newTest} onChange={(e) => setNewTest(e.target.value)} data-testid="input-rx-test" />
              <Button type="button" variant="outline" disabled={!newTest.trim()} onClick={() => { addTest({ name: newTest.trim(), type: USG_CATEGORY.test(newTest) ? "usg" : "lab" }); setNewTest(""); }}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Advice</Label>
            <Textarea rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} data-testid="input-rx-advice" />
          </div>
          <div className="space-y-1">
            <Label>Follow-up</Label>
            <Input placeholder="e.g. Review after 5 days or after 2 weeks" value={followUp} onChange={(e) => {
              setFollowUp(e.target.value);
              setFollowUpDateOverride(null);
            }} data-testid="input-rx-followup" />
            <Label htmlFor="input-rx-followup-date">Follow-up date</Label>
            <Input id="input-rx-followup-date" type="date" min={visitDate} value={followUpDate} onChange={(e) => setFollowUpDateOverride(e.target.value)} data-testid="input-rx-followup-date" />
            <p className="text-xs text-muted-foreground">Calculated from the prescription date and the doctor's interval. Confirm or change the date for receptionist reminders.</p>
            {followUp.trim() && !followUpDate && <p className="text-xs text-amber-700">No follow-up date calculated. Enter a date or an interval such as "after 5 days".</p>}
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm" data-testid="rx-save-summary">
            <p className="font-medium">Ready to save</p>
            <p className="mt-1 text-muted-foreground">
              {patient?.name} · {prescriptionDate || String(appointment.date).slice(0, 10)} · {patientType}
            </p>
            <p className="mt-1 text-muted-foreground">
              {medicines.filter((medicine) => medicine.name.trim()).length} medicines
              {pregnant ? ` · ${antenatalExam?.usg.length || 0} scans` : ""}
              {` · ${tests.length} advised tests`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Use the steps above to check or change any section before saving.</p>
            {datingEstimate && <p className="mt-2 text-xs text-muted-foreground">Estimated LMP equivalent: {datingEstimate.estimatedLmp} · {datingEstimate.pog}. Not patient-reported; requires clinician confirmation.</p>}
          </div>
          </>
          )}
        </div>

        </div>
      </div>
      <footer className="flex items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
        <Button type="button" variant="outline" onClick={() => goToStep(steps[stepIndex - 1].id)} disabled={stepIndex === 0 || saving || scanning} data-testid="btn-rx-back">Back</Button>
        {stepIndex < steps.length - 1 ? (
          <Button type="button" onClick={() => goToStep(steps[stepIndex + 1].id)} disabled={saving || scanning} data-testid="btn-rx-next">Next</Button>
        ) : (
        <Button type="button" onClick={save} disabled={saving || scanning || (needsDate && !prescriptionDate)} data-testid="btn-rx-save">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editing ? "Update prescription" : "Save prescription"}
        </Button>
        )}
      </footer>
    </div>
  );
}
