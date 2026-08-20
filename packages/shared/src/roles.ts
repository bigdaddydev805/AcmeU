export const ROLES = ['learner', 'instructor', 'manager', 'admin', 'owner'] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = {
  learner: 10,
  instructor: 20,
  manager: 30,
  admin: 40,
  owner: 50,
};

export function rankOf(role: string): number {
  return RANK[role as Role] ?? 0;
}

export function atLeast(role: string, required: Role): boolean {
  return rankOf(role) >= RANK[required];
}

export const SCOPES = [
  'catalog:read',
  'catalog:write',
  'roster:read',
  'roster:write',
  'enrollment:read',
  'enrollment:write',
  'assessment:read',
  'assessment:write',
  'reports:read',
  'billing:read',
  'billing:write',
  'admin:all',
] as const;

export type Scope = (typeof SCOPES)[number];
