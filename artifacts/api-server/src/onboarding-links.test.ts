import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { createOnboardingLinks, onboardingTokenHash, registerOnboardingLinkRoutes, type OnboardingLinkStore } from "./onboarding-links";
import { registerClinicalAccess } from "./clinical-access";

test("private onboarding tokens are hashed, replaced, appointment-bound, expire, and deny cancelled appointments", async () => {
  let saved: { id: number; hash: string; expiresAt: Date } | undefined;
  let status = "scheduled";
  const store: OnboardingLinkStore = {
    appointment: async (id) => id === 4 || id === 5 ? { patientId: 7, status } : undefined,
    save: async (id, _patientId, hash, expiresAt) => { saved = { id, hash, expiresAt }; return true; },
    valid: async (id, hash) => saved?.id === id && saved.hash === hash && saved.expiresAt.getTime() > Date.now(),
  };
  const service = createOnboardingLinks(store);
  const first = await service.issue(4);
  assert.ok(first);
  assert.match(first.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(saved?.hash, onboardingTokenHash(first.token));
  assert.notEqual(saved?.hash, first.token);
  assert.equal(await service.patient(4, first.token), 7);
  assert.equal(await service.patient(5, first.token), null);
  const next = await service.issue(4);
  assert.ok(next);
  assert.equal(await service.patient(4, first.token), null);
  status = "cancelled";
  assert.equal(await service.patient(4, next.token), null);
  assert.equal(await service.issue(4), null);
  status = "scheduled";
  assert.ok(saved);
  saved.expiresAt = new Date(0);
  assert.equal(await service.patient(4, next.token), null);
});

test("capability permits only its onboarding read/write, never clinical endpoints or private history", async () => {
  let savedHash = "";
  const store: OnboardingLinkStore = {
    appointment: async (id) => id === 4 ? { patientId: 7, status: "scheduled" } : undefined,
    save: async (_id, _patientId, hash) => { savedHash = hash; return true; },
    valid: async (id, hash) => id === 4 && hash === savedHash,
  };
  const service = createOnboardingLinks(store);
  const app = express(); app.use(express.json());
  const authenticate = async (req: express.Request) => req.headers.authorization === "staff" ? { userId: "staff", role: "staff" } : null;
  registerClinicalAccess(app, {
    authenticate,
    appointmentPatientId: async (id) => id === 4 ? 7 : null,
    onboardingPatientId: service.patient,
  });
  registerOnboardingLinkRoutes(app, store, authenticate);
  app.get("/api/onboarding", (_req, res) => res.json({ ready: true }));
  app.post("/api/onboarding/:appointmentId", (_req, res) => res.json({ saved: true }));
  app.get("/api/patients/7/visit-history", (_req, res) => res.json([]));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${base}/api/onboarding-links/4`, { method: "POST" })).status, 401);
    const issued = await fetch(`${base}/api/onboarding-links/4`, { method: "POST", headers: { Authorization: "staff" } });
    assert.equal(issued.status, 200);
    const body = await issued.json();
    assert.ok(body && typeof body === "object" && "token" in body && typeof body.token === "string");
    const headers = { "X-Onboarding-Token": body.token, "X-Appointment-Id": "4", "Content-Type": "application/json" };
    assert.equal((await fetch(`${base}/api/onboarding`, { headers })).status, 200);
    assert.equal((await fetch(`${base}/api/onboarding`, { headers: { ...headers, "X-Appointment-Id": "5" } })).status, 410);
    assert.equal((await fetch(`${base}/api/onboarding`, { headers: { ...headers, Authorization: "staff", "X-Onboarding-Token": "invalid" } })).status, 410);
    assert.equal((await fetch(`${base}/api/patients/7/visit-history`, { headers })).status, 401);
    assert.equal((await fetch(`${base}/api/onboarding/4`, { method: "POST", headers, body: JSON.stringify({ history: { diagnosis: "not permitted" } }) })).status, 403);
    assert.equal((await fetch(`${base}/api/onboarding/4`, { method: "POST", headers, body: JSON.stringify({ history: { onboarding: { name: "Synthetic" }, medical: ["Patient reported"], pregnancyDatingEstimate: null } }) })).status, 200);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
