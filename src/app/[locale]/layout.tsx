import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n/params';
import { localePath } from '@/lib/i18n/locale';
import { t } from '@/lib/i18n/messages';

export default async function PublicLayout(props: LayoutProps<'/[locale]'>) {
  const locale = await resolveLocale(props.params);
  const nav = [['/', 'nav.home'], ['/bagis', 'nav.donate'], ['/defter', 'nav.ledger'], ['/kampanyalar', 'nav.campaigns'], ['/genel-butce', 'nav.general'], ['/hayvanlar', 'nav.animals'], ['/veterinerler', 'nav.vets'], ['/yazilar', 'nav.posts'], ['/sahiplen', 'nav.adopt']] as const;
  return (
    <div className="max-w-5xl mx-auto p-4">
      <header className="flex flex-wrap gap-4 items-center border-b pb-3 mb-6">
        <Link href={localePath(locale, '/')} className="font-bold">{t(locale, 'site.name')}</Link>
        {nav.map(([p, k]) => <Link key={p} href={localePath(locale, p)}>{t(locale, k)}</Link>)}
        <span className="ml-auto text-sm">{locale === 'tr' ? <Link href="/en">EN</Link> : <Link href="/">TR</Link>}</span>
      </header>
      <main>{props.children}</main>
    </div>
  );
}
