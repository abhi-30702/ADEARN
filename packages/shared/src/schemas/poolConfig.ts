import { z } from 'zod';

export const poolConfigSchema = z.object({
  liquid_pct: z.number().int().min(0).max(100),
  savings_pct: z.number().int().min(0).max(100),
  parent_pct: z.number().int().min(0).max(100),
  charity_pct: z.number().int().min(0).max(100),
  savings_goal: z.string().min(1).optional(),
  savings_target: z.number().positive().optional(),
  parent_account: z.object({
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
    account_number: z.string().min(9).max(18),
    name: z.string().min(1),
    verified: z.boolean(),
  }).optional(),
  charity_ngo_id: z.string().uuid().optional(),
}).refine(
  (data) => data.liquid_pct + data.savings_pct + data.parent_pct + data.charity_pct === 100,
  { message: 'Pool percentages must sum to 100' }
);

export type PoolConfigInput = z.infer<typeof poolConfigSchema>;
