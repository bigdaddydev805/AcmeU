import { Router } from 'express';
import { reportSchema } from '@acmeu/shared';
import { query, queryOne } from '../../db';
import { notFound } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { availableDatasets, runReport } from './service';

const router = Router();

router.use(requireAuth, requireRole('manager'));

router.get('/datasets', (_req, res) => {
  res.json({ data: availableDatasets() });
});

router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, name, dataset, segment, dimensions, metrics, filters, schedule, last_run_at, created_at
         FROM saved_reports
        WHERE tenant_id = $1
        ORDER BY created_at DESC`,
      [req.actor!.tenantId],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(reportSchema), async (req, res, next) => {
  try {
    const rows = await query<any>(
      `INSERT INTO saved_reports (tenant_id, owner_id, name, dataset, segment, dimensions, metrics, filters, schedule)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
       RETURNING *`,
      [
        req.actor!.tenantId,
        req.actor!.id,
        req.body.name,
        req.body.dataset,
        req.body.segment ?? null,
        req.body.dimensions,
        req.body.metrics,
        JSON.stringify(req.body.filters),
        req.body.schedule ?? null,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/preview', validate(reportSchema), async (req, res, next) => {
  try {
    const result = await runReport(req.actor!.tenantId, {
      dataset: req.body.dataset,
      segment: req.body.segment,
      dimensions: req.body.dimensions,
      metrics: req.body.metrics,
      filters: req.body.filters,
    });
    res.json({ columns: result.columns, rows: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/run', async (req, res, next) => {
  try {
    const report = await queryOne<any>(
      'SELECT * FROM saved_reports WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.actor!.tenantId],
    );
    if (!report) throw notFound('report not found');

    const result = await runReport(req.actor!.tenantId, {
      dataset: report.dataset,
      segment: report.segment,
      dimensions: report.dimensions,
      metrics: report.metrics,
      filters: report.filters,
    });

    await query('UPDATE saved_reports SET last_run_at = now() WHERE id = $1', [report.id]);

    res.json({
      id: report.id,
      name: report.name,
      columns: result.columns,
      rows: result.rows,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/export', async (req, res, next) => {
  try {
    const report = await queryOne<any>(
      'SELECT * FROM saved_reports WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.actor!.tenantId],
    );
    if (!report) throw notFound('report not found');

    const limit = Number.parseInt(String(req.query.limit ?? '5000'), 10) || 5000;

    const result = await runReport(
      req.actor!.tenantId,
      {
        dataset: report.dataset,
        segment: report.segment,
        dimensions: report.dimensions,
        metrics: report.metrics,
        filters: report.filters,
      },
      limit,
    );

    const header = result.columns.join(',');
    const body = result.rows
      .map((row) =>
        result.columns
          .map((column) => {
            const value = row[column];
            if (value === null || value === undefined) return '';
            const text = String(value);
            return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
          })
          .join(','),
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.name.replace(/[^\w.-]/g, '_')}.csv"`,
    );
    res.send(`${header}\n${body}`);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM saved_reports WHERE id = $1 AND tenant_id = $2', [
      req.params.id,
      req.actor!.tenantId,
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
