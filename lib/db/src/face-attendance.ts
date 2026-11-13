import { z } from "zod/v4";

export const FACE_MODEL = "face-api-1.7.15-recognition-v1";
export const FACE_MATCH_THRESHOLD = 0.5;
export const faceDescriptorSchema = z.array(z.number().finite().min(-2).max(2)).length(128)
  .refine((values) => values.some((value) => Math.abs(value) > 0.001), "Invalid face descriptor.");
export const faceEnrollmentSchema = z.object({
  descriptor: faceDescriptorSchema,
  model: z.literal(FACE_MODEL),
  consentConfirmed: z.literal(true),
}).strict();
export const faceCheckInSchema = z.object({
  descriptor: faceDescriptorSchema,
  model: z.literal(FACE_MODEL),
}).strict();
export const faceExceptionSchema = z.object({
  reason: z.string().trim().min(5).max(500),
}).strict();
export const faceReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
}).strict();

export function faceDistance(left: number[], right: number[]) {
  const a = faceDescriptorSchema.parse(left);
  const b = faceDescriptorSchema.parse(right);
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}
