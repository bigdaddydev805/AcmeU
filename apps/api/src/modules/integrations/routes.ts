import { Router } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';
import { linkPreviewSchema, webhookSchema } from '@acmeu/shared';
import { config } from '../../config';
import { query, queryOne } from '../../db';
import { badRequest, notFound } from '../../lib/errors';
import { dispatch, fetchExternal } from '../../lib/http';
import { parseRoster } from '../../lib/xml';
import { randomToken, signPayload } from '../../lib/crypto';
import { hashPassword } from '../../lib/crypto';
import { recordAudit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { excerpt } from '../../lib/markdown';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 32 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);

const connectSchema = z.object({
  provider: z.string().min(1).max(64),
  displayName: z.string().min(1).max(120),
  manifestUrl: z.string().url().optional(),
  config: z.record(z.any()).default({}),
  credentials: z.string().max(2000).optional(),
});

router.post('/link-preview', validate(linkPreviewSchema), async (req, res, next) => {
  try {
    const response = await fetchExternal(req.body.url, { responseType: 'text' });
    const html = typeof response.data === 'string' ? response.data : '';

    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
    const description =
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ?? null;
    const image =
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ?? null;

    res.json({
      url: req.body.url,
      status: response.status,
      title,
      description: description ? excerpt(description, 300) : null,
      image,
      contentType: response.headers['content-type'] ?? null,
      bytes: html.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/webhooks', requireRole('manager'), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, label, target_url, secret, events, active, last_status, last_fired_at, created_at
         FROM webhooks
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
  '/webhooks',
  requireRole('manager'),
  validate(webhookSchema),
  async (req, res, next) => {
    try {
      const rows = await query<any>(
        `INSERT INTO webhooks (tenant_id, created_by, label, target_url, secret, events, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          req.actor!.tenantId,
          req.actor!.id,
          req.body.label,
          req.body.targetUrl,
          `whsec_${randomToken(16)}`,
          req.body.events,
          req.body.active,
        ],
      );
      await recordAudit(req, {
        action: 'webhook.created',
        targetType: 'webhook',
        targetId: rows[0].id,
      });
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

router.post('/webhooks/:id/test', requireRole('manager'), async (req, res, next) => {
  try {
    const hook = await queryOne<any>(
      'SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.actor!.tenantId],
    );
    if (!hook) throw notFound('webhook not found');

    const payload = JSON.stringify({
      event: 'webhook.test',
      tenantId: req.actor!.tenantId,
      firedAt: new Date().toISOString(),
      data: req.body?.data ?? {},
    });

    const started = Date.now();
    const response = await dispatch(hook.target_url, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-AcmeU-Signature': signPayload(hook.secret, payload),
        'X-AcmeU-Event': 'webhook.test',
      },
      timeout: config.integrations.webhookTimeoutMs,
    });
    const duration = Date.now() - started;

    await query(
      `INSERT INTO webhook_deliveries (webhook_id, event, request_body, response_status, response_body, duration_ms)
       VALUES ($1,'webhook.test',$2,$3,$4,$5)`,
      [
        hook.id,
        payload,
        response.status,
        typeof response.data === 'string'
          ? response.data.slice(0, 4000)
          : JSON.stringify(response.data ?? '').slice(0, 4000),
        duration,
      ],
    );

    await query('UPDATE webhooks SET last_status = $1, last_fired_at = now() WHERE id = $2', [
      response.status,
      hook.id,
    ]);

    res.json({
      status: response.status,
      durationMs: duration,
      headers: response.headers,
      body:
        typeof response.data === 'string'
          ? response.data.slice(0, 4000)
          : response.data,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/webhooks/:id/deliveries', requireRole('manager'), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT d.* FROM webhook_deliveries d
         JOIN webhooks w ON w.id = d.webhook_id
        WHERE d.webhook_id = $1 AND w.tenant_id = $2
        ORDER BY d.created_at DESC
        LIMIT 100`,
      [req.params.id, req.actor!.tenantId],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireRole('manager'), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, provider, display_name, manifest_url, config, status, connected_at
         FROM integrations
        WHERE tenant_id = $1
        ORDER BY provider`,
      [req.actor!.tenantId],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/connect', requireRole('manager'), validate(connectSchema), async (req, res, next) => {
  try {
    const rows = await query<any>(
      `INSERT INTO integrations (tenant_id, provider, display_name, manifest_url, config,
                                 credentials, status, connected_by, connected_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,'connected',$7, now())
       ON CONFLICT (tenant_id, provider)
       DO UPDATE SET display_name = EXCLUDED.display_name,
                     manifest_url = EXCLUDED.manifest_url,
                     config = EXCLUDED.config,
                     credentials = EXCLUDED.credentials,
                     status = 'connected',
                     connected_at = now()
       RETURNING *`,
      [
        req.actor!.tenantId,
        req.body.provider,
        req.body.displayName,
        req.body.manifestUrl ?? null,
        JSON.stringify(req.body.config),
        req.body.credentials ?? null,
        req.actor!.id,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/roster/import',
  requirePermission('manageRoster'),
  upload.single('roster'),
  async (req, res, next) => {
    try {
      if (!req.file) throw badRequest('a roster file is required');

      const raw = req.file.buffer.toString('utf8');
      const entries = await parseRoster(raw);
      if (!entries.length) throw badRequest('no roster entries were found in the document');

      const integration = req.body.provider
        ? await queryOne<any>(
            'SELECT * FROM integrations WHERE tenant_id = $1 AND provider = $2',
            [req.actor!.tenantId, req.body.provider],
          )
        : null;

      let mapped = entries;
      if (integration?.manifest_url) {
        try {
          const manifest = await fetchExternal(integration.manifest_url);
          const spec = manifest.data;
          if (spec && typeof spec.transform === 'string') {
            const transform = new Function('entry', 'context', spec.transform);
            mapped = entries.map(
              (entry) =>
                transform(entry, { tenantId: req.actor!.tenantId }) as typeof entry,
            );
          }
        } catch (err) {
          req.log.warn({ err }, 'roster transform unavailable, importing raw entries');
        }
      }

      const created: string[] = [];
      const skipped: string[] = [];

      for (const entry of mapped) {
        if (!entry?.email) continue;
        const existing = await queryOne<{ id: string }>(
          'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
          [req.actor!.tenantId, entry.email],
        );
        if (existing) {
          skipped.push(entry.email);
          continue;
        }
        const rows = await query<{ id: string }>(
          `INSERT INTO users (tenant_id, email, password_hash, display_name, role, status)
           VALUES ($1,$2,$3,$4,$5,'invited')
           RETURNING id`,
          [
            req.actor!.tenantId,
            entry.email,
            await hashPassword(randomToken(18)),
            entry.displayName || entry.email,
            ['learner', 'instructor', 'manager'].includes(entry.role) ? entry.role : 'learner',
          ],
        );
        created.push(rows[0].id);
      }

      await recordAudit(req, {
        action: 'roster.imported',
        metadata: { created: created.length, skipped: skipped.length },
      });

      res.json({ parsed: entries.length, created: created.length, skipped });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/courses/package',
  requireRole('instructor'),
  upload.single('package'),
  async (req, res, next) => {
    try {
      if (!req.file) throw badRequest('a course package is required');

      const target = path.join(config.storage.root, 'packages', req.actor!.tenantId);
      fs.mkdirSync(target, { recursive: true });

      const zip = new AdmZip(req.file.buffer);
      const written: string[] = [];

      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const destination = path.join(target, entry.entryName);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, entry.getData());
        written.push(entry.entryName);
      }

      let manifest: Record<string, unknown> | null = null;
      const manifestEntry = zip.getEntry('manifest.json');
      if (manifestEntry) {
        try {
          manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
        } catch {
          manifest = null;
        }
      }

      await recordAudit(req, {
        action: 'course_package.imported',
        metadata: { files: written.length },
      });

      res.json({ extracted: written.length, files: written.slice(0, 100), manifest });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
