import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { registerOcrRoutes } from "./replit_integrations/ocr";
import { getUncachableGoogleSheetClient } from "./google-sheets";
import { importLabReports, listLabReportFiles, downloadFileAsBuffer } from "./google-drive";
import { ai } from "./replit_integrations/image/client";
import { whatsapp } from "./whatsapp";
import { scorePatient, generateTrimesterChecklist, batchScorePatients } from "./risk-engine";

function parseId(val: string): number | null {
  const n = parseInt(val);
  return isNaN(n) ? null : n;
}

// Tracks appointment IDs that have already had a post-visit summary sent
// (prevents duplicate sends if appointment is PATCH'd to "completed" more than once)
const postVisitSummarySentIds = new Set<number>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/patients", async (req, res) => {
    const providerId = req.query.providerId ? parseInt(req.query.providerId as string) : undefined;
    if (providerId) {
      const allAppointments = await storage.getAppointments();
      const patientIds = Array.from(new Set(allAppointments.filter(a => a.providerId === providerId).map(a => a.patientId).filter(Boolean)));
      const allPatients = await storage.getPatients();
      const filtered = allPatients.filter(p => patientIds.includes(p.id));
      res.json(filtered);
    } else {
      const patients = await storage.getPatients();
      res.json(patients);
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid patient ID" });
    const patient = await storage.getPatient(id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  });

  app.post("/api/patients", async (req, res) => {
    if (!req.body.name) return res.status(400).json({ error: "Patient name is required" });
    const patient = await storage.createPatient(req.body);

    // Send welcome WhatsApp to new patient
    if (patient.phone) {
      try {
        await whatsapp.sendWelcomeMessage(patient.phone, patient.name);
      } catch (err) {
        console.error("Failed to send welcome WhatsApp:", err);
      }
    }

    // Auto-score new patient
    scorePatient(patient.id).catch(() => {});
    // Auto-generate trimester checklist if LMP is set (pregnancy patient)
    if (patient.lmp) {
      generateTrimesterChecklist(patient.id).catch(() => {});
    }

    res.status(201).json(patient);
  });

  app.patch("/api/patients/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid patient ID" });
    const updated = await storage.updatePatient(id, req.body);
    if (!updated) return res.status(404).json({ error: "Patient not found" });
    // Re-score if clinically relevant fields changed
    const clinicalFields = ['lmp', 'bp', 'hb', 'weight', 'condition', 'type'];
    if (clinicalFields.some(f => req.body[f] !== undefined)) {
      scorePatient(id).catch(() => {});
    }
    // Regenerate trimester checklist if LMP changed
    if (req.body.lmp) {
      generateTrimesterChecklist(id).catch(() => {});
    }
    res.json(updated);
  });

  app.get("/api/providers", async (_req, res) => {
    const providers = await storage.getProviders();
    res.json(providers);
  });

  app.post("/api/providers", async (req, res) => {
    const provider = await storage.createProvider(req.body);
    res.status(201).json(provider);
  });

  app.patch("/api/providers/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateProvider(id, req.body);
    if (!updated) return res.status(404).json({ error: "Provider not found" });
    res.json(updated);
  });

  app.get("/api/services", async (_req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.post("/api/services", async (req, res) => {
    const service = await storage.createService(req.body);
    res.status(201).json(service);
  });

  app.get("/api/appointments", async (req, res) => {
    const { date, patientId, providerId } = req.query;
    let appts;
    if (date) {
      appts = await storage.getAppointmentsByDate(date as string);
    } else if (patientId) {
      appts = await storage.getAppointmentsByPatient(parseInt(patientId as string));
    } else {
      appts = await storage.getAppointments();
    }
    if (providerId) {
      appts = appts.filter(a => a.providerId === parseInt(providerId as string));
    }
    res.json(appts);
  });

  app.post("/api/appointments", async (req, res) => {
    const body = req.body;

    // Auto-generate Jitsi telemedicine link if visit mode is telemedicine
    if (body.visitMode === "telemedicine" && !body.telemedicineLink) {
      const { randomUUID } = await import("crypto");
      body.telemedicineLink = `https://meet.jit.si/saivie-${randomUUID().slice(0, 8)}`;
    }

    const appt = await storage.createAppointment(body);

    // Send WhatsApp confirmation
    if (appt.patientId) {
      const patient = await storage.getPatient(appt.patientId);
      if (patient?.phone) {
        try {
          await whatsapp.sendAppointmentConfirmation(
            patient.phone,
            patient.name,
            appt.date,
            appt.time,
            appt.visitMode || "in-clinic",
            appt.telemedicineLink
          );
        } catch (err) {
          console.error("Failed to send WhatsApp confirmation:", err);
        }
      }
    }

    res.status(201).json(appt);
  });

  // Generate / refresh telemedicine link for an appointment
  app.post("/api/appointments/:id/telemedicine", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const { randomUUID } = await import("crypto");
    const link = `https://meet.jit.si/saivie-${randomUUID().slice(0, 8)}`;
    const updated = await storage.updateAppointment(id, {
      visitMode: "telemedicine",
      telemedicineLink: link,
    });
    if (!updated) return res.status(404).json({ error: "Appointment not found" });

    // Notify patient of telemedicine link
    if (updated.patientId) {
      const patient = await storage.getPatient(updated.patientId);
      if (patient?.phone) {
        try {
          await whatsapp.sendTextMessage(
            patient.phone,
            `Hi ${patient.name}, your video consultation link is ready:\n${link}\n\nSee you on ${updated.date} at ${updated.time}! 💜\n\n_Saivie Reproductive Intelligence_`
          );
        } catch (_) {}
      }
    }

    res.json({ link, appointment: updated });
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateAppointment(id, req.body);
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json(updated);

    // Auto-trigger post-visit WhatsApp summary when appointment is marked Completed
    // Guard against duplicate sends if appointment is updated to "completed" multiple times
    const newStatus = (req.body.status || "").toLowerCase();
    if (newStatus === "completed" && !postVisitSummarySentIds.has(id)) {
      postVisitSummarySentIds.add(id);
      (async () => {
        try {
          const patient = updated.patientId ? await storage.getPatient(updated.patientId) : null;
          if (!patient?.phone) return;

          const visits = await storage.getVisitHistory(patient.id);
          const latestVisit = visits.sort((a, b) => b.date.localeCompare(a.date))[0];
          const meds = await storage.getMedications(patient.id);
          const activeMeds = meds.filter(m => m.status === "active" || m.status === "Active" || !m.status);

          const summaryResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
              role: "user",
              parts: [{
                text: `Generate a warm, friendly post-visit WhatsApp summary for a patient of a women's reproductive health clinic in India.

Patient: ${patient.name}, Age: ${patient.age}
Today's visit diagnosis/assessment: ${latestVisit?.diagnosis || latestVisit?.assessment || "General consultation"}
Plan notes: ${latestVisit?.planNotes || ""}
Active medications: ${activeMeds.slice(0, 5).map(m => `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` (${m.frequency})` : ""}`).join(", ") || "None prescribed"}
Next appointment: ${patient.nextReview || "To be scheduled"}

Write a WhatsApp message (max 180 words) in a warm, supportive tone. Include:
1. A brief summary of today's visit
2. Key medications to take (if any)
3. Important instructions or things to watch for
4. Next steps / follow-up

Use simple, non-clinical language. End with "_Saivie Reproductive Intelligence_". Use WhatsApp formatting (bold with *text*).`,
              }],
            }],
          });

          const summaryText = summaryResponse.text || "";
          await whatsapp.sendTextMessage(patient.phone, summaryText);
          console.log(`[post-visit-auto] Summary sent to ${patient.name} (appt #${id})`);
        } catch (err: any) {
          console.error(`[post-visit-auto] Failed for appt #${id}:`, err.message);
        }
      })();
    }
  });

  // Pre-appointment onboarding endpoints
  app.get("/api/onboarding/:appointmentId", async (req, res) => {
    const appointmentId = parseId(req.params.appointmentId);
    if (!appointmentId) return res.status(400).json({ error: "Invalid appointment ID" });

    const appt = await storage.getAppointments().then(all => all.find(a => a.id === appointmentId));
    if (!appt) return res.status(404).json({ error: "Appointment not found" });

    const patient = await storage.getPatient(appt.patientId!);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    res.json({
      appointment: { id: appt.id, date: appt.date, time: appt.time },
      patient: { id: patient.id, name: patient.name, history: patient.history }
    });
  });

  // WhatsApp Test Endpoint
  app.post("/api/whatsapp/test", async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: "Phone and message are required" });
    }
    try {
      const result = await whatsapp.sendTextMessage(phone, message);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send a WhatsApp message to a specific patient (receptionist panel)
  app.post("/api/whatsapp/send-patient", async (req, res) => {
    const { patientId, message } = req.body;
    if (!patientId || !message) {
      return res.status(400).json({ error: "patientId and message are required" });
    }
    const patient = await storage.getPatient(parseInt(patientId));
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    if (!patient.phone) return res.status(400).json({ error: "Patient has no phone number on record" });
    try {
      const result = await whatsapp.sendTextMessage(patient.phone, message);
      res.json({ success: true, patient: { name: patient.name, phone: patient.phone }, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // WhatsApp Inbound Webhook — Meta verification handshake
  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "saivie_webhook_verify";
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified");
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: "Verification failed" });
    }
  });

  // WhatsApp Inbound Webhook — receive messages
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      // Verify Meta webhook signature if app secret is configured
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (appSecret) {
        const signature = req.headers["x-hub-signature-256"] as string | undefined;
        if (!signature) {
          console.warn("WhatsApp webhook: missing signature header — request rejected");
          return res.sendStatus(403);
        }
        const rawBody = (req as any).rawBody as Buffer | undefined;
        if (!rawBody) {
          console.warn("WhatsApp webhook: raw body unavailable — request rejected");
          return res.sendStatus(403);
        }
        const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          console.warn("WhatsApp webhook: signature mismatch — request rejected");
          return res.sendStatus(403);
        }
      }

      const body = req.body;
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return res.sendStatus(200);
      }

      for (const msg of messages) {
        const fromPhone = msg.from; // raw phone (91XXXXXXXXXX)
        const text = msg.text?.body?.trim().toUpperCase();

        if (!text || !fromPhone) continue;

        // Find patient by phone number
        const allPatients = await storage.getPatients();
        const patient = allPatients.find(p => {
          if (!p.phone) return false;
          const cleaned = whatsapp.formatPhoneNumber(p.phone);
          return cleaned === fromPhone || cleaned === fromPhone.replace(/^91/, "");
        });

        if (!patient) {
          console.log(`WhatsApp inbound from unknown phone ${fromPhone}: ${text}`);
          continue;
        }

        // Find their next upcoming appointment
        const appts = await storage.getAppointmentsByPatient(patient.id);
        const today = new Date().toISOString().split("T")[0];
        const upcoming = appts
          .filter(a => a.date >= today && a.status !== "completed" && a.status !== "cancelled")
          .sort((a, b) => a.date.localeCompare(b.date));
        const next = upcoming[0];

        if (!next) {
          // No upcoming appointment — still try AI assistant for general queries
          if (patient.phone) {
            try {
              const aiResp = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: `You are a friendly WhatsApp assistant for Saivie, a women's reproductive health clinic in India. A patient named ${patient.name} sent this message: "${msg.text?.body || text}"\n\nThey currently have no upcoming appointment.\n\nRespond warmly and helpfully in 2-3 sentences. Suggest they call the clinic to book an appointment if relevant. End with "_Saivie Reproductive Intelligence_". Keep it brief and supportive.` }] }],
              });
              await whatsapp.sendTextMessage(patient.phone, aiResp.text || `Hi ${patient.name}! Please call us to schedule your appointment. 💜\n\n_Saivie Reproductive Intelligence_`);
            } catch (_) {}
          }
          continue;
        }

        if (text === "CONFIRM") {
          await storage.updateAppointment(next.id, { status: "confirmed" });
          await whatsapp.sendTextMessage(
            patient.phone!,
            `✅ Confirmed! Your appointment on ${next.date} at ${next.time} is confirmed. See you then! 💜\n\n_Saivie Reproductive Intelligence_`
          );
          console.log(`Appointment ${next.id} confirmed by patient ${patient.name} via WhatsApp`);
        } else if (text === "CANCEL") {
          await storage.updateAppointment(next.id, { status: "cancelled" });
          await whatsapp.sendTextMessage(
            patient.phone!,
            `Your appointment on ${next.date} at ${next.time} has been cancelled. To reschedule, please call us or book online. We hope to see you soon. 💜\n\n_Saivie Reproductive Intelligence_`
          );
          console.log(`Appointment ${next.id} cancelled by patient ${patient.name} via WhatsApp`);
        } else {
          // AI virtual assistant — classify, detect urgency, respond using Gemini
          try {
            const originalText = msg.text?.body || text;
            const meds = await storage.getMedications(patient.id);
            const activeMeds = meds.filter(m => m.status === "active" || m.status === "Active" || !m.status).map(m => m.name);
            const aiResp = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{
                role: "user",
                parts: [{
                  text: `You are a helpful WhatsApp assistant for Saivie, a women's reproductive health clinic in India. A patient named ${patient.name} (Age: ${patient.age}, Next appointment: ${next.date} at ${next.time}) sent this message:\n\n"${originalText}"\n\nPatient's active medications: ${activeMeds.join(", ") || "None on record"}\n\nFirst, classify the message:\n- type: appointment_query | medication_question | symptom_query | result_query | general\n- urgent: true if message contains symptoms that need SAME DAY clinical attention (e.g. severe pain, heavy bleeding, fever >38.5°C, fetal movement change, chest pain, breathlessness) — false otherwise\n\nThen write a reply.\nRules:\n- Appointment queries: confirm their next appointment date/time\n- Medication questions: answer about their listed medications only; advise consulting doctor for dosage changes\n- Symptom queries: provide general supportive information; always recommend contacting the clinic if concerned\n- Never provide specific medical diagnoses\n- Keep response under 100 words, warm and supportive\n- End with "_Saivie Reproductive Intelligence_"\n- If urgent=true, start with "⚠️ *Please contact our clinic immediately or go to the nearest emergency room.*"\n\nReturn JSON: { "type": "...", "urgent": true|false, "reply": "..." }`,
                }],
              }],
              config: { responseMimeType: "application/json" },
            });

            let classification: { type: string; urgent: boolean; reply: string } = {
              type: "general",
              urgent: false,
              reply: `Thank you for your message, ${patient.name}! For queries, please call us. Your next appointment is on ${next.date} at ${next.time}. 💜\n\n_Saivie Reproductive Intelligence_`,
            };
            try {
              const rawText = aiResp.text || "{}";
              const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              classification = { ...classification, ...JSON.parse(cleaned) };
            } catch {}

            await whatsapp.sendTextMessage(patient.phone!, classification.reply);
            console.log(`[WhatsApp AI] type=${classification.type} urgent=${classification.urgent} patient=${patient.name}`);

            // If urgent, create a clinical note to flag for staff review
            if (classification.urgent) {
              try {
                await storage.createClinicalNote({
                  patientId: patient.id,
                  date: today,
                  type: "alert",
                  content: `⚠️ URGENT WhatsApp message from ${patient.name}: "${originalText.slice(0, 300)}"`,
                  author: "WhatsApp AI",
                  tags: ["urgent", "whatsapp", "needs-review"],
                } as any);
                console.log(`[WhatsApp AI] Urgent flag created for ${patient.name}`);
              } catch (flagErr: any) {
                console.error("[WhatsApp AI] Could not create urgent flag:", flagErr.message);
              }
            }
          } catch (aiErr: any) {
            console.error("[WhatsApp AI] Failed to generate response:", aiErr.message);
          }
        }
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error("WhatsApp webhook error:", err.message);
      res.sendStatus(200); // Always 200 to prevent Meta retry loops
    }
  });

  app.post("/api/onboarding/:appointmentId", async (req, res) => {
    const appointmentId = parseId(req.params.appointmentId);
    if (!appointmentId) return res.status(400).json({ error: "Invalid appointment ID" });

    const { chiefComplaint, history } = req.body;

    const appt = await storage.getAppointments().then(all => all.find(a => a.id === appointmentId));
    if (!appt) return res.status(404).json({ error: "Appointment not found" });

    // Update appointment chief complaint
    await storage.updateAppointment(appointmentId, { chiefComplaint });

    // Update patient history
    if (history) {
      await storage.updatePatient(appt.patientId!, { history });
    }

    res.json({ success: true });
  });

  app.get("/api/lab-tasks", async (_req, res) => {
    const tasks = await storage.getLabTasks();
    res.json(tasks);
  });

  app.post("/api/lab-tasks", async (req, res) => {
    const task = await storage.createLabTask(req.body);
    res.status(201).json(task);
  });

  app.patch("/api/lab-tasks/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateLabTask(id, req.body);
    if (!updated) return res.status(404).json({ error: "Lab task not found" });
    res.json(updated);
  });

  app.get("/api/nutrition-plans", async (_req, res) => {
    const plans = await storage.getNutritionPlans();
    res.json(plans);
  });

  app.post("/api/nutrition-plans", async (req, res) => {
    const plan = await storage.createNutritionPlan(req.body);
    res.status(201).json(plan);
  });

  app.get("/api/workouts", async (_req, res) => {
    const workouts = await storage.getWorkouts();
    res.json(workouts);
  });

  app.post("/api/workouts", async (req, res) => {
    const workout = await storage.createWorkout(req.body);
    res.status(201).json(workout);
  });

  app.get("/api/patients/:id/hormones", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const readings = await storage.getHormoneReadings(id);
    res.json(readings);
  });

  app.post("/api/patients/:id/hormones", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const reading = await storage.createHormoneReading({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(reading);
  });

  app.get("/api/patients/:id/pregnancy-metrics", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const metrics = await storage.getPregnancyMetrics(id);
    res.json(metrics);
  });

  app.post("/api/patients/:id/pregnancy-metrics", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const metric = await storage.createPregnancyMetric({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(metric);
  });

  app.get("/api/patients/:id/follicle-data", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const data = await storage.getFollicleData(id);
    res.json(data);
  });

  app.post("/api/patients/:id/follicle-data", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const data = await storage.createFollicleData({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(data);
  });

  app.get("/api/patients/:id/usg-data", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const data = await storage.getUsgData(id);
    res.json(data);
  });

  app.post("/api/patients/:id/usg-data", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const data = await storage.createUsgData({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(data);
  });

  app.get("/api/patients/:id/lab-results", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const results = await storage.getLabResults(id);
    res.json(results);
  });

  app.post("/api/patients/:id/lab-results", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const result = await storage.createLabResult({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(result);
    // Auto-trigger risk re-score when new lab result is uploaded
    scorePatient(id).catch(() => {});
  });

  app.get("/api/lab-tasks/:id/results", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const results = await storage.getLabResultsByTask(id);
    res.json(results);
  });

  app.get("/api/visit-history", async (req, res) => {
    const visits = await storage.getAllVisitHistory();
    res.json(visits);
  });

  app.get("/api/patients/:id/visit-history", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const visits = await storage.getVisitHistory(id);
    res.json(visits);
  });

  app.post("/api/patients/:id/visit-history", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const visit = await storage.createVisitHistory({
      ...req.body,
      patientId: id,
    });
    res.status(201).json(visit);
  });

  app.patch("/api/visit-history/:visitId", async (req, res) => {
    const visitId = parseId(req.params.visitId);
    if (!visitId) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateVisitHistory(visitId, req.body);
    if (!updated) return res.status(404).json({ error: "Visit not found" });
    res.json(updated);
  });

  app.get("/api/patients/:id/medications", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const meds = await storage.getMedications(id);
    res.json(meds);
  });

  app.post("/api/patients/:id/medications", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const med = await storage.createMedication({ ...req.body, patientId: id });
    res.status(201).json(med);
  });

  app.patch("/api/medications/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateMedication(id, req.body);
    if (!updated) return res.status(404).json({ error: "Medication not found" });
    res.json(updated);
  });

  app.delete("/api/medications/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteMedication(id);
    if (!deleted) return res.status(404).json({ error: "Medication not found" });
    res.status(204).send();
  });

  app.get("/api/clinical-notes", async (req, res) => {
    const notes = await storage.getAllClinicalNotes();
    res.json(notes);
  });

  app.get("/api/patients/:id/clinical-notes", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const notes = await storage.getClinicalNotes(id);
    res.json(notes);
  });

  app.post("/api/patients/:id/clinical-notes", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const note = await storage.createClinicalNote({ ...req.body, patientId: id });
    res.status(201).json(note);
  });

  app.patch("/api/clinical-notes/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateClinicalNote(id, req.body);
    if (!updated) return res.status(404).json({ error: "Clinical note not found" });
    res.json(updated);
  });

  app.delete("/api/clinical-notes/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteClinicalNote(id);
    if (!deleted) return res.status(404).json({ error: "Clinical note not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/referrals", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const refs = await storage.getReferrals(id);
    res.json(refs);
  });

  app.post("/api/patients/:id/referrals", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const ref = await storage.createReferral({ ...req.body, patientId: id });
    res.status(201).json(ref);
  });

  app.patch("/api/referrals/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateReferral(id, req.body);
    if (!updated) return res.status(404).json({ error: "Referral not found" });
    res.json(updated);
  });

  app.delete("/api/referrals/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteReferral(id);
    if (!deleted) return res.status(404).json({ error: "Referral not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/invoices", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const inv = await storage.getInvoices(id);
    res.json(inv);
  });

  app.post("/api/patients/:id/invoices", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid patient ID" });
    const inv = await storage.createInvoice({ ...req.body, patientId: id, date: req.body.date || new Date().toISOString().split("T")[0] });
    res.status(201).json(inv);
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateInvoice(id, req.body);
    if (!updated) return res.status(404).json({ error: "Invoice not found" });
    res.json(updated);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteInvoice(id);
    if (!deleted) return res.status(404).json({ error: "Invoice not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/consent-forms", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const forms = await storage.getConsentForms(id);
    res.json(forms);
  });

  app.post("/api/patients/:id/consent-forms", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const form = await storage.createConsentForm({ ...req.body, patientId: id });
    res.status(201).json(form);
  });

  app.patch("/api/consent-forms/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateConsentForm(id, req.body);
    if (!updated) return res.status(404).json({ error: "Consent form not found" });
    res.json(updated);
  });

  app.delete("/api/consent-forms/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteConsentForm(id);
    if (!deleted) return res.status(404).json({ error: "Consent form not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/documents", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const docs = await storage.getDocuments(id);
    res.json(docs);
  });

  app.post("/api/patients/:id/documents", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const doc = await storage.createDocument({ ...req.body, patientId: id });
    res.status(201).json(doc);
  });

  app.patch("/api/documents/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateDocument(id, req.body);
    if (!updated) return res.status(404).json({ error: "Document not found" });
    res.json(updated);
  });

  app.delete("/api/documents/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteDocument(id);
    if (!deleted) return res.status(404).json({ error: "Document not found" });
    res.status(204).send();
  });

  app.post("/api/auth/passcode", async (req, res) => {
    const { passcode } = req.body;
    if (!passcode) return res.status(400).json({ error: "Passcode required" });
    const user = await storage.getUserByPasscode(passcode);
    if (!user) return res.status(401).json({ error: "Invalid passcode" });

    let providerInfo = null;
    if (user.role === "clinician") {
      const providers = await storage.getProviders();
      const usernameToProvider: Record<string, string> = {
        "dr.priya": "Dr. Priya",
        "dr.ramesh": "Dr. Ramesh",
        "dr.sai": "Dr. Sai Dibyadarshini Bhuyan",
      };
      const providerName = usernameToProvider[user.username];
      if (providerName) {
        providerInfo = providers.find(p => p.name.toLowerCase().includes(providerName.toLowerCase().split(' ')[1]));
      }
    }

    res.json({
      role: user.role,
      username: user.username,
      id: user.id,
      provider: providerInfo ? { id: providerInfo.id, name: providerInfo.name, specialty: providerInfo.specialty, role: providerInfo.role } : null,
    });
  });

  app.post("/api/auth/patient-login", async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+91/, '').slice(-10);
    if (normalizedPhone.length !== 10 || !/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: "Please enter a valid 10-digit phone number" });
    }

    const allPatients = await storage.getPatients();
    const patient = allPatients.find((p: any) => {
      if (!p.phone) return false;
      const pPhone = p.phone.replace(/[\s\-\(\)]/g, '').replace(/^\+91/, '').slice(-10);
      return pPhone === normalizedPhone;
    });

    if (!patient) {
      return res.status(404).json({ error: "No patient found with this phone number. Please contact the clinic." });
    }

    res.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        age: patient.age,
        status: patient.status,
        condition: patient.condition,
      },
    });
  });

  app.get("/api/patient-protocols/:patientId", async (req, res) => {
    const patientId = parseId(req.params.patientId);
    if (!patientId) return res.status(400).json({ error: "Invalid ID" });
    const protocol = await storage.getPatientProtocol(patientId);
    res.json(protocol || null);
  });

  app.post("/api/patient-protocols", async (req, res) => {
    const protocol = await storage.savePatientProtocol(req.body);
    res.json(protocol);
  });

  app.get("/api/analytics/fertility", async (_req, res) => {
    res.json([
      { month: 'Jan', active: 45, ovulationRate: 78, pregnancies: 4 },
      { month: 'Feb', active: 48, ovulationRate: 82, pregnancies: 5 },
      { month: 'Mar', active: 52, ovulationRate: 80, pregnancies: 6 },
      { month: 'Apr', active: 50, ovulationRate: 85, pregnancies: 4 },
      { month: 'May', active: 55, ovulationRate: 88, pregnancies: 7 },
      { month: 'Jun', active: 58, ovulationRate: 87, pregnancies: 8 },
    ]);
  });

  app.get("/api/analytics/follicle-distribution", async (_req, res) => {
    res.json([
      { size: '14-16mm', count: 12 },
      { size: '16-18mm', count: 28 },
      { size: '18-20mm', count: 45 },
      { size: '20-22mm', count: 30 },
      { size: '>22mm', count: 15 },
    ]);
  });

  app.get("/api/analytics/pregnancy-risk", async (_req, res) => {
    res.json([
      { month: 'Jan', anemia: 12, gdm: 5, hypertension: 8 },
      { month: 'Feb', anemia: 10, gdm: 6, hypertension: 7 },
      { month: 'Mar', anemia: 8, gdm: 4, hypertension: 9 },
      { month: 'Apr', anemia: 9, gdm: 5, hypertension: 6 },
      { month: 'May', anemia: 7, gdm: 4, hypertension: 5 },
      { month: 'Jun', anemia: 6, gdm: 3, hypertension: 4 },
    ]);
  });

  app.get("/api/analytics/postpartum", async (_req, res) => {
    res.json([
      { week: 1, epds: 12, physical: 40 },
      { week: 2, epds: 10, physical: 55 },
      { week: 4, epds: 8, physical: 70 },
      { week: 6, epds: 6, physical: 85 },
      { week: 8, epds: 4, physical: 92 },
      { week: 12, epds: 3, physical: 98 },
    ]);
  });

  registerOcrRoutes(app);

  app.get("/api/analytics/pcos", async (_req, res) => {
    res.json([
      { month: 'Jan', acne: 8, hirsutism: 7, weight: 75 },
      { month: 'Feb', acne: 7, hirsutism: 7, weight: 74 },
      { month: 'Mar', acne: 6, hirsutism: 6, weight: 73 },
      { month: 'Apr', acne: 5, hirsutism: 6, weight: 72 },
      { month: 'May', acne: 4, hirsutism: 5, weight: 71 },
      { month: 'Jun', acne: 3, hirsutism: 5, weight: 70 },
    ]);
  });

  app.post("/api/google-sheets/sync", async (_req, res) => {
    try {
      const sheets = await getUncachableGoogleSheetClient();
      const spreadsheetId = "1mj3hkqjoQFrckIGC9Y0Jjlh6kYIYPHBVuPKAl7k-bxo";

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Form Responses 1'!A:R",
      });

      const rows = response.data.values || [];
      if (rows.length < 2) {
        return res.json({ imported: 0, skipped: 0, errors: [], message: "No data rows found" });
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const colIndex = (aliases: string[]) => {
        return headers.findIndex((h: string) => {
          const header = h.toLowerCase().trim();
          return aliases.some(alias => header === alias || (alias.length > 3 && header.includes(alias)));
        });
      };

      const nameIdx = colIndex(["patient name", "full name", "name"]);
      const phoneIdx = colIndex(["phone number", "mobile number", "whatsapp number", "phone", "mobile", "whatsapp"]);
      const emailIdx = colIndex(["email address", "email"]);
      const addressIdx = colIndex(["address", "location", "city"]);
      const itemsIdx = colIndex(["items", "services", "consultation details", "doctor name"]);
      const typeIdx = colIndex(["patient type"]);
      const lmpIdx = colIndex(["lmp", "last menstrual period"]);
      const heightIdx = colIndex(["height"]);
      const bpIdx = colIndex(["bp", "blood pressure"]);
      const weightIdx = colIndex(["weight"]);
      const ageIdx = colIndex(["age"]);
      const timestampIdx = colIndex(["timestamp"]);

      const existingPatients = await storage.getPatients();
      const existingProviders = await storage.getProviders(); // Automatically fetch available doctors
      const existingByPhone = new Map<string, number>();
      const existingByName = new Map<string, number>();
      for (const p of existingPatients) {
        if (p.phone) existingByPhone.set(p.phone.replace(/\D/g, ""), p.id);
        existingByName.set(p.name.toLowerCase().trim(), p.id);
      }

      const existingAppointments = await storage.getAppointments();
      const appointmentKeys = new Set(
        existingAppointments.map((a: any) => `${a.patientId}_${a.date}_${a.time}`)
      );

      const parseTimestamp = (ts: string): { date: string; time: string } | null => {
        if (!ts) return null;
        try {
          const parts = ts.split(" ");
          const dateParts = parts[0].split(/[/\-]/);
          if (dateParts.length !== 3) return null;
          // Google Forms always outputs MM/DD/YYYY — treat first part as month
          const month = dateParts[0].padStart(2, "0");
          const day = dateParts[1].padStart(2, "0");
          const year = dateParts[2].length === 2 ? "20" + dateParts[2] : dateParts[2];
          const date = `${year}-${month}-${day}`;
          const timePart = parts[1] || "00:00:00";
          const timePieces = timePart.split(":");
          const time = `${timePieces[0].padStart(2, "0")}:${(timePieces[1] || "00").padStart(2, "0")}`;
          return { date, time };
        } catch {
          return null;
        }
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let appointmentsCreated = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const val = (idx: number) => (idx >= 0 && idx < row.length ? (row[idx] || "").trim() : "");

        const name = val(nameIdx);
        if (!name) {
          skipped++;
          continue;
        }

        const phoneRaw = val(phoneIdx).replace(/\D/g, "");
        // Strip country code if it's there
        const phone = (phoneRaw.length > 10 && phoneRaw.startsWith("91")) ? phoneRaw.slice(-10) : phoneRaw;
        
        const email = val(emailIdx);
        const address = val(addressIdx);
        const patientType = val(typeIdx);
        const lmp = val(lmpIdx);
        const height = val(heightIdx);
        const bp = val(bpIdx);
        const weightStr = val(weightIdx);
        const ageStr = val(ageIdx);
        const timestamp = val(timestampIdx);
        const items = val(itemsIdx);

        const weight = weightStr ? parseFloat(weightStr.replace(/[^\d.]/g, "")) : undefined;
        const age = ageStr ? parseInt(ageStr.replace(/\D/g, ""), 10) : undefined;
        const parsed = parseTimestamp(timestamp);

        // Fix LMP year: Google Sheets sometimes gives "2/7/0026" for "2/7/26" → fix to 2-digit → 20xx
        const fixLmpYear = (raw: string): string => {
          if (!raw) return raw;
          const parts = raw.split("/");
          if (parts.length === 3) {
            let year = parts[2].replace(/\D/g, "");
            if (year.length <= 2) year = "20" + year.padStart(2, "0");
            else if (year.length === 4 && parseInt(year) < 100) year = "20" + year.slice(-2);
            return `${parts[0]}/${parts[1]}/${year}`;
          }
          return raw;
        };
        const lmpFixed = fixLmpYear(lmp);
        
        let providerId: number | undefined = undefined;
        let appointmentReason = items;

        if (items) {
          // Look for "Dr. Divya", "Dr Divya", "Dr. Priya", etc.
          const drMatch = items.match(/Dr\.?\s*([A-Za-z]+)/i);
          if (drMatch) {
            const drName = drMatch[1].toLowerCase();
            // Map "Divya" to "Sai Dibyadarshini Bhuyan" manually since it's an alias in the sheet
            const provider = existingProviders.find(p => 
              p.name.toLowerCase().includes(drName) || 
              (drName === "divya" && p.name.toLowerCase().includes("sai"))
            );
            if (provider) {
              providerId = provider.id;
            }
          }
        }

        let existingId = phone ? existingByPhone.get(phone) : undefined;
        if (!existingId) {
          existingId = existingByName.get(name.toLowerCase().trim());
        }

        try {
          let patientId: number;

          if (existingId) {
            // Only update fields that have actual values — never blank out existing good data
            const updateData: any = {};
            if (phone) updateData.phone = phone;
            if (email) updateData.email = email;
            if (address) updateData.address = address;
            if (patientType) updateData.type = patientType;
            if (lmpFixed) updateData.lmp = lmpFixed;
            if (height) updateData.height = height;
            if (bp) updateData.bp = bp;
            if (weight && !isNaN(weight)) updateData.weight = weight;
            if (parsed?.date) updateData.lastVisit = parsed.date;
            await storage.updatePatient(existingId, updateData);
            patientId = existingId;
            updated++;
          } else {
            const patient = await storage.createPatient({
              name,
              age: age && !isNaN(age) ? age : 0,
              phone: phone || undefined,
              email: email || undefined,
              address: address || undefined,
              type: patientType || undefined,
              lmp: lmpFixed || undefined,
              height: height || undefined,
              bp: bp || undefined,
              weight: weight && !isNaN(weight) ? weight : undefined,
              lastVisit: parsed?.date || undefined,
              status: "active",
            });
            patientId = patient.id;
            if (phone) existingByPhone.set(phone, patient.id);
            existingByName.set(name.toLowerCase().trim(), patient.id);
            imported++;
            // Send welcome WhatsApp for new patients synced from Google Sheets
            if (phone) {
              whatsapp.sendWelcomeMessage(phone, name).catch(() => {});
            }
            // Auto-score new patient from sheet sync
            scorePatient(patient.id).catch(() => {});
            if (lmpFixed) generateTrimesterChecklist(patient.id).catch(() => {});
          }

          if (parsed) {
            const apptKey = `${patientId}_${parsed.date}_${parsed.time}`;
            if (!appointmentKeys.has(apptKey)) {
              await storage.createAppointment({
                patientId,
                providerId,
                date: parsed.date,
                time: parsed.time,
                type: "Consultation",
                status: "Completed",
                reason: appointmentReason || undefined,
                visitType: patientType || undefined,
                notes: bp ? `BP: ${bp}` : undefined,
                vitals: bp || weight ? { bp: bp || undefined, weight: weight || undefined, height: height || undefined } as any : undefined,
              });
              appointmentKeys.add(apptKey);
              appointmentsCreated++;
            }
          }
        } catch (err: any) {
          errors.push(`Row ${i + 2}: ${name} - ${err.message}`);
        }
      }

      res.json({
        imported,
        updated,
        skipped,
        appointmentsCreated,
        total: dataRows.length,
        errors: errors.slice(0, 10),
        message: `Sync complete: ${imported} new patients, ${updated} updated, ${appointmentsCreated} appointments created`,
      });
    } catch (err: any) {
      console.error("Google Sheets sync error:", err);
      res.status(500).json({ error: "Failed to sync from Google Sheets: " + err.message });
    }
  });

  app.get("/api/google-sheets/status", async (_req, res) => {
    try {
      const sheets = await getUncachableGoogleSheetClient();
      const spreadsheetId = "1mj3hkqjoQFrckIGC9Y0Jjlh6kYIYPHBVuPKAl7k-bxo";
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Form Responses 1'!A:A",
      });
      const rowCount = (response.data.values?.length || 1) - 1;
      res.json({ connected: true, rowCount });
    } catch (err: any) {
      res.json({ connected: false, rowCount: 0, error: err.message });
    }
  });

  app.get("/api/follow-up-calls", async (_req, res) => {
    const calls = await storage.getFollowUpCalls();
    res.json(calls);
  });

  app.post("/api/follow-up-calls", async (req, res) => {
    const call = await storage.createFollowUpCall(req.body);
    res.status(201).json(call);
  });

  app.patch("/api/follow-up-calls/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateFollowUpCall(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/follow-up-calls/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteFollowUpCall(id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });

  app.post("/api/follow-up-calls/import-sheet", async (_req, res) => {
    try {
      const sheets = await getUncachableGoogleSheetClient();
      const spreadsheetId = "1y1siQnidCkQR1b3PcVJWtjleJ6AT4nsx9wCqcT_Bbxs";

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Followup'!A:Q",
      });

      const rows = response.data.values || [];
      if (rows.length < 2) {
        return res.json({ imported: 0, skipped: 0, message: "No data rows found" });
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const colIndex = (name: string) => {
        const idx = headers.findIndex((h: string) => h.toLowerCase().trim().includes(name.toLowerCase()));
        return idx;
      };

      const consultDateIdx = colIndex("consultation date");
      const plannedIdx = colIndex("planned schedule");
      const actualIdx = colIndex("actual date");
      const nameIdx = colIndex("name");
      const lmpIdx = colIndex("lmp");
      const typeIdx = colIndex("patient type");
      const phoneIdx = colIndex("phone");
      const notesIdx = colIndex("notes");
      const feelingIdx = colIndex("how are you feeling");
      const medicineIdx = colIndex("did you get all your medicine");
      const concernIdx = colIndex("let me know if any concern");
      const crossSellIdx = colIndex("cross sell");
      const nextVisitIdx = colIndex("next visit");
      const nextMilestoneIdx = colIndex("next milestone");
      const didntPickIdx = colIndex("didnt pick call time");
      const followUpIdx = colIndex("follow up");
      const followUpDateIdx = colIndex("follow up date");

      const existingPatients = await storage.getPatients();
      const patientByPhone = new Map<string, number>();
      const patientByName = new Map<string, number>();
      for (const p of existingPatients) {
        if (p.phone) patientByPhone.set(p.phone.replace(/\D/g, ""), p.id);
        patientByName.set(p.name.toLowerCase().trim(), p.id);
      }

      const existingCalls = await storage.getFollowUpCalls();
      const existingKeys = new Set(existingCalls.map(c => `${c.patientName?.toLowerCase().trim()}_${c.actualDate || c.plannedDate}`));

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const val = (idx: number) => (idx >= 0 && idx < row.length ? (row[idx] || "").trim() : "");

        const name = val(nameIdx);
        if (!name) { skipped++; continue; }

        const phone = val(phoneIdx).replace(/\D/g, "");
        const actualDate = val(actualIdx);
        const plannedDate = val(plannedIdx);

        const key = `${name.toLowerCase().trim()}_${actualDate || plannedDate}`;
        if (existingKeys.has(key)) { skipped++; continue; }

        let patientId: number | undefined = phone ? patientByPhone.get(phone) : undefined;
        if (!patientId) patientId = patientByName.get(name.toLowerCase().trim());

        try {
          await storage.createFollowUpCall({
            patientId: patientId ?? null,
            patientName: name,
            phone: phone || null,
            patientType: val(typeIdx) || null,
            consultationDate: val(consultDateIdx) || null,
            plannedDate: plannedDate || null,
            actualDate: actualDate || null,
            lmp: val(lmpIdx) || null,
            notes: val(notesIdx) || null,
            feeling: val(feelingIdx) || null,
            gotMedicines: val(medicineIdx) || null,
            concerns: val(concernIdx) || null,
            crossSell: val(crossSellIdx) || null,
            nextVisit: val(nextVisitIdx) || null,
            nextMilestone: val(nextMilestoneIdx) || null,
            didntPickCallTime: val(didntPickIdx) || null,
            followUp: val(followUpIdx) || null,
            followUpDate: val(followUpDateIdx) || null,
            status: val(notesIdx) ? "completed" : "pending",
          });
          existingKeys.add(key);
          imported++;
        } catch (err: any) {
          errors.push(`Row ${i + 2}: ${name} - ${err.message}`);
        }
      }

      res.json({
        imported,
        skipped,
        total: dataRows.length,
        errors: errors.slice(0, 10),
        message: `Imported ${imported} follow-up call records, ${skipped} skipped`,
      });
    } catch (err: any) {
      console.error("Follow-up sheet import error:", err);
      res.status(500).json({ error: "Failed to import follow-up calls: " + err.message });
    }
  });

  app.get("/api/follow-up-calls/sheet-status", async (_req, res) => {
    try {
      const sheets = await getUncachableGoogleSheetClient();
      const spreadsheetId = "1y1siQnidCkQR1b3PcVJWtjleJ6AT4nsx9wCqcT_Bbxs";
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Followup'!A:A",
      });
      const rowCount = (response.data.values?.length || 1) - 1;
      res.json({ connected: true, rowCount });
    } catch (err: any) {
      res.json({ connected: false, rowCount: 0, error: err.message });
    }
  });

  app.post("/api/google-drive/import-lab-reports", async (req, res) => {
    try {
      const autoCreate = req.body?.autoCreatePatients !== false;
      let patients = await storage.getPatients();
      const allDocs = await storage.getAllDocuments();

      const result = await importLabReports(
        patients.map(p => ({ id: p.id, name: p.name })),
        allDocs.map(d => ({ patientId: d.patientId, metadata: d.metadata })),
        (doc) => storage.createDocument(doc)
      );

      if (autoCreate && result.unmatched.length > 0) {
        const uniqueNames = Array.from(new Set(result.unmatched));
        const createdPatients: Array<{ driveName: string; patientId: number; patientName: string }> = [];

        for (const driveName of uniqueNames) {
          const nameParts = driveName.replace(/^(DR|MRS|MR|MS|MISS)\s+/i, '').trim().split(/\s+/);
          const formattedName = nameParts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');

          const newPatient = await storage.createPatient({
            name: formattedName,
            age: 0,
            status: 'active',
          });
          createdPatients.push({ driveName, patientId: newPatient.id, patientName: newPatient.name });
        }

        const updatedPatients = await storage.getPatients();
        const secondResult = await importLabReports(
          updatedPatients.map(p => ({ id: p.id, name: p.name })),
          (await storage.getAllDocuments()).map(d => ({ patientId: d.patientId, metadata: d.metadata })),
          (doc) => storage.createDocument(doc)
        );

        res.json({
          ...secondResult,
          autoCreatedPatients: createdPatients,
          firstPassImported: result.imported,
        });
      } else {
        res.json(result);
      }
    } catch (err: any) {
      console.error("Google Drive import error:", err);
      res.status(500).json({ error: "Failed to import lab reports: " + err.message });
    }
  });

  app.post("/api/patients/:id/extract-lab-results", async (req, res) => {
    try {
      const patientId = parseId(req.params.id);
      if (!patientId) return res.status(400).json({ error: "Invalid ID" });
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const allDocs = await storage.getDocuments(patientId);
      const labDocs = allDocs.filter((d: any) => d.category === 'Lab Report' && d.metadata?.driveFileId);

      if (labDocs.length === 0) {
        return res.json({ extracted: 0, message: "No lab report PDFs found for this patient" });
      }

      const existingResults = await storage.getLabResults(patientId);
      const normalizeTestName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingSet = new Set(
        existingResults.map((lr: any) => `${normalizeTestName(lr.testName || '')}|${lr.date || ''}`)
      );

      let totalExtracted = 0;
      let skippedDuplicates = 0;
      const errors: string[] = [];

      for (const doc of labDocs) {
        const driveFileId = (doc.metadata as any)?.driveFileId;
        if (!driveFileId) continue;

        try {
          const pdfBuffer = await downloadFileAsBuffer(driveFileId);
          const base64Pdf = pdfBuffer.toString('base64');

          if (pdfBuffer.length > 7 * 1024 * 1024) {
            errors.push(`File too large for processing: ${doc.name} (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
            continue;
          }

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: "application/pdf",
                      data: base64Pdf,
                    },
                  },
                  {
                    text: `Extract all lab test results from this medical lab report PDF. Return a JSON array of test results. Each element should have these fields:
- "testName": the name of the test (e.g., "Hemoglobin", "TSH", "Fasting Glucose", "AMH", "Progesterone")
- "value": the numeric value as a number (not string). If no numeric value, use null.
- "unit": the unit of measurement (e.g., "g/dL", "mg/dL", "ng/mL", "mIU/L")
- "status": one of "Normal", "High", "Low", "Critical", or "Borderline" based on the reference range
- "category": the test category (e.g., "Hematology", "Hormone", "Biochemistry", "Thyroid", "Liver Function", "Kidney Function")
- "referenceMin": minimum of reference range as number (or null)
- "referenceMax": maximum of reference range as number (or null)
- "collectedDate": the sample collection date or report date found on the PDF in YYYY-MM-DD format (e.g., "2025-01-15"). Look for fields like "Collected On", "Sample Collection Date", "Report Date", "Date" on the report. If not found, use null.`
                  },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
            },
          });

          const text = response.text || "";
          let parsed: any[];
          try {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(cleaned);
            parsed = Array.isArray(result) ? result : [result];
          } catch {
            errors.push(`Could not parse AI response for ${doc.name}`);
            continue;
          }

          const fallbackDate = doc.date || new Date().toISOString().split('T')[0];

          for (const item of parsed) {
            if (!item.testName) continue;
            const resultDate = item.collectedDate || fallbackDate;
            const dupKey = `${normalizeTestName(item.testName)}|${resultDate}`;
            if (existingSet.has(dupKey)) {
              skippedDuplicates++;
              continue;
            }
            await storage.createLabResult({
              patientId,
              testName: item.testName,
              value: item.value != null ? parseFloat(item.value) : null,
              unit: item.unit || null,
              status: item.status || null,
              category: item.category || null,
              date: resultDate,
              referenceMin: item.referenceMin != null ? parseFloat(item.referenceMin) : null,
              referenceMax: item.referenceMax != null ? parseFloat(item.referenceMax) : null,
              notes: `Extracted from Drive file: ${driveFileId}`,
              results: null,
              labTaskId: null,
            });
            existingSet.add(dupKey);
            totalExtracted++;
          }
        } catch (err: any) {
          console.error(`Error extracting from ${doc.name}:`, err.message);
          errors.push(`Error processing ${doc.name}: ${err.message}`);
        }
      }

      let message = '';
      if (totalExtracted > 0) {
        message = `Extracted ${totalExtracted} new lab result(s)`;
      } else {
        message = "No new results extracted";
      }
      if (skippedDuplicates > 0) {
        message += ` (${skippedDuplicates} duplicate${skippedDuplicates > 1 ? 's' : ''} skipped)`;
      }

      res.json({
        extracted: totalExtracted,
        skippedDuplicates,
        documentsProcessed: labDocs.length,
        errors,
        message,
      });
      // Auto-trigger risk re-score after lab extraction completes
      if (totalExtracted > 0) {
        scorePatient(patientId).catch(() => {});
      }
    } catch (err: any) {
      console.error("Lab extraction error:", err);
      res.status(500).json({ error: "Failed to extract lab results: " + err.message });
    }
  });

  // ── Risk Intelligence Endpoints ──────────────────────────────────────────

  app.post("/api/patients/:id/risk-score", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const patient = await storage.getPatient(id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    const result = await scorePatient(id);
    if (!result) return res.status(500).json({ error: "Risk scoring failed" });
    res.json(result);
  });

  app.post("/api/patients/batch-risk-score", async (req, res) => {
    const patientIds = Array.isArray(req.body?.patientIds) ? req.body.patientIds.map(Number).filter(Boolean) : undefined;
    const result = await batchScorePatients(patientIds);
    res.json(result);
  });

  app.post("/api/patients/:id/trimester-checklist", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const patient = await storage.getPatient(id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    if (!patient.lmp) return res.status(400).json({ error: "LMP not recorded for this patient" });
    const result = await generateTrimesterChecklist(id);
    if (!result) return res.status(500).json({ error: "Checklist generation failed" });
    res.json(result);
  });

  // ── Billing Catalog ───────────────────────────────────────────────────────

  app.get("/api/billing-catalog", async (_req, res) => {
    const catalog = await storage.getBillingCatalog();
    res.json(catalog);
  });

  app.post("/api/billing-catalog", async (req, res) => {
    const item = await storage.createBillingCatalogItem(req.body);
    res.status(201).json(item);
  });

  app.patch("/api/billing-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateBillingCatalogItem(id, req.body);
    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json(updated);
  });

  app.delete("/api/billing-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteBillingCatalogItem(id);
    if (!deleted) return res.status(404).json({ error: "Item not found" });
    res.status(204).send();
  });

  app.get("/api/medicine-catalog", async (_req, res) => {
    const catalog = await storage.getMedicineCatalog();
    res.json(catalog);
  });

  app.post("/api/medicine-catalog", async (req, res) => {
    const entry = await storage.createMedicineCatalogEntry(req.body);
    res.status(201).json(entry);
  });

  app.patch("/api/medicine-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const updated = await storage.updateMedicineCatalogEntry(id, req.body);
    if (!updated) return res.status(404).json({ error: "Medicine not found" });
    res.json(updated);
  });

  app.delete("/api/medicine-catalog/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteMedicineCatalogEntry(id);
    if (!deleted) return res.status(404).json({ error: "Medicine not found" });
    res.status(204).send();
  });

  app.post("/api/patients/:id/extract-prescription", async (req, res) => {
    try {
      const patientId = parseId(req.params.id);
      if (!patientId) return res.status(400).json({ error: "Invalid ID" });
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const { fileData, mimeType, fileName } = req.body;
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "Missing fileData or mimeType" });
      }

      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedMimes.includes(mimeType)) {
        return res.status(400).json({ error: "Unsupported file type. Please upload a PDF or image (JPEG, PNG)." });
      }

      const fileSizeBytes = Buffer.byteLength(fileData, 'base64');
      if (fileSizeBytes > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 10 MB." });
      }

      const catalogEntries = await storage.getMedicineCatalog();
      let catalogHint = '';
      if (catalogEntries.length > 0) {
        const catalogList = catalogEntries.map(m =>
          `${m.name}${m.genericName ? ` (${m.genericName})` : ''}${m.defaultDose ? ` — ${m.defaultDose}` : ''}${m.defaultFrequency ? `, ${m.defaultFrequency}` : ''}`
        ).join('\n');
        catalogHint = `\n\nIMPORTANT — This clinic commonly prescribes the following medicines. When the handwriting is ambiguous, prefer matching to one of these known medicines:\n${catalogList}\n\nUse the exact name from this list when there is a match. If a medicine is not in this list, still extract it with your best reading.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: fileData,
                },
              },
              {
                text: `Extract all prescribed medications from this prescription document (image or PDF). Return a JSON array of medications. Each element should have these fields:
- "name": the medication/drug name (e.g., "Folic Acid", "Progesterone", "Metformin", "Letrozole")
- "dose": the dosage (e.g., "5 mg", "200 mg", "500 mg", "2.5 mg")
- "frequency": how often to take it (e.g., "Once daily", "Twice daily", "Three times a day", "At bedtime")
- "route": route of administration (e.g., "Oral", "Vaginal", "Subcutaneous", "Intramuscular", "Topical"). Default to "Oral" if not specified.
- "startDate": the prescription date or start date found on the document in YYYY-MM-DD format. If not found, use null.
- "duration": duration mentioned (e.g., "30 days", "2 weeks", "until next visit"). If not found, use null.
- "notes": any additional instructions (e.g., "Take with food", "Empty stomach", "After meals"). If none, use null.

Be thorough — extract every medication mentioned including supplements and vitamins. If the prescription is handwritten, do your best to read it.${catalogHint}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      let parsed: any[];
      try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(cleaned);
        parsed = Array.isArray(result) ? result : [result];
      } catch {
        return res.status(422).json({ error: "Could not parse AI response", raw: text });
      }

      const existingMeds = await storage.getMedications(patientId);
      const normalizeName = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingSet = new Set(
        existingMeds.map((m: any) => `${normalizeName(m.name)}|${m.dose || ''}`)
      );

      let inserted = 0;
      let skipped = 0;
      const today = new Date().toISOString().split('T')[0];

      for (const item of parsed) {
        if (!item.name) continue;

        const dupKey = `${normalizeName(item.name)}|${item.dose || ''}`;
        if (existingSet.has(dupKey)) {
          skipped++;
          continue;
        }

        await storage.createMedication({
          patientId,
          name: item.name,
          dose: item.dose || null,
          frequency: item.frequency || null,
          route: item.route || "Oral",
          startDate: item.startDate || today,
          endDate: null,
          prescribedBy: null,
          status: "Active",
          notes: [item.notes, item.duration ? `Duration: ${item.duration}` : null].filter(Boolean).join('. ') || null,
        });
        existingSet.add(dupKey);
        inserted++;
      }

      await storage.createDocument({
        patientId,
        name: fileName || 'Prescription',
        type: 'prescription',
        category: 'Prescription',
        date: today,
        description: `AI-extracted prescription: ${inserted} medication(s) found`,
        metadata: { extractedMeds: inserted, skippedDuplicates: skipped, uploadedAt: new Date().toISOString() },
      });

      let message = '';
      if (inserted > 0) {
        message = `Extracted ${inserted} medication(s) from prescription`;
      } else {
        message = "No new medications extracted";
      }
      if (skipped > 0) {
        message += ` (${skipped} duplicate${skipped > 1 ? 's' : ''} skipped)`;
      }

      res.json({ inserted, skipped, total: parsed.length, message });
    } catch (err: any) {
      console.error("Prescription extraction error:", err);
      res.status(500).json({ error: "Failed to extract prescription: " + err.message });
    }
  });

  app.get("/api/google-drive/status", async (_req, res) => {
    try {
      const files = await listLabReportFiles();
      const allDocs = await storage.getAllDocuments();
      const importedDriveIds = new Set<string>();
      for (const doc of allDocs) {
        if (doc.metadata && typeof doc.metadata === 'object' && (doc.metadata as any).driveFileId) {
          importedDriveIds.add((doc.metadata as any).driveFileId);
        }
      }
      const testReports = files.filter(f => f.name.startsWith('TestReport_'));
      const alreadyImported = testReports.filter(f => importedDriveIds.has(f.id)).length;

      res.json({
        connected: true,
        totalFiles: files.length,
        testReports: testReports.length,
        alreadyImported,
        pendingImport: testReports.length - alreadyImported,
      });
    } catch (err: any) {
      res.json({ connected: false, totalFiles: 0, error: err.message });
    }
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const patients = await storage.getPatients();
      const allAppointments = await storage.getAppointments();
      const todayAppointments = allAppointments.filter((a: any) => a.date === today);
      const allDocuments = await storage.getAllDocuments();
      const allClinicalNotes = await storage.getAllClinicalNotes();
      const allVisitHistory = await storage.getAllVisitHistory();
      const nutritionPlans = await storage.getNutritionPlans();
      const labTasks = await storage.getLabTasks();

      const fertilityTypes = ['fertility', 'ttc', 'iui', 'ivf', 'natural_conception', 'iui cycle', 'pcos'];
      const pregnancyTypes = ['pregnancy', 'pregnant', 'antenatal'];
      const postpartumTypes = ['postpartum', 'postnatal'];

      const fertilityCount = patients.filter((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t))).length;

      const allPregnancyTypePatients = patients.filter((p: any) => pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t)));
      const pregnancyCount = allPregnancyTypePatients.filter((p: any) => {
        const ps = (p.pregnancyStatus || '').toLowerCase();
        if (['completed', 'aborted', 'not_continuing'].includes(ps)) return false;
        if (!p.lmp) return true;
        const lmpDate = new Date(p.lmp);
        if (isNaN(lmpDate.getTime())) return true;
        const weeks = Math.floor((Date.now() - lmpDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return weeks >= 1 && weeks <= 42;
      }).length;

      const postpartumCount = patients.filter((p: any) => postpartumTypes.some(t => (p.type || '').toLowerCase().includes(t))).length;

      const allReferrals: any[] = [];
      for (const p of patients.slice(0, 100)) {
        try {
          const refs = await storage.getReferrals(p.id);
          allReferrals.push(...refs);
        } catch { }
      }
      const referralsIn = allReferrals.filter((r: any) => (r.direction || '').toLowerCase() === 'in' || (r.type || '').toLowerCase().includes('incoming')).length;
      const referralsOut = allReferrals.filter((r: any) => (r.direction || '').toLowerCase() === 'out' || (r.type || '').toLowerCase().includes('outgoing')).length;

      const highRiskPatients = patients.filter((p: any) => {
        const risk = (p.riskLevel || p.risk || '').toLowerCase();
        const type = (p.type || '').toLowerCase();
        return risk.includes('high') || type.includes('high risk');
      });

      const todayLabReports = allDocuments.filter((d: any) => d.category === 'Lab Report' && d.date === today).length;
      const recentLabReports = allDocuments.filter((d: any) => d.category === 'Lab Report').length;

      const todayNotes = allClinicalNotes.filter((n: any) => {
        const noteDate = n.date || (n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : '');
        return noteDate === today;
      }).length;

      const recentNutritionUpdates = nutritionPlans.length;

      const todayVisits = allVisitHistory.filter((v: any) => v.date === today).length;

      const pregnantPatients = allPregnancyTypePatients.filter((p: any) => {
        const ps = (p.pregnancyStatus || '').toLowerCase();
        if (['completed', 'aborted', 'not_continuing'].includes(ps)) return false;
        if (!p.lmp) return true;
        const lmpDate = new Date(p.lmp);
        if (isNaN(lmpDate.getTime())) return true;
        const weeks = Math.floor((Date.now() - lmpDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return weeks >= 1 && weeks <= 42;
      });
      const highBpAlerts = pregnantPatients.filter((p: any) => {
        const bp = (p.bp || '').toString().trim();
        if (!bp || !bp.includes('/')) return false;
        const systolic = parseInt(bp.split('/')[0], 10);
        return !isNaN(systolic) && systolic >= 140;
      }).length;
      const lowHbCases = pregnantPatients.filter((p: any) => {
        const hb = parseFloat(p.hb);
        return !isNaN(hb) && hb > 0 && hb < 10;
      }).length;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthAppointments = allAppointments.filter((a: any) => {
        const d = new Date(a.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const priorityPatients = [];
      const todayPatientIds = todayAppointments.map((a: any) => a.patientId);
      const todayPatients = patients.filter((p: any) => todayPatientIds.includes(p.id));

      const fertilityTodayPatients = todayPatients.filter((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t)));
      const pregnancyTodayPatients = todayPatients.filter((p: any) => pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t)));
      const postpartumTodayPatients = todayPatients.filter((p: any) => postpartumTypes.some(t => (p.type || '').toLowerCase().includes(t)));

      if (fertilityTodayPatients.length > 0) priorityPatients.push({ ...fertilityTodayPatients[0], priorityType: 'fertility', priorityLevel: 'action' });
      else if (patients.filter((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t))).length > 0) {
        const fp = patients.find((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t)));
        if (fp) priorityPatients.push({ ...fp, priorityType: 'fertility', priorityLevel: 'action' });
      }

      if (pregnancyTodayPatients.length > 0) priorityPatients.push({ ...pregnancyTodayPatients[0], priorityType: 'pregnancy', priorityLevel: 'review' });
      else if (pregnantPatients.length > 0) priorityPatients.push({ ...pregnantPatients[0], priorityType: 'pregnancy', priorityLevel: 'review' });

      if (postpartumTodayPatients.length > 0) priorityPatients.push({ ...postpartumTodayPatients[0], priorityType: 'postpartum', priorityLevel: 'alert' });
      else {
        const pp = patients.find((p: any) => postpartumTypes.some(t => (p.type || '').toLowerCase().includes(t)));
        if (pp) priorityPatients.push({ ...pp, priorityType: 'postpartum', priorityLevel: 'alert' });
      }

      const usgReferralPatients = todayPatients.slice(0, 5).map((p: any) => {
        const type = (p.type || '').toLowerCase();
        let usgType = 'General USG';
        if (fertilityTypes.some(t => type.includes(t))) usgType = 'Follicular Study';
        else if (pregnancyTypes.some(t => type.includes(t))) {
          if (p.lmp) {
            const weeks = Math.floor((Date.now() - new Date(p.lmp).getTime()) / (7 * 24 * 60 * 60 * 1000));
            if (weeks <= 10) usgType = 'Early Pregnancy Scan';
            else if (weeks <= 14) usgType = 'NT Scan';
            else if (weeks <= 22) usgType = 'Anomaly Scan';
            else usgType = 'Growth Scan';
          } else usgType = 'Pregnancy Scan';
        }
        return { id: p.id, name: p.name, usgType, type: p.type };
      });

      const pendingLabTasks = labTasks.filter((t: any) => (t.status || '').toLowerCase() !== 'completed').length;

      res.json({
        today,
        todayAppointments: todayAppointments.length,
        totalPatients: patients.length,
        fertilityActive: fertilityCount,
        pregnancyFollowups: pregnancyCount,
        postpartumActive: postpartumCount,
        referralsIn,
        referralsOut: referralsOut || allReferrals.length,
        totalReferrals: allReferrals.length,
        highRiskAlerts: highRiskPatients.length,
        highRiskPatients: highRiskPatients.slice(0, 5).map((p: any) => ({ id: p.id, name: p.name, type: p.type })),
        priorityPatients,
        usgReferralPatients,
        thisMonthPregnancies: pregnancyCount,
        pendingLabTasks,
        teamActivity: {
          clinicalNotes: todayNotes,
          nutritionPlans: recentNutritionUpdates,
          labReportsToday: todayLabReports,
          labReportsTotal: recentLabReports,
          visitsToday: todayVisits,
        },
        clinicInsights: {
          pregnanciesThisMonth: pregnancyCount,
          highBpAlerts,
          lowHbCases,
        },
      });
    } catch (err: any) {
      console.error("Dashboard stats error:", err);
      res.status(500).json({ error: "Failed to fetch dashboard stats: " + err.message });
    }
  });

  app.get("/api/patients/by-category/:category", async (req: any, res: any) => {
    try {
      const { category } = req.params;
      const patients = await storage.getPatients();
      const allAppointments = await storage.getAppointments();
      const today = new Date().toISOString().split('T')[0];

      const fertilityTypes = ['fertility', 'ttc', 'iui', 'ivf', 'natural_conception', 'iui cycle', 'pcos'];
      const pregnancyTypes = ['pregnancy', 'pregnant', 'antenatal'];
      const postpartumTypes = ['postpartum', 'postnatal'];

      const calcWeeks = (lmp: string | null | undefined) => {
        if (!lmp) return null;
        const d = new Date(lmp);
        if (isNaN(d.getTime())) return null;
        return Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
      };

      let filtered: any[] = [];
      let title = '';

      switch (category) {
        case 'fertility':
          title = 'Fertility Active Patients';
          filtered = patients.filter((p: any) => fertilityTypes.some(t => (p.type || '').toLowerCase().includes(t)));
          break;
        case 'pregnancy':
          title = 'Active Pregnancy Follow-ups';
          filtered = patients.filter((p: any) => {
            if (!pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t))) return false;
            const ps = (p.pregnancyStatus || '').toLowerCase();
            if (['completed', 'aborted', 'not_continuing'].includes(ps)) return false;
            const weeks = calcWeeks(p.lmp);
            if (weeks === null) return true;
            return weeks >= 1 && weeks <= 42;
          });
          break;
        case 'pregnancy-all':
          title = 'All Pregnancy Patients';
          filtered = patients.filter((p: any) => pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t)));
          break;
        case 'postpartum':
          title = 'Postpartum Active Patients';
          filtered = patients.filter((p: any) => postpartumTypes.some(t => (p.type || '').toLowerCase().includes(t)));
          break;
        case 'high-risk':
          title = 'High Risk Patients';
          filtered = patients.filter((p: any) => {
            const risk = (p.riskLevel || p.risk || '').toLowerCase();
            const type = (p.type || '').toLowerCase();
            return risk.includes('high') || type.includes('high risk');
          });
          break;
        case 'today-appointments':
          title = "Today's Appointments";
          const todayAppts = allAppointments.filter((a: any) => a.date === today);
          const patientIds = todayAppts.map((a: any) => a.patientId);
          filtered = patients.filter((p: any) => patientIds.includes(p.id)).map((p: any) => {
            const appt = todayAppts.find((a: any) => a.patientId === p.id);
            return { ...p, appointmentTime: appt?.time, appointmentType: appt?.type };
          });
          break;
        case 'referrals':
          title = 'Patients with Referrals';
          const refPatients: any[] = [];
          for (const p of patients.slice(0, 200)) {
            try {
              const refs = await storage.getReferrals(p.id);
              if (refs.length > 0) refPatients.push({ ...p, referralCount: refs.length });
            } catch { }
          }
          filtered = refPatients;
          break;
        case 'high-bp':
          title = 'High BP Alert Patients';
          filtered = patients.filter((p: any) => {
            if (!pregnancyTypes.some(t => (p.type || '').toLowerCase().includes(t))) return false;
            const ps = (p.pregnancyStatus || '').toLowerCase();
            if (['completed', 'aborted', 'not_continuing'].includes(ps)) return false;
            const weeks = calcWeeks(p.lmp);
            if (weeks !== null && (weeks < 1 || weeks > 42)) return false;
            const bp = (p.bp || '').toString().trim();
            if (!bp || !bp.includes('/')) return false;
            const systolic = parseInt(bp.split('/')[0], 10);
            return !isNaN(systolic) && systolic >= 140;
          });
          break;
        default:
          title = 'All Patients';
          filtered = patients;
      }

      const result = filtered.map((p: any) => {
        const weeks = calcWeeks(p.lmp);
        return {
          id: p.id,
          name: p.name,
          age: p.age,
          type: p.type,
          phone: p.phone,
          email: p.email,
          lmp: p.lmp,
          bp: p.bp,
          gestationalWeeks: weeks,
          pregnancyStatus: p.pregnancyStatus || (weeks !== null && weeks > 42 ? 'completed' : weeks !== null ? 'active' : null),
          riskLevel: p.riskLevel || p.risk,
          appointmentTime: p.appointmentTime,
          appointmentType: p.appointmentType,
          referralCount: p.referralCount,
        };
      });

      res.json({ title, category, count: result.length, patients: result });
    } catch (err: any) {
      console.error("Patient category error:", err);
      res.status(500).json({ error: "Failed to fetch patients: " + err.message });
    }
  });

  app.patch("/api/patients/:id/pregnancy-status", async (req: any, res: any) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const { pregnancyStatus } = req.body;
      const validStatuses = ['active', 'completed', 'aborted', 'not_continuing'];
      if (!validStatuses.includes(pregnancyStatus)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      const patient = await storage.getPatient(id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const updated = await storage.updatePatient(id, { pregnancyStatus });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/patients/:id/prime-member", async (req: any, res: any) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const { isPrimeMember } = req.body;
      const patient = await storage.getPatient(id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const updateData: any = { isPrimeMember: !!isPrimeMember };
      if (isPrimeMember && !patient.isPrimeMember) {
        updateData.primeMemberSince = new Date().toISOString().split("T")[0];
      }
      if (!isPrimeMember) {
        updateData.primeMemberSince = null;
      }
      const updated = await storage.updatePatient(id, updateData);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/prime-members", async (req: any, res: any) => {
    try {
      const allPatients = await storage.getPatients();
      const primeMembers = allPatients.filter(p => p.isPrimeMember);
      res.json(primeMembers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/owner/attendance", async (req: any, res: any) => {
    try {
      const { startDate, endDate } = req.query;
      const records = await storage.getAttendance(startDate, endDate);
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/owner/attendance", async (req: any, res: any) => {
    try {
      const record = await storage.createAttendance(req.body);
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/owner/expenses", async (req: any, res: any) => {
    try {
      const { startDate, endDate } = req.query;
      const records = await storage.getExpenses(startDate, endDate);
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/owner/expenses", async (req: any, res: any) => {
    try {
      const record = await storage.createExpense(req.body);
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/owner/dashboard", async (req: any, res: any) => {
    try {
      const allPatients = await storage.getPatients();
      const allAppointments = await storage.getAppointments();
      const allInvoices = await storage.getAllInvoices();
      const allExpenses = await storage.getExpenses();
      const allAttendance = await storage.getAttendance();
      const allLabResults = await storage.getAllDocuments();

      const today = new Date().toISOString().split("T")[0];
      const todayAttendance = allAttendance.filter(a => a.date === today);
      const presentToday = todayAttendance.filter(a => a.status === "present" || a.status === "half-day").length;
      const totalStaff = new Set(allAttendance.map(a => a.employeeName)).size;

      const totalRevenue = allInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalExpensesAmt = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthlyRevenue = allInvoices.filter(inv => inv.date?.startsWith(thisMonth)).reduce((sum, inv) => sum + (inv.total || 0), 0);
      const monthlyExpenses = allExpenses.filter(exp => exp.date?.startsWith(thisMonth)).reduce((sum, exp) => sum + (exp.amount || 0), 0);

      const todayAppointments = allAppointments.filter(a => a.date === today);

      res.json({
        totalPatients: allPatients.length,
        totalStaff,
        presentToday,
        absentToday: totalStaff - presentToday,
        totalRevenue,
        totalExpenses: totalExpensesAmt,
        monthlyRevenue,
        monthlyExpenses,
        netProfit: monthlyRevenue - monthlyExpenses,
        todayAppointments: todayAppointments.length,
        totalAppointments: allAppointments.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── PHASE 3: AI-AUGMENTED WORKFORCE ─────────────────────────────────────

  // 1. AI Triage Queue — sorted appointment list with urgency reason
  app.get("/api/appointments/triage", async (req: any, res: any) => {
    try {
      const { date } = req.query;
      const today = date || new Date().toISOString().split("T")[0];
      const appts = await storage.getAppointmentsByDate(today);
      const allPatients = await storage.getPatients();
      const allVisits = await storage.getAllVisitHistory();

      const enriched = appts
        .filter(a => a.status !== "cancelled" && a.status !== "Cancelled")
        .map(a => {
          const patient = allPatients.find(p => p.id === a.patientId);
          if (!patient) return null;

          const riskScore = (patient as any).riskScore as any;
          const riskLevel = riskScore?.level || "Low";
          const riskNum = riskScore?.score || 0;

          // Days since last visit
          const patientVisits = allVisits.filter(v => v.patientId === patient.id);
          const lastVisitDate = patientVisits.length > 0
            ? patientVisits.sort((x, y) => y.date.localeCompare(x.date))[0].date
            : null;
          const daysSinceVisit = lastVisitDate
            ? Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          // Gestational week if pregnant
          const lmpDate = patient.lmp ? new Date(patient.lmp) : null;
          const gestWeeks = lmpDate
            ? Math.floor((Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
            : null;

          // Triage score: risk (0-100) + overdue bonus + trimester urgency
          let triageScore = riskNum;
          if (daysSinceVisit > 30) triageScore += 20;
          if (daysSinceVisit > 60) triageScore += 10;
          if (gestWeeks !== null && (gestWeeks >= 36 || gestWeeks <= 10)) triageScore += 15;

          // One-line triage reason
          const reasons: string[] = [];
          if (riskLevel === "Critical" || riskLevel === "High") reasons.push(`${riskLevel} risk`);
          if (daysSinceVisit > 30) reasons.push(`${daysSinceVisit}d since last visit`);
          if (gestWeeks !== null) reasons.push(`${gestWeeks}w pregnant`);
          if (patient.bp) {
            const sys = parseInt((patient.bp || "").split("/")[0]);
            if (!isNaN(sys) && sys >= 140) reasons.push("BP elevated");
          }
          if (riskScore?.factors?.[0]?.factor) reasons.push(riskScore.factors[0].factor);

          return {
            appointmentId: a.id,
            patientId: patient.id,
            patientName: patient.name,
            patientType: patient.type,
            time: a.time,
            date: a.date,
            status: a.status,
            visitMode: a.visitMode,
            riskLevel,
            riskScore: riskNum,
            triageScore,
            triageReason: reasons.slice(0, 2).join(", ") || "Routine visit",
            daysSinceVisit: daysSinceVisit === 999 ? null : daysSinceVisit,
            gestWeeks,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.triageScore - a.triageScore);

      res.json({ date: today, count: enriched.length, appointments: enriched });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Voice-to-SOAP transcription — accept base64 audio, return structured SOAP
  app.post("/api/voice/soap-transcribe", async (req: any, res: any) => {
    try {
      const { audioData, mimeType, patientContext } = req.body;
      if (!audioData) return res.status(400).json({ error: "audioData is required" });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "audio/webm",
                  data: audioData,
                },
              },
              {
                text: `You are a medical transcription AI for a women's reproductive health clinic in India. Transcribe and structure this voice recording into a SOAP note.${patientContext ? `\n\nPatient context: ${patientContext}` : ""}

Return a JSON object with exactly these fields (use empty string if not mentioned):
{
  "subjective": "Patient's symptoms, complaints, and history as described",
  "objective": "Examination findings, vitals, observations mentioned",
  "assessment": "Clinical assessment, diagnosis, or impression",
  "plan": "Treatment plan, medications, follow-up instructions",
  "rawTranscript": "Full verbatim transcript of the recording"
}

Be concise and clinically accurate. Convert spoken language to structured clinical notes.`,
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ success: true, soap: parsed });
    } catch (err: any) {
      console.error("[voice-soap] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Post-visit WhatsApp summary
  app.post("/api/appointments/:id/post-visit-summary", async (req: any, res: any) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });

      const appt = await storage.getAppointments().then(all => all.find(a => a.id === id));
      if (!appt) return res.status(404).json({ error: "Appointment not found" });

      const patient = appt.patientId ? await storage.getPatient(appt.patientId) : null;
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const visits = await storage.getVisitHistory(patient.id);
      const latestVisit = visits.sort((a, b) => b.date.localeCompare(a.date))[0];
      const meds = await storage.getMedications(patient.id);
      const activeMeds = meds.filter(m => m.status === "active" || m.status === "Active" || !m.status);

      // Generate plain-language summary using Gemini
      const summaryResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate a warm, friendly post-visit WhatsApp summary for a patient visiting a women's reproductive health clinic.

Patient: ${patient.name}, Age: ${patient.age}
Today's visit diagnosis/assessment: ${latestVisit?.diagnosis || latestVisit?.assessment || "General consultation"}
Plan notes: ${latestVisit?.planNotes || ""}
Active medications: ${activeMeds.slice(0, 5).map(m => `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` (${m.frequency})` : ""}`).join(", ") || "None prescribed"}
Next appointment: ${patient.nextReview || "To be scheduled"}

Write a WhatsApp message (not too long, max 180 words) in a warm, supportive tone. Include:
1. A brief summary of today's visit
2. Key medications to take (if any)
3. Important instructions or things to watch for
4. Next steps / follow-up

Use simple, non-clinical language. End with "_Saivie Reproductive Intelligence_". Use WhatsApp formatting (bold with *text*).`,
              },
            ],
          },
        ],
      });

      const summaryText = summaryResponse.text || "";

      if (patient.phone) {
        await whatsapp.sendTextMessage(patient.phone, summaryText);
      }

      res.json({
        success: true,
        patientName: patient.name,
        phone: patient.phone || null,
        message: summaryText,
        sent: !!patient.phone,
      });
    } catch (err: any) {
      console.error("[post-visit-summary] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. AI Schedule Optimisation
  app.post("/api/appointments/optimise-schedule", async (req: any, res: any) => {
    try {
      const { date } = req.body;
      const targetDate = date || new Date().toISOString().split("T")[0];
      const appts = await storage.getAppointmentsByDate(targetDate);
      const allPatients = await storage.getPatients();

      const enriched = appts
        .filter(a => a.status !== "cancelled" && a.status !== "Cancelled")
        .map(a => {
          const patient = allPatients.find(p => p.id === a.patientId);
          return {
            id: a.id,
            time: a.time,
            endTime: a.endTime,
            duration: a.duration || 30,
            patientName: patient?.name || "Unknown",
            patientType: patient?.type || "",
            visitMode: a.visitMode,
            status: a.status,
            riskScore: (patient as any)?.riskScore?.score || 0,
            riskLevel: (patient as any)?.riskScore?.level || "Low",
          };
        });

      if (enriched.length === 0) {
        return res.json({ date: targetDate, suggestions: [], message: "No appointments to optimise." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a clinic scheduling optimisation AI. Analyse these appointments and suggest an optimised schedule.

Date: ${targetDate}
Appointments:
${JSON.stringify(enriched, null, 2)}

Optimisation goals:
1. High/Critical risk patients should be seen earlier in the day
2. Telemedicine slots should be grouped to minimise context switching
3. Longer consultations (30+ min) should not be scheduled back-to-back without a buffer
4. Patients who haven't visited in >30 days should be prioritised

Return a JSON object:
{
  "suggestions": [
    {
      "appointmentId": number,
      "currentTime": "HH:MM",
      "suggestedTime": "HH:MM",
      "reason": "brief reason for change"
    }
  ],
  "summary": "2-3 sentence plain English summary of the optimisation recommendations",
  "estimatedTimeSaved": "e.g. 45 minutes of idle time eliminated"
}

Only include appointments that should move. If schedule is already optimal, return empty suggestions array with a positive summary.`,
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ date: targetDate, ...parsed, totalAppointments: enriched.length });
    } catch (err: any) {
      console.error("[optimise-schedule] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Owner AI Weekly Insights
  app.post("/api/owner/ai-insights", async (req: any, res: any) => {
    try {
      const allPatients = await storage.getPatients();
      const allAppointments = await storage.getAppointments();
      const allInvoices = await storage.getAllInvoices();
      const allExpenses = await storage.getExpenses();
      const allAttendance = await storage.getAttendance();

      const today = new Date();
      const thisMonth = today.toISOString().slice(0, 7);
      const thisWeekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const monthlyRevenue = allInvoices.filter(i => i.date?.startsWith(thisMonth)).reduce((s, i) => s + (i.total || 0), 0);
      const monthlyExpenses = allExpenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + (e.amount || 0), 0);
      const weeklyAppts = allAppointments.filter(a => a.date >= thisWeekStart);

      // Diagnosis frequency from all visits
      const allVisits = await storage.getAllVisitHistory();
      const diagnosisCounts: Record<string, number> = {};
      allVisits.filter(v => v.date >= thisWeekStart).forEach(v => {
        const diag = v.diagnosis || v.assessment;
        if (diag) {
          const key = diag.toLowerCase().slice(0, 40);
          diagnosisCounts[key] = (diagnosisCounts[key] || 0) + 1;
        }
      });
      const topDiagnoses = Object.entries(diagnosisCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([d, count]) => `${d} (${count}x)`);

      // Staff utilisation
      const presentDays = allAttendance.filter(a => a.date >= thisWeekStart && a.status === "present").length;
      const totalStaff = new Set(allAttendance.map(a => a.employeeName)).size;

      // High-risk patients
      const highRiskCount = allPatients.filter((p: any) => p.riskScore?.level === "High" || p.riskScore?.level === "Critical").length;

      const context = {
        reportPeriod: `${thisWeekStart} to ${today.toISOString().split("T")[0]}`,
        totalPatients: allPatients.length,
        newPatientsThisMonth: allPatients.filter((p: any) => p.lastVisit?.startsWith(thisMonth)).length,
        weeklyAppointments: weeklyAppts.length,
        completedThisWeek: weeklyAppts.filter(a => a.status === "Completed" || a.status === "completed").length,
        monthlyRevenue,
        monthlyExpenses,
        netProfit: monthlyRevenue - monthlyExpenses,
        topDiagnoses,
        staffUtilisationThisWeek: totalStaff > 0 ? Math.round((presentDays / (totalStaff * 5)) * 100) : 0,
        highRiskPatientCount: highRiskCount,
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a clinic business intelligence AI. Generate a concise weekly insights report for the clinic owner of a women's reproductive health clinic in India.

Clinic Data:
${JSON.stringify(context, null, 2)}

Return a JSON object:
{
  "headline": "One compelling sentence summarising the week",
  "sections": [
    {
      "title": "Patient Volume",
      "insight": "2-3 sentence insight about appointment trends and patient activity",
      "trend": "up" | "down" | "stable",
      "metric": "key number or % to highlight"
    },
    {
      "title": "Revenue & Finance",
      "insight": "2-3 sentence insight about revenue, expenses, and profitability",
      "trend": "up" | "down" | "stable",
      "metric": "key number or % to highlight"
    },
    {
      "title": "Clinical Focus",
      "insight": "2-3 sentence insight about the most common conditions and clinical patterns this week",
      "trend": "up" | "down" | "stable",
      "metric": "key number or % to highlight"
    },
    {
      "title": "Staff & Operations",
      "insight": "2-3 sentence insight about staff attendance, utilisation, and operational efficiency",
      "trend": "up" | "down" | "stable",
      "metric": "key number or % to highlight"
    }
  ],
  "actionItems": ["specific recommended action 1", "specific recommended action 2", "specific recommended action 3"],
  "generatedAt": "${new Date().toISOString()}"
}`,
              },
            ],
          },
        ],
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ success: true, insights: parsed, context });
    } catch (err: any) {
      console.error("[ai-insights] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.use("/api", (err: any, _req: any, res: any, _next: any) => {
    console.error("API Error:", err.message);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return httpServer;
}
