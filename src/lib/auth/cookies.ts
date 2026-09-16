import { cookies } from 'next/headers';
import { findSessionUser, issueSession, revokeSession, type AdminUser } from './session';

export const SESSION_COOKIE = 'pd_session';

export async function loginCookie(userId: string): Promise<void> {
  const { token, expiresAt } = await issueSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function currentUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? findSessionUser(token) : null;
}

export async function logoutCookie(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  store.delete(SESSION_COOKIE);
}
