import { Router } from 'express';
import { z } from 'zod';
import { apiKeySchema } from '@acmeu/shared';
import { config } from '../../config';
import { query, queryOne } from '../../db';
import { badRequest, notFound } from '../../lib/errors';
import { generateApiKey } from '../../lib/crypto';
import { signAccessToken } from '../../lib/tokens';
import { recordAudit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(requireAuth);

const roleSchema = z.object({
  role: z.enum(['learner', 'instructor', 'manager', 'admin', 'owner']),
});

const statusSchema = z.object({
  status: z.enum(['active', 'invited', 'disabled']),
});

const impersonateSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(300).optional(),
});

const flagSchema = z.object({
  enabled: z.boolean(),
  rollout: z.record(z.any()).optional(),
});

router.get('/users', requirePermission('manageRoster'), async (req, res, next) => {
  try {
    const search = String(req.query.q ?? '').trim();
    const values: unknown[] = [req.actor!.tenantId];
    let filter = '';
    if (search) {
      values.push(`%${search}%`);
      filter = `AND (display_name ILIKE $${values.length} OR email ILIKE $${values.length})`;
    }

    const rows = await query(
      `SELECT * FROM users
        WHERE tenant_id = $1 ${filter}
        ORDER BY created_at DESC
        LIMIT 500`,
      values,
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id', requireRole('manager'), async (req, res, next) => {
  try {
    const row = await queryOne('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [
      req.params.id,
      req.actor!.tenantId,
    ]);
    if (!row) throw notFound('user not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/role', requireRole('admin'), validate(roleSchema), async (req, res, next) => {
  try {
    const rows = await query<any>(
      `UPDATE users SET role = $1, updated_at = now()
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, email, role`,
      [req.body.role, req.params.id, req.actor!.tenantId],
    );
    if (!rows.length) throw notFound('user not found');
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/users/:id/status',
  requireRole('admin'),
  validate(statusSchema),
  async (req, res, next) => {
    try {
      const rows = await query<any>(
        `UPDATE users SET status = $1, updated_at = now()
          WHERE id = $2 AND tenant_id = $3
          RETURNING id, email, status`,
        [req.body.status, req.params.id, req.actor!.tenantId],
      );
      if (!rows.length) throw notFound('user not found');
      await recordAudit(req, {
        action: 'user.status_changed',
        targetType: 'user',
        targetId: req.params.id,
        metadata: { status: req.body.status },
      });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

router.post('/impersonate', validate(impersonateSchema), async (req, res, next) => {
  try {
    const target = await queryOne<any>(
      'SELECT id, tenant_id, email, role, display_name FROM users WHERE id = $1',
      [req.body.userId],
    );
    if (!target) throw notFound('user not found');

    const token = signAccessToken({
      sub: target.id,
      tid: target.tenant_id,
      role: target.role,
      email: target.email,
      act: req.actor!.id,
    } as any);

    await recordAudit(req, {
      action: 'admin.impersonation_started',
      targetType: 'user',
      targetId: target.id,
      metadata: { reason: req.body.reason ?? null },
    });

    res.json({
      accessToken: token,
      expiresIn: config.tokens.accessTtl,
      user: {
        id: target.id,
        email: target.email,
        displayName: target.display_name,
        role: target.role,
        tenantId: target.tenant_id,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/api-keys', requireRole('manager'), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, label, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at, user_id
         FROM api_keys
        WHERE tenant_id = $1
        ORDER BY created_at DESC`,
      [req.actor!.tenantId],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/api-keys',
  requireRole('manager'),
  validate(apiKeySchema),
  async (req, res, next) => {
    try {
      const { key, prefix, hash } = generateApiKey();
      const rows = await query<any>(
        `INSERT INTO api_keys (tenant_id, user_id, label, key_prefix, key_hash, scopes, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, label, key_prefix, scopes, expires_at, created_at`,
        [
          req.actor!.tenantId,
          req.actor!.id,
          req.body.label,
          prefix,
          hash,
          req.body.scopes,
          req.body.expiresAt ?? null,
        ],
      );
      await recordAudit(req, {
        action: 'api_key.created',
        targetType: 'api_key',
        targetId: rows[0].id,
        metadata: { scopes: req.body.scopes },
      });
      res.status(201).json({ ...rows[0], key });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/api-keys/:id/rotate', requireRole('manager'), async (req, res, next) => {
  try {
    const existing = await queryOne<any>('SELECT * FROM api_keys WHERE id = $1', [req.params.id]);
    if (!existing) throw notFound('api key not found');

    const { key, prefix, hash } = generateApiKey();
    await query(
      'UPDATE api_keys SET key_prefix = $1, key_hash = $2, last_used_at = NULL WHERE id = $3',
      [prefix, hash, existing.id],
    );

    res.json({ id: existing.id, label: existing.label, keyPrefix: prefix, key });
  } catch (err) {
    next(err);
  }
});

router.delete('/api-keys/:id', requireRole('manager'), async (req, res, next) => {
  try {
    await query('UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND tenant_id = $2', [
      req.params.id,
      req.actor!.tenantId,
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/flags', requireRole('admin'), async (_req, res, next) => {
  try {
    const rows = await query('SELECT * FROM feature_flags ORDER BY key');
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.put('/flags/:key', requireRole('admin'), validate(flagSchema), async (req, res, next) => {
  try {
    const rows = await query<any>(
      `INSERT INTO feature_flags (key, enabled, rollout, updated_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (key) DO UPDATE
         SET enabled = EXCLUDED.enabled, rollout = EXCLUDED.rollout, updated_at = now()
       RETURNING *`,
      [req.params.key, req.body.enabled, JSON.stringify(req.body.rollout ?? {})],
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/audit', requireRole('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(Number.parseInt(String(req.query.limit ?? '100'), 10) || 100, 500);
    const rows = await query(
      `SELECT * FROM audit_logs
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT ${limit}`,
      [req.actor!.tenantId],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/tenant', requireRole('manager'), async (req, res, next) => {
  try {
    const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [req.actor!.tenantId]);
    if (!tenant) throw notFound('workspace not found');

    const [stats] = await query(
      `SELECT
         (SELECT count(*)::int FROM users WHERE tenant_id = $1) AS users,
         (SELECT count(*)::int FROM courses WHERE tenant_id = $1) AS courses,
         (SELECT count(*)::int FROM enrollments WHERE tenant_id = $1) AS enrollments,
         (SELECT count(*)::int FROM certificates WHERE tenant_id = $1) AS certificates`,
      [req.actor!.tenantId],
    );

    res.json({ tenant, stats });
  } catch (err) {
    next(err);
  }
});

router.patch('/tenant', requirePermission('manageTenant'), async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') throw badRequest('a payload is required');
    const rows = await query<any>(
      `UPDATE tenants
          SET name = COALESCE($1, name),
              branding = COALESCE($2::jsonb, branding),
              settings = COALESCE($3::jsonb, settings),
              updated_at = now()
        WHERE id = $4
        RETURNING *`,
      [
        req.body.name ?? null,
        req.body.branding ? JSON.stringify(req.body.branding) : null,
        req.body.settings ? JSON.stringify(req.body.settings) : null,
        req.actor!.tenantId,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
