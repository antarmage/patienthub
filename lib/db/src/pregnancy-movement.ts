import { z } from "zod/v4";

export const movementObservations = ["usual", "changed", "not-felt", "not-yet-felt", "unsure"] as const;
export const movementObservationSchema = z.object({
  episodeId: z.number().int().positive().max(2147483647),
  observation: z.enum(movementObservations),
  notes: z.string().trim().max(1000),
}).strict();

export type MovementObservationInput = z.infer<typeof movementObservationSchema>;
export type MovementObservation = MovementObservationInput & {
  id: number;
  createdAt: string;
};
