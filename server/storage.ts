import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users, patients, providers, services, appointments, labTasks,
  nutritionPlans, workouts, hormoneReadings, pregnancyMetrics, follicleData, usgData, labResults, visitHistory,
  medications, clinicalNotes, referrals, invoices, consentForms, documents,
  type User, type InsertUser,
  type Patient, type InsertPatient,
  type Provider, type InsertProvider,
  type Service, type InsertService,
  type Appointment, type InsertAppointment,
  type LabTask, type InsertLabTask,
  type NutritionPlan, type InsertNutritionPlan,
  type Workout, type InsertWorkout,
  type HormoneReading, type InsertHormoneReading,
  type PregnancyMetric, type InsertPregnancyMetric,
  type FollicleData, type InsertFollicleData,
  type UsgData, type InsertUsgData,
  type LabResult, type InsertLabResult,
  type VisitHistory, type InsertVisitHistory,
  type Medication, type InsertMedication,
  type ClinicalNote, type InsertClinicalNote,
  type Referral, type InsertReferral,
  type Invoice, type InsertInvoice,
  type ConsentForm, type InsertConsentForm,
  type Document, type InsertDocument,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getPatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, data: Partial<InsertPatient>): Promise<Patient | undefined>;

  getProviders(): Promise<Provider[]>;
  getProvider(id: number): Promise<Provider | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;

  getServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;

  getAppointments(): Promise<Appointment[]>;
  getAppointmentsByDate(date: string): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: number): Promise<Appointment[]>;
  createAppointment(appt: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;

  getLabTasks(): Promise<LabTask[]>;
  createLabTask(task: InsertLabTask): Promise<LabTask>;
  updateLabTask(id: number, data: Partial<InsertLabTask>): Promise<LabTask | undefined>;

  getNutritionPlans(): Promise<NutritionPlan[]>;
  createNutritionPlan(plan: InsertNutritionPlan): Promise<NutritionPlan>;

  getWorkouts(): Promise<Workout[]>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;

  getHormoneReadings(patientId: number): Promise<HormoneReading[]>;
  createHormoneReading(reading: InsertHormoneReading): Promise<HormoneReading>;

  getPregnancyMetrics(patientId: number): Promise<PregnancyMetric[]>;
  createPregnancyMetric(metric: InsertPregnancyMetric): Promise<PregnancyMetric>;

  getFollicleData(patientId: number): Promise<FollicleData[]>;
  createFollicleData(data: InsertFollicleData): Promise<FollicleData>;

  getUsgData(patientId: number): Promise<UsgData[]>;
  createUsgData(data: InsertUsgData): Promise<UsgData>;

  getLabResults(patientId: number): Promise<LabResult[]>;
  getLabResultsByTask(labTaskId: number): Promise<LabResult[]>;
  createLabResult(result: InsertLabResult): Promise<LabResult>;

  getVisitHistory(patientId: number): Promise<VisitHistory[]>;
  createVisitHistory(visit: InsertVisitHistory): Promise<VisitHistory>;

  getMedications(patientId: number): Promise<Medication[]>;
  createMedication(med: InsertMedication): Promise<Medication>;
  updateMedication(id: number, data: Partial<InsertMedication>): Promise<Medication | undefined>;
  deleteMedication(id: number): Promise<boolean>;

  getClinicalNotes(patientId: number): Promise<ClinicalNote[]>;
  createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote>;
  updateClinicalNote(id: number, data: Partial<InsertClinicalNote>): Promise<ClinicalNote | undefined>;
  deleteClinicalNote(id: number): Promise<boolean>;

  getReferrals(patientId: number): Promise<Referral[]>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: number, data: Partial<InsertReferral>): Promise<Referral | undefined>;
  deleteReferral(id: number): Promise<boolean>;

  getInvoices(patientId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;

  getConsentForms(patientId: number): Promise<ConsentForm[]>;
  createConsentForm(form: InsertConsentForm): Promise<ConsentForm>;
  updateConsentForm(id: number, data: Partial<InsertConsentForm>): Promise<ConsentForm | undefined>;
  deleteConsentForm(id: number): Promise<boolean>;

  getDocuments(patientId: number): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: number, data: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  getUserByPasscode(passcode: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getPatients(): Promise<Patient[]> {
    return db.select().from(patients);
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [created] = await db.insert(patients).values(patient).returning();
    return created;
  }

  async updatePatient(id: number, data: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [updated] = await db.update(patients).set(data).where(eq(patients.id, id)).returning();
    return updated;
  }

  async getProviders(): Promise<Provider[]> {
    return db.select().from(providers);
  }

  async getProvider(id: number): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.id, id));
    return provider;
  }

  async createProvider(provider: InsertProvider): Promise<Provider> {
    const [created] = await db.insert(providers).values(provider).returning();
    return created;
  }

  async getServices(): Promise<Service[]> {
    return db.select().from(services);
  }

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async getAppointments(): Promise<Appointment[]> {
    return db.select().from(appointments);
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.date, date));
  }

  async getAppointmentsByPatient(patientId: number): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.patientId, patientId));
  }

  async createAppointment(appt: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appt).returning();
    return created;
  }

  async updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments).set(data).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async getLabTasks(): Promise<LabTask[]> {
    return db.select().from(labTasks);
  }

  async createLabTask(task: InsertLabTask): Promise<LabTask> {
    const [created] = await db.insert(labTasks).values(task).returning();
    return created;
  }

  async updateLabTask(id: number, data: Partial<InsertLabTask>): Promise<LabTask | undefined> {
    const [updated] = await db.update(labTasks).set(data).where(eq(labTasks.id, id)).returning();
    return updated;
  }

  async getNutritionPlans(): Promise<NutritionPlan[]> {
    return db.select().from(nutritionPlans);
  }

  async createNutritionPlan(plan: InsertNutritionPlan): Promise<NutritionPlan> {
    const [created] = await db.insert(nutritionPlans).values(plan).returning();
    return created;
  }

  async getWorkouts(): Promise<Workout[]> {
    return db.select().from(workouts);
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const [created] = await db.insert(workouts).values(workout).returning();
    return created;
  }

  async getHormoneReadings(patientId: number): Promise<HormoneReading[]> {
    return db.select().from(hormoneReadings).where(eq(hormoneReadings.patientId, patientId));
  }

  async createHormoneReading(reading: InsertHormoneReading): Promise<HormoneReading> {
    const [created] = await db.insert(hormoneReadings).values(reading).returning();
    return created;
  }

  async getPregnancyMetrics(patientId: number): Promise<PregnancyMetric[]> {
    return db.select().from(pregnancyMetrics).where(eq(pregnancyMetrics.patientId, patientId));
  }

  async createPregnancyMetric(metric: InsertPregnancyMetric): Promise<PregnancyMetric> {
    const [created] = await db.insert(pregnancyMetrics).values(metric).returning();
    return created;
  }

  async getFollicleData(patientId: number): Promise<FollicleData[]> {
    return db.select().from(follicleData).where(eq(follicleData.patientId, patientId));
  }

  async createFollicleData(data: InsertFollicleData): Promise<FollicleData> {
    const [created] = await db.insert(follicleData).values(data).returning();
    return created;
  }

  async getUsgData(patientId: number): Promise<UsgData[]> {
    return db.select().from(usgData).where(eq(usgData.patientId, patientId));
  }

  async createUsgData(data: InsertUsgData): Promise<UsgData> {
    const [created] = await db.insert(usgData).values(data).returning();
    return created;
  }

  async getLabResults(patientId: number): Promise<LabResult[]> {
    return db.select().from(labResults).where(eq(labResults.patientId, patientId));
  }

  async getLabResultsByTask(labTaskId: number): Promise<LabResult[]> {
    return db.select().from(labResults).where(eq(labResults.labTaskId, labTaskId));
  }

  async createLabResult(result: InsertLabResult): Promise<LabResult> {
    const [created] = await db.insert(labResults).values(result).returning();
    return created;
  }

  async getVisitHistory(patientId: number): Promise<VisitHistory[]> {
    return db.select().from(visitHistory).where(eq(visitHistory.patientId, patientId));
  }

  async createVisitHistory(visit: InsertVisitHistory): Promise<VisitHistory> {
    const [created] = await db.insert(visitHistory).values(visit).returning();
    return created;
  }

  async getMedications(patientId: number): Promise<Medication[]> {
    return db.select().from(medications).where(eq(medications.patientId, patientId));
  }

  async createMedication(med: InsertMedication): Promise<Medication> {
    const [created] = await db.insert(medications).values(med).returning();
    return created;
  }

  async updateMedication(id: number, data: Partial<InsertMedication>): Promise<Medication | undefined> {
    const [updated] = await db.update(medications).set(data).where(eq(medications.id, id)).returning();
    return updated;
  }

  async deleteMedication(id: number): Promise<boolean> {
    const [deleted] = await db.delete(medications).where(eq(medications.id, id)).returning();
    return !!deleted;
  }

  async getClinicalNotes(patientId: number): Promise<ClinicalNote[]> {
    return db.select().from(clinicalNotes).where(eq(clinicalNotes.patientId, patientId));
  }

  async createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote> {
    const [created] = await db.insert(clinicalNotes).values(note).returning();
    return created;
  }

  async updateClinicalNote(id: number, data: Partial<InsertClinicalNote>): Promise<ClinicalNote | undefined> {
    const [updated] = await db.update(clinicalNotes).set(data).where(eq(clinicalNotes.id, id)).returning();
    return updated;
  }

  async deleteClinicalNote(id: number): Promise<boolean> {
    const [deleted] = await db.delete(clinicalNotes).where(eq(clinicalNotes.id, id)).returning();
    return !!deleted;
  }

  async getReferrals(patientId: number): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.patientId, patientId));
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [created] = await db.insert(referrals).values(referral).returning();
    return created;
  }

  async updateReferral(id: number, data: Partial<InsertReferral>): Promise<Referral | undefined> {
    const [updated] = await db.update(referrals).set(data).where(eq(referrals.id, id)).returning();
    return updated;
  }

  async deleteReferral(id: number): Promise<boolean> {
    const [deleted] = await db.delete(referrals).where(eq(referrals.id, id)).returning();
    return !!deleted;
  }

  async getInvoices(patientId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.patientId, patientId));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const [deleted] = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return !!deleted;
  }

  async getConsentForms(patientId: number): Promise<ConsentForm[]> {
    return db.select().from(consentForms).where(eq(consentForms.patientId, patientId));
  }

  async createConsentForm(form: InsertConsentForm): Promise<ConsentForm> {
    const [created] = await db.insert(consentForms).values(form).returning();
    return created;
  }

  async updateConsentForm(id: number, data: Partial<InsertConsentForm>): Promise<ConsentForm | undefined> {
    const [updated] = await db.update(consentForms).set(data).where(eq(consentForms.id, id)).returning();
    return updated;
  }

  async deleteConsentForm(id: number): Promise<boolean> {
    const [deleted] = await db.delete(consentForms).where(eq(consentForms.id, id)).returning();
    return !!deleted;
  }

  async getDocuments(patientId: number): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.patientId, patientId));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async updateDocument(id: number, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updated] = await db.update(documents).set(data).where(eq(documents.id, id)).returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning();
    return !!deleted;
  }

  async getUserByPasscode(passcode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.password, passcode));
    return user;
  }
}

export const storage = new DatabaseStorage();
