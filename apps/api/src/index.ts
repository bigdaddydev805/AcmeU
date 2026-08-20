import { createApp } from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { ensureSigningKeys } from './lib/tokens';
import { pool } from './db';
import { redis } from './lib/redis';

async function main(): Promise<void> {
  ensureSigningKeys();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'acmeu api listening');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await pool.end().catch(() => undefined);
      redis.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'failed to start');
  process.exit(1);
});
