import type { Express, Request, Response } from "express";
import type { Appointment, Patient, VisitHistory } from "@workspace/db";
import { addCallDays, clinicDate, parseCallDate } from "../../../lib/db/src/follow-up";
import type { AccessActor } from "./clinical-access";

type PatientSource = Pick<Patient, "id" | "name" | "phone" | "lastVisit" | "pregnancyStatus">;
type AppointmentSource = Pick<Appointment, "patientId" | "date" | "status">;
type VisitSource = Pick<VisitHistory, "patientId" | "date">;

export function receptionFollowUpPatients(patients: PatientSource[], appointments: AppointmentSource[], visits: VisitSource[], today = clinicDate()) {
  const lastVisits = new Map<number, string>();
  const add = (patientId: number | null, value: unknown) => {
    const date = parseCallDate(value);
    if (patientId !== null && date && date <= today && date > (lastVisits.get(patientId) || "")) lastVisits.set(patientId, date);
  };
  patients.forEach((patient) => add(patient.id, patient.lastVisit));
  appointments.filter((appointment) => appointment.status?.toLowerCase() === "completed").forEach((appointment) => add(appointment.patientId, appointment.date));
  visits.forEach((visit) => add(visit.patientId, visit.date));
  const startDate = addCallDays(today, -13);
  const rows = patients.map((patient) => ({
    patientId: patient.id, name: patient.name, phone: patient.phone, lastVisit: lastVisits.get(patient.id) || null,
    pregnant: /^(active|pregnant|antenatal|anc)$/i.test((patient.pregnancyStatus || "").trim()),
  }));
  const byVisit = (a: typeof rows[number], b: typeof rows[number]) => (b.lastVisit || "").localeCompare(a.lastVisit || "") || a.name.localeCompare(b.name) || a.patientId - b.patientId;
  return {
    startDate, endDate: today,
    recent: rows.filter((patient) => patient.lastVisit && patient.lastVisit >= startDate).sort(byVisit),
    pregnant: rows.filter((patient) => patient.pregnant).sort(byVisit),
  };
}

export function registerReceptionFollowUpRoutes(app: Express, dependencies: {
  authenticate(req: Request, res: Response): Promise<AccessActor | null>;
  patients(): Promise<PatientSource[]>;
  appointments(): Promise<AppointmentSource[]>;
  visits(): Promise<VisitSource[]>;
}) {
  app.get("/api/reception/follow-up-patients", async (req, res) => {
    const actor = await dependencies.authenticate(req, res);
    if (!actor) {
      if (!res.headersSent) res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!("role" in actor) || !["staff", "receptionist", "clinician", "owner"].includes(actor.role)) {
      res.status(403).json({ error: "Receptionist or clinician access required" });
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    const [patients, appointments, visits] = await Promise.all([dependencies.patients(), dependencies.appointments(), dependencies.visits()]);
    res.json(receptionFollowUpPatients(patients, appointments, visits));
  });
}
