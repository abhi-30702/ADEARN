import { z } from 'zod';

export const onboardAdvertiserSchema = z.object({
  company_name: z.string().min(2).max(255),
  gst_number: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Invalid GST number',
    ),
  contact_email: z.string().email(),
  contact_mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  pledge_signed: z.boolean(),
});

export type OnboardAdvertiserInput = z.infer<typeof onboardAdvertiserSchema>;
