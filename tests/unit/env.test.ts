import { describe, it, expect } from 'vitest';
import { envSchema } from '@/env';

describe('envSchema', () => {
  it('accepts a complete environment', () => {
    const r = envSchema.safeParse({
      DATABASE_URL: 'postgres://u:p@localhost:5432/db',
      S3_ENDPOINT: 'http://localhost:9000', S3_REGION: 'us-east-1', S3_BUCKET: 'b',
      S3_ACCESS_KEY: 'a', S3_SECRET_KEY: 's', SESSION_SECRET: 'x'.repeat(32),
      ADMIN_EMAIL: 'a@b.co', ADMIN_PASSWORD: 'pw', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
      DONATION_IBAN: 'TR00', DONATION_ACCOUNT_NAME: 'X',
    });
    expect(r.success).toBe(true);
  });
  it('rejects a short SESSION_SECRET', () => {
    const r = envSchema.safeParse({ SESSION_SECRET: 'short' });
    expect(r.success).toBe(false);
  });
});
