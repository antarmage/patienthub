import type { Express, Request, Response } from "express";
import { z } from "zod/v4";
import type { AccessActor } from "./clinical-access";
import { deliveryInputSchema } from "../../../lib/db/src/delivery";
import {
  careNetworkDetailsSchema, careNetworkUpdateSchema, surgeryAssignmentsSchema,
  type CareNetworkDetails, type CareNetworkMember, type SurgeryTeam,
} from "../../../lib/db/src/surgery-care-network";

export const surgeryStatuses = ["planned", "completed", "cancelled", "discharged"] as const;
export type SurgeryStatus = typeof surgeryStatuses[number];
export type SurgeryPlanRecord = {
  id: number; patientId: number; procedureName: string; plannedDate: string;
  surgeonId: number; surgeonName: string; notes: string; status: SurgeryStatus;
  completedAt: string | null; closedAt: string | null; createdAt: string; updatedAt: string;
  team: SurgeryTeam;
};
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) =>
  !value.startsWith("0000-") && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
"Enter a valid calendar date");
export const surgeryDetailsSchema = z.object({
  procedureName: z.string().trim().min(1).max(200),
  plannedDate: calendarDate,
  surgeonId: z.number().int().positive(),
  notes: z.string().trim().max(5000),
  assignments: surgeryAssignmentsSchema.optional(),
}).strict();
export type SurgeryDetails = z.infer<typeof surgeryDetailsSchema>;
export const transitionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("completed"), completedDate: calendarDate.refine((value) =>
    value <= new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10), "Surgery completion cannot be in the future"),
    delivery: deliveryInputSchema.optional(),
  }).strict().refine((value) => !value.delivery || value.delivery.deliveryDate === value.completedDate,
    "Surgery and delivery completion dates must match"),
  z.object({ status: z.literal("cancelled") }).strict(),
  z.object({ status: z.literal("discharged") }).strict(),
]);
export type SurgeryTransition = z.infer<typeof transitionSchema>;
const measurement = (min: number, max: number) => z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).pipe(z.number().int().min(min).max(max)).nullable();
export const recoveryObservationSchema = z.object({
  patientId: z.number().int().positive(), surgeryPlanId: z.number().int().positive(),
  observedAt: z.iso.datetime(),
  painScore: measurement(0, 10), systolic: measurement(50, 260),
  diastolic: measurement(30, 180), pulse: measurement(20, 250),
  nausea: z.boolean(), mobility: z.string().max(200).nullable(),
  woundCondition: z.string().max(200).nullable(), notes: z.string().max(5000).nullable(),
}).strict().refine((value) => value.systolic === null || value.diastolic === null || value.systolic > value.diastolic, "Systolic BP must exceed diastolic BP");
export type RecoveryObservationInput = z.infer<typeof recoveryObservationSchema>;
export type RecoveryPatient = {
  id: number; name: string; phone: string | null; age: number | null;
  surgery: { id: number; procedureName: string; plannedDate: string; completedAt: string; surgeonName: string };
};
export interface SurgeryWorkflowStore {
  listCareNetwork(): Promise<CareNetworkMember[]>;
  createCareNetworkMember(details: CareNetworkDetails, userId: string): Promise<CareNetworkMember>;
  updateCareNetworkMember(id: number, details: CareNetworkDetails & { active: boolean }, userId: string): Promise<CareNetworkMember>;
  list(patientId: number): Promise<SurgeryPlanRecord[]>;
  create(patientId: number, details: SurgeryDetails, userId: string): Promise<SurgeryPlanRecord>;
  edit(patientId: number, id: number, details: SurgeryDetails, userId: string): Promise<SurgeryPlanRecord>;
  transition(patientId: number, id: number, input: SurgeryTransition, userId: string): Promise<SurgeryPlanRecord>;
  recoveryPatients(search: string): Promise<RecoveryPatient[]>;
  observations(patientId: number, surgeryId: number): Promise<unknown[]>;
  recordObservation(input: RecoveryObservationInput, userId: string): Promise<unknown>;
}
export function workflowError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
export function assertSurgeryTransition(current: SurgeryStatus, next: SurgeryTransition["status"]) {
  if (!((current === "planned" && ["completed", "cancelled"].includes(next)) || (current === "completed" && next === "discharged"))) {
    throw workflowError(409, "This surgery cannot make that status change. Refresh the surgery plan.");
  }
}

export function registerSurgeryWorkflow(app: Express, store: SurgeryWorkflowStore, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  const authorize = async (req: Request, res: Response, planner: boolean) => {
    const actor = await authenticate(req, res);
    if (!actor) {
      if (!res.headersSent) res.status(401).json({ error: "Authentication required" });
      return null;
    }
    if (!("role" in actor) || !(planner ? ["clinician", "owner"] : ["staff", "receptionist", "admin", "clinician", "owner"]).includes(actor.role)) {
      res.status(403).json({ error: planner ? "Doctor or owner access required" : "Staff access required" });
      return null;
    }
    res.setHeader("Cache-Control", "private, no-store");
    return actor.userId;
  };
  const id = (value: unknown) => typeof value === "string" && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647 ? Number(value) : null;
  const handle = (work: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    try { await work(req, res); } catch (error) {
      if (error instanceof Error && "status" in error && [400, 404, 409].includes(Number(error.status))) {
        return res.status(Number(error.status)).json({ error: error.message });
      }
      throw error;
    }
  };
  app.get("/api/surgery-care-network", handle(async (req, res) => {
    if (!await authorize(req, res, true)) return;
    res.json(await store.listCareNetwork());
  }));
  app.post("/api/surgery-care-network", handle(async (req, res) => {
    const userId = await authorize(req, res, true);
    if (!userId) return;
    const details = careNetworkDetailsSchema.safeParse(req.body);
    if (!details.success) return res.status(400).json({ error: details.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
    res.status(201).json(await store.createCareNetworkMember(details.data, userId));
  }));
  app.patch("/api/surgery-care-network/:memberId", handle(async (req, res) => {
    const userId = await authorize(req, res, true);
    if (!userId) return;
    const memberId = id(req.params.memberId);
    const details = careNetworkUpdateSchema.safeParse(req.body);
    if (!memberId) return res.status(400).json({ error: "Invalid care-network member ID" });
    if (!details.success) return res.status(400).json({ error: details.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
    res.json(await store.updateCareNetworkMember(memberId, details.data, userId));
  }));
  app.get("/api/patients/:id/surgeries", handle(async (req, res) => {
    if (!await authorize(req, res, true)) return;
    const patientId = id(req.params.id);
    if (!patientId) return res.status(400).json({ error: "Invalid patient ID" });
    res.json(await store.list(patientId));
  }));
  app.post("/api/patients/:id/surgeries", handle(async (req, res) => {
    const userId = await authorize(req, res, true);
    if (!userId) return;
    const patientId = id(req.params.id);
    const details = surgeryDetailsSchema.safeParse(req.body);
    if (!patientId || !details.success) return res.status(400).json({ error: "Enter procedure name, valid planned date, surgeon, notes and valid team assignments" });
    res.status(201).json(await store.create(patientId, details.data, userId));
  }));
  app.patch("/api/patients/:id/surgeries/:surgeryId", handle(async (req, res) => {
    const userId = await authorize(req, res, true);
    if (!userId) return;
    const patientId = id(req.params.id), surgeryId = id(req.params.surgeryId);
    if (!patientId || !surgeryId) return res.status(400).json({ error: "Invalid patient or surgery ID" });
    const transition = transitionSchema.safeParse(req.body);
    if (transition.success) return res.json(await store.transition(patientId, surgeryId, transition.data, userId));
    if (req.body && typeof req.body === "object" && "status" in req.body) {
      return res.status(400).json({ error: transition.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
    }
    const details = surgeryDetailsSchema.safeParse(req.body);
    if (details.success) return res.json(await store.edit(patientId, surgeryId, details.data, userId));
    res.status(400).json({ error: "Enter valid surgery details or a valid status change with completion date" });
  }));
  app.get("/api/postop/patients", handle(async (req, res) => {
    if (!await authorize(req, res, false)) return;
    const search = req.query.q ?? "";
    if (typeof search !== "string" || search.length > 200) return res.status(400).json({ error: "Invalid patient search" });
    res.json(await store.recoveryPatients(search.trim()));
  }));
  app.get("/api/postop/observations", handle(async (req, res) => {
    if (!await authorize(req, res, false)) return;
    const patientId = id(req.headers["x-patient-id"]), surgeryId = id(req.headers["x-surgery-plan-id"]);
    if (!patientId || !surgeryId) return res.status(400).json({ error: "Patient and surgery headers are required" });
    res.json(await store.observations(patientId, surgeryId));
  }));
  app.post("/api/postop/observations", handle(async (req, res) => {
    const userId = await authorize(req, res, false);
    if (!userId) return;
    const parsed = recoveryObservationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
    res.status(201).json(await store.recordObservation(parsed.data, userId));
  }));
}
