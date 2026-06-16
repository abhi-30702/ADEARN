import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  keyPrefix: env.REDIS_PREFIX,
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (err) {
    logger.error({ err }, 'Redis connection check failed');
    return false;
  }
}
