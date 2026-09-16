import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { logoutAction } from './actions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const links: [string, string][] = [
    ['/admin', 'Özet'], ['/admin/islemler', 'İşlemler'], ['/admin/kampanyalar', 'Kampanyalar'], ['/admin/aktarimlar', 'Aktarımlar'],
    ['/admin/hayvanlar', 'Hayvanlar'], ['/admin/veterinerler', 'Veterinerler'], ['/admin/yazilar', 'Yazılar'], ['/admin/denetim', 'Denetim'],
  ];
  return (
    <div className="min-h-screen">
      <nav className="flex flex-wrap gap-4 items-center border-b p-3">
        {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        <span className="ml-auto text-sm">{user.email}</span>
        <form action={logoutAction}><button type="submit" className="border px-2">Çıkış</button></form>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
