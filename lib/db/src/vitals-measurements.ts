import { z } from "zod/v4";

const numericMeasurement = (minimum: number, maximum: number) => z.union([
  z.number(), z.string().regex(/^\d+(?:\.\d+)?$/).transform(Number),
]).pipe(z.number().min(minimum).max(maximum));

export const vitalsMeasurementSchema = z.object({
  bp: z.string().regex(/^\d{2,3}\/\d{2,3}$/).refine((value) => {
    const [systolic, diastolic] = value.split("/").map(Number);
    return systolic >= 50 && systolic <= 260 && diastolic >= 30 && diastolic <= 180 && systolic > diastolic;
  }, "Invalid blood pressure"),
  weight: numericMeasurement(0.1, 500),
  height: numericMeasurement(30, 250),
  pulse: numericMeasurement(20, 250),
  temp: numericMeasurement(86, 113),
  spo2: numericMeasurement(50, 100),
  bmi: numericMeasurement(0.1, 150),
});
export const requiredVitalsSchema = vitalsMeasurementSchema.pick({ bp: true, weight: true, height: true });
