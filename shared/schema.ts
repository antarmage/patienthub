import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, date, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  status: text("status"),
  focus: text("focus"),
  lastVisit: text("last_visit"),
  cycleDay: integer("cycle_day"),
  avatar: text("avatar"),
  mode: text("mode"),
  referredBy: text("referred_by"),
  referredTo: text("referred_to"),
  vaccination: text("vaccination"),
  insurance: text("insurance"),
  contraception: text("contraception"),
  history: jsonb("history"),
  type: text("type"),
  mood: text("mood"),
  weight: real("weight"),
  hb: real("hb"),
  genomics: jsonb("genomics"),
  functional: jsonb("functional"),
  intervention: jsonb("intervention"),
  plan: text("plan"),
  nextReview: text("next_review"),
  clinicianNote: text("clinician_note"),
  condition: text("condition"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  lmp: text("lmp"),
  height: text("height"),
  bp: text("bp"),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  specialty: text("specialty"),
  availability: text("availability"),
});

export const insertProviderSchema = createInsertSchema(providers).omit({ id: true });
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providers.$inferSelect;

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  serviceId: text("service_id"),
  name: text("name").notNull(),
  duration: text("duration"),
  price: text("price"),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  providerId: integer("provider_id").references(() => providers.id),
  serviceId: integer("service_id").references(() => services.id),
  date: date("date").notNull(),
  time: text("time").notNull(),
  endTime: text("end_time"),
  duration: integer("duration"),
  type: text("type"),
  status: text("status"),
  reason: text("reason"),
  chiefComplaint: text("chief_complaint"),
  visitType: text("visit_type"),
  priority: text("priority"),
  room: text("room"),
  billingCode: text("billing_code"),
  billingAmount: real("billing_amount"),
  paymentStatus: text("payment_status"),
  insuranceClaim: text("insurance_claim"),
  checkedInAt: text("checked_in_at"),
  seenAt: text("seen_at"),
  completedAt: text("completed_at"),
  followUpDate: date("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  notes: text("notes"),
  vitals: jsonb("vitals"),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const labTasks = pgTable("lab_tasks", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  test: text("test").notNull(),
  due: text("due").notNull(),
  status: text("status"),
});

export const insertLabTaskSchema = createInsertSchema(labTasks).omit({ id: true });
export type InsertLabTask = z.infer<typeof insertLabTaskSchema>;
export type LabTask = typeof labTasks.$inferSelect;

export const nutritionPlans = pgTable("nutrition_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tags: text("tags").array(),
  assignedTo: integer("assigned_to"),
});

export const insertNutritionPlanSchema = createInsertSchema(nutritionPlans).omit({ id: true });
export type InsertNutritionPlan = z.infer<typeof insertNutritionPlanSchema>;
export type NutritionPlan = typeof nutritionPlans.$inferSelect;

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phase: text("phase"),
  intensity: text("intensity"),
});

export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true });
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;

export const hormoneReadings = pgTable("hormone_readings", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  day: integer("day").notNull(),
  estrogen: real("estrogen"),
  progesterone: real("progesterone"),
  lh: real("lh"),
  fsh: real("fsh"),
  symptoms: integer("symptoms"),
});

export const insertHormoneReadingSchema = createInsertSchema(hormoneReadings).omit({ id: true });
export type InsertHormoneReading = z.infer<typeof insertHormoneReadingSchema>;
export type HormoneReading = typeof hormoneReadings.$inferSelect;

export const pregnancyMetrics = pgTable("pregnancy_metrics", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  week: integer("week").notNull(),
  weight: real("weight"),
  expected: real("expected"),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
});

export const insertPregnancyMetricSchema = createInsertSchema(pregnancyMetrics).omit({ id: true });
export type InsertPregnancyMetric = z.infer<typeof insertPregnancyMetricSchema>;
export type PregnancyMetric = typeof pregnancyMetrics.$inferSelect;

export const follicleData = pgTable("follicle_data", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  day: integer("day"),
  left: real("left"),
  right: real("right"),
  endometrium: real("endometrium"),
});

export const insertFollicleDataSchema = createInsertSchema(follicleData).omit({ id: true });
export type InsertFollicleData = z.infer<typeof insertFollicleDataSchema>;
export type FollicleData = typeof follicleData.$inferSelect;

export const usgData = pgTable("usg_data", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  week: integer("week"),
  hc: real("hc"),
  ac: real("ac"),
  fl: real("fl"),
});

export const insertUsgDataSchema = createInsertSchema(usgData).omit({ id: true });
export type InsertUsgData = z.infer<typeof insertUsgDataSchema>;
export type UsgData = typeof usgData.$inferSelect;

export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  labTaskId: integer("lab_task_id").references(() => labTasks.id),
  testName: text("test_name").notNull(),
  category: text("category"),
  date: date("date").notNull(),
  results: jsonb("results"),
  unit: text("unit"),
  value: real("value"),
  referenceMin: real("reference_min"),
  referenceMax: real("reference_max"),
  status: text("status"),
  notes: text("notes"),
});

export const insertLabResultSchema = createInsertSchema(labResults).omit({ id: true });
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type LabResult = typeof labResults.$inferSelect;

export const visitHistory = pgTable("visit_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  providerId: integer("provider_id").references(() => providers.id),
  date: date("date").notNull(),
  visitType: text("visit_type"),
  chiefComplaint: text("chief_complaint"),
  diagnosis: text("diagnosis"),
  vitals: jsonb("vitals"),
  examination: jsonb("examination"),
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  planNotes: text("plan_notes"),
  prescriptions: jsonb("prescriptions"),
  procedures: jsonb("procedures"),
  labsOrdered: jsonb("labs_ordered"),
  followUpPlan: text("follow_up_plan"),
  outcome: text("outcome"),
});

export const insertVisitHistorySchema = createInsertSchema(visitHistory).omit({ id: true });
export type InsertVisitHistory = z.infer<typeof insertVisitHistorySchema>;
export type VisitHistory = typeof visitHistory.$inferSelect;

export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  name: text("name").notNull(),
  dose: text("dose"),
  frequency: text("frequency"),
  route: text("route"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  prescribedBy: integer("prescribed_by").references(() => providers.id),
  status: text("status"),
  notes: text("notes"),
});

export const insertMedicationSchema = createInsertSchema(medications).omit({ id: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;

export const clinicalNotes = pgTable("clinical_notes", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  providerId: integer("provider_id").references(() => providers.id),
  date: date("date").notNull(),
  type: text("type"),
  title: text("title"),
  content: text("content").notNull(),
  tags: text("tags").array(),
  isPrivate: integer("is_private"),
});

export const insertClinicalNoteSchema = createInsertSchema(clinicalNotes).omit({ id: true });
export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;
export type ClinicalNote = typeof clinicalNotes.$inferSelect;

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  referredByProviderId: integer("referred_by_provider_id").references(() => providers.id),
  referredToProviderId: integer("referred_to_provider_id").references(() => providers.id),
  referredToExternal: text("referred_to_external"),
  date: date("date").notNull(),
  reason: text("reason"),
  urgency: text("urgency"),
  status: text("status"),
  notes: text("notes"),
  outcome: text("outcome"),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true });
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  date: date("date").notNull(),
  items: jsonb("items"),
  subtotal: real("subtotal"),
  tax: real("tax"),
  total: real("total"),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status"),
  insuranceClaimId: text("insurance_claim_id"),
  notes: text("notes"),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export const consentForms = pgTable("consent_forms", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  formType: text("form_type").notNull(),
  signedDate: date("signed_date"),
  signedVia: text("signed_via"),
  status: text("status"),
  expiryDate: date("expiry_date"),
  notes: text("notes"),
});

export const insertConsentFormSchema = createInsertSchema(consentForms).omit({ id: true });
export type InsertConsentForm = z.infer<typeof insertConsentFormSchema>;
export type ConsentForm = typeof consentForms.$inferSelect;

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  name: text("name").notNull(),
  type: text("type"),
  category: text("category"),
  date: date("date").notNull(),
  uploadedBy: integer("uploaded_by").references(() => providers.id),
  description: text("description"),
  metadata: jsonb("metadata"),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export const patientProtocols = pgTable("patient_protocols", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  primaryGoal: text("primary_goal"),
  dietaryStrategy: text("dietary_strategy"),
  weeklyPlan: jsonb("weekly_plan"),
  notes: text("notes"),
  savedBy: text("saved_by"),
  savedAt: text("saved_at"),
});

export const insertPatientProtocolSchema = createInsertSchema(patientProtocols).omit({ id: true });
export type InsertPatientProtocol = z.infer<typeof insertPatientProtocolSchema>;
export type PatientProtocol = typeof patientProtocols.$inferSelect;

export const medicineCatalog = pgTable("medicine_catalog", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  defaultDose: text("default_dose"),
  doseOptions: text("dose_options").array(),
  defaultFrequency: text("default_frequency"),
  route: text("route"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
});

export const insertMedicineCatalogSchema = createInsertSchema(medicineCatalog).omit({ id: true });
export type InsertMedicineCatalog = z.infer<typeof insertMedicineCatalogSchema>;
export type MedicineCatalog = typeof medicineCatalog.$inferSelect;

export * from "./models/chat";
