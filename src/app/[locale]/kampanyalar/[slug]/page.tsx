import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n/params';
import { localePath } from '@/lib/i18n/locale';
import { pickLocalized } from '@/lib/i18n/localized';
import { t } from '@/lib/i18n/messages';
import { formatKurus } from '@/lib/money';
import { renderMarkdown } from '@/lib/markdown';
import { getCampaignBySlug } from '@/db/queries/campaigns';
import { getCampaignSummary } from '@/db/queries/summaries';
import { getCampaignHistory } from '@/db/queries/ledger';
import { listQuotesForCampaign } from '@/db/queries/vets';
import { listPosts } from '@/db/queries/posts';
import { ProgressBar } from '@/components/public/ProgressBar';
import { HistoryList } from './HistoryList';

export default async function Campaign(props: PageProps<'/[locale]/kampanyalar/[slug]'>) {
  const locale = await resolveLocale(props.params);
  const { slug } = await props.params;
  const c = await getCampaignBySlug(slug);
  if (!c || c.status === 'draft') notFound();
  // Every General-allocated ledger row links here, but this page has no section for a general
  // budget; /genel-butce is the page that renders its figures.
  if (c.kind === 'general') redirect(localePath(locale, '/genel-butce'));
  const sp = await props.searchParams;
  const [s, quotes, posts] = await Promise.all([getCampaignSummary(c), listQuotesForCampaign(c.id), listPosts({ campaignId: c.id })]);
  const accepted = quotes.find((q) => q.quote.status === 'accepted');
  const wantedPeriod = typeof sp.donem === 'string' ? sp.donem : undefined;
  const current = s.kind === 'recurring' ? (s.periods.find((p) => p.period.periodStart.slice(0, 7) === wantedPeriod) ?? s.periods.at(-1)) : undefined;
  const history = s.kind === 'one_off' ? await getCampaignHistory(c.id) : current ? await getCampaignHistory(c.id, current.period.id) : [];
  return (
    <article className="flex flex-col gap-6">
      <h1 className="text-xl">{pickLocalized(c.title, locale)} <span className="text-sm border px-1">{t(locale, c.status === 'completed' ? 'campaign.completed' : c.status === 'funded' ? 'campaign.funded' : c.status === 'cancelled' ? 'campaign.cancelled' : 'campaign.active')}</span></h1>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(pickLocalized(c.description, locale)) }} />

      {s.kind === 'one_off' && (
        <section className="flex flex-col gap-2">
          <ProgressBar ratio={s.summary.progress} label={`${formatKurus(s.summary.raised, locale)} / ${c.targetKurus ? formatKurus(c.targetKurus, locale) : '—'}`} />
          <dl className="grid grid-cols-2 gap-1 text-sm max-w-md">
            <dt>{t(locale, 'campaign.raised')}</dt><dd data-testid="raised">{formatKurus(s.summary.raised, locale)}</dd>
            {s.summary.fromGeneral > 0 && <><dt>{t(locale, 'campaign.fromGeneral')}</dt><dd>{formatKurus(s.summary.fromGeneral, locale)}</dd></>}
            <dt>{t(locale, 'campaign.spent')}</dt><dd>{formatKurus(s.summary.spent, locale)}</dd>
            {s.summary.movedOut > 0 && <><dt>{t(locale, 'campaign.movedToGeneral')}</dt><dd>{formatKurus(s.summary.movedOut, locale)}</dd></>}
            <dt>{t(locale, 'campaign.balance')}</dt><dd>{formatKurus(s.summary.balance, locale)}</dd>
          </dl>
          {c.status !== 'completed' && s.summary.surplus > 0 && <p>{t(locale, 'campaign.surplus')}: {formatKurus(s.summary.surplus, locale)}</p>}
          {c.status === 'completed' && c.closingNote && <p className="border p-2">{pickLocalized(c.closingNote, locale)}</p>}
          {accepted && <p>{t(locale, 'campaign.acceptedQuote')}: {accepted.vet.clinicName} — {pickLocalized(accepted.quote.service, locale)} — {formatKurus(accepted.quote.amountKurus, locale)}</p>}
          <h2 className="font-bold mt-2">{t(locale, 'campaign.history')}</h2>
          <HistoryList rows={history} locale={locale} />
        </section>
      )}

      {s.kind === 'recurring' && (
        <section className="flex flex-col gap-2">
          <nav className="flex gap-2 text-sm">{s.periods.map((p) => <Link key={p.period.id} href={`?donem=${p.period.periodStart.slice(0, 7)}`} className={p === current ? 'font-bold underline' : 'underline'}>{p.period.periodStart.slice(0, 7)}</Link>)}</nav>
          {current && (<>
            <ProgressBar ratio={current.summary.progress} label={`${formatKurus(current.summary.collected + current.summary.carriedIn, locale)} / ${formatKurus(current.period.targetKurus, locale)}`} />
            <dl className="grid grid-cols-2 gap-1 text-sm max-w-md">
              <dt>{t(locale, 'campaign.collected')}</dt><dd>{formatKurus(current.summary.collected, locale)}</dd>
              {current.summary.carriedIn > 0 && <><dt>{t(locale, 'campaign.carriedIn')}</dt><dd>{formatKurus(current.summary.carriedIn, locale)}</dd></>}
              <dt>{t(locale, 'campaign.spent')}</dt><dd>{formatKurus(current.summary.spent, locale)}</dd>
            </dl>
            {current.period.closedAt && current.summary.carriedOut > 0 && <p>{t(locale, 'campaign.periodCovered')}: {formatKurus(current.summary.carriedOut, locale)}</p>}
            <h2 className="font-bold mt-2">{t(locale, 'campaign.history')}</h2>
            <HistoryList rows={history} locale={locale} />
          </>)}
        </section>
      )}

      {posts.length > 0 && <section><h2 className="font-bold">{t(locale, 'nav.posts')}</h2><ul>{posts.map((p) => <li key={p.id}><Link href={localePath(locale, `/yazilar/${p.slug}`)} className="underline">{pickLocalized(p.title, locale)}</Link></li>)}</ul></section>}
    </article>
  );
}
