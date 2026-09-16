import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(sql, { casing: 'snake_case' }), { migrationsFolder: './drizzle' });
  await sql.end();
  console.log('migrations applied');
}
main().catch((e) => { console.error(e); process.exit(1); });
