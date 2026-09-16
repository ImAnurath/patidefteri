import { resolveLocale } from '@/lib/i18n/params';
import { pickLocalized } from '@/lib/i18n/localized';
import { t } from '@/lib/i18n/messages';
import { formatKurus } from '@/lib/money';
import { listVets, listQuotesForVet } from '@/db/queries/vets';

// An admin-entered website is free text, so it is only turned into a link when it is plainly http(s).
const isHttpUrl = (s: string) => /^https?:\/\//i.test(s);

export default async function Vets(props: PageProps<'/[locale]/veterinerler'>) {
  const locale = await resolveLocale(props.params);
  const vets = (await listVets()).filter((v) => v.referralConsent);
  // Quotes for draft campaigns would leak an unpublished campaign's title, so they are left out.
  const withQuotes = await Promise.all(vets.map(async (v) => ({ v, quotes: (await listQuotesForVet(v.id)).filter(({ campaign }) => campaign.status !== 'draft') })));
  return (
    <div>
      <h1 className="text-lg mb-4">{t(locale, 'vets.title')}</h1>
      <ul className="flex flex-col gap-4">{withQuotes.map(({ v, quotes }) => (
        <li key={v.id} className="border p-3">
          <h2 className="font-bold">{v.clinicName}</h2>
          <p>{v.name} · {v.phone} · {v.address} {v.website && (isHttpUrl(v.website) ? <a href={v.website} rel="noopener" className="underline">{v.website}</a> : v.website)}</p>
          {v.description && <p>{pickLocalized(v.description, locale)}</p>}
          {quotes.length > 0 && <><h3 className="text-sm font-bold mt-2">{t(locale, 'vets.quotes')}</h3><ul className="text-sm">{quotes.map(({ quote, campaign }) => <li key={quote.id}>{pickLocalized(campaign.title, locale)}: {pickLocalized(quote.service, locale)} — {formatKurus(quote.amountKurus, locale)} ({quote.status})</li>)}</ul></>}
        </li>))}</ul>
    </div>
  );
}
