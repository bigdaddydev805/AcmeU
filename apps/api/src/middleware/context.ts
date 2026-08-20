import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { logger } from '../lib/logger';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  req.id = incoming && incoming.length <= 64 ? incoming : crypto.randomUUID();
  req.startedAt = Date.now();

  const forwarded = req.header('x-forwarded-for');
  req.clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || 'unknown';

  req.log = logger.child({ requestId: req.id, path: req.path, method: req.method });
  res.setHeader('X-Request-Id', req.id);

  res.on('finish', () => {
    req.log.info(
      {
        status: res.statusCode,
        durationMs: Date.now() - req.startedAt,
        actor: req.actor?.id,
        ip: req.clientIp,
        ua: req.header('user-agent'),
      },
      'request completed',
    );
  });

  next();
}
