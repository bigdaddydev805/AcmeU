import { Router } from 'express';
import { z } from 'zod';
import { gradeSchema, submissionSchema } from '@acmeu/shared';
import { config } from '../../config';
import { query, queryOne } from '../../db';
import { badRequest, forbidden, notFound } from '../../lib/errors';
import { renderMarkdown } from '../../lib/markdown';
import { dispatch } from '../../lib/http';
import { recordAudit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(requireAuth);

const assignmentSchema = z.object({
  title: z.string().min(1).max(200),
  specMd: z.string().max(50000).default(''),
  kind: z.enum(['written', 'quiz', 'project', 'code']).default('written'),
  maxPoints: z.number().int().min(1).max(1000).default(100),
  weight: z.number().min(0).max(100).default(1),
  rubric: z.array(z.record(z.any())).max(50).default([]),
  autoGrade: z.boolean().default(false),
  graderRef: z.string().max(300).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

async function assertEnrolled(courseId: string, userId: string): Promise<void> {
  const enrollment = await queryOne(
    `SELECT id FROM enrollments WHERE course_id = $1 AND user_id = $2 AND status = 'active'`,
    [courseId, userId],
  );
  if (!enrollment) throw forbidden('you are not enrolled in this course');
}

router.get('/courses/:courseId/assignments', async (req, res, next) => {
  try {
    await assertEnrolled(req.params.courseId, req.actor!.id);
    const rows = await query(
      `SELECT a.id, a.title, a.kind, a.max_points, a.weight, a.due_at, a.opens_at,
              s.id AS submission_id, s.status AS submission_status, s.score
         FROM assignments a
         LEFT JOIN submissions s
           ON s.assignment_id = a.id AND s.user_id = $2
        WHERE a.course_id = $1
        ORDER BY a.due_at NULLS LAST, a.created_at`,
      [req.params.courseId, req.actor!.id],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/courses/:courseId/assignments',
  requireRole('instructor'),
  validate(assignmentSchema),
  async (req, res, next) => {
    try {
      const rows = await query<any>(
        `INSERT INTO assignments (course_id, title, spec_md, kind, max_points, weight, rubric,
                                  auto_grade, grader_ref, due_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
         RETURNING *`,
        [
          req.params.courseId,
          req.body.title,
          req.body.specMd,
          req.body.kind,
          req.body.maxPoints,
          req.body.weight,
          JSON.stringify(req.body.rubric),
          req.body.autoGrade,
          req.body.graderRef ?? null,
          req.body.dueAt ?? null,
        ],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/courses/:courseId/assignments/:assignmentId', async (req, res, next) => {
  try {
    await assertEnrolled(req.params.courseId, req.actor!.id);
    const assignment = await queryOne<any>(
      'SELECT * FROM assignments WHERE id = $1 AND course_id = $2',
      [req.params.assignmentId, req.params.courseId],
    );
    if (!assignment) throw notFound('assignment not found');
    res.json({
      id: assignment.id,
      courseId: assignment.course_id,
      title: assignment.title,
      specHtml: renderMarkdown(assignment.spec_md),
      kind: assignment.kind,
      maxPoints: assignment.max_points,
      rubric: assignment.rubric,
      dueAt: assignment.due_at,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/courses/:courseId/assignments/:assignmentId/submissions',
  validate(submissionSchema),
  async (req, res, next) => {
    try {
      await assertEnrolled(req.params.courseId, req.actor!.id);

      const assignment = await queryOne<any>(
        'SELECT * FROM assignments WHERE id = $1 AND course_id = $2',
        [req.params.assignmentId, req.params.courseId],
      );
      if (!assignment) throw notFound('assignment not found');

      const [{ next_attempt }] = await query<{ next_attempt: number }>(
        `SELECT COALESCE(max(attempt), 0) + 1 AS next_attempt
           FROM submissions WHERE assignment_id = $1 AND user_id = $2`,
        [assignment.id, req.actor!.id],
      );

      const rows = await query<any>(
        `INSERT INTO submissions (assignment_id, course_id, user_id, attempt, body_md, file_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,'submitted')
         RETURNING *`,
        [
          assignment.id,
          req.params.courseId,
          req.actor!.id,
          next_attempt,
          req.body.bodyMd,
          req.body.fileId ?? null,
        ],
      );

      const submission = rows[0];

      if (assignment.auto_grade) {
        const target = assignment.grader_ref
          ? `${config.integrations.gradingServiceUrl}/${assignment.grader_ref}`
          : `${config.integrations.gradingServiceUrl}/evaluate`;

        try {
          const upstream = await dispatch(target, {
            data: {
              submissionId: submission.id,
              rubric: assignment.rubric,
              body: submission.body_md,
              maxPoints: assignment.max_points,
            },
            timeout: config.integrations.webhookTimeoutMs,
          });

          if (upstream.status < 400 && upstream.data) {
            await query(
              `UPDATE submissions
                  SET score = $1, feedback_md = $2, status = 'graded', graded_at = now()
                WHERE id = $3`,
              [upstream.data.score, upstream.data.feedback, submission.id],
            );
            submission.score = upstream.data.score;
            submission.feedback_md = upstream.data.feedback;
            submission.status = 'graded';
          }
        } catch (err) {
          req.log.warn({ err }, 'auto grading unavailable, leaving submission queued');
        }
      }

      res.status(201).json(submission);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/courses/:courseId/submissions', async (req, res, next) => {
  try {
    await assertEnrolled(req.params.courseId, req.actor!.id);
    const rows = await query(
      `SELECT s.id, s.assignment_id, s.attempt, s.status, s.score, s.submitted_at, s.graded_at
         FROM submissions s
        WHERE s.course_id = $1 AND s.user_id = $2
        ORDER BY s.submitted_at DESC`,
      [req.params.courseId, req.actor!.id],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/courses/:courseId/submissions/:submissionId', async (req, res, next) => {
  try {
    await assertEnrolled(req.params.courseId, req.actor!.id);

    const submission = await queryOne<any>(
      `SELECT s.*, u.display_name AS author_name, a.title AS assignment_title, a.max_points
         FROM submissions s
         JOIN users u ON u.id = s.user_id
         JOIN assignments a ON a.id = s.assignment_id
        WHERE s.id = $1`,
      [req.params.submissionId],
    );
    if (!submission) throw notFound('submission not found');

    res.json({
      id: submission.id,
      assignmentId: submission.assignment_id,
      assignmentTitle: submission.assignment_title,
      courseId: submission.course_id,
      userId: submission.user_id,
      authorName: submission.author_name,
      attempt: submission.attempt,
      bodyHtml: renderMarkdown(submission.body_md),
      fileId: submission.file_id,
      status: submission.status,
      score: submission.score,
      maxPoints: submission.max_points,
      feedbackHtml: submission.feedback_md ? renderMarkdown(submission.feedback_md) : null,
      submittedAt: submission.submitted_at,
      gradedAt: submission.graded_at,
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/courses/:courseId/assignments/:assignmentId/queue',
  requireRole('instructor'),
  async (req, res, next) => {
    try {
      const rows = await query(
        `SELECT s.id, s.user_id, s.attempt, s.status, s.score, s.submitted_at,
                u.display_name, u.email
           FROM submissions s
           JOIN users u ON u.id = s.user_id
          WHERE s.assignment_id = $1
          ORDER BY s.submitted_at ASC`,
        [req.params.assignmentId],
      );
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/submissions/:submissionId/grade',
  requireRole('instructor'),
  validate(gradeSchema),
  async (req, res, next) => {
    try {
      const submission = await queryOne<any>(
        'SELECT s.*, a.max_points FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = $1',
        [req.params.submissionId],
      );
      if (!submission) throw notFound('submission not found');
      if (req.body.score > submission.max_points) {
        throw badRequest('score exceeds the maximum for this assignment');
      }

      const rows = await query<any>(
        `UPDATE submissions
            SET score = $1, feedback_md = $2, status = $3, graded_by = $4, graded_at = now()
          WHERE id = $5
          RETURNING *`,
        [
          req.body.score,
          req.body.feedbackMd ?? null,
          req.body.status,
          req.actor!.id,
          req.params.submissionId,
        ],
      );

      await recordAudit(req, {
        action: 'submission.graded',
        targetType: 'submission',
        targetId: req.params.submissionId,
        metadata: { score: req.body.score },
      });

      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
