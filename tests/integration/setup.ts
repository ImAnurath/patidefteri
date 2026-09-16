import { execSync } from 'node:child_process';
import postgres from 'postgres';

/** Creates the target database when missing, so parallel worktrees can each use their own. */
async function ensureDatabase(url: string) {
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  if (!name) throw new Error('DATABASE_URL has no database name');
  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';
  const sql = postgres(maintenance.toString(), { max: 1 });
  try {
    const rows = await sql`SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (rows.length === 0) await sql.unsafe(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
  } finally {
    await sql.end();
  }
}

export default async function setup() {
  try { process.loadEnvFile('.env'); } catch { /* CI env */ }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required for integration tests');
  await ensureDatabase(process.env.DATABASE_URL);
  execSync('npx tsx src/db/migrate.ts', { stdio: 'inherit', env: process.env });
}
