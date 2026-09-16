import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n/params';
import { localePath } from '@/lib/i18n/locale';
import { t } from '@/lib/i18n/messages';
import { listAdoptable } from '@/db/queries/animals';

export default async function Adopt(props: PageProps<'/[locale]/sahiplen'>) {
  const locale = await resolveLocale(props.params);
  const rows = await listAdoptable();
  return (
    <div>
      <h1 className="text-lg mb-4">{t(locale, 'adopt.title')}</h1>
      {rows.length === 0 ? <p>{t(locale, 'adopt.empty')}</p> : (
        <ul className="grid gap-3 md:grid-cols-3">{rows.map(({ animal, listing }) => (
          <li key={animal.id} className="border p-2">
            {animal.coverAttachmentId && <img src={`/dosya/${animal.coverAttachmentId}`} alt={animal.name} className="w-full h-40 object-cover" />}
            <Link href={localePath(locale, `/hayvanlar/${animal.slug}`)} className="underline font-bold">{animal.name}</Link>
            <p className="text-sm">{listing.contact}</p>
          </li>))}</ul>
      )}
    </div>
  );
}
