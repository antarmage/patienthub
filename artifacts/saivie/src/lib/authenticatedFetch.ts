export function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("billing_staff_token") : null;
  if (token && typeof window !== "undefined" && !headers.has("Authorization")) {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers, credentials: init?.credentials ?? (input instanceof Request ? input.credentials : "same-origin") });
}

export async function receptionRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(url, init);
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}
