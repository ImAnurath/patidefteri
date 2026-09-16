import { resolveLocale } from '@/lib/i18n/params';
import { t } from '@/lib/i18n/messages';
import { pickLocalized } from '@/lib/i18n/localized';
import { listLedgerTransactions } from '@/db/queries/ledger';
import { listCampaigns } from '@/db/queries/campaigns';
import { LedgerTable } from '@/components/public/LedgerTable';

export default async function Ledger(props: PageProps<'/[locale]/defter'>) {
  const locale = await resolveLocale(props.params);
  const sp = await props.searchParams;
  const campaignSlug = typeof sp.kampanya === 'string' ? sp.kampanya : undefined;
  const month = typeof sp.ay === 'string' && /^\d{4}-\d{2}$/.test(sp.ay) ? sp.ay : undefined;
  // Draft campaigns are not public, so they must not show up in the filter.
  const campaigns = (await listCampaigns()).filter((c) => c.status !== 'draft');
  const campaignId = campaigns.find((c) => c.slug === campaignSlug)?.id;
  const rows = await listLedgerTransactions({ campaignId, month });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg">{t(locale, 'ledger.title')}</h1>
      <form className="flex gap-2 items-end text-sm">
        <label>{t(locale, 'ledger.filterCampaign')} <select name="kampanya" defaultValue={campaignSlug ?? ''} className="border"><option value="">{t(locale, 'ledger.all')}</option>{campaigns.map((c) => <option key={c.id} value={c.slug}>{pickLocalized(c.title, locale)}</option>)}</select></label>
        <label>{t(locale, 'ledger.filterMonth')} <input type="month" name="ay" defaultValue={month ?? ''} className="border" /></label>
        <button className="border px-2">OK</button>
      </form>
      <LedgerTable rows={rows} locale={locale} />
    </div>
  );
}
