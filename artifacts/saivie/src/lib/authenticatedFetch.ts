export const STAFF_SESSION_EXPIRED_EVENT = "saivie:staff-session-expired";
let rejectedStaffToken: string | null = null;

export function isStaffSessionExpired(): boolean {
  return rejectedStaffToken !== null && typeof sessionStorage !== "undefined"
    && sessionStorage.getItem("billing_staff_token") === rejectedStaffToken;
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("billing_staff_token") : null;
  if (token && typeof window !== "undefined" && !headers.has("Authorization")) {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(input, { ...init, headers, credentials: init?.credentials ?? (input instanceof Request ? input.credentials : "same-origin") });
  if (response.status === 401 && token && typeof window !== "undefined") {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")
      && !url.pathname.startsWith("/api/auth/") && headers.get("Authorization") === `Bearer ${token}`
      && sessionStorage.getItem("billing_staff_token") === token && rejectedStaffToken !== token) {
      rejectedStaffToken = token;
      window.dispatchEvent(new Event(STAFF_SESSION_EXPIRED_EVENT));
    }
  }
  return response;
}

export class ApiResponseError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function readApiResponse(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new ApiResponseError(response.status, `The API returned a web page or non-JSON response (HTTP ${response.status}). Check that /api requests reach the API server and that the updated API is deployed.`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new ApiResponseError(response.status, `The API returned invalid JSON (HTTP ${response.status}). Please retry or contact your administrator.`);
  }
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : `Request failed (${response.status})`;
    throw new ApiResponseError(response.status, message);
  }
  return body;
}

export async function receptionRequest<T>(url: string, init?: RequestInit): Promise<T> {
  return await readApiResponse(await authenticatedFetch(url, init)) as T;
}
