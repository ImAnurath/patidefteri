import { redirect } from 'next/navigation';
import { currentUser } from './cookies';
import type { AdminUser } from './session';

export async function requireAdmin(): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) redirect('/admin/giris');
  return user;
}
