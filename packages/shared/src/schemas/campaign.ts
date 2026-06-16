import { z } from 'zod';

export const targetProfileSchema = z.object({
  categories: z.array(z.string()).min(1),
  brands: z.array(z.string()).min(1),
  subcategories: z.array(z.string()).optional(),
});

export type TargetProfileInput = z.infer<typeof targetProfileSchema>;

export const createCampaignSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().max(1000).optional(),
  creative_url: z.string().url(),
  creative_type: z.enum(['video', 'banner', 'audio']),
  target_profile: targetProfileSchema,
  cashback_rate: z.number().min(0.01).max(0.05),
  daily_cap: z.number().min(500),
  total_budget: z.number().positive(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
