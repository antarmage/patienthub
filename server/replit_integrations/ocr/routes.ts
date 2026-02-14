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
                text: `You are a medical prescription and consultation note OCR specialist for Indian gynecology/obstetrics clinics. Carefully analyze this handwritten medical document image and extract ALL information you can read.

This could be a medication prescription, a consultation note, a follow-up note, or a combination. Extract everything.

Return a JSON object with these fields:
{
  "doctorName": "Name of the prescribing doctor if visible",
  "patientName": "Name of the patient if visible",
  "date": "Date on the prescription (format as YYYY-MM-DD if possible)",
  "medications": [
    {
      "name": "Medicine/tablet/supplement name",
      "dosage": "Dosage (e.g., 500mg, 1 tablet)",
      "frequency": "How often (e.g., twice daily, OD, BD, TDS)",
      "duration": "For how long (e.g., 7 days, 1 month)",
      "route": "Route if specified (oral, injection, topical, etc.)",
      "instructions": "Any special instructions (e.g., after meals, before bed)"
    }
  ],
  "investigations": [
    {
      "name": "Test or investigation name (e.g., USG, TSH, AMH, HSG, CBC, HPLC)",
      "result": "Result value if mentioned",
      "date": "Date of investigation if mentioned"
    }
  ],
  "diagnosis": "Any diagnosis, chief complaint, or condition mentioned",
  "chiefComplaint": "Patient's main complaint or reason for visit",
  "examination": "Any examination findings (O/E, P/A, P/V etc.)",
  "advice": "Any advice, instructions, diet/exercise recommendations",
  "followUp": "Follow-up instructions or next visit date",
  "notes": "Any other relevant notes, medical history, or additional text",
  "rawText": "Complete raw text transcription of everything readable on the document",
  "confidence": "high/medium/low - your confidence in the accuracy of the reading"
}

IMPORTANT: 
- Include ALL medications even if partially readable. Common Indian brand names include Folic Acid, Thyronorm, Ecosprin, Progesterone, Iron supplements, etc.
- Look for abbreviated medication notations like "Tab.", "Cap.", "Inj.", "Syr."
- Extract investigation results with their values and dates
- If no structured medications are found but there are treatment recommendations, still extract them
- Always provide rawText with everything you can read`,
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
