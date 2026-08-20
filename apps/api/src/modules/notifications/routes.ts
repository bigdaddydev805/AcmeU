import { Router } from 'express';
import { query, queryOne } from '../../db';
import { badRequest, notFound } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

const FILTERABLE: Record<string, string> = {
  id: 'id',
  userId: 'user_id',
  user_id: 'user_id',
  tenantId: 'tenant_id',
  tenant_id: 'tenant_id',
  kind: 'kind',
  severity: 'severity',
  title: 'title',
};

function parseFilter(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      throw badRequest('filter must be valid JSON');
    }
  }
  return {};
}

router.get('/', async (req, res, next) => {
  try {
    const filter = parseFilter(req.query.filter);
    const conditions: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(filter)) {
      const column = FILTERABLE[key];
      if (!column) continue;
      values.push(value);
      conditions.push(`${column} = $${values.length}`);
    }

    if (!conditions.length) {
      values.push(req.actor!.id);
      conditions.push(`user_id = $${values.length}`);
    }

    if (req.query.unreadOnly === 'true') {
      conditions.push('read_at IS NULL');
    }

    const pageSize = Math.min(Number.parseInt(String(req.query.pageSize ?? '25'), 10) || 25, 100);

    const rows = await query(
      `SELECT id, user_id, kind, title, body, link, severity, read_at, created_at
         FROM notifications
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT ${pageSize}`,
      values,
    );

    const [{ unread }] = await query<{ unread: number }>(
      'SELECT count(*)::int AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [req.actor!.id],
    );

    res.json({ data: rows, unread });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    const row = await queryOne(
      `UPDATE notifications SET read_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING id, read_at`,
      [req.params.id, req.actor!.id],
    );
    if (!row) throw notFound('notification not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [
      req.actor!.id,
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
