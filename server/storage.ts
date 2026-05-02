import { eq, desc, sql, gte, lte, and } from "drizzle-orm";
import { db } from "./db";
import {
  users, patients, providers, services, appointments, labTasks,
  nutritionPlans, workouts, hormoneReadings, pregnancyMetrics, follicleData, usgData, labResults, visitHistory,
  medications, clinicalNotes, referrals, invoices, consentForms, documents, patientProtocols,
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
  type PatientProtocol, type InsertPatientProtocol,
  medicineCatalog,
  type MedicineCatalog, type InsertMedicineCatalog,
  followUpCalls,
  type FollowUpCall, type InsertFollowUpCall,
  attendance,
  type Attendance, type InsertAttendance,
  expenses,
  type Expense, type InsertExpense,
  billingCatalog,
  type BillingCatalog, type InsertBillingCatalog,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getPatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, data: Partial<InsertPatient>): Promise<Patient | undefined>;
  updatePatientRiskData(id: number, data: { riskScore?: Record<string, unknown>; trimesterChecklist?: Record<string, unknown> }): Promise<void>;

  getProviders(): Promise<Provider[]>;
  getProvider(id: number): Promise<Provider | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;
  updateProvider(id: number, data: Partial<InsertProvider>): Promise<Provider | undefined>;

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
  getAllVisitHistory(): Promise<VisitHistory[]>;
  createVisitHistory(visit: InsertVisitHistory): Promise<VisitHistory>;
  updateVisitHistory(id: number, data: Partial<InsertVisitHistory>): Promise<VisitHistory | undefined>;

  getMedications(patientId: number): Promise<Medication[]>;
  createMedication(med: InsertMedication): Promise<Medication>;
  updateMedication(id: number, data: Partial<InsertMedication>): Promise<Medication | undefined>;
  deleteMedication(id: number): Promise<boolean>;

  getClinicalNotes(patientId: number): Promise<ClinicalNote[]>;
  getAllClinicalNotes(): Promise<ClinicalNote[]>;
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
  getAllDocuments(): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: number, data: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  getUserByPasscode(passcode: string): Promise<User | undefined>;

  getPatientProtocol(patientId: number): Promise<PatientProtocol | undefined>;
  savePatientProtocol(protocol: InsertPatientProtocol): Promise<PatientProtocol>;

  getMedicineCatalog(): Promise<MedicineCatalog[]>;
  createMedicineCatalogEntry(entry: InsertMedicineCatalog): Promise<MedicineCatalog>;
  updateMedicineCatalogEntry(id: number, data: Partial<InsertMedicineCatalog>): Promise<MedicineCatalog | undefined>;
  deleteMedicineCatalogEntry(id: number): Promise<boolean>;

  getFollowUpCalls(): Promise<FollowUpCall[]>;
  createFollowUpCall(call: InsertFollowUpCall): Promise<FollowUpCall>;
  updateFollowUpCall(id: number, data: Partial<InsertFollowUpCall>): Promise<FollowUpCall | undefined>;
  deleteFollowUpCall(id: number): Promise<boolean>;

  getAttendance(startDate?: string, endDate?: string): Promise<Attendance[]>;
  createAttendance(record: InsertAttendance): Promise<Attendance>;

  getExpenses(startDate?: string, endDate?: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;

  getAllInvoices(): Promise<Invoice[]>;

  getBillingCatalog(): Promise<BillingCatalog[]>;
  createBillingCatalogItem(item: InsertBillingCatalog): Promise<BillingCatalog>;
  updateBillingCatalogItem(id: number, data: Partial<InsertBillingCatalog>): Promise<BillingCatalog | undefined>;
  deleteBillingCatalogItem(id: number): Promise<boolean>;
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

  async updatePatientRiskData(id: number, data: { riskScore?: Record<string, unknown>; trimesterChecklist?: Record<string, unknown> }): Promise<void> {
    if (data.riskScore !== undefined && data.trimesterChecklist !== undefined) {
      await db.execute(
        sql`UPDATE patients SET risk_score = ${JSON.stringify(data.riskScore)}::jsonb, trimester_checklist = ${JSON.stringify(data.trimesterChecklist)}::jsonb WHERE id = ${id}`
      );
    } else if (data.riskScore !== undefined) {
      await db.execute(
        sql`UPDATE patients SET risk_score = ${JSON.stringify(data.riskScore)}::jsonb WHERE id = ${id}`
      );
    } else if (data.trimesterChecklist !== undefined) {
      await db.execute(
        sql`UPDATE patients SET trimester_checklist = ${JSON.stringify(data.trimesterChecklist)}::jsonb WHERE id = ${id}`
      );
    }
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

  async updateProvider(id: number, data: Partial<InsertProvider>): Promise<Provider | undefined> {
    const [updated] = await db.update(providers).set(data).where(eq(providers.id, id)).returning();
    return updated;
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

  async getAllVisitHistory(): Promise<VisitHistory[]> {
    return db.select().from(visitHistory).orderBy(visitHistory.date);
  }

  async createVisitHistory(visit: InsertVisitHistory): Promise<VisitHistory> {
    const [created] = await db.insert(visitHistory).values(visit).returning();
    return created;
  }

  async updateVisitHistory(id: number, data: Partial<InsertVisitHistory>): Promise<VisitHistory | undefined> {
    const [updated] = await db.update(visitHistory).set(data).where(eq(visitHistory.id, id)).returning();
    return updated;
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

  async getAllClinicalNotes(): Promise<ClinicalNote[]> {
    return db.select().from(clinicalNotes).orderBy(clinicalNotes.date);
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

  async getAllDocuments(): Promise<Document[]> {
    return db.select().from(documents);
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

  async getPatientProtocol(patientId: number): Promise<PatientProtocol | undefined> {
    const results = await db.select().from(patientProtocols).where(eq(patientProtocols.patientId, patientId));
    return results[results.length - 1];
  }

  async savePatientProtocol(protocol: InsertPatientProtocol): Promise<PatientProtocol> {
    const [saved] = await db.insert(patientProtocols).values(protocol).returning();
    return saved;
  }

  async getMedicineCatalog(): Promise<MedicineCatalog[]> {
    return db.select().from(medicineCatalog).where(eq(medicineCatalog.isActive, true));
  }

  async createMedicineCatalogEntry(entry: InsertMedicineCatalog): Promise<MedicineCatalog> {
    const [created] = await db.insert(medicineCatalog).values(entry).returning();
    return created;
  }

  async updateMedicineCatalogEntry(id: number, data: Partial<InsertMedicineCatalog>): Promise<MedicineCatalog | undefined> {
    const [updated] = await db.update(medicineCatalog).set(data).where(eq(medicineCatalog.id, id)).returning();
    return updated;
  }

  async deleteMedicineCatalogEntry(id: number): Promise<boolean> {
    const [deleted] = await db.update(medicineCatalog).set({ isActive: false }).where(eq(medicineCatalog.id, id)).returning();
    return !!deleted;
  }

  async getFollowUpCalls(): Promise<FollowUpCall[]> {
    return db.select().from(followUpCalls);
  }

  async createFollowUpCall(call: InsertFollowUpCall): Promise<FollowUpCall> {
    const [created] = await db.insert(followUpCalls).values(call).returning();
    return created;
  }

  async updateFollowUpCall(id: number, data: Partial<InsertFollowUpCall>): Promise<FollowUpCall | undefined> {
    const [updated] = await db.update(followUpCalls).set(data).where(eq(followUpCalls.id, id)).returning();
    return updated;
  }

  async deleteFollowUpCall(id: number): Promise<boolean> {
    const result = await db.delete(followUpCalls).where(eq(followUpCalls.id, id)).returning();
    return result.length > 0;
  }

  async getAttendance(startDate?: string, endDate?: string): Promise<Attendance[]> {
    const conditions = [];
    if (startDate) conditions.push(gte(attendance.date, startDate));
    if (endDate) conditions.push(lte(attendance.date, endDate));
    if (conditions.length > 0) {
      return db.select().from(attendance).where(and(...conditions)).orderBy(desc(attendance.date));
    }
    return db.select().from(attendance).orderBy(desc(attendance.date));
  }

  async createAttendance(record: InsertAttendance): Promise<Attendance> {
    const [created] = await db.insert(attendance).values(record).returning();
    return created;
  }

  async getExpenses(startDate?: string, endDate?: string): Promise<Expense[]> {
    const conditions = [];
    if (startDate) conditions.push(gte(expenses.date, startDate));
    if (endDate) conditions.push(lte(expenses.date, endDate));
    if (conditions.length > 0) {
      return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.date));
    }
    return db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices);
  }

  async getBillingCatalog(): Promise<BillingCatalog[]> {
    return db.select().from(billingCatalog).orderBy(billingCatalog.category, billingCatalog.name);
  }

  async createBillingCatalogItem(item: InsertBillingCatalog): Promise<BillingCatalog> {
    const [created] = await db.insert(billingCatalog).values(item).returning();
    return created;
  }

  async updateBillingCatalogItem(id: number, data: Partial<InsertBillingCatalog>): Promise<BillingCatalog | undefined> {
    const [updated] = await db.update(billingCatalog).set(data).where(eq(billingCatalog.id, id)).returning();
    return updated;
  }

  async deleteBillingCatalogItem(id: number): Promise<boolean> {
    const result = await db.delete(billingCatalog).where(eq(billingCatalog.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
