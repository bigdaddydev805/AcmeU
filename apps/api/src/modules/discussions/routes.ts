import { Router } from 'express';
import { discussionPostSchema } from '@acmeu/shared';
import { query, queryOne } from '../../db';
import { forbidden, notFound } from '../../lib/errors';
import { renderMarkdown } from '../../lib/markdown';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(requireAuth);

async function assertCourseAccess(courseId: string, userId: string, tenantId: string) {
  const course = await queryOne<any>(
    `SELECT id, tenant_id, visibility FROM courses WHERE id = $1`,
    [courseId],
  );
  if (!course) throw notFound('course not found');

  if (course.visibility === 'public') return course;
  if (course.tenant_id !== tenantId) throw forbidden('course is not available in this workspace');

  const enrollment = await queryOne('SELECT id FROM enrollments WHERE course_id = $1 AND user_id = $2', [
    courseId,
    userId,
  ]);
  if (!enrollment) throw forbidden('enrollment is required to view the discussion');
  return course;
}

router.get('/courses/:courseId/discussion', async (req, res, next) => {
  try {
    await assertCourseAccess(req.params.courseId, req.actor!.id, req.actor!.tenantId);

    const rows = await query<any>(
      `SELECT d.id, d.parent_id, d.lesson_id, d.body_md, d.pinned, d.created_at,
              u.id AS author_id, u.display_name, u.avatar_url, u.title AS author_title
         FROM discussion_posts d
         JOIN users u ON u.id = d.author_id
        WHERE d.course_id = $1
        ORDER BY d.pinned DESC, d.created_at ASC
        LIMIT 500`,
      [req.params.courseId],
    );

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        lessonId: row.lesson_id,
        bodyHtml: renderMarkdown(row.body_md),
        pinned: row.pinned,
        createdAt: row.created_at,
        author: {
          id: row.author_id,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
          title: row.author_title,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/courses/:courseId/discussion',
  validate(discussionPostSchema),
  async (req, res, next) => {
    try {
      await assertCourseAccess(req.params.courseId, req.actor!.id, req.actor!.tenantId);

      const rows = await query<any>(
        `INSERT INTO discussion_posts (course_id, lesson_id, author_id, parent_id, body_md)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          req.params.courseId,
          req.body.lessonId ?? null,
          req.actor!.id,
          req.body.parentId ?? null,
          req.body.bodyMd,
        ],
      );

      res.status(201).json({
        id: rows[0].id,
        parentId: rows[0].parent_id,
        bodyHtml: renderMarkdown(rows[0].body_md),
        createdAt: rows[0].created_at,
        author: {
          id: req.actor!.id,
          displayName: req.actor!.displayName,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/discussion/:postId', async (req, res, next) => {
  try {
    const post = await queryOne<any>('SELECT * FROM discussion_posts WHERE id = $1', [
      req.params.postId,
    ]);
    if (!post) throw notFound('post not found');
    if (post.author_id !== req.actor!.id && req.actor!.role === 'learner') {
      throw forbidden('you can only remove your own posts');
    }
    await query('DELETE FROM discussion_posts WHERE id = $1', [req.params.postId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/discussion/:postId/pin', requireRole('instructor'), async (req, res, next) => {
  try {
    await query('UPDATE discussion_posts SET pinned = NOT pinned WHERE id = $1', [
      req.params.postId,
    ]);
    res.json({ status: 'toggled' });
  } catch (err) {
    next(err);
  }
});

export default router;
