import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { posts } from '@/db/schema';
export type PostRow = typeof posts.$inferSelect;

export const listPosts = (opts: { includeDrafts?: boolean; animalId?: string; campaignId?: string } = {}) => {
  const conds = [];
  if (!opts.includeDrafts) conds.push(isNotNull(posts.publishedAt));
  if (opts.animalId) conds.push(eq(posts.animalId, opts.animalId));
  if (opts.campaignId) conds.push(eq(posts.campaignId, opts.campaignId));
  return db.select().from(posts).where(conds.length ? and(...conds) : undefined).orderBy(desc(posts.publishedAt), desc(posts.createdAt));
};
export async function getPostBySlug(slug: string): Promise<PostRow | null> {
  const [p] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  return p ?? null;
}
export async function getPostById(id: string): Promise<PostRow | null> {
  const [p] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return p ?? null;
}
