'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { ActionState } from '@/lib/action-state';
import { attemptLogin } from '@/lib/auth/login';
import { loginCookie } from '@/lib/auth/cookies';

const schema = z.object({ email: z.email(), password: z.string().min(1) });

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: 'E-posta ve şifre gerekli.' };
  const result = await attemptLogin(parsed.data.email, parsed.data.password);
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
