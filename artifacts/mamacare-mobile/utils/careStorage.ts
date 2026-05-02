import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  APPOINTMENTS: "@saiviemom_appointments",
  MEDICINES: "@saiviemom_medicines",
  MEDICINE_LOGS: "@saiviemom_medicine_logs",
  WATER_LOGS: "@saiviemom_water_logs",
  WATER_GOAL: "@saiviemom_water_goal",
  DIAGNOSTICS: "@saiviemom_diagnostics",
  PRESCRIPTIONS: "@saiviemom_prescriptions",
  WEIGHT_LOGS: "@saiviemom_weight_logs",
  BP_LOGS: "@saiviemom_bp_logs",
};

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  doctorName: string;
  clinicName: string;
  dateTime: string;
  notificationIds: string[];
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: "once" | "twice" | "thrice";
  times: string[];
  durationDays: number;
  startDate: string;
  notificationIds: string[];
  createdAt: string;
}

export interface MedicineLog {
  id: string;
  medicineId: string;
  takenAt: string;
  scheduledTime: string;
  date: string;
}

export interface WaterIntake {
  date: string;
  totalMl: number;
  entries: { time: string; amountMl: number }[];
}

export interface Diagnostic {
  id: string;
  type: "blood" | "usg" | "other";
  date: string;
  trimester?: string;
  fileUri: string;
  fileName: string;
  createdAt: string;
}

export interface Prescription {
  id: string;
  doctorName: string;
  date: string;
  fileUri: string;
  fileName: string;
  createdAt: string;
}

export interface WeightLog {
  id: string;
  weight: number;
  unit: "kg" | "lb";
  date: string;
  week: number;
  createdAt: string;
}

export interface BPLog {
  id: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  date: string;
  createdAt: string;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function getAppointments(): Promise<Appointment[]> {
  const v = await AsyncStorage.getItem(KEYS.APPOINTMENTS);
  return v ? JSON.parse(v) : [];
}

export async function saveAppointment(data: Omit<Appointment, "id" | "createdAt" | "notificationIds">): Promise<Appointment> {
  const appt: Appointment = { ...data, id: genId(), notificationIds: [], createdAt: new Date().toISOString() };
  const list = await getAppointments();
  list.push(appt);
  list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  await AsyncStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(list));
  return appt;
}

export async function deleteAppointment(id: string): Promise<void> {
  const list = (await getAppointments()).filter(a => a.id !== id);
  await AsyncStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(list));
}

export async function updateAppointmentNotifications(id: string, notificationIds: string[]): Promise<void> {
  const list = await getAppointments();
  const idx = list.findIndex(a => a.id === id);
  if (idx >= 0) { list[idx].notificationIds = notificationIds; await AsyncStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(list)); }
}

// ─── Medicines ────────────────────────────────────────────────────────────────

export async function getMedicines(): Promise<Medicine[]> {
  const v = await AsyncStorage.getItem(KEYS.MEDICINES);
  return v ? JSON.parse(v) : [];
}

export async function saveMedicine(data: Omit<Medicine, "id" | "createdAt" | "notificationIds">): Promise<Medicine> {
  const med: Medicine = { ...data, id: genId(), notificationIds: [], createdAt: new Date().toISOString() };
  const list = await getMedicines();
  list.push(med);
  await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(list));
  return med;
}

export async function deleteMedicine(id: string): Promise<void> {
  const list = (await getMedicines()).filter(m => m.id !== id);
  await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(list));
}

export async function updateMedicineNotifications(id: string, notificationIds: string[]): Promise<void> {
  const list = await getMedicines();
  const idx = list.findIndex(m => m.id === id);
  if (idx >= 0) { list[idx].notificationIds = notificationIds; await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(list)); }
}

// ─── Medicine logs ────────────────────────────────────────────────────────────

export async function getMedicineLogs(date?: string): Promise<MedicineLog[]> {
  const v = await AsyncStorage.getItem(KEYS.MEDICINE_LOGS);
  const all: MedicineLog[] = v ? JSON.parse(v) : [];
  return date ? all.filter(l => l.date === date) : all;
}

export async function logMedicineTaken(medicineId: string, scheduledTime: string): Promise<MedicineLog> {
  const log: MedicineLog = { id: genId(), medicineId, scheduledTime, takenAt: new Date().toISOString(), date: today() };
  const all = await getMedicineLogs();
  all.push(log);
  await AsyncStorage.setItem(KEYS.MEDICINE_LOGS, JSON.stringify(all));
  return log;
}

export async function getTodayMedicineStats(): Promise<{ total: number; taken: number; pending: number }> {
  const [meds, logs] = await Promise.all([getMedicines(), getMedicineLogs(today())]);
  const now = new Date();
  const active = meds.filter(m => {
    const start = new Date(m.startDate);
    const end = new Date(start); end.setDate(end.getDate() + m.durationDays);
    return now >= start && now <= end;
  });
  let total = 0, taken = 0;
  for (const med of active) {
    for (const t of med.times) {
      total++;
      if (logs.some(l => l.medicineId === med.id && l.scheduledTime === t)) taken++;
    }
  }
  return { total, taken, pending: total - taken };
}

// ─── Water ────────────────────────────────────────────────────────────────────

export async function getWaterIntakeToday(): Promise<WaterIntake> {
  const v = await AsyncStorage.getItem(KEYS.WATER_LOGS);
  const all: { date: string; time: string; amountMl: number }[] = v ? JSON.parse(v) : [];
  const t = today();
  const entries = all.filter(e => e.date === t);
  return { date: t, totalMl: entries.reduce((s, e) => s + e.amountMl, 0), entries };
}

export async function addWaterIntake(amountMl: number): Promise<WaterIntake> {
  const v = await AsyncStorage.getItem(KEYS.WATER_LOGS);
  const all: { date: string; time: string; amountMl: number }[] = v ? JSON.parse(v) : [];
  all.push({ date: today(), time: new Date().toISOString(), amountMl });
  await AsyncStorage.setItem(KEYS.WATER_LOGS, JSON.stringify(all));
  return getWaterIntakeToday();
}

export async function getWaterGoal(): Promise<number> {
  const v = await AsyncStorage.getItem(KEYS.WATER_GOAL);
  return v ? parseInt(v, 10) : 2500;
}

export async function setWaterGoal(ml: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.WATER_GOAL, String(ml));
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────

export async function getDiagnostics(): Promise<Diagnostic[]> {
  const v = await AsyncStorage.getItem(KEYS.DIAGNOSTICS);
  return v ? JSON.parse(v) : [];
}

export async function saveDiagnostic(data: Omit<Diagnostic, "id" | "createdAt">): Promise<Diagnostic> {
  const diag: Diagnostic = { ...data, id: genId(), createdAt: new Date().toISOString() };
  const list = await getDiagnostics();
  list.unshift(diag);
  await AsyncStorage.setItem(KEYS.DIAGNOSTICS, JSON.stringify(list));
  return diag;
}

export async function deleteDiagnostic(id: string): Promise<void> {
  const list = (await getDiagnostics()).filter(d => d.id !== id);
  await AsyncStorage.setItem(KEYS.DIAGNOSTICS, JSON.stringify(list));
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

export async function getPrescriptions(): Promise<Prescription[]> {
  const v = await AsyncStorage.getItem(KEYS.PRESCRIPTIONS);
  return v ? JSON.parse(v) : [];
}

export async function savePrescription(data: Omit<Prescription, "id" | "createdAt">): Promise<Prescription> {
  const p: Prescription = { ...data, id: genId(), createdAt: new Date().toISOString() };
  const list = await getPrescriptions();
  list.unshift(p);
  await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(list));
  return p;
}

export async function deletePrescription(id: string): Promise<void> {
  const list = (await getPrescriptions()).filter(p => p.id !== id);
  await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(list));
}

// ─── Weight logs ──────────────────────────────────────────────────────────────

export async function getWeightLogs(): Promise<WeightLog[]> {
  const v = await AsyncStorage.getItem(KEYS.WEIGHT_LOGS);
  return v ? JSON.parse(v) : [];
}

export async function saveWeightLog(weight: number, unit: "kg" | "lb" = "kg", week = 1): Promise<WeightLog> {
  const log: WeightLog = { id: genId(), weight, unit, date: today(), week, createdAt: new Date().toISOString() };
  const list = await getWeightLogs();
  list.unshift(log);
  await AsyncStorage.setItem(KEYS.WEIGHT_LOGS, JSON.stringify(list));
  return log;
}

export async function getLatestWeight(): Promise<WeightLog | null> {
  const logs = await getWeightLogs();
  return logs.length > 0 ? logs[0] : null;
}

// ─── BP logs ──────────────────────────────────────────────────────────────────

export async function getBPLogs(): Promise<BPLog[]> {
  const v = await AsyncStorage.getItem(KEYS.BP_LOGS);
  return v ? JSON.parse(v) : [];
}

export async function saveBPLog(systolic: number, diastolic: number, pulse?: number): Promise<BPLog> {
  const log: BPLog = { id: genId(), systolic, diastolic, pulse, date: today(), createdAt: new Date().toISOString() };
  const list = await getBPLogs();
  list.unshift(log);
  await AsyncStorage.setItem(KEYS.BP_LOGS, JSON.stringify(list));
  return log;
}

export async function getLatestBP(): Promise<BPLog | null> {
  const logs = await getBPLogs();
  return logs.length > 0 ? logs[0] : null;
}
