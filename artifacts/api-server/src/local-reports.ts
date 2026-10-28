import { createHash } from "node:crypto";
import type { Express, RequestHandler } from "express";
import { z } from "zod/v4";
import { OcrError, validateDocument } from "./replit_integrations/ocr/document";

const text = z.string().max(20_000);
export const localLabReadingSchema = z
  .object({
    date: z.string().max(100),
    patientName: text,
    labName: text,
    rawText: z.string().min(1).max(100_000),
    warnings: z.array(text).max(200),
    results: z
      .array(
        z.object({
          testName: z.string().trim().min(1).max(500),
          value: text,
          unit: text,
          referenceRange: text,
          status: text,
          flag: text,
        }),
      )
      .min(1)
      .max(1000),
  })
  .strict();

export type LocalLabReading = z.infer<typeof localLabReadingSchema>;
export const importReceiptSchema = z.object({
  importId: z.uuid(),
  patientId: z.number().int().positive(),
  documentId: z.number().int().positive(),
  patientDocumentId: z.number().int().positive(),
  resultIds: z.array(z.number().int().positive()).min(1),
  fileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  payloadSha256: z.string().regex(/^[a-f0-9]{64}$/),
  committed: z.literal(true),
});
export type ImportReceipt = z.infer<typeof importReceiptSchema>;

const uploadSchema = z
  .object({
    importId: z.uuid(),
    confirmedPatientName: z.string().min(1).max(500),
    reviewed: z.literal(true),
    file: z
      .object({
        name: z
          .string()
          .min(1)
          .max(255)
          .refine((value) => !/[\\/\x00-\x1f]/.test(value), "Invalid filename"),
        mimeType: z.string(),
        data: z.string(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
    reading: localLabReadingSchema,
  })
  .strict();
export type LocalReportUpload = z.infer<typeof uploadSchema>;
export type ValidatedImport = LocalReportUpload & {
  patientId: number;
  actorId: string;
  payloadSha256: string;
};

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function validateImport(
  body: unknown,
  patientId: number,
  actorId: string,
): ValidatedImport {
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success)
    throw new OcrError("Invalid reviewed report, file, or import ID.", 400);
  const input = parsed.data;
  const date = input.reading.date;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date.startsWith("0000-") ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  ) {
    throw new OcrError(
      "Enter a valid, confirmed report date (YYYY-MM-DD).",
      400,
    );
  }
  const file = validateDocument(input.file.data, input.file.mimeType, "blood");
  if (sha256(Buffer.from(file.data, "base64")) !== input.file.sha256) {
    throw new OcrError("Original report checksum does not match.", 400);
  }
  const normalized = {
    ...input,
    file: { ...input.file, data: file.data, mimeType: file.mimeType },
  };
  return {
    ...normalized,
    patientId,
    actorId,
    payloadSha256: sha256(JSON.stringify({ patientId, ...normalized })),
  };
}

export interface LocalReportStore {
  patient(id: number): Promise<{ id: number; name: string } | undefined>;
  commit(input: ValidatedImport): Promise<ImportReceipt>;
}

export function registerLocalReportRoutes(
  app: Express,
  authorize: RequestHandler,
  store: LocalReportStore,
) {
  const patient: RequestHandler = async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (
        !/^[1-9]\d*$/.test(String(req.params.id)) ||
        !Number.isSafeInteger(id)
      ) {
        throw new OcrError("Invalid patient ID.", 400);
      }
      const record = await store.patient(id);
      if (!record) throw new OcrError("Patient not found.", 404);
      res.locals.importPatient = record;
      next();
    } catch (error) {
      next(error);
    }
  };
  app.get(
    "/api/local-reports/patients/:id",
    authorize,
    patient,
    (_req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      res.json(res.locals.importPatient);
    },
  );
  app.post(
    "/api/local-reports/patients/:id/imports",
    authorize,
    patient,
    async (req, res) => {
      try {
        const record: { id: number; name: string } = res.locals.importPatient;
        const input = validateImport(
          req.body,
          record.id,
          res.locals.importActorId,
        );
        if (input.confirmedPatientName !== record.name) {
          throw new OcrError(
            "Patient identity changed or was not confirmed. Verify the patient again.",
            409,
          );
        }
        const receipt = await store.commit(input);
        res.setHeader("Cache-Control", "private, no-store");
        res.json(importReceiptSchema.parse(receipt));
      } catch (error) {
        const status = error instanceof OcrError ? error.statusCode : 500;
        console.error("Local report import failed:", { status });
        res.status(status).json({
          error:
            error instanceof OcrError
              ? error.message
              : "Import could not be confirmed. Keep the local files and retry the same import ID.",
        });
      }
    },
  );
}
