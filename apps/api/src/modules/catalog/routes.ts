import { Router } from 'express';
import { catalogQuerySchema, createCourseSchema, type CatalogQuery } from '@acmeu/shared';
import { query, queryOne } from '../../db';
import { forbidden, notFound } from '../../lib/errors';
import { renderMarkdown } from '../../lib/markdown';
import { cacheGet, cacheSet } from '../../lib/redis';
import { recordAudit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { validate, validated } from '../../middleware/validate';
import { searchCourses, toCourseSummary } from './service';

const router = Router();

router.use(requireAuth);

router.get('/', validate(catalogQuerySchema, 'query'), async (req, res, next) => {
  try {
    const params = validated<CatalogQuery>(req, 'query');
    const cacheKey = `catalog:list:${Buffer.from(JSON.stringify(params)).toString('base64url')}`;

    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    const { rows, total } = await searchCourses(req.actor!.tenantId, params);
    const payload = {
      data: rows.map(toCourseSummary),
      page: params.page,
      pageSize: params.pageSize,
      total,
    };

    await cacheSet(cacheKey, payload, 60);
    res.setHeader('X-Cache', 'MISS');
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const course = await queryOne<any>(
      `SELECT * FROM courses
        WHERE id = $1 AND (tenant_id = $2 OR visibility = 'public')`,
      [req.params.id, req.actor!.tenantId],
    );
    if (!course) throw notFound('course not found');

    const modules = await query(
      `SELECT m.id, m.title, m.position,
              COALESCE(json_agg(json_build_object(
                'id', l.id, 'title', l.title, 'kind', l.kind,
                'durationMins', l.duration_mins, 'position', l.position,
                'isPreview', l.is_preview
              ) ORDER BY l.position) FILTER (WHERE l.id IS NOT NULL), '[]') AS lessons
         FROM course_modules m
         LEFT JOIN lessons l ON l.module_id = m.id
        WHERE m.course_id = $1
        GROUP BY m.id
        ORDER BY m.position`,
      [req.params.id],
    );

    const enrollment = await queryOne(
      'SELECT id, role, status, progress_pct FROM enrollments WHERE course_id = $1 AND user_id = $2',
      [req.params.id, req.actor!.id],
    );

    res.json({
      ...toCourseSummary(course),
      descriptionHtml: renderMarkdown(course.description_md),
      modules,
      enrollment,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:courseId/lessons/:lessonId', async (req, res, next) => {
  try {
    const lesson = await queryOne<any>(
      'SELECT * FROM lessons WHERE id = $1 AND course_id = $2',
      [req.params.lessonId, req.params.courseId],
    );
    if (!lesson) throw notFound('lesson not found');

    if (!lesson.is_preview) {
      const enrollment = await queryOne(
        'SELECT id FROM enrollments WHERE course_id = $1 AND user_id = $2 AND status = $3',
        [req.params.courseId, req.actor!.id, 'active'],
      );
      if (!enrollment) throw forbidden('enrollment is required to view this lesson');
    }

    res.json({
      id: lesson.id,
      courseId: lesson.course_id,
      moduleId: lesson.module_id,
      title: lesson.title,
      kind: lesson.kind,
      bodyHtml: renderMarkdown(lesson.body_md),
      mediaUrl: lesson.media_url,
      durationMins: lesson.duration_mins,
      position: lesson.position,
      isPreview: lesson.is_preview,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('instructor'), validate(createCourseSchema), async (req, res, next) => {
  try {
    const body = req.body;
    const rows = await query<any>(
      `INSERT INTO courses (tenant_id, owner_id, code, title, subtitle, description_md,
                            level, category, tags, visibility, price_cents, seat_limit, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft')
       RETURNING *`,
      [
        req.actor!.tenantId,
        req.actor!.id,
        body.code,
        body.title,
        body.subtitle ?? null,
        body.descriptionMd ?? '',
        body.level,
        body.category,
        body.tags,
        body.visibility,
        body.priceCents,
        body.seatLimit ?? null,
      ],
    );
    await recordAudit(req, {
      action: 'course.created',
      targetType: 'course',
      targetId: rows[0].id,
    });
    res.status(201).json(toCourseSummary(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('instructor'), async (req, res, next) => {
  try {
    const course = await queryOne<any>(
      'SELECT * FROM courses WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.actor!.tenantId],
    );
    if (!course) throw notFound('course not found');

    const rows = await query<any>(
      `UPDATE courses
          SET title = COALESCE($1, title),
              subtitle = COALESCE($2, subtitle),
              description_md = COALESCE($3, description_md),
              status = COALESCE($4, status),
              price_cents = COALESCE($5, price_cents),
              seat_limit = COALESCE($6, seat_limit),
              published_at = CASE WHEN $4 = 'published' AND published_at IS NULL
                                  THEN now() ELSE published_at END,
              updated_at = now()
        WHERE id = $7
        RETURNING *`,
      [
        req.body.title ?? null,
        req.body.subtitle ?? null,
        req.body.descriptionMd ?? null,
        req.body.status ?? null,
        req.body.priceCents ?? null,
        req.body.seatLimit ?? null,
        req.params.id,
      ],
    );
    res.json(toCourseSummary(rows[0]));
  } catch (err) {
    next(err);
  }
});

export default router;
