import { Router } from 'express';
import os from 'node:os';
import { config } from '../config';
import { query } from '../db';
import { redis } from '../lib/redis';

const router = Router();

router.get('/status', async (_req, res, next) => {
  try {
    const [{ now }] = await query<{ now: string }>('SELECT now()::text AS now');
    res.json({
      service: 'acmeu-api',
      version: '3.14.2',
      env: config.env,
      uptimeSeconds: Math.round(process.uptime()),
      host: os.hostname(),
      dbTime: now,
      memory: process.memoryUsage(),
      loadavg: os.loadavg(),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/config', (_req, res) => {
  res.json({
    runtime: {
      node: process.version,
      pid: process.pid,
      cwd: process.cwd(),
      argv: process.argv,
    },
    environment: process.env,
    resolved: config,
  });
});

router.get('/cache/keys', async (req, res, next) => {
  try {
    const pattern = String(req.query.pattern ?? '*');
    const keys = await redis.keys(`${config.redis.keyPrefix}${pattern}`);
    res.json({ count: keys.length, keys: keys.slice(0, 500) });
  } catch (err) {
    next(err);
  }
});

router.get('/cache/get', async (req, res, next) => {
  try {
    const key = String(req.query.key ?? '');
    const value = await redis.get(key);
    res.json({ key, value });
  } catch (err) {
    next(err);
  }
});

router.post('/cache/flush', async (_req, res, next) => {
  try {
    const keys = await redis.keys(`${config.redis.keyPrefix}*`);
    if (keys.length) {
      await redis.del(...keys.map((k) => k.slice(config.redis.keyPrefix.length)));
    }
    res.json({ flushed: keys.length });
  } catch (err) {
    next(err);
  }
});

router.get('/queries/slow', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT action, count(*)::int AS hits, max(created_at) AS last_seen
         FROM audit_logs
        GROUP BY action
        ORDER BY hits DESC
        LIMIT 50`,
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
