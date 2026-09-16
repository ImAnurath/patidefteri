import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { adminUsers, attachments, campaigns } from '@/db/schema';

/** drizzle-orm 0.45 wraps driver errors in a DrizzleQueryError; the Postgres error lives in `.cause`. */
export function rethrowCause(e: unknown): never {
  throw e instanceof Error && e.cause instanceof Error ? e.cause : e;
}

/** Wipes every table that tests write to. */
export async function resetDb() {
  await db.execute(sql`TRUNCATE allocations, transactions, vet_quotes, vet_partners, campaign_periods, campaigns,
    adoption_listings, animal_photos, animals, posts, attachments, audit_log, sessions, admin_users RESTART IDENTITY CASCADE`);
}

export async function seedAdmin() {
  const [u] = await db.insert(adminUsers).values({ email: 'test@example.com', passwordHash: 'x' }).returning();
  return u!;
}

export async function seedGeneral() {
  const [c] = await db.insert(campaigns).values({
    slug: 'genel', kind: 'general', title: { tr: 'Genel' }, description: { tr: 'Genel bütçe' }, status: 'active',
  }).returning();
  return c!;
}

export async function seedAttachment(kind: 'receipt' | 'invoice' | 'photo' | 'document' = 'receipt') {
  const [a] = await db.insert(attachments).values({
    storageKey: `test/${crypto.randomUUID()}.pdf`, mime: 'application/pdf', sizeBytes: 10, sha256: 'abc', kind,
  }).returning();
  return a!;
}
