import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { adminUsers } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { issueSession, findSessionUser, revokeSession } from '@/lib/auth/session';
import { attemptLogin } from '@/lib/auth/login';
import { resetDb } from './helpers';

async function makeUser() {
  const [u] = await db.insert(adminUsers).values({ email: 'a@b.co', passwordHash: await hashPassword('pw123456') }).returning();
  return u!;
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

describe('attemptLogin', () => {
  beforeEach(resetDb);
  it('succeeds with correct password', async () => {
    const u = await makeUser();
    expect(await attemptLogin('a@b.co', 'pw123456')).toEqual({ ok: true, userId: u.id });
  });
  it('fails on wrong password and unknown email identically', async () => {
    await makeUser();
    expect(await attemptLogin('a@b.co', 'x')).toEqual({ ok: false, reason: 'INVALID' });
    expect(await attemptLogin('nobody@b.co', 'x')).toEqual({ ok: false, reason: 'INVALID' });
  });
  it('locks after 5 failures, even with the right password', async () => {
    await makeUser();
    for (let i = 0; i < 5; i++) await attemptLogin('a@b.co', 'bad');
    expect(await attemptLogin('a@b.co', 'pw123456')).toEqual({ ok: false, reason: 'LOCKED' });
  });
  it('resets the counter after success', async () => {
    await makeUser();
    await attemptLogin('a@b.co', 'bad');
    await attemptLogin('a@b.co', 'pw123456');
    const [u] = await db.select().from(adminUsers);
    expect(u!.failedLogins).toBe(0);
  });
});
