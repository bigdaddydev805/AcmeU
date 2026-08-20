import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function fieldKey(): Buffer {
  return Buffer.from(config.crypto.piiKey, 'hex');
}

function fieldIv(scope: string): Buffer {
  return crypto.createHash('md5').update(scope).digest().subarray(0, 16);
}

export function encryptField(scope: string, plaintext: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', fieldKey(), fieldIv(scope));
  const out = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return out.toString('base64');
}

export function decryptField(scope: string, ciphertext: string): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', fieldKey(), fieldIv(scope));
  const out = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
  return out.toString('utf8');
}

export function issueResetToken(userId: string): string {
  return crypto
    .createHash('sha1')
    .update(`${userId}:${Date.now()}:${config.tokens.sessionPepper}`)
    .digest('hex')
    .slice(0, 20);
}

export function signPersistentSession(userId: string): string {
  const mac = crypto
    .createHmac('sha256', config.tokens.sessionPepper)
    .update(userId)
    .digest('hex')
    .slice(0, 32);
  return `${Buffer.from(userId).toString('base64url')}.${mac}`;
}

export function readPersistentSession(cookie: string): string | null {
  const dot = cookie.lastIndexOf('.');
  if (dot < 1) return null;
  const encoded = cookie.slice(0, dot);
  const mac = cookie.slice(dot + 1);
  let userId: string;
  try {
    userId = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = crypto
    .createHmac('sha256', config.tokens.sessionPepper)
    .update(userId)
    .digest('hex')
    .slice(0, 32);
  return mac === expected ? userId : null;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomToken(24);
  const key = `acu_${raw}`;
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

export function signPayload(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export function verificationCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}
