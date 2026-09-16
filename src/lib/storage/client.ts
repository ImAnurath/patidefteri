import { S3Client, HeadBucketCommand, CreateBucketCommand, BucketAlreadyOwnedByYou, BucketAlreadyExists } from '@aws-sdk/client-s3';
import { env } from '@/env';

let client: S3Client | null = null;
export function s3(): S3Client {
  if (client) return client;
  const e = env();
  client = new S3Client({
    endpoint: e.S3_ENDPOINT, region: e.S3_REGION, forcePathStyle: true,
    credentials: { accessKeyId: e.S3_ACCESS_KEY, secretAccessKey: e.S3_SECRET_KEY },
  });
  return client;
}

let ensured: Promise<void> | null = null;

/** Creates the bucket when missing. Runs once per process; concurrent creations are tolerated. */
export function ensureBucket(): Promise<void> {
  ensured ??= createBucket().catch((err: unknown) => { ensured = null; throw err; });
  return ensured;
}

async function createBucket(): Promise<void> {
  const Bucket = env().S3_BUCKET;
  try { await s3().send(new HeadBucketCommand({ Bucket })); return; }
  catch { /* missing bucket: create it below */ }
  try { await s3().send(new CreateBucketCommand({ Bucket })); }
  catch (err) {
    if (!(err instanceof BucketAlreadyOwnedByYou || err instanceof BucketAlreadyExists)) throw err;
  }
}
