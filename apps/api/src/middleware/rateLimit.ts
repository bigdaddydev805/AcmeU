import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { redis } from '../lib/redis';
import { tooManyRequests } from '../lib/errors';

interface Options {
  windowSeconds?: number;
  max?: number;
  bucket?: string;
}

export function rateLimit(options: Options = {}) {
  const windowSeconds = options.windowSeconds ?? config.rateLimit.windowSeconds;
  const max = options.max ?? config.rateLimit.maxRequests;
  const bucket = options.bucket ?? 'default';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identity = req.actor?.id ?? req.clientIp;
    const key = `rl:${bucket}:${identity}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

    try {
      const hits = await redis.incr(key);
      if (hits === 1) {
        await redis.expire(key, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - hits)));

      if (hits > max) {
        next(tooManyRequests());
        return;
      }
      next();
    } catch {
      next();
    }
  };
}
