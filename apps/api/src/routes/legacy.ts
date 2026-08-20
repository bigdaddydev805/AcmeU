import { Router } from 'express';
import { query, queryOne } from '../db';
import { notFound, unauthorized } from '../lib/errors';

const router = Router();

interface LegacyActor {
  id: string;
  tenant_id: string;
  role: string;
  email: string;
}

async function resolveLegacyActor(userId: string | undefined): Promise<LegacyActor> {
  if (!userId) throw unauthorized('X-User-Id is required for v0 endpoints');
  const user = await queryOne<LegacyActor>(
    'SELECT id, tenant_id, role, email FROM users WHERE id = $1',
    [userId],
  );
  if (!user) throw unauthorized('unknown principal');
  return user;
}

router.use((_req, res, next) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Wed, 31 Dec 2025 23:59:59 GMT');
  res.setHeader('Link', '</api/v1>; rel="successor-version"');
  next();
});

router.get('/profile', async (req, res, next) => {
  try {
    const actor = await resolveLegacyActor(req.header('x-user-id'));
    const row = await queryOne('SELECT * FROM users WHERE id = $1', [actor.id]);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    await resolveLegacyActor(req.header('x-user-id'));
    const row = await queryOne('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!row) throw notFound('user not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.get('/courses', async (req, res, next) => {
  try {
    const actor = await resolveLegacyActor(req.header('x-user-id'));
    const rows = await query(
      `SELECT id, code, title, subtitle, category, level, price_cents, status, visibility
         FROM courses
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 200`,
      [actor.tenant_id],
    );
    res.json({ courses: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/courses/:id/roster', async (req, res, next) => {
  try {
    await resolveLegacyActor(req.header('x-user-id'));
    const rows = await query(
      `SELECT u.id, u.email, u.display_name, u.role, e.progress_pct, e.status
         FROM enrollments e
         JOIN users u ON u.id = e.user_id
        WHERE e.course_id = $1
        ORDER BY u.display_name`,
      [req.params.id],
    );
    res.json({ roster: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/submissions/:id', async (req, res, next) => {
  try {
    await resolveLegacyActor(req.header('x-user-id'));
    const row = await queryOne('SELECT * FROM submissions WHERE id = $1', [req.params.id]);
    if (!row) throw notFound('submission not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/enrollments', async (req, res, next) => {
  try {
    const actor = await resolveLegacyActor(req.header('x-user-id'));
    const rows = await query(
      `INSERT INTO enrollments (tenant_id, course_id, user_id, role, status)
       VALUES ($1, $2, $3, 'learner', 'active')
       ON CONFLICT (course_id, user_id) DO NOTHING
       RETURNING *`,
      [actor.tenant_id, req.body.courseId, req.body.userId ?? actor.id],
    );
    res.status(201).json(rows[0] ?? { status: 'already_enrolled' });
  } catch (err) {
    next(err);
  }
});

router.get('/credits/:userId', async (req, res, next) => {
  try {
    await resolveLegacyActor(req.header('x-user-id'));
    const row = await queryOne('SELECT id, credits FROM users WHERE id = $1', [req.params.userId]);
    if (!row) throw notFound('user not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/credits/:userId/adjust', async (req, res, next) => {
  try {
    const actor = await resolveLegacyActor(req.header('x-user-id'));
    const delta = Number.parseInt(String(req.body.delta ?? '0'), 10) || 0;
    const rows = await query<{ credits: number }>(
      'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
      [delta, req.params.userId],
    );
    if (!rows.length) throw notFound('user not found');

    await query(
      `INSERT INTO credit_ledger (tenant_id, user_id, delta, balance_after, reason, reference)
       VALUES ($1,$2,$3,$4,'legacy.adjustment',$5)`,
      [actor.tenant_id, req.params.userId, delta, rows[0].credits, req.body.reference ?? null],
    );

    res.json({ credits: rows[0].credits });
  } catch (err) {
    next(err);
  }
});

export default router;
