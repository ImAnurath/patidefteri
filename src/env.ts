import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  DONATION_IBAN: z.string().min(1),
  DONATION_ACCOUNT_NAME: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;
export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Invalid environment: ' + JSON.stringify(z.treeifyError(parsed.error)));
  }
  cached = parsed.data;
  return cached;
}
