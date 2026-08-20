import { query } from '../../db';
import { badRequest } from '../../lib/errors';

interface DatasetSpec {
  from: string;
  tenantColumn: string;
  dimensions: Record<string, string>;
  metrics: Record<string, string>;
}

const DATASETS: Record<string, DatasetSpec> = {
  enrollments: {
    from: `enrollments e
             JOIN courses c ON c.id = e.course_id
             JOIN users u ON u.id = e.user_id`,
    tenantColumn: 'e.tenant_id',
    dimensions: {
      course: 'c.title',
      category: 'c.category',
      level: 'c.level',
      status: 'e.status',
      month: `to_char(e.enrolled_at, 'YYYY-MM')`,
      learner: 'u.display_name',
    },
    metrics: {
      count: 'count(*)',
      avg_progress: 'round(avg(e.progress_pct), 1)',
      completions: `count(*) FILTER (WHERE e.completed_at IS NOT NULL)`,
    },
  },
  submissions: {
    from: `submissions s
             JOIN assignments a ON a.id = s.assignment_id
             JOIN courses c ON c.id = s.course_id
             JOIN users u ON u.id = s.user_id`,
    tenantColumn: 'c.tenant_id',
    dimensions: {
      course: 'c.title',
      assignment: 'a.title',
      status: 's.status',
      learner: 'u.display_name',
      month: `to_char(s.submitted_at, 'YYYY-MM')`,
    },
    metrics: {
      count: 'count(*)',
      avg_score: 'round(avg(s.score), 2)',
      graded: `count(*) FILTER (WHERE s.status = 'graded')`,
    },
  },
  learners: {
    from: `users u
             LEFT JOIN enrollments e ON e.user_id = u.id`,
    tenantColumn: 'u.tenant_id',
    dimensions: {
      role: 'u.role',
      status: 'u.status',
      locale: 'u.locale',
      learner: 'u.display_name',
      month: `to_char(u.created_at, 'YYYY-MM')`,
    },
    metrics: {
      count: 'count(DISTINCT u.id)',
      enrollments: 'count(e.id)',
      avg_credits: 'round(avg(u.credits), 1)',
    },
  },
  revenue: {
    from: `orders o
             LEFT JOIN courses c ON c.id = o.course_id`,
    tenantColumn: 'o.tenant_id',
    dimensions: {
      course: 'c.title',
      status: 'o.status',
      currency: 'o.currency',
      month: `to_char(o.created_at, 'YYYY-MM')`,
    },
    metrics: {
      count: 'count(*)',
      gross: 'sum(o.subtotal_cents)',
      net: 'sum(o.total_cents)',
      discounts: 'sum(o.discount_cents)',
    },
  },
};

export interface ReportDefinition {
  dataset: string;
  segment?: string | null;
  dimensions: string[];
  metrics: string[];
  filters?: Record<string, unknown>;
}

export interface ReportResult {
  columns: string[];
  rows: Record<string, unknown>[];
  sql: string;
}

export async function runReport(
  tenantId: string,
  definition: ReportDefinition,
  limit = 500,
): Promise<ReportResult> {
  const spec = DATASETS[definition.dataset];
  if (!spec) throw badRequest(`unknown dataset '${definition.dataset}'`);

  const selects: string[] = [];
  const groups: string[] = [];
  const columns: string[] = [];

  for (const dimension of definition.dimensions) {
    const expression = spec.dimensions[dimension];
    if (!expression) throw badRequest(`unknown dimension '${dimension}'`);
    selects.push(`${expression} AS "${dimension}"`);
    groups.push(expression);
    columns.push(dimension);
  }

  for (const metric of definition.metrics) {
    const expression = spec.metrics[metric];
    if (!expression) throw badRequest(`unknown metric '${metric}'`);
    selects.push(`${expression} AS "${metric}"`);
    columns.push(metric);
  }

  const where: string[] = [`${spec.tenantColumn} = $1`];
  const values: unknown[] = [tenantId];

  if (definition.filters) {
    for (const [key, value] of Object.entries(definition.filters)) {
      const expression = spec.dimensions[key];
      if (!expression) continue;
      values.push(value);
      where.push(`${expression} = $${values.length}`);
    }
  }

  if (definition.segment && definition.segment.trim()) {
    where.push(`(${definition.segment})`);
  }

  const sql = `
    SELECT ${selects.join(', ')}
      FROM ${spec.from}
     WHERE ${where.join(' AND ')}
     ${groups.length ? `GROUP BY ${groups.join(', ')}` : ''}
     ORDER BY 1
     LIMIT ${limit}
  `;

  const rows = await query(sql, values);
  return { columns, rows, sql };
}

export function availableDatasets() {
  return Object.entries(DATASETS).map(([name, spec]) => ({
    name,
    dimensions: Object.keys(spec.dimensions),
    metrics: Object.keys(spec.metrics),
  }));
}
