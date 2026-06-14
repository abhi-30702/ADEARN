/**
 * Jest globalSetup for integration tests.
 * Probes PostgreSQL and Redis before any test file is loaded.
 * Sets process.env.INFRA_AVAILABLE so integration tests can decide to skip.
 *
 * This file runs in the main Jest process (not in worker threads), so
 * environment variables set here are inherited by all test workers.
 */

import { Pool } from 'pg';
import Redis from 'ioredis';

const DB_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://adearn:adearn@localhost:5432/adearn_dev';
const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

export default async function globalSetup(): Promise<void> {
  const pool = new Pool({ connectionString: DB_URL, connectionTimeoutMillis: 3000 });
  const redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
  });
  redis.on('error', () => { /* suppress */ });

  try {
    await pool.query('SELECT 1');
    await redis.ping();
    process.env['INFRA_AVAILABLE'] = 'true';
    console.log('\n[integration-setup] DB + Redis reachable — integration tests ENABLED\n');
  } catch {
    process.env['INFRA_AVAILABLE'] = 'false';
    console.log('\n[integration-setup] DB or Redis unavailable — integration tests will SKIP\n');
  } finally {
    await pool.end().catch(() => undefined);
    redis.disconnect();
  }
}
