import { redis } from '../config/redis';

export async function checkIdempotency(key: string): Promise<boolean> {
  const exists = await redis.exists(`idempotency:${key}`);
  return exists === 1;
}

export async function markProcessed(key: string, ttlSeconds = 604800): Promise<void> {
  await redis.set(`idempotency:${key}`, '1', 'EX', ttlSeconds);
}
