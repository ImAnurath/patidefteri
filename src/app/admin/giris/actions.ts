'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { ActionState } from '@/lib/action-state';
import { attemptLogin } from '@/lib/auth/login';
import { loginCookie } from '@/lib/auth/cookies';

const schema = z.object({ email: z.email(), password: z.string().min(1) });

/** The last `x-forwarded-for` hop is the one the nearest proxy appended; earlier values are caller-supplied. */
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',').at(-1)?.trim() || h.get('x-real-ip') || 'unknown';
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: 'E-posta ve şifre gerekli.' };
  const result = await attemptLogin(parsed.data.email, parsed.data.password, await clientIp());
  if (!result.ok) {
    return {
      error:
        result.reason === 'LOCKED'
          ? 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.'
          : 'E-posta veya şifre hatalı.',
    };
  }
  await loginCookie(result.userId);
  redirect('/admin');
}
