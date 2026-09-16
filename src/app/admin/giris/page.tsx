import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/cookies';
import { ActionForm } from '@/components/admin/ActionForm';
import { loginAction } from './actions';

export default async function LoginPage() {
  if (await currentUser()) redirect('/admin');
  return (
    <main className="p-6">
      <h1 className="text-xl mb-4">Yönetim girişi</h1>
      <ActionForm action={loginAction} submitLabel="Giriş yap">
        <label>E-posta <input name="email" type="email" required className="border px-2 py-1 w-full" /></label>
        <label>Şifre <input name="password" type="password" required className="border px-2 py-1 w-full" /></label>
      </ActionForm>
    </main>
  );
}
