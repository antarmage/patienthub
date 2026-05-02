import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

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

// ─── API state ────────────────────────────────────────────────────────────────

let _patientId: number | null = null;
let _apiBase: string = "";
let _currentWeek: number = 1;
let _mobileToken: string = "";

export function initMobileApi(
  patientId: number,
  apiBase: string,
  week: number,
  token: string
) {
  _patientId = patientId;
  _apiBase = apiBase;
  _currentWeek = week;
  _mobileToken = token;
}

export function updateCurrentWeek(week: number) {
  _currentWeek = week;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (_mobileToken) headers["Authorization"] = `Bearer ${_mobileToken}`;
  return headers;
}

async function apiGet<T>(path: string): Promise<T | null> {
  if (!_patientId) return null;
  try {
    const res = await fetch(`${_apiBase}${path}`, { headers: authHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function apiPost<T>(path: string, body: object): Promise<T | null> {
  if (!_patientId) return null;
  try {
    const res = await fetch(`${_apiBase}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function apiDelete(path: string): Promise<boolean> {
  if (!_patientId) return false;
  try {
    const res = await fetch(`${_apiBase}${path}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  doctorName: string;
  clinicName: string;
  dateTime: string;
  notificationIds: string[];
  createdAt: string;
  serverId?: number;
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
  serverId?: number;
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
  type: "blood" | "usg" | "vaccine" | "insurance" | "other";
  date: string;
  trimester?: string;
  fileUri: string;
  fileName: string;
  createdAt: string;
  serverId?: number;
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

interface ApiAppointment {
  id: number;
  patientId: number | null;
  date: string;
  time: string | null;
  type: string | null;
  status: string | null;
}

function mapApiAppointment(a: ApiAppointment): Appointment {
  const dateTime = a.time
    ? new Date(`${a.date}T${a.time}`).toISOString()
    : new Date(`${a.date}T10:00`).toISOString();
  return {
    id: String(a.id),
    doctorName: a.type || "Doctor",
    clinicName: "",
    dateTime,
    notificationIds: [],
    createdAt: a.date,
    serverId: a.id,
  };
}

export async function getAppointments(): Promise<Appointment[]> {
  if (_patientId) {
    const data = await apiGet<ApiAppointment[]>(`/api/mobile/patients/${_patientId}/appointments`);
    if (data) {
      const mapped = data
        .filter(a => a.status !== "cancelled")
        .map(mapApiAppointment);
      await AsyncStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(mapped));
      return mapped;
    }
  }
  const v = await AsyncStorage.getItem(KEYS.APPOINTMENTS);
  return v ? JSON.parse(v) : [];
}

export async function saveAppointment(
  data: Omit<Appointment, "id" | "createdAt" | "notificationIds">
): Promise<Appointment> {
  const dateObj = new Date(data.dateTime);
  const dateStr = dateObj.toISOString().split("T")[0];
  const timeStr = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;

  let serverId: number | undefined;
  if (_patientId) {
    const apiAppt = await apiPost<ApiAppointment>("/api/mobile/appointments", {
      patientId: _patientId,
      date: dateStr,
      time: timeStr,
      type: data.doctorName,
      status: "Pending",
    });
    if (apiAppt) serverId = apiAppt.id;
  }

  const appt: Appointment = {
    ...data,
    id: serverId ? String(serverId) : genId(),
    notificationIds: [],
    createdAt: new Date().toISOString(),
    serverId,
  };
  const list = await getAppointmentsFromStorage();
  list.push(appt);
  list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  await AsyncStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(list));
  return appt;
}

async function getAppointmentsFromStorage(): Promise<Appointment[]> {
  const v = await AsyncStorage.getItem(KEYS.APPOINTMENTS);
  return v ? JSON.parse(v) : [];
}

export async function deleteAppointment(id: string): Promise<void> {
  const numericId = parseInt(id);
  if (_patientId && !isNaN(numericId)) {
    await apiDelete(`/api/mobile/appointments/${numericId}`);
  }
  const list = (await getAppointmentsFromStorage()).filter(a => a.id !== id);
  await AsyncStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(list));
}

export async function updateAppointmentNotifications(
  id: string,
  notificationIds: string[]
): Promise<void> {
  const list = await getAppointmentsFromStorage();
  const idx = list.findIndex(a => a.id === id);
  if (idx >= 0) {
    list[idx].notificationIds = notificationIds;
    await AsyncStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(list));
  }
}

// ─── Medicines ────────────────────────────────────────────────────────────────

interface MedicineApiMeta {
  times: string[];
  durationDays: number;
  frequencyKey: "once" | "twice" | "thrice";
  notificationIds: string[];
}

interface ApiMedication {
  id: number;
  name: string;
  dose: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  status: string | null;
}

function mapApiMedication(m: ApiMedication): Medicine {
  let meta: MedicineApiMeta | null = null;
  try { meta = m.notes ? JSON.parse(m.notes) : null; } catch {}

  const frequencyKey: "once" | "twice" | "thrice" = meta?.frequencyKey || "once";
  const defaultTimes: Record<string, string[]> = {
    once: ["09:00"],
    twice: ["09:00", "21:00"],
    thrice: ["09:00", "14:00", "21:00"],
  };

  let durationDays = meta?.durationDays || 7;
  if (!meta && m.startDate && m.endDate) {
    const diff = Math.ceil(
      (new Date(m.endDate).getTime() - new Date(m.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff > 0) durationDays = diff;
  }

  return {
    id: String(m.id),
    name: m.name,
    dosage: m.dose || "",
    frequency: frequencyKey,
    times: meta?.times || defaultTimes[frequencyKey],
    durationDays,
    startDate: m.startDate || new Date().toISOString(),
    notificationIds: meta?.notificationIds || [],
    createdAt: m.startDate || new Date().toISOString(),
    serverId: m.id,
  };
}

export async function getMedicines(): Promise<Medicine[]> {
  if (_patientId) {
    const data = await apiGet<ApiMedication[]>(`/api/mobile/patients/${_patientId}/medications`);
    if (data) {
      const mapped = data.filter(m => m.status !== "deleted").map(mapApiMedication);
      await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(mapped));
      return mapped;
    }
  }
  const v = await AsyncStorage.getItem(KEYS.MEDICINES);
  return v ? JSON.parse(v) : [];
}

const FREQ_LABELS: Record<string, string> = {
  once: "Once daily",
  twice: "Twice daily",
  thrice: "Three times daily",
};

export async function saveMedicine(
  data: Omit<Medicine, "id" | "createdAt" | "notificationIds">
): Promise<Medicine> {
  const endDate = new Date(data.startDate);
  endDate.setDate(endDate.getDate() + data.durationDays);
  const endDateStr = endDate.toISOString().split("T")[0];
  const startDateStr = new Date(data.startDate).toISOString().split("T")[0];

  const meta: MedicineApiMeta = {
    times: data.times,
    durationDays: data.durationDays,
    frequencyKey: data.frequency,
    notificationIds: [],
  };

  let serverId: number | undefined;
  if (_patientId) {
    const apiMed = await apiPost<ApiMedication>(`/api/mobile/patients/${_patientId}/medications`, {
      name: data.name,
      dose: data.dosage,
      frequency: FREQ_LABELS[data.frequency] || data.frequency,
      startDate: startDateStr,
      endDate: endDateStr,
      notes: JSON.stringify(meta),
      status: "active",
    });
    if (apiMed) serverId = apiMed.id;
  }

  const med: Medicine = {
    ...data,
    id: serverId ? String(serverId) : genId(),
    notificationIds: [],
    createdAt: new Date().toISOString(),
    serverId,
  };
  const list = await getMedicinesFromStorage();
  list.push(med);
  await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(list));
  return med;
}

async function getMedicinesFromStorage(): Promise<Medicine[]> {
  const v = await AsyncStorage.getItem(KEYS.MEDICINES);
  return v ? JSON.parse(v) : [];
}

export async function deleteMedicine(id: string): Promise<void> {
  const numericId = parseInt(id);
  if (_patientId && !isNaN(numericId)) {
    await apiDelete(`/api/mobile/medications/${numericId}`);
  }
  const list = (await getMedicinesFromStorage()).filter(m => m.id !== id);
  await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(list));
  const logs = await getMedicineLogsFromStorage();
  const filteredLogs = logs.filter(l => l.medicineId !== id);
  await AsyncStorage.setItem(KEYS.MEDICINE_LOGS, JSON.stringify(filteredLogs));
}

export async function updateMedicineNotifications(
  id: string,
  notificationIds: string[]
): Promise<void> {
  const list = await getMedicinesFromStorage();
  const idx = list.findIndex(m => m.id === id);
  if (idx >= 0) {
    list[idx].notificationIds = notificationIds;
    await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(list));
  }
}

// ─── Medicine logs ────────────────────────────────────────────────────────────

async function getMedicineLogsFromStorage(): Promise<MedicineLog[]> {
  const v = await AsyncStorage.getItem(KEYS.MEDICINE_LOGS);
  return v ? JSON.parse(v) : [];
}

export async function getMedicineLogs(date?: string): Promise<MedicineLog[]> {
  const all = await getMedicineLogsFromStorage();
  return date ? all.filter(l => l.date === date) : all;
}

export async function logMedicineTaken(
  medicineId: string,
  scheduledTime: string
): Promise<MedicineLog> {
  const numericId = parseInt(medicineId);
  if (_patientId && !isNaN(numericId)) {
    await apiPost(`/api/mobile/patients/${_patientId}/medication-logs`, {
      medicationId: numericId,
      takenDate: today(),
    });
  }
  const log: MedicineLog = {
    id: genId(),
    medicineId,
    scheduledTime,
    takenAt: new Date().toISOString(),
    date: today(),
  };
  const all = await getMedicineLogsFromStorage();
  all.push(log);
  await AsyncStorage.setItem(KEYS.MEDICINE_LOGS, JSON.stringify(all));
  return log;
}

export async function getTodayMedicineStats(): Promise<{
  total: number;
  taken: number;
  pending: number;
}> {
  const [meds, logs] = await Promise.all([getMedicines(), getMedicineLogs(today())]);
  const now = new Date();
  const active = meds.filter(m => {
    const start = new Date(m.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + m.durationDays);
    return now >= start && now <= end;
  });
  let total = 0;
  let taken = 0;
  for (const med of active) {
    for (const t of med.times) {
      total++;
      if (logs.some(l => l.medicineId === med.id && l.scheduledTime === t)) taken++;
    }
  }
  return { total, taken, pending: total - taken };
}

// ─── Water ────────────────────────────────────────────────────────────────────

interface ApiWaterLog {
  id: number;
  amountMl: number;
  loggedAt: string | null;
  date: string;
}

export async function getWaterIntakeToday(): Promise<WaterIntake> {
  const t = today();
  if (_patientId) {
    const logs = await apiGet<ApiWaterLog[]>(
      `/api/mobile/patients/${_patientId}/water-logs?date=${t}`
    );
    if (logs) {
      const entries = logs.map(l => ({
        time: l.loggedAt || new Date().toISOString(),
        amountMl: l.amountMl,
      }));
      return { date: t, totalMl: entries.reduce((s, e) => s + e.amountMl, 0), entries };
    }
  }
  const v = await AsyncStorage.getItem(KEYS.WATER_LOGS);
  const all: { date: string; time: string; amountMl: number }[] = v ? JSON.parse(v) : [];
  const entries = all.filter(e => e.date === t);
  return { date: t, totalMl: entries.reduce((s, e) => s + e.amountMl, 0), entries };
}

export async function addWaterIntake(amountMl: number): Promise<WaterIntake> {
  if (_patientId) {
    await apiPost(`/api/mobile/patients/${_patientId}/water-logs`, {
      amountMl,
      date: today(),
    });
  } else {
    const v = await AsyncStorage.getItem(KEYS.WATER_LOGS);
    const all: { date: string; time: string; amountMl: number }[] = v ? JSON.parse(v) : [];
    all.push({ date: today(), time: new Date().toISOString(), amountMl });
    await AsyncStorage.setItem(KEYS.WATER_LOGS, JSON.stringify(all));
  }
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

interface ApiDocument {
  id: number;
  patientId: number;
  fileName: string;
  mimeType: string | null;
  docType: string | null;
  trimester: number | null;
  label: string | null;
  uploadedAt: string;
}

function mapApiDocument(d: ApiDocument): Diagnostic {
  const typeMap: Record<string, Diagnostic["type"]> = {
    blood: "blood",
    usg: "usg",
    vaccine: "vaccine",
    insurance: "insurance",
    other: "other",
  };
  return {
    id: String(d.id),
    type: typeMap[d.docType || ""] || "other",
    date: d.uploadedAt.split("T")[0],
    trimester: d.trimester ? `Trimester ${d.trimester}` : undefined,
    fileUri: "",
    fileName: d.fileName,
    createdAt: d.uploadedAt,
    serverId: d.id,
  };
}

export async function getDiagnostics(): Promise<Diagnostic[]> {
  if (_patientId) {
    const data = await apiGet<ApiDocument[]>(
      `/api/mobile/patients/${_patientId}/documents`
    );
    if (data) {
      const mapped = data.map(mapApiDocument);
      await AsyncStorage.setItem(KEYS.DIAGNOSTICS, JSON.stringify(mapped));
      return mapped;
    }
  }
  const v = await AsyncStorage.getItem(KEYS.DIAGNOSTICS);
  return v ? JSON.parse(v) : [];
}

export async function saveDiagnostic(
  data: Omit<Diagnostic, "id" | "createdAt">
): Promise<Diagnostic> {
  let fileData: string | undefined;
  let mimeType: string | undefined;

  if (data.fileUri && _patientId) {
    try {
      fileData = await FileSystem.readAsStringAsync(data.fileUri, {
        encoding: "base64",
      });
      const ext = data.fileName.split(".").pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        pdf: "application/pdf",
      };
      mimeType = mimeMap[ext || ""] || "image/jpeg";
    } catch {
      fileData = undefined;
    }
  }

  const trimesterNum =
    data.trimester === "First" ? 1
    : data.trimester === "Second" ? 2
    : data.trimester === "Third" ? 3
    : undefined;

  let serverId: number | undefined;
  if (_patientId) {
    const apiDoc = await apiPost<ApiDocument>(`/api/mobile/patients/${_patientId}/documents`, {
      fileName: data.fileName,
      fileData,
      mimeType,
      docType: data.type === "blood" ? "blood" : data.type === "usg" ? "usg" : "other",
      trimester: trimesterNum,
      label: data.date,
    });
    if (apiDoc) serverId = apiDoc.id;
  }

  const diag: Diagnostic = {
    ...data,
    id: serverId ? String(serverId) : genId(),
    createdAt: new Date().toISOString(),
    serverId,
  };
  const list = await getDiagnosticsFromStorage();
  list.unshift(diag);
  await AsyncStorage.setItem(KEYS.DIAGNOSTICS, JSON.stringify(list));
  return diag;
}

async function getDiagnosticsFromStorage(): Promise<Diagnostic[]> {
  const v = await AsyncStorage.getItem(KEYS.DIAGNOSTICS);
  return v ? JSON.parse(v) : [];
}

export async function deleteDiagnostic(id: string): Promise<void> {
  const numericId = parseInt(id);
  if (_patientId && !isNaN(numericId)) {
    await apiDelete(`/api/mobile/patient-documents/${numericId}`);
  }
  const list = (await getDiagnosticsFromStorage()).filter(d => d.id !== id);
  await AsyncStorage.setItem(KEYS.DIAGNOSTICS, JSON.stringify(list));
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

export async function getPrescriptions(): Promise<Prescription[]> {
  const v = await AsyncStorage.getItem(KEYS.PRESCRIPTIONS);
  return v ? JSON.parse(v) : [];
}

export async function savePrescription(
  data: Omit<Prescription, "id" | "createdAt">
): Promise<Prescription> {
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

interface ApiPregnancyMetric {
  id: number;
  patientId: number | null;
  week: number;
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
  enteredBy: string | null;
}

export async function getWeightLogs(): Promise<WeightLog[]> {
  if (_patientId) {
    const data = await apiGet<ApiPregnancyMetric[]>(
      `/api/mobile/patients/${_patientId}/pregnancy-metrics`
    );
    if (data) {
      const weightMetrics = data
        .filter(m => m.weight != null)
        .sort((a, b) => b.week - a.week);
      if (weightMetrics.length > 0) {
        return weightMetrics.map(m => ({
          id: String(m.id),
          weight: m.weight!,
          unit: "kg" as const,
          date: today(),
          week: m.week,
          createdAt: today(),
        }));
      }
    }
  }
  const v = await AsyncStorage.getItem(KEYS.WEIGHT_LOGS);
  return v ? JSON.parse(v) : [];
}

export async function saveWeightLog(
  weight: number,
  unit: "kg" | "lb" = "kg",
  week = 1
): Promise<WeightLog> {
  const weightKg = unit === "lb" ? parseFloat((weight * 0.453592).toFixed(2)) : weight;
  if (_patientId) {
    await apiPost(`/api/mobile/patients/${_patientId}/pregnancy-metrics`, {
      week,
      weight: weightKg,
    });
  }
  const log: WeightLog = {
    id: genId(),
    weight,
    unit,
    date: today(),
    week,
    createdAt: new Date().toISOString(),
  };
  const list = await getWeightLogsFromStorage();
  list.unshift(log);
  await AsyncStorage.setItem(KEYS.WEIGHT_LOGS, JSON.stringify(list));
  return log;
}

async function getWeightLogsFromStorage(): Promise<WeightLog[]> {
  const v = await AsyncStorage.getItem(KEYS.WEIGHT_LOGS);
  return v ? JSON.parse(v) : [];
}

export async function getLatestWeight(): Promise<WeightLog | null> {
  const logs = await getWeightLogs();
  return logs.length > 0 ? logs[0] : null;
}

// ─── BP logs ──────────────────────────────────────────────────────────────────

export async function getBPLogs(): Promise<BPLog[]> {
  if (_patientId) {
    const data = await apiGet<ApiPregnancyMetric[]>(
      `/api/mobile/patients/${_patientId}/pregnancy-metrics`
    );
    if (data) {
      const bpMetrics = data
        .filter(m => m.systolic != null && m.diastolic != null)
        .sort((a, b) => b.week - a.week);
      if (bpMetrics.length > 0) {
        return bpMetrics.map(m => ({
          id: String(m.id),
          systolic: m.systolic!,
          diastolic: m.diastolic!,
          date: today(),
          createdAt: today(),
        }));
      }
    }
  }
  const v = await AsyncStorage.getItem(KEYS.BP_LOGS);
  return v ? JSON.parse(v) : [];
}

export async function saveBPLog(
  systolic: number,
  diastolic: number,
  pulse?: number
): Promise<BPLog> {
  if (_patientId) {
    await apiPost(`/api/mobile/patients/${_patientId}/pregnancy-metrics`, {
      week: _currentWeek,
      systolic,
      diastolic,
    });
  }
  const log: BPLog = {
    id: genId(),
    systolic,
    diastolic,
    pulse,
    date: today(),
    createdAt: new Date().toISOString(),
  };
  const list = await getBPLogsFromStorage();
  list.unshift(log);
  await AsyncStorage.setItem(KEYS.BP_LOGS, JSON.stringify(list));
  return log;
}

async function getBPLogsFromStorage(): Promise<BPLog[]> {
  const v = await AsyncStorage.getItem(KEYS.BP_LOGS);
  return v ? JSON.parse(v) : [];
}

export async function getLatestBP(): Promise<BPLog | null> {
  const logs = await getBPLogs();
  return logs.length > 0 ? logs[0] : null;
}
