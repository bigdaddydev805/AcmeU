import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../db';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { recordAudit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(requireAuth);

const enrollSchema = z.object({
  courseId: z.string().uuid(),
  cohort: z.string().max(64).optional(),
});

const progressSchema = z.object({
  lessonId: z.string().uuid(),
  state: z.enum(['started', 'completed']).default('completed'),
  secondsSpent: z.number().int().min(0).max(86400).default(0),
});

router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT e.id, e.course_id, e.role, e.status, e.progress_pct, e.enrolled_at, e.completed_at,
              c.title, c.code, c.hero_image_url, c.duration_mins, c.category, c.level
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
        WHERE e.user_id = $1
        ORDER BY e.enrolled_at DESC`,
      [req.actor!.id],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(enrollSchema), async (req, res, next) => {
  try {
    const course = await queryOne<any>(
      `SELECT id, tenant_id, seat_limit, seats_taken, price_cents, visibility, status
         FROM courses
        WHERE id = $1 AND (tenant_id = $2 OR visibility = 'public')`,
      [req.body.courseId, req.actor!.tenantId],
    );
    if (!course) throw notFound('course not found');
    if (course.status !== 'published') throw badRequest('course is not open for enrollment');

    const existing = await queryOne(
      'SELECT id FROM enrollments WHERE course_id = $1 AND user_id = $2',
      [course.id, req.actor!.id],
    );
    if (existing) throw conflict('already enrolled in this course');

    if (course.seat_limit !== null && course.seats_taken >= course.seat_limit) {
      throw conflict('this course is at capacity');
    }

    const rows = await query<any>(
      `INSERT INTO enrollments (tenant_id, course_id, user_id, role, status)
       VALUES ($1, $2, $3, 'learner', 'active')
       RETURNING *`,
      [req.actor!.tenantId, course.id, req.actor!.id],
    );

    await query('UPDATE courses SET seats_taken = seats_taken + 1 WHERE id = $1', [course.id]);

    await recordAudit(req, {
      action: 'enrollment.created',
      targetType: 'course',
      targetId: course.id,
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await queryOne(
      `SELECT e.*, c.title, c.code
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
        WHERE e.id = $1 AND e.user_id = $2`,
      [req.params.id, req.actor!.id],
    );
    if (!row) throw notFound('enrollment not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/progress', validate(progressSchema), async (req, res, next) => {
  try {
    const enrollment = await queryOne<any>(
      'SELECT id, course_id, user_id FROM enrollments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.actor!.id],
    );
    if (!enrollment) throw notFound('enrollment not found');

    await query(
      `INSERT INTO lesson_progress (enrollment_id, lesson_id, state, seconds_spent, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (enrollment_id, lesson_id)
       DO UPDATE SET state = EXCLUDED.state,
                     seconds_spent = lesson_progress.seconds_spent + EXCLUDED.seconds_spent,
                     updated_at = now()`,
      [enrollment.id, req.body.lessonId, req.body.state, req.body.secondsSpent],
    );

    const [{ pct }] = await query<{ pct: number }>(
      `SELECT COALESCE(round(100.0 * count(*) FILTER (WHERE lp.state = 'completed')
                              / NULLIF(count(l.id), 0)), 0)::int AS pct
         FROM lessons l
         LEFT JOIN lesson_progress lp
           ON lp.lesson_id = l.id AND lp.enrollment_id = $1
        WHERE l.course_id = $2`,
      [enrollment.id, enrollment.course_id],
    );

    await query(
      `UPDATE enrollments
          SET progress_pct = $1,
              last_lesson_id = $2,
              completed_at = CASE WHEN $1 >= 100 THEN now() ELSE completed_at END
        WHERE id = $3`,
      [pct, req.body.lessonId, enrollment.id],
    );

    res.json({ progressPct: pct });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const row = await queryOne<any>(
      'SELECT id, course_id FROM enrollments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.actor!.id],
    );
    if (!row) throw notFound('enrollment not found');

    await query('DELETE FROM enrollments WHERE id = $1', [row.id]);
    await query(
      'UPDATE courses SET seats_taken = GREATEST(0, seats_taken - 1) WHERE id = $1',
      [row.course_id],
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
