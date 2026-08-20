#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const connectionString =
  process.env.DATABASE_URL || 'postgres://acmeu:acmeu@localhost:5432/acmeu';

async function sqlFiles(dir) {
  const entries = await readdir(dir);
  return entries.filter((f) => f.endsWith('.sql')).sort();
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function up(client) {
  await ensureMigrationsTable(client);
  const dir = path.join(root, 'db', 'migrations');
  const files = await sqlFiles(dir);
  const { rows } = await client.query('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.version));

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) {
      console.log(`  = ${version} (already applied)`);
      continue;
    }
    const sql = await readFile(path.join(dir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
        [version],
      );
      await client.query('COMMIT');
      console.log(`  + ${version}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ! ${version} failed: ${err.message}`);
      throw err;
    }
  }
}

async function seed(client) {
  const dir = path.join(root, 'db', 'seeds');
  const files = await sqlFiles(dir);
  for (const file of files) {
    const sql = await readFile(path.join(dir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`  + seed ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ! seed ${file} failed: ${err.message}`);
      throw err;
    }
  }
}

async function reset(client) {
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  console.log('  ~ schema dropped');
  await up(client);
  await seed(client);
}

const commands = { up, seed, reset };

async function main() {
  const cmd = process.argv[2] || 'up';
  const run = commands[cmd];
  if (!run) {
    console.error(`unknown command: ${cmd}. expected one of ${Object.keys(commands).join(', ')}`);
    process.exit(1);
  }
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log(`acmeu migrate: ${cmd}`);
  try {
    await run(client);
    console.log('done');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
