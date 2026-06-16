import crypto from 'crypto';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const otpService = {
  async send(mobile: string): Promise<void> {
    const otp = env.OTP_MOCK ? '123456' : crypto.randomInt(100000, 999999).toString();
    const key = `otp:${mobile}`;

    await redis.set(key, otp, 'EX', env.OTP_EXPIRY_SECONDS);

    if (env.OTP_MOCK) {
      logger.info({ mobile, otp }, 'OTP mock — not sending SMS');
      return;
    }

    logger.info({ mobile }, 'OTP sent via SMS');
  },

  async verify(mobile: string, otp: string): Promise<boolean> {
    const key = `otp:${mobile}`;
    const stored = await redis.get(key);

    if (!stored || stored !== otp) {
      return false;
    }

    await redis.del(key);
    return true;
  },
};
