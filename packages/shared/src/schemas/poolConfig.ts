import { z } from 'zod';

export const poolConfigSchema = z.object({
  liquid_pct: z.number().int().min(0).max(100),
  savings_pct: z.number().int().min(0).max(100),
  parent_pct: z.number().int().min(0).max(100),
  charity_pct: z.number().int().min(0).max(100),
}).refine(
  (data) => data.liquid_pct + data.savings_pct + data.parent_pct + data.charity_pct === 100,
  { message: 'Pool percentages must sum to 100' }
);

export type PoolConfigInput = z.infer<typeof poolConfigSchema>;
