import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.logLevel,
  base: { service: 'acmeu-api', env: config.env },
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers["set-cookie"]',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
    ],
    remove: true,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    config.env === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
