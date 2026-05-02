import AsyncStorage from "@react-native-async-storage/async-storage";

function getBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL || "";
}

async function getPatientId(): Promise<string | null> {
  return AsyncStorage.getItem("@saiviemom_patient_id");
}

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  return res;
}

export interface SaiviePatient {
  id: number;
  name: string;
  phone: string | null;
  mode: string | null;
  lmpDate?: string | null;
  eddDate?: string | null;
}

export interface SaivieAppointment {
  id: number;
  patientId: number;
  date: string;
  time: string | null;
  type: string | null;
  status: string | null;
  provider: string | null;
  notes: string | null;
  chiefComplaint: string | null;
}

export interface SaivieMedication {
  id: number;
  patientId: number;
  name: string;
  dose: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export interface SaiviePregnancyMetric {
  id: number;
  patientId: number;
  date: string;
  week: number | null;
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
  fetalMovement: number | null;
  notes: string | null;
}

export interface SaivieWaterLog {
  id: number;
  patientId: number;
  date: string;
  amountMl: number;
  loggedAt: string | null;
}

export interface SaivieDocument {
  id: number;
  patientId: number;
  fileName: string;
  mimeType: string | null;
  docType: string | null;
  trimester: number | null;
  label: string | null;
  uploadedAt: string;
}

export interface SaivieWaterSummary {
  totalMl: number;
  entries: SaivieWaterLog[];
}

export const api = {
  async getPatient(patientId: string): Promise<SaiviePatient | null> {
    try {
      const res = await apiFetch(`/api/patients/${patientId}`);
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  },

  async getAppointments(patientId: string): Promise<SaivieAppointment[]> {
    try {
      const res = await apiFetch(`/api/appointments?patientId=${patientId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },

  async createAppointment(patientId: string, data: {
    date: string;
    time?: string;
    type?: string;
    provider?: string;
    notes?: string;
  }): Promise<SaivieAppointment | null> {
    try {
      const res = await apiFetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify({ patientId: parseInt(patientId), ...data }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  },

  async getMedications(patientId: string): Promise<SaivieMedication[]> {
    try {
      const res = await apiFetch(`/api/patients/${patientId}/medications`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },

  async getPregnancyMetrics(patientId: string): Promise<SaiviePregnancyMetric[]> {
    try {
      const res = await apiFetch(`/api/pregnancy-metrics?patientId=${patientId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },

  async createPregnancyMetric(patientId: string, data: {
    date: string;
    week?: number;
    weight?: number;
    systolic?: number;
    diastolic?: number;
    fetalMovement?: number;
    notes?: string;
  }): Promise<SaiviePregnancyMetric | null> {
    try {
      const res = await apiFetch("/api/pregnancy-metrics", {
        method: "POST",
        body: JSON.stringify({ patientId: parseInt(patientId), ...data }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  },

  async getWaterLogs(patientId: string, date?: string): Promise<SaivieWaterLog[]> {
    try {
      const url = date
        ? `/api/water-logs?patientId=${patientId}&date=${date}`
        : `/api/water-logs?patientId=${patientId}`;
      const res = await apiFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },

  async createWaterLog(patientId: string, amountMl: number, date: string): Promise<SaivieWaterLog | null> {
    try {
      const res = await apiFetch("/api/water-logs", {
        method: "POST",
        body: JSON.stringify({ patientId: parseInt(patientId), amountMl, date }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  },

  async getDocuments(patientId: string): Promise<SaivieDocument[]> {
    try {
      const res = await apiFetch(`/api/patient-documents?patientId=${patientId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
};

export { getPatientId };
