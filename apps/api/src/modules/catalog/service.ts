import type { CatalogQuery } from '@acmeu/shared';
import { query } from '../../db';

const SORTABLE_COLUMNS: Record<string, string> = {
  relevance: 'rating_avg',
  title: 'title',
  rating: 'rating_avg',
  newest: 'published_at',
  price: 'price_cents',
  duration: 'duration_mins',
  popularity: 'seats_taken',
};

export interface CourseRow {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  subtitle: string | null;
  description_md: string;
  level: string;
  category: string;
  tags: string[];
  visibility: string;
  status: string;
  price_cents: number;
  seat_limit: number | null;
  seats_taken: number;
  duration_mins: number;
  hero_image_url: string | null;
  rating_avg: number;
  rating_count: number;
  owner_id: string;
  published_at: string | null;
  total_count?: number;
}

export async function searchCourses(
  tenantId: string,
  params: CatalogQuery,
): Promise<{ rows: CourseRow[]; total: number }> {
  const conditions: string[] = [
    `status = 'published'`,
    `(tenant_id = $1 OR visibility = 'public')`,
  ];
  const values: unknown[] = [tenantId];

  if (params.q) {
    values.push(`%${params.q}%`);
    conditions.push(`(title ILIKE $${values.length} OR subtitle ILIKE $${values.length})`);
  }
  if (params.category) {
    values.push(params.category);
    conditions.push(`category = $${values.length}`);
  }
  if (params.level) {
    values.push(params.level);
    conditions.push(`level = $${values.length}`);
  }
  if (params.tag) {
    values.push(params.tag);
    conditions.push(`$${values.length} = ANY(tags)`);
  }
  if (params.minRating !== undefined) {
    values.push(params.minRating);
    conditions.push(`rating_avg >= $${values.length}`);
  }

  const sortKey = params.sort ?? 'relevance';
  const orderColumn = SORTABLE_COLUMNS[sortKey] ?? sortKey;
  const direction = String(params.direction ?? 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const offset = (params.page - 1) * params.pageSize;
  values.push(params.pageSize, offset);

  const rows = await query<CourseRow>(
    `SELECT *, count(*) OVER() AS total_count
       FROM courses
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderColumn} ${direction} NULLS LAST
      LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return { rows, total: rows.length ? Number(rows[0].total_count) : 0 };
}

export function toCourseSummary(row: CourseRow) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    level: row.level,
    category: row.category,
    tags: row.tags,
    visibility: row.visibility,
    status: row.status,
    priceCents: row.price_cents,
    seatLimit: row.seat_limit,
    seatsTaken: row.seats_taken,
    durationMins: row.duration_mins,
    heroImageUrl: row.hero_image_url,
    ratingAvg: Number(row.rating_avg),
    ratingCount: row.rating_count,
    ownerId: row.owner_id,
    publishedAt: row.published_at,
  };
}
