import { createHash } from 'node:crypto';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@/env';
import { db } from '@/db/client';
import { attachments } from '@/db/schema';
import { s3, ensureBucket } from './client';
import { sniffMime, validateUpload, type AttachmentKind } from './validate';

export type Attachment = typeof attachments.$inferSelect;

export async function storeUpload(file: File, kind: AttachmentKind, uploadedBy: string | null): Promise<Attachment> {
  const v = validateUpload(file, kind);
  if (!v.ok) throw new Error(v.error);
  const bytes = Buffer.from(await file.arrayBuffer());
  // The declared type comes from the client, so the content has to back it up before anything is stored.
  const mime = sniffMime(bytes);
  if (mime === null || mime !== file.type) throw new Error(`Bu dosya türü (${mime ?? file.type}) kabul edilmiyor.`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const key = `${kind}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${v.ext}`;
  await ensureBucket();
  await s3().send(new PutObjectCommand({ Bucket: env().S3_BUCKET, Key: key, Body: bytes, ContentType: mime }));
  const [row] = await db.insert(attachments).values({
    storageKey: key, mime, sizeBytes: bytes.length, sha256, kind, originalName: file.name, uploadedBy,
  }).returning();
  return row!;
}

export async function openObject(storageKey: string): Promise<{ body: ReadableStream; contentType: string; contentLength?: number }> {
  const res = await s3().send(new GetObjectCommand({ Bucket: env().S3_BUCKET, Key: storageKey }));
  if (!res.Body) throw new Error('Empty object body');
  return { body: res.Body.transformToWebStream(), contentType: res.ContentType ?? 'application/octet-stream', contentLength: res.ContentLength };
}
