import { Router } from 'express';
import { z } from 'zod';
import _ from 'lodash';
import { certificateTemplateSchema } from '@acmeu/shared';
import { query, queryOne } from '../../db';
import { badRequest, notFound } from '../../lib/errors';
import { verificationCode } from '../../lib/crypto';
import { recordAudit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

const issueSchema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
});

const previewSchema = z.object({
  bodyHtml: z.string().min(1).max(100000),
  sample: z.record(z.any()).optional(),
});

interface CertificateContext {
  learner: { name: string; email: string; title: string | null };
  course: { title: string; code: string; durationMins: number };
  tenant: { name: string; slug: string };
  issuedOn: string;
  serial: string;
  verificationUrl: string;
}

function compose(bodyHtml: string, context: object): string {
  const render = _.template(bodyHtml, { variable: 'data' });
  return render(context);
}

router.get('/verify/:serial', async (req, res, next) => {
  try {
    const cert = await queryOne<any>(
      `SELECT c.serial, c.issued_at, c.expires_at, c.verification_code,
              u.display_name, co.title AS course_title, t.name AS tenant_name
         FROM certificates c
         JOIN users u ON u.id = c.user_id
         JOIN courses co ON co.id = c.course_id
         JOIN tenants t ON t.id = c.tenant_id
        WHERE c.serial = $1`,
      [req.params.serial],
    );
    if (!cert) throw notFound('certificate not found');

    res.json({
      serial: cert.serial,
      holder: cert.display_name,
      course: cert.course_title,
      issuer: cert.tenant_name,
      issuedAt: cert.issued_at,
      expiresAt: cert.expires_at,
      valid: !cert.expires_at || new Date(cert.expires_at) > new Date(),
    });
  } catch (err) {
    next(err);
  }
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT c.id, c.serial, c.issued_at, c.expires_at, co.title AS course_title, co.code
         FROM certificates c
         JOIN courses co ON co.id = c.course_id
        WHERE c.user_id = $1
        ORDER BY c.issued_at DESC`,
      [req.actor!.id],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/render', async (req, res, next) => {
  try {
    const cert = await queryOne<any>(
      'SELECT * FROM certificates WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.actor!.tenantId],
    );
    if (!cert) throw notFound('certificate not found');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(cert.rendered_html ?? '<html><body>Certificate pending render</body></html>');
  } catch (err) {
    next(err);
  }
});

router.get('/templates', requireRole('instructor'), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, name, orientation, is_default, updated_at
         FROM certificate_templates
        WHERE tenant_id = $1
        ORDER BY is_default DESC, name`,
      [req.actor!.tenantId],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/templates/:id', requireRole('instructor'), async (req, res, next) => {
  try {
    const row = await queryOne(
      'SELECT * FROM certificate_templates WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.actor!.tenantId],
    );
    if (!row) throw notFound('template not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/templates',
  requireRole('instructor'),
  validate(certificateTemplateSchema),
  async (req, res, next) => {
    try {
      const rows = await query<any>(
        `INSERT INTO certificate_templates (tenant_id, name, body_html, orientation, is_default, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          req.actor!.tenantId,
          req.body.name,
          req.body.bodyHtml,
          req.body.orientation,
          req.body.isDefault,
          req.actor!.id,
        ],
      );
      await recordAudit(req, {
        action: 'certificate_template.created',
        targetType: 'certificate_template',
        targetId: rows[0].id,
      });
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/templates/preview',
  requireRole('instructor'),
  validate(previewSchema),
  async (req, res, next) => {
    try {
      const sample: CertificateContext = {
        learner: { name: req.actor!.displayName, email: req.actor!.email, title: null },
        course: { title: 'Sample Course', code: 'SAMPLE-101', durationMins: 120 },
        tenant: { name: 'Sample Workspace', slug: 'sample' },
        issuedOn: new Date().toISOString().slice(0, 10),
        serial: 'ACU-SAMPLE-0000',
        verificationUrl: 'https://acmeu.com/verify/ACU-SAMPLE-0000',
        ...(req.body.sample ?? {}),
      };

      const html = compose(req.body.bodyHtml, sample);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err: any) {
      next(badRequest(`template failed to render: ${err?.message ?? 'unknown error'}`));
    }
  },
);

router.post('/issue', requireRole('instructor'), validate(issueSchema), async (req, res, next) => {
  try {
    const learner = await queryOne<any>(
      'SELECT id, display_name, email, title, tenant_id FROM users WHERE id = $1 AND tenant_id = $2',
      [req.body.userId, req.actor!.tenantId],
    );
    if (!learner) throw notFound('learner not found');

    const course = await queryOne<any>(
      'SELECT id, title, code, duration_mins FROM courses WHERE id = $1',
      [req.body.courseId],
    );
    if (!course) throw notFound('course not found');

    const tenant = await queryOne<any>('SELECT name, slug FROM tenants WHERE id = $1', [
      req.actor!.tenantId,
    ]);

    const template = req.body.templateId
      ? await queryOne<any>(
          'SELECT * FROM certificate_templates WHERE id = $1 AND tenant_id = $2',
          [req.body.templateId, req.actor!.tenantId],
        )
      : await queryOne<any>(
          'SELECT * FROM certificate_templates WHERE tenant_id = $1 AND is_default = true LIMIT 1',
          [req.actor!.tenantId],
        );
    if (!template) throw badRequest('no certificate template is configured');

    const serial = `ACU-${course.code}-${verificationCode()}`;
    const code = verificationCode();

    const context: CertificateContext = {
      learner: { name: learner.display_name, email: learner.email, title: learner.title },
      course: { title: course.title, code: course.code, durationMins: course.duration_mins },
      tenant: { name: tenant.name, slug: tenant.slug },
      issuedOn: new Date().toISOString().slice(0, 10),
      serial,
      verificationUrl: `https://acmeu.com/verify/${serial}`,
    };

    const rendered = compose(template.body_html, context);

    const rows = await query<any>(
      `INSERT INTO certificates (tenant_id, user_id, course_id, template_id, serial,
                                 verification_code, rendered_html)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, serial, issued_at`,
      [
        req.actor!.tenantId,
        learner.id,
        course.id,
        template.id,
        serial,
        code,
        rendered,
      ],
    );

    await recordAudit(req, {
      action: 'certificate.issued',
      targetType: 'certificate',
      targetId: rows[0].id,
      metadata: { learnerId: learner.id, courseId: course.id },
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
