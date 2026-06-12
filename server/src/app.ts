import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import poolConfigRoutes from './routes/poolConfig.routes';
import feedRoutes from './routes/feed.routes';
import advertiserRoutes from './routes/advertiser.routes';
import campaignRoutes from './routes/campaign.routes';
import attributionRoutes from './routes/attribution.routes';

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // Request logging
  app.use(requestLogger);

  // Rate limiting on all /api/ routes
  app.use('/api/', apiLimiter);

  // STEP 1: Webhook routes BEFORE express.json() — Stripe webhooks require the raw
  // request body to verify the Stripe-Signature header via constructEvent().
  // Registering them here ensures express.json() never consumes/transforms the body.
  // app.use('/api/v1/webhooks', webhookRoutes);  // wired in Phase 2

  // STEP 2: JSON parsing for all other routes (webhooks are exempt via early registration above)
  app.use(express.json({ limit: '1mb' }));

  // Health check — always public, no auth, no rate limit
  // Returns 200 when both DB and Redis are reachable; 503 when either is degraded.
  app.get('/health', async (_req, res) => {
    const { checkDbConnection } = await import('./config/db');
    const { checkRedisConnection } = await import('./config/redis');

    const [db, redis] = await Promise.all([checkDbConnection(), checkRedisConnection()]);

    res.status(db && redis ? 200 : 503).json({
      status: db && redis ? 'ok' : 'degraded',
      version: '1.0.0',
      db: db ? 'connected' : 'disconnected',
      redis: redis ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  // STEP 3: API routes — wired incrementally as tasks complete
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/profile', profileRoutes);
  app.use('/api/v1/pool-config', poolConfigRoutes);
  app.use('/api/v1/feed', feedRoutes);
  app.use('/api/v1/advertiser', advertiserRoutes);
  app.use('/api/v1/advertiser/campaigns', campaignRoutes);
  app.use('/api/v1/attribution', attributionRoutes);

  // Error handler — MUST be last middleware registered
  app.use(errorHandler);

  return app;
}
