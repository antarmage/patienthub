import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, date, jsonb } from "drizzle-orm/pg-core";
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
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
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
  type: text("type"),
  status: text("status"),
  notes: text("notes"),
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
