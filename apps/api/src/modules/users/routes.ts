import { Router } from 'express';
import { updateProfileSchema } from '@acmeu/shared';
import { query, queryOne } from '../../db';
import { badRequest, notFound } from '../../lib/errors';
import { deepMerge } from '../../lib/objects';
import { recordAudit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { effectivePermissions, publicProfile, updateProfile } from './service';

const router = Router();

router.use(requireAuth);

router.get('/me', async (req, res, next) => {
  try {
    const row = await queryOne('SELECT * FROM users WHERE id = $1', [req.actor!.id]);
    if (!row) throw notFound('profile not found');
    res.json({
      ...publicProfile(row),
      permissions: effectivePermissions(row.role),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/me', validate(updateProfileSchema), async (req, res, next) => {
  try {
    const updated = await updateProfile(req.actor!.id, req.body);
    if (!updated) throw notFound('profile not found');
    await recordAudit(req, {
      action: 'user.profile_updated',
      targetType: 'user',
      targetId: req.actor!.id,
      metadata: { fields: Object.keys(req.body) },
    });
    res.json(publicProfile(updated));
  } catch (err) {
    next(err);
  }
});

router.get('/me/preferences', async (req, res, next) => {
  try {
    const row = await queryOne<{ preferences: Record<string, unknown> }>(
      'SELECT preferences FROM users WHERE id = $1',
      [req.actor!.id],
    );
    res.json(row?.preferences ?? {});
  } catch (err) {
    next(err);
  }
});

router.put('/me/preferences', async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      throw badRequest('preferences must be a JSON object');
    }
    const row = await queryOne<{ preferences: Record<string, unknown> }>(
      'SELECT preferences FROM users WHERE id = $1',
      [req.actor!.id],
    );
    const merged = deepMerge(row?.preferences ?? {}, req.body);
    await query('UPDATE users SET preferences = $1::jsonb, updated_at = now() WHERE id = $2', [
      JSON.stringify(merged),
      req.actor!.id,
    ]);
    res.json(merged);
  } catch (err) {
    next(err);
  }
});

router.get('/me/permissions', async (req, res, next) => {
  try {
    res.json(effectivePermissions(req.actor!.role));
  } catch (err) {
    next(err);
  }
});

router.get('/me/sessions', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, user_agent, ip_address, created_at, expires_at, revoked_at
         FROM refresh_tokens
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [req.actor!.id],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/sessions/:id', async (req, res, next) => {
  try {
    await query(
      'UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.actor!.id],
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await queryOne(
      'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.actor!.tenantId],
    );
    if (!row) throw notFound('user not found');
    const profile = publicProfile(row);
    res.json({
      id: profile.id,
      displayName: profile.displayName,
      title: profile.title,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
      createdAt: profile.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
