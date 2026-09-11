import { storage } from "@/src/utils/storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL as string;
export const SESSION_TOKEN_KEY = "saivie.session_token";

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await storage.secureGet<string>(SESSION_TOKEN_KEY, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_URL}/api${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const msg = typeof data === "object" && data?.detail ? data.detail : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}
