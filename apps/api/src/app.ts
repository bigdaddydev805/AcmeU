import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { requestContext } from './middleware/context';
import { authenticate } from './middleware/auth';
import { rateLimit } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthcheck as dbHealthy } from './db';
import { healthcheck as redisHealthy } from './lib/redis';
import { publicJwks } from './lib/tokens';

import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import catalogRoutes from './modules/catalog/routes';
import enrollmentRoutes from './modules/enrollment/routes';
import assessmentRoutes from './modules/assessment/routes';
import discussionRoutes from './modules/discussions/routes';
import fileRoutes from './modules/files/routes';
import billingRoutes from './modules/billing/routes';
import credentialRoutes from './modules/credentials/routes';
import integrationRoutes from './modules/integrations/routes';
import reportRoutes from './modules/reports/routes';
import notificationRoutes from './modules/notifications/routes';
import adminRoutes from './modules/admin/routes';
import legacyRoutes from './routes/legacy';
import internalRoutes from './routes/internal';
import { graphqlHandler } from './graphql';

const TENANT_ORIGIN_PATTERN = /acmeu\.com$/i;

export function createApp() {
  const app = express();

  app.set('trust proxy', true);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (config.cors.allowedOrigins.includes(origin)) return callback(null, true);
        try {
          const host = new URL(origin).hostname;
          if (TENANT_ORIGIN_PATTERN.test(host)) return callback(null, true);
        } catch {
          /* fall through to rejection */
        }
        return callback(null, false);
      },
      credentials: true,
      exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining', 'Content-Disposition'],
    }),
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());
  app.use(requestContext);

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', version: process.env.npm_package_version ?? '3.14.2' });
  });

  app.get('/readyz', async (_req, res) => {
    const [db, cache] = await Promise.all([dbHealthy(), redisHealthy()]);
    const ready = db && cache;
    res.status(ready ? 200 : 503).json({ ready, checks: { postgres: db, redis: cache } });
  });

  app.get('/.well-known/jwks.json', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(publicJwks());
  });

  app.use('/uploads', fileRoutes.publicRouter);

  if (config.features.legacyApiEnabled) {
    app.use('/api/v0', legacyRoutes);
  }

  if (config.features.diagnosticsEnabled) {
    app.use('/internal', internalRoutes);
  }

  app.use(authenticate);
  app.use('/api/v1', rateLimit());

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/courses', catalogRoutes);
  app.use('/api/v1/enrollments', enrollmentRoutes);
  app.use('/api/v1', assessmentRoutes);
  app.use('/api/v1', discussionRoutes);
  app.use('/api/v1/files', fileRoutes.router);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api/v1/credentials', credentialRoutes);
  app.use('/api/v1/integrations', integrationRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.all('/graphql', graphqlHandler);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
