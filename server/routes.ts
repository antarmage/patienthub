import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerOcrRoutes } from "./replit_integrations/ocr";
import { getUncachableGoogleSheetClient } from "./google-sheets";
import { importLabReports, listLabReportFiles, downloadFileAsBuffer } from "./google-drive";
import { ai } from "./replit_integrations/image/client";

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
    const patient = await storage.getPatient(parseInt(req.params.id));
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  });

  app.post("/api/patients", async (req, res) => {
    const patient = await storage.createPatient(req.body);
    res.status(201).json(patient);
  });

  app.patch("/api/patients/:id", async (req, res) => {
    const updated = await storage.updatePatient(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Patient not found" });
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
    const id = parseInt(req.params.id);
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
    const appt = await storage.createAppointment(req.body);
    res.status(201).json(appt);
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    const updated = await storage.updateAppointment(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json(updated);
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
    const updated = await storage.updateLabTask(parseInt(req.params.id), req.body);
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
    const readings = await storage.getHormoneReadings(parseInt(req.params.id));
    res.json(readings);
  });

  app.post("/api/patients/:id/hormones", async (req, res) => {
    const reading = await storage.createHormoneReading({
      ...req.body,
      patientId: parseInt(req.params.id),
    });
    res.status(201).json(reading);
  });

  app.get("/api/patients/:id/pregnancy-metrics", async (req, res) => {
    const metrics = await storage.getPregnancyMetrics(parseInt(req.params.id));
    res.json(metrics);
  });

  app.post("/api/patients/:id/pregnancy-metrics", async (req, res) => {
    const metric = await storage.createPregnancyMetric({
      ...req.body,
      patientId: parseInt(req.params.id),
    });
    res.status(201).json(metric);
  });

  app.get("/api/patients/:id/follicle-data", async (req, res) => {
    const data = await storage.getFollicleData(parseInt(req.params.id));
    res.json(data);
  });

  app.post("/api/patients/:id/follicle-data", async (req, res) => {
    const data = await storage.createFollicleData({
      ...req.body,
      patientId: parseInt(req.params.id),
    });
    res.status(201).json(data);
  });

  app.get("/api/patients/:id/usg-data", async (req, res) => {
    const data = await storage.getUsgData(parseInt(req.params.id));
    res.json(data);
  });

  app.post("/api/patients/:id/usg-data", async (req, res) => {
    const data = await storage.createUsgData({
      ...req.body,
      patientId: parseInt(req.params.id),
    });
    res.status(201).json(data);
  });

  app.get("/api/patients/:id/lab-results", async (req, res) => {
    const results = await storage.getLabResults(parseInt(req.params.id));
    res.json(results);
  });

  app.post("/api/patients/:id/lab-results", async (req, res) => {
    const result = await storage.createLabResult({
      ...req.body,
      patientId: parseInt(req.params.id),
    });
    res.status(201).json(result);
  });

  app.get("/api/lab-tasks/:id/results", async (req, res) => {
    const results = await storage.getLabResultsByTask(parseInt(req.params.id));
    res.json(results);
  });

  app.get("/api/visit-history", async (req, res) => {
    const visits = await storage.getAllVisitHistory();
    res.json(visits);
  });

  app.get("/api/patients/:id/visit-history", async (req, res) => {
    const visits = await storage.getVisitHistory(parseInt(req.params.id));
    res.json(visits);
  });

  app.post("/api/patients/:id/visit-history", async (req, res) => {
    const visit = await storage.createVisitHistory({
      ...req.body,
      patientId: parseInt(req.params.id),
    });
    res.status(201).json(visit);
  });

  app.get("/api/patients/:id/medications", async (req, res) => {
    const meds = await storage.getMedications(parseInt(req.params.id));
    res.json(meds);
  });

  app.post("/api/patients/:id/medications", async (req, res) => {
    const med = await storage.createMedication({ ...req.body, patientId: parseInt(req.params.id) });
    res.status(201).json(med);
  });

  app.patch("/api/medications/:id", async (req, res) => {
    const updated = await storage.updateMedication(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Medication not found" });
    res.json(updated);
  });

  app.delete("/api/medications/:id", async (req, res) => {
    const deleted = await storage.deleteMedication(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Medication not found" });
    res.status(204).send();
  });

  app.get("/api/clinical-notes", async (req, res) => {
    const notes = await storage.getAllClinicalNotes();
    res.json(notes);
  });

  app.get("/api/patients/:id/clinical-notes", async (req, res) => {
    const notes = await storage.getClinicalNotes(parseInt(req.params.id));
    res.json(notes);
  });

  app.post("/api/patients/:id/clinical-notes", async (req, res) => {
    const note = await storage.createClinicalNote({ ...req.body, patientId: parseInt(req.params.id) });
    res.status(201).json(note);
  });

  app.patch("/api/clinical-notes/:id", async (req, res) => {
    const updated = await storage.updateClinicalNote(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Clinical note not found" });
    res.json(updated);
  });

  app.delete("/api/clinical-notes/:id", async (req, res) => {
    const deleted = await storage.deleteClinicalNote(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Clinical note not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/referrals", async (req, res) => {
    const refs = await storage.getReferrals(parseInt(req.params.id));
    res.json(refs);
  });

  app.post("/api/patients/:id/referrals", async (req, res) => {
    const ref = await storage.createReferral({ ...req.body, patientId: parseInt(req.params.id) });
    res.status(201).json(ref);
  });

  app.patch("/api/referrals/:id", async (req, res) => {
    const updated = await storage.updateReferral(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Referral not found" });
    res.json(updated);
  });

  app.delete("/api/referrals/:id", async (req, res) => {
    const deleted = await storage.deleteReferral(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Referral not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/invoices", async (req, res) => {
    const inv = await storage.getInvoices(parseInt(req.params.id));
    res.json(inv);
  });

  app.post("/api/patients/:id/invoices", async (req, res) => {
    const inv = await storage.createInvoice({ ...req.body, patientId: parseInt(req.params.id) });
    res.status(201).json(inv);
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const updated = await storage.updateInvoice(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Invoice not found" });
    res.json(updated);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const deleted = await storage.deleteInvoice(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Invoice not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/consent-forms", async (req, res) => {
    const forms = await storage.getConsentForms(parseInt(req.params.id));
    res.json(forms);
  });

  app.post("/api/patients/:id/consent-forms", async (req, res) => {
    const form = await storage.createConsentForm({ ...req.body, patientId: parseInt(req.params.id) });
    res.status(201).json(form);
  });

  app.patch("/api/consent-forms/:id", async (req, res) => {
    const updated = await storage.updateConsentForm(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Consent form not found" });
    res.json(updated);
  });

  app.delete("/api/consent-forms/:id", async (req, res) => {
    const deleted = await storage.deleteConsentForm(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Consent form not found" });
    res.status(204).send();
  });

  app.get("/api/patients/:id/documents", async (req, res) => {
    const docs = await storage.getDocuments(parseInt(req.params.id));
    res.json(docs);
  });

  app.post("/api/patients/:id/documents", async (req, res) => {
    const doc = await storage.createDocument({ ...req.body, patientId: parseInt(req.params.id) });
    res.status(201).json(doc);
  });

  app.patch("/api/documents/:id", async (req, res) => {
    const updated = await storage.updateDocument(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Document not found" });
    res.json(updated);
  });

  app.delete("/api/documents/:id", async (req, res) => {
    const deleted = await storage.deleteDocument(parseInt(req.params.id));
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

  app.get("/api/patient-protocols/:patientId", async (req, res) => {
    const patientId = parseInt(req.params.patientId);
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

      const colIndex = (name: string) => {
        const idx = headers.findIndex((h: string) => h.toLowerCase().trim().includes(name.toLowerCase()));
        return idx;
      };

      const nameIdx = colIndex("name");
      const phoneIdx = colIndex("phone");
      const emailIdx = colIndex("email");
      const addressIdx = colIndex("address");
      const itemsIdx = colIndex("items");
      const typeIdx = colIndex("patient type");
      const lmpIdx = colIndex("lmp");
      const heightIdx = colIndex("height");
      const bpIdx = colIndex("bp");
      const weightIdx = colIndex("weight");
      const ageIdx = colIndex("age");
      const timestampIdx = colIndex("timestamp");

      const existingPatients = await storage.getPatients();
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
          const dateParts = parts[0].split("/");
          if (dateParts.length !== 3) return null;
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

        const phone = val(phoneIdx).replace(/\D/g, "");
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

        let existingId = phone ? existingByPhone.get(phone) : undefined;
        if (!existingId) {
          existingId = existingByName.get(name.toLowerCase().trim());
        }

        try {
          let patientId: number;

          if (existingId) {
            await storage.updatePatient(existingId, {
              phone: phone || undefined,
              email: email || undefined,
              address: address || undefined,
              type: patientType || undefined,
              lmp: lmp || undefined,
              height: height || undefined,
              bp: bp || undefined,
              weight: weight && !isNaN(weight) ? weight : undefined,
              lastVisit: parsed?.date || undefined,
              focus: items || undefined,
            });
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
              lmp: lmp || undefined,
              height: height || undefined,
              bp: bp || undefined,
              weight: weight && !isNaN(weight) ? weight : undefined,
              lastVisit: parsed?.date || undefined,
              focus: items || undefined,
              status: "active",
            });
            patientId = patient.id;
            if (phone) existingByPhone.set(phone, patient.id);
            existingByName.set(name.toLowerCase().trim(), patient.id);
            imported++;
          }

          if (parsed) {
            const apptKey = `${patientId}_${parsed.date}_${parsed.time}`;
            if (!appointmentKeys.has(apptKey)) {
              await storage.createAppointment({
                patientId,
                date: parsed.date,
                time: parsed.time,
                type: items || "Consultation",
                status: "Completed",
                reason: items || undefined,
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
      const patientId = parseInt(req.params.id);
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
    } catch (err: any) {
      console.error("Lab extraction error:", err);
      res.status(500).json({ error: "Failed to extract lab results: " + err.message });
    }
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
    const updated = await storage.updateMedicineCatalogEntry(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Medicine not found" });
    res.json(updated);
  });

  app.delete("/api/medicine-catalog/:id", async (req, res) => {
    const deleted = await storage.deleteMedicineCatalogEntry(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Medicine not found" });
    res.status(204).send();
  });

  app.post("/api/patients/:id/extract-prescription", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
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
        } catch {}
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
            const weeks = Math.floor((Date.now() - new Date(p.lmp).getTime()) / (7*24*60*60*1000));
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
            } catch {}
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
      const id = parseInt(req.params.id);
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

  return httpServer;
}
