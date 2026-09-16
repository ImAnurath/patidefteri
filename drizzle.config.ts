import { defineConfig } from 'drizzle-kit';
try { process.loadEnvFile('.env'); } catch { /* CI provides env */ }

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
