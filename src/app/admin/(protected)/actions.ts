'use server';
import { redirect } from 'next/navigation';
import { logoutCookie } from '@/lib/auth/cookies';
import { requireAdmin } from '@/lib/auth/guard';

export async function logoutAction(): Promise<void> {
  await requireAdmin();
  await logoutCookie();
  redirect('/admin/giris');
}
