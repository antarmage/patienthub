import type { HttpOptions } from "@google/genai";

type Env = Record<string, string | undefined>;

/**
 * Replit AI Integrations is a proxy that needs its own base URL and no API version in the path.
 * Elsewhere (AWS), GEMINI_API_KEY is a direct Google key and must use the SDK's default endpoint.
 */
export function geminiConfig(env: Env = process.env, timeout?: number): { apiKey: string; httpOptions: HttpOptions } | null {
  const proxyKey = env.AI_INTEGRATIONS_GEMINI_API_KEY?.trim();
  if (proxyKey) {
    return { apiKey: proxyKey, httpOptions: { apiVersion: "", baseUrl: env.AI_INTEGRATIONS_GEMINI_BASE_URL, timeout } };
  }
  const directKey = env.GEMINI_API_KEY?.trim();
  return directKey ? { apiKey: directKey, httpOptions: { timeout } } : null;
}
