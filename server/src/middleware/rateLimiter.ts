import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';

// ioredis `call` returns a chainable Result type; cast to Promise for rate-limit-redis
const sendCommand = (...args: string[]): Promise<string | number | boolean | (string | number | boolean)[]> =>
  redis.call(args[0] as string, args.slice(1)) as Promise<string | number | boolean | (string | number | boolean)[]>;

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
  }),
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.mobile ?? req.ip ?? 'unknown',
  store: new RedisStore({
    sendCommand,
  }),
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.mobile ?? req.ip ?? 'unknown',
  store: new RedisStore({
    sendCommand,
  }),
});

export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
  }),
});
