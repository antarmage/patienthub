import type { Express, Request, Response } from "express";
import { z } from "zod/v4";
import type { AccessActor } from "./clinical-access";
import {
  pregnancyOutcomes,
  deliveryModes,
  type PregnancyEpisode,
  type PregnancyEpisodeDetails,
  type PregnancyRecordLink,
} from "../../../lib/db/src/pregnancy-episodes";

const today = () =>
  new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !value.startsWith("0000-") &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Enter a valid calendar date",
  )
  .nullable();
export const episodeDetailsSchema = z
  .object({
    number: z.number().int().min(1).max(50),
    status: z.enum(["current", "past"]),
    startDate: date,
    endDate: date,
    lmp: date,
    dueDate: date,
    datingBasis: z.enum([
      "LMP",
      "Ultrasound",
      "Clinical assessment",
      "Not recorded",
    ]),
    outcome: z.enum(pregnancyOutcomes),
    deliveryMode: z.enum(deliveryModes),
    conceptionMethod: z.string().trim().max(200),
    notes: z.string().trim().max(5000),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const key of ["lmp", "startDate", "endDate"] as const) {
      if (value[key] && value[key]! > today())
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Cannot be in the future",
        });
    }
    if (
      value.endDate &&
      [value.startDate, value.lmp].some(
        (start) => start && value.endDate! < start,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Cannot be before the pregnancy start/LMP",
      });
    }
    if (value.dueDate && value.lmp && value.dueDate <= value.lmp)
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Must be after LMP",
      });
    if (
      value.status === "current" &&
      (value.endDate ||
        value.outcome !== "Not recorded" ||
        value.deliveryMode !== "Not recorded")
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Mark the pregnancy as past before recording its end or outcome",
      });
    }
    if (value.datingBasis === "LMP" && !value.lmp)
      ctx.addIssue({
        code: "custom",
        path: ["lmp"],
        message: "LMP is required for LMP-based dating",
      });
    if (
      value.datingBasis === "LMP" &&
      value.lmp &&
      Number.isFinite(Date.parse(value.lmp)) &&
      value.dueDate &&
      value.dueDate !==
        new Date(Date.parse(value.lmp) + 280 * 86400000)
          .toISOString()
          .slice(0, 10)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message:
          "For a clinically adjusted EDD, select Ultrasound or Clinical assessment dating",
      });
    }
    if (
      ["Ultrasound", "Clinical assessment"].includes(value.datingBasis) &&
      !value.dueDate
    )
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Record the clinically established due date",
      });
  });
export const episodeInputSchema = z
  .object({
    details: episodeDetailsSchema,
    records: z
      .array(
        z
          .object({
            kind: z.enum(["appointment", "visit", "lab"]),
            id: z.number().int().positive().max(2147483647),
          })
          .strict(),
      )
      .max(500),
    version: z.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.records.map((record) => `${record.kind}:${record.id}`))
        .size === value.records.length,
    "Select each record only once",
  );
export type EpisodeInput = {
  details: PregnancyEpisodeDetails;
  records: PregnancyRecordLink[];
  version?: number;
};
export interface PregnancyEpisodeStore {
  list(patientId: number): Promise<PregnancyEpisode[]>;
  save(
    patientId: number,
    episodeId: number | null,
    input: EpisodeInput,
    userId: string,
  ): Promise<PregnancyEpisode>;
}
export const episodeError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

export function registerPregnancyEpisodes(
  app: Express,
  store: PregnancyEpisodeStore,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
) {
  const id = (value: unknown) =>
    typeof value === "string" &&
    /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) <= 2147483647
      ? Number(value)
      : null;
  const handle = (write: boolean) => async (req: Request, res: Response) => {
    const patientId = id(req.params.id),
      episodeId =
        req.params.episodeId === undefined ? null : id(req.params.episodeId);
    const actor = await authenticate(req, res);
    if (!actor) {
      if (!res.headersSent)
        res.status(401).json({ error: "Authentication required" });
      return;
    }
    const doctor =
      "role" in actor && ["clinician", "owner"].includes(actor.role);
    const ownPatient = "patientId" in actor && actor.patientId === patientId;
    if (
      !doctor &&
      (write || (!ownPatient && res.locals.receptionClinicalRead !== true))
    ) {
      return res
        .status(403)
        .json({
          error: write
            ? "Doctor or owner access required to record pregnancy episodes"
            : "Clinical viewing permission required",
        });
    }
    res.setHeader("Cache-Control", "private, no-store");
    if (!patientId || (req.params.episodeId !== undefined && !episodeId))
      return res
        .status(400)
        .json({ error: "Invalid patient or pregnancy episode ID" });
    try {
      if (!write) return res.json(await store.list(patientId));
      const parsed = episodeInputSchema.safeParse(req.body);
      if (!parsed.success)
        return res
          .status(400)
          .json({
            error: parsed.error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; "),
          });
      if (episodeId && !parsed.data.version)
        return res
          .status(400)
          .json({
            error:
              "Refresh the pregnancy episode before saving; version is required",
          });
      if (!episodeId && parsed.data.version)
        return res
          .status(400)
          .json({ error: "A new pregnancy episode must not supply a version" });
      if (!("userId" in actor))
        return res.status(403).json({ error: "Doctor account required" });
      return res
        .status(episodeId ? 200 : 201)
        .json(
          await store.save(patientId, episodeId, parsed.data, actor.userId),
        );
    } catch (error) {
      if (
        error instanceof Error &&
        "status" in error &&
        [400, 404, 409].includes(Number(error.status))
      )
        return res.status(Number(error.status)).json({ error: error.message });
      throw error;
    }
  };
  app.get("/api/patients/:id/pregnancy-episodes", handle(false));
  app.post("/api/patients/:id/pregnancy-episodes", handle(true));
  app.put("/api/patients/:id/pregnancy-episodes/:episodeId", handle(true));
}
