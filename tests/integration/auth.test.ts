import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { adminUsers } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { issueSession, findSessionUser, revokeSession } from '@/lib/auth/session';
import { attemptLogin, ipAttemptCount } from '@/lib/auth/login';
import { resetDb } from './helpers';

async function makeUser() {
  const [u] = await db.insert(adminUsers).values({ email: 'a@b.co', passwordHash: await hashPassword('pw123456') }).returning();
  return u!;
}

async function failedLoginsOf(id: string) {
  const [u] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
  return u!.failedLogins;
}

describe('sessions', () => {
  beforeEach(resetDb);
  it('issues, finds and revokes', async () => {
    const u = await makeUser();
    const { token } = await issueSession(u.id);
    expect((await findSessionUser(token))?.id).toBe(u.id);
    await revokeSession(token);
    expect(await findSessionUser(token)).toBeNull();
  });
  it('rejects garbage tokens', async () => expect(await findSessionUser('nope')).toBeNull());
});

// The per-IP window is process-wide module state that `resetDb` cannot clear, so every case uses its own IP.
describe('attemptLogin', () => {
  beforeEach(resetDb);
  it('succeeds with correct password', async () => {
    const u = await makeUser();
    expect(await attemptLogin('a@b.co', 'pw123456', '10.0.0.1')).toEqual({ ok: true, userId: u.id });
  });
  it('fails on wrong password and unknown email identically', async () => {
    await makeUser();
    expect(await attemptLogin('a@b.co', 'x', '10.0.0.2')).toEqual({ ok: false, reason: 'INVALID' });
    expect(await attemptLogin('nobody@b.co', 'x', '10.0.0.2')).toEqual({ ok: false, reason: 'INVALID' });
  });
  it('locks after 5 failures, even with the right password', async () => {
    await makeUser();
    for (let i = 0; i < 5; i++) await attemptLogin('a@b.co', 'bad', '10.0.0.3');
    expect(await attemptLogin('a@b.co', 'pw123456', '10.0.0.3')).toEqual({ ok: false, reason: 'LOCKED' });
  });
  it('resets the counter after success', async () => {
    await makeUser();
    await attemptLogin('a@b.co', 'bad', '10.0.0.4');
    await attemptLogin('a@b.co', 'pw123456', '10.0.0.4');
    const [u] = await db.select().from(adminUsers);
    expect(u!.failedLogins).toBe(0);
  });
  it('starts a fresh failure window once the lock has lapsed', async () => {
    const u = await makeUser();
    for (let i = 0; i < 5; i++) await attemptLogin('a@b.co', 'bad', '10.0.0.5');
    await db.update(adminUsers).set({ lockedUntil: new Date(Date.now() - 60_000) }).where(eq(adminUsers.id, u.id));
    expect(await attemptLogin('a@b.co', 'bad', '10.0.0.5')).toEqual({ ok: false, reason: 'INVALID' });
    const [after] = await db.select().from(adminUsers);
    expect(after!.failedLogins).toBe(1);
    expect(after!.lockedUntil).toBeNull();
  });
  it('rate limits an IP after 10 attempts, without touching the account', async () => {
    const u = await makeUser();
    for (let i = 0; i < 10; i++) {
      expect(await attemptLogin(`nobody${i}@b.co`, 'bad', '10.0.0.6')).toEqual({ ok: false, reason: 'INVALID' });
    }
    expect(await failedLoginsOf(u.id)).toBe(0);
    expect(await attemptLogin('a@b.co', 'bad', '10.0.0.6')).toEqual({ ok: false, reason: 'LOCKED' });
    expect(await failedLoginsOf(u.id)).toBe(0);
  });
  it('forgets an IP once its window has elapsed', async () => {
    const ip = '10.0.0.7';
    const before = ipAttemptCount();
    for (let i = 0; i < 10; i++) await attemptLogin('ghost@b.co', 'bad', ip);
    expect(ipAttemptCount()).toBe(before + 1);
    expect(await attemptLogin('ghost@b.co', 'bad', ip)).toEqual({ ok: false, reason: 'LOCKED' });

    const spy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60_000);
    try {
      expect(ipAttemptCount()).toBe(0); // every expired key is dropped, not just emptied
      expect(await attemptLogin('ghost@b.co', 'bad', ip)).toEqual({ ok: false, reason: 'INVALID' });
    } finally {
      spy.mockRestore();
    }
  });
  it('counts concurrent failures atomically', async () => {
    await makeUser();
    await Promise.all([1, 2, 3, 4, 5].map((n) => attemptLogin('a@b.co', 'bad', `10.0.1.${n}`)));
    const [after] = await db.select().from(adminUsers);
    expect(after!.failedLogins).toBe(5);
    expect(after!.lockedUntil).not.toBeNull();
    expect(await attemptLogin('a@b.co', 'pw123456', '10.0.1.9')).toEqual({ ok: false, reason: 'LOCKED' });
  });
});
