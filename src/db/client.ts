import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pdSql?: ReturnType<typeof postgres> };
const sql = globalForDb.pdSql ?? postgres(env().DATABASE_URL, { max: 5, prepare: false });
if (process.env.NODE_ENV !== 'production') globalForDb.pdSql = sql;

export const db = drizzle(sql, { schema, casing: 'snake_case' });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
