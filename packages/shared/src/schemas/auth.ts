import { z } from 'zod';

export const requestOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
});

export const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  otp: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
