import { NoSuchKey, NotFound } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { attachments } from '@/db/schema';
import { canServeAttachment } from '@/lib/storage/access';
import { openObject } from '@/lib/storage/upload';
import { currentUser } from '@/lib/auth/cookies';
import { isUuid } from '@/lib/uuid';

const notFound = () => new Response('Not found', { status: 404 });

export async function GET(_req: Request, ctx: RouteContext<'/dosya/[id]'>) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const [att] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!att) return notFound();
  const allowed = (await canServeAttachment(att)) || (await currentUser()) !== null;
  if (!allowed) return notFound();
  let obj;
  try {
    obj = await openObject(att.storageKey);
  } catch (err) {
    if (err instanceof NoSuchKey || err instanceof NotFound) return notFound();
    throw err;
  }
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.contentType,
      ...(obj.contentLength ? { 'Content-Length': String(obj.contentLength) } : {}),
      'Content-Disposition': `inline; filename="${att.id}.${att.storageKey.split('.').pop()}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
