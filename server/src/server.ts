import * as Sentry from '@sentry/node';
import { env } from './config/env';

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}

import { createApp } from './app';
import { logger } from './config/logger';
import { db } from './config/db';
import { redis } from './config/redis';
import { startExpireAttributionsJob } from './jobs/expireAttributions.job';
import { startParentFundTransferJob } from './jobs/parentFundTransfer.job';
import { startCharityDisbursementJob } from './jobs/charityDisbursement.job';

async function start(): Promise<void> {
  const app = createApp();

  // Redis uses lazyConnect: true — must be explicitly connected before the server
  // begins accepting requests so rate limiters and idempotency checks are available.
  await redis.connect();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
    startExpireAttributionsJob();
    startParentFundTransferJob();
    startCharityDisbursementJob();
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down...');
    server.close(async () => {
      await db.end();
      await redis.quit();
      logger.info('Server shut down cleanly');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

// console.error is intentional here — logger may not yet be initialised if env
// validation or Redis connection fails before pino is ready.
start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
