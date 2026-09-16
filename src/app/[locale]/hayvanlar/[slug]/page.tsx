import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n/params';
import { localePath } from '@/lib/i18n/locale';
import { pickLocalized } from '@/lib/i18n/localized';
import { t } from '@/lib/i18n/messages';
import { renderMarkdown } from '@/lib/markdown';
import { getAnimalBySlug } from '@/db/queries/animals';
import { listCampaigns } from '@/db/queries/campaigns';
import { listPosts } from '@/db/queries/posts';

export default async function Animal(props: PageProps<'/[locale]/hayvanlar/[slug]'>) {
  const locale = await resolveLocale(props.params);
  const { slug } = await props.params;
  const data = await getAnimalBySlug(slug);
  if (!data) notFound();
  const { animal, photos } = data;
  const campaigns = (await listCampaigns()).filter((c) => c.animalId === animal.id && c.status !== 'draft');
  const posts = await listPosts({ animalId: animal.id });
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-xl">{animal.name} <span className="text-sm border px-1">{t(locale, `animal.status.${animal.status}`)}</span></h1>
      <div className="flex gap-2 flex-wrap">{photos.map((p) => <img key={p.id} src={`/dosya/${p.attachmentId}`} alt="" className="h-40 border" />)}</div>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(pickLocalized(animal.bio, locale)) }} />
      {animal.location && <p className="text-sm">{animal.location}</p>}
      {campaigns.length > 0 && <ul>{campaigns.map((c) => <li key={c.id}><Link href={localePath(locale, `/kampanyalar/${c.slug}`)} className="underline">{pickLocalized(c.title, locale)}</Link></li>)}</ul>}
      {posts.length > 0 && <ul>{posts.map((p) => <li key={p.id}><Link href={localePath(locale, `/yazilar/${p.slug}`)} className="underline">{pickLocalized(p.title, locale)}</Link></li>)}</ul>}
    </article>
  );
}
