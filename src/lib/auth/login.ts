import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { adminUsers } from '@/db/schema';
import { verifyPassword } from './password';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const IP_MAX_ATTEMPTS = 10;
const IP_WINDOW_MS = LOCK_MINUTES * 60_000;

/** Real-looking hash, verified when the email is unknown so both branches cost the same. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

// The IP window lives in this process only; acceptable for phase 1 (single instance, single admin).
const ipAttempts = new Map<string, number[]>();

/** Records an attempt from `ip` and reports whether it exceeds the sliding window. */
function ipRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ipAttempts.get(ip) ?? []).filter((at) => at > now - IP_WINDOW_MS);
  const limited = recent.length >= IP_MAX_ATTEMPTS;
  if (!limited) recent.push(now);
  ipAttempts.set(ip, recent);
  return limited;
}

export type LoginResult = { ok: true; userId: string } | { ok: false; reason: 'INVALID' | 'LOCKED' };

export async function attemptLogin(email: string, password: string, ip: string): Promise<LoginResult> {
  if (ipRateLimited(ip)) return { ok: false, reason: 'LOCKED' };

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.trim().toLowerCase()))
    .limit(1);

  if (!user || !user.active) {
    await verifyPassword(DUMMY_HASH, password);
    return { ok: false, reason: 'INVALID' };
  }
  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) return { ok: false, reason: 'LOCKED' };
  const lockLapsed = user.lockedUntil !== null;

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    // A lapsed lock opens a fresh window instead of re-locking on the next failure.
    const failed = lockLapsed ? 1 : user.failedLogins + 1;
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
