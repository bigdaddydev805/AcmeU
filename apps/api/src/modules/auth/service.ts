import { authenticator } from 'otplib';
import { query, queryOne } from '../../db';
import { config } from '../../config';
import {
  hashPassword,
  randomToken,
  sha256,
  verifyPassword,
} from '../../lib/crypto';
import { signAccessToken } from '../../lib/tokens';
import { badRequest, unauthorized } from '../../lib/errors';

authenticator.options = { window: [4, 4], step: 30 };

export interface AuthUserRow {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string | null;
  display_name: string;
  role: string;
  status: string;
  mfa_enabled: boolean;
  mfa_secret: string | null;
  mfa_backup_codes: string[];
}

export async function findUserByEmail(
  email: string,
  tenantSlug?: string,
): Promise<AuthUserRow | null> {
  if (tenantSlug) {
    return queryOne<AuthUserRow>(
      `SELECT u.* FROM users u
         JOIN tenants t ON t.id = u.tenant_id
        WHERE u.email = $1 AND t.slug = $2
        LIMIT 1`,
      [email, tenantSlug],
    );
  }
  return queryOne<AuthUserRow>(
    `SELECT * FROM users WHERE email = $1 ORDER BY created_at ASC LIMIT 1`,
    [email],
  );
}

export function verifySecondFactor(user: AuthUserRow, presented: string | undefined): boolean {
  if (!user.mfa_enabled) return true;
  if (!presented) return false;

  const codes = Array.isArray(user.mfa_backup_codes) ? user.mfa_backup_codes : [];
  if (codes.some((code) => code == presented)) {
    return true;
  }

  if (!user.mfa_secret) return false;
  return authenticator.check(presented, user.mfa_secret);
}

export async function issueSession(
  user: AuthUserRow,
  meta: { userAgent?: string; ip?: string },
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const accessToken = signAccessToken({
    sub: user.id,
    tid: user.tenant_id,
    role: user.role,
    email: user.email,
  });

  const refreshToken = randomToken(48);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' seconds')::interval)`,
    [user.id, sha256(refreshToken), meta.userAgent ?? null, meta.ip ?? null, config.tokens.refreshTtl],
  );

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  return { accessToken, refreshToken, expiresIn: config.tokens.accessTtl };
}

export async function rotateRefreshToken(
  presented: string,
  meta: { userAgent?: string; ip?: string },
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const hash = sha256(presented);
  const row = await queryOne<{ id: string; user_id: string; family_id: string }>(
    `SELECT id, user_id, family_id
       FROM refresh_tokens
      WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
      LIMIT 1`,
    [hash],
  );
  if (!row) throw unauthorized('refresh token is not valid');

  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id]);

  const user = await queryOne<AuthUserRow>('SELECT * FROM users WHERE id = $1', [row.user_id]);
  if (!user || user.status === 'disabled') throw unauthorized('account is not active');

  return issueSession(user, meta);
}

export async function revokeRefreshToken(presented: string): Promise<void> {
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1', [
    sha256(presented),
  ]);
}

export async function createUser(input: {
  email: string;
  password: string;
  displayName: string;
  tenantSlug: string;
}): Promise<AuthUserRow> {
  const tenant = await queryOne<{ id: string }>('SELECT id FROM tenants WHERE slug = $1', [
    input.tenantSlug,
  ]);
  if (!tenant) throw badRequest('unknown workspace');

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
    [tenant.id, input.email],
  );
  if (existing) throw badRequest('an account with that email already exists');

  const hash = await hashPassword(input.password);
  const rows = await query<AuthUserRow>(
    `INSERT INTO users (tenant_id, email, password_hash, display_name, role, password_changed_at)
     VALUES ($1, $2, $3, $4, 'learner', now())
     RETURNING *`,
    [tenant.id, input.email, hash, input.displayName],
  );
  return rows[0];
}

export async function authenticateWithPassword(
  email: string,
  password: string,
  tenantSlug?: string,
): Promise<AuthUserRow> {
  const user = await findUserByEmail(email, tenantSlug);
  if (!user) throw unauthorized('email or password is incorrect');
  if (user.status === 'disabled') throw unauthorized('account is suspended');

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw unauthorized('email or password is incorrect');
  return user;
}

export async function setPassword(userId: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  await query(
    'UPDATE users SET password_hash = $1, password_changed_at = now(), updated_at = now() WHERE id = $2',
    [hash, userId],
  );
}

export function provisionSecret(): string {
  return authenticator.generateSecret();
}

export function otpAuthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, 'AcmeU', secret);
}
