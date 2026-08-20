import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config';

const root = config.storage.root;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(root);

export function buildStorageKey(tenantId: string, filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  return path.posix.join(tenantId, stamp, `${crypto.randomUUID()}${ext}`);
}

export async function writeObject(key: string, data: Buffer): Promise<void> {
  const target = path.join(root, key);
  ensureDir(path.dirname(target));
  await fsp.writeFile(target, data);
}

export async function readObject(key: string): Promise<Buffer> {
  return fsp.readFile(path.join(root, key));
}

export function objectStream(key: string): fs.ReadStream {
  return fs.createReadStream(path.join(root, key));
}

export async function statObject(key: string): Promise<fs.Stats> {
  return fsp.stat(path.join(root, key));
}

export async function removeObject(key: string): Promise<void> {
  await fsp.rm(path.join(root, key), { force: true });
}

export function publicUrl(key: string): string {
  return `${config.storage.publicPrefix}/${key}`;
}

export function checksum(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
