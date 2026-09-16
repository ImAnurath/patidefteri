import { resolveLocale } from '@/lib/i18n/params';
import { t } from '@/lib/i18n/messages';
import { formatKurus } from '@/lib/money';
import { getGeneralCampaign } from '@/db/queries/campaigns';
import { getCampaignSummary } from '@/db/queries/summaries';
import { getCampaignHistory } from '@/db/queries/ledger';
import { HistoryList } from '../kampanyalar/[slug]/HistoryList';

export default async function General(props: PageProps<'/[locale]/genel-butce'>) {
  const locale = await resolveLocale(props.params);
  const g = await getGeneralCampaign();
  const s = await getCampaignSummary(g);
  const history = await getCampaignHistory(g.id);
  if (s.kind !== 'general') return null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg">{t(locale, 'general.title')}</h1>
      <p className="text-3xl">{formatKurus(s.summary.balance, locale)}</p>
      <p>{t(locale, 'general.inflow')}: {formatKurus(s.summary.inflow, locale)} · {t(locale, 'general.outflow')}: {formatKurus(s.summary.outflow, locale)}</p>
      <HistoryList rows={history} locale={locale} />
    </div>
  );
}
