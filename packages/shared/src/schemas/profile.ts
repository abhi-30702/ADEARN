import { z } from 'zod';

export const purchaseCategorySchema = z.object({
  category: z.string().min(1),
  // Onboarding collects categories only; brands are optional and may be empty.
  brands: z.array(z.string()).default([]),
  spend_range: z.string().min(1),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Occasionally']),
});

export const updateProfileSchema = z.object({
  categories: z.array(purchaseCategorySchema).min(1).max(10),
});

export type PurchaseCategory = z.infer<typeof purchaseCategorySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
