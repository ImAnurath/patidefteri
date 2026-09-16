import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { adminUsers } from '@/db/schema';
import { verifyPassword } from './password';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

/** Real-looking hash, verified when the email is unknown so both branches cost the same. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export type LoginResult = { ok: true; userId: string } | { ok: false; reason: 'INVALID' | 'LOCKED' };

export async function attemptLogin(email: string, password: string): Promise<LoginResult> {
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.trim().toLowerCase()))
    .limit(1);

  if (!user || !user.active) {
    await verifyPassword(DUMMY_HASH, password);
    return { ok: false, reason: 'INVALID' };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { ok: false, reason: 'LOCKED' };

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const failed = user.failedLogins + 1;
    const lockedUntil = failed >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    await db
      .update(adminUsers)
      .set({ failedLogins: failed, lockedUntil, updatedAt: new Date() })
      .where(eq(adminUsers.id, user.id));
    return { ok: false, reason: 'INVALID' };
  }

  await db
    .update(adminUsers)
    .set({ failedLogins: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(adminUsers.id, user.id));
  return { ok: true, userId: user.id };
}
