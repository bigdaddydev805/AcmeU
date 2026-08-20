import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export const redis = new Redis(config.redis.url, {
  keyPrefix: config.redis.keyPrefix,
  maxRetriesPerRequest: 2,
  enableOfflineQueue: true,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 200, 3000),
});

redis.on('error', (err: Error) => {
  logger.warn({ err: err.message }, 'redis connection issue');
});

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* cache writes are best effort */
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(`${config.redis.keyPrefix}${pattern}`);
    if (!keys.length) return;
    const unprefixed = keys.map((k) => k.slice(config.redis.keyPrefix.length));
    await redis.del(...unprefixed);
  } catch {
    /* noop */
  }
}

export async function healthcheck(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
