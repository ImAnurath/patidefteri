'use server';
import { redirect } from 'next/navigation';
import { logoutCookie } from '@/lib/auth/cookies';

export async function logoutAction(): Promise<void> {
  await logoutCookie();
  redirect('/admin/giris');
}
