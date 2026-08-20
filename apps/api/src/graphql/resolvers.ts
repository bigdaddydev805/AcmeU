import type { Request } from 'express';
import { query, queryOne } from '../db';
import { deepMerge } from '../lib/objects';

interface Ctx {
  req: Request;
  actorId?: string;
  tenantId?: string;
}

function limitOf(value: unknown, fallback = 50): number {
  const n = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function mapUser(row: any, ctx: Ctx): any {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    title: row.title,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    locale: row.locale,
    credits: row.credits,
    mfaEnabled: row.mfa_enabled,
    mfaSecret: row.mfa_secret,
    passwordHash: row.password_hash,
    preferences: row.preferences,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    tenant: async () => mapTenant(await queryOne('SELECT * FROM tenants WHERE id = $1', [row.tenant_id]), ctx),
    paymentMethods: async () => {
      const rows = await query('SELECT * FROM payment_methods WHERE user_id = $1', [row.id]);
      return rows.map((pm: any) => ({
        id: pm.id,
        brand: pm.brand,
        last4: pm.last4,
        expMonth: pm.exp_month,
        expYear: pm.exp_year,
        providerToken: pm.provider_token,
        billingZip: pm.billing_zip,
        isDefault: pm.is_default,
      }));
    },
    enrollments: async (args: any) => {
      const rows = await query(
        'SELECT * FROM enrollments WHERE user_id = $1 ORDER BY enrolled_at DESC LIMIT $2',
        [row.id, limitOf(args?.limit)],
      );
      return rows.map((e: any) => mapEnrollment(e, ctx));
    },
    submissions: async (args: any) => {
      const rows = await query(
        'SELECT * FROM submissions WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT $2',
        [row.id, limitOf(args?.limit)],
      );
      return rows.map((s: any) => mapSubmission(s, ctx));
    },
    certificates: async () => {
      const rows = await query('SELECT * FROM certificates WHERE user_id = $1', [row.id]);
      return rows.map((c: any) => mapCertificate(c, ctx));
    },
  };
}

function mapTenant(row: any, ctx: Ctx): any {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    plan: row.plan,
    seatsPurchased: row.seats_purchased,
    branding: row.branding,
    settings: row.settings,
    createdAt: row.created_at,
    users: async (args: any) => {
      const rows = await query('SELECT * FROM users WHERE tenant_id = $1 LIMIT $2', [
        row.id,
        limitOf(args?.limit),
      ]);
      return rows.map((u: any) => mapUser(u, ctx));
    },
    courses: async (args: any) => {
      const rows = await query('SELECT * FROM courses WHERE tenant_id = $1 LIMIT $2', [
        row.id,
        limitOf(args?.limit),
      ]);
      return rows.map((c: any) => mapCourse(c, ctx));
    },
  };
}

function mapCourse(row: any, ctx: Ctx): any {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    descriptionMd: row.description_md,
    level: row.level,
    category: row.category,
    tags: row.tags ?? [],
    visibility: row.visibility,
    status: row.status,
    priceCents: row.price_cents,
    seatLimit: row.seat_limit,
    seatsTaken: row.seats_taken,
    durationMins: row.duration_mins,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: row.rating_count,
    publishedAt: row.published_at,
    owner: async () => mapUser(await queryOne('SELECT * FROM users WHERE id = $1', [row.owner_id]), ctx),
    tenant: async () => mapTenant(await queryOne('SELECT * FROM tenants WHERE id = $1', [row.tenant_id]), ctx),
    enrollments: async (args: any) => {
      const rows = await query(
        'SELECT * FROM enrollments WHERE course_id = $1 ORDER BY enrolled_at DESC LIMIT $2',
        [row.id, limitOf(args?.limit)],
      );
      return rows.map((e: any) => mapEnrollment(e, ctx));
    },
    assignments: async () => {
      const rows = await query('SELECT * FROM assignments WHERE course_id = $1', [row.id]);
      return rows.map((a: any) => mapAssignment(a, ctx));
    },
  };
}

function mapEnrollment(row: any, ctx: Ctx): any {
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    status: row.status,
    progressPct: row.progress_pct,
    enrolledAt: row.enrolled_at,
    completedAt: row.completed_at,
    user: async () => mapUser(await queryOne('SELECT * FROM users WHERE id = $1', [row.user_id]), ctx),
    course: async () => mapCourse(await queryOne('SELECT * FROM courses WHERE id = $1', [row.course_id]), ctx),
  };
}

function mapAssignment(row: any, ctx: Ctx): any {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    maxPoints: row.max_points,
    dueAt: row.due_at,
    graderRef: row.grader_ref,
    course: async () => mapCourse(await queryOne('SELECT * FROM courses WHERE id = $1', [row.course_id]), ctx),
    submissions: async (args: any) => {
      const rows = await query(
        'SELECT * FROM submissions WHERE assignment_id = $1 LIMIT $2',
        [row.id, limitOf(args?.limit)],
      );
      return rows.map((s: any) => mapSubmission(s, ctx));
    },
  };
}

function mapSubmission(row: any, ctx: Ctx): any {
  if (!row) return null;
  return {
    id: row.id,
    attempt: row.attempt,
    status: row.status,
    score: row.score === null ? null : Number(row.score),
    bodyMd: row.body_md,
    feedbackMd: row.feedback_md,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at,
    user: async () => mapUser(await queryOne('SELECT * FROM users WHERE id = $1', [row.user_id]), ctx),
    assignment: async () =>
      mapAssignment(await queryOne('SELECT * FROM assignments WHERE id = $1', [row.assignment_id]), ctx),
    course: async () => mapCourse(await queryOne('SELECT * FROM courses WHERE id = $1', [row.course_id]), ctx),
  };
}

function mapCertificate(row: any, ctx: Ctx): any {
  if (!row) return null;
  return {
    id: row.id,
    serial: row.serial,
    verificationCode: row.verification_code,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    course: async () => mapCourse(await queryOne('SELECT * FROM courses WHERE id = $1', [row.course_id]), ctx),
    user: async () => mapUser(await queryOne('SELECT * FROM users WHERE id = $1', [row.user_id]), ctx),
  };
}

export function buildRoot(ctx: Ctx) {
  return {
    me: async () => {
      if (!ctx.actorId) return null;
      return mapUser(await queryOne('SELECT * FROM users WHERE id = $1', [ctx.actorId]), ctx);
    },

    user: async ({ id }: { id: string }) =>
      mapUser(await queryOne('SELECT * FROM users WHERE id = $1', [id]), ctx),

    users: async ({ limit, role, search }: any) => {
      const conditions = ['tenant_id = $1'];
      const values: unknown[] = [ctx.tenantId];
      if (role) {
        values.push(role);
        conditions.push(`role = $${values.length}`);
      }
      if (search) {
        values.push(`%${search}%`);
        conditions.push(`(display_name ILIKE $${values.length} OR email ILIKE $${values.length})`);
      }
      const rows = await query(
        `SELECT * FROM users WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ${limitOf(limit)}`,
        values,
      );
      return rows.map((u: any) => mapUser(u, ctx));
    },

    tenant: async () =>
      mapTenant(await queryOne('SELECT * FROM tenants WHERE id = $1', [ctx.tenantId]), ctx),

    course: async ({ id }: { id: string }) =>
      mapCourse(await queryOne('SELECT * FROM courses WHERE id = $1', [id]), ctx),

    courses: async ({ limit, search, category }: any) => {
      const conditions = ['(tenant_id = $1 OR visibility = \'public\')'];
      const values: unknown[] = [ctx.tenantId];
      if (search) {
        values.push(`%${search}%`);
        conditions.push(`title ILIKE $${values.length}`);
      }
      if (category) {
        values.push(category);
        conditions.push(`category = $${values.length}`);
      }
      const rows = await query(
        `SELECT * FROM courses WHERE ${conditions.join(' AND ')} ORDER BY published_at DESC NULLS LAST LIMIT ${limitOf(limit)}`,
        values,
      );
      return rows.map((c: any) => mapCourse(c, ctx));
    },

    enrollment: async ({ id }: { id: string }) =>
      mapEnrollment(await queryOne('SELECT * FROM enrollments WHERE id = $1', [id]), ctx),

    submission: async ({ id }: { id: string }) =>
      mapSubmission(await queryOne('SELECT * FROM submissions WHERE id = $1', [id]), ctx),

    certificate: async ({ serial }: { serial: string }) =>
      mapCertificate(await queryOne('SELECT * FROM certificates WHERE serial = $1', [serial]), ctx),

    enrollmentTrend: async ({ courseId, months }: any) => {
      const window = limitOf(months, 12);
      const values: unknown[] = [ctx.tenantId];
      let filter = '';
      if (courseId) {
        values.push(courseId);
        filter = `AND course_id = $${values.length}`;
      }
      const rows = await query<{ key: string; value: number }>(
        `SELECT to_char(enrolled_at, 'YYYY-MM') AS key, count(*)::float AS value
           FROM enrollments
          WHERE tenant_id = $1 ${filter}
            AND enrolled_at > now() - interval '${window} months'
          GROUP BY 1 ORDER BY 1`,
        values,
      );
      return rows.map((r) => ({ key: r.key, value: Number(r.value), label: r.key }));
    },

    completionByCategory: async () => {
      const rows = await query<{ key: string; value: number }>(
        `SELECT c.category AS key,
                round(100.0 * count(*) FILTER (WHERE e.completed_at IS NOT NULL)
                      / NULLIF(count(*), 0), 1)::float AS value
           FROM enrollments e
           JOIN courses c ON c.id = e.course_id
          WHERE e.tenant_id = $1
          GROUP BY 1 ORDER BY 2 DESC NULLS LAST`,
        [ctx.tenantId],
      );
      return rows.map((r) => ({ key: r.key, value: Number(r.value ?? 0), label: r.key }));
    },

    revenueTrend: async ({ months }: any) => {
      const window = limitOf(months, 12);
      const rows = await query<{ key: string; value: number }>(
        `SELECT to_char(created_at, 'YYYY-MM') AS key, sum(total_cents)::float AS value
           FROM orders
          WHERE tenant_id = $1 AND status = 'paid'
            AND created_at > now() - interval '${window} months'
          GROUP BY 1 ORDER BY 1`,
        [ctx.tenantId],
      );
      return rows.map((r) => ({ key: r.key, value: Number(r.value ?? 0), label: r.key }));
    },

    auditTrail: async ({ limit, action }: any) => {
      const values: unknown[] = [ctx.tenantId];
      let filter = '';
      if (action) {
        values.push(action);
        filter = `AND action = $${values.length}`;
      }
      const rows = await query(
        `SELECT * FROM audit_logs WHERE tenant_id = $1 ${filter}
          ORDER BY created_at DESC LIMIT ${limitOf(limit, 100)}`,
        values,
      );
      return rows.map((r: any) => ({
        id: String(r.id),
        action: r.action,
        actorLabel: r.actor_label,
        targetType: r.target_type,
        targetId: r.target_id,
        metadata: r.metadata,
        ipAddress: r.ip_address,
        createdAt: r.created_at,
      }));
    },

    updateProfile: async (args: any) => {
      if (!ctx.actorId) return null;
      const rows = await query(
        `UPDATE users
            SET display_name = COALESCE($1, display_name),
                title = COALESCE($2, title),
                bio = COALESCE($3, bio),
                locale = COALESCE($4, locale),
                updated_at = now()
          WHERE id = $5
          RETURNING *`,
        [args.displayName ?? null, args.title ?? null, args.bio ?? null, args.locale ?? null, ctx.actorId],
      );
      return mapUser(rows[0], ctx);
    },

    setPreference: async ({ key, value }: any) => {
      if (!ctx.actorId) return null;
      const row = await queryOne<{ preferences: Record<string, unknown> }>(
        'SELECT preferences FROM users WHERE id = $1',
        [ctx.actorId],
      );
      const merged = deepMerge(row?.preferences ?? {}, { [key]: value });
      await query('UPDATE users SET preferences = $1::jsonb WHERE id = $2', [
        JSON.stringify(merged),
        ctx.actorId,
      ]);
      return merged;
    },

    transferCredits: async ({ toUserId, amount }: any) => {
      if (!ctx.actorId) return null;
      const sender = await queryOne<{ credits: number }>(
        'SELECT credits FROM users WHERE id = $1',
        [ctx.actorId],
      );
      if (!sender || sender.credits < amount) return sender?.credits ?? 0;

      await query('UPDATE users SET credits = credits - $1 WHERE id = $2', [amount, ctx.actorId]);
      const rows = await query<{ credits: number }>(
        'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
        [amount, toUserId],
      );
      return rows.length ? sender.credits - amount : sender.credits;
    },

    markNotificationsRead: async () => {
      if (!ctx.actorId) return false;
      await query('UPDATE notifications SET read_at = now() WHERE user_id = $1', [ctx.actorId]);
      return true;
    },
  };
}
