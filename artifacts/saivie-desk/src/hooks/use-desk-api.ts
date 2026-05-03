import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/DeskAuthContext";

const API_BASE = "/api/desk";

async function fetchWithAuth(url: string, token: string | null, options: RequestInit = {}) {
  if (!token) throw new Error("No auth token");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      // ignore
    }
    const error: any = new Error("API Error");
    error.status = res.status;
    error.data = errorData;
    throw error;
  }
  return res.json();
}

export function usePatients(search: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["desk_patients", search],
    queryFn: () => fetchWithAuth(`${API_BASE}/patients?search=${encodeURIComponent(search)}`, token),
    enabled: !!token,
  });
}

export function usePatient(id: string | number | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["desk_patient", id],
    queryFn: () => fetchWithAuth(`${API_BASE}/patients/${id}`, token),
    enabled: !!token && !!id,
  });
}

export function useProviders() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["desk_providers"],
    queryFn: () => fetchWithAuth(`${API_BASE}/providers`, token),
    enabled: !!token,
  });
}

export function useCreatePatient() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => fetchWithAuth(`${API_BASE}/patients`, token, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["desk_patients"] });
    },
  });
}

export function useUpdatePatient() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => fetchWithAuth(`${API_BASE}/patients/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    onSuccess: (updatedPatient) => {
      queryClient.setQueryData(["desk_patient", String(updatedPatient.id)], updatedPatient);
      queryClient.setQueryData(["desk_patient", Number(updatedPatient.id)], updatedPatient);
      queryClient.invalidateQueries({ queryKey: ["desk_patients"] });
    },
  });
}

export function useCreateAppointment() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: (data: any) => fetchWithAuth(`${API_BASE}/appointments`, token, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  });
}
