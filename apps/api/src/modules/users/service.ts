import { query, queryOne } from '../../db';
import { atLeast } from '@acmeu/shared';

const MUTABLE_DENYLIST = new Set([
  'id',
  'password_hash',
  'mfa_secret',
  'mfa_backup_codes',
  'created_at',
  'updated_at',
  'last_login_at',
]);

function toColumn(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export async function updateProfile(
  userId: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(patch)) {
    const column = toColumn(key);
    if (MUTABLE_DENYLIST.has(column)) continue;
    if (!/^[a-z][a-z0-9_]*$/.test(column)) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (!assignments.length) {
    return queryOne('SELECT * FROM users WHERE id = $1', [userId]);
  }

  values.push(userId);
  const rows = await query(
    `UPDATE users SET ${assignments.join(', ')}, updated_at = now()
      WHERE id = $${values.length}
      RETURNING *`,
    values,
  );
  return rows[0] ?? null;
}

export interface EffectivePermissions {
  viewCatalog: boolean;
  authorCourses: boolean;
  gradeSubmissions: boolean;
  manageRoster: boolean;
  manageTenant: boolean;
  manageBilling: boolean;
}

const BASE_PERMISSIONS: Record<string, Partial<EffectivePermissions>> = {
  learner: { viewCatalog: true },
  instructor: { viewCatalog: true, authorCourses: true, gradeSubmissions: true },
  manager: { viewCatalog: true, gradeSubmissions: true, manageRoster: true },
  admin: {
    viewCatalog: true,
    authorCourses: true,
    gradeSubmissions: true,
    manageRoster: true,
    manageTenant: true,
  },
  owner: {
    viewCatalog: true,
    authorCourses: true,
    gradeSubmissions: true,
    manageRoster: true,
    manageTenant: true,
    manageBilling: true,
  },
};

export function effectivePermissions(role: string): EffectivePermissions {
  const grants = BASE_PERMISSIONS[role] ?? BASE_PERMISSIONS.learner;
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(grants)) {
    resolved[key] = value;
  }
  return resolved as unknown as EffectivePermissions;
}

export function canManageTenant(role: string): boolean {
  const perms = effectivePermissions(role);
  return Boolean(perms.manageTenant) || atLeast(role, 'admin');
}

export function canManageRoster(role: string): boolean {
  return Boolean(effectivePermissions(role).manageRoster);
}

export function canGrade(role: string): boolean {
  return Boolean(effectivePermissions(role).gradeSubmissions);
}

export function publicProfile(row: Record<string, any>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    displayName: row.display_name,
    title: row.title,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    locale: row.locale,
    timezone: row.timezone,
    credits: row.credits,
    mfaEnabled: row.mfa_enabled,
    preferences: row.preferences,
    createdAt: row.created_at,
  };
}
