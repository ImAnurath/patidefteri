import { notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n/params';
import { pickLocalized } from '@/lib/i18n/localized';
import { renderMarkdown } from '@/lib/markdown';
import { getPostBySlug } from '@/db/queries/posts';

export default async function Post(props: PageProps<'/[locale]/yazilar/[slug]'>) {
  const locale = await resolveLocale(props.params);
  const { slug } = await props.params;
  const p = await getPostBySlug(slug);
  if (!p || !p.publishedAt) notFound();
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-xl">{pickLocalized(p.title, locale)}</h1>
      <p className="text-sm">{p.publishedAt.toISOString().slice(0, 10)}</p>
      {p.coverAttachmentId && <img src={`/dosya/${p.coverAttachmentId}`} alt="" className="max-h-96 object-cover" />}
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(pickLocalized(p.body, locale)) }} />
    </article>
  );
}
