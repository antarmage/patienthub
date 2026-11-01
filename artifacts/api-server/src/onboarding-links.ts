import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import type { AccessActor } from "./clinical-access";

export const onboardingTokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export interface OnboardingLinkStore {
  appointment(id: number): Promise<{ patientId: number | null; status: string | null } | undefined>;
  save(id: number, patientId: number, hash: string, expiresAt: Date): Promise<boolean>;
  valid(id: number, hash: string): Promise<boolean>;
}
export function createOnboardingLinks(store: OnboardingLinkStore) {
  return {
    async issue(id: number) {
      const appointment = await store.appointment(id);
      if (!appointment?.patientId || /^(cancelled|canceled|no-show)$/i.test(appointment.status || "")) return null;
      const token = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 30 * 86400000);
      if (!await store.save(id, appointment.patientId, onboardingTokenHash(token), expiresAt)) return null;
      return { token, expiresAt: expiresAt.toISOString() };
    },
    async patient(id: number, token: string) {
      if (!Number.isSafeInteger(id) || id < 1 || !/^[A-Za-z0-9_-]{43}$/.test(token) || !await store.valid(id, onboardingTokenHash(token))) return null;
      const appointment = await store.appointment(id);
      return appointment?.patientId && !/^(cancelled|canceled|no-show)$/i.test(appointment.status || "") ? appointment.patientId : null;
    },
  };
}
export function registerOnboardingLinkRoutes(app: Express, store: OnboardingLinkStore, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  const service = createOnboardingLinks(store);
  app.post("/api/onboarding-links/:id", async (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    const actor = await authenticate(req, res);
    if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required" }); return; }
    if (!("role" in actor) || !["staff", "receptionist", "admin", "clinician", "owner"].includes(actor.role)) return res.status(403).json({ error: "Staff access required" });
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id)) return res.status(400).json({ error: "Invalid appointment ID" });
    const link = await service.issue(id);
    if (!link) return res.status(404).json({ error: "Appointment is unavailable for onboarding" });
    res.json({ ...link, path: `/onboarding/${id}#${link.token}` });
  });
}
