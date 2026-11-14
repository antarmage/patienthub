import { clinicWorkingHours } from "../../../../lib/db/src/staff-session-policy";
import { ApiResponseError, authenticatedFetch, isStaffSessionExpired, readApiResponse } from "./authenticatedFetch";

export const SESSION_RENEWAL_INTERVAL_MS = 5 * 60 * 1000;

export function startStaffSessionRenewal(onError: (message: string) => void) {
  let stopped = false;
  let pending = false;
  const renew = async () => {
    if (stopped || pending) return;
    pending = true;
    try {
      if (isStaffSessionExpired()) return;
      const visible = document.visibilityState === "visible";
      if (!visible && !clinicWorkingHours(Date.now())) return;
      const tokens = [...new Set([sessionStorage.getItem("billing_staff_token"), sessionStorage.getItem("desk_token")].filter((token): token is string => !!token))];
      if (!tokens.length) { onError(""); return; }
      for (const token of tokens) {
        const response = await authenticatedFetch("/api/staff/session/renew", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ visible }),
        });
        if (![sessionStorage.getItem("billing_staff_token"), sessionStorage.getItem("desk_token")].includes(token)) continue;
        const body = await readApiResponse(response);
        if (!body || typeof body !== "object" || !("expiresAt" in body) || typeof body.expiresAt !== "string" || !Number.isFinite(Date.parse(body.expiresAt))) {
          throw new Error("Session renewal returned an invalid expiry.");
        }
      }
      if (!stopped) onError("");
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 401) {
        if (!stopped) onError("A staff session has expired. Sign in again to renew access.");
      } else {
        console.warn("Staff session renewal failed.", error);
        if (!stopped) onError(`Session renewal failed: ${error instanceof Error ? error.message : "Unknown error"}. Renewal will retry automatically.`);
      }
    } finally {
      pending = false;
    }
  };
  const trigger = () => { void renew(); };
  const interval = window.setInterval(trigger, SESSION_RENEWAL_INTERVAL_MS);
  document.addEventListener("visibilitychange", trigger);
  window.addEventListener("focus", trigger);
  trigger();
  return () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", trigger);
    window.removeEventListener("focus", trigger);
  };
}
