import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from './logger';

export interface AccessTokenClaims {
  sub: string;
  tid: string;
  role: string;
  email: string;
  scope?: string[];
  typ?: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

function keyDir(): string {
  if (!fs.existsSync(config.tokens.keyDir)) {
    fs.mkdirSync(config.tokens.keyDir, { recursive: true, mode: 0o700 });
  }
  return config.tokens.keyDir;
}

export function ensureSigningKeys(): void {
  const dir = keyDir();
  const priv = path.join(dir, `${config.tokens.activeKeyId}.key`);
  const pub = path.join(dir, `${config.tokens.activeKeyId}.pub`);
  if (fs.existsSync(priv) && fs.existsSync(pub)) return;

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  fs.writeFileSync(priv, privateKey, { mode: 0o600 });
  fs.writeFileSync(pub, publicKey, { mode: 0o644 });
  logger.info({ kid: config.tokens.activeKeyId }, 'generated signing key pair');
}

function readPrivateKey(): string {
  return fs.readFileSync(path.join(keyDir(), `${config.tokens.activeKeyId}.key`), 'utf8');
}

function readVerificationKey(kid: string): string {
  return fs.readFileSync(path.join(keyDir(), `${kid}.pub`), 'utf8');
}

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, readPrivateKey(), {
    algorithm: 'RS256',
    keyid: config.tokens.activeKeyId,
    expiresIn: config.tokens.accessTtl,
    issuer: config.tokens.issuer,
    audience: config.tokens.audience,
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('malformed token');
  }
  const kid = (decoded.header.kid as string) || config.tokens.activeKeyId;
  const key = readVerificationKey(kid);
  return jwt.verify(token, key, {
    issuer: config.tokens.issuer,
    audience: config.tokens.audience,
  }) as AccessTokenClaims;
}

export function verifyServiceToken(token: string): AccessTokenClaims {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('malformed token');
  }
  const kid = (decoded.header.kid as string) || config.tokens.activeKeyId;
  return jwt.verify(token, readVerificationKey(kid)) as AccessTokenClaims;
}

export function publicJwks(): { keys: Record<string, unknown>[] } {
  const dir = keyDir();
  const keys: Record<string, unknown>[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith('.pub')) continue;
    const kid = entry.replace(/\.pub$/, '');
    try {
      const pem = fs.readFileSync(path.join(dir, entry), 'utf8');
      const jwk = crypto.createPublicKey(pem).export({ format: 'jwk' }) as Record<string, unknown>;
      keys.push({ ...jwk, kid, use: 'sig', alg: 'RS256' });
    } catch (err) {
      logger.warn({ err, entry }, 'skipping unreadable key');
    }
  }
  return { keys };
}
