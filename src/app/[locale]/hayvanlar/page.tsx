import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n/params';
import { localePath } from '@/lib/i18n/locale';
import { t } from '@/lib/i18n/messages';
import { listAnimals } from '@/db/queries/animals';

export default async function Animals(props: PageProps<'/[locale]/hayvanlar'>) {
  const locale = await resolveLocale(props.params);
  const rows = await listAnimals();
  return (
    <div>
      <h1 className="text-lg mb-4">{t(locale, 'nav.animals')}</h1>
      <ul className="grid gap-3 md:grid-cols-3">{rows.map((a) => (
        <li key={a.id} className="border p-2">
          {a.coverAttachmentId && <img src={`/dosya/${a.coverAttachmentId}`} alt={a.name} className="w-full h-40 object-cover" />}
          <Link href={localePath(locale, `/hayvanlar/${a.slug}`)} className="underline font-bold">{a.name}</Link> — {t(locale, `animal.status.${a.status}`)}
        </li>))}</ul>
    </div>
  );
}
