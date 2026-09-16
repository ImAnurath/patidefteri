import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n/params';
import { localePath } from '@/lib/i18n/locale';
import { pickLocalized } from '@/lib/i18n/localized';
import { t } from '@/lib/i18n/messages';
import { formatKurus } from '@/lib/money';
import { listCampaigns } from '@/db/queries/campaigns';
import { getCampaignSummary, getGeneralBalance } from '@/db/queries/summaries';
import { listLedgerTransactions } from '@/db/queries/ledger';
import { ProgressBar } from '@/components/public/ProgressBar';
import { LedgerTable } from '@/components/public/LedgerTable';

export default async function Home(props: PageProps<'/[locale]'>) {
  const locale = await resolveLocale(props.params);
  const [balance, active, ledger] = await Promise.all([getGeneralBalance(), listCampaigns({ statuses: ['active', 'funded'], kinds: ['one_off', 'recurring'] }), listLedgerTransactions()]);
  const cards = await Promise.all(active.map(async (c) => ({ c, s: await getCampaignSummary(c) })));
  return (
    <div className="flex flex-col gap-8">
      <section><h1 className="text-lg">{t(locale, 'home.generalBalance')}</h1><p className="text-3xl">{formatKurus(balance, locale)}</p></section>
      <section>
        <h2 className="text-lg">{t(locale, 'home.activeCampaigns')}</h2>
        <ul className="grid gap-4 md:grid-cols-2">{cards.map(({ c, s }) => {
          const last = s.kind === 'recurring' ? s.periods.at(-1) : undefined;
          const ratio = s.kind === 'one_off' ? s.summary.progress : s.kind === 'recurring' ? (last?.summary.progress ?? 0) : null;
          const label = s.kind === 'one_off'
            ? `${formatKurus(s.summary.raised, locale)} / ${c.targetKurus ? formatKurus(c.targetKurus, locale) : '—'}`
            : last ? `${last.period.periodStart.slice(0, 7)}: ${formatKurus(last.summary.collected + last.summary.carriedIn, locale)} / ${formatKurus(last.period.targetKurus, locale)}` : '';
          return <li key={c.id} className="border p-3"><Link href={localePath(locale, `/kampanyalar/${c.slug}`)} className="font-bold underline">{pickLocalized(c.title, locale)}</Link><ProgressBar ratio={ratio} label={label} /></li>;
        })}</ul>
      </section>
      <section><h2 className="text-lg">{t(locale, 'home.recentLedger')}</h2><LedgerTable rows={ledger.slice(0, 10)} locale={locale} /></section>
    </div>
  );
}
