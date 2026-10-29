import type { Express, Request, Response, RequestHandler } from "express";
import { GoogleGenAI } from "@google/genai";
import {
  clinicalJsonSchema,
  extractionPrompt,
  OcrError,
  parseClinicalDocument,
  parseJson,
  prescriptionForReview,
  validateDocument,
} from "./document";
import { scanWithGlm } from "./glm-client";
import { geminiConfig } from "../gemini-config";

export async function scanClinicalDocument(
  image: unknown,
  mimeType: unknown = "image/jpeg",
  docType: unknown = "prescription",
) {
  const file = validateDocument(image, mimeType, docType);
  const provider = process.env.OCR_PROVIDER ?? "gemini";
  if (provider === "glm-ocr")
    return scanWithGlm(file.data, file.mimeType, file.docType);
  if (provider !== "gemini")
    throw new OcrError("OCR_PROVIDER must be gemini or glm-ocr.", 503);
  const gemini = geminiConfig(process.env, 120_000);
  if (!gemini) throw new OcrError("Gemini OCR is not configured.", 503);

  const ai = new GoogleGenAI(gemini);
  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: file.data, mimeType: file.mimeType } },
            { text: extractionPrompt(file.docType) },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: clinicalJsonSchema,
      },
    });
  } catch {
    throw new OcrError(
      "Gemini OCR is unavailable. No clinical data was saved.",
      502,
    );
  }
  if (response.candidates?.[0]?.finishReason !== "STOP") {
    throw new OcrError(
      "The scan was incomplete. Split the document or enter it manually.",
      422,
    );
  }
  const text = response.text;
  if (!text?.trim())
    throw new OcrError("The scan returned no readable text.", 422);
  return {
    ...parseClinicalDocument(parseJson(text)),
    provider: "gemini" as const,
    requiresReview: true as const,
  };
}

export function registerPrescriptionReadingRoutes(
  app: Express,
  getPatient: (id: number) => Promise<unknown>,
  scan = scanClinicalDocument,
) {
  const readPrescription: RequestHandler = async (req, res) => {
    try {
      const id = String(req.params.id);
      if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      if (!(await getPatient(Number(id))))
        return res.status(404).json({ error: "Patient not found" });
      const { fileData, mimeType } = req.body ?? {};
      const document = await scan(fileData, mimeType, "prescription");
      res.json({
        ...prescriptionForReview(document),
        provider: document.provider,
        message: "Prescription read for review. Nothing has been saved.",
      });
    } catch (error) {
      const status = error instanceof OcrError ? error.statusCode : 500;
      console.error("Prescription reading failed:", { status });
      res.status(status).json({
        error:
          error instanceof OcrError
            ? error.message
            : "Failed to read prescription.",
      });
    }
  };
  app.post("/api/patients/:id/extract-prescription", readPrescription);
  app.post("/api/patients/:id/parse-prescription", readPrescription);
}

export function registerOcrRoutes(app: Express): void {
  app.post("/api/ocr/prescription", async (req: Request, res: Response) => {
    try {
      const { image, mimeType, docType } = req.body ?? {};
      const parsed = await scanClinicalDocument(image, mimeType, docType);
      res.json({ success: true, data: parsed });
    } catch (error) {
      const status = error instanceof OcrError ? error.statusCode : 500;
      console.error("Document scan failed:", { status });
      res.status(status).json({
        error: "Failed to process document",
        details:
          error instanceof OcrError
            ? error.message
            : "Unexpected document processing error.",
      });
    }
  });
}
