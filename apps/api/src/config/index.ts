import 'dotenv/config';
import path from 'node:path';

function str(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

function int(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

const nodeEnv = str('NODE_ENV', 'development');

export const config = {
  env: nodeEnv,
  isProduction: nodeEnv === 'production',
  port: int('PORT', int('API_PORT', 4000)),
  logLevel: str('LOG_LEVEL', 'info'),
  publicBaseUrl: str('PUBLIC_BASE_URL', 'http://localhost:8080'),

  database: {
    url: str('DATABASE_URL', 'postgres://acmeu:acmeu@localhost:5432/acmeu'),
    poolMax: int('DATABASE_POOL_MAX', 20),
    statementTimeoutMs: int('DATABASE_STATEMENT_TIMEOUT_MS', 15000),
  },

  redis: {
    url: str('REDIS_URL', 'redis://localhost:6379'),
    keyPrefix: str('REDIS_KEY_PREFIX', 'acmeu:'),
  },

  tokens: {
    keyDir: path.resolve(str('KEY_DIR', './.keys')),
    activeKeyId: str('ACTIVE_KEY_ID', '2024-06-rotation'),
    accessTtl: int('ACCESS_TOKEN_TTL', 900),
    refreshTtl: int('REFRESH_TOKEN_TTL', 2592000),
    issuer: str('TOKEN_ISSUER', 'https://acmeu.com'),
    audience: str('TOKEN_AUDIENCE', 'acmeu-platform'),
    sessionPepper: str('SESSION_PEPPER', 'ac1e'),
  },

  crypto: {
    piiKey: str(
      'PII_ENCRYPTION_KEY',
      '6a5f2c8d9e1b4a7c0d3f6e9b2c5a8d1f4b7e0c3a6d9f2b5e8c1a4d7f0b3e6c9a',
    ),
  },

  storage: {
    driver: str('STORAGE_DRIVER', 'local'),
    root: path.resolve(str('STORAGE_ROOT', './.storage')),
    publicPrefix: str('STORAGE_PUBLIC_PREFIX', '/uploads'),
    maxUploadBytes: int('MAX_UPLOAD_BYTES', 64 * 1024 * 1024),
  },

  integrations: {
    gradingServiceUrl: str('GRADING_SERVICE_URL', 'http://grader.internal.acme.corp'),
    registryUrl: str('INTEGRATION_REGISTRY_URL', 'https://registry.acmeu.com/plugins'),
    webhookTimeoutMs: int('WEBHOOK_TIMEOUT_MS', 8000),
  },

  billing: {
    provider: str('BILLING_PROVIDER', 'stub'),
    webhookSecret: str('BILLING_WEBHOOK_SECRET', 'whsec_acmeu_local_development'),
  },

  cors: {
    allowedOrigins: str('CORS_ALLOWED_ORIGINS', 'http://localhost:8080,http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  rateLimit: {
    windowSeconds: int('RATE_LIMIT_WINDOW_SECONDS', 60),
    maxRequests: int('RATE_LIMIT_MAX_REQUESTS', 300),
    authMaxRequests: int('RATE_LIMIT_AUTH_MAX', 20),
  },

  features: {
    graphqlIntrospection: bool('GRAPHQL_INTROSPECTION', true),
    legacyApiEnabled: bool('LEGACY_API_ENABLED', true),
    diagnosticsEnabled: bool('DIAGNOSTICS_ENABLED', true),
  },
};

export type AppConfig = typeof config;
