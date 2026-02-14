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
                text: `You are an expert medical prescription and consultation note OCR specialist for Indian gynecology/obstetrics/fertility clinics. You specialize in reading difficult handwritten prescriptions from Indian doctors.

Carefully analyze this handwritten medical document image. Your PRIMARY goal is to extract EVERY MEDICATION mentioned, even if the handwriting is difficult. Also extract all other clinical information.

This could be a medication prescription, a consultation note, a follow-up note, or a combination. Extract EVERYTHING.

Return a JSON object with these fields:
{
  "doctorName": "Name of the prescribing doctor if visible",
  "patientName": "Name of the patient if visible",
  "date": "Date on the prescription (format as YYYY-MM-DD if possible)",
  "medications": [
    {
      "name": "Full medicine name with brand (e.g., Tab Folvite 5mg, Cap Macfolate, Inj Progesterone)",
      "dosage": "Dosage strength (e.g., 5mg, 500mg, 150mg)",
      "frequency": "How often (e.g., OD, BD, TDS, once daily, twice daily, SOS, HS, weekly)",
      "duration": "For how long (e.g., 7 days, 1 month, 3 months, continue)",
      "route": "Route if specified (oral, IM, SC, topical, vaginal, etc.)",
      "instructions": "Any special instructions (e.g., after meals, before bed, empty stomach, with milk)"
    }
  ],
  "investigations": [
    {
      "name": "Test or investigation name",
      "result": "Result value if mentioned",
      "date": "Date of investigation if mentioned"
    }
  ],
  "diagnosis": "Any diagnosis or condition mentioned",
  "chiefComplaint": "Patient's main complaint or reason for visit",
  "examination": "Any examination findings (O/E, P/A, P/V, BMI, vitals etc.)",
  "advice": "Any advice, instructions, diet/exercise recommendations",
  "followUp": "Follow-up instructions or next visit date",
  "notes": "Any other relevant notes, medical history, or additional text",
  "rawText": "Complete raw text transcription of everything readable on the document",
  "confidence": "high/medium/low - your confidence in the accuracy of the reading"
}

CRITICAL MEDICATION EXTRACTION RULES:
1. NEVER return an empty medications array if there are ANY medicines written on the document. Even if you can only partially read a medicine name, include it with your best guess.
2. Look VERY carefully for medication lines. They often appear after "Rx", "Rx:", "Treatment:", or simply listed with "Tab", "Cap", "Inj", "Syr" prefixes.
3. Medications may be written in a list format, or inline within text. Extract them ALL.
4. If a line says something like "continue same medicines" or "same Rx", note that in the medications array with name="Continue previous medications".
5. Common abbreviations: Tab=Tablet, Cap=Capsule, Inj=Injection, Syr=Syrup, Cr=Cream, Gel=Gel, Supp=Suppository, OD=once daily, BD=twice daily, TDS=three times, QID=four times, HS=at bedtime, SOS=as needed, AC=before meals, PC=after meals, BBF=before breakfast, stat=immediately.

COMMON INDIAN GYNECOLOGY/OBSTETRICS BRAND NAMES (use these to help identify unclear handwriting):
- Folic Acid/Prenatal: Folvite, Macfolate, Folinext, Folinext-D, Fol-5, Folsafe, L-Methylfolate
- Iron: Autrin, Orofer, Orofer-XT, Dexorange, Livogen, Ferium-XT, Tonoferon, Hemfer, Feronia-XT, Maxirich, Iron Sucrose
- Calcium: Shelcal, Shelcal-500, Shelcal-HD, Calcimax, CCM, Gemcal, Cipcal, Tata 1mg Calcium
- Thyroid: Thyronorm, Thyrox, Eltroxin, Lethyrox, Thyrofit
- Progesterone: Susten, Duphaston (Dydrogesterone), HCG, Gestin, Gestone, Naturogest, Microgest, Deviry (Medroxyprogesterone)
- Fertility: Letrozole (Letoval, Letroz, Femara), Clomiphene (Clomid, Fertomid, Siphene), Follicular stimulation (Gonal-F, Menopur, Folligraf), HMG (Humog), HCG (Ovidrel, Pregnyl, Sifasi), Cabergoline (Cabgolin)
- Antibiotics: Augmentin, Azithromycin (Azee, Azithral), Metronidazole (Flagyl, Metrogyl), Doxycycline, Cefixime (Taxim-O), Ciprofloxacin, Amoxicillin, Ornidazole
- Pain/Anti-inflammatory: Meftal-Spas, Mefenamic Acid, Drotin (Drotaverine), Buscopan, Combiflam, Zerodol-SP, Flexon, Ibuprofen, Paracetamol (Dolo, Crocin)
- Anti-emetic: Ondem (Ondansetron), Emeset, Perinorm, Domstal
- Antacid/GI: Pantop (Pantoprazole), Razo, Rablet, Mucaine, Gelusil, Sucralfate
- Blood thinner: Ecosprin, Aspirin, Heparin, Enoxaparin (Clexane)
- Vitamins/Supplements: Becosules, Evion (Vitamin E), Maxoza (DHA), Pregnacare, Nurokind (Methylcobalamin/B12), Methylcobalamin, Vitamin D (Calcirol, D3-60K, Arachitol), Zinc, Omega-3
- Vaginal: Candid-V, Clotrimazole, Metrogyl-V, Cynclomycin, Clingen
- Hormonal: Meprate, Regestrone, Primolut-N, Diane-35, Novelon, Ovral-L, Dronis
- Diabetes: Metformin (Glycomet, Glyciphage), Insulin
- Steroids: Dexamethasone (Dexona), Prednisolone (Wysolone), Betamethasone

INVESTIGATION NAMES TO LOOK FOR:
USG (Ultrasound), TSH, FT3, FT4, AMH (Anti-Mullerian Hormone), FSH, LH, Prolactin, Estradiol (E2), Progesterone, Beta-HCG, CBC, HbA1c, OGTT, GTT, HPLC, HSG (Hysterosalpingography), Pap smear, HPV, HIV, HBsAg, VDRL, Blood group, Rh factor, Urine R/E, Urine C/S, Rubella IgG/IgM, TORCH panel, Dual marker, Triple test, Quadruple test, NT scan, Anomaly scan, Growth scan, Doppler, AFP, Inhibin, PAPP-A, Karyotype, Semen analysis, Anti-CCP, ANA, Anti-TPO, Vitamin D, Vitamin B12, Ferritin, Iron studies, Lipid profile, LFT, KFT, RBS, FBS, PPBS

- Always provide rawText with everything you can read from the document
- If handwriting is ambiguous, provide your BEST GUESS for medication names rather than skipping them`,
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
