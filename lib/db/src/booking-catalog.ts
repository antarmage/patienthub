import { z } from "zod/v4";

export const bookingCategorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(80).refine((name) => !["all", "suggested", "unassigned"].includes(name.toLowerCase()), "This name is reserved"),
  sortOrder: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
  careArea: z.enum(["", "Pregnancy", "Fertility", "Gynae", "PCOS", "Menopause"]),
  description: z.string().trim().max(1000),
  version: z.number().int().positive(),
});
export const bookingCategoryInput = bookingCategorySchema.omit({ id: true, version: true }).strict();
export const bookingCategoryUpdate = bookingCategoryInput.extend({ expectedVersion: z.number().int().positive() }).strict();
export const bookingAssignmentInput = z.object({
  categoryIds: z.array(z.number().int().positive()).max(100).refine((ids) => new Set(ids).size === ids.length, "Select each category once"),
  expectedVersion: z.number().int().nonnegative(),
}).strict();
export const bookingCatalogSchema = z.object({
  categories: z.array(bookingCategorySchema),
  assignments: z.array(z.object({ serviceId: z.number().int().positive(), categoryIds: z.array(z.number().int().positive()), version: z.number().int().nonnegative() })),
});
export type BookingCategory = z.infer<typeof bookingCategorySchema>;
export type BookingCatalog = z.infer<typeof bookingCatalogSchema>;
