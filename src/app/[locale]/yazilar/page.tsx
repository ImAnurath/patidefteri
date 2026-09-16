import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n/params';
import { localePath } from '@/lib/i18n/locale';
import { pickLocalized } from '@/lib/i18n/localized';
import { t } from '@/lib/i18n/messages';
import { listPosts } from '@/db/queries/posts';

export default async function Posts(props: PageProps<'/[locale]/yazilar'>) {
  const locale = await resolveLocale(props.params);
  const rows = await listPosts();
  return (
    <div>
      <h1 className="text-lg mb-4">{t(locale, 'posts.title')}</h1>
      <ul className="flex flex-col gap-2">{rows.map((p) => <li key={p.id}><Link href={localePath(locale, `/yazilar/${p.slug}`)} className="underline">{pickLocalized(p.title, locale)}</Link> <span className="text-sm">{p.publishedAt?.toISOString().slice(0, 10)}</span></li>)}</ul>
    </div>
  );
}
