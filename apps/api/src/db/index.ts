import { Pool, types } from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../lib/logger';

types.setTypeParser(20, (v) => Number.parseInt(v, 10));
types.setTypeParser(1700, (v) => Number.parseFloat(v));

export const pool = new Pool({
  connectionString: config.database.url,
  max: config.database.poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: config.database.statementTimeoutMs,
});

pool.on('error', (err) => {
  logger.error({ err }, 'postgres pool error');
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const started = Date.now();
  const res = await pool.query<T>(text, params as any[]);
  const elapsed = Date.now() - started;
  if (elapsed > 500) {
    logger.warn({ elapsed, rows: res.rowCount }, 'slow query');
  }
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length ? rows[0] : null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function healthcheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
