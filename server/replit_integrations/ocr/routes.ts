import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export function registerOcrRoutes(app: Express): void {
  app.post("/api/ocr/prescription", async (req: Request, res: Response) => {
    try {
      const { image, mimeType } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const base64Data = image.replace(/^data:[^;]+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType || "image/jpeg",
                },
              },
              {
                text: `You are a medical prescription OCR specialist. Carefully analyze this handwritten medical prescription image and extract ALL information you can read.

Return a JSON object with these fields:
{
  "doctorName": "Name of the prescribing doctor if visible",
  "patientName": "Name of the patient if visible",
  "date": "Date on the prescription if visible",
  "medications": [
    {
      "name": "Medicine name",
      "dosage": "Dosage (e.g., 500mg)",
      "frequency": "How often (e.g., twice daily)",
      "duration": "For how long (e.g., 7 days)",
      "instructions": "Any special instructions (e.g., after meals)"
    }
  ],
  "diagnosis": "Any diagnosis mentioned",
  "notes": "Any other notes, follow-up instructions, or additional text",
  "rawText": "Complete raw text transcription of everything readable on the prescription",
  "confidence": "high/medium/low - your confidence in the accuracy of the reading"
}

Be thorough - extract every medication and instruction you can read. If a field is not visible or readable, set it to null. Always provide the rawText field with everything you can read.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {
          rawText: text,
          medications: [],
          confidence: "low",
          notes: "Could not parse structured data from the prescription.",
        };
      }

      res.json({
        success: true,
        data: parsed,
      });
    } catch (error: any) {
      console.error("OCR Error:", error);
      res.status(500).json({
        error: "Failed to process prescription image",
        details: error.message,
      });
    }
  });
}
