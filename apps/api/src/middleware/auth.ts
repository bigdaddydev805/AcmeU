import type { NextFunction, Request, Response } from 'express';
import { queryOne } from '../db';
import { hashApiKey, readPersistentSession } from '../lib/crypto';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  display_name: string;
  status: string;
}

async function loadUser(userId: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT id, tenant_id, email, role, display_name, status
       FROM users
      WHERE id = $1`,
    [userId],
  );
}

async function fromBearer(token: string): Promise<Express.AuthenticatedActor | null> {
  const claims = verifyAccessToken(token);
  const user = await loadUser(claims.sub);
  if (!user || user.status === 'disabled') return null;
  return {
    id: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
    displayName: user.display_name,
    status: user.status,
    scopes: claims.scope ?? ['*'],
    via: 'access_token',
    impersonatorId: (claims as any).act,
  };
}

async function fromApiKey(rawKey: string): Promise<Express.AuthenticatedActor | null> {
  const prefix = rawKey.slice(0, 12);
  const row = await queryOne<{
    id: string;
    key_hash: string;
    scopes: string[];
    user_id: string;
    tenant_id: string;
  }>(
    `SELECT id, key_hash, scopes, user_id, tenant_id
       FROM api_keys
      WHERE key_prefix = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [prefix],
  );
  if (!row) return null;
  if (hashApiKey(rawKey) !== row.key_hash) return null;

  const user = await loadUser(row.user_id);
  if (!user) return null;

  void queryOne('UPDATE api_keys SET last_used_at = now() WHERE id = $1 RETURNING id', [row.id]);

  return {
    id: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
    displayName: user.display_name,
    status: user.status,
    scopes: row.scopes ?? [],
    via: 'api_key',
    apiKeyId: row.id,
  };
}

async function fromPersistentCookie(cookie: string): Promise<Express.AuthenticatedActor | null> {
  const userId = readPersistentSession(cookie);
  if (!userId) return null;
  const user = await loadUser(userId);
  if (!user || user.status === 'disabled') return null;
  return {
    id: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
    displayName: user.display_name,
    status: user.status,
    scopes: ['*'],
    via: 'persistent_session',
  };
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header('authorization');
    const apiKey = req.header('x-api-key');
    const cookie = req.cookies?.acmeu_ps;

    let actor: Express.AuthenticatedActor | null = null;

    if (header && header.toLowerCase().startsWith('bearer ')) {
      actor = await fromBearer(header.slice(7).trim());
    } else if (apiKey) {
      actor = await fromApiKey(apiKey.trim());
    } else if (cookie) {
      actor = await fromPersistentCookie(cookie);
    }

    if (actor) {
      req.actor = actor;
      req.tenantId = actor.tenantId;
    }
    next();
  } catch (err) {
    req.log.debug({ err }, 'credential presented but not accepted');
    next();
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.actor) {
    next(unauthorized());
    return;
  }
  next();
}
