import { env } from '@/env';
import { resolveLocale } from '@/lib/i18n/params';
import { pickLocalized } from '@/lib/i18n/localized';
import { t } from '@/lib/i18n/messages';
import { listCampaigns } from '@/db/queries/campaigns';
import { CopyButton } from '@/components/public/CopyButton';

export default async function Donate(props: PageProps<'/[locale]/bagis'>) {
  const locale = await resolveLocale(props.params);
  const e = env();
  const active = await listCampaigns({ statuses: ['active', 'funded'], kinds: ['one_off', 'recurring'] });
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg">{t(locale, 'donate.title')}</h1>
      <p>{t(locale, 'donate.iban')}: <code>{e.DONATION_IBAN}</code> <CopyButton text={e.DONATION_IBAN.replace(/\s/g, '')} label={t(locale, 'donate.copy')} doneLabel={t(locale, 'donate.copied')} /> — {e.DONATION_ACCOUNT_NAME}</p>
      <ul className="flex flex-col gap-2">{active.map((c) => (
        <li key={c.id} className="border p-2">{pickLocalized(c.title, locale)} — {t(locale, 'donate.noteFor')}: <code>{c.keywords[0] ?? c.slug}</code> <CopyButton text={c.keywords[0] ?? c.slug} label={t(locale, 'donate.copy')} doneLabel={t(locale, 'donate.copied')} /></li>))}</ul>
      <p className="text-sm">{t(locale, 'donate.noNote')}</p>
    </div>
  );
}
