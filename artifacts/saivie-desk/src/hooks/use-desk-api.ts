import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/DeskAuthContext";

const API_BASE = "/api/desk";

export interface DeskPatient {
  id: number;
  name: string;
  age: number | null;
  dob: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lmp: string | null;
  procedureDate: string | null;
  mode: string | null;
  referredBy: string | null;
  condition: string | null;
  status: string | null;
  clinicianNote: string | null;
}

export interface DeskProvider {
  id: number;
  name: string;
  role: string | null;
  specialty: string | null;
}

export interface DeskAppointment {
  id: number;
  patientId: number;
  providerId: number | null;
  date: string;
  time: string;
  type: string | null;
  status: string;
}

interface ApiError extends Error {
  status: number;
  data: unknown;
}

async function fetchWithAuth(url: string, token: string | null, options: RequestInit = {}): Promise<unknown> {
  if (!token) throw new Error("No auth token");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorData: unknown;
    try { errorData = await res.json(); } catch { /* ignore */ }
    const error = new Error("API Error") as ApiError;
    error.status = res.status;
    error.data = errorData;
    throw error;
  }
  return res.json();
}

export function usePatients(search: string) {
  const { token } = useAuth();
  return useQuery<DeskPatient[]>({
    queryKey: ["desk_patients", search],
    queryFn: () => fetchWithAuth(`${API_BASE}/patients?search=${encodeURIComponent(search)}`, token) as Promise<DeskPatient[]>,
    enabled: !!token,
  });
}

export function usePatient(id: string | number | undefined) {
  const { token } = useAuth();
  return useQuery<DeskPatient>({
    queryKey: ["desk_patient", id],
    queryFn: () => fetchWithAuth(`${API_BASE}/patients/${id}`, token) as Promise<DeskPatient>,
    enabled: !!token && !!id,
  });
}

export function useProviders() {
  const { token } = useAuth();
  return useQuery<DeskProvider[]>({
    queryKey: ["desk_providers"],
    queryFn: () => fetchWithAuth(`${API_BASE}/providers`, token) as Promise<DeskProvider[]>,
    enabled: !!token,
  });
}

export type CreatePatientPayload = Omit<DeskPatient, "id" | "status" | "clinicianNote"> & { clinicianNote?: string | null };
export type UpdatePatientPayload = Partial<Omit<DeskPatient, "id">>;

export function useCreatePatient() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<DeskPatient, ApiError, CreatePatientPayload>({
    mutationFn: (data) => fetchWithAuth(`${API_BASE}/patients`, token, {
      method: "POST",
      body: JSON.stringify(data),
    }) as Promise<DeskPatient>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["desk_patients"] });
    },
  });
}

export function useUpdatePatient() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<DeskPatient, ApiError, { id: string | number; data: UpdatePatientPayload }>({
    mutationFn: ({ id, data }) => fetchWithAuth(`${API_BASE}/patients/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }) as Promise<DeskPatient>,
    onSuccess: (updated) => {
      queryClient.setQueryData(["desk_patient", String(updated.id)], updated);
      queryClient.setQueryData(["desk_patient", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["desk_patients"] });
    },
  });
}

export type CreateAppointmentPayload = {
  patientId: number;
  providerId?: number | null;
  date: string;
  time: string;
  type: string;
  reason?: string | null;
};

export function useCreateAppointment() {
  const { token } = useAuth();
  return useMutation<DeskAppointment, ApiError, CreateAppointmentPayload>({
    mutationFn: (data) => fetchWithAuth(`${API_BASE}/appointments`, token, {
      method: "POST",
      body: JSON.stringify(data),
    }) as Promise<DeskAppointment>,
  });
}
