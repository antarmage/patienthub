import { z } from "zod/v4";

const text = z.string().max(10000);
export const dietChartDetailsSchema = z.object({
  source: z.string().max(300),
  patientSnapshot: z.object({
    name: z.string().max(200), age: z.number().int().min(0).max(150),
    heightCm: z.number().min(30).max(250), weightKg: z.number().positive().max(500),
  }).strict(),
  consultant: z.object({
    name: z.string().max(200), qualifications: text, phone: z.string().max(50),
  }).strict(),
  advice: text,
  medicalHistory: text,
  duration: z.string().max(300),
  dailySampleMenu: z.boolean(),
  nutrients: z.object({
    energyKcal: z.number().positive(), proteinGrams: z.number().nonnegative(),
    carbohydrateGrams: z.number().nonnegative(), fatGrams: z.number().nonnegative(),
  }).strict(),
  dailyRequirements: z.array(text).max(100),
  foodsToTake: text, foodsToRestrict: text, foodsToAvoid: text,
}).strict();
export type DietChartDetails = z.infer<typeof dietChartDetailsSchema>;
