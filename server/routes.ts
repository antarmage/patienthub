import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/patients", async (_req, res) => {
    const patients = await storage.getPatients();
    res.json(patients);
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

  app.get("/api/services", async (_req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.post("/api/services", async (req, res) => {
    const service = await storage.createService(req.body);
    res.status(201).json(service);
  });

  app.get("/api/appointments", async (req, res) => {
    const { date, patientId } = req.query;
    if (date) {
      const appts = await storage.getAppointmentsByDate(date as string);
      res.json(appts);
    } else if (patientId) {
      const appts = await storage.getAppointmentsByPatient(parseInt(patientId as string));
      res.json(appts);
    } else {
      const appts = await storage.getAppointments();
      res.json(appts);
    }
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

  return httpServer;
}
