import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { adminUsers } from '@/db/schema';
import { verifyPassword } from './password';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const IP_MAX_ATTEMPTS = 10;
const IP_WINDOW_MS = 15 * 60_000;
/** Ceiling on tracked IPs, so a caller rotating `x-forwarded-for` cannot grow the Map without bound. */
const IP_MAP_MAX = 10_000;

/** Real-looking hash, verified when the email is unknown so both branches cost the same. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

// The IP window lives in this process only; acceptable for phase 1 (single instance, single admin).
const ipAttempts = new Map<string, number[]>();

/** Drops timestamps outside the window, and the key itself once nothing is left. */
function pruneIp(ip: string, now: number): number[] {
  const recent = (ipAttempts.get(ip) ?? []).filter((at) => at > now - IP_WINDOW_MS);
  if (recent.length === 0) ipAttempts.delete(ip);
  else ipAttempts.set(ip, recent);
  return recent;
}

function sweepIpAttempts(now: number): void {
  for (const ip of [...ipAttempts.keys()]) pruneIp(ip, now);
  if (ipAttempts.size > IP_MAP_MAX) ipAttempts.clear();
}

/** Records an attempt from `ip` and reports whether it exceeds the sliding window. */
function ipRateLimited(ip: string): boolean {
  const now = Date.now();
  if (ipAttempts.size > IP_MAP_MAX) sweepIpAttempts(now);
  const recent = pruneIp(ip, now);
  if (recent.length >= IP_MAX_ATTEMPTS) return true;
  recent.push(now);
  ipAttempts.set(ip, recent);
  return false;
}

/** Test-only: how many IPs are still inside the window. Sweeps expired keys first. */
export function ipAttemptCount(): number {
  sweepIpAttempts(Date.now());
  return ipAttempts.size;
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
    // A lapsed lock opens a fresh window; otherwise increment in-statement so concurrent
    // failures cannot read-modify-write the same count.
    const failed = lockLapsed ? sql`1` : sql`${adminUsers.failedLogins} + 1`;
    // ISO string, not a Date: a raw Date bound inside a `sql` template bypasses the driver's serializer.
    const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
    await db
      .update(adminUsers)
      .set({
        failedLogins: failed,
        lockedUntil: sql`CASE WHEN ${failed} >= ${MAX_FAILURES} THEN ${lockedUntil}::timestamptz ELSE NULL END`,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, user.id));
    return { ok: false, reason: 'INVALID' };
  }

  await db
    .update(adminUsers)
    .set({ failedLogins: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(adminUsers.id, user.id));
  return { ok: true, userId: user.id };
}
